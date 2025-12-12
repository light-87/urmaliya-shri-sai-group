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

    // Build filter conditions
    const where: Record<string, unknown> = {
      name: { equals: name, mode: 'insensitive' },
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        (where.date as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999);
        (where.date as Record<string, Date>).lte = end
      }
    }

    // Fetch transactions
    const transactions = await prisma.expenseTransaction.findMany({
      where,
      orderBy: { date: 'asc' },
    })

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
