import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const FACTORY_RESET_PIN = '14863'

// POST - Factory Reset (Delete all data)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    // Only admins can perform factory reset
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Only admins can perform factory reset.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { pin } = body

    // Verify PIN
    if (pin !== FACTORY_RESET_PIN) {
      return NextResponse.json(
        { success: false, message: 'Invalid PIN' },
        { status: 401 }
      )
    }

    // Delete all data in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Delete Stock Transactions
      const stockDeleted = await tx.stockTransaction.deleteMany()

      // Delete Inventory Transactions
      const inventoryDeleted = await tx.inventoryTransaction.deleteMany()

      // Delete Expense Transactions
      const expenseDeleted = await tx.expenseTransaction.deleteMany()

      // Get the most recent successful backup before deleting
      const lastBackup = await tx.backupLog.findFirst({
        where: { status: 'SUCCESS' },
        orderBy: { backupDate: 'desc' },
      })

      // Delete all backup logs
      const backupDeleted = await tx.backupLog.deleteMany()

      // Restore the last successful backup log (if exists)
      // This allows recovery from accidental factory reset
      if (lastBackup) {
        await tx.backupLog.create({
          data: {
            backupType: lastBackup.backupType,
            driveFileId: lastBackup.driveFileId,
            inventoryCount: lastBackup.inventoryCount,
            expenseCount: lastBackup.expenseCount,
            stockCount: lastBackup.stockCount,
            leadsCount: lastBackup.leadsCount,
            status: lastBackup.status,
            backupDate: lastBackup.backupDate,
            errorMessage: lastBackup.errorMessage,
          },
        })
      }

      return {
        inventory: inventoryDeleted.count,
        expenses: expenseDeleted.count,
        stock: stockDeleted.count,
        backups: backupDeleted.count,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Factory reset successful. All data has been deleted.',
      deletedCounts: result,
    })
  } catch (error) {
    console.error('Factory reset error:', error)
    return NextResponse.json(
      { success: false, message: 'Factory reset failed' },
      { status: 500 }
    )
  }
}
