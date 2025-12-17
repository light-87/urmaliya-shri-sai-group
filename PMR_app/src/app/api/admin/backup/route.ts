import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { createBackup, getBackupLogs, getLastBackupDate } from '@/lib/backup'

export const dynamic = 'force-dynamic'

// GET: Fetch backup logs and status
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const session = await verifySession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get backup logs and last backup date
    const [logs, lastBackupDate] = await Promise.all([
      getBackupLogs(limit),
      getLastBackupDate(),
    ])

    return NextResponse.json({
      success: true,
      logs,
      lastBackupDate,
    })
  } catch (error) {
    console.error('Error fetching backup logs:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch backup logs' },
      { status: 500 }
    )
  }
}

// POST: Trigger manual backup
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const session = await verifySession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create manual backup
    const result = await createBackup('MANUAL')

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Backup created successfully',
        backupId: result.backupId,
        driveFileId: result.driveFileId,
        inventoryCount: result.inventoryCount,
        expenseCount: result.expenseCount,
        stockCount: result.stockCount,
        leadsCount: result.leadsCount,
        registryCount: result.registryCount,
        warehousesCount: result.warehousesCount,
        expenseAccountsCount: result.expenseAccountsCount,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.errorMessage || 'Backup failed',
          inventoryCount: result.inventoryCount,
          expenseCount: result.expenseCount,
          stockCount: result.stockCount,
          leadsCount: result.leadsCount,
          registryCount: result.registryCount,
          warehousesCount: result.warehousesCount,
          expenseAccountsCount: result.expenseAccountsCount,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create backup' },
      { status: 500 }
    )
  }
}
