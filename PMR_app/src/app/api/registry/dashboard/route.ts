import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current_month' // current_month, last_month, last_3_months, last_6_months, year

    // Calculate date range based on period
    let dateFrom: Date
    let dateTo: Date = new Date()

    switch (period) {
      case 'current_month':
        dateFrom = startOfMonth(new Date())
        dateTo = endOfMonth(new Date())
        break
      case 'last_month':
        dateFrom = startOfMonth(subMonths(new Date(), 1))
        dateTo = endOfMonth(subMonths(new Date(), 1))
        break
      case 'last_3_months':
        dateFrom = subMonths(new Date(), 3)
        break
      case 'last_6_months':
        dateFrom = subMonths(new Date(), 6)
        break
      case 'year':
        dateFrom = new Date(new Date().getFullYear(), 0, 1)
        break
      default:
        dateFrom = startOfMonth(new Date())
    }

    const dateFromStr = format(dateFrom, 'yyyy-MM-dd')
    const dateToStr = format(dateTo, 'yyyy-MM-dd')

    // Fetch registry transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('registry_transactions')
      .select('*')
      .gte('date', dateFromStr)
      .lte('date', dateToStr)
      .order('date', { ascending: false })

    if (transactionsError) throw transactionsError

    // Fetch registry expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('ExpenseTransaction')
      .select('*')
      .gte('date', dateFromStr)
      .lte('date', dateToStr)

    if (expensesError) throw expensesError

    // Calculate overall metrics
    const totalTransactions = transactions?.length || 0

    const totalPropertyValue = transactions?.reduce((sum, t) => sum + Number(t.property_value), 0) || 0

    const totalProfit = transactions?.reduce((sum, t) => sum + Number(t.amount_profit), 0) || 0

    const totalIncome = transactions?.reduce((sum, t) => {
      return sum + Number(t.credit_received) + Number(t.stamp_commission)
    }, 0) || 0

    const totalExpenses = transactions?.reduce((sum, t) => sum + Number(t.total_expenses), 0) || 0

    const pendingPayments = transactions?.reduce((sum, t) => {
      return t.payment_status !== 'Paid' && t.payment_status !== 'Cancelled'
        ? sum + Number(t.balance_due)
        : sum
    }, 0) || 0

    // Operational expenses (from ExpenseTransaction)
    const operationalExpenses = expenses?.reduce((sum, exp) => {
      return exp.type === 'EXPENSE' ? sum + Number(exp.amount) : sum
    }, 0) || 0

    const operationalIncome = expenses?.reduce((sum, exp) => {
      return exp.type === 'INCOME' ? sum + Number(exp.amount) : sum
    }, 0) || 0

    // Payment status breakdown
    const paymentStatusBreakdown = transactions?.reduce((acc, t) => {
      const status = t.payment_status || 'Unknown'
      if (!acc[status]) {
        acc[status] = { count: 0, amount: 0 }
      }
      acc[status].count++
      acc[status].amount += Number(t.credit_received)
      return acc
    }, {} as Record<string, { count: number; amount: number }>) || {}

    // Transaction type breakdown
    const transactionTypeBreakdown = transactions?.reduce((acc, t) => {
      const type = t.transaction_type || 'Unknown'
      if (!acc[type]) {
        acc[type] = { count: 0, value: 0, profit: 0 }
      }
      acc[type].count++
      acc[type].value += Number(t.property_value)
      acc[type].profit += Number(t.amount_profit)
      return acc
    }, {} as Record<string, { count: number; value: number; profit: number }>) || {}

    // Location breakdown (top 10 locations)
    const locationBreakdown = transactions?.reduce((acc, t) => {
      const location = t.property_location || 'Unknown'
      if (!acc[location]) {
        acc[location] = { count: 0, value: 0, profit: 0 }
      }
      acc[location].count++
      acc[location].value += Number(t.property_value)
      acc[location].profit += Number(t.amount_profit)
      return acc
    }, {} as Record<string, { count: number; value: number; profit: number }>) || {}

    // Sort locations by count and get top 10
    const topLocations = Object.entries(locationBreakdown)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .reduce((acc, [location, data]) => {
        acc[location] = data
        return acc
      }, {} as Record<string, { count: number; value: number; profit: number }>)

    // Monthly trend (last 6 months)
    const monthlyTrend: Record<string, { transactions: number; profit: number; revenue: number }> = {}

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i)
      const monthKey = format(monthDate, 'MMM yyyy')
      monthlyTrend[monthKey] = { transactions: 0, profit: 0, revenue: 0 }
    }

    transactions?.forEach((t) => {
      const monthKey = format(new Date(t.date), 'MMM yyyy')
      if (monthlyTrend[monthKey]) {
        monthlyTrend[monthKey].transactions++
        monthlyTrend[monthKey].profit += Number(t.amount_profit)
        monthlyTrend[monthKey].revenue += Number(t.credit_received) + Number(t.stamp_commission)
      }
    })

    // Recent transactions (last 10)
    const recentTransactions = transactions?.slice(0, 10).map((t) => ({
      id: t.id,
      transactionId: t.transaction_id,
      date: t.date,
      propertyLocation: t.property_location,
      sellerName: t.seller_name,
      buyerName: t.buyer_name,
      propertyValue: t.property_value,
      amountProfit: t.amount_profit,
      paymentStatus: t.payment_status,
    })) || []

    // Average metrics
    const avgPropertyValue = totalTransactions > 0 ? totalPropertyValue / totalTransactions : 0
    const avgProfit = totalTransactions > 0 ? totalProfit / totalTransactions : 0

    return NextResponse.json({
      success: true,
      dashboard: {
        period,
        dateRange: {
          from: dateFromStr,
          to: dateToStr,
        },
        summary: {
          totalTransactions,
          totalPropertyValue,
          totalProfit,
          totalIncome,
          totalExpenses,
          pendingPayments,
          operationalExpenses,
          operationalIncome,
          netProfit: totalProfit - operationalExpenses + operationalIncome,
          avgPropertyValue,
          avgProfit,
        },
        paymentStatusBreakdown,
        transactionTypeBreakdown,
        topLocations,
        monthlyTrend,
        recentTransactions,
      },
    })
  } catch (error) {
    console.error('Registry dashboard error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
