import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { parseCSVFiles, formatParseErrors } from '@/lib/csv-parser'
import { bulkImportData, formatImportErrors } from '@/lib/bulk-import'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Max 60 seconds for Vercel Pro (increase if needed)

// Maximum file size: 10MB per file
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * POST - Upload and process CSV files for bulk import
 * Only accessible by ADMIN role
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin permission
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only admins can perform bulk uploads' },
        { status: 403 }
      )
    }

    // Get the files from form data
    const formData = await request.formData()
    const inventoryFile = formData.get('inventoryFile') as File | null
    const expensesFile = formData.get('expensesFile') as File | null

    if (!inventoryFile || !expensesFile) {
      return NextResponse.json(
        { success: false, message: 'Both inventory and expenses CSV files are required' },
        { status: 400 }
      )
    }

    // Validate file types
    if (!inventoryFile.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, message: 'Inventory file must be a CSV file (.csv)' },
        { status: 400 }
      )
    }

    if (!expensesFile.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, message: 'Expenses file must be a CSV file (.csv)' },
        { status: 400 }
      )
    }

    // Validate file sizes
    if (inventoryFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'Inventory file too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    if (expensesFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'Expenses file too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    // Read file contents
    const inventoryContent = await inventoryFile.text()
    const expensesContent = await expensesFile.text()

    // Parse the CSV files
    const parseResult = parseCSVFiles(inventoryContent, expensesContent)

    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to parse CSV files',
          errors: parseResult.errors ? formatParseErrors(parseResult.errors) : undefined,
        },
        { status: 400 }
      )
    }

    // Import the data
    const importResult = await bulkImportData(parseResult.data)

    if (!importResult.success && importResult.errors) {
      // Partial or complete failure
      return NextResponse.json(
        {
          success: false,
          message: 'Some records failed to import',
          inventoryImported: importResult.inventoryImported,
          expensesImported: importResult.expensesImported,
          errors: formatImportErrors(importResult.errors),
        },
        { status: 400 }
      )
    }

    // Success
    return NextResponse.json({
      success: true,
      message: 'Data imported successfully',
      inventoryImported: importResult.inventoryImported,
      expensesImported: importResult.expensesImported,
    })
  } catch (error) {
    console.error('Bulk CSV upload error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process bulk upload',
      },
      { status: 500 }
    )
  }
}
