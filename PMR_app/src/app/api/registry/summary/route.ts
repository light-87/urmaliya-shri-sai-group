import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET - Fetch registry summary statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission
    if (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Registry access required.' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build base query
    let query = supabase
      .from('registry_transactions')
      .select('*')

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('date', new Date(startDate).toISOString())
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      query = query.lte('date', end.toISOString())
    }

    const { data: transactions, error } = await query

    if (error) throw error

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          totalTransactions: 0,
          totalIncome: 0,
          totalExpenses: 0,
          netProfit: 0,
          pendingPayments: 0,
          statusBreakdown: [],
        },
      })
    }

    // Calculate summary statistics
    const totalTransactions = transactions.length

    // Total Income = Sum of (credit_received + stamp_commission)
    const totalIncome = transactions.reduce(
      (sum, tx) => sum + parseFloat(tx.credit_received) + parseFloat(tx.stamp_commission),
      0
    )

    // Total Expenses = Sum of total_expenses
    const totalExpenses = transactions.reduce(
      (sum, tx) => sum + parseFloat(tx.total_expenses),
      0
    )

    // Net Profit = Sum of amount_profit
    const netProfit = transactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amount_profit),
      0
    )

    // Pending Payments = Sum of balance_due where balance_due > 0
    const pendingPayments = transactions.reduce(
      (sum, tx) => {
        const balanceDue = parseFloat(tx.balance_due)
        return balanceDue > 0 ? sum + balanceDue : sum
      },
      0
    )

    // Status Breakdown
    const statusMap = new Map<
      string,
      { count: number; totalAmount: number }
    >()

    transactions.forEach(tx => {
      const status = tx.payment_status
      const current = statusMap.get(status) || { count: 0, totalAmount: 0 }
      statusMap.set(status, {
        count: current.count + 1,
        totalAmount: current.totalAmount + parseFloat(tx.property_value),
      })
    })

    const statusBreakdown = Array.from(statusMap.entries()).map(
      ([status, data]) => ({
        status,
        count: data.count,
        amount: data.totalAmount,
      })
    )

    return NextResponse.json({
      success: true,
      summary: {
        totalTransactions,
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        pendingPayments: Math.round(pendingPayments * 100) / 100,
        statusBreakdown,
      },
    })
  } catch (error) {
    console.error('Registry summary error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch registry summary' },
      { status: 500 }
    )
  }
}
