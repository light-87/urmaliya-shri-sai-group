'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { InventoryDashboard } from './components/InventoryDashboard'
import { AddEntryForm } from './components/AddEntryForm'
import { SellFreeDEFForm } from './components/SellFreeDEFForm'
import { TransactionLog } from './components/TransactionLog'
import { DateSearch } from './components/DateSearch'
import { useAuthStore } from '@/store/authStore'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Plus, TrendingDown } from 'lucide-react'
import type { InventoryTransaction, InventorySummary } from '@/types'

export default function InventoryPage() {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [summary, setSummary] = useState<InventorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showSellFreeDEFForm, setShowSellFreeDEFForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<InventoryTransaction | null>(null)
  const [searchDate, setSearchDate] = useState<string | null>(null)
  const [freeDEFStock, setFreeDEFStock] = useState(0)
  const { role } = useAuthStore()

  const isAdmin = role === 'ADMIN'

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchDate) {
        params.set('date', searchDate)
      }

      const response = await fetch(`/api/inventory?${params}`)
      const data = await response.json()

      if (data.success) {
        setTransactions(data.transactions)
        setSummary(data.summary)
      }

      // Fetch stock data for Free DEF (all users can sell Free DEF)
      const stockResponse = await fetch('/api/stock')
      const stockData = await stockResponse.json()
      if (stockData.success && stockData.summary) {
        setFreeDEFStock(stockData.summary.freeDEF || 0)
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setLoading(false)
    }
  }, [searchDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleEdit = (transaction: InventoryTransaction) => {
    setEditingTransaction(transaction)
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return
    }

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error)
    }
  }

  const handleDateSearch = (date: string | null) => {
    setSearchDate(date)
  }

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
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowSellFreeDEFForm(true)}
              variant="destructive"
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Sell Free DEF
            </Button>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </div>

        <InventoryDashboard summary={summary} />

        {isAdmin && (
          <DateSearch onSearch={handleDateSearch} />
        )}

        <TransactionLog
          transactions={transactions}
          isAdmin={isAdmin}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <AddEntryForm
          open={showAddForm}
          onClose={() => {
            setShowAddForm(false)
            setEditingTransaction(null)
          }}
          onSuccess={fetchData}
          summary={summary}
          editTransaction={editingTransaction}
        />

        {showSellFreeDEFForm && (
          <SellFreeDEFForm
            onClose={() => setShowSellFreeDEFForm(false)}
            onSuccess={fetchData}
            currentFreeDEFStock={freeDEFStock}
          />
        )}
      </div>
    </ProtectedLayout>
  )
}
