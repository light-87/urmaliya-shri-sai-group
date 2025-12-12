import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { StockTransactionType, StockCategory, StockUnit } from '@/types'

export const dynamic = 'force-dynamic'

// Validation schema for updating stock transaction
const updateStockSchema = z.object({
  date: z.string().transform(str => new Date(str)).optional(),
  type: z.nativeEnum(StockTransactionType).optional(),
  category: z.nativeEnum(StockCategory).optional(),
  quantity: z.number().optional(),
  unit: z.nativeEnum(StockUnit).optional(),
  description: z.string().optional(),
})

// PUT - Update stock transaction (Admin only)
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
    const validatedData = updateStockSchema.parse(body)

    // Get existing transaction
    const existing = await prisma.stockTransaction.findUnique({
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
      type: validatedData.type || existing.type,
      category: validatedData.category || existing.category,
      quantity: validatedData.quantity !== undefined ? validatedData.quantity : existing.quantity,
      unit: validatedData.unit || existing.unit,
      description: validatedData.description !== undefined ? validatedData.description : existing.description,
    }

    // Update the transaction
    const transaction = await prisma.stockTransaction.update({
      where: { id },
      data: updatedData,
    })

    // Recalculate running totals for this category
    await recalculateRunningTotals(updatedData.category)

    // Also recalculate old category if changed
    if (validatedData.category && validatedData.category !== existing.category) {
      await recalculateRunningTotals(existing.category)
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
    console.error('Stock PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update transaction' },
      { status: 500 }
    )
  }
}

// DELETE - Delete stock transaction (Admin only)
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
    const transaction = await prisma.stockTransaction.findUnique({
      where: { id },
    })

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Delete transaction
    await prisma.stockTransaction.delete({
      where: { id },
    })

    // Recalculate running totals
    await recalculateRunningTotals(transaction.category)

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted',
    })
  } catch (error) {
    console.error('Stock DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete transaction' },
      { status: 500 }
    )
  }
}

// Helper function to recalculate all running totals for a category
async function recalculateRunningTotals(category: StockCategory) {
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
}
