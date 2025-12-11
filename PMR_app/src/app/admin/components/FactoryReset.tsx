'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { AlertTriangle, Trash2 } from 'lucide-react'

export function FactoryReset() {
  const [showDialog, setShowDialog] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleReset = async () => {
    if (pin !== '14863') {
      setMessage({ type: 'error', text: 'Invalid PIN' })
      return
    }

    if (confirmText.toUpperCase() !== 'DELETE ALL DATA') {
      setMessage({ type: 'error', text: 'Please type "DELETE ALL DATA" to confirm' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/factory-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Factory reset successful! Deleted ${data.deletedCounts.inventory} inventory, ${data.deletedCounts.expenses} expenses, and ${data.deletedCounts.stock} stock transactions.`
        })
        setShowDialog(false)
        setPin('')
        setConfirmText('')
      } else {
        setMessage({ type: 'error', text: data.message || 'Factory reset failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Something went wrong' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = () => {
    setShowDialog(true)
    setPin('')
    setConfirmText('')
    setMessage(null)
  }

  return (
    <>
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="h-5 w-5" />
            Factory Reset
          </CardTitle>
          <CardDescription className="text-red-700">
            ⚠️ Permanently delete ALL data from the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="bg-white p-4 rounded-lg border border-red-200">
            <h4 className="font-semibold text-red-900 mb-2">⚠️ Warning: This action cannot be undone!</h4>
            <p className="text-sm text-red-700 mb-3">Factory reset will permanently delete:</p>
            <ul className="text-sm text-red-700 space-y-1 ml-4 list-disc">
              <li>All Inventory transactions</li>
              <li>All Expense transactions</li>
              <li>All StockBoard transactions</li>
              <li>All Backup logs (except the last backup)</li>
            </ul>
            <p className="text-sm text-green-700 mt-3 font-medium">
              ✓ The last backup will be preserved for recovery
            </p>
            <p className="text-sm text-red-700 mt-2 font-medium">
              User PINs and system settings will NOT be affected.
            </p>
          </div>

          <Button
            onClick={handleOpenDialog}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Factory Reset System
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Factory Reset
            </DialogTitle>
            <DialogDescription>
              This action will permanently delete ALL data from the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-pin">Enter Factory Reset PIN</Label>
              <Input
                id="reset-pin"
                type="password"
                inputMode="numeric"
                maxLength={5}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 5-digit PIN"
                className="text-center text-2xl tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                Contact system administrator for the factory reset PIN
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-text">Type "DELETE ALL DATA" to confirm</Label>
              <Input
                id="confirm-text"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE ALL DATA"
                className="font-mono"
              />
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will permanently delete all inventory, expenses, and stock data. The last backup will be preserved for recovery.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDialog(false)
                setPin('')
                setConfirmText('')
                setMessage(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReset}
              disabled={loading || pin !== '14863' || confirmText.toUpperCase() !== 'DELETE ALL DATA'}
            >
              {loading ? 'Deleting...' : 'Delete All Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
