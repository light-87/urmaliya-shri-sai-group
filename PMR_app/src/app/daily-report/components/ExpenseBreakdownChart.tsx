import { Card } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { FinancialMetrics, ACCOUNT_LABELS } from '@/types'

interface ExpenseBreakdownChartProps {
  financial: FinancialMetrics
}

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#6366F1', // Indigo
  '#EC4899', // Pink
]

export function ExpenseBreakdownChart({ financial }: ExpenseBreakdownChartProps) {
  // Prepare data for pie chart
  const chartData = financial.accountBreakdown
    .filter((item) => item.income + item.expense > 0)
    .map((item) => ({
      name: ACCOUNT_LABELS[item.account],
      value: item.income + item.expense,
      income: item.income,
      expense: item.expense,
    }))
    .sort((a, b) => b.value - a.value)

  const hasData = chartData.length > 0

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-green-600">
            Income: ₹{data.income.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-red-600">
            Expense: ₹{data.expense.toLocaleString('en-IN')}
          </p>
          <p className="text-sm font-semibold text-gray-900 border-t mt-1 pt-1">
            Total: ₹{data.value.toLocaleString('en-IN')}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Expense Breakdown</h3>
        <p className="text-sm text-gray-500">Activity by account</p>
      </div>

      {hasData ? (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Total Income</p>
              <p className="text-lg font-semibold text-green-600">
                ₹{financial.totalIncome.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Expense</p>
              <p className="text-lg font-semibold text-red-600">
                ₹{financial.totalExpense.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-gray-500 text-sm">No financial activity today</p>
        </div>
      )}
    </Card>
  )
}
