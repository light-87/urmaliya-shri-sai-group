import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { ExpenseAccount, TransactionType } from '@/types'

export const dynamic = 'force-dynamic'

// GET - Search expense transactions with advanced filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission - only ADMIN and EXPENSE_INVENTORY can search
    if (session.role === 'INVENTORY_ONLY') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const account = searchParams.get('account') as ExpenseAccount | null
    const type = searchParams.get('type') as TransactionType | null
    const name = searchParams.get('name')

    // Build Supabase query with filters
    // FIX: Removed .not('name', 'like', '[%') filter - filtering in JavaScript instead
    let query = supabase
      .from('ExpenseTransaction')
      .select('*')
      .order('date', { ascending: false })
      .order('createdAt', { ascending: false })
      .limit(10000)  // Override default 1000 limit

    if (startDate) {
      // Parse date explicitly to avoid timezone ambiguity
      // Date inputs are in YYYY-MM-DD format
      const [year, month, day] = startDate.split('-').map(Number)
      const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      query = query.gte('date', start.toISOString())
    }
    if (endDate) {
      // Parse date explicitly to avoid timezone ambiguity
      const [year, month, day] = endDate.split('-').map(Number)
      const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
      query = query.lte('date', end.toISOString())
    }
    if (account) {
      query = query.eq('account', account)
    }
    if (type) {
      query = query.eq('type', type)
    }
    if (name) {
      query = query.ilike('name', `%${name}%`)
    }

    const { data: rawTransactions, error } = await query
    if (error) throw error

    // FIX: Filter out registry expenses in JavaScript (names starting with '[')
    const transactions = rawTransactions.filter(t => !t.name?.startsWith('['))

    // Calculate totals
    let totalIncome = 0
    let totalExpense = 0

    transactions.forEach((t) => {
      if (t.type === 'INCOME') {
        totalIncome += Number(t.amount)
      } else {
        totalExpense += Number(t.amount)
      }
    })

    const totalBalance = totalIncome - totalExpense

    return NextResponse.json({
      success: true,
      transactions,
      totalIncome,
      totalExpense,
      totalBalance,
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to search transactions' },
      { status: 500 }
    )
  }
}
