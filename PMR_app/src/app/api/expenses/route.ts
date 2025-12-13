import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { ExpenseAccount, TransactionType } from '@/types'
import { randomUUID } from 'crypto'

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

    // Build Supabase query
    let query = supabase
      .from('ExpenseTransaction')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Apply filters
    if (startDate) {
      query = query.gte('date', new Date(startDate).toISOString())
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      query = query.lte('date', end.toISOString())
    }
    if (account) query = query.eq('account', account)
    if (type) query = query.eq('type', type)
    if (name) query = query.ilike('name', `%${name}%`)

    const { data: transactions, error, count: total } = await query
    if (error) throw error

    // Get unique names for autocomplete
    const { data: namesData } = await supabase
      .from('ExpenseTransaction')
      .select('name')
      .order('name', { ascending: true })

    const uniqueNames = [...new Set(namesData?.map(r => r.name) || [])]

    return NextResponse.json({
      success: true,
      transactions,
      pagination: {
        total: total || 0,
        page,
        limit,
        totalPages: Math.ceil((total || 0) / limit),
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
    const { data: transaction, error } = await supabase
      .from('ExpenseTransaction')
      .insert({
        id: randomUUID(),
        date: validatedData.date.toISOString(),
        amount: validatedData.amount,
        account: validatedData.account,
        type: validatedData.type,
        name: validatedData.name,
      })
      .select()
      .single()

    if (error) throw error

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
