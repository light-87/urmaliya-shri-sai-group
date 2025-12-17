'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { TrendingUp, TrendingDown, DollarSign, FileText, AlertCircle, BarChart3 } from 'lucide-react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DashboardData {
  period: string
  dateRange: {
    from: string
    to: string
  }
  summary: {
    totalTransactions: number
    totalPropertyValue: number
    totalProfit: number
    totalIncome: number
    totalExpenses: number
    pendingPayments: number
    operationalExpenses: number
    operationalIncome: number
    netProfit: number
    avgPropertyValue: number
    avgProfit: number
  }
  paymentStatusBreakdown: Record<string, { count: number; amount: number }>
  transactionTypeBreakdown: Record<string, { count: number; value: number; profit: number }>
  topLocations: Record<string, { count: number; value: number; profit: number }>
  monthlyTrend: Record<string, { transactions: number; profit: number; revenue: number }>
  recentTransactions: Array<{
    id: string
    transactionId: string
    date: string
    propertyLocation: string
    sellerName: string
    buyerName: string
    propertyValue: number
    amountProfit: number
    paymentStatus: string
  }>
}

export default function RegistryDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [period, setPeriod] = useState('current_month')

  useEffect(() => {
    fetchDashboard()
  }, [period])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/registry/dashboard?period=${period}`)
      const data = await response.json()

      if (data.success) {
        setDashboard(data.dashboard)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      alert('Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !dashboard) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto p-6">
          <p>Loading dashboard...</p>
        </div>
      </ProtectedLayout>
    )
  }

  const { summary } = dashboard

  return (
    <ProtectedLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Registry Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of registry operations and financial metrics
          </p>
        </div>
        <div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="last_6_months">Last 6 Months</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date Range */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Period: {format(new Date(dashboard.dateRange.from), 'dd MMM yyyy')} -{' '}
            {format(new Date(dashboard.dateRange.to), 'dd MMM yyyy')}
          </p>
        </CardContent>
      </Card>

      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalTransactions}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: ₹{summary.avgPropertyValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} per property
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Property Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ₹{summary.totalPropertyValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total value of all properties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Profit
            </CardTitle>
            {summary.totalProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{summary.totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: ₹{summary.avgProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })} per transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Payments
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              ₹{summary.pendingPayments.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Outstanding balance due
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              Operational Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              ₹{summary.operationalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{summary.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              After operational costs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status and Transaction Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Payment Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(dashboard.paymentStatusBreakdown).map(([status, data]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        status === 'Paid'
                          ? 'bg-green-100 text-green-800'
                          : status === 'Pending'
                          ? 'bg-orange-100 text-orange-800'
                          : status === 'Partial'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {status}
                    </span>
                    <span className="text-sm text-muted-foreground">({data.count})</span>
                  </div>
                  <span className="text-sm font-medium">
                    ₹{data.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(dashboard.transactionTypeBreakdown)
                .slice(0, 5)
                .map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{type}</span>
                      <span className="text-xs text-muted-foreground">({data.count})</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        ₹{data.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                      <div className={`text-xs ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Profit: ₹{data.profit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Locations */}
      <Card>
        <CardHeader>
          <CardTitle>Top Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Total Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(dashboard.topLocations).map(([location, data]) => (
                <TableRow key={location}>
                  <TableCell className="font-medium">{location}</TableCell>
                  <TableCell className="text-right">{data.count}</TableCell>
                  <TableCell className="text-right">
                    ₹{data.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className={`text-right ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{data.profit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
              {Object.keys(dashboard.topLocations).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No location data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monthly Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(dashboard.monthlyTrend).map(([month, data]) => (
              <div key={month} className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">{month}</span>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Txns: </span>
                    <span className="font-medium">{data.transactions}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Revenue: </span>
                    <span className="font-medium text-green-600">
                      ₹{data.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profit: </span>
                    <span className={`font-medium ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{data.profit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Seller → Buyer</TableHead>
                <TableHead className="text-right">Property Value</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.recentTransactions.map((txn) => (
                <TableRow
                  key={txn.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/registry`)}
                >
                  <TableCell className="font-mono text-sm">{txn.transactionId}</TableCell>
                  <TableCell>{format(new Date(txn.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{txn.propertyLocation}</TableCell>
                  <TableCell className="text-sm">
                    {txn.sellerName} → {txn.buyerName}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{Number(txn.propertyValue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className={`text-right ${Number(txn.amountProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{Number(txn.amountProfit).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        txn.paymentStatus === 'Paid'
                          ? 'bg-green-100 text-green-800'
                          : txn.paymentStatus === 'Pending'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {txn.paymentStatus}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {dashboard.recentTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No recent transactions
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </ProtectedLayout>
  )
}
