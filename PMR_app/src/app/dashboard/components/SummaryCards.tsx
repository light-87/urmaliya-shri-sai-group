'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface SummaryCardsProps {
  totalIncome: number
  totalExpense: number
  netProfit: number
}

export function SummaryCards({ totalIncome, totalExpense, netProfit }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-green-700">
            Total Income
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-900">
            ₹{formatCurrency(totalIncome)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-red-700">
            Total Expense
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-red-900">
            ₹{formatCurrency(totalExpense)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">
            Net Profit
          </CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
            ₹{formatCurrency(Math.abs(netProfit))}
            {netProfit < 0 && ' (Loss)'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
