import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { ExpenseAccount, TransactionType } from '@/types'

export const dynamic = 'force-dynamic'

// Validation schema for updating expense transaction
const updateExpenseSchema = z.object({
  date: z.string().transform(str => new Date(str)).optional(),
  amount: z.number().positive().optional(),
  account: z.nativeEnum(ExpenseAccount).optional(),
  type: z.nativeEnum(TransactionType).optional(),
  name: z.string().min(1).optional(),
})

// PUT - Update expense transaction (Admin only)
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
    const validatedData = updateExpenseSchema.parse(body)

    // Check if transaction exists
    const { data: existing, error: fetchError } = await supabase
      .from('ExpenseTransaction')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: Record<string, any> = {}
    if (validatedData.date) updateData.date = validatedData.date.toISOString()
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount
    if (validatedData.account) updateData.account = validatedData.account
    if (validatedData.type) updateData.type = validatedData.type
    if (validatedData.name) updateData.name = validatedData.name

    // Update the transaction
    const { data: transaction, error: updateError } = await supabase
      .from('ExpenseTransaction')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

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
    console.error('Expenses PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update transaction' },
      { status: 500 }
    )
  }
}

// DELETE - Delete expense transaction (Admin only)
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

    // Check if transaction exists
    const { data: transaction, error: fetchError } = await supabase
      .from('ExpenseTransaction')
      .select('id')
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
      .from('ExpenseTransaction')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted',
    })
  } catch (error) {
    console.error('Expenses DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete transaction' },
      { status: 500 }
    )
  }
}
