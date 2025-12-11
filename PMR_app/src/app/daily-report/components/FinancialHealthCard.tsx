import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { MetricCard, MetricValue, MetricBadge } from './MetricCard'
import { FinancialMetrics, ACCOUNT_LABELS } from '@/types'

interface FinancialHealthCardProps {
  financial: FinancialMetrics
}

export function FinancialHealthCard({ financial }: FinancialHealthCardProps) {
  const netColor = financial.netProfit >= 0 ? 'text-green-600' : 'text-red-600'

  return (
    <MetricCard
      title="Financial Health"
      icon={DollarSign}
      iconColor="bg-blue-500"
      className="border-l-4 border-blue-500"
    >
      {/* Net Profit/Loss */}
      <MetricValue
        label="Net Profit/Loss"
        value={`₹${Math.abs(financial.netProfit).toLocaleString('en-IN')}`}
        trend={financial.comparison.netTrend}
        valueColor={netColor}
      />

      {/* Income and Expense */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="h-3 w-3 text-green-600" />
            <p className="text-xs text-gray-500">Income</p>
          </div>
          <p className="text-lg font-semibold text-green-600">
            ₹{financial.totalIncome.toLocaleString('en-IN')}
          </p>
          {financial.comparison.incomeTrend !== 0 && (
            <p
              className={`text-xs ${
                financial.comparison.incomeTrend > 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {financial.comparison.incomeTrend > 0 ? '↑' : '↓'}{' '}
              {Math.abs(financial.comparison.incomeTrend).toFixed(1)}%
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="h-3 w-3 text-red-600" />
            <p className="text-xs text-gray-500">Expense</p>
          </div>
          <p className="text-lg font-semibold text-red-600">
            ₹{financial.totalExpense.toLocaleString('en-IN')}
          </p>
          {financial.comparison.expenseTrend !== 0 && (
            <p
              className={`text-xs ${
                financial.comparison.expenseTrend > 0
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}
            >
              {financial.comparison.expenseTrend > 0 ? '↑' : '↓'}{' '}
              {Math.abs(financial.comparison.expenseTrend).toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {/* Transaction Count & Top Account */}
      <div className="flex flex-wrap gap-2 pt-2">
        <MetricBadge
          label="Transactions"
          value={financial.transactionCount}
          color="bg-blue-100"
        />
        {financial.topAccount && (
          <MetricBadge
            label="Top Account"
            value={ACCOUNT_LABELS[financial.topAccount.account]}
            color="bg-purple-100"
          />
        )}
      </div>
    </MetricCard>
  )
}
