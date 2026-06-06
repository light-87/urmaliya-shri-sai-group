'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StockOverviewCard } from './components/StockOverviewCard'
import { AddUreaForm } from './components/AddUreaForm'
import { ProduceBatchForm, type EditBatchInfo } from './components/ProduceBatchForm'
import { StockTransactionLog } from './components/StockTransactionLog'
import { useAuthStore } from '@/store/authStore'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { PackagePlus, Factory, RefreshCw, AlertCircle } from 'lucide-react'
import type { StockTransaction, StockSummary } from '@/types'
import { LITERS_PER_BATCH } from '@/types'

interface PendingDelete {
  id: string
  label: string
}

export default function StockBoardPage() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [summary, setSummary] = useState<StockSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddUreaForm, setShowAddUreaForm] = useState(false)
  const [showProduceForm, setShowProduceForm] = useState(false)
  const [editingUrea, setEditingUrea] = useState<StockTransaction | null>(null)
  const [editingBatch, setEditingBatch] = useState<EditBatchInfo | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const { role } = useAuthStore()

  // Allow ADMIN and EXPENSE_INVENTORY to perform actions
  const canPerformActions = role === 'ADMIN' || role === 'EXPENSE_INVENTORY'
  // Edit/delete uses admin-only API endpoints
  const isAdmin = role === 'ADMIN'

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/stock')
      const data = await response.json()

      if (data.success) {
        setTransactions(data.transactions)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Failed to fetch stock data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFormClose = () => {
    setShowAddUreaForm(false)
    setShowProduceForm(false)
    setEditingUrea(null)
    setEditingBatch(null)
    fetchData()
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const handleDeleteRequest = (id: string, label: string) => {
    setDeleteError('')
    setPendingDelete({ id, label })
  }

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError('')

    try {
      const response = await fetch(`/api/stock/${pendingDelete.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (result.success) {
        setPendingDelete(null)
        fetchData()
      } else {
        // Keep the dialog open so the user sees why (e.g. the deletion
        // would make a stock balance go negative).
        setDeleteError(result.message || 'Failed to delete transaction')
      }
    } catch {
      setDeleteError('Something went wrong while deleting')
    } finally {
      setDeleting(false)
    }
  }

  const handleEditUrea = (transaction: StockTransaction) => {
    setEditingUrea(transaction)
  }

  const handleEditBatch = (group: StockTransaction[]) => {
    const ureaLeg = group.find(t => t.category === 'UREA')
    const freeDEFLeg = group.find(t => t.category === 'FREE_DEF')
    if (!ureaLeg || !freeDEFLeg) return

    setEditingBatch({
      ureaLegId: ureaLeg.id,
      date: ureaLeg.date,
      batchCount: Math.max(1, Math.round(freeDEFLeg.quantity / LITERS_PER_BATCH)),
    })
  }

  // Auto-refresh when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchData()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchData])

  if (loading) {
    return (
      <ProtectedLayout>
        <PageLoader />
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">StockBoard</h1>
            <p className="text-muted-foreground mt-1">Production & Materials Management</p>
          </div>
        </div>

        {/* Stock Overview */}
        <StockOverviewCard summary={summary} />

        {/* Quick Actions */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">⚡ Quick Actions</h2>
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          {canPerformActions ? (
            <>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setShowAddUreaForm(true)} variant="default">
                  <PackagePlus className="h-4 w-4 mr-2" />
                  Add Urea
                </Button>
                <Button onClick={() => setShowProduceForm(true)} variant="default" className="bg-purple-600 hover:bg-purple-700">
                  <Factory className="h-4 w-4 mr-2" />
                  Produce Batch
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                💡 To sell Free DEF (loose), go to Inventory page
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              View stock levels and production history. Contact admin for production actions.
            </p>
          )}
        </div>

        {/* Transaction Log */}
        <StockTransactionLog
          transactions={transactions}
          isAdmin={isAdmin}
          onDelete={handleDeleteRequest}
          onEditUrea={handleEditUrea}
          onEditBatch={handleEditBatch}
        />

        {/* Modals */}
        {(showAddUreaForm || editingUrea) && (
          <AddUreaForm onClose={handleFormClose} editTransaction={editingUrea || undefined} />
        )}
        {(showProduceForm || editingBatch) && (
          <ProduceBatchForm
            onClose={handleFormClose}
            currentUreaStock={summary?.ureaKg || 0}
            editBatch={editingBatch || undefined}
          />
        )}

        {/* Delete confirmation */}
        <AlertDialog
          open={!!pendingDelete}
          onOpenChange={(open) => {
            if (!open && !deleting) {
              setPendingDelete(null)
              setDeleteError('')
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to delete the {pendingDelete?.label}. Stock balances will be
                recalculated automatically. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} className="min-h-11">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleDeleteConfirm()
                }}
                disabled={deleting}
                className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedLayout>
  )
}
