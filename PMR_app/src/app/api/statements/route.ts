import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET - Fetch transactions for a specific customer/vendor
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin can generate statements
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const name = searchParams.get('name')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Name is required' },
        { status: 400 }
      )
    }

    // Build Supabase query
    let query = supabase
      .from('ExpenseTransaction')
      .select('*')
      .ilike('name', name)  // Case insensitive match
      .order('date', { ascending: true })

    // Apply date filters
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

    // Calculate total balance (income - expense)
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

    const totalBalance = totalIncome - totalExpense

    return NextResponse.json({
      success: true,
      name,
      transactions,
      totalBalance,
    })
  } catch (error) {
    console.error('Statements GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch statement' },
      { status: 500 }
    )
  }
}
