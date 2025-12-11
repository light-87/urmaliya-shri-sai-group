'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function DeleteRecentImport() {
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [minutes, setMinutes] = useState('30')
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    setResult(null)

    try {
      const minutesAgo = parseInt(minutes, 10)
      const cutoffDate = new Date(Date.now() - minutesAgo * 60 * 1000)

      const response = await fetch('/api/admin/delete-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          afterTimestamp: cutoffDate.toISOString(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(`✅ Deleted ${data.inventoryDeleted} inventory and ${data.expensesDeleted} expense records`)
        setShowConfirm(false)
      } else {
        setResult(`❌ ${data.message}`)
      }
    } catch (error) {
      setResult(`❌ ${error instanceof Error ? error.message : 'Failed to delete'}`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-3 p-4 border border-red-200 rounded-lg bg-red-50/50">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-red-900">Delete Recent Import</h3>
          <p className="text-sm text-red-700 mt-1">
            If you accidentally uploaded duplicate data, you can delete recent transactions.
          </p>
        </div>
      </div>

      {!showConfirm ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-20 px-2 py-1 border rounded text-sm"
            min="1"
            max="1440"
          />
          <span className="text-sm text-red-700">minutes ago</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Records
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Warning:</strong> This will permanently delete all inventory and expense
              transactions created in the last {minutes} minutes. This cannot be undone!
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="text-sm mt-2 p-2 bg-white rounded border">
          {result}
        </div>
      )}
    </div>
  )
}
