'use client'

import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ACCOUNT_LABELS } from '@/types'
import type { ExpenseTransaction, ExpensePagination } from '@/types'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface ExpenseTableProps {
  transactions: ExpenseTransaction[]
  pagination: ExpensePagination
  isAdmin: boolean
  onEdit: (transaction: ExpenseTransaction) => void
  onDelete: (id: string) => void
  onPageChange: (page: number) => void
}

export function ExpenseTable({
  transactions,
  pagination,
  isAdmin,
  onEdit,
  onDelete,
  onPageChange,
}: ExpenseTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-semibold">Date</th>
                <th className="text-right p-3 font-semibold">Amount</th>
                <th className="text-left p-3 font-semibold">Account</th>
                <th className="text-center p-3 font-semibold">Type</th>
                <th className="text-left p-3 font-semibold">Name</th>
                <th className="text-left p-3 font-semibold">Description</th>
                {isAdmin && (
                  <th className="text-center p-3 font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="text-center p-6 text-muted-foreground"
                  >
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b hover:bg-muted/30"
                  >
                    <td className="p-3">
                      {format(new Date(transaction.date), 'dd-MMM-yyyy')}
                    </td>
                    <td className={cn(
                      'text-right p-3 font-medium',
                      transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                    )}>
                      {formatCurrency(Number(transaction.amount))}
                    </td>
                    <td className="p-3">
                      {ACCOUNT_LABELS[transaction.account]}
                    </td>
                    <td className="text-center p-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          transaction.type === 'INCOME'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        )}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td className="p-3">{transaction.name}</td>
                    <td className="p-3 text-muted-foreground text-sm max-w-xs truncate">
                      {transaction.description || '-'}
                    </td>
                    {isAdmin && (
                      <td className="text-center p-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(transaction)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(transaction.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={pagination.page === 1}
                onClick={() => onPageChange(pagination.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => onPageChange(pagination.page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
