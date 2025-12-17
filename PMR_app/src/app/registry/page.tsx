'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { RegistryForm } from './components/RegistryForm'
import { RegistryTable, type FilterState } from './components/RegistryTable'
import { RegistryDetailView } from './components/RegistryDetailView'
import { useAuthStore } from '@/store/authStore'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Plus, FileText, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react'
import type { RegistryTransaction, RegistryPagination, RegistrySummary } from '@/types'

export default function RegistryPage() {
  const [transactions, setTransactions] = useState<RegistryTransaction[]>([])
  const [pagination, setPagination] = useState<RegistryPagination>({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  })
  const [summary, setSummary] = useState<RegistrySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<RegistryTransaction | null>(null)
  const [viewingTransaction, setViewingTransaction] = useState<RegistryTransaction | null>(null)
  const [filters, setFilters] = useState<FilterState>({})
  const { role } = useAuthStore()

  const isAdmin = role === 'ADMIN'

  const fetchData = useCallback(async (page = 1, currentFilters = filters) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      })

      // Add filters to params
      if (currentFilters.startDate) params.append('startDate', currentFilters.startDate)
      if (currentFilters.endDate) params.append('endDate', currentFilters.endDate)
      if (currentFilters.paymentStatus) params.append('paymentStatus', currentFilters.paymentStatus)
      if (currentFilters.transactionType) params.append('transactionType', currentFilters.transactionType)
      if (currentFilters.location) params.append('location', currentFilters.location)
      if (currentFilters.seller) params.append('seller', currentFilters.seller)
      if (currentFilters.buyer) params.append('buyer', currentFilters.buyer)

      const response = await fetch(`/api/registry?${params}`)
      const data = await response.json()

      if (data.success) {
        setTransactions(data.transactions)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch registry transactions:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await fetch(`/api/registry/summary?${params}`)
      const data = await response.json()

      if (data.success) {
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Failed to fetch registry summary:', error)
    }
  }, [filters])

  useEffect(() => {
    fetchData()
    fetchSummary()
  }, [fetchData, fetchSummary])

  const handleEdit = (transaction: RegistryTransaction) => {
    setEditingTransaction(transaction)
    setShowAddForm(true)
  }

  const handleView = (transaction: RegistryTransaction) => {
    setViewingTransaction(transaction)
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/registry/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchData(pagination.page)
        fetchSummary()
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error)
    }
  }

  const handlePageChange = (page: number) => {
    fetchData(page)
  }

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    fetchData(1, newFilters)
    fetchSummary()
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Registry Manager</h1>
            <p className="text-muted-foreground mt-1">
              Property registry transaction management
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Transactions */}
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold mt-1">{summary.totalTransactions}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            {/* Total Income */}
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    ₹{summary.totalIncome.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Credit + Commission</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold mt-1 text-red-600">
                    ₹{summary.totalExpenses.toLocaleString('en-IN')}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </div>

            {/* Net Profit */}
            <div className={`p-6 rounded-lg border shadow-sm ${
              summary.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Profit</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    summary.netProfit >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {summary.netProfit >= 0 ? '+' : ''}₹{summary.netProfit.toLocaleString('en-IN')}
                  </p>
                </div>
                <DollarSign className={`h-8 w-8 ${
                  summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </div>
        )}

        {/* Pending Payments Alert */}
        {summary && summary.pendingPayments > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Pending Payments: ₹{summary.pendingPayments.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Outstanding balance from clients
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <RegistryTable
          transactions={transactions}
          pagination={pagination}
          isAdmin={isAdmin}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          onFilterChange={handleFilterChange}
          onPageChange={handlePageChange}
        />

        {/* Add/Edit Form */}
        <RegistryForm
          open={showAddForm}
          onClose={() => {
            setShowAddForm(false)
            setEditingTransaction(null)
          }}
          onSuccess={() => {
            fetchData(editingTransaction ? pagination.page : 1)
            fetchSummary()
          }}
          editTransaction={editingTransaction}
        />

        {/* Detail View */}
        <RegistryDetailView
          open={!!viewingTransaction}
          onClose={() => setViewingTransaction(null)}
          transaction={viewingTransaction}
          onEdit={handleEdit}
        />
      </div>
    </ProtectedLayout>
  )
}
