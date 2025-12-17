import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { ExpenseAccount, TransactionType } from '@/types'

export const dynamic = 'force-dynamic'

// Zod schema for registry expense validation
const registryExpenseSchema = z.object({
  date: z.string(),
  amount: z.number().min(0, 'Amount cannot be negative'),
  account: z.nativeEnum(ExpenseAccount),
  type: z.nativeEnum(TransactionType),
  name: z.string().min(1, 'Name is required'),
})

// GET: Fetch all registry-related expenses
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
    const account = searchParams.get('account')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query - ONLY fetch registry expenses (those with category tags)
    let query = supabase
      .from('ExpenseTransaction')
      .select('*', { count: 'exact' })
      .like('name', '[%')  // Only expenses with category tags starting with '['
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (dateFrom) {
      query = query.gte('date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('date', dateTo)
    }
    if (account && account !== 'ALL') {
      query = query.eq('account', account)
    }
    if (type && type !== 'ALL') {
      query = query.eq('type', type)
    }
    if (category) {
      query = query.ilike('name', `%[${category}]%`)
    }

    const { data: expenses, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      expenses: expenses || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Registry expenses GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch registry expenses' },
      { status: 500 }
    )
  }
}

// POST: Create a new registry expense
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input
    const validatedData = registryExpenseSchema.parse(body)

    // Add [REGISTRY] tag to name to distinguish from normal expenses
    const expenseName = `[REGISTRY] ${validatedData.name}`

    // Create expense transaction
    const { data: expense, error } = await supabase
      .from('ExpenseTransaction')
      .insert({
        id: randomUUID(),
        date: validatedData.date,
        amount: validatedData.amount,
        account: validatedData.account,
        type: validatedData.type,
        name: expenseName,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      expense,
    })
  } catch (error) {
    console.error('Registry expenses POST error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create registry expense' },
      { status: 500 }
    )
  }
}

// PUT: Update an existing registry expense
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Expense ID is required' },
        { status: 400 }
      )
    }

    // Validate update data
    const validatedData = registryExpenseSchema.partial().parse(updateData)

    const updatePayload: any = {}
    if (validatedData.date) updatePayload.date = validatedData.date
    if (validatedData.amount) updatePayload.amount = validatedData.amount
    if (validatedData.account) updatePayload.account = validatedData.account
    if (validatedData.type) updatePayload.type = validatedData.type
    // Add [REGISTRY] tag to name to distinguish from normal expenses
    if (validatedData.name) updatePayload.name = `[REGISTRY] ${validatedData.name}`

    const { data: expense, error } = await supabase
      .from('ExpenseTransaction')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      expense,
    })
  } catch (error) {
    console.error('Registry expenses PUT error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update registry expense' },
      { status: 500 }
    )
  }
}

// DELETE: Delete a registry expense
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can delete
    if (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER') {
      return NextResponse.json(
        { success: false, message: 'Only admins and registry managers can delete expenses' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Expense ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('ExpenseTransaction')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Registry expense deleted successfully',
    })
  } catch (error) {
    console.error('Registry expenses DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete registry expense' },
      { status: 500 }
    )
  }
}
