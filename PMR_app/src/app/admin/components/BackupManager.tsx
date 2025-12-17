'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface BackupLog {
  id: string
  backupDate: string
  backupType: string
  driveFileId: string | null
  inventoryCount: number
  expenseCount: number
  stockCount: number
  leadsCount: number
  registryCount: number
  warehousesCount: number
  expenseAccountsCount: number
  status: string
  errorMessage: string | null
}

export function BackupManager() {
  const [logs, setLogs] = useState<BackupLog[]>([])
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [backing, setBacking] = useState(false)
  const [message, setMessage] = useState('')

  const fetchBackupLogs = async () => {
    try {
      const response = await fetch('/api/admin/backup?limit=10')
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
        setLastBackupDate(data.lastBackupDate)
      }
    } catch (error) {
      console.error('Failed to fetch backup logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBackupLogs()
  }, [])

  const handleManualBackup = async () => {
    setBacking(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        const totalRecords = (data.inventoryCount || 0) + (data.expenseCount || 0) + (data.stockCount || 0) + (data.leadsCount || 0) + (data.registryCount || 0) + (data.warehousesCount || 0) + (data.expenseAccountsCount || 0)
        setMessage(`Backup created successfully! ${totalRecords} total records backed up.`)
        fetchBackupLogs()
      } else {
        setMessage(data.message || 'Backup failed')
      }
    } catch (error) {
      setMessage('Failed to create backup')
    } finally {
      setBacking(false)
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === 'SUCCESS') {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Backup Manager
        </CardTitle>
        <CardDescription>
          Automatic backups on sign-in (every 24 hours) to Google Drive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last Backup Info */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Last successful backup:</span>
          {lastBackupDate ? (
            <span className="font-medium">
              {formatDistanceToNow(new Date(lastBackupDate), { addSuffix: true })}
            </span>
          ) : (
            <span className="text-yellow-600">No backups yet</span>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded text-sm ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        {/* Manual Backup Button */}
        <Button
          onClick={handleManualBackup}
          disabled={backing}
          className="w-full sm:w-auto"
        >
          {backing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Creating Backup...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Create Manual Backup
            </>
          )}
        </Button>

        {/* Backup Logs Table */}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading backup history...</div>
        ) : logs.length > 0 ? (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Recent Backups</h4>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Records</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t">
                      <td className="px-3 py-2">
                        {format(new Date(log.backupDate), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${log.backupType === 'MANUAL' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                          {log.backupType}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {(log.inventoryCount || 0) + (log.expenseCount || 0) + (log.stockCount || 0) + (log.leadsCount || 0) + (log.registryCount || 0) + (log.warehousesCount || 0) + (log.expenseAccountsCount || 0)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(log.status)}
                          <span className={log.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}>
                            {log.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No backup history available</div>
        )}
      </CardContent>
    </Card>
  )
}
