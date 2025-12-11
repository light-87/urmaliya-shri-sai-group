import { Card } from '@/components/ui/card'
import {
  Trophy,
  TrendingUp,
  AlertTriangle,
  Info,
  Lightbulb,
  CheckCircle,
  Package,
  Zap,
} from 'lucide-react'
import { QuickInsight } from '@/types'

interface QuickInsightsProps {
  insights: QuickInsight[]
}

const iconMap: Record<string, any> = {
  trophy: Trophy,
  'trending-up': TrendingUp,
  'alert-triangle': AlertTriangle,
  info: Info,
  lightbulb: Lightbulb,
  'check-circle': CheckCircle,
  package: Package,
  zap: Zap,
}

export function QuickInsights({ insights }: QuickInsightsProps) {
  if (insights.length === 0) {
    return null
  }

  const getTypeConfig = (type: QuickInsight['type']) => {
    switch (type) {
      case 'SUCCESS':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          textColor: 'text-green-800',
        }
      case 'WARNING':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-600',
          textColor: 'text-yellow-800',
        }
      case 'INFO':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-800',
        }
      case 'TIP':
        return {
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          iconColor: 'text-purple-600',
          textColor: 'text-purple-800',
        }
    }
  }

  return (
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Quick Insights
        </h3>
        <p className="text-sm text-gray-500">Key observations for today</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((insight) => {
          const Icon = iconMap[insight.icon] || Info
          const config = getTypeConfig(insight.type)

          return (
            <div
              key={insight.id}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 ${config.bgColor} ${config.borderColor} transition-all hover:shadow-md`}
            >
              <div className="flex-shrink-0">
                <Icon className={`h-5 w-5 ${config.iconColor}`} />
              </div>
              <p className={`text-sm font-medium ${config.textColor} flex-1`}>
                {insight.message}
              </p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
