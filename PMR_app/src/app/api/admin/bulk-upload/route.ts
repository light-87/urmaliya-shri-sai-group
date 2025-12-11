import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { parseExcelFile, formatParseErrors } from '@/lib/excel-parser'
import { bulkImportData, formatImportErrors } from '@/lib/bulk-import'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Max 60 seconds for Vercel Pro (increase if needed)

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * POST - Upload and process Excel file for bulk import
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

    // Get the file from form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (
      !file.name.endsWith('.xlsx') &&
      !file.name.endsWith('.xls')
    ) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse the Excel file
    const parseResult = parseExcelFile(buffer)

    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to parse Excel file',
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
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process bulk upload',
      },
      { status: 500 }
    )
  }
}
