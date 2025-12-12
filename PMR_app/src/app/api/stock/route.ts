import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { StockTransactionType, StockCategory, StockUnit, BucketType } from '@/types'
import { BUCKET_SIZES, UREA_PER_BATCH_KG, LITERS_PER_BATCH } from '@/types'

export const dynamic = 'force-dynamic'

// Validation schema for creating stock transaction
const createStockSchema = z.object({
  date: z.string().transform(str => new Date(str)),
  type: z.nativeEnum(StockTransactionType),
  category: z.nativeEnum(StockCategory),
  quantity: z.number(),
  unit: z.nativeEnum(StockUnit),
  description: z.string().optional(),
  batchCount: z.number().optional(),
})

// GET - Fetch stock transactions and summary
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // All authenticated users can view stock

    // Check if table exists first
    const { error: tableCheckError } = await supabase
      .from('StockTransaction')
      .select('id')
      .limit(1)

    if (tableCheckError && tableCheckError.code === '42P01') {
      // Table doesn't exist yet - return empty data
      return NextResponse.json({
        success: true,
        transactions: [],
        summary: {
          ureaKg: 0,
          ureaBags: 0,
          ureaCansProduceL: 0,
          freeDEF: 0,
          bucketsInLiters: 0,
          finishedGoods: 0,
        },
        message: 'Database migration pending. StockTransaction table not found.'
      })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const category = searchParams.get('category') as StockCategory | null

    // Build Supabase query
    let query = supabase
      .from('StockTransaction')
      .select('*')
      .order('date', { ascending: false })
      .order('createdAt', { ascending: false })

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      query = query.gte('date', startDate.toISOString()).lte('date', endDate.toISOString())
    }
    if (category) {
      query = query.eq('category', category)
    }

    const { data: transactions, error } = await query
    if (error) throw error

    // Calculate summary
    const summary = await calculateStockSummary()

    return NextResponse.json({
      success: true,
      transactions,
      summary,
    })
  } catch (error) {
    console.error('Stock GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stock data' },
      { status: 500 }
    )
  }
}

