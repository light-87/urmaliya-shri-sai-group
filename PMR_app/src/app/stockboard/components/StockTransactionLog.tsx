import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { STOCK_TYPE_LABELS, STOCK_CATEGORY_LABELS } from '@/types'
import type { StockTransaction } from '@/types'
import { ArrowUp, ArrowDown, Factory, Package, TrendingDown } from 'lucide-react'

interface StockTransactionLogProps {
  transactions: StockTransaction[]
  onRefresh: () => void
}

export function StockTransactionLog({ transactions }: StockTransactionLogProps) {
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

  // Group production batch transactions
  const groupedTransactions: Array<StockTransaction | StockTransaction[]> = []
  let i = 0
  while (i < filteredTransactions.length) {
    const current = filteredTransactions[i]

    // Check if this is a production batch
    if (current.type === 'PRODUCE_BATCH') {
      // Find related transactions (same date and type)
      const batchGroup = [current]
      let j = i + 1

      // Look ahead for the next 2 transactions (should be same date and PRODUCE_BATCH)
      while (j < filteredTransactions.length && j < i + 3) {
        const next = filteredTransactions[j]
        if (next.type === 'PRODUCE_BATCH' &&
            new Date(next.date).getTime() === new Date(current.date).getTime() &&
            new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime() < 1000) {
          batchGroup.push(next)
          j++
        } else {
          break
        }
      }

      // If we found a group of 3 (UREA, FREE_DEF, FINISHED_GOODS), group them
      if (batchGroup.length === 3) {
        groupedTransactions.push(batchGroup)
        i = j
      } else {
        groupedTransactions.push(current)
        i++
      }
    } else {
      groupedTransactions.push(current)
      i++
    }
  }

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
                const finishedGoodsTransaction = item.find(t => t.category === 'FINISHED_GOODS')

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
                        <div className="font-medium text-purple-900">Production Batch</div>
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
                          {finishedGoodsTransaction && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Finished Goods:</span>
                              <span className="font-semibold text-green-600">
                                +{finishedGoodsTransaction.quantity.toFixed(1)} {finishedGoodsTransaction.unit}
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
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`font-semibold ${transaction.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.quantity >= 0 ? '+' : ''}{transaction.quantity.toFixed(1)} {transaction.unit}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Balance: {transaction.runningTotal.toFixed(1)} {transaction.unit}
                    </p>
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
