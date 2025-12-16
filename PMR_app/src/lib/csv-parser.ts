import { z } from 'zod'
import { Warehouse, BucketType, ActionType, ExpenseAccount, TransactionType } from '@/types'

// Helper function to parse dates in various formats
function parseDate(val: string): Date {
  if (!val || val.trim() === '') {
    throw new Error('Date is required')
  }

  // Try parsing as ISO date first
  const isoDate = new Date(val)
  if (!isNaN(isoDate.getTime())) {
    return isoDate
  }

  // Parse DD-MMM-YYYY format (e.g., "20-Nov-2025")
  const parts = val.split('-')
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const monthStr = parts[1]
    const year = parseInt(parts[2], 10)

    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    }

    const month = months[monthStr.toLowerCase()]
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day)
    }
  }

  throw new Error(`Unable to parse date: ${val}`)
}

// Helper function to normalize warehouse names
function normalizeWarehouse(val: string): Warehouse {
  const normalized = val.trim().toUpperCase()
  if (normalized === 'GURH') return Warehouse.GURH
  if (normalized === 'REWA') return Warehouse.REWA
  if (normalized === 'FACTORY') return Warehouse.FACTORY
  throw new Error(`Invalid warehouse: ${val}. Must be GURH, REWA, or FACTORY`)
}

// Helper function to normalize bucket types
function normalizeBucketType(val: string): BucketType {
  // Replace spaces with underscores and convert to uppercase
  const normalized = val.trim().toUpperCase().replace(/\s+/g, '_')

  // Map common variations
  const mapping: Record<string, BucketType> = {
    'TATA_G': BucketType.TATA_G,
    'TATA_W': BucketType.TATA_W,
    'AL_10_LTR': BucketType.AL_10_LTR,
    'AL': BucketType.AL,
    'BB': BucketType.BB,
    'ES': BucketType.ES,
    'MH': BucketType.MH,
    'MH_10_LTR': BucketType.MH_10_LTR,
    'TATA_10_LTR': BucketType.TATA_10_LTR,
    'IBC_TANK': BucketType.IBC_TANK,
    'INDIAN_OIL_20L': BucketType.INDIAN_OIL_20L,
  }

  if (mapping[normalized]) {
    return mapping[normalized]
  }

  throw new Error(`Invalid bucket type: ${val}`)
}

// Helper function to normalize action types
function normalizeAction(val: string): ActionType {
  const normalized = val.trim().toUpperCase()
  if (normalized === 'STOCK') return ActionType.STOCK
  if (normalized === 'SELL') return ActionType.SELL
  throw new Error(`Invalid action: ${val}. Must be STOCK or SELL`)
}

// Helper function to normalize and parse amounts
function parseAmount(val: string | number): number {
  if (typeof val === 'number') {
    return Math.abs(val)
  }

  // Remove currency symbols and commas
  const cleaned = val.replace(/[₹$,\s]/g, '').trim()
  const amount = parseFloat(cleaned)

  if (isNaN(amount)) {
    throw new Error(`Invalid amount: ${val}`)
  }

  return Math.abs(amount)
}

// Helper function to normalize account names
function normalizeAccount(val: string): ExpenseAccount {
  const normalized = val.trim().toUpperCase().replace(/\s+/g, '_')

  // Map common variations
  const mapping: Record<string, ExpenseAccount> = {
    'CASH': ExpenseAccount.CASH,
    'SHIWAM_TRIPATHI': ExpenseAccount.SHIWAM_TRIPATHI,
    'ICICI': ExpenseAccount.ICICI,
    'CC_CANARA': ExpenseAccount.CC_CANARA,
    'CANARA_CURRENT': ExpenseAccount.CANARA_CURRENT,
    'SAWALIYA_SETH_MOTORS': ExpenseAccount.SAWALIYA_SETH_MOTORS,
  }

  if (mapping[normalized]) {
    return mapping[normalized]
  }

  throw new Error(`Invalid account: ${val}. Must be one of: CASH, SHIWAM_TRIPATHI, ICICI, CC_CANARA, CANARA_CURRENT, SAWALIYA_SETH_MOTORS`)
}

// Helper function to normalize transaction types
function normalizeType(val: string): TransactionType {
  const normalized = val.trim().toUpperCase()
  if (normalized === 'INCOME') return TransactionType.INCOME
  if (normalized === 'EXPENSE') return TransactionType.EXPENSE
  throw new Error(`Invalid type: ${val}. Must be INCOME or EXPENSE`)
}

// Validation schemas for CSV rows (using column positions)
const inventoryRowSchema = z.tuple([
  z.string().transform(parseDate), // Column 0: Date
  z.string().transform(normalizeWarehouse), // Column 1: Warehouse
  z.string().transform(normalizeBucketType), // Column 2: BucketType
  z.string().transform(normalizeAction), // Column 3: Action
  z.string().or(z.number()).transform(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    return Math.abs(num) // Column 4: Quantity (absolute value)
  }),
  z.string().transform(val => val.trim() || 'N/A'), // Column 5: BuyerSeller (allow empty)
])

