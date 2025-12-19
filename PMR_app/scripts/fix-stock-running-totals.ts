#!/usr/bin/env tsx
/**
 * Script to fix incorrect running totals in StockTransaction table
 *
 * The issue: When backdated transactions are inserted, the system calculates
 * their running totals based on the most recent date, not the correct chronological
 * position. This script recalculates all running totals in the correct order.
 *
 * Usage: tsx scripts/fix-stock-running-totals.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

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

async function fixStockRunningTotals() {
  console.log('🔧 Starting Stock Running Totals Fix...\n')

  try {
    // Fetch all stock transactions
    const { data: allTransactions, error: fetchError } = await supabase
      .from('StockTransaction')
      .select('*')
      .order('date', { ascending: true })
      .order('createdAt', { ascending: true })

    if (fetchError) {
      throw new Error(`Failed to fetch transactions: ${fetchError.message}`)
    }

    if (!allTransactions || allTransactions.length === 0) {
      console.log('ℹ️  No transactions found.')
      return
    }

    console.log(`📊 Found ${allTransactions.length} total transactions`)

    // Group by category and recalculate running totals
    const categories = ['UREA', 'FREE_DEF', 'FINISHED_GOODS']
    const updates: Array<{ id: string; oldTotal: number; newTotal: number; category: string; date: string }> = []

    for (const category of categories) {
      const categoryTransactions = allTransactions.filter(t => t.category === category)

      if (categoryTransactions.length === 0) {
        console.log(`\nℹ️  No transactions for ${category}`)
        continue
      }

      console.log(`\n📋 Processing ${category}: ${categoryTransactions.length} transactions`)

      let runningTotal = 0

      for (const transaction of categoryTransactions) {
        const oldRunningTotal = transaction.runningTotal
        runningTotal += transaction.quantity

        if (Math.abs(runningTotal - oldRunningTotal) > 0.01) {
          updates.push({
            id: transaction.id,
            oldTotal: oldRunningTotal,
            newTotal: runningTotal,
            category: transaction.category,
            date: transaction.date
          })

          // Update the transaction
          const { error: updateError } = await supabase
            .from('StockTransaction')
            .update({ runningTotal })
            .eq('id', transaction.id)

          if (updateError) {
            console.error(`❌ Failed to update transaction ${transaction.id}: ${updateError.message}`)
          } else {
            console.log(`  ✅ Fixed ${transaction.id.substring(0, 8)}... (${new Date(transaction.date).toLocaleDateString()}): ${oldRunningTotal.toFixed(2)} → ${runningTotal.toFixed(2)}`)
          }
        }
      }

      console.log(`\n✅ ${category} final balance: ${runningTotal.toFixed(2)} ${category === 'UREA' ? 'kg' : 'L'}`)
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Summary of Changes')
    console.log('='.repeat(60))

    if (updates.length === 0) {
      console.log('✅ All running totals are correct! No updates needed.')
    } else {
      console.log(`\n🔧 Updated ${updates.length} transactions:\n`)

      for (const category of categories) {
        const categoryUpdates = updates.filter(u => u.category === category)
        if (categoryUpdates.length > 0) {
          console.log(`\n${category}:`)
          for (const update of categoryUpdates) {
            const date = new Date(update.date).toLocaleDateString()
            const diff = update.newTotal - update.oldTotal
            const sign = diff > 0 ? '+' : ''
            console.log(`  ${date}: ${update.oldTotal.toFixed(2)} → ${update.newTotal.toFixed(2)} (${sign}${diff.toFixed(2)})`)
          }
        }
      }
    }

    console.log('\n✅ Stock running totals fix complete!\n')

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

// Run the fix
fixStockRunningTotals()