// POST - Create new stock transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if table exists first
    const { error: tableCheckError } = await supabase
      .from('StockTransaction')
      .select('id')
      .limit(1)

    if (tableCheckError && tableCheckError.code === '42P01') {
      return NextResponse.json({
        success: false,
        message: 'Database migration pending. StockTransaction table not found.'
      }, { status: 503 })
    }

    const body = await request.json()
    const validatedData = createStockSchema.parse(body)

    // Permission check based on transaction type
    // ADD_UREA and PRODUCE_BATCH: Only ADMIN and EXPENSE_INVENTORY
    // SELL_FREE_DEF: All authenticated users
    // FILL_BUCKETS and SELL_BUCKETS: Auto-triggered (all users)
    if (validatedData.type === 'ADD_UREA' || validatedData.type === 'PRODUCE_BATCH') {
      if (session.role !== 'ADMIN' && session.role !== 'EXPENSE_INVENTORY') {
        return NextResponse.json(
          { success: false, message: 'Access denied. Only admins and expense managers can perform this action.' },
          { status: 403 }
        )
      }
    }

    // Handle different transaction types
    if (validatedData.type === 'PRODUCE_BATCH') {
      return await handleProduceBatch(validatedData)
    } else if (validatedData.type === 'FILL_BUCKETS') {
      return await handleFillBuckets(validatedData)
    } else if (validatedData.type === 'SELL_BUCKETS') {
      return await handleSellBuckets(validatedData)
    } else {
      // Handle regular transactions (ADD_UREA, SELL_FREE_DEF)
      return await handleRegularTransaction(validatedData)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid data', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Stock POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}

// Handle production batch (Urea → Free DEF)
async function handleProduceBatch(data: z.infer<typeof createStockSchema>) {
  const batchCount = data.batchCount || 1
  const totalUreaNeeded = UREA_PER_BATCH_KG * batchCount
  const totalLitersProduced = LITERS_PER_BATCH * batchCount

  // Check if enough Urea is available
  const ureaStock = await getCurrentStock(StockCategory.UREA)
  if (ureaStock < totalUreaNeeded) {
    return NextResponse.json(
      {
        success: false,
        message: `Insufficient Urea. Need ${totalUreaNeeded}kg for ${batchCount} batch${batchCount !== 1 ? 'es' : ''}, have ${ureaStock}kg`,
        currentStock: ureaStock,
      },
      { status: 400 }
    )
  }

  // Calculate new running totals
  const ureaRunningTotal = ureaStock - totalUreaNeeded
  const freeDEFStock = await getCurrentStock(StockCategory.FREE_DEF)
  const freeDEFRunningTotal = freeDEFStock + totalLitersProduced

  // Create both transactions
  // Note: Finished Goods = Free DEF, so we don't create separate FINISHED_GOODS transaction
  const { data: ureaTransaction, error: ureaError } = await supabase
    .from('StockTransaction')
    .insert({
      date: data.date.toISOString(),
      type: 'PRODUCE_BATCH',
      category: 'UREA',
      quantity: -totalUreaNeeded,
      unit: 'KG',
      description: `Production: ${batchCount} batch${batchCount !== 1 ? 'es' : ''} (-${totalUreaNeeded}kg Urea)`,
      runningTotal: ureaRunningTotal,
    })
    .select()
    .single()
  if (ureaError) throw ureaError

  const { data: freeDEFTransaction, error: freeDEFError } = await supabase
    .from('StockTransaction')
    .insert({
      date: data.date.toISOString(),
      type: 'PRODUCE_BATCH',
      category: 'FREE_DEF',
      quantity: totalLitersProduced,
      unit: 'LITERS',
      description: `Production: ${batchCount} batch${batchCount !== 1 ? 'es' : ''} (+${totalLitersProduced}L Free DEF)`,
      runningTotal: freeDEFRunningTotal,
    })
    .select()
    .single()
  if (freeDEFError) throw freeDEFError

  const transactions = [ureaTransaction, freeDEFTransaction]

  return NextResponse.json({
    success: true,
    message: `Produced ${totalLitersProduced}L Free DEF (${batchCount} batch${batchCount !== 1 ? 'es' : ''}) using ${totalUreaNeeded}kg Urea`,
    transactions,
  })
}

// Handle filling buckets (auto-called from inventory)
async function handleFillBuckets(data: z.infer<typeof createStockSchema>) {
  const freeDEFStock = await getCurrentStock(StockCategory.FREE_DEF)
  const litersNeeded = Math.abs(data.quantity)

  // Check if enough Free DEF is available
  if (freeDEFStock < litersNeeded) {
    return NextResponse.json(
      {
        success: false,
        message: `Insufficient Free DEF. Need ${litersNeeded}L, have ${freeDEFStock}L`,
        currentStock: freeDEFStock,
      },
      { status: 400 }
    )
  }

  // Subtract from Free DEF only (Finished Goods stays same)
  const newRunningTotal = freeDEFStock - litersNeeded

  const { data: transaction, error } = await supabase
    .from('StockTransaction')
    .insert({
      date: data.date.toISOString(),
      type: 'FILL_BUCKETS',
      category: 'FREE_DEF',
      quantity: -litersNeeded,
      unit: 'LITERS',
      description: data.description || `Filled buckets: -${litersNeeded}L`,
      runningTotal: newRunningTotal,
    })
    .select()
    .single()
  if (error) throw error

  return NextResponse.json({
    success: true,
    transaction,
  })
}

// Handle selling buckets (auto-called from inventory)
async function handleSellBuckets(data: z.infer<typeof createStockSchema>) {
  const freeDEFStock = await getCurrentStock(StockCategory.FREE_DEF)
  const litersToSubtract = Math.abs(data.quantity)

  // Check if enough Free DEF is available
  if (freeDEFStock < litersToSubtract) {
    return NextResponse.json(
      {
        success: false,
        message: `Insufficient Free DEF to fill buckets. Need ${litersToSubtract}L, have ${freeDEFStock}L`,
        currentStock: freeDEFStock,
      },
      { status: 400 }
    )
  }

  const newRunningTotal = freeDEFStock - litersToSubtract

  const { data: transaction, error } = await supabase
    .from('StockTransaction')
    .insert({
      date: data.date.toISOString(),
      type: 'SELL_BUCKETS',
      category: 'FREE_DEF',
      quantity: -litersToSubtract,
      unit: 'LITERS',
      description: data.description || `Sold buckets: -${litersToSubtract}L`,
      runningTotal: newRunningTotal,
    })
    .select()
    .single()
  if (error) throw error

  return NextResponse.json({
    success: true,
    transaction,
  })
}

// Handle regular transactions (ADD_UREA, SELL_FREE_DEF)
async function handleRegularTransaction(data: z.infer<typeof createStockSchema>) {
  const currentStock = await getCurrentStock(data.category)

  // For selling Free DEF, check if enough stock is available
  if (data.type === 'SELL_FREE_DEF' && data.quantity < 0) {
    const quantityToSell = Math.abs(data.quantity)
    if (currentStock < quantityToSell) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient Free DEF. Trying to sell ${quantityToSell}L, have ${currentStock}L`,
          currentStock,
        },
        { status: 400 }
      )
    }
  }

  const newRunningTotal = currentStock + data.quantity

  // For SELL_FREE_DEF, also create InventoryTransaction
  // Note: Finished Goods = Free DEF, so we don't create separate FINISHED_GOODS transaction
  if (data.type === 'SELL_FREE_DEF') {
    // StockTransaction for FREE_DEF
    const { data: stockTransaction, error: stockError } = await supabase
      .from('StockTransaction')
      .insert({
        date: data.date.toISOString(),
        type: data.type,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        description: data.description,
        runningTotal: newRunningTotal,
      })
      .select()
      .single()
    if (stockError) throw stockError

    // InventoryTransaction for display in Inventory page
    // Running total should match the Free DEF stock balance (same as StockBoard)
    const { data: inventoryTransaction, error: inventoryError } = await supabase
      .from('InventoryTransaction')
      .insert({
        date: data.date.toISOString(),
        warehouse: 'FACTORY',
        bucketType: 'FREE_DEF',
        action: 'SELL',
        quantity: data.quantity, // Store as negative for sell
        buyerSeller: data.description?.split(' to ').pop()?.trim() || 'Customer',
        runningTotal: newRunningTotal, // Use Free DEF stock balance
      })
      .select()
      .single()
    if (inventoryError) throw inventoryError

    return NextResponse.json({
      success: true,
      transactions: [stockTransaction, inventoryTransaction],
    })
  }

  // Regular transaction (ADD_UREA)
  const { data: transaction, error } = await supabase
    .from('StockTransaction')
    .insert({
      date: data.date.toISOString(),
      type: data.type,
      category: data.category,
      quantity: data.quantity,
      unit: data.unit,
      description: data.description,
      runningTotal: newRunningTotal,
    })
    .select()
    .single()
  if (error) throw error

  return NextResponse.json({
    success: true,
    transaction,
  })
}

// Helper function to get current stock for a category
async function getCurrentStock(category: StockCategory): Promise<number> {
  const { data: lastTransaction, error } = await supabase
    .from('StockTransaction')
    .select('runningTotal')
    .eq('category', category)
    .order('date', { ascending: false })
    .order('createdAt', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error

  return lastTransaction?.runningTotal || 0
}

// Helper function to calculate stock summary
async function calculateStockSummary() {
  const ureaKg = await getCurrentStock(StockCategory.UREA)
  const freeDEF = await getCurrentStock(StockCategory.FREE_DEF)

  // Calculate buckets in liters from inventory (for display purposes - they're empty)
  const bucketsInLiters = await calculateBucketsInLiters()

  // Finished Goods = Free DEF only (buckets are empty containers)
  const finishedGoods = freeDEF

  return {
    ureaKg,
    ureaBags: Number((ureaKg / 45).toFixed(2)),
    ureaCansProduceL: Math.floor(ureaKg / 360) * 1000,
    freeDEF,
    bucketsInLiters,
    finishedGoods,
  }
}

// Calculate total liters in buckets from inventory
async function calculateBucketsInLiters(): Promise<number> {
  const bucketTypes = Object.values(BucketType)
  let totalLiters = 0

  for (const bucketType of bucketTypes) {
    const bucketSize = BUCKET_SIZES[bucketType]
    if (bucketSize === 0) continue // Skip IBC_TANK

    // Get latest running total for each warehouse
    const { data: pallavi, error: pallaviError } = await supabase
      .from('InventoryTransaction')
      .select('runningTotal')
      .eq('bucketType', bucketType)
      .eq('warehouse', 'PALLAVI')
      .order('date', { ascending: false })
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()
    if (pallaviError && pallaviError.code !== 'PGRST116') throw pallaviError

    const { data: tularam, error: tularamError } = await supabase
      .from('InventoryTransaction')
      .select('runningTotal')
      .eq('bucketType', bucketType)
      .eq('warehouse', 'TULARAM')
      .order('date', { ascending: false })
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()
    if (tularamError && tularamError.code !== 'PGRST116') throw tularamError

    const pallaviStock = pallavi?.runningTotal || 0
    const tularamStock = tularam?.runningTotal || 0
    const totalBuckets = pallaviStock + tularamStock

    totalLiters += totalBuckets * bucketSize
  }

  return totalLiters
}
