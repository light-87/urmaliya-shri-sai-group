'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface UploadResult {
  success: boolean
  message: string
  inventoryImported?: number
  expensesImported?: number
  errors?: string
}

type UploadMode = 'excel' | 'csv'

export function BulkUploadForm() {
  const [mode, setMode] = useState<UploadMode>('csv')
  const [file, setFile] = useState<File | null>(null)
  const [inventoryFile, setInventoryFile] = useState<File | null>(null)
  const [expensesFile, setExpensesFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inventoryInputRef = useRef<HTMLInputElement>(null)
  const expensesInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null) // Clear previous results
    }
  }

  const handleInventoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setInventoryFile(selectedFile)
      setResult(null)
    }
  }

  const handleExpensesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setExpensesFile(selectedFile)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (mode === 'excel' && !file) return
    if (mode === 'csv' && (!inventoryFile || !expensesFile)) return

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()

      if (mode === 'excel') {
        formData.append('file', file!)

        const response = await fetch('/api/admin/bulk-upload', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        setResult({
          success: data.success,
          message: data.message,
          inventoryImported: data.inventoryImported,
          expensesImported: data.expensesImported,
          errors: data.errors,
        })

        // Clear file input on success
        if (data.success) {
          setFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
      } else {
        // CSV mode
        formData.append('inventoryFile', inventoryFile!)
        formData.append('expensesFile', expensesFile!)

        const response = await fetch('/api/admin/bulk-upload-csv', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        setResult({
          success: data.success,
          message: data.message,
          inventoryImported: data.inventoryImported,
          expensesImported: data.expensesImported,
          errors: data.errors,
        })

        // Clear file inputs on success
        if (data.success) {
          setInventoryFile(null)
          setExpensesFile(null)
          if (inventoryInputRef.current) {
            inventoryInputRef.current.value = ''
          }
          if (expensesInputRef.current) {
            expensesInputRef.current.value = ''
          }
        }
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload file',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleClearFile = () => {
    setFile(null)
    setInventoryFile(null)
    setExpensesFile(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (inventoryInputRef.current) {
      inventoryInputRef.current.value = ''
    }
    if (expensesInputRef.current) {
      expensesInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Warning about duplicates */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Uploading files will ADD new records to your database.
          Re-uploading the same data will create duplicates. Use the "Delete Recent Import"
          feature above if you need to undo an accidental upload.
        </AlertDescription>
      </Alert>

      {/* Mode Selector */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'csv' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setMode('csv')
            handleClearFile()
          }}
        >
          CSV Files (Recommended)
        </Button>
        <Button
          type="button"
          variant={mode === 'excel' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setMode('excel')
            handleClearFile()
          }}
        >
          Excel File
        </Button>
      </div>

      {/* Excel Mode */}
      {mode === 'excel' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="bulk-upload-input"
            />
            <label htmlFor="bulk-upload-input">
              <Button type="button" variant="outline" asChild>
                <span>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Choose Excel File
                </span>
              </Button>
            </label>
            {file && (
              <span className="text-sm text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </span>
            )}
            {file && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFile}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* CSV Mode */}
      {mode === 'csv' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Inventory CSV</label>
            <div className="flex items-center gap-2">
              <input
                ref={inventoryInputRef}
                type="file"
                accept=".csv"
                onChange={handleInventoryFileChange}
                className="hidden"
                id="inventory-csv-input"
              />
              <label htmlFor="inventory-csv-input">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Choose Inventory CSV
                  </span>
                </Button>
              </label>
              {inventoryFile && (
                <span className="text-sm text-muted-foreground">
                  {inventoryFile.name} ({(inventoryFile.size / 1024).toFixed(2)} KB)
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Expenses CSV</label>
            <div className="flex items-center gap-2">
              <input
                ref={expensesInputRef}
                type="file"
                accept=".csv"
                onChange={handleExpensesFileChange}
                className="hidden"
                id="expenses-csv-input"
              />
              <label htmlFor="expenses-csv-input">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Choose Expenses CSV
                  </span>
                </Button>
              </label>
              {expensesFile && (
                <span className="text-sm text-muted-foreground">
                  {expensesFile.name} ({(expensesFile.size / 1024).toFixed(2)} KB)
                </span>
              )}
            </div>
          </div>

          {(inventoryFile || expensesFile) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFile}
            >
              Clear All
            </Button>
          )}
        </div>
      )}

      {/* Upload Button */}
      {((mode === 'excel' && file) || (mode === 'csv' && inventoryFile && expensesFile)) && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full sm:w-auto"
        >
          {uploading ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload and Import
            </>
          )}
        </Button>
      )}

      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          <div className="flex items-start gap-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 mt-0.5" />
            )}
            <div className="flex-1">
              <AlertDescription>
                <div className="font-medium mb-1">{result.message}</div>
                {result.inventoryImported !== undefined && result.expensesImported !== undefined && (
                  <div className="text-sm mt-2">
                    <div>Inventory records imported: {result.inventoryImported}</div>
                    <div>Expense records imported: {result.expensesImported}</div>
                  </div>
                )}
                {result.errors && (
                  <div className="mt-2 text-sm">
                    <div className="font-medium mb-1">Errors:</div>
                    <pre className="whitespace-pre-wrap text-xs bg-background/50 p-2 rounded mt-1">
                      {result.errors}
                    </pre>
                  </div>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      <div className="text-sm text-muted-foreground space-y-1">
        {mode === 'csv' ? (
          <>
            <p className="font-medium">CSV Format Requirements:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Two separate CSV files (Inventory and Expenses)</li>
              <li>Maximum file size: 10MB per file</li>
              <li><strong>No header row needed</strong> - data starts from first row</li>
            </ul>
            <p className="font-medium mt-3">Inventory CSV Columns (in order):</p>
            <ol className="list-decimal list-inside ml-2">
              <li>Date (DD-MMM-YYYY like "20-Nov-2025")</li>
              <li>Warehouse (Pallavi or Tularam)</li>
              <li>BucketType (TATA G, AL, ES, BB, MH, etc.)</li>
              <li>Action (Stock or Sell)</li>
              <li>Quantity (number, can be negative)</li>
              <li>BuyerSeller (name)</li>
            </ol>
            <p className="font-medium mt-3">Expenses CSV Columns (in order):</p>
            <ol className="list-decimal list-inside ml-2">
              <li>Date (DD-MMM-YYYY like "1-Jan-2025")</li>
              <li>Amount (₹30,000.00 or 30000)</li>
              <li>Account (Cash, PMR, etc.)</li>
              <li>Type (Income or Expense)</li>
              <li>Name (vendor/customer)</li>
            </ol>
            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
              <p className="font-medium">Example Inventory CSV:</p>
              <code>20-Nov-2025,Tularam,TATA G,Sell,-15,kohmara</code><br/>
              <code>20-Nov-2025,Tularam,AL,Sell,-10,kohmara</code>
            </div>
            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
              <p className="font-medium">Example Expenses CSV:</p>
              <code>1-Jan-2025,₹30,000.00,Cash,Expense,BHUSHAN</code><br/>
              <code>2-Jan-2025,₹140,000.00,PMR,Expense,OM NAGPUR</code>
            </div>
          </>
        ) : (
          <>
            <p className="font-medium">Excel Format Requirements:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Excel file (.xlsx or .xls)</li>
              <li>Maximum file size: 10MB</li>
              <li>Must contain two sheets: "Inventory" and "Expenses"</li>
              <li><strong>Header row required</strong> with column names</li>
            </ul>
            <p className="font-medium mt-3">Inventory Sheet Columns:</p>
            <ul className="list-disc list-inside ml-2">
              <li>Date, Warehouse, BucketType, Action, Quantity, BuyerSeller</li>
            </ul>
            <p className="font-medium mt-3">Expenses Sheet Columns:</p>
            <ul className="list-disc list-inside ml-2">
              <li>Date, Amount, Account, Type, Name</li>
            </ul>
          </>
        )}
        <p className="text-xs mt-2 italic">
          Note: All data is automatically normalized (case-insensitive, currency symbols removed, negative quantities handled, dates parsed)
        </p>
      </div>
    </div>
  )
}
