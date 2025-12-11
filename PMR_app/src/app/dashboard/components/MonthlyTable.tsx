'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface MonthlyData {
  month: string
  income: number
  expense: number
  net: number
}

interface MonthlyTableProps {
  data: MonthlyData[]
}

export function MonthlyTable({ data }: MonthlyTableProps) {
  // Calculate totals
  const totals = data.reduce(
    (acc, row) => ({
      income: acc.income + row.income,
      expense: acc.expense + row.expense,
      net: acc.net + row.net,
    }),
    { income: 0, expense: 0, net: 0 }
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-primary/90 text-primary-foreground">
                <th className="text-left p-3 font-semibold">Month</th>
                <th className="text-right p-3 font-semibold">Total Income</th>
                <th className="text-right p-3 font-semibold">Total Expenses</th>
                <th className="text-right p-3 font-semibold">Net Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.month}
                  className={cn(
                    'border-b',
                    row.net >= 0 ? 'bg-green-50/50' : 'bg-red-50/50'
                  )}
                >
                  <td className="p-3 font-medium">{row.month}</td>
                  <td className="text-right p-3 text-green-700">
                    ₹{formatCurrency(row.income)}
                  </td>
                  <td className="text-right p-3 text-red-700">
                    ₹{formatCurrency(row.expense)}
                  </td>
                  <td
                    className={cn(
                      'text-right p-3 font-bold',
                      row.net >= 0 ? 'text-green-900' : 'text-red-900'
                    )}
                  >
                    ₹{formatCurrency(row.net)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-bold">
                <td className="p-3">Total</td>
                <td className="text-right p-3 text-green-700">
                  ₹{formatCurrency(totals.income)}
                </td>
                <td className="text-right p-3 text-red-700">
                  ₹{formatCurrency(totals.expense)}
                </td>
                <td
                  className={cn(
                    'text-right p-3',
                    totals.net >= 0 ? 'text-green-900' : 'text-red-900'
                  )}
                >
                  ₹{formatCurrency(totals.net)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
