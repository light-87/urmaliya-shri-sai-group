import {
  Activity,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  XCircle,
} from 'lucide-react'
import { MetricCard, MetricValue, MetricBadge, ProgressBar } from './MetricCard'
import { HealthMetrics } from '@/types'

interface OverallHealthCardProps {
  health: HealthMetrics
}

export function OverallHealthCard({ health }: OverallHealthCardProps) {
  const getStatusConfig = (status: HealthMetrics['status']) => {
    switch (status) {
      case 'EXCELLENT':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'Excellent',
        }
      case 'GOOD':
        return {
          icon: CheckCircle,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          label: 'Good',
        }
      case 'ATTENTION_NEEDED':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          label: 'Attention Needed',
        }
      case 'CRITICAL':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: 'Critical',
        }
    }
  }

  const statusConfig = getStatusConfig(health.status)
  const StatusIcon = statusConfig.icon

  const scoreColor =
    health.overallScore >= 80
      ? 'bg-green-500'
      : health.overallScore >= 60
      ? 'bg-blue-500'
      : health.overallScore >= 40
      ? 'bg-yellow-500'
      : 'bg-red-500'

  return (
    <MetricCard
      title="Overall Health"
      icon={Activity}
      iconColor="bg-orange-500"
      className="border-l-4 border-orange-500"
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${statusConfig.bgColor}`}>
          <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
          <span className={`font-semibold ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Overall Score */}
      <div className="pt-2">
        <ProgressBar
          value={health.overallScore}
          max={100}
          color={scoreColor}
          showPercentage={true}
          label="Health Score"
        />
      </div>

      {/* Operational Efficiency */}
      <MetricValue
        label="Operational Efficiency"
        value={`${health.operationalEfficiency.toFixed(1)}%`}
        valueColor="text-gray-900"
      />

      {/* Alerts Count & Total Activities */}
      <div className="flex flex-wrap gap-2 pt-2">
        {health.alerts.length > 0 && (
          <MetricBadge
            label="Alerts"
            value={health.alerts.length}
            color={
              health.alerts.some((a) => a.severity === 'HIGH')
                ? 'bg-red-100'
                : 'bg-yellow-100'
            }
          />
        )}
        <MetricBadge
          label="Activities"
          value={health.totalActivities}
          color="bg-gray-100"
        />
      </div>

      {/* Alerts List */}
      {health.alerts.length > 0 && (
        <div className="pt-2 border-t space-y-2">
          {health.alerts.slice(0, 2).map((alert, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 p-2 rounded ${
                alert.severity === 'HIGH'
                  ? 'bg-red-50'
                  : alert.severity === 'MEDIUM'
                  ? 'bg-yellow-50'
                  : 'bg-blue-50'
              }`}
            >
              <AlertCircle
                className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                  alert.severity === 'HIGH'
                    ? 'text-red-600'
                    : alert.severity === 'MEDIUM'
                    ? 'text-yellow-600'
                    : 'text-blue-600'
                }`}
              />
              <p className="text-xs text-gray-700">{alert.message}</p>
            </div>
          ))}
          {health.alerts.length > 2 && (
            <p className="text-xs text-gray-500 text-center">
              +{health.alerts.length - 2} more alert{health.alerts.length - 2 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </MetricCard>
  )
}
