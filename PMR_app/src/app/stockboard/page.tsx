'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { StockOverviewCard } from './components/StockOverviewCard'
import { AddUreaForm } from './components/AddUreaForm'
import { ProduceBatchForm } from './components/ProduceBatchForm'
import { StockTransactionLog } from './components/StockTransactionLog'
import { useAuthStore } from '@/store/authStore'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { PackagePlus, Factory, RefreshCw } from 'lucide-react'
import type { StockTransaction, StockSummary } from '@/types'
import { useRouter } from 'next/navigation'

export default function StockBoardPage() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [summary, setSummary] = useState<StockSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddUreaForm, setShowAddUreaForm] = useState(false)
  const [showProduceForm, setShowProduceForm] = useState(false)
  const { role } = useAuthStore()
  const router = useRouter()

  // Allow ADMIN and EXPENSE_INVENTORY to perform actions
  const canPerformActions = role === 'ADMIN' || role === 'EXPENSE_INVENTORY'

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
    fetchData()
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
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
        <StockTransactionLog transactions={transactions} onRefresh={fetchData} />

        {/* Modals */}
        {showAddUreaForm && (
          <AddUreaForm onClose={handleFormClose} />
        )}
        {showProduceForm && (
          <ProduceBatchForm onClose={handleFormClose} currentUreaStock={summary?.ureaKg || 0} />
        )}
      </div>
    </ProtectedLayout>
  )
}
