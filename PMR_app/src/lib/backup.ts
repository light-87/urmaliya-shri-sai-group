import { supabase } from '@/lib/supabase'
import { uploadBackupToDrive } from '@/lib/google-drive'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { randomUUID } from 'crypto'

export type BackupType = 'MANUAL' | 'AUTOMATIC'

/**
 * Helper function to fetch ALL rows from a table using pagination
 * Supabase has a default limit of 1000 rows per query
 */
async function fetchAllRows<T>(
  tableName: string,
  orderColumn: string = 'createdAt',
  ascending: boolean = true
): Promise<T[]> {
  const PAGE_SIZE = 1000
  let allData: T[] = []
  let from = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(orderColumn, { ascending })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error

    if (data && data.length > 0) {
      allData = [...allData, ...(data as T[])]
      from += PAGE_SIZE
      // If we got less than PAGE_SIZE rows, we've reached the end
      hasMore = data.length === PAGE_SIZE
    } else {
      hasMore = false
    }
  }

  return allData
}

interface BackupResult {
  success: boolean
  backupId?: string
  driveFileId?: string
  inventoryCount: number
  expenseCount: number
  stockCount: number
  leadsCount: number
  registryCount: number
  warehousesCount: number
  expenseAccountsCount: number
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
  let registryCount = 0
  let warehousesCount = 0
  let expenseAccountsCount = 0

