import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { downloadBackupFromDrive } from '@/lib/google-drive'
import { createBackup } from '@/lib/backup'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import {
  Warehouse,
  BucketType,
  ActionType,
  ExpenseAccount,
  TransactionType,
  StockTransactionType,
  StockCategory,
  StockUnit,
  LeadStatus,
  Priority,
  CallOutcome,
  PinRole,
} from '@prisma/client'

export const dynamic = 'force-dynamic'

// Helper to parse dates from Excel backup
function parseBackupDate(val: string | number): Date {
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    return new Date(date.y, date.m - 1, date.d)
  }
  return new Date(val)
}

// POST: Restore from a backup file
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

    const body = await request.json()
    const { driveFileId, fileName } = body

    if (!driveFileId) {
      return NextResponse.json(
        { success: false, message: 'Drive file ID is required' },
        { status: 400 }
      )
    }

    // Step 1: Create a backup of the current state
    console.log('Step 1: Creating backup of current state...')
    const currentBackup = await createBackup('MANUAL')

    if (!currentBackup.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to create backup of current state before restore',
          error: currentBackup.errorMessage,
        },
        { status: 500 }
      )
    }

    console.log('Current state backed up successfully:', currentBackup.driveFileId)

    // Step 2: Download the backup file from Google Drive
    console.log('Step 2: Downloading backup from Google Drive...')
    let backupBuffer: Buffer
    try {
      backupBuffer = await downloadBackupFromDrive(driveFileId)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to download backup file from Google Drive',
          error: error instanceof Error ? error.message : 'Unknown error',
          currentBackupId: currentBackup.driveFileId,
        },
        { status: 500 }
      )
    }

    // Step 3: Parse the Excel file to ensure it's valid before deleting data
    console.log('Step 3: Parsing backup file...')
    let inventoryData: any[] = []
    let expenseData: any[] = []
    let stockData: any[] = []
    let leadsData: any[] = []
    let pinsData: any[] = []
    let settingsData: any[] = []

    try {
      const workbook = XLSX.read(backupBuffer, { type: 'buffer' })

      // Check if required sheets exist
      if (!workbook.SheetNames.includes('Inventory')) {
        throw new Error('Backup file is missing "Inventory" sheet')
      }
      if (!workbook.SheetNames.includes('Expenses')) {
        throw new Error('Backup file is missing "Expenses" sheet')
      }

      // Read inventory data
      const inventorySheet = workbook.Sheets['Inventory']
      inventoryData = XLSX.utils.sheet_to_json(inventorySheet)

      // Read expense data
      const expensesSheet = workbook.Sheets['Expenses']
      expenseData = XLSX.utils.sheet_to_json(expensesSheet)

      // Read stock data (optional - may not exist in older backups)
      if (workbook.SheetNames.includes('Stock')) {
        const stockSheet = workbook.Sheets['Stock']
        stockData = XLSX.utils.sheet_to_json(stockSheet)
      }

      // Read leads data (optional - may not exist in older backups)
      if (workbook.SheetNames.includes('Leads')) {
        const leadsSheet = workbook.Sheets['Leads']
        leadsData = XLSX.utils.sheet_to_json(leadsSheet)
      }

      // Read pins data (optional - may not exist in older backups)
      if (workbook.SheetNames.includes('Pins')) {
        const pinsSheet = workbook.Sheets['Pins']
        pinsData = XLSX.utils.sheet_to_json(pinsSheet)
      }

      // Read system settings data (optional - may not exist in older backups)
      if (workbook.SheetNames.includes('SystemSettings')) {
        const settingsSheet = workbook.Sheets['SystemSettings']
        settingsData = XLSX.utils.sheet_to_json(settingsSheet)
      }

      console.log(`Found ${inventoryData.length} inventory, ${expenseData.length} expense, ${stockData.length} stock, ${leadsData.length} leads, ${pinsData.length} pins, ${settingsData.length} settings records`)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to parse backup file',
          error: error instanceof Error ? error.message : 'Unknown error',
          currentBackupId: currentBackup.driveFileId,
        },
        { status: 500 }
      )
    }

    // Step 4: Delete all current data
    console.log('Step 4: Deleting all current data...')
    try {
      const deletedInventory = await prisma.inventoryTransaction.deleteMany({})
      const deletedExpenses = await prisma.expenseTransaction.deleteMany({})
      const deletedStock = await prisma.stockTransaction.deleteMany({})
      const deletedLeads = await prisma.lead.deleteMany({})

      // Only delete pins and settings if backup contains them (to preserve auth on older backups)
      let deletedPins = { count: 0 }
      let deletedSettings = { count: 0 }
      if (pinsData.length > 0) {
        deletedPins = await prisma.pin.deleteMany({})
      }
      if (settingsData.length > 0) {
        deletedSettings = await prisma.systemSettings.deleteMany({})
      }

      console.log(`Deleted ${deletedInventory.count} inventory, ${deletedExpenses.count} expense, ${deletedStock.count} stock, ${deletedLeads.count} leads, ${deletedPins.count} pins, ${deletedSettings.count} settings records`)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to delete current data',
          error: error instanceof Error ? error.message : 'Unknown error',
          currentBackupId: currentBackup.driveFileId,
        },
        { status: 500 }
      )
    }

    // Step 5: Restore data from backup
    console.log('Step 5: Restoring data from backup...')
    let inventoryRestored = 0
    let expensesRestored = 0
    let stockRestored = 0
    let leadsRestored = 0
    let pinsRestored = 0
    let settingsRestored = 0
    const errors: string[] = []

    try {
      // Restore inventory transactions (sorted by date)
      const sortedInventory = inventoryData.sort((a, b) => {
        const dateA = parseBackupDate(a.Date)
        const dateB = parseBackupDate(b.Date)
        return dateA.getTime() - dateB.getTime()
      })

      for (const row of sortedInventory) {
        try {
          // Use the running total from the backup directly
          await prisma.inventoryTransaction.create({
            data: {
              date: parseBackupDate(row.Date),
              warehouse: row.Warehouse as Warehouse,
              bucketType: row['Bucket Type'] as BucketType,
              action: row.Action as ActionType,
              quantity: Number(row.Quantity),
              buyerSeller: row['Buyer/Seller'] || 'N/A',
              runningTotal: Number(row['Running Total']),
            },
          })
          inventoryRestored++
        } catch (error) {
          errors.push(`Inventory row failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Restore expense transactions (sorted by date)
      const sortedExpenses = expenseData.sort((a, b) => {
        const dateA = parseBackupDate(a.Date)
        const dateB = parseBackupDate(b.Date)
        return dateA.getTime() - dateB.getTime()
      })

      for (const row of sortedExpenses) {
        try {
          await prisma.expenseTransaction.create({
            data: {
              date: parseBackupDate(row.Date),
              amount: Number(row.Amount),
              account: row.Account as ExpenseAccount,
              type: row.Type as TransactionType,
              name: row.Name || 'N/A',
            },
          })
          expensesRestored++
        } catch (error) {
          errors.push(`Expense row failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Restore stock transactions (if present in backup)
      if (stockData.length > 0) {
        const sortedStock = stockData.sort((a, b) => {
          const dateA = parseBackupDate(a.Date)
          const dateB = parseBackupDate(b.Date)
          return dateA.getTime() - dateB.getTime()
        })

        for (const row of sortedStock) {
          try {
            await prisma.stockTransaction.create({
              data: {
                date: parseBackupDate(row.Date),
                type: row.Type as StockTransactionType,
                category: row.Category as StockCategory,
                quantity: Number(row.Quantity),
                unit: row.Unit as StockUnit,
                description: row.Description || null,
                runningTotal: Number(row['Running Total']),
              },
            })
            stockRestored++
          } catch (error) {
            errors.push(`Stock row failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      // Restore leads (if present in backup)
      if (leadsData.length > 0) {
        for (const row of leadsData) {
          try {
            await prisma.lead.create({
              data: {
                name: row.Name || 'Unknown',
                phone: row.Phone || '',
                company: row.Company || null,
                status: (row.Status as LeadStatus) || 'NEW',
                priority: (row.Priority as Priority) || 'MEDIUM',
                lastCallDate: row['Last Call Date'] ? parseBackupDate(row['Last Call Date']) : null,
                nextFollowUpDate: row['Next Follow-Up'] ? parseBackupDate(row['Next Follow-Up']) : null,
                callOutcome: row['Call Outcome'] ? (row['Call Outcome'] as CallOutcome) : null,
                quickNote: row['Quick Note'] || null,
                additionalNotes: row['Additional Notes'] || null,
              },
            })
            leadsRestored++
          } catch (error) {
            errors.push(`Lead row failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      // Restore pins (if present in backup)
      if (pinsData.length > 0) {
        for (const row of pinsData) {
          try {
            await prisma.pin.create({
              data: {
                pinNumber: row['PIN Number'] || '',
                role: (row.Role as PinRole) || 'INVENTORY_ONLY',
              },
            })
            pinsRestored++
          } catch (error) {
            errors.push(`Pin row failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      // Restore system settings (if present in backup)
      if (settingsData.length > 0) {
        for (const row of settingsData) {
          try {
            await prisma.systemSettings.create({
              data: {
                key: row.Key || '',
                value: row.Value || '',
              },
            })
            settingsRestored++
          } catch (error) {
            errors.push(`Settings row failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      console.log(`Restored ${inventoryRestored} inventory, ${expensesRestored} expense, ${stockRestored} stock, ${leadsRestored} leads, ${pinsRestored} pins, ${settingsRestored} settings records`)

      // Create a log entry for the restore operation
      await prisma.backupLog.create({
        data: {
          backupType: 'MANUAL',
          driveFileId: driveFileId,
          inventoryCount: inventoryRestored,
          expenseCount: expensesRestored,
          stockCount: stockRestored,
          leadsCount: leadsRestored,
          status: 'SUCCESS',
          errorMessage: errors.length > 0 ? `Restore completed with ${errors.length} errors` : null,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Backup restored successfully',
        inventoryRestored,
        expensesRestored,
        stockRestored,
        leadsRestored,
        pinsRestored,
        settingsRestored,
        currentBackupId: currentBackup.driveFileId,
        errors: errors.length > 0 ? errors : undefined,
      })
    } catch (error) {
      // If restore fails, log the failure
      await prisma.backupLog.create({
        data: {
          backupType: 'MANUAL',
          driveFileId: driveFileId,
          inventoryCount: inventoryRestored,
          expenseCount: expensesRestored,
          stockCount: stockRestored,
          leadsCount: leadsRestored,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error during restore',
        },
      })

      return NextResponse.json(
        {
          success: false,
          message: 'Failed to restore data from backup',
          error: error instanceof Error ? error.message : 'Unknown error',
          inventoryRestored,
          expensesRestored,
          stockRestored,
          leadsRestored,
          pinsRestored,
          settingsRestored,
          currentBackupId: currentBackup.driveFileId,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error restoring backup:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to restore backup',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
