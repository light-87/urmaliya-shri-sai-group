import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface StockTransaction {
  id: string
  date: string
  type: string
  category: string
  quantity: number
  unit: string
  description: string | null
  runningTotal: number
  createdAt: string
  updatedAt: string
}

interface UpdateRecord {
  id: string
  oldTotal: number
  newTotal: number
  category: string
  date: string
  quantity: number
}

/**
 * POST /api/admin/fix-stock-totals
 *
 * Recalculates all running totals in StockTransaction table in correct chronological order.
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
    logs.push('🔧 Starting Stock Running Totals Fix...')

    // Fetch all stock transactions ordered by date, then createdAt
    const { data: allTransactions, error: fetchError } = await supabase
      .from('StockTransaction')
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

    // Group by category and recalculate running totals
    const categories = ['UREA', 'FREE_DEF', 'FINISHED_GOODS'] as const
    const allUpdates: UpdateRecord[] = []
    const finalBalances: Record<string, number> = {}

    for (const category of categories) {
      const categoryTransactions = allTransactions.filter(
        (t): t is StockTransaction => t.category === category
      )

      if (categoryTransactions.length === 0) {
        logs.push(`\nℹ️  No transactions for ${category}`)
        continue
      }

      logs.push(`\n📋 Processing ${category}: ${categoryTransactions.length} transactions`)

      let runningTotal = 0
      const updates: UpdateRecord[] = []

      for (const transaction of categoryTransactions) {
        const oldRunningTotal = transaction.runningTotal
        runningTotal += transaction.quantity

        if (Math.abs(runningTotal - oldRunningTotal) > 0.01) {
          updates.push({
            id: transaction.id,
            oldTotal: oldRunningTotal,
            newTotal: runningTotal,
            category: transaction.category,
            date: transaction.date,
            quantity: transaction.quantity
          })

          // Update the transaction
          const { error: updateError } = await supabase
            .from('StockTransaction')
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
      finalBalances[category] = runningTotal

      const unit = category === 'UREA' ? 'kg' : 'L'
      logs.push(`✅ ${category} final balance: ${runningTotal.toFixed(2)} ${unit}`)
    }

    // Summary
    logs.push('\n' + '='.repeat(60))
    logs.push('📊 Summary of Changes')
    logs.push('='.repeat(60))

    if (allUpdates.length === 0) {
      logs.push('✅ All running totals were already correct! No updates needed.')
    } else {
      logs.push(`\n🔧 Updated ${allUpdates.length} transactions:`)

      for (const category of categories) {
        const categoryUpdates = allUpdates.filter(u => u.category === category)
        if (categoryUpdates.length > 0) {
          logs.push(`\n${category}:`)
          for (const update of categoryUpdates) {
            const date = new Date(update.date).toLocaleDateString()
            const diff = update.newTotal - update.oldTotal
            const sign = diff > 0 ? '+' : ''
            logs.push(`  ${date}: ${update.oldTotal.toFixed(2)} → ${update.newTotal.toFixed(2)} (${sign}${diff.toFixed(2)})`)
          }
        }
      }
    }

    logs.push('\n✅ Stock running totals fix complete!')

    return NextResponse.json({
      success: true,
      message: `Fixed ${allUpdates.length} transactions`,
      updates: allUpdates,
      finalBalances,
      logs
    })

  } catch (error) {
    console.error('Fix stock totals error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fix stock totals'
      },
      { status: 500 }
    )
  }
}
