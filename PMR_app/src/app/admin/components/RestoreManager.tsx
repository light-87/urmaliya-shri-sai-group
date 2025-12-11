'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RotateCcw, RefreshCw, AlertTriangle, Download, Calendar, HardDrive } from 'lucide-react'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface BackupFile {
  id: string
  name: string
  createdTime: string
  size: number
  webViewLink: string
  backupType?: string
  inventoryCount?: number
  expenseCount?: number
  backupDate?: string
}

export function RestoreManager() {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [message, setMessage] = useState('')

  const fetchBackups = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/backup/list?limit=1')
      const data = await response.json()

      if (data.success) {
        setBackups(data.backups)
      } else {
        setMessage('Failed to load backups: ' + data.message)
      }
    } catch (error) {
      console.error('Failed to fetch backups:', error)
      setMessage('Failed to load backups from Google Drive')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBackups()
  }, [])

  const handleRestoreClick = (backup: BackupFile) => {
    setSelectedBackup(backup)
    setShowConfirmDialog(true)
  }

  const handleRestoreConfirm = async () => {
    if (!selectedBackup) return

    setShowConfirmDialog(false)
    setRestoring(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driveFileId: selectedBackup.id,
          fileName: selectedBackup.name,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(
          `✓ Backup restored successfully! ${data.inventoryRestored} inventory and ${data.expensesRestored} expense records restored. Current state was backed up as: ${data.currentBackupId}`
        )
      } else {
        setMessage(
          `✗ Restore failed: ${data.message}${data.currentBackupId ? ` (Current state was backed up as: ${data.currentBackupId})` : ''}`
        )
      }
    } catch (error) {
      setMessage('Failed to restore backup: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setRestoring(false)
      setSelectedBackup(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Restore from Backup
          </CardTitle>
          <CardDescription>
            Restore from the last backup. Current data will be backed up before restoration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong className="font-semibold">Warning:</strong> Restoring a backup will:
              <ol className="list-decimal ml-5 mt-2 space-y-1">
                <li>Create a backup of your current data (as a safety measure)</li>
                <li>Delete all existing inventory and expense transactions</li>
                <li>Restore data from the selected backup file</li>
              </ol>
              <p className="mt-2">This action cannot be undone except by restoring from another backup.</p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded text-sm ${
                message.includes('✓')
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          {/* Refresh Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBackups}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Backups List */}
          {loading && backups.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading backups from Google Drive...
            </div>
          ) : backups.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Backup Name</th>
                      <th className="px-3 py-2 text-left">Date Created</th>
                      <th className="px-3 py-2 text-left">Records</th>
                      <th className="px-3 py-2 text-left">Size</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((backup) => (
                      <tr key={backup.id} className="border-t hover:bg-muted/50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{backup.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {format(new Date(backup.createdTime), 'MMM d, yyyy h:mm a')}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {backup.inventoryCount !== undefined && backup.expenseCount !== undefined ? (
                            <div className="text-xs">
                              <div>Inv: {backup.inventoryCount}</div>
                              <div>Exp: {backup.expenseCount}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatFileSize(backup.size)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleRestoreClick(backup)}
                              disabled={restoring}
                            >
                              {restoring && selectedBackup?.id === backup.id ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                                  Restoring...
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                  Restore
                                </>
                              )}
                            </Button>
                            <a
                              href={backup.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" size="sm">
                                <Download className="h-3.5 w-3.5 mr-1" />
                                View
                              </Button>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              No backups available. Create a backup first using the Backup Manager above.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Confirm Restore Operation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to restore from: <strong>{selectedBackup?.name}</strong>
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                <strong className="text-yellow-900">This will:</strong>
                <ol className="list-decimal ml-5 mt-2 space-y-1 text-yellow-800">
                  <li>Create a backup of your current data first</li>
                  <li>Delete ALL existing inventory and expense records</li>
                  <li>Restore data from the selected backup</li>
                </ol>
              </div>
              <p className="font-semibold">Are you sure you want to continue?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreConfirm}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Yes, Restore Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
