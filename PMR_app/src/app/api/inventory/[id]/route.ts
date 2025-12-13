import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { BucketType, Warehouse, ActionType, StockCategory, StockTransactionType, BUCKET_SIZES } from '@/types'

export const dynamic = 'force-dynamic'

// Validation schema for updating inventory transaction
const updateInventorySchema = z.object({
  date: z.string().transform(str => new Date(str)).optional(),
  warehouse: z.nativeEnum(Warehouse).optional(),
  bucketType: z.nativeEnum(BucketType).optional(),
  action: z.nativeEnum(ActionType).optional(),
  quantity: z.number().positive().optional(),
  buyerSeller: z.string().min(1).optional(),
})

// PUT - Update inventory transaction (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin can edit
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateInventorySchema.parse(body)

    // Get existing transaction
    const { data: existing, error: fetchError } = await supabase
      .from('InventoryTransaction')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Merge with existing data
    const updatedData = {
      date: validatedData.date || existing.date,
      warehouse: validatedData.warehouse || existing.warehouse,
      bucketType: validatedData.bucketType || existing.bucketType,
      action: validatedData.action || existing.action,
      quantity: validatedData.quantity
        ? (validatedData.action || existing.action) === 'SELL'
          ? -validatedData.quantity
          : validatedData.quantity
        : existing.quantity,
      buyerSeller: validatedData.buyerSeller || existing.buyerSeller,
    }

    // Prepare update payload
    const updatePayload: Record<string, any> = {}
    if (validatedData.date) updatePayload.date = validatedData.date.toISOString()
    if (validatedData.warehouse) updatePayload.warehouse = validatedData.warehouse
    if (validatedData.bucketType) updatePayload.bucketType = validatedData.bucketType
    if (validatedData.action) updatePayload.action = validatedData.action
    if (validatedData.quantity !== undefined) updatePayload.quantity = updatedData.quantity
    if (validatedData.buyerSeller) updatePayload.buyerSeller = validatedData.buyerSeller

    // Update the transaction
    const { data: transaction, error: updateError } = await supabase
      .from('InventoryTransaction')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Recalculate running totals for all subsequent transactions
    await recalculateRunningTotals(
      updatedData.bucketType,
      updatedData.warehouse
    )

    // Also recalculate old bucket/warehouse if changed
    if (
      validatedData.bucketType && validatedData.bucketType !== existing.bucketType ||
      validatedData.warehouse && validatedData.warehouse !== existing.warehouse
    ) {
      await recalculateRunningTotals(existing.bucketType, existing.warehouse)
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
    console.error('Inventory PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update transaction' },
      { status: 500 }
    )
  }
}

