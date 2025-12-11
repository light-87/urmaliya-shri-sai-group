import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { listBackupsFromDrive } from '@/lib/google-drive'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET: List all available backups from Google Drive with metadata
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
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get backups from Google Drive
    const driveFiles = await listBackupsFromDrive(limit)

    // Get backup logs from database to add metadata
    const backupLogs = await prisma.backupLog.findMany({
      where: {
        status: 'SUCCESS',
        driveFileId: { not: null },
      },
      orderBy: { backupDate: 'desc' },
      take: limit,
    })

    // Merge drive files with backup logs
    const backupsWithMetadata = driveFiles.map((file) => {
      const log = backupLogs.find((backupLog) => backupLog.driveFileId === file.id)

      return {
        id: file.id,
        name: file.name,
        createdTime: file.createdTime,
        size: file.size,
        webViewLink: file.webViewLink,
        // Additional metadata from backup log if available
        backupType: log?.backupType,
        inventoryCount: log?.inventoryCount,
        expenseCount: log?.expenseCount,
        backupDate: log?.backupDate,
      }
    })

    return NextResponse.json({
      success: true,
      backups: backupsWithMetadata,
      count: backupsWithMetadata.length,
    })
  } catch (error) {
    console.error('Error listing backups:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to list backups',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
