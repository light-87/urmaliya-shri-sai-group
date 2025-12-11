import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  PackagePlus,
  PackageMinus,
  Factory,
  Droplet,
  FlaskConical,
  Container,
  ShoppingCart,
  Filter,
} from 'lucide-react'
import { format } from 'date-fns'
import { TimelineItem, TimelineItemType } from '@/types'

interface ActivityTimelineProps {
  timeline: TimelineItem[]
}

const iconMap: Record<string, any> = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'package-plus': PackagePlus,
  'package-minus': PackageMinus,
  factory: Factory,
  droplet: Droplet,
  'flask-conical': FlaskConical,
  container: Container,
  'shopping-cart': ShoppingCart,
}

export function ActivityTimeline({ timeline }: ActivityTimelineProps) {
  const [filter, setFilter] = useState<TimelineItemType | 'ALL'>('ALL')
  const [showAll, setShowAll] = useState(false)

  const filteredTimeline =
    filter === 'ALL'
      ? timeline
      : timeline.filter((item) => item.type === filter)

  const displayedTimeline = showAll
    ? filteredTimeline
    : filteredTimeline.slice(0, 10)

  const getTypeConfig = (type: TimelineItemType) => {
    switch (type) {
      case 'EXPENSE':
        return { label: 'Financial', color: 'bg-blue-500', textColor: 'text-blue-700' }
      case 'INVENTORY':
        return { label: 'Inventory', color: 'bg-green-500', textColor: 'text-green-700' }
      case 'STOCK':
        return { label: 'Production', color: 'bg-purple-500', textColor: 'text-purple-700' }
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
            <p className="text-sm text-gray-500">
              Chronological log of all activities ({filteredTimeline.length} items)
            </p>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('ALL')}
            >
              All
            </Button>
            <Button
              variant={filter === 'EXPENSE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('EXPENSE')}
            >
              Financial
            </Button>
            <Button
              variant={filter === 'INVENTORY' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('INVENTORY')}
            >
              Inventory
            </Button>
            <Button
              variant={filter === 'STOCK' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('STOCK')}
            >
              Production
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {displayedTimeline.length > 0 ? (
        <div className="space-y-3">
          {displayedTimeline.map((item, index) => {
            const Icon = iconMap[item.icon] || Factory
            const typeConfig = getTypeConfig(item.type)

            return (
              <div
                key={item.id}
                className={`flex gap-4 p-4 rounded-lg border-2 transition-all hover:shadow-md ${item.colorClass}`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 p-2 rounded-lg ${typeConfig.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full bg-white ${typeConfig.textColor} font-medium`}
                      >
                        {typeConfig.label}
                      </span>
                    </div>
                    <time className="text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(item.time), 'hh:mm a')}
                    </time>
                  </div>
                  <p className="text-sm text-gray-700">{item.description}</p>
                </div>

                {/* Amount Badge (if present) */}
                {item.amount !== undefined && item.type === 'EXPENSE' && (
                  <div className="flex-shrink-0 text-right">
                    <p
                      className={`text-lg font-bold ${
                        item.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {item.amount >= 0 ? '+' : ''}₹
                      {Math.abs(item.amount).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center">
          <p className="text-gray-500 text-sm">No activities to display</p>
        </div>
      )}

      {/* Show More Button */}
      {filteredTimeline.length > 10 && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll
              ? 'Show Less'
              : `Show All (${filteredTimeline.length - 10} more)`}
          </Button>
        </div>
      )}
    </Card>
  )
}
