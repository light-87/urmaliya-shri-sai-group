'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface MonthlyData {
  month: string
  income: number
  expense: number
}

interface MonthlyBarChartProps {
  data: MonthlyData[]
}

export function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Income vs Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis
                fontSize={12}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [`₹${formatCurrency(value)}`, '']}
              />
              <Legend />
              <Bar dataKey="income" fill="#22c55e" name="Income" />
              <Bar dataKey="expense" fill="#ef4444" name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
