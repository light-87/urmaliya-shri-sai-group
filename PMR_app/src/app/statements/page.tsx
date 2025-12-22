'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import { ACCOUNT_LABELS } from '@/types'
import type { ExpenseTransaction } from '@/types'
import { FileText, Printer } from 'lucide-react'

export default function StatementsPage() {
  const [names, setNames] = useState<string[]>([])
  const [selectedName, setSelectedName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [allTime, setAllTime] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [statement, setStatement] = useState<{
    transactions: ExpenseTransaction[]
    totalBalance: number
  } | null>(null)

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

  const handleGenerate = async () => {
    if (!selectedName) return

    setGenerating(true)
    try {
      const params = new URLSearchParams({ name: selectedName })
      if (!allTime) {
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
      }

      const response = await fetch(`/api/statements?${params}`)
      const data = await response.json()

      if (data.success) {
        setStatement({
          transactions: data.transactions,
          totalBalance: data.totalBalance,
        })
      }
    } catch (error) {
      console.error('Failed to generate statement:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = () => {
    window.print()
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
      {statement && (
        <div id="print-content" className="print-only" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #000' }}>
            <img src="/logo.png" alt="Company Logo" style={{ maxWidth: '84px', height: 'auto' }} />
            <div style={{ textAlign: 'right', fontSize: '12px', lineHeight: '1.6' }}>
              <div><strong>Address:</strong> Shop No.05 New Collectorate Campus Rewa (M.P.)</div>
              <div><strong>Email:</strong> mail@eco-def.com</div>
              <div><strong>Phone:</strong> 8085237001</div>
            </div>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '20px 0', textAlign: 'center' }}>Customer Statement</h1>

          <div style={{ margin: '20px 0', fontSize: '14px' }}>
            <div><strong>Customer/Vendor:</strong> {selectedName}</div>
            <div><strong>Period:</strong> {allTime ? 'All time' : `${startDate || 'Beginning'} to ${endDate || 'Present'}`}</div>
            <div><strong>Generated on:</strong> {format(new Date(), 'dd-MMM-yyyy')}</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', width: '5%' }}>#</th>
                <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', width: '20%' }}>Date</th>
                <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', width: '20%', textAlign: 'right' }}>Amount</th>
                <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', width: '30%' }}>Account</th>
                <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', width: '25%', textAlign: 'center' }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {statement.transactions.map((t, index) => (
                <tr key={t.id}>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>{index + 1}</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>{format(new Date(t.date), 'dd-MMM-yyyy')}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', color: t.type === 'INCOME' ? '#16a34a' : '#dc2626' }}>
                    ₹{formatCurrency(Number(t.amount))}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>{ACCOUNT_LABELS[t.account]}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{t.type}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '30px', textAlign: 'right', fontSize: '18px', fontWeight: 'bold', color: statement.totalBalance >= 0 ? '#16a34a' : '#dc2626' }}>
            Total Balance: ₹{formatCurrency(Math.abs(statement.totalBalance))}
            {statement.totalBalance < 0 && ' (Due)'}
          </div>
        </div>
      )}

      {/* Screen content */}
      <ProtectedLayout>
        <div className="space-y-6 screen-only">
          <h1 className="text-3xl font-bold">Customer Statements</h1>

          <Card>
            <CardHeader>
              <CardTitle>Generate Statement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Customer/Vendor</Label>
                <SearchableSelect
                  options={names.map((name) => ({ value: name, label: name }))}
                  value={selectedName}
                  onValueChange={setSelectedName}
                  placeholder="Select name"
                  searchPlaceholder="Type to search names..."
                  emptyText="No names found"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    id="allTime"
                    type="checkbox"
                    checked={allTime}
                    onChange={(e) => {
                      setAllTime(e.target.checked)
                      if (e.target.checked) {
                        setStartDate('')
                        setEndDate('')
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="allTime" className="cursor-pointer">
                    All time
                  </Label>
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
                    disabled={allTime}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">To Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={allTime}
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!selectedName || generating}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                {generating ? 'Generating...' : 'Generate Statement'}
              </Button>
            </CardContent>
          </Card>

          {statement && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Statement for: {selectedName}</CardTitle>
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
                    <div className={`text-right ${statement.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <p className="text-sm text-muted-foreground">Total Balance</p>
                      <p className="text-2xl font-bold">
                        ₹{formatCurrency(Math.abs(statement.totalBalance))}
                        {statement.totalBalance < 0 && ' (Due)'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-semibold">#</th>
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-right p-3 font-semibold">Amount</th>
                        <th className="text-left p-3 font-semibold">Account</th>
                        <th className="text-center p-3 font-semibold">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.transactions.map((t, index) => (
                        <tr key={t.id} className="border-b">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3">
                            {format(new Date(t.date), 'dd-MMM-yyyy')}
                          </td>
                          <td className={`text-right p-3 ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{formatCurrency(Number(t.amount))}
                          </td>
                          <td className="p-3">{ACCOUNT_LABELS[t.account]}</td>
                          <td className="text-center p-3">{t.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ProtectedLayout>
    </>
  )
}
