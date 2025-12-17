import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: Get summary of registry expenses
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
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build query - ONLY fetch registry expenses (those with category tags)
    let query = supabase
      .from('ExpenseTransaction')
      .select('*')
      .like('name', '[%')  // Only expenses with category tags starting with '['

    if (dateFrom) {
      query = query.gte('date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('date', dateTo)
    }

    const { data: expenses, error } = await query

    if (error) throw error

    // Calculate summary
    const totalExpenses = expenses?.reduce((sum, exp) => {
      return exp.type === 'EXPENSE' ? sum + Number(exp.amount) : sum
    }, 0) || 0

    const totalIncome = expenses?.reduce((sum, exp) => {
      return exp.type === 'INCOME' ? sum + Number(exp.amount) : sum
    }, 0) || 0

    // Category breakdown (extract category from name)
    const categoryBreakdown: Record<string, number> = {}
    expenses?.forEach((exp) => {
      const match = exp.name.match(/\[(.*?)\]/)
      if (match && exp.type === 'EXPENSE') {
        const category = match[1]
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + Number(exp.amount)
      }
    })

    // Account breakdown
    const accountBreakdown: Record<string, { income: number; expense: number }> = {}
    expenses?.forEach((exp) => {
      if (!accountBreakdown[exp.account]) {
        accountBreakdown[exp.account] = { income: 0, expense: 0 }
      }
      if (exp.type === 'INCOME') {
        accountBreakdown[exp.account].income += Number(exp.amount)
      } else {
        accountBreakdown[exp.account].expense += Number(exp.amount)
      }
    })

    return NextResponse.json({
      success: true,
      summary: {
        totalExpenses,
        totalIncome,
        netAmount: totalIncome - totalExpenses,
        transactionCount: expenses?.length || 0,
        categoryBreakdown,
        accountBreakdown,
      },
    })
  } catch (error) {
    console.error('Registry expenses summary error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch expense summary' },
      { status: 500 }
    )
  }
}
