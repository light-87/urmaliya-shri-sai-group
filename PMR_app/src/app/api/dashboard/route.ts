import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { format, subMonths, startOfYear, endOfYear } from 'date-fns'

export const dynamic = 'force-dynamic'

// GET - Fetch dashboard analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin can view dashboard
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const view = searchParams.get('view') || 'year'
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const accountsParam = searchParams.get('accounts')

    // Determine date range based on view
    let startDate: Date
    let endDate: Date

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
      endDate.setHours(23, 59, 59, 999)
    } else if (view === 'last12months') {
      endDate = new Date()
      startDate = subMonths(endDate, 12)
    } else if (view === 'alltime') {
      // Get earliest and latest dates from data
      const { data: earliest, error: earliestError } = await supabase
        .from('ExpenseTransaction')
        .select('date')
        .order('date', { ascending: true })
        .limit(1)
        .single()
      if (earliestError && earliestError.code !== 'PGRST116') throw earliestError

      const { data: latest, error: latestError } = await supabase
        .from('ExpenseTransaction')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .single()
      if (latestError && latestError.code !== 'PGRST116') throw latestError

      startDate = earliest?.date ? new Date(earliest.date) : new Date()
      endDate = latest?.date ? new Date(latest.date) : new Date()
    } else {
      // Default to selected year
      startDate = startOfYear(new Date(year, 0, 1))
      endDate = endOfYear(new Date(year, 0, 1))
    }

    // Build Supabase query with filters
    let query = supabase
      .from('ExpenseTransaction')
      .select('*')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: true })

    // Add account filter if accounts are specified (not "ALL")
    if (accountsParam && accountsParam !== 'ALL') {
      const accounts = accountsParam.split(',')
      query = query.in('account', accounts)
    }

    const { data: transactions, error } = await query
    if (error) throw error

    // Calculate summary
    let totalIncome = 0
    let totalExpense = 0

    transactions.forEach(t => {
      const amount = Number(t.amount)
      if (t.type === 'INCOME') {
        totalIncome += amount
      } else {
        totalExpense += amount
      }
    })

    const summary = {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
    }

    // Calculate monthly data
    const monthlyMap = new Map<string, { income: number; expense: number }>()

    transactions.forEach(t => {
      const month = format(new Date(t.date), 'MMM yyyy')
      const existing = monthlyMap.get(month) || { income: 0, expense: 0 }
      const amount = Number(t.amount)

      if (t.type === 'INCOME') {
        existing.income += amount
      } else {
        existing.expense += amount
      }

      monthlyMap.set(month, existing)
    })

    const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense,
    }))

    // Calculate account breakdown
    const incomeByAccount = new Map<string, number>()
    const expenseByAccount = new Map<string, number>()

    transactions.forEach(t => {
      const amount = Number(t.amount)
      if (t.type === 'INCOME') {
        incomeByAccount.set(t.account, (incomeByAccount.get(t.account) || 0) + amount)
      } else {
        expenseByAccount.set(t.account, (expenseByAccount.get(t.account) || 0) + amount)
      }
    })

    const accountBreakdown = {
      income: Array.from(incomeByAccount.entries()).map(([account, amount]) => ({
        account,
        amount,
      })),
      expense: Array.from(expenseByAccount.entries()).map(([account, amount]) => ({
        account,
        amount,
      })),
    }

    // Trend data (same as monthly but simplified)
    const trendData = monthlyData.map(m => ({
      month: m.month,
      income: m.income,
      expense: m.expense,
    }))

    return NextResponse.json({
      success: true,
      summary,
      monthlyData,
      accountBreakdown,
      trendData,
    })
  } catch (error) {
    console.error('Dashboard GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
