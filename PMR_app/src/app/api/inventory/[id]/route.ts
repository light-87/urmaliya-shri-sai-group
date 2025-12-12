import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    const existing = await prisma.inventoryTransaction.findUnique({
      where: { id },
    })

    if (!existing) {
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

    // Update the transaction
    const transaction = await prisma.inventoryTransaction.update({
      where: { id },
      data: updatedData,
    })

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
    const transaction = await prisma.inventoryTransaction.findUnique({
      where: { id },
    })

    if (!transaction) {
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
        const stockTransactionsToDelete = await prisma.stockTransaction.findMany({
          where: {
            date: transaction.date,
            type: StockTransactionType.SELL_FREE_DEF,
            quantity: -Math.abs(transaction.quantity), // Stock uses negative for sells
          },
        })

        // Delete the StockTransactions
        for (const st of stockTransactionsToDelete) {
          await prisma.stockTransaction.delete({ where: { id: st.id } })
        }

        // Recalculate StockTransaction running totals for affected categories
        await recalculateStockRunningTotals(StockCategory.FREE_DEF)
        await recalculateStockRunningTotals(StockCategory.FINISHED_GOODS)
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

        const stockTransactionsToDelete = await prisma.stockTransaction.findMany({
          where: {
            date: transaction.date,
            type: stockType,
            category: stockCategory,
            quantity: expectedQuantity,
          },
        })

        // Delete the StockTransactions
        for (const st of stockTransactionsToDelete) {
          await prisma.stockTransaction.delete({ where: { id: st.id } })
        }

        // Recalculate StockTransaction running totals for affected category
        await recalculateStockRunningTotals(stockCategory)
      } catch (stockError) {
        console.error('Failed to delete/recalculate stock transactions:', stockError)
        // Continue anyway
      }
    }

    // Delete the inventory transaction
    await prisma.inventoryTransaction.delete({
      where: { id },
    })

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
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { bucketType, warehouse },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

  // Recalculate running totals
  let runningTotal = 0
  for (const transaction of transactions) {
    runningTotal += transaction.quantity
    await prisma.inventoryTransaction.update({
      where: { id: transaction.id },
      data: { runningTotal },
    })
  }
}

// Helper function to recalculate StockTransaction running totals for a category
async function recalculateStockRunningTotals(
  category: StockCategory
) {
  try {
    // Get all transactions for this category, ordered by date
    const transactions = await prisma.stockTransaction.findMany({
      where: { category },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    })

    // Recalculate running totals
    let runningTotal = 0
    for (const transaction of transactions) {
      runningTotal += transaction.quantity
      await prisma.stockTransaction.update({
        where: { id: transaction.id },
        data: { runningTotal },
      })
    }
  } catch (error) {
    console.error(`Failed to recalculate stock running totals for ${category}:`, error)
  }
}

// Helper function to get bucket size
async function getBucketSize(bucketType: BucketType): Promise<number> {
  return BUCKET_SIZES[bucketType] || 0
}
