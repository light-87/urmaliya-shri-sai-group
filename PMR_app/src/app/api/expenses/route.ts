import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { ExpenseAccount, TransactionType } from '@/types'

export const dynamic = 'force-dynamic'

// Validation schema for creating expense transaction
const createExpenseSchema = z.object({
  date: z.string().transform(str => new Date(str)),
  amount: z.number().positive(),
  account: z.nativeEnum(ExpenseAccount),
  type: z.nativeEnum(TransactionType),
  name: z.string().min(1),
})

// GET - Fetch expense transactions with pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission - only ADMIN and EXPENSE_INVENTORY can view expenses
    if (session.role === 'INVENTORY_ONLY') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
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
        end.setHours(23, 59, 59, 999);
        (where.date as Record<string, Date>).lte = end
      }
    }

    if (account) where.account = account
    if (type) where.type = type
    if (name) where.name = { contains: name, mode: 'insensitive' }

    // Get total count for pagination
    const total = await prisma.expenseTransaction.count({ where })

    // Fetch transactions
    const transactions = await prisma.expenseTransaction.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    })

    // Get unique names for autocomplete
    const uniqueNamesResult = await prisma.expenseTransaction.findMany({
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    })
    const uniqueNames = uniqueNamesResult.map(r => r.name)

    return NextResponse.json({
      success: true,
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      uniqueNames,
    })
  } catch (error) {
    console.error('Expenses GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

// POST - Create new expense transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission
    if (session.role === 'INVENTORY_ONLY') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createExpenseSchema.parse(body)

    // Create transaction
    const transaction = await prisma.expenseTransaction.create({
      data: {
        date: validatedData.date,
        amount: validatedData.amount,
        account: validatedData.account,
        type: validatedData.type,
        name: validatedData.name,
      },
    })

    return NextResponse.json({
      success: true,
      transaction,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid data', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Expenses POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
