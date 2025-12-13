import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST - Delete transactions created after a specific timestamp
 * Only accessible by ADMIN role
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin permission
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only admins can delete transactions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { afterTimestamp } = body

    if (!afterTimestamp) {
      return NextResponse.json(
        { success: false, message: 'afterTimestamp is required (ISO date string)' },
        { status: 400 }
      )
    }

    const cutoffDate = new Date(afterTimestamp)

    if (isNaN(cutoffDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Invalid timestamp format' },
        { status: 400 }
      )
    }

    // Count transactions that will be deleted
    const { count: inventoryCount } = await supabase
      .from('InventoryTransaction')
      .select('*', { count: 'exact', head: true })
      .gte('createdAt', cutoffDate.toISOString())

    const { count: expenseCount } = await supabase
      .from('ExpenseTransaction')
      .select('*', { count: 'exact', head: true })
      .gte('createdAt', cutoffDate.toISOString())

    // Delete the transactions
    const { error: inventoryError } = await supabase
      .from('InventoryTransaction')
      .delete()
      .gte('createdAt', cutoffDate.toISOString())

    if (inventoryError) throw inventoryError

    const { error: expenseError } = await supabase
      .from('ExpenseTransaction')
      .delete()
      .gte('createdAt', cutoffDate.toISOString())

    if (expenseError) throw expenseError

    return NextResponse.json({
      success: true,
      message: 'Transactions deleted successfully',
      inventoryDeleted: inventoryCount || 0,
      expensesDeleted: expenseCount || 0,
    })
  } catch (error) {
    console.error('Delete transactions error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete transactions',
      },
      { status: 500 }
    )
  }
}
