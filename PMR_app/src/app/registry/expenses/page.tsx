'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, Download, Filter, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExpenseAccount, TransactionType, ACCOUNT_LABELS } from '@/types'

type RegistryExpenseCategory =
  | 'OFFICE_RENT'
  | 'STAFF_SALARY'
  | 'UTILITIES'
  | 'EQUIPMENT'
  | 'STATIONERY'
  | 'TRANSPORTATION'
  | 'MARKETING'
  | 'PROFESSIONAL_FEES'
  | 'MAINTENANCE'
  | 'OTHER'

const CATEGORY_LABELS: Record<RegistryExpenseCategory, string> = {
  OFFICE_RENT: 'Office Rent',
  STAFF_SALARY: 'Staff Salary',
  UTILITIES: 'Utilities',
  EQUIPMENT: 'Equipment',
  STATIONERY: 'Stationery',
  TRANSPORTATION: 'Transportation',
  MARKETING: 'Marketing',
  PROFESSIONAL_FEES: 'Professional Fees',
  MAINTENANCE: 'Maintenance',
  OTHER: 'Other',
}

interface RegistryExpense {
  id: string
  date: string
  amount: number
  account: ExpenseAccount
  type: TransactionType
  name: string
  createdAt: string
}

interface ExpenseSummary {
  totalExpenses: number
  totalIncome: number
  netAmount: number
  transactionCount: number
  categoryBreakdown: Record<string, number>
  accountBreakdown: Record<string, { income: number; expense: number }>
}

export default function RegistryExpensesPage() {
  const router = useRouter()
  const [expenses, setExpenses] = useState<RegistryExpense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingExpense, setEditingExpense] = useState<RegistryExpense | null>(null)

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [accountFilter, setAccountFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  // Form state
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    account: ExpenseAccount.CASH,
    type: TransactionType.EXPENSE,
    name: '',
    category: '' as RegistryExpenseCategory | '',
  })

  useEffect(() => {
    fetchExpenses()
    fetchSummary()
  }, [dateFrom, dateTo, accountFilter, categoryFilter, typeFilter])

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      if (accountFilter !== 'ALL') params.append('account', accountFilter)
      if (categoryFilter) params.append('category', categoryFilter)
      if (typeFilter !== 'ALL') params.append('type', typeFilter)

      const response = await fetch(`/api/registry/expenses?${params}`)
      const data = await response.json()

      if (data.success) {
        setExpenses(data.expenses)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Failed to fetch registry expenses:', error)
      alert('Failed to fetch registry expenses')
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)

      const response = await fetch(`/api/registry/expenses/summary?${params}`)
      const data = await response.json()

      if (data.success) {
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
      }

      const url = editingExpense
        ? '/api/registry/expenses'
        : '/api/registry/expenses'

      const method = editingExpense ? 'PUT' : 'POST'

      const body = editingExpense
        ? { ...payload, id: editingExpense.id }
        : payload

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        alert(editingExpense ? 'Expense updated successfully' : 'Expense added successfully')
        setShowAddDialog(false)
        setEditingExpense(null)
        resetForm()
        fetchExpenses()
        fetchSummary()
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Failed to save expense:', error)
      alert(error instanceof Error ? error.message : 'Failed to save expense')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const response = await fetch(`/api/registry/expenses?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        alert('Expense deleted successfully')
        fetchExpenses()
        fetchSummary()
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Failed to delete expense:', error)
      alert('Failed to delete expense')
    }
  }

  const handleEdit = (expense: RegistryExpense) => {
    // Extract category from name if it exists
    const categoryMatch = expense.name.match(/\[(.*?)\]/)
    const category = categoryMatch ? categoryMatch[1] as RegistryExpenseCategory : ''
    const cleanName = category ? expense.name.replace(/\[.*?\]\s*/, '') : expense.name

    setFormData({
      date: format(new Date(expense.date), 'yyyy-MM-dd'),
      amount: expense.amount.toString(),
      account: expense.account,
      type: expense.type,
      name: cleanName,
      category,
    })
    setEditingExpense(expense)
    setShowAddDialog(true)
  }

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      account: ExpenseAccount.CASH,
      type: TransactionType.EXPENSE,
      name: '',
      category: '',
    })
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Export feature coming soon')
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Registry Expenses</h1>
          <p className="text-muted-foreground">
            Track operational costs for registry operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => { resetForm(); setShowAddDialog(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                ₹{summary.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                ₹{summary.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{summary.netAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.transactionCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label>Account</Label>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Accounts</SelectItem>
                  {Object.entries(ACCOUNT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No expenses found
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => {
                  const categoryMatch = expense.name.match(/\[(.*?)\]/)
                  const category = categoryMatch ? categoryMatch[1] : 'N/A'
                  const cleanName = categoryMatch
                    ? expense.name.replace(/\[.*?\]\s*/, '')
                    : expense.name

                  return (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{cleanName}</TableCell>
                      <TableCell>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {category}
                        </span>
                      </TableCell>
                      <TableCell>{ACCOUNT_LABELS[expense.account]}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            expense.type === 'INCOME'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {expense.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={expense.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
                          ₹{Number(expense.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value as RegistryExpenseCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter description"
                required
              />
            </div>

            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label>Account</Label>
              <Select
                value={formData.account}
                onValueChange={(value) =>
                  setFormData({ ...formData, account: value as ExpenseAccount })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as TransactionType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false)
                  setEditingExpense(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingExpense ? 'Update' : 'Add'} Expense
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
