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

    // Build filter conditions
    const where: Record<string, unknown> = {}

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        (where.date as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        ;(where.date as Record<string, Date>).lte = end
      }
    }

    if (account) where.account = account
    if (type) where.type = type
    if (name) where.name = { contains: name, mode: 'insensitive' }

    // Fetch transactions
    const transactions = await prisma.expenseTransaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })

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
