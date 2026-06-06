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

    // Production batches are two linked transactions (UREA + FREE_DEF).
    // Editing one leg would desync the pair, so block direct edits.
    if (existing.type === 'PRODUCE_BATCH') {
      return NextResponse.json(
        { success: false, message: 'Production batches cannot be edited directly. Delete and re-create instead.' },
        { status: 400 }
      )
    }

    // Bucket/sale entries mirror InventoryTransaction rows — editing them
    // here would desync the two ledgers. They must be edited from the
    // Inventory page, which keeps the mirror in sync.
    if (['SELL_BUCKETS', 'SELL_FREE_DEF', 'FILL_BUCKETS', 'RETURN_BUCKETS'].includes(existing.type)) {
      return NextResponse.json(
        { success: false, message: 'This entry mirrors an Inventory transaction. Edit it from the Inventory page instead.' },
        { status: 400 }
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

    // For PRODUCE_BATCH transactions, we need to delete the paired transaction too
    // Production creates 2 transactions: UREA (decrease) and FREE_DEF (increase)
    let pairedTransaction = null
    if (transaction.type === 'PRODUCE_BATCH') {
      // Multiple productions can share the same date (date is normalized to
      // midnight UTC), so a date-only lookup is ambiguous. Fetch all
      // PRODUCE_BATCH rows on that date and pair them the same way the
      // StockBoard UI groups them (adjacent complementary categories, newest
      // first) so the deleted pair always matches the card the user sees.
      const { data: sameDateRows, error: pairFetchError } = await supabase
        .from('StockTransaction')
        .select('*')
        .eq('type', 'PRODUCE_BATCH')
        .eq('date', transaction.date)
        .order('createdAt', { ascending: false })

      if (pairFetchError) throw pairFetchError

      const rows = sameDateRows || []
      for (let i = 0; i < rows.length; i++) {
        const current = rows[i]
        const next = rows[i + 1]
        const isComplementaryPair =
          next &&
          ((current.category === 'UREA' && next.category === 'FREE_DEF') ||
            (current.category === 'FREE_DEF' && next.category === 'UREA'))

        if (isComplementaryPair) {
          if (current.id === id) {
            pairedTransaction = next
            break
          }
          if (next.id === id) {
            pairedTransaction = current
            break
          }
          i++ // skip the consumed pair, mirroring the UI grouping walk
        } else if (current.id === id) {
          break // target has no pair (orphaned leg) — delete it alone
        }
      }
    }

    // Validate that deletion won't cause negative stock
    // Check what the final balance would be after deletion
    const wouldCauseNegative = await checkIfDeletionCausesNegativeStock(
      transaction.category,
      transaction.id,
      transaction.quantity
    )

    if (wouldCauseNegative) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete this transaction. It would cause negative stock balance for ${transaction.category}.`,
        },
        { status: 400 }
      )
    }

    // Also check for paired transaction
    if (pairedTransaction) {
      const pairedWouldCauseNegative = await checkIfDeletionCausesNegativeStock(
        pairedTransaction.category,
        pairedTransaction.id,
        pairedTransaction.quantity
      )

      if (pairedWouldCauseNegative) {
        return NextResponse.json(
          {
            success: false,
            message: `Cannot delete this production batch. It would cause negative stock balance for ${pairedTransaction.category}.`,
          },
          { status: 400 }
        )
      }
    }

    // Delete the main transaction
    const { error: deleteError } = await supabase
      .from('StockTransaction')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    // Delete the paired transaction if it exists
    if (pairedTransaction) {
      const { error: pairedDeleteError } = await supabase
        .from('StockTransaction')
        .delete()
        .eq('id', pairedTransaction.id)

      // Surface the failure loudly — a silently half-deleted production
      // corrupts both category balances.
      if (pairedDeleteError) throw pairedDeleteError
    }

    // Recalculate running totals for the deleted transaction's category
    await recalculateRunningTotals(transaction.category)

    // Also recalculate for the paired transaction's category if applicable
    if (pairedTransaction) {
      await recalculateRunningTotals(pairedTransaction.category)
    }

    return NextResponse.json({
      success: true,
      message: pairedTransaction
        ? 'Production batch and paired transactions deleted'
        : 'Transaction deleted',
    })
  } catch (error) {
    console.error('Stock DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete transaction' },
      { status: 500 }
    )
  }
}

// Helper function to check if deletion would cause negative stock
async function checkIfDeletionCausesNegativeStock(
  category: StockCategory,
  transactionId: string,
  transactionQuantity: number
): Promise<boolean> {
  // Get all transactions for this category, excluding the one being deleted
  const { data: transactions, error } = await supabase
    .from('StockTransaction')
    .select('quantity')
    .eq('category', category)
    .neq('id', transactionId)
    .order('date', { ascending: true })
    .order('createdAt', { ascending: true })

  if (error || !transactions) {
    return false // Allow deletion if we can't check
  }

  // Calculate what the running total would be without this transaction
  let runningTotal = 0
  for (const tx of transactions) {
    runningTotal += tx.quantity
    if (runningTotal < 0) {
      return true // Would cause negative balance
    }
  }

  return false
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
