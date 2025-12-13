import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { downloadBackupFromDrive } from '@/lib/google-drive'
import { createBackup } from '@/lib/backup'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
import { randomUUID } from 'crypto'
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
} from '@/types'

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
      // Get counts before deletion
      const { count: inventoryCount } = await supabase
        .from('InventoryTransaction')
        .select('*', { count: 'exact', head: true })

      const { count: expenseCount } = await supabase
        .from('ExpenseTransaction')
        .select('*', { count: 'exact', head: true })

      const { count: stockCount } = await supabase
        .from('StockTransaction')
        .select('*', { count: 'exact', head: true })

      const { count: leadsCount } = await supabase
        .from('Lead')
        .select('*', { count: 'exact', head: true })

      // Delete all data
      await supabase.from('InventoryTransaction').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('ExpenseTransaction').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('StockTransaction').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('Lead').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // Only delete pins and settings if backup contains them (to preserve auth on older backups)
      let pinsCount = 0
      let settingsCount = 0
      if (pinsData.length > 0) {
        const { count } = await supabase
          .from('Pin')
          .select('*', { count: 'exact', head: true })
        pinsCount = count || 0
        await supabase.from('Pin').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }
      if (settingsData.length > 0) {
        const { count } = await supabase
          .from('SystemSettings')
          .select('*', { count: 'exact', head: true })
        settingsCount = count || 0
        await supabase.from('SystemSettings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }

      console.log(`Deleted ${inventoryCount || 0} inventory, ${expenseCount || 0} expense, ${stockCount || 0} stock, ${leadsCount || 0} leads, ${pinsCount} pins, ${settingsCount} settings records`)
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
          const { error } = await supabase
            .from('InventoryTransaction')
            .insert({
          id: randomUUID(),
              date: parseBackupDate(row.Date).toISOString(),
              warehouse: row.Warehouse,
              bucketType: row['Bucket Type'],
              action: row.Action,
              quantity: Number(row.Quantity),
              buyerSeller: row['Buyer/Seller'] || 'N/A',
              runningTotal: Number(row['Running Total']),
            })

          if (error) throw error
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
          const { error } = await supabase
            .from('ExpenseTransaction')
            .insert({
          id: randomUUID(),
              date: parseBackupDate(row.Date).toISOString(),
              amount: Number(row.Amount),
              account: row.Account,
              type: row.Type,
              name: row.Name || 'N/A',
            })

          if (error) throw error
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
            const { error } = await supabase
              .from('StockTransaction')
              .insert({
          id: randomUUID(),
                date: parseBackupDate(row.Date).toISOString(),
                type: row.Type,
                category: row.Category,
                quantity: Number(row.Quantity),
                unit: row.Unit,
                description: row.Description || null,
                runningTotal: Number(row['Running Total']),
              })

            if (error) throw error
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
            const { error } = await supabase
              .from('Lead')
              .insert({
          id: randomUUID(),
                name: row.Name || 'Unknown',
                phone: row.Phone || '',
                company: row.Company || null,
                status: row.Status || 'NEW',
                priority: row.Priority || 'MEDIUM',
                lastCallDate: row['Last Call Date'] ? parseBackupDate(row['Last Call Date']).toISOString() : null,
                nextFollowUpDate: row['Next Follow-Up'] ? parseBackupDate(row['Next Follow-Up']).toISOString() : null,
                callOutcome: row['Call Outcome'] || null,
                quickNote: row['Quick Note'] || null,
                additionalNotes: row['Additional Notes'] || null,
              })

            if (error) throw error
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
            const { error } = await supabase
              .from('Pin')
              .insert({
          id: randomUUID(),
                pinNumber: row['PIN Number'] || '',
                role: row.Role || 'INVENTORY_ONLY',
              })

            if (error) throw error
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
            const { error } = await supabase
              .from('SystemSettings')
              .insert({
          id: randomUUID(),
                key: row.Key || '',
                value: row.Value || '',
              })

            if (error) throw error
            settingsRestored++
          } catch (error) {
            errors.push(`Settings row failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      console.log(`Restored ${inventoryRestored} inventory, ${expensesRestored} expense, ${stockRestored} stock, ${leadsRestored} leads, ${pinsRestored} pins, ${settingsRestored} settings records`)

      // Create a log entry for the restore operation
      await supabase.from('BackupLog').insert({
          id: randomUUID(),
        backupType: 'MANUAL',
        driveFileId: driveFileId,
        inventoryCount: inventoryRestored,
        expenseCount: expensesRestored,
        stockCount: stockRestored,
        leadsCount: leadsRestored,
        status: 'SUCCESS',
        errorMessage: errors.length > 0 ? `Restore completed with ${errors.length} errors` : null,
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
      await supabase.from('BackupLog').insert({
          id: randomUUID(),
        backupType: 'MANUAL',
        driveFileId: driveFileId,
        inventoryCount: inventoryRestored,
        expenseCount: expensesRestored,
        stockCount: stockRestored,
        leadsCount: leadsRestored,
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error during restore',
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
