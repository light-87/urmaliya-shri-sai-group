import * as XLSX from 'xlsx'
import { z } from 'zod'
import { Warehouse, BucketType, ActionType, ExpenseAccount, TransactionType } from '@/types'

// Helper function to parse dates in various formats
function parseDate(val: string | number): Date {
  if (typeof val === 'number') {
    // Excel serial date number to Date
    const date = XLSX.SSF.parse_date_code(val)
    return new Date(date.y, date.m - 1, date.d)
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

// Validation schemas for Excel rows
const inventoryRowSchema = z.object({
  Date: z.string().or(z.number()).transform(parseDate),
  Warehouse: z.string().transform(normalizeWarehouse),
  BucketType: z.string().transform(normalizeBucketType),
  Action: z.string().transform(normalizeAction),
  Quantity: z.number().or(z.string()).transform(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    return Math.abs(num) // Always use absolute value
  }),
  BuyerSeller: z.string().transform(val => val.trim() || 'N/A'), // Allow empty
})

const expenseRowSchema = z.object({
  Date: z.string().or(z.number()).transform(parseDate),
  Amount: z.number().or(z.string()).transform(parseAmount),
  Account: z.string().transform(normalizeAccount),
  Type: z.string().transform(normalizeType),
  Name: z.string().transform(val => val.trim() || 'N/A'), // Allow empty
})

export type InventoryRow = z.infer<typeof inventoryRowSchema>
export type ExpenseRow = z.infer<typeof expenseRowSchema>

export interface ParsedExcelData {
  inventory: InventoryRow[]
  expenses: ExpenseRow[]
}

export interface ParseError {
  sheet: 'Inventory' | 'Expenses'
  row: number
  field?: string
  message: string
}

export interface ParseResult {
  success: boolean
  data?: ParsedExcelData
  errors?: ParseError[]
}

/**
 * Parse an Excel file buffer and extract Inventory and Expenses data
 */
export function parseExcelFile(buffer: Buffer): ParseResult {
  const errors: ParseError[] = []
  const inventory: InventoryRow[] = []
  const expenses: ExpenseRow[] = []

  try {
    // Read the workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // Check if required sheets exist
    if (!workbook.SheetNames.includes('Inventory')) {
      errors.push({
        sheet: 'Inventory',
        row: 0,
        message: 'Missing required sheet "Inventory"',
      })
    }

    if (!workbook.SheetNames.includes('Expenses')) {
      errors.push({
        sheet: 'Expenses',
        row: 0,
        message: 'Missing required sheet "Expenses"',
      })
    }

    // Return early if sheets are missing
    if (errors.length > 0) {
      return { success: false, errors }
    }

    // Parse Inventory sheet
    const inventorySheet = workbook.Sheets['Inventory']
    const inventoryRawData = XLSX.utils.sheet_to_json(inventorySheet, { raw: false })

    inventoryRawData.forEach((row: unknown, index: number) => {
      try {
        const validatedRow = inventoryRowSchema.parse(row)
        inventory.push(validatedRow)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push({
              sheet: 'Inventory',
              row: index + 2, // +2 because Excel is 1-indexed and has a header row
              field: err.path.join('.'),
              message: err.message,
            })
          })
        }
      }
    })

    // Parse Expenses sheet
    const expensesSheet = workbook.Sheets['Expenses']
    const expensesRawData = XLSX.utils.sheet_to_json(expensesSheet, { raw: false })

    expensesRawData.forEach((row: unknown, index: number) => {
      try {
        const validatedRow = expenseRowSchema.parse(row)
        expenses.push(validatedRow)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push({
              sheet: 'Expenses',
              row: index + 2, // +2 because Excel is 1-indexed and has a header row
              field: err.path.join('.'),
              message: err.message,
            })
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
          sheet: 'Inventory',
          row: 0,
          message: error instanceof Error ? error.message : 'Failed to parse Excel file',
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
      const location = err.row > 0 ? `Row ${err.row}` : 'Sheet'
      const field = err.field ? ` (${err.field})` : ''
      return `${err.sheet} - ${location}${field}: ${err.message}`
    })
    .join('\n')
}
