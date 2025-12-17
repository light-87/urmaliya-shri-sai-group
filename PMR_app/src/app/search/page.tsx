'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import { ACCOUNT_LABELS } from '@/types'
import type { ExpenseTransaction, ExpenseAccount, TransactionType } from '@/types'
import { Search as SearchIcon, Printer, Pencil, Trash2 } from 'lucide-react'
import { AddExpenseForm } from '@/app/expenses/components/AddExpenseForm'
import { useAuthStore } from '@/store/authStore'

export default function SearchPage() {
  const [names, setNames] = useState<string[]>([])
  const [selectedName, setSelectedName] = useState<string>('ALL')
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<{
    transactions: ExpenseTransaction[]
    totalBalance: number
    totalIncome: number
    totalExpense: number
  } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<ExpenseTransaction | null>(null)
  const { role } = useAuthStore()

  const isAdmin = role === 'ADMIN'

  useEffect(() => {
    fetchNames()
  }, [])

  const fetchNames = async () => {
    try {
      const response = await fetch('/api/expenses')
      const data = await response.json()
      if (data.success) {
        setNames(data.uniqueNames)
      }
    } catch (error) {
      console.error('Failed to fetch names:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    setSearching(true)
    try {
      const params = new URLSearchParams()
      if (selectedName && selectedName !== 'ALL') params.set('name', selectedName)
      if (selectedAccount && selectedAccount !== 'ALL') params.set('account', selectedAccount)
      if (selectedType && selectedType !== 'ALL') params.set('type', selectedType)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const response = await fetch(`/api/search?${params}`)
      const data = await response.json()

      if (data.success) {
        setResults({
          transactions: data.transactions,
          totalBalance: data.totalBalance,
          totalIncome: data.totalIncome,
          totalExpense: data.totalExpense,
        })
      }
    } catch (error) {
      console.error('Failed to search:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleReset = () => {
    setSelectedName('ALL')
    setSelectedAccount('ALL')
    setSelectedType('ALL')
    setStartDate('')
    setEndDate('')
    setResults(null)
  }

  const handlePrint = () => {
    window.print()
  }

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
        // Refresh the search results after deletion
        handleSearch()
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error)
    }
  }

  const getFilterSummary = () => {
    const filters: string[] = []
    if (selectedName && selectedName !== 'ALL') filters.push(`Name: ${selectedName}`)
    if (selectedAccount && selectedAccount !== 'ALL') filters.push(`Account: ${ACCOUNT_LABELS[selectedAccount as ExpenseAccount]}`)
    if (selectedType && selectedType !== 'ALL') filters.push(`Type: ${selectedType}`)
    if (startDate) filters.push(`From: ${format(new Date(startDate), 'dd-MMM-yyyy')}`)
    if (endDate) filters.push(`To: ${format(new Date(endDate), 'dd-MMM-yyyy')}`)
    return filters.length > 0 ? filters.join(' | ') : 'All Transactions'
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <PageLoader />
      </ProtectedLayout>
    )
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          /* Hide everything by default */
          body * {
            visibility: hidden;
          }

          /* Only show print content */
          #print-content,
          #print-content * {
            visibility: visible;
          }

          /* Position print content at top */
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          @page {
            size: A4;
            margin: 15mm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }

        .screen-only {
          display: block;
        }

        .print-only {
          display: none;
        }

        @media print {
          .screen-only {
            display: none;
          }

          .print-only {
            display: block;
          }
        }
      `}</style>

      {/* Print-only content - hidden on screen */}
      {results && (
        <div id="print-content" className="print-only" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #333' }}>
            <img src="/logo.png" alt="Company Logo" style={{ maxWidth: '168px', height: 'auto' }} />
            <div style={{ textAlign: 'right', fontSize: '11px', lineHeight: '1.6', color: '#555' }}>
              <div><strong>Address:</strong> Pimpalgaon Manegao, Maharashtra</div>
              <div><strong>Email:</strong> pbgaydhane@gmail.com</div>
              <div><strong>Phone:</strong> +917030847030</div>
              <div><strong>Phone:</strong> +917020143332</div>
            </div>
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '20px 0', textAlign: 'center', color: '#333' }}>Transaction Statement</h1>

          <div style={{ margin: '20px 0', fontSize: '12px', backgroundColor: '#f9f9f9', padding: '12px', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
            <div><strong>Search Criteria:</strong> {getFilterSummary()}</div>
            <div><strong>Generated on:</strong> {format(new Date(), 'dd-MMM-yyyy hh:mm a')}</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ddd', padding: '10px 8px', fontWeight: '600', width: '5%', textAlign: 'center' }}>#</th>
                <th style={{ border: '1px solid #ddd', padding: '10px 8px', fontWeight: '600', width: '15%' }}>Date</th>
                <th style={{ border: '1px solid #ddd', padding: '10px 8px', fontWeight: '600', width: '25%' }}>Name</th>
                <th style={{ border: '1px solid #ddd', padding: '10px 8px', fontWeight: '600', width: '20%' }}>Account</th>
                <th style={{ border: '1px solid #ddd', padding: '10px 8px', fontWeight: '600', width: '12%', textAlign: 'center' }}>Type</th>
                <th style={{ border: '1px solid #ddd', padding: '10px 8px', fontWeight: '600', width: '15%', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {results.transactions.map((t, index) => (
                <tr key={t.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', color: '#666' }}>{index + 1}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{format(new Date(t.date), 'dd-MMM-yyyy')}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{t.name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '10px' }}>{ACCOUNT_LABELS[t.account]}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', fontSize: '10px', fontWeight: '500' }}>
                    <span style={{
                      backgroundColor: t.type === 'INCOME' ? '#e8f5e9' : '#ffebee',
                      color: t.type === 'INCOME' ? '#2e7d32' : '#c62828',
                      padding: '2px 8px',
                      borderRadius: '3px'
                    }}>
                      {t.type}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', color: t.type === 'INCOME' ? '#16a34a' : '#dc2626', fontWeight: '500' }}>
                    ₹{formatCurrency(Number(t.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            <table style={{ width: '100%', fontSize: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '5px 0', color: '#555' }}><strong>Total Income:</strong></td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>₹{formatCurrency(results.totalIncome)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '5px 0', color: '#555' }}><strong>Total Expense:</strong></td>
                  <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: '600' }}>₹{formatCurrency(results.totalExpense)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #333' }}>
                  <td style={{ padding: '10px 0 5px 0', fontSize: '14px' }}><strong>Net Balance:</strong></td>
                  <td style={{ textAlign: 'right', fontSize: '16px', fontWeight: 'bold', color: results.totalBalance >= 0 ? '#16a34a' : '#dc2626', padding: '10px 0 5px 0' }}>
                    ₹{formatCurrency(Math.abs(results.totalBalance))}
                    {results.totalBalance < 0 && ' (Due)'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '40px', paddingTop: '15px', borderTop: '1px solid #ddd', fontSize: '9px', color: '#888', textAlign: 'center' }}>
            <p>This is a computer-generated statement and does not require a signature.</p>
            <p style={{ marginTop: '5px' }}>For any queries, please contact us at pbgaydhane@gmail.com or +917030847030</p>
          </div>
        </div>
      )}

      {/* Screen content */}
      <ProtectedLayout>
        <div className="space-y-6 screen-only">
          <h1 className="text-3xl font-bold">Advanced Search</h1>

          <Card>
            <CardHeader>
              <CardTitle>Search Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer/Vendor Name (Optional)</Label>
                  <Select value={selectedName} onValueChange={setSelectedName}>
                    <SelectTrigger>
                      <SelectValue placeholder="All names" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All names</SelectItem>
                      {names.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Account (Optional)</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="All accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All accounts</SelectItem>
                      {Object.entries(ACCOUNT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Transaction Type (Optional)</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All types</SelectItem>
                      <SelectItem value="INCOME">Income</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">From Date (Optional)</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">To Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSearch}
                  disabled={searching}
                  className="flex-1"
                >
                  <SearchIcon className="h-4 w-4 mr-2" />
                  {searching ? 'Searching...' : 'Search'}
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  disabled={searching}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {results && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Search Results</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Found {results.transactions.length} transaction(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handlePrint}
                      variant="outline"
                      size="sm"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-semibold">#</th>
                          <th className="text-left p-3 font-semibold">Date</th>
                          <th className="text-left p-3 font-semibold">Name</th>
                          <th className="text-left p-3 font-semibold">Account</th>
                          <th className="text-center p-3 font-semibold">Type</th>
                          <th className="text-right p-3 font-semibold">Amount</th>
                          {isAdmin && (
                            <th className="text-center p-3 font-semibold">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {results.transactions.map((t, index) => (
                          <tr key={t.id} className="border-b">
                            <td className="p-3">{index + 1}</td>
                            <td className="p-3">
                              {format(new Date(t.date), 'dd-MMM-yyyy')}
                            </td>
                            <td className="p-3">{t.name}</td>
                            <td className="p-3">{ACCOUNT_LABELS[t.account]}</td>
                            <td className="text-center p-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                t.type === 'INCOME'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {t.type}
                              </span>
                            </td>
                            <td className={`text-right p-3 font-medium ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{formatCurrency(Number(t.amount))}
                            </td>
                            {isAdmin && (
                              <td className="text-center p-3">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(t)}
                                    className="h-8 w-8"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(t.id)}
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Income:</span>
                      <span className="font-semibold text-green-600">
                        ₹{formatCurrency(results.totalIncome)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Expense:</span>
                      <span className="font-semibold text-red-600">
                        ₹{formatCurrency(results.totalExpense)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Net Balance:</span>
                      <span className={results.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ₹{formatCurrency(Math.abs(results.totalBalance))}
                        {results.totalBalance < 0 && ' (Due)'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <AddExpenseForm
          open={showAddForm}
          onClose={() => {
            setShowAddForm(false)
            setEditingTransaction(null)
          }}
          onSuccess={() => handleSearch()}
          uniqueNames={names}
          editTransaction={editingTransaction}
        />
      </ProtectedLayout>
    </>
  )
}
