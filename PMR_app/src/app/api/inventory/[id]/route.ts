import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { BucketType, Warehouse, ActionType, StockCategory, StockTransactionType, BUCKET_SIZES } from '@/types'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// Helper to parse date string to UTC Date
const parseToUTCDate = (str: string): Date => {
  // Handle both "YYYY-MM-DD" and ISO formats
  if (str.includes('T')) {
    return new Date(str)
  }
  const [year, month, day] = str.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

// Validation schema for updating inventory transaction
const updateInventorySchema = z.object({
  date: z.string().transform(parseToUTCDate).optional(),
  warehouse: z.nativeEnum(Warehouse).optional(),
  bucketType: z.nativeEnum(BucketType).optional(),
  action: z.nativeEnum(ActionType).optional(),
  quantity: z.number().positive().optional(),
  buyerSeller: z.string().min(1).optional(),
})

// --- StockTransaction mirror helpers ---------------------------------------
// SELL inventory transactions are mirrored into StockTransaction as Free DEF
// liter deductions:
//   - FACTORY + FREE_DEF + SELL          -> SELL_FREE_DEF (loose liters)
//   - sized bucket (BUCKET_SIZES > 0) + SELL -> SELL_BUCKETS (qty x size)
// Edits and deletes must keep that mirror in sync, otherwise the Free DEF
// balance on the StockBoard drifts away from the inventory ledger.

interface MirrorSpec {
  type: StockTransactionType
  category: StockCategory
  quantity: number // signed; negative = liters deducted from Free DEF
  description: string
}

function getMirrorSpec(tx: {
  warehouse: string
  bucketType: string
  action: string
  quantity: number
  buyerSeller: string
}): MirrorSpec | null {
  if (tx.action !== 'SELL') return null

  if (tx.warehouse === Warehouse.FACTORY && tx.bucketType === BucketType.FREE_DEF) {
    const liters = Math.abs(tx.quantity)
    return {
      type: StockTransactionType.SELL_FREE_DEF,
      category: StockCategory.FREE_DEF,
      quantity: -liters,
      description: `Sold ${liters}L Free DEF to ${tx.buyerSeller}`,
    }
  }

  const bucketSize = BUCKET_SIZES[tx.bucketType as BucketType] || 0
  if (bucketSize > 0) {
    const buckets = Math.abs(tx.quantity)
    return {
      type: StockTransactionType.SELL_BUCKETS,
      category: StockCategory.FREE_DEF,
      quantity: -(buckets * bucketSize),
      description: `Sold ${buckets}x ${tx.bucketType} (${buckets * bucketSize}L) to ${tx.buyerSeller}`,
    }
  }

  return null
}

// Find the single StockTransaction that mirrors this inventory row. Several
// rows can share (date, type, category) — e.g. two identical sales on one
// day — so require an exact quantity match and break ties with the closest
// createdAt (the mirror is inserted right after the inventory row). Returns
// null when no exact match exists: deleting a different-quantity row would
// destroy another sale's ledger entry, which is worse than leaving an
// orphan for the admin fix-stock tools to reconcile.
async function findMirrorTransaction(
  inventoryTx: { date: string; createdAt: string },
  spec: MirrorSpec
) {
  const { data: candidates, error } = await supabase
    .from('StockTransaction')
    .select('*')
    .eq('date', inventoryTx.date)
    .eq('type', spec.type)
    .eq('category', spec.category)
    .eq('quantity', spec.quantity)

  if (error) throw error
  if (!candidates || candidates.length === 0) return null

  const inventoryCreatedAt = new Date(inventoryTx.createdAt).getTime()
  candidates.sort(
    (a, b) =>
      Math.abs(new Date(a.createdAt).getTime() - inventoryCreatedAt) -
      Math.abs(new Date(b.createdAt).getTime() - inventoryCreatedAt)
  )

  return candidates[0]
}

// Get the latest running balance for a stock category
async function getStockBalance(category: StockCategory): Promise<number> {
  const { data: lastTx } = await supabase
    .from('StockTransaction')
    .select('runningTotal')
    .eq('category', category)
    .order('date', { ascending: false })
    .order('createdAt', { ascending: false })
    .limit(1)
    .single()

  return lastTx?.runningTotal || 0
}

// Get the running balance available at a specific date (backdated-aware).
// For a backdated edit the deduction must fit the balance AT that date —
// the latest balance may include stock that didn't exist yet.
async function getStockBalanceAt(category: StockCategory, dateISO: string): Promise<number> {
  const { data: latestTx } = await supabase
    .from('StockTransaction')
    .select('date')
    .eq('category', category)
    .order('date', { ascending: false })
    .order('createdAt', { ascending: false })
    .limit(1)
    .single()

  const isBackdated = latestTx && new Date(dateISO) < new Date(latestTx.date)
  if (!isBackdated) {
    return getStockBalance(category)
  }

  const { data: priorTx } = await supabase
    .from('StockTransaction')
    .select('runningTotal')
    .eq('category', category)
    .lt('date', dateISO)
    .order('date', { ascending: false })
    .order('createdAt', { ascending: false })
    .limit(1)
    .single()

  return priorTx?.runningTotal || 0
}

// Recalculate StockTransaction running totals for a category from a given
// date onwards by replaying quantities on top of the balance just before
// that date. All transactions on one calendar date share the same midnight
// timestamp, so a blind "+amount" shift would also move same-date rows that
// occurred BEFORE the affected one — replaying avoids that.
async function recalculateStockTotalsFrom(category: StockCategory, fromDate: string) {
  const { data: prior } = await supabase
    .from('StockTransaction')
    .select('runningTotal')
    .eq('category', category)
    .lt('date', fromDate)
    .order('date', { ascending: false })
    .order('createdAt', { ascending: false })
    .limit(1)
    .single()

  const baseline = prior?.runningTotal || 0

  const { data: transactions, error } = await supabase
    .from('StockTransaction')
    .select('id, quantity')
    .eq('category', category)
    .gte('date', fromDate)
    .order('date', { ascending: true })
    .order('createdAt', { ascending: true })

  if (error) throw error

  let runningTotal = baseline
  for (const tx of transactions || []) {
    runningTotal += tx.quantity
    const { error: updateError } = await supabase
      .from('StockTransaction')
      .update({ runningTotal })
      .eq('id', tx.id)
    if (updateError) throw updateError
  }
}

// Create the mirror StockTransaction for an inventory row. The running
// total is corrected afterwards by recalculateStockTotalsFrom.
async function createMirrorTransaction(dateISO: string, spec: MirrorSpec) {
  const currentBalance = await getStockBalance(spec.category)

  const { error } = await supabase
    .from('StockTransaction')
    .insert({
      id: randomUUID(),
      date: dateISO,
      type: spec.type,
      category: spec.category,
      quantity: spec.quantity,
      unit: 'LITERS',
      description: spec.description,
      runningTotal: currentBalance + spec.quantity,
    })

  if (error) throw error
}

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

    const newDateISO = validatedData.date
      ? validatedData.date.toISOString()
      : existing.date

    // Work out how the edit affects the mirrored Free DEF stock entry
    const oldSpec = getMirrorSpec(existing)
    const newSpec = getMirrorSpec({ ...updatedData, quantity: updatedData.quantity })

    // If the edit deducts MORE Free DEF than before, make sure it's
    // available at the (possibly backdated) transaction date
    if (newSpec) {
      const oldLiters = oldSpec ? Math.abs(oldSpec.quantity) : 0
      const extraLiters = Math.abs(newSpec.quantity) - oldLiters
      if (extraLiters > 0) {
        const freeDEFBalance = await getStockBalanceAt(StockCategory.FREE_DEF, newDateISO)
        if (freeDEFBalance < extraLiters) {
          return NextResponse.json(
            {
              success: false,
              message: `Insufficient Free DEF for this change. It needs ${extraLiters}L more, but only ${freeDEFBalance}L is available.`,
            },
            { status: 400 }
          )
        }
      }
    }

    // Locate the old mirror BEFORE updating, but only delete it AFTER the
    // inventory update succeeds — deleting first could leave the deduction
    // missing if the update fails.
    const oldMirror = oldSpec ? await findMirrorTransaction(existing, oldSpec) : null
    if (oldSpec && !oldMirror) {
      // The mirror this row should have is missing or no longer matches
      // (pre-existing desync). Don't create a fresh one — replaying both
      // would double-deduct. Leave the stock side untouched and warn.
      console.error(
        `Inventory PUT: expected mirror StockTransaction not found for inventory ${id} (${oldSpec.type} ${oldSpec.quantity}L on ${existing.date}) — skipping mirror sync`
      )
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

    // Sync the mirror: replace the old one with one built from new values.
    // Skipped when the old mirror was expected but missing (see above).
    const syncMirror = !oldSpec || !!oldMirror
    if (syncMirror) {
      if (oldMirror) {
        const { error: mirrorDeleteError } = await supabase
          .from('StockTransaction')
          .delete()
          .eq('id', oldMirror.id)
        if (mirrorDeleteError) throw mirrorDeleteError
      }
      if (newSpec) {
        await createMirrorTransaction(newDateISO, newSpec)
      }
      // Replay Free DEF running totals from the earliest affected date
      if (oldMirror || newSpec) {
        const fromDate =
          new Date(existing.date) <= new Date(newDateISO) ? existing.date : newDateISO
        await recalculateStockTotalsFrom(StockCategory.FREE_DEF, fromDate)
      }
    }

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

    // Delete the mirrored Free DEF stock entry (if any), then replay the
    // category's running totals. Deleting exactly one matched row keeps a
    // second identical sale on the same day intact.
    const spec = getMirrorSpec(transaction)
    if (spec) {
      const mirror = await findMirrorTransaction(transaction, spec)
      if (mirror) {
        const { error: mirrorDeleteError } = await supabase
          .from('StockTransaction')
          .delete()
          .eq('id', mirror.id)
        if (mirrorDeleteError) throw mirrorDeleteError

        await recalculateStockTotalsFrom(spec.category, transaction.date)
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
