import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import type { BucketType, Warehouse } from '@/types'

export const dynamic = 'force-dynamic'

interface InventoryTransaction {
  id: string
  date: string
  warehouse: Warehouse
  bucketType: BucketType
  action: string
  quantity: number
  buyerSeller: string
  runningTotal: number
  createdAt: string
  updatedAt: string
}

interface UpdateRecord {
  id: string
  oldTotal: number
  newTotal: number
  bucketType: BucketType
  warehouse: Warehouse
  date: string
  quantity: number
}

/**
 * POST /api/admin/fix-inventory-totals
 *
 * Recalculates all running totals in InventoryTransaction table in correct chronological order.
 * This fixes issues caused by backdated transactions that were inserted after later-dated transactions.
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only admins can run this repair operation' },
        { status: 403 }
      )
    }

    const logs: string[] = []
    logs.push('🔧 Starting Inventory Running Totals Fix...')

    // Fetch all inventory transactions ordered by date, then createdAt
    const { data: allTransactions, error: fetchError } = await supabase
      .from('InventoryTransaction')
      .select('*')
      .order('date', { ascending: true })
      .order('createdAt', { ascending: true })

    if (fetchError) {
      logs.push(`❌ Failed to fetch transactions: ${fetchError.message}`)
      return NextResponse.json({ success: false, message: fetchError.message, logs }, { status: 500 })
    }

    if (!allTransactions || allTransactions.length === 0) {
      logs.push('ℹ️  No transactions found.')
      return NextResponse.json({ success: true, message: 'No transactions to fix', logs })
    }

    logs.push(`📊 Found ${allTransactions.length} total transactions`)

    // Group by bucketType+warehouse combination and recalculate running totals
    const allUpdates: UpdateRecord[] = []
    const finalBalances: Record<string, number> = {}

    // Get unique combinations of bucketType+warehouse
    const combinations = new Set<string>()
    for (const tx of allTransactions) {
      combinations.add(`${tx.bucketType}:${tx.warehouse}`)
    }

    logs.push(`📋 Processing ${combinations.size} bucket+warehouse combinations`)

    for (const combo of Array.from(combinations)) {
      const [bucketType, warehouse] = combo.split(':') as [BucketType, Warehouse]

      const comboTransactions = allTransactions.filter(
        (t): t is InventoryTransaction =>
          t.bucketType === bucketType && t.warehouse === warehouse
      )

      if (comboTransactions.length === 0) continue

      logs.push(`\n📦 ${bucketType} @ ${warehouse}: ${comboTransactions.length} transactions`)

      let runningTotal = 0
      const updates: UpdateRecord[] = []

      for (const transaction of comboTransactions) {
        const oldRunningTotal = transaction.runningTotal
        runningTotal += transaction.quantity

        if (Math.abs(runningTotal - oldRunningTotal) > 0.01) {
          updates.push({
            id: transaction.id,
            oldTotal: oldRunningTotal,
            newTotal: runningTotal,
            bucketType: transaction.bucketType,
            warehouse: transaction.warehouse,
            date: transaction.date,
            quantity: transaction.quantity
          })

          // Update the transaction
          const { error: updateError } = await supabase
            .from('InventoryTransaction')
            .update({ runningTotal })
            .eq('id', transaction.id)

          if (updateError) {
            logs.push(`  ❌ Failed to update transaction ${transaction.id}: ${updateError.message}`)
          } else {
            const dateStr = new Date(transaction.date).toLocaleDateString()
            const quantityStr = transaction.quantity > 0 ? `+${transaction.quantity}` : `${transaction.quantity}`
            logs.push(`  ✅ ${transaction.id.substring(0, 8)}... (${dateStr}): ${quantityStr} → running: ${oldRunningTotal.toFixed(2)} → ${runningTotal.toFixed(2)}`)
          }
        }
      }

      allUpdates.push(...updates)
      finalBalances[combo] = runningTotal

      logs.push(`✅ ${bucketType} @ ${warehouse} final balance: ${runningTotal} buckets`)
    }

    // Summary
    logs.push('\n' + '='.repeat(60))
    logs.push('📊 Summary of Changes')
    logs.push('='.repeat(60))

    if (allUpdates.length === 0) {
      logs.push('✅ All running totals were already correct! No updates needed.')
    } else {
      logs.push(`\n🔧 Updated ${allUpdates.length} transactions:`)

      for (const combo of Array.from(combinations)) {
        const comboUpdates = allUpdates.filter(
          u => `${u.bucketType}:${u.warehouse}` === combo
        )
        if (comboUpdates.length > 0) {
          logs.push(`\n${combo}:`)
          for (const update of comboUpdates) {
            const date = new Date(update.date).toLocaleDateString()
            const diff = update.newTotal - update.oldTotal
            const sign = diff > 0 ? '+' : ''
            logs.push(`  ${date}: ${update.oldTotal.toFixed(2)} → ${update.newTotal.toFixed(2)} (${sign}${diff.toFixed(2)})`)
          }
        }
      }
    }

    logs.push('\n✅ Inventory running totals fix complete!')

    return NextResponse.json({
      success: true,
      message: `Fixed ${allUpdates.length} transactions`,
      updates: allUpdates,
      finalBalances,
      logs
    })

  } catch (error) {
    console.error('Fix inventory totals error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fix inventory totals'
      },
      { status: 500 }
    )
  }
}