// DELETE - Delete inventory transaction (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin can delete
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get transaction before deleting
    const { data: transaction, error: fetchError } = await supabase
      .from('InventoryTransaction')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      )
    }

    // If this is a FACTORY + FREE_DEF transaction (from Sell Free DEF),
    // we need to also delete the corresponding StockTransactions
    if (transaction.warehouse === Warehouse.FACTORY && transaction.bucketType === BucketType.FREE_DEF && transaction.action === ActionType.SELL) {
      try {
        // Find and delete corresponding StockTransactions by matching date and quantity
        // When selling Free DEF, we created 2 StockTransactions:
        // 1. SELL_FREE_DEF for FREE_DEF category (negative quantity)
        // 2. SELL_FREE_DEF for FINISHED_GOODS category (negative quantity)
        const { data: stockTransactionsToDelete, error: stockFetchError } = await supabase
          .from('StockTransaction')
          .select('*')
          .eq('date', transaction.date)
          .eq('type', StockTransactionType.SELL_FREE_DEF)
          .eq('quantity', -Math.abs(transaction.quantity))

        if (!stockFetchError && stockTransactionsToDelete) {
          // Delete the StockTransactions
          for (const st of stockTransactionsToDelete) {
            await supabase
              .from('StockTransaction')
              .delete()
              .eq('id', st.id)
          }

          // Recalculate StockTransaction running totals for affected categories
          await recalculateStockRunningTotals(StockCategory.FREE_DEF)
          await recalculateStockRunningTotals(StockCategory.FINISHED_GOODS)
        }
      } catch (stockError) {
        console.error('Failed to delete/recalculate stock transactions:', stockError)
        // Continue anyway - at least delete the inventory transaction
      }
    }

    // If this is a regular bucket transaction, delete corresponding StockTransactions
    const bucketSize = await getBucketSize(transaction.bucketType)
    if (bucketSize > 0) {
      try {
        // Find StockTransactions created when this inventory transaction was made
        const stockType = transaction.action === ActionType.STOCK ? StockTransactionType.FILL_BUCKETS : StockTransactionType.SELL_BUCKETS
        const stockCategory = transaction.action === ActionType.STOCK ? StockCategory.FREE_DEF : StockCategory.FINISHED_GOODS
        const expectedQuantity = transaction.action === ActionType.STOCK
          ? -(Math.abs(transaction.quantity) * bucketSize)
          : -(Math.abs(transaction.quantity) * bucketSize)

        const { data: stockTransactionsToDelete, error: stockFetchError } = await supabase
          .from('StockTransaction')
          .select('*')
          .eq('date', transaction.date)
          .eq('type', stockType)
          .eq('category', stockCategory)
          .eq('quantity', expectedQuantity)

        if (!stockFetchError && stockTransactionsToDelete) {
          // Delete the StockTransactions
          for (const st of stockTransactionsToDelete) {
            await supabase
              .from('StockTransaction')
              .delete()
              .eq('id', st.id)
          }

          // Recalculate StockTransaction running totals for affected category
          await recalculateStockRunningTotals(stockCategory)
        }
      } catch (stockError) {
        console.error('Failed to delete/recalculate stock transactions:', stockError)
        // Continue anyway
      }
    }

    // Delete the inventory transaction
    const { error: deleteError } = await supabase
      .from('InventoryTransaction')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    // Recalculate inventory running totals
    await recalculateRunningTotals(transaction.bucketType, transaction.warehouse)

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted',
    })
  } catch (error) {
    console.error('Inventory DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete transaction' },
      { status: 500 }
    )
  }
}

// Helper function to recalculate all running totals for a bucket+warehouse
async function recalculateRunningTotals(
  bucketType: BucketType,
  warehouse: Warehouse
) {
  // Get all transactions for this combination, ordered by date
  const { data: transactions, error } = await supabase
    .from('InventoryTransaction')
    .select('*')
    .eq('bucketType', bucketType)
    .eq('warehouse', warehouse)
    .order('date', { ascending: true })
    .order('createdAt', { ascending: true })

  if (error || !transactions) {
    console.error('Failed to fetch transactions for recalculation:', error)
    return
  }

  // Recalculate running totals
  let runningTotal = 0
  for (const transaction of transactions) {
    runningTotal += transaction.quantity
    await supabase
      .from('InventoryTransaction')
      .update({ runningTotal })
      .eq('id', transaction.id)
  }
}

// Helper function to recalculate StockTransaction running totals for a category
async function recalculateStockRunningTotals(
  category: StockCategory
) {
  try {
    // Get all transactions for this category, ordered by date
    const { data: transactions, error } = await supabase
      .from('StockTransaction')
      .select('*')
      .eq('category', category)
      .order('date', { ascending: true })
      .order('createdAt', { ascending: true })

    if (error || !transactions) {
      console.error(`Failed to fetch stock transactions for ${category}:`, error)
      return
    }

    // Recalculate running totals
    let runningTotal = 0
    for (const transaction of transactions) {
      runningTotal += transaction.quantity
      await supabase
        .from('StockTransaction')
        .update({ runningTotal })
        .eq('id', transaction.id)
    }
  } catch (error) {
    console.error(`Failed to recalculate stock running totals for ${category}:`, error)
  }
}

// Helper function to get bucket size
async function getBucketSize(bucketType: BucketType): Promise<number> {
  return BUCKET_SIZES[bucketType] || 0
}
