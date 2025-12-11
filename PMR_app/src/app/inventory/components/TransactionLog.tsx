'use client'

import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BUCKET_TYPE_LABELS, WAREHOUSE_LABELS } from '@/types'
import type { InventoryTransaction } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TransactionLogProps {
  transactions: InventoryTransaction[]
  isAdmin: boolean
  onEdit: (transaction: InventoryTransaction) => void
  onDelete: (id: string) => void
}

export function TransactionLog({
  transactions,
  isAdmin,
  onEdit,
  onDelete,
}: TransactionLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-semibold">Date</th>
                <th className="text-left p-3 font-semibold">Warehouse</th>
                <th className="text-left p-3 font-semibold">Bucket Type</th>
                <th className="text-center p-3 font-semibold">Action</th>
                <th className="text-center p-3 font-semibold">Quantity</th>
                <th className="text-left p-3 font-semibold">Buyer/Seller</th>
                <th className="text-center p-3 font-semibold">Running Total</th>
                {isAdmin && (
                  <th className="text-center p-3 font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="text-center p-6 text-muted-foreground"
                  >
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={cn(
                      'border-b hover:bg-muted/30',
                      transaction.action === 'STOCK'
                        ? 'bg-green-50/50'
                        : 'bg-red-50/50'
                    )}
                  >
                    <td className="p-3">
                      {format(new Date(transaction.date), 'dd-MMM-yyyy')}
                    </td>
                    <td className="p-3">
                      {WAREHOUSE_LABELS[transaction.warehouse]}
                    </td>
                    <td className="p-3">
                      {BUCKET_TYPE_LABELS[transaction.bucketType]}
                    </td>
                    <td className="text-center p-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          transaction.action === 'STOCK'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        )}
                      >
                        {transaction.action}
                      </span>
                    </td>
                    <td className="text-center p-3 font-medium">
                      {Math.abs(transaction.quantity)}
                    </td>
                    <td className="p-3">{transaction.buyerSeller}</td>
                    <td className="text-center p-3 font-semibold">
                      {transaction.runningTotal}
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
      </CardContent>
    </Card>
  )
}
