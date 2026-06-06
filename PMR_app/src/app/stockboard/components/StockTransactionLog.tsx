import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { STOCK_TYPE_LABELS, STOCK_CATEGORY_LABELS } from '@/types'
import type { StockTransaction } from '@/types'
import { ArrowUp, ArrowDown, Factory, Package, TrendingDown, Pencil, Trash2 } from 'lucide-react'

interface StockTransactionLogProps {
  transactions: StockTransaction[]
  isAdmin: boolean
  onDelete: (id: string, label: string) => void
  onEditUrea: (transaction: StockTransaction) => void
  onEditBatch: (group: StockTransaction[]) => void
}

export function StockTransactionLog({
  transactions,
  isAdmin,
  onDelete,
  onEditUrea,
  onEditBatch,
}: StockTransactionLogProps) {
  // Filter out SELL_FREE_DEF transactions (they appear in Inventory page instead)
  const filteredTransactions = transactions.filter(t => t.type !== 'SELL_FREE_DEF')

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'ADD_UREA':
        return 'text-green-600 bg-green-50'
      case 'PRODUCE_BATCH':
        return 'text-purple-600 bg-purple-50'
      case 'FILL_BUCKETS':
        return 'text-blue-600 bg-blue-50'
      case 'SELL_FREE_DEF':
      case 'SELL_BUCKETS':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'ADD_UREA':
        return <ArrowUp className="h-4 w-4" />
      case 'PRODUCE_BATCH':
        return <Factory className="h-4 w-4" />
      case 'FILL_BUCKETS':
        return <Package className="h-4 w-4" />
      case 'SELL_FREE_DEF':
      case 'SELL_BUCKETS':
        return <TrendingDown className="h-4 w-4" />
      default:
        return <ArrowDown className="h-4 w-4" />
    }
  }

  // Group production batch transactions.
  // Each production writes exactly 2 adjacent rows (UREA - and FREE_DEF +)
  // sharing the same date. Pair a row strictly with its immediate neighbour
  // when the categories complement each other — this stays correct when
  // several productions share one date (each becomes its own card).
  // NOTE: the DELETE handler in api/stock/[id]/route.ts pairs legs with this
  // same walk — keep the two in sync.
  const groupedTransactions: Array<StockTransaction | StockTransaction[]> = []
  let i = 0
  while (i < filteredTransactions.length) {
    const current = filteredTransactions[i]
    const next = filteredTransactions[i + 1]

    const isProductionPair =
      current.type === 'PRODUCE_BATCH' &&
      next?.type === 'PRODUCE_BATCH' &&
      new Date(next.date).getTime() === new Date(current.date).getTime() &&
      ((current.category === 'UREA' && next.category === 'FREE_DEF') ||
        (current.category === 'FREE_DEF' && next.category === 'UREA'))

    if (isProductionPair) {
      groupedTransactions.push([current, next])
      i += 2
    } else {
      groupedTransactions.push(current)
      i++
    }
  }

  // Only transactions created from this page are editable here. Bucket
  // transactions mirror inventory entries and must be managed from the
  // Inventory page so both tables stay in sync.
  const isManagedFromInventory = (type: string) =>
    type === 'FILL_BUCKETS' || type === 'SELL_BUCKETS' || type === 'RETURN_BUCKETS'

  return (
    <Card>
      <CardHeader>
        <CardTitle>📝 Stock Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {groupedTransactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No transactions yet. Start by adding Urea or producing a batch.
          </p>
        ) : (
          <div className="space-y-3">
            {groupedTransactions.map((item, idx) => {
              // Production batch group
              if (Array.isArray(item)) {
                const ureaTransaction = item.find(t => t.category === 'UREA')
                const freeDEFTransaction = item.find(t => t.category === 'FREE_DEF')

                return (
                  <div
                    key={`batch-${idx}`}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors bg-purple-50/50"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-full text-purple-600 bg-purple-100">
                        <Factory className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-purple-900">Production Batch</div>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEditBatch(item)}
                                className="h-11 w-11"
                                aria-label="Edit production batch"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  onDelete(
                                    ureaTransaction?.id || item[0].id,
                                    `production batch of ${format(new Date(item[0].date), 'MMM dd, yyyy')} (both Urea and Free DEF entries)`
                                  )
                                }
                                className="h-11 w-11 text-destructive hover:text-destructive"
                                aria-label="Delete production batch"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(item[0].date), 'MMM dd, yyyy')}
                        </p>
                        <div className="mt-3 space-y-2 text-sm">
                          {ureaTransaction && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Urea Used:</span>
                              <span className="font-semibold text-red-600">
                                {ureaTransaction.quantity.toFixed(1)} {ureaTransaction.unit}
                              </span>
                            </div>
                          )}
                          {freeDEFTransaction && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Free DEF Produced:</span>
                              <span className="font-semibold text-green-600">
                                +{freeDEFTransaction.quantity.toFixed(1)} {freeDEFTransaction.unit}
                              </span>
                            </div>
                          )}
                          {ureaTransaction && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Urea Balance:</span>
                              <span className="font-medium">
                                {ureaTransaction.runningTotal.toFixed(1)} {ureaTransaction.unit}
                              </span>
                            </div>
                          )}
                          {freeDEFTransaction && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Free DEF Balance:</span>
                              <span className="font-medium">
                                {freeDEFTransaction.runningTotal.toFixed(1)} {freeDEFTransaction.unit}
                              </span>
                            </div>
                          )}
                        </div>
                        {ureaTransaction?.description && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {ureaTransaction.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }

              // Regular transaction
              const transaction = item
              return (
                <div
                  key={transaction.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-2 rounded-full ${getTransactionColor(transaction.type)}`}>
                      {getIcon(transaction.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {STOCK_TYPE_LABELS[transaction.type]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {STOCK_CATEGORY_LABELS[transaction.category]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {transaction.description || 'No description'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(transaction.date), 'MMM dd, yyyy')}
                      </p>
                      {isAdmin && isManagedFromInventory(transaction.type) && (
                        <p className="text-xs text-muted-foreground/70 mt-1 italic">
                          Managed from Inventory page
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`font-semibold ${transaction.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.quantity >= 0 ? '+' : ''}{transaction.quantity.toFixed(1)} {transaction.unit}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Balance: {transaction.runningTotal.toFixed(1)} {transaction.unit}
                    </p>
                    {isAdmin && transaction.type === 'ADD_UREA' && (
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditUrea(transaction)}
                          className="h-11 w-11"
                          aria-label="Edit transaction"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            onDelete(
                              transaction.id,
                              `${STOCK_TYPE_LABELS[transaction.type]} of ${format(new Date(transaction.date), 'MMM dd, yyyy')} (${transaction.quantity >= 0 ? '+' : ''}${transaction.quantity.toFixed(1)} ${transaction.unit})`
                            )
                          }
                          className="h-11 w-11 text-destructive hover:text-destructive"
                          aria-label="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {isAdmin && transaction.type === 'PRODUCE_BATCH' && (
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            onDelete(
                              transaction.id,
                              `unpaired production entry of ${format(new Date(transaction.date), 'MMM dd, yyyy')} (${transaction.quantity >= 0 ? '+' : ''}${transaction.quantity.toFixed(1)} ${transaction.unit})`
                            )
                          }
                          className="h-11 w-11 text-destructive hover:text-destructive"
                          aria-label="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