  try {
    // Fetch ALL inventory transactions (using pagination to bypass 1000 row limit)
    const inventoryTransactions = await fetchAllRows<{
      id: string
      date: string
      warehouse: string
      bucketType: string
      action: string
      quantity: number
      buyerSeller: string
      runningTotal: number
      createdAt: string
      updatedAt: string
    }>('InventoryTransaction', 'date', true)
    inventoryCount = inventoryTransactions.length

    // Fetch ALL expense transactions (using pagination to bypass 1000 row limit)
    const expenseTransactions = await fetchAllRows<{
      id: string
      date: string
      amount: number
      account: string
      type: string
      name: string
      description: string | null
      createdAt: string
      updatedAt: string
    }>('ExpenseTransaction', 'date', true)
    expenseCount = expenseTransactions.length

    // Fetch ALL stock transactions (using pagination)
    let stockTransactions: Array<{
      id: string
      date: string
      type: string
      category: string
      quantity: number
      unit: string
      description: string | null
      runningTotal: number
      createdAt: string
    }> = []
    try {
      stockTransactions = await fetchAllRows('StockTransaction', 'date', true)
      stockCount = stockTransactions.length
    } catch (stockError) {
      console.log('Stock tracking not available yet in backup')
    }

    // Fetch ALL leads (using pagination)
    let leads: Array<{
      id: string
      name: string
      phone: string
      company: string | null
      status: string
      priority: string
      lastCallDate: string | null
      nextFollowUpDate: string | null
      callOutcome: string | null
      quickNote: string | null
      additionalNotes: string | null
      createdAt: string
      updatedAt: string
    }> = []
    try {
      leads = await fetchAllRows('leads', 'createdAt', true)
      leadsCount = leads.length
    } catch (leadsError) {
      console.log('Leads not available yet in backup')
    }

    // Fetch PIN codes for backup (authentication) - small table, pagination not critical
    let pins: Array<{
      id: string
      pin: string
      role: string
      name: string | null
      is_active: boolean
      created_at: string
      updated_at: string
    }> = []
    try {
      pins = await fetchAllRows('pins', 'created_at', true)
    } catch (pinError) {
      console.log('Pins not available in backup')
    }

    // Fetch system settings for backup - small table, pagination not critical
    let systemSettings: Array<{
      id: string
      key: string
      value: string
      updated_at: string
    }> = []
    try {
      systemSettings = await fetchAllRows('system_settings', 'key', true)
    } catch (settingsError) {
      console.log('SystemSettings not available in backup')
    }

    // Fetch ALL registry transactions (using pagination)
    let registryTransactions: Array<{
      id: string
      transaction_id: string
      registration_number: string | null
      date: string
      property_location: string
      seller_name: string
      buyer_name: string
      transaction_type: string
      property_value: number
      stamp_duty: number
      registration_fees: number
      mutation_fees: number
      documentation_charge: number
      registrar_office_fees: number
      operator_cost: number
      broker_commission: number
      recommendation_fees: number
      credit_received: number
      payment_method: string | null
      stamp_commission: number
      total_expenses: number
      balance_due: number
      amount_profit: number
      payment_status: string
      notes: string | null
      created_at: string
      updated_at: string
    }> = []
    try {
      registryTransactions = await fetchAllRows('registry_transactions', 'date', true)
      registryCount = registryTransactions.length
    } catch (registryError) {
      console.log('Registry transactions not available in backup')
    }

    // Fetch warehouses for backup - small table, pagination not critical
    let warehouses: Array<{
      id: string
      code: string
      name: string
      display_name: string
      is_active: boolean
      location: string | null
      created_at: string
      updated_at: string
    }> = []
    try {
      warehouses = await fetchAllRows('warehouses', 'created_at', true)
      warehousesCount = warehouses.length
    } catch (warehousesError) {
      console.log('Warehouses not available in backup')
    }

    // Fetch expense accounts for backup - small table, pagination not critical
    let expenseAccounts: Array<{
      id: string
      code: string
      name: string
      display_name: string
      account_type: string
      is_active: boolean
      opening_balance: number
      current_balance: number
      created_at: string
      updated_at: string
    }> = []
    try {
      expenseAccounts = await fetchAllRows('expense_accounts', 'created_at', true)
      expenseAccountsCount = expenseAccounts.length
    } catch (expenseAccountsError) {
      console.log('Expense accounts not available in backup')
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new()

    // Create Inventory sheet
    const inventoryData = (inventoryTransactions || []).map((tx: any) => ({
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
    const expenseData = (expenseTransactions || []).map((tx: any) => ({
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
        'PIN Number': pin.pin,
        Role: pin.role,
        Name: pin.name || '',
        'Is Active': pin.is_active ? 'Yes' : 'No',
        'Created At': format(new Date(pin.created_at), 'yyyy-MM-dd HH:mm:ss'),
        'Updated At': format(new Date(pin.updated_at), 'yyyy-MM-dd HH:mm:ss'),
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
        'Updated At': format(new Date(setting.updated_at), 'yyyy-MM-dd HH:mm:ss'),
      }))
      const settingsSheet = XLSX.utils.json_to_sheet(settingsData)
      XLSX.utils.book_append_sheet(workbook, settingsSheet, 'SystemSettings')
    }

    // Create Registry Transactions sheet (if registry transactions exist)
    if (registryTransactions.length > 0) {
      const registryData = registryTransactions.map((txn) => ({
        ID: txn.id,
        'Transaction ID': txn.transaction_id,
        'Registration Number': txn.registration_number || '',
        Date: format(new Date(txn.date), 'yyyy-MM-dd'),
        'Property Location': txn.property_location,
        'Seller Name': txn.seller_name,
        'Buyer Name': txn.buyer_name,
        'Transaction Type': txn.transaction_type,
        'Property Value': txn.property_value,
        'Stamp Duty': txn.stamp_duty,
        'Registration Fees': txn.registration_fees,
        'Mutation Fees': txn.mutation_fees,
        'Documentation Charge': txn.documentation_charge,
        'Registrar Office Fees': txn.registrar_office_fees,
        'Operator Cost': txn.operator_cost,
        'Broker Commission': txn.broker_commission,
        'Recommendation Fees': txn.recommendation_fees,
        'Credit Received': txn.credit_received,
        'Payment Method': txn.payment_method || '',
        'Stamp Commission': txn.stamp_commission,
        'Total Expenses': txn.total_expenses,
        'Balance Due': txn.balance_due,
        'Amount Profit': txn.amount_profit,
        'Payment Status': txn.payment_status,
        Notes: txn.notes || '',
        'Created At': format(new Date(txn.created_at), 'yyyy-MM-dd HH:mm:ss'),
        'Updated At': format(new Date(txn.updated_at), 'yyyy-MM-dd HH:mm:ss'),
      }))
      const registrySheet = XLSX.utils.json_to_sheet(registryData)
      XLSX.utils.book_append_sheet(workbook, registrySheet, 'Registry')
    }

    // Create Warehouses sheet (if warehouses exist)
    if (warehouses.length > 0) {
      const warehousesData = warehouses.map((warehouse) => ({
        ID: warehouse.id,
        Code: warehouse.code,
        Name: warehouse.name,
        'Display Name': warehouse.display_name,
        'Is Active': warehouse.is_active ? 'Yes' : 'No',
        Location: warehouse.location || '',
        'Created At': format(new Date(warehouse.created_at), 'yyyy-MM-dd HH:mm:ss'),
        'Updated At': format(new Date(warehouse.updated_at), 'yyyy-MM-dd HH:mm:ss'),
      }))
      const warehousesSheet = XLSX.utils.json_to_sheet(warehousesData)
      XLSX.utils.book_append_sheet(workbook, warehousesSheet, 'Warehouses')
    }

    // Create Expense Accounts sheet (if expense accounts exist)
    if (expenseAccounts.length > 0) {
      const expenseAccountsData = expenseAccounts.map((account) => ({
        ID: account.id,
        Code: account.code,
        Name: account.name,
        'Display Name': account.display_name,
        'Account Type': account.account_type,
        'Is Active': account.is_active ? 'Yes' : 'No',
        'Opening Balance': account.opening_balance,
        'Current Balance': account.current_balance,
        'Created At': format(new Date(account.created_at), 'yyyy-MM-dd HH:mm:ss'),
        'Updated At': format(new Date(account.updated_at), 'yyyy-MM-dd HH:mm:ss'),
      }))
      const expenseAccountsSheet = XLSX.utils.json_to_sheet(expenseAccountsData)
      XLSX.utils.book_append_sheet(workbook, expenseAccountsSheet, 'ExpenseAccounts')
    }

    // Generate Excel buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Create filename with timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    const fileName = `USSG_Backup_${timestamp}.xlsx`

    // Upload to Google Drive
    const driveFileId = await uploadBackupToDrive(buffer, fileName)

    // Log successful backup
    const { data: backupLog, error: logError } = await supabase
      .from('backup_logs')
      .insert({
        id: randomUUID(),
        backupDate: new Date().toISOString(),
        backupType: type,
        driveFileId: driveFileId,
        inventoryCount: inventoryCount,
        expenseCount: expenseCount,
        stockCount: stockCount,
        leadsCount: leadsCount,
        registryCount: registryCount,
        warehousesCount: warehousesCount,
        expenseAccountsCount: expenseAccountsCount,
        status: 'SUCCESS',
      })
      .select()
      .single()

    if (logError) throw logError

    return {
      success: true,
      backupId: backupLog?.id,
      driveFileId,
      inventoryCount,
      expenseCount,
      stockCount,
      leadsCount,
      registryCount,
      warehousesCount,
      expenseAccountsCount,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log failed backup
    await supabase.from('backup_logs').insert({
      id: randomUUID(),
      backupDate: new Date().toISOString(),
      backupType: type,
      inventoryCount: inventoryCount,
      expenseCount: expenseCount,
      stockCount: stockCount,
      leadsCount: leadsCount,
      registryCount: registryCount,
      warehousesCount: warehousesCount,
      expenseAccountsCount: expenseAccountsCount,
      status: 'FAILED',
      errorMessage: errorMessage,
    })

    return {
      success: false,
      inventoryCount,
      expenseCount,
      stockCount,
      leadsCount,
      registryCount,
      warehousesCount,
      expenseAccountsCount,
      errorMessage,
    }
  }
}

/**
 * Get the last successful backup date
 */
export async function getLastBackupDate(): Promise<Date | null> {
  const { data: lastBackup, error } = await supabase
    .from('backup_logs')
    .select('backupDate')
    .eq('status', 'SUCCESS')
    .order('backupDate', { ascending: false })
    .limit(1)
    .single()

  if (error || !lastBackup) return null

  return lastBackup.backupDate ? new Date(lastBackup.backupDate) : null
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
  const { data, error } = await supabase
    .from('backup_logs')
    .select('*')
    .order('backupDate', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
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
