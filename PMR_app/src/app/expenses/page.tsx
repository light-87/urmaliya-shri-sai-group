'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { AddExpenseForm } from './components/AddExpenseForm'
import { ExpenseTable } from './components/ExpenseTable'
import { useAuthStore } from '@/store/authStore'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Plus } from 'lucide-react'
import type { ExpenseTransaction, ExpensePagination } from '@/types'

export default function ExpensesPage() {
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([])
  const [pagination, setPagination] = useState<ExpensePagination>({
    total: 0,
    page: 1,
    limit: 100,
    totalPages: 0,
  })
  const [uniqueNames, setUniqueNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<ExpenseTransaction | null>(null)
  const { role } = useAuthStore()

  const isAdmin = role === 'ADMIN'

  const fetchData = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '100',
      })

      const response = await fetch(`/api/expenses?${params}`)
      const data = await response.json()

      if (data.success) {
        setTransactions(data.transactions)
        setPagination(data.pagination)
        setUniqueNames(data.uniqueNames)
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleEdit = (transaction: ExpenseTransaction) => {
    setEditingTransaction(transaction)
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return
    }

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchData(pagination.page)
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error)
    }
  }

  const handlePageChange = (page: number) => {
    fetchData(page)
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
          <h1 className="text-3xl font-bold">Expense Tracking</h1>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        <ExpenseTable
          transactions={transactions}
          pagination={pagination}
          isAdmin={isAdmin}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPageChange={handlePageChange}
        />

        <AddExpenseForm
          open={showAddForm}
          onClose={() => {
            setShowAddForm(false)
            setEditingTransaction(null)
          }}
          onSuccess={() => fetchData(editingTransaction ? pagination.page : 1)}
          uniqueNames={uniqueNames}
          editTransaction={editingTransaction}
        />
      </div>
    </ProtectedLayout>
  )
}
