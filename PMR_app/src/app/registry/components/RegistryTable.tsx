'use client'

import { useState } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  RegistryPaymentStatus,
  RegistryTransactionType,
  REGISTRY_STATUS_LABELS,
  REGISTRY_TYPE_LABELS,
  REGISTRY_STATUS_COLORS,
  type RegistryTransaction,
  type RegistryPagination,
} from '@/types'
import { Edit, Trash2, Eye, Search, X } from 'lucide-react'
import { format } from 'date-fns'

interface RegistryTableProps {
  transactions: RegistryTransaction[]
  pagination: RegistryPagination
  isAdmin: boolean
  onEdit: (transaction: RegistryTransaction) => void
  onDelete: (id: string) => void
  onView: (transaction: RegistryTransaction) => void
  onFilterChange: (filters: FilterState) => void
  onPageChange: (page: number) => void
}

export interface FilterState {
  startDate?: string
  endDate?: string
  paymentStatus?: RegistryPaymentStatus | ''
  transactionType?: RegistryTransactionType | ''
  location?: string
  seller?: string
  buyer?: string
}

export function RegistryTable({
  transactions,
  pagination,
  isAdmin,
  onEdit,
  onDelete,
  onView,
  onFilterChange,
  onPageChange,
}: RegistryTableProps) {
  const [filters, setFilters] = useState<FilterState>({})
  const [showFilters, setShowFilters] = useState(false)

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
  }

  const applyFilters = () => {
    onFilterChange(filters)
  }

  const clearFilters = () => {
    const emptyFilters: FilterState = {}
    setFilters(emptyFilters)
    onFilterChange(emptyFilters)
  }

  const handleDelete = (id: string, transactionId: string) => {
    if (confirm(`Are you sure you want to delete transaction ${transactionId}?`)) {
      onDelete(id)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Search className="h-4 w-4" />
            Filters
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>

              {/* Payment Status */}
              <div>
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select
                  value={filters.paymentStatus || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange('paymentStatus', value === 'all' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(REGISTRY_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction Type */}
              <div>
                <Label htmlFor="transactionType">Transaction Type</Label>
                <Select
                  value={filters.transactionType || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange('transactionType', value === 'all' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(REGISTRY_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Search */}
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Search location..."
                  value={filters.location || ''}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                />
              </div>

              {/* Seller Search */}
              <div>
                <Label htmlFor="seller">Seller</Label>
                <Input
                  id="seller"
                  placeholder="Search seller..."
                  value={filters.seller || ''}
                  onChange={(e) => handleFilterChange('seller', e.target.value)}
                />
              </div>

              {/* Buyer Search */}
              <div>
                <Label htmlFor="buyer">Buyer</Label>
                <Input
                  id="buyer"
                  placeholder="Search buyer..."
                  value={filters.buyer || ''}
                  onChange={(e) => handleFilterChange('buyer', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={applyFilters}>Apply Filters</Button>
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Txn ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Seller → Buyer</TableHead>
                <TableHead className="text-right">Property Value</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No registry transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.transactionId}</TableCell>
                    <TableCell>{format(new Date(transaction.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{transaction.propertyLocation}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{transaction.sellerName}</div>
                        <div className="text-gray-500">→ {transaction.buyerName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{transaction.propertyValue.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-mono font-semibold ${
                          transaction.amountProfit >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {transaction.amountProfit >= 0 ? '+' : ''}
                        ₹{transaction.amountProfit.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          REGISTRY_STATUS_COLORS[transaction.paymentStatus]
                        }`}
                      >
                        {REGISTRY_STATUS_LABELS[transaction.paymentStatus]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(transaction)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(transaction)}
                          title="Edit Transaction"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(transaction.id, transaction.transactionId)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete Transaction"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {transactions.length} of {pagination.total} transactions
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={pagination.page === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
