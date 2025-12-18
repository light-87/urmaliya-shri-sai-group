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
    let registryData: any[] = []
    let warehousesData: any[] = []
    let expenseAccountsData: any[] = []

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

      // Read registry transactions data (optional - may not exist in older backups)
      if (workbook.SheetNames.includes('Registry')) {
        const registrySheet = workbook.Sheets['Registry']
        registryData = XLSX.utils.sheet_to_json(registrySheet)
      }

      // Read warehouses data (optional - may not exist in older backups)
      if (workbook.SheetNames.includes('Warehouses')) {
        const warehousesSheet = workbook.Sheets['Warehouses']
        warehousesData = XLSX.utils.sheet_to_json(warehousesSheet)
      }

      // Read expense accounts data (optional - may not exist in older backups)
      if (workbook.SheetNames.includes('ExpenseAccounts')) {
        const expenseAccountsSheet = workbook.Sheets['ExpenseAccounts']
        expenseAccountsData = XLSX.utils.sheet_to_json(expenseAccountsSheet)
      }

      console.log(`Found ${inventoryData.length} inventory, ${expenseData.length} expense, ${stockData.length} stock, ${leadsData.length} leads, ${pinsData.length} pins, ${settingsData.length} settings, ${registryData.length} registry, ${warehousesData.length} warehouses, ${expenseAccountsData.length} expense accounts records`)
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
        .from('leads')
        .select('*', { count: 'exact', head: true })

      // Delete all data
      await supabase.from('InventoryTransaction').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('ExpenseTransaction').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('StockTransaction').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // Only delete pins and settings if backup contains them (to preserve auth on older backups)
      let pinsCount = 0
      let settingsCount = 0
      if (pinsData.length > 0) {
        const { count } = await supabase
          .from('pins')
          .select('*', { count: 'exact', head: true })
        pinsCount = count || 0
        await supabase.from('pins').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }
      if (settingsData.length > 0) {
        const { count } = await supabase
          .from('system_settings')
          .select('*', { count: 'exact', head: true })
        settingsCount = count || 0
        await supabase.from('system_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }

      // Delete registry, warehouses, and expense accounts if backup contains them
      let registryCount = 0
      let warehousesCount = 0
      let expenseAccountsCount = 0
      if (registryData.length > 0) {
        const { count } = await supabase
          .from('registry_transactions')
          .select('*', { count: 'exact', head: true })
        registryCount = count || 0
        await supabase.from('registry_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }
      if (warehousesData.length > 0) {
        const { count } = await supabase
          .from('warehouses')
          .select('*', { count: 'exact', head: true })
        warehousesCount = count || 0
        await supabase.from('warehouses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }
      if (expenseAccountsData.length > 0) {
        const { count } = await supabase
          .from('expense_accounts')
          .select('*', { count: 'exact', head: true })
        expenseAccountsCount = count || 0
        await supabase.from('expense_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }

      console.log(`Deleted ${inventoryCount || 0} inventory, ${expenseCount || 0} expense, ${stockCount || 0} stock, ${leadsCount || 0} leads, ${pinsCount} pins, ${settingsCount} settings, ${registryCount} registry, ${warehousesCount} warehouses, ${expenseAccountsCount} expense accounts records`)
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
    let registryRestored = 0
    let warehousesRestored = 0
    let expenseAccountsRestored = 0
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
              description: row.Description || null,
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
              .from('leads')
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
              .from('pins')
              .insert({
          id: randomUUID(),
                pin: row['PIN Number'] || '',
                role: row.Role || 'INVENTORY_ONLY',
                name: row.Name || null,
                is_active: row['Is Active'] === 'Yes',
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
              .from('system_settings')
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

      // Restore registry transactions (if present in backup)
      if (registryData.length > 0) {
        const sortedRegistry = registryData.sort((a, b) => {
          const dateA = parseBackupDate(a.Date)
          const dateB = parseBackupDate(b.Date)
          return dateA.getTime() - dateB.getTime()
        })

        for (const row of sortedRegistry) {
          try {
            const { error } = await supabase
              .from('registry_transactions')
              .insert({
                id: randomUUID(),
                transaction_id: row['Transaction ID'] || '',
                registration_number: row['Registration Number'] || null,
                date: parseBackupDate(row.Date).toISOString().split('T')[0],
                property_location: row['Property Location'] || '',
                seller_name: row['Seller Name'] || '',
                buyer_name: row['Buyer Name'] || '',
                transaction_type: row['Transaction Type'] || 'Sale Deed',
                property_value: Number(row['Property Value']) || 0,
                stamp_duty: Number(row['Stamp Duty']) || 0,
                registration_fees: Number(row['Registration Fees']) || 0,
                mutation_fees: Number(row['Mutation Fees']) || 0,
                documentation_charge: Number(row['Documentation Charge']) || 0,
                registrar_office_fees: Number(row['Registrar Office Fees']) || 0,
                operator_cost: Number(row['Operator Cost']) || 0,
                broker_commission: Number(row['Broker Commission']) || 0,
                recommendation_fees: Number(row['Recommendation Fees']) || 0,
                credit_received: Number(row['Credit Received']) || 0,
                payment_method: row['Payment Method'] || null,
                stamp_commission: Number(row['Stamp Commission']) || 0,
                total_expenses: Number(row['Total Expenses']) || 0,
                balance_due: Number(row['Balance Due']) || 0,
                amount_profit: Number(row['Amount Profit']) || 0,
                payment_status: row['Payment Status'] || 'Pending',
                notes: row.Notes || null,
              })

            if (error) throw error
            registryRestored++
          } catch (error) {
            errors.push(`Registry row failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      // Restore warehouses (if present in backup)
      if (warehousesData.length > 0) {
        for (const row of warehousesData) {
          try {
            const { error } = await supabase
              .from('warehouses')
              .insert({
                id: randomUUID(),
                code: row.Code || '',
                name: row.Name || '',
                display_name: row['Display Name'] || '',
                is_active: row['Is Active'] === 'Yes',
                location: row.Location || null,
              })

            if (error) throw error
            warehousesRestored++
          } catch (error) {
            errors.push(`Warehouse row failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      // Restore expense accounts (if present in backup)
      if (expenseAccountsData.length > 0) {
        for (const row of expenseAccountsData) {
          try {
            const { error } = await supabase
              .from('expense_accounts')
              .insert({
                id: randomUUID(),
                code: row.Code || '',
                name: row.Name || '',
                display_name: row['Display Name'] || '',
                account_type: row['Account Type'] || 'GENERAL',
                is_active: row['Is Active'] === 'Yes',
                opening_balance: Number(row['Opening Balance']) || 0,
                current_balance: Number(row['Current Balance']) || 0,
              })

            if (error) throw error
            expenseAccountsRestored++
          } catch (error) {
            errors.push(`Expense account row failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      console.log(`Restored ${inventoryRestored} inventory, ${expensesRestored} expense, ${stockRestored} stock, ${leadsRestored} leads, ${pinsRestored} pins, ${settingsRestored} settings, ${registryRestored} registry, ${warehousesRestored} warehouses, ${expenseAccountsRestored} expense accounts records`)

      // Create a log entry for the restore operation
      await supabase.from('backup_logs').insert({
        id: randomUUID(),
        backupDate: new Date().toISOString(),
        backupType: 'MANUAL',
        driveFileId: driveFileId,
        inventoryCount: inventoryRestored,
        expenseCount: expensesRestored,
        stockCount: stockRestored,
        leadsCount: leadsRestored,
        registryCount: registryRestored,
        warehousesCount: warehousesRestored,
        expenseAccountsCount: expenseAccountsRestored,
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
        registryRestored,
        warehousesRestored,
        expenseAccountsRestored,
        currentBackupId: currentBackup.driveFileId,
        errors: errors.length > 0 ? errors : undefined,
      })
    } catch (error) {
      // If restore fails, log the failure
      await supabase.from('backup_logs').insert({
        id: randomUUID(),
        backupDate: new Date().toISOString(),
        backupType: 'MANUAL',
        driveFileId: driveFileId,
        inventoryCount: inventoryRestored,
        expenseCount: expensesRestored,
        stockCount: stockRestored,
        leadsCount: leadsRestored,
        registryCount: registryRestored,
        warehousesCount: warehousesRestored,
        expenseAccountsCount: expenseAccountsRestored,
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
          registryRestored,
          warehousesRestored,
          expenseAccountsRestored,
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
