import { prisma } from '@/lib/prisma'
import { ParsedExcelData, InventoryRow, ExpenseRow } from '@/lib/excel-parser'
import { BucketType, Warehouse } from '@prisma/client'

export interface ImportError {
  type: 'inventory' | 'expense'
  row: number
  message: string
}

export interface ImportResult {
  success: boolean
  inventoryImported: number
  expensesImported: number
  errors?: ImportError[]
}

/**
 * Get the current stock for a bucket+warehouse combination
 */
async function getCurrentStock(
  bucketType: BucketType,
  warehouse: Warehouse
): Promise<number> {
  const lastTransaction = await prisma.inventoryTransaction.findFirst({
    where: { bucketType, warehouse },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { runningTotal: true },
  })

  return lastTransaction?.runningTotal || 0
}

/**
 * Import inventory and expense data from parsed Excel
 * This function performs all validations and creates database records
 */
export async function bulkImportData(data: ParsedExcelData): Promise<ImportResult> {
  const errors: ImportError[] = []
  let inventoryImported = 0
  let expensesImported = 0

  try {
    // Sort inventory data by date to ensure proper running total calculation
    const sortedInventory = [...data.inventory].sort((a, b) =>
      a.Date.getTime() - b.Date.getTime()
    )

    // Track running totals per warehouse+bucket combination
    const stockTracker = new Map<string, number>()

    // Pre-calculate all inventory transactions with running totals
    const inventoryTransactions = []

    for (let i = 0; i < sortedInventory.length; i++) {
      const row = sortedInventory[i]
      const key = `${row.Warehouse}_${row.BucketType}`

      try {
        // Get current stock from database if not in tracker
        if (!stockTracker.has(key)) {
          const dbStock = await getCurrentStock(row.BucketType, row.Warehouse)
          stockTracker.set(key, dbStock)
        }

        const currentStock = stockTracker.get(key)!

        // Calculate signed quantity
        const signedQuantity = row.Action === 'SELL' ? -row.Quantity : row.Quantity

        // Calculate new running total (allow negative stock)
        const newRunningTotal = currentStock + signedQuantity

        // Add to batch
        inventoryTransactions.push({
          date: row.Date,
          warehouse: row.Warehouse,
          bucketType: row.BucketType,
          action: row.Action,
          quantity: signedQuantity,
          buyerSeller: row.BuyerSeller,
          runningTotal: newRunningTotal,
        })

        // Update tracker
        stockTracker.set(key, newRunningTotal)
      } catch (error) {
        errors.push({
          type: 'inventory',
          row: i + 2,
          message: error instanceof Error ? error.message : 'Failed to import row',
        })
      }
    }

    // Batch insert all inventory transactions at once
    if (inventoryTransactions.length > 0) {
      await prisma.inventoryTransaction.createMany({
        data: inventoryTransactions,
        skipDuplicates: false,
      })
      inventoryImported = inventoryTransactions.length
    }

    // Sort expense data by date
    const sortedExpenses = [...data.expenses].sort((a, b) =>
      a.Date.getTime() - b.Date.getTime()
    )

    // Pre-calculate all expense transactions
    const expenseTransactions = []

    for (let i = 0; i < sortedExpenses.length; i++) {
      const row = sortedExpenses[i]

      try {
        expenseTransactions.push({
          date: row.Date,
          amount: row.Amount,
          account: row.Account,
          type: row.Type,
          name: row.Name,
        })
      } catch (error) {
        errors.push({
          type: 'expense',
          row: i + 2,
          message: error instanceof Error ? error.message : 'Failed to import row',
        })
      }
    }

    // Batch insert all expense transactions at once
    if (expenseTransactions.length > 0) {
      await prisma.expenseTransaction.createMany({
        data: expenseTransactions,
        skipDuplicates: false,
      })
      expensesImported = expenseTransactions.length
    }

    // If there were errors but some records were imported, it's a partial success
    if (errors.length > 0) {
      return {
        success: false,
        inventoryImported,
        expensesImported,
        errors,
      }
    }

    return {
      success: true,
      inventoryImported,
      expensesImported,
    }
  } catch (error) {
    return {
      success: false,
      inventoryImported,
      expensesImported,
      errors: [
        {
          type: 'inventory',
          row: 0,
          message: error instanceof Error ? error.message : 'Failed to import data',
        },
      ],
    }
  }
}

/**
 * Format import errors into a readable string
 */
export function formatImportErrors(errors: ImportError[]): string {
  return errors
    .map(err => {
      const sheet = err.type === 'inventory' ? 'Inventory' : 'Expenses'
      const location = err.row > 0 ? `Row ${err.row}` : 'Import'
      return `${sheet} - ${location}: ${err.message}`
    })
    .join('\n')
}
