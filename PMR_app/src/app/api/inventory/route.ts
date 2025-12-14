import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import type { BucketType, Warehouse, ActionType } from '@/types'
import { BUCKET_SIZES } from '@/types'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// Validation schema for creating inventory transaction
const createInventorySchema = z.object({
  date: z.string().transform(str => new Date(str)),
  warehouse: z.string() as z.ZodType<Warehouse>,
  bucketType: z.string() as z.ZodType<BucketType>,
  action: z.string() as z.ZodType<ActionType>,
  quantity: z.number().positive(),
  buyerSeller: z.string().min(1),
  forceOversell: z.boolean().optional(), // Allow user to confirm overselling
})

// GET - Fetch inventory transactions and summary
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const warehouse = searchParams.get('warehouse') as Warehouse | null
    const bucketType = searchParams.get('bucketType') as BucketType | null

    // Build Supabase query
    let query = supabase
      .from('InventoryTransaction')
      .select('*')
      .order('date', { ascending: false })
      .order('createdAt', { ascending: false })

    // Apply filters
    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      query = query.gte('date', startDate.toISOString()).lte('date', endDate.toISOString())
    }
    if (warehouse) query = query.eq('warehouse', warehouse)
    if (bucketType) query = query.eq('bucketType', bucketType)

    const { data: transactions, error } = await query

    if (error) throw error

    // Calculate summary - current stock per bucket per warehouse
    const summary = await calculateStockSummary()

    return NextResponse.json({
      success: true,
      transactions: transactions || [],
      summary,
    })
  } catch (error) {
    console.error('Inventory GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

// POST - Create new inventory transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createInventorySchema.parse(body)

    // Get current stock for this bucket+warehouse combination
    const currentStock = await getCurrentStock(
      validatedData.bucketType,
      validatedData.warehouse
    )

    // Calculate signed quantity and running total
    const signedQuantity = validatedData.action === 'SELL'
      ? -validatedData.quantity
      : validatedData.quantity

    // Check for overselling (selling more than available stock)
    if (validatedData.action === 'SELL' && validatedData.quantity > currentStock) {
      // If user hasn't confirmed, return warning
      if (!validatedData.forceOversell) {
        return NextResponse.json(
          {
            success: false,
            requiresConfirmation: true,
            message: `Warning: Selling ${validatedData.quantity} but only ${currentStock} available in stock. This will result in negative inventory (${currentStock - validatedData.quantity}). Do you want to proceed?`,
            currentStock,
            requestedQuantity: validatedData.quantity,
            shortfall: validatedData.quantity - currentStock,
          },
          { status: 400 }
        )
      }
      // User confirmed, allow overselling
    }

    const newRunningTotal = currentStock + signedQuantity

    // Create transaction
    const { data: transaction, error: createError } = await supabase
      .from('InventoryTransaction')
      .insert({
        id: randomUUID(),
        date: validatedData.date.toISOString(),
        warehouse: validatedData.warehouse,
        bucketType: validatedData.bucketType,
        action: validatedData.action,
        quantity: signedQuantity,
        buyerSeller: validatedData.buyerSeller,
        runningTotal: newRunningTotal,
      })
      .select()
      .single()

    if (createError) throw createError

    // Auto-update stock tracking (only if StockTransaction table exists)
    const bucketSize = BUCKET_SIZES[validatedData.bucketType]
    if (bucketSize > 0) {
      try {
        // Check if StockTransaction table exists
        const { data: testData } = await supabase
          .from('StockTransaction')
          .select('id')
          .limit(1)

        if (validatedData.action === 'SELL') {
          // Selling buckets: fill them first (subtract from Free DEF), then sell
          await createStockTransaction({
            date: validatedData.date,
            type: 'SELL_BUCKETS',
            category: 'FREE_DEF',
            quantity: -(validatedData.quantity * bucketSize),
            unit: 'LITERS',
            description: `Sold ${validatedData.quantity}x ${validatedData.bucketType} (${validatedData.quantity * bucketSize}L) to ${validatedData.buyerSeller}`,
          })
        }
        // Note: STOCK action does nothing to Free DEF - buckets are empty containers
      } catch (stockError) {
        // Table doesn't exist yet or other error - silently skip stock tracking
        console.log('Stock tracking not available yet (migration pending)')
      }
    }

    return NextResponse.json({
      success: true,
      transaction,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid data', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Inventory POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}

// Helper function to get current stock for a bucket+warehouse
async function getCurrentStock(
  bucketType: BucketType,
  warehouse: Warehouse
): Promise<number> {
  const { data: lastTransaction } = await supabase
    .from('InventoryTransaction')
    .select('runningTotal')
    .eq('bucketType', bucketType)
    .eq('warehouse', warehouse)
    .order('date', { ascending: false })
    .order('createdAt', { ascending: false })
    .limit(1)
    .single()

  return lastTransaction?.runningTotal || 0
}

// Helper function to calculate stock summary
async function calculateStockSummary() {
  // Get bucket types and warehouses from types
  const bucketTypes = ['TATA_G', 'TATA_W', 'TATA_HP', 'AL_10_LTR', 'AL', 'BB', 'ES', 'MH', 'MH_10_LTR', 'TATA_10_LTR', 'IBC_TANK', 'ECO', 'INDIAN_OIL_20L', 'FREE_DEF'] as BucketType[]

  // OPTIMIZATION: Fetch all latest inventory transactions in a single query
  // Get the most recent transaction for each bucket+warehouse combination
  const { data: allTransactions } = await supabase
    .from('InventoryTransaction')
    .select('bucketType, warehouse, runningTotal, date, createdAt')
    .order('date', { ascending: false })
    .order('createdAt', { ascending: false })

  // Build a map of latest running totals per bucket+warehouse
  const stockMap = new Map<string, number>()

  if (allTransactions) {
    // Process transactions to find latest running total for each combination
    for (const tx of allTransactions) {
      const key = `${tx.bucketType}:${tx.warehouse}`
      if (!stockMap.has(key)) {
        stockMap.set(key, tx.runningTotal)
      }
    }
  }

  const summary = []

  for (const bucketType of bucketTypes) {
    const row: { bucketType: BucketType; pallavi: number; tularam: number; total: number } = {
      bucketType,
      pallavi: 0,
      tularam: 0,
      total: 0,
    }

    // Special handling for FREE_DEF - not stored in warehouses
    if (bucketType === 'FREE_DEF') {
      // Get current Free DEF stock from StockBoard (StockTransaction)
      try {
        const { data: lastStockTransaction } = await supabase
          .from('StockTransaction')
          .select('runningTotal')
          .eq('category', 'FREE_DEF')
          .order('date', { ascending: false })
          .order('createdAt', { ascending: false })
          .limit(1)
          .single()
        row.total = lastStockTransaction?.runningTotal || 0
      } catch {
        row.total = 0
      }
      // Pallavi and Tularam remain 0 for FREE_DEF
      summary.push(row)
      continue
    }

    // Get stock from the map instead of making separate queries
    row.pallavi = stockMap.get(`${bucketType}:PALLAVI`) || 0
    row.tularam = stockMap.get(`${bucketType}:TULARAM`) || 0
    row.total = row.pallavi + row.tularam
    summary.push(row)
  }

  return summary
}

// Helper function to create stock transaction
async function createStockTransaction(data: {
  date: Date
  type: 'FILL_BUCKETS' | 'SELL_BUCKETS'
  category: 'FREE_DEF' | 'FINISHED_GOODS'
  quantity: number
  unit: 'LITERS'
  description: string
}) {
  // Get current stock for this category
  const { data: lastTransaction } = await supabase
    .from('StockTransaction')
    .select('runningTotal')
    .eq('category', data.category)
    .order('date', { ascending: false })
    .order('createdAt', { ascending: false })
    .limit(1)
    .single()

  const currentStock = lastTransaction?.runningTotal || 0
  const newRunningTotal = currentStock + data.quantity

  // Create stock transaction
  await supabase
    .from('StockTransaction')
    .insert({
      id: randomUUID(),
      date: data.date.toISOString(),
      type: data.type,
      category: data.category,
      quantity: data.quantity,
      unit: data.unit,
      description: data.description,
      runningTotal: newRunningTotal,
    })
}
