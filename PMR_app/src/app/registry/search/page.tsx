'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Search, Download, Filter, X } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { RegistryTransactionType, PaymentStatus } from '@/types'

interface SearchFilters {
  dateFrom: string
  dateTo: string
  seller: string
  buyer: string
  location: string
  transactionType: string
  paymentStatus: string
  minPropertyValue: string
  maxPropertyValue: string
}

interface RegistryTransaction {
  id: string
  transaction_id: string
  date: string
  property_location: string
  seller_name: string
  buyer_name: string
  transaction_type: RegistryTransactionType
  property_value: number
  amount_profit: number
  payment_status: PaymentStatus
  balance_due: number
  total_expenses: number
  credit_received: number
}

export default function RegistrySearchPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RegistryTransaction[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [showFilters, setShowFilters] = useState(true)

  const [filters, setFilters] = useState<SearchFilters>({
    dateFrom: '',
    dateTo: '',
    seller: '',
    buyer: '',
    location: '',
    transactionType: 'ALL',
    paymentStatus: 'ALL',
    minPropertyValue: '',
    maxPropertyValue: '',
  })

  const handleSearch = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.seller) params.append('seller', filters.seller)
      if (filters.buyer) params.append('buyer', filters.buyer)
      if (filters.location) params.append('location', filters.location)
      if (filters.transactionType !== 'ALL') params.append('transactionType', filters.transactionType)
      if (filters.paymentStatus !== 'ALL') params.append('paymentStatus', filters.paymentStatus)
      if (filters.minPropertyValue) params.append('minPropertyValue', filters.minPropertyValue)
      if (filters.maxPropertyValue) params.append('maxPropertyValue', filters.maxPropertyValue)

      const response = await fetch(`/api/registry?${params}`)
      const data = await response.json()

      if (data.success) {
        setResults(data.transactions)
        setTotalResults(data.pagination?.total || data.transactions.length)

        toast({
          title: 'Search Complete',
          description: `Found ${data.transactions.length} transaction(s)`,
        })
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to search transactions',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      seller: '',
      buyer: '',
      location: '',
      transactionType: 'ALL',
      paymentStatus: 'ALL',
      minPropertyValue: '',
      maxPropertyValue: '',
    })
    setResults([])
    setTotalResults(0)
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    toast({
      title: 'Info',
      description: 'Export feature coming soon',
    })
  }

  const handleViewTransaction = (id: string) => {
    router.push(`/registry?view=${id}`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Registry Search</h1>
          <p className="text-muted-foreground">
            Advanced search for registry transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
          {results.length > 0 && (
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Search Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Search Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  />
                </div>
                <div>
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  />
                </div>
              </div>

              {/* Party Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Seller Name</Label>
                  <Input
                    type="text"
                    placeholder="Search by seller name"
                    value={filters.seller}
                    onChange={(e) => setFilters({ ...filters, seller: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Buyer Name</Label>
                  <Input
                    type="text"
                    placeholder="Search by buyer name"
                    value={filters.buyer}
                    onChange={(e) => setFilters({ ...filters, buyer: e.target.value })}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <Label>Property Location</Label>
                <Input
                  type="text"
                  placeholder="Search by property location"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                />
              </div>

              {/* Transaction Type and Payment Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Transaction Type</Label>
                  <Select
                    value={filters.transactionType}
                    onValueChange={(value) => setFilters({ ...filters, transactionType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="Sale Deed">Sale Deed</SelectItem>
                      <SelectItem value="Gift Deed">Gift Deed</SelectItem>
                      <SelectItem value="Lease Deed">Lease Deed</SelectItem>
                      <SelectItem value="Mortgage Deed">Mortgage Deed</SelectItem>
                      <SelectItem value="Power of Attorney">Power of Attorney</SelectItem>
                      <SelectItem value="Agreement to Sell">Agreement to Sell</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Select
                    value={filters.paymentStatus}
                    onValueChange={(value) => setFilters({ ...filters, paymentStatus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Property Value Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Min Property Value</Label>
                  <Input
                    type="number"
                    placeholder="Minimum value"
                    value={filters.minPropertyValue}
                    onChange={(e) => setFilters({ ...filters, minPropertyValue: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Max Property Value</Label>
                  <Input
                    type="number"
                    placeholder="Maximum value"
                    value={filters.maxPropertyValue}
                    onChange={(e) => setFilters({ ...filters, maxPropertyValue: e.target.value })}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
                <Button onClick={handleSearch} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {totalResults > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Search Results ({totalResults} transaction{totalResults !== 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Property Value</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((txn) => (
                  <TableRow
                    key={txn.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleViewTransaction(txn.id)}
                  >
                    <TableCell className="font-mono text-sm">{txn.transaction_id}</TableCell>
                    <TableCell>{format(new Date(txn.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{txn.property_location}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{txn.seller_name}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{txn.buyer_name}</TableCell>
                    <TableCell className="text-xs">{txn.transaction_type}</TableCell>
                    <TableCell className="text-right">
                      ₹{Number(txn.property_value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className={`text-right ${Number(txn.amount_profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{Number(txn.amount_profit).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          txn.payment_status === 'Paid'
                            ? 'bg-green-100 text-green-800'
                            : txn.payment_status === 'Pending'
                            ? 'bg-orange-100 text-orange-800'
                            : txn.payment_status === 'Partial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {txn.payment_status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {!loading && results.length === 0 && totalResults === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No search performed yet</h3>
            <p className="text-muted-foreground">
              Use the filters above to search for registry transactions
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
