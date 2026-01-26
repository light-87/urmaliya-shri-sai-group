import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { ExpenseAccount, TransactionType } from '@/types'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// Helper to parse date string to UTC Date
const parseToUTCDate = (str: string): Date => {
  // Handle both "YYYY-MM-DD" and ISO formats
  if (str.includes('T')) {
    return new Date(str)
  }
  const [year, month, day] = str.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

// Validation schema for creating expense transaction
const createExpenseSchema = z.object({
  date: z.string().transform(parseToUTCDate),
  amount: z.number().min(0),
  account: z.nativeEnum(ExpenseAccount),
  type: z.nativeEnum(TransactionType),
  name: z.string().min(1),
  description: z.string().optional(),
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
    // FIX: Removed .not('name', 'like', '[%') filter - it was causing issues with Supabase queries
    // Registry expenses are filtered in JavaScript instead
    let query = supabase
      .from('ExpenseTransaction')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Apply filters - parse dates explicitly to avoid timezone issues
    if (startDate) {
      const [year, month, day] = startDate.split('-').map(Number)
      const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      query = query.gte('date', start.toISOString())
    }
    if (endDate) {
      const [year, month, day] = endDate.split('-').map(Number)
      const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
      query = query.lte('date', end.toISOString())
    }
    if (account) query = query.eq('account', account)
    if (type) query = query.eq('type', type)
    if (name) query = query.ilike('name', `%${name}%`)

    const { data: rawTransactions, error, count: rawTotal } = await query
    if (error) throw error

    // FIX: Filter out registry expenses in JavaScript (names starting with '[')
    const transactions = rawTransactions?.filter(t => !t.name?.startsWith('[')) || []
    // Adjust total count (note: this is an approximation if registry expenses exist)
    const total = rawTotal || 0

    // Get unique names for autocomplete
    const { data: namesData } = await supabase
      .from('ExpenseTransaction')
      .select('name')
      .order('name', { ascending: true })

    // Filter out registry expense names in JavaScript
    const uniqueNames = [...new Set(namesData?.filter(r => !r.name?.startsWith('[')).map(r => r.name) || [])]

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
        description: validatedData.description,
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
