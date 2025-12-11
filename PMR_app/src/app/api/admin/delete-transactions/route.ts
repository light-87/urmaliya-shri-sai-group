import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const inventoryCount = await prisma.inventoryTransaction.count({
      where: {
        createdAt: {
          gte: cutoffDate,
        },
      },
    })

    const expenseCount = await prisma.expenseTransaction.count({
      where: {
        createdAt: {
          gte: cutoffDate,
        },
      },
    })

    // Delete the transactions
    const [deletedInventory, deletedExpenses] = await prisma.$transaction([
      prisma.inventoryTransaction.deleteMany({
        where: {
          createdAt: {
            gte: cutoffDate,
          },
        },
      }),
      prisma.expenseTransaction.deleteMany({
        where: {
          createdAt: {
            gte: cutoffDate,
          },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Transactions deleted successfully',
      inventoryDeleted: deletedInventory.count,
      expensesDeleted: deletedExpenses.count,
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
