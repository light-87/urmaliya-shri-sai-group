import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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
    const { data: existing, error: fetchError } = await supabase
      .from('StockTransaction')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Prepare update payload
    const updatePayload: Record<string, any> = {}
    if (validatedData.date) updatePayload.date = validatedData.date.toISOString()
    if (validatedData.type) updatePayload.type = validatedData.type
    if (validatedData.category) updatePayload.category = validatedData.category
    if (validatedData.quantity !== undefined) updatePayload.quantity = validatedData.quantity
    if (validatedData.unit) updatePayload.unit = validatedData.unit
    if (validatedData.description !== undefined) updatePayload.description = validatedData.description

    // Update the transaction
    const { data: transaction, error: updateError } = await supabase
      .from('StockTransaction')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Get the updated category (either from update or existing)
    const updatedCategory = validatedData.category || existing.category

    // Recalculate running totals for this category
    await recalculateRunningTotals(updatedCategory)

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
    const { data: transaction, error: fetchError } = await supabase
      .from('StockTransaction')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Delete transaction
    const { error: deleteError } = await supabase
      .from('StockTransaction')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

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
  const { data: transactions, error } = await supabase
    .from('StockTransaction')
    .select('*')
    .eq('category', category)
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
      .from('StockTransaction')
      .update({ runningTotal })
      .eq('id', transaction.id)
  }
}
