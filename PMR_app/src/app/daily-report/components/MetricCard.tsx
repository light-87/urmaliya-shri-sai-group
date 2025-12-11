import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  icon: LucideIcon
  iconColor: string
  children: ReactNode
  className?: string
}

export function MetricCard({
  title,
  icon: Icon,
  iconColor,
  children,
  className = '',
}: MetricCardProps) {
  return (
    <Card className={`p-6 hover:shadow-lg transition-shadow ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </Card>
  )
}

interface MetricValueProps {
  label: string
  value: string | number
  trend?: number
  valueColor?: string
  className?: string
}

export function MetricValue({
  label,
  value,
  trend,
  valueColor = 'text-gray-900',
  className = '',
}: MetricValueProps) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        {trend !== undefined && trend !== 0 && (
          <span
            className={`text-xs font-medium ${
              trend > 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

interface MetricBadgeProps {
  label: string
  value: string | number
  color?: string
}

export function MetricBadge({ label, value, color = 'bg-gray-100' }: MetricBadgeProps) {
  return (
    <div className={`px-3 py-1 rounded-full ${color} inline-flex items-center gap-2`}>
      <span className="text-xs font-medium text-gray-700">{label}:</span>
      <span className="text-xs font-bold text-gray-900">{value}</span>
    </div>
  )
}

interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  showPercentage?: boolean
  label?: string
}

export function ProgressBar({
  value,
  max = 100,
  color = 'bg-blue-500',
  showPercentage = true,
  label,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">{label}</span>
          {showPercentage && (
            <span className="text-xs font-medium text-gray-900">
              {percentage.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300 ease-in-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