const expenseRowSchema = z.tuple([
  z.string().transform(parseDate), // Column 0: Date
  z.string().or(z.number()).transform(parseAmount), // Column 1: Amount
  z.string().transform(normalizeAccount), // Column 2: Account
  z.string().transform(normalizeType), // Column 3: Type
  z.string().transform(val => val.trim() || 'N/A'), // Column 4: Name (allow empty)
])

export type InventoryRow = {
  Date: Date
  Warehouse: Warehouse
  BucketType: BucketType
  Action: ActionType
  Quantity: number
  BuyerSeller: string
}

export type ExpenseRow = {
  Date: Date
  Amount: number
  Account: ExpenseAccount
  Type: TransactionType
  Name: string
}

export interface ParsedCSVData {
  inventory: InventoryRow[]
  expenses: ExpenseRow[]
}

export interface ParseError {
  file: 'Inventory' | 'Expenses'
  row: number
  field?: string
  message: string
}

export interface ParseResult {
  success: boolean
  data?: ParsedCSVData
  errors?: ParseError[]
}

/**
 * Parse CSV content string
 */
function parseCSV(content: string): string[][] {
  const rows: string[][] = []
  const lines = content.split(/\r?\n/)

  for (const line of lines) {
    if (!line.trim()) continue // Skip empty lines

    const columns: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        columns.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    columns.push(current.trim())

    // Only add rows that have at least one non-empty column
    if (columns.some(col => col !== '')) {
      rows.push(columns)
    }
  }

  return rows
}

/**
 * Check if a row is empty or just commas
 */
function isEmptyRow(row: string[]): boolean {
  return row.every(col => !col || col.trim() === '')
}

/**
 * Parse CSV files for inventory and expenses
 */
export function parseCSVFiles(
  inventoryContent: string,
  expensesContent: string
): ParseResult {
  const errors: ParseError[] = []
  const inventory: InventoryRow[] = []
  const expenses: ExpenseRow[] = []

  try {
    // Parse Inventory CSV
    const inventoryRows = parseCSV(inventoryContent)

    inventoryRows.forEach((row, index) => {
      // Skip empty rows
      if (isEmptyRow(row)) {
        return
      }

      // Skip if not enough columns
      if (row.length < 6) {
        errors.push({
          file: 'Inventory',
          row: index + 1,
          message: `Row has only ${row.length} columns, expected 6: Date, Warehouse, BucketType, Action, Quantity, BuyerSeller`,
        })
        return
      }

      try {
        const validatedRow = inventoryRowSchema.parse(row.slice(0, 6))
        inventory.push({
          Date: validatedRow[0],
          Warehouse: validatedRow[1],
          BucketType: validatedRow[2],
          Action: validatedRow[3],
          Quantity: validatedRow[4],
          BuyerSeller: validatedRow[5],
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            const fieldNames = ['Date', 'Warehouse', 'BucketType', 'Action', 'Quantity', 'BuyerSeller']
            const fieldIndex = err.path[0] as number
            errors.push({
              file: 'Inventory',
              row: index + 1,
              field: fieldNames[fieldIndex] || `Column ${fieldIndex}`,
              message: err.message,
            })
          })
        } else if (error instanceof Error) {
          errors.push({
            file: 'Inventory',
            row: index + 1,
            message: error.message,
          })
        }
      }
    })

    // Parse Expenses CSV
    const expensesRows = parseCSV(expensesContent)

    expensesRows.forEach((row, index) => {
      // Skip empty rows
      if (isEmptyRow(row)) {
        return
      }

      // Skip if not enough columns
      if (row.length < 5) {
        errors.push({
          file: 'Expenses',
          row: index + 1,
          message: `Row has only ${row.length} columns, expected 5: Date, Amount, Account, Type, Name`,
        })
        return
      }

      try {
        const validatedRow = expenseRowSchema.parse(row.slice(0, 5))
        expenses.push({
          Date: validatedRow[0],
          Amount: validatedRow[1],
          Account: validatedRow[2],
          Type: validatedRow[3],
          Name: validatedRow[4],
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            const fieldNames = ['Date', 'Amount', 'Account', 'Type', 'Name']
            const fieldIndex = err.path[0] as number
            errors.push({
              file: 'Expenses',
              row: index + 1,
              field: fieldNames[fieldIndex] || `Column ${fieldIndex}`,
              message: err.message,
            })
          })
        } else if (error instanceof Error) {
          errors.push({
            file: 'Expenses',
            row: index + 1,
            message: error.message,
          })
        }
      }
    })

    // Return errors if any validation failed
    if (errors.length > 0) {
      return { success: false, errors }
    }

    // Return successfully parsed data
    return {
      success: true,
      data: { inventory, expenses },
    }
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          file: 'Inventory',
          row: 0,
          message: error instanceof Error ? error.message : 'Failed to parse CSV files',
        },
      ],
    }
  }
}

/**
 * Format parse errors into a readable string
 */
export function formatParseErrors(errors: ParseError[]): string {
  return errors
    .map(err => {
      const location = err.row > 0 ? `Row ${err.row}` : 'File'
      const field = err.field ? ` (${err.field})` : ''
      return `${err.file} - ${location}${field}: ${err.message}`
    })
    .join('\n')
}
