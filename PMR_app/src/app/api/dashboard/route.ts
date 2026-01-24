import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { subMonths } from 'date-fns'

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
      // Parse dates explicitly to avoid timezone ambiguity
      const [sYear, sMonth, sDay] = startDateParam.split('-').map(Number)
      startDate = new Date(Date.UTC(sYear, sMonth - 1, sDay, 0, 0, 0, 0))
      const [eYear, eMonth, eDay] = endDateParam.split('-').map(Number)
      endDate = new Date(Date.UTC(eYear, eMonth - 1, eDay, 23, 59, 59, 999))
    } else if (view === 'last12months') {
      // FIX: Use UTC-based date arithmetic to avoid timezone issues
      const now = new Date()
      const nowYear = now.getUTCFullYear()
      const nowMonth = now.getUTCMonth()
      const nowDay = now.getUTCDate()

      // End date: today at end of day UTC
      endDate = new Date(Date.UTC(nowYear, nowMonth, nowDay, 23, 59, 59, 999))

      // Start date: 12 months ago at start of day UTC
      // Calculate 12 months ago using UTC arithmetic (not date-fns which uses local time)
      let startYear = nowYear
      let startMonth = nowMonth - 12
      if (startMonth < 0) {
        startYear -= 1
        startMonth += 12
      }
      startDate = new Date(Date.UTC(startYear, startMonth, nowDay, 0, 0, 0, 0))
    } else if (view === 'alltime') {
      // Get earliest and latest dates from data
      // FIX: Removed .not() filter that was causing issues with Supabase queries
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
      // Default to selected year - use UTC dates to avoid timezone issues
      // Create dates using UTC to ensure Jan 1 00:00 UTC to Dec 31 23:59 UTC
      startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))  // Jan 1, year 00:00:00 UTC
      endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))  // Dec 31, year 23:59:59 UTC
    }

    // DEBUG: Log the date range being used
    console.log('=== DASHBOARD DATE RANGE DEBUG ===')
    console.log('View:', view, 'Year param:', year)
    console.log('Start Date:', startDate.toISOString())
    console.log('End Date:', endDate.toISOString())
    console.log('================================')

    // Build Supabase query with filters
    // FIX: Removed .not('name', 'like', '[%') filter that was causing ALL accounts query to return 0 results
    // Registry expenses will be filtered in JavaScript instead (more reliable)
    let query = supabase
      .from('ExpenseTransaction')
      .select('*')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: true })
      .limit(10000)  // Override default 1000 limit to get all transactions

    // Add account filter if accounts are specified (not "ALL")
    if (accountsParam && accountsParam !== 'ALL') {
      const accounts = accountsParam.split(',')
      query = query.in('account', accounts)
    }

    const { data: rawTransactions, error } = await query
    if (error) throw error

    // FIX: Filter out registry expenses in JavaScript (names starting with '[')
    // This is more reliable than the Supabase .not() filter which was causing issues
    const transactions = rawTransactions.filter(t => !t.name?.startsWith('['))

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

    // Calculate monthly data - initialize all months in range to prevent chart gaps
    const monthlyMap = new Map<string, { income: number; expense: number }>()

    // Helper to get UTC month key from a date
    const getMonthKey = (date: Date): string => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`
    }

    // Initialize all months between startDate and endDate using UTC
    let currentYear = startDate.getUTCFullYear()
    let currentMonthNum = startDate.getUTCMonth()
    const endYear = endDate.getUTCFullYear()
    const endMonthNum = endDate.getUTCMonth()

    while (currentYear < endYear || (currentYear === endYear && currentMonthNum <= endMonthNum)) {
      const tempDate = new Date(Date.UTC(currentYear, currentMonthNum, 1))
      const monthKey = getMonthKey(tempDate)
      monthlyMap.set(monthKey, { income: 0, expense: 0 })

      currentMonthNum++
      if (currentMonthNum > 11) {
        currentMonthNum = 0
        currentYear++
      }
    }

    // Helper to parse date from database - handles both ISO and simple date formats
    const parseDbDate = (dateStr: string): Date => {
      if (dateStr.includes('T')) {
        return new Date(dateStr)
      }
      // Simple date format "YYYY-MM-DD" - parse explicitly as UTC
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    }

    // Populate with actual transaction data using explicit UTC date parsing
    transactions.forEach(t => {
      const txDate = parseDbDate(t.date)
      const monthKey = getMonthKey(txDate)
      const existing = monthlyMap.get(monthKey) || { income: 0, expense: 0 }
      const amount = Number(t.amount)

      if (t.type === 'INCOME') {
        existing.income += amount
      } else {
        existing.expense += amount
      }

      monthlyMap.set(monthKey, existing)
    })

    // Convert to array while preserving chronological order
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
