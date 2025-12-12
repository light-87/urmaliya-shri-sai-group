import { prisma } from '@/lib/prisma'
import { uploadBackupToDrive } from '@/lib/google-drive'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

export type BackupType = 'MANUAL' | 'AUTOMATIC'

interface BackupResult {
  success: boolean
  backupId?: string
  driveFileId?: string
  inventoryCount: number
  expenseCount: number
  stockCount: number
  leadsCount: number
  errorMessage?: string
}

/**
 * Create a full database backup and upload to Google Drive
 */
export async function createBackup(type: BackupType): Promise<BackupResult> {
  let inventoryCount = 0
  let expenseCount = 0
  let stockCount = 0
  let leadsCount = 0

  try {
    // Fetch all inventory transactions
    const inventoryTransactions = await prisma.inventoryTransaction.findMany({
      orderBy: { date: 'asc' },
    })
    inventoryCount = inventoryTransactions.length

    // Fetch all expense transactions
    const expenseTransactions = await prisma.expenseTransaction.findMany({
      orderBy: { date: 'asc' },
    })
    expenseCount = expenseTransactions.length

    // Fetch all stock transactions (if table exists)
    let stockTransactions: Array<{
      id: string
      date: Date
      type: string
      category: string
      quantity: number
      unit: string
      description: string | null
      runningTotal: number
      createdAt: Date
    }> = []
    try {
      stockTransactions = await prisma.stockTransaction.findMany({
        orderBy: { date: 'asc' },
      })
      stockCount = stockTransactions.length
    } catch (stockError) {
      console.log('Stock tracking not available yet in backup')
    }

    // Fetch all leads (if table exists)
    let leads: Array<{
      id: string
      name: string
      phone: string
      company: string | null
      status: string
      priority: string
      lastCallDate: Date | null
      nextFollowUpDate: Date | null
      callOutcome: string | null
      quickNote: string | null
      additionalNotes: string | null
      createdAt: Date
      updatedAt: Date
    }> = []
    try {
      leads = await prisma.lead.findMany({
        orderBy: { createdAt: 'asc' },
      })
      leadsCount = leads.length
    } catch (leadsError) {
      console.log('Leads not available yet in backup')
    }

    // Fetch PIN codes for backup (authentication)
    let pins: Array<{
      id: string
      pinNumber: string
      role: string
      createdAt: Date
      updatedAt: Date
    }> = []
    try {
      pins = await prisma.pin.findMany({
        orderBy: { createdAt: 'asc' },
      })
    } catch (pinError) {
      console.log('Pins not available in backup')
    }

    // Fetch system settings for backup
    let systemSettings: Array<{
      id: string
      key: string
      value: string
      updatedAt: Date
    }> = []
    try {
      systemSettings = await prisma.systemSettings.findMany({
        orderBy: { key: 'asc' },
      })
    } catch (settingsError) {
      console.log('SystemSettings not available in backup')
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new()

    // Create Inventory sheet
    const inventoryData = inventoryTransactions.map((tx: any) => ({
      ID: tx.id,
      Date: format(new Date(tx.date), 'yyyy-MM-dd'),
      Warehouse: tx.warehouse,
      'Bucket Type': tx.bucketType,
      Action: tx.action,
      Quantity: tx.quantity,
      'Buyer/Seller': tx.buyerSeller,
      'Running Total': tx.runningTotal,
      'Created At': format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    }))
    const inventorySheet = XLSX.utils.json_to_sheet(inventoryData)
    XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory')

    // Create Expenses sheet
    const expenseData = expenseTransactions.map((tx: any) => ({
      ID: tx.id,
      Date: format(new Date(tx.date), 'yyyy-MM-dd'),
      Amount: Number(tx.amount),
      Account: tx.account,
      Type: tx.type,
      Name: tx.name,
      'Created At': format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    }))
    const expenseSheet = XLSX.utils.json_to_sheet(expenseData)
    XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expenses')

    // Create Stock sheet (if stock transactions exist)
    if (stockTransactions.length > 0) {
      const stockData = stockTransactions.map((tx) => ({
        ID: tx.id,
        Date: format(new Date(tx.date), 'yyyy-MM-dd'),
        Type: tx.type,
        Category: tx.category,
        Quantity: tx.quantity,
        Unit: tx.unit,
        Description: tx.description || '',
        'Running Total': tx.runningTotal,
        'Created At': format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      }))
      const stockSheet = XLSX.utils.json_to_sheet(stockData)
      XLSX.utils.book_append_sheet(workbook, stockSheet, 'Stock')
    }

    // Create Leads sheet (if leads exist)
    if (leads.length > 0) {
      const leadsData = leads.map((lead) => ({
        ID: lead.id,
        Name: lead.name,
        Phone: lead.phone,
        Company: lead.company || '',
        Status: lead.status,
        Priority: lead.priority,
        'Last Call Date': lead.lastCallDate
          ? format(new Date(lead.lastCallDate), 'yyyy-MM-dd')
          : '',
        'Next Follow-Up': lead.nextFollowUpDate
          ? format(new Date(lead.nextFollowUpDate), 'yyyy-MM-dd')
          : '',
        'Call Outcome': lead.callOutcome || '',
        'Quick Note': lead.quickNote || '',
        'Additional Notes': lead.additionalNotes || '',
        'Created At': format(new Date(lead.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        'Updated At': format(new Date(lead.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
      }))
      const leadsSheet = XLSX.utils.json_to_sheet(leadsData)
      XLSX.utils.book_append_sheet(workbook, leadsSheet, 'Leads')
    }

    // Create Pins sheet (if pins exist)
    if (pins.length > 0) {
      const pinsData = pins.map((pin) => ({
        ID: pin.id,
        'PIN Number': pin.pinNumber,
        Role: pin.role,
        'Created At': format(new Date(pin.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        'Updated At': format(new Date(pin.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
      }))
      const pinsSheet = XLSX.utils.json_to_sheet(pinsData)
      XLSX.utils.book_append_sheet(workbook, pinsSheet, 'Pins')
    }

    // Create SystemSettings sheet (if settings exist)
    if (systemSettings.length > 0) {
      const settingsData = systemSettings.map((setting) => ({
        ID: setting.id,
        Key: setting.key,
        Value: setting.value,
        'Updated At': format(new Date(setting.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
      }))
      const settingsSheet = XLSX.utils.json_to_sheet(settingsData)
      XLSX.utils.book_append_sheet(workbook, settingsSheet, 'SystemSettings')
    }

    // Generate Excel buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Create filename with timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    const fileName = `USSG_Backup_${timestamp}.xlsx`

    // Upload to Google Drive
    const driveFileId = await uploadBackupToDrive(buffer, fileName)

    // Log successful backup
    const backupLog = await prisma.backupLog.create({
      data: {
        backupType: type,
        driveFileId,
        inventoryCount,
        expenseCount,
        stockCount,
        leadsCount,
        status: 'SUCCESS',
      },
    })

    return {
      success: true,
      backupId: backupLog.id,
      driveFileId,
      inventoryCount,
      expenseCount,
      stockCount,
      leadsCount,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log failed backup
    await prisma.backupLog.create({
      data: {
        backupType: type,
        inventoryCount,
        expenseCount,
        stockCount,
        leadsCount,
        status: 'FAILED',
        errorMessage,
      },
    })

    return {
      success: false,
      inventoryCount,
      expenseCount,
      stockCount,
      leadsCount,
      errorMessage,
    }
  }
}

/**
 * Get the last successful backup date
 */
export async function getLastBackupDate(): Promise<Date | null> {
  const lastBackup = await prisma.backupLog.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { backupDate: 'desc' },
    select: { backupDate: true },
  })

  return lastBackup?.backupDate || null
}

/**
 * Check if a backup is needed (last backup was more than 24 hours ago)
 */
export async function isBackupNeeded(): Promise<boolean> {
  const lastBackupDate = await getLastBackupDate()

  if (!lastBackupDate) {
    // No backup ever made, backup is needed
    return true
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return lastBackupDate < twentyFourHoursAgo
}

/**
 * Get recent backup logs
 */
export async function getBackupLogs(limit: number = 20) {
  return prisma.backupLog.findMany({
    orderBy: { backupDate: 'desc' },
    take: limit,
  })
}

/**
 * Trigger backup if needed (called on sign-in)
 * This function is non-blocking - it won't make the user wait for backup
 */
export async function triggerBackupIfNeeded(): Promise<void> {
  try {
    const needed = await isBackupNeeded()

    if (needed) {
      // Run backup in background without waiting
      createBackup('AUTOMATIC').catch((error) => {
        console.error('Automatic backup failed:', error)
      })
    }
  } catch (error) {
    console.error('Error checking backup status:', error)
  }
}
