import { Factory, Droplet, FlaskConical } from 'lucide-react'
import { MetricCard, MetricValue, MetricBadge, ProgressBar } from './MetricCard'
import { ProductionMetrics } from '@/types'

interface ProductionStatusCardProps {
  production: ProductionMetrics
}

export function ProductionStatusCard({ production }: ProductionStatusCardProps) {
  const efficiencyColor =
    production.productionEfficiency >= 95
      ? 'bg-green-500'
      : production.productionEfficiency >= 80
      ? 'bg-yellow-500'
      : 'bg-red-500'

  return (
    <MetricCard
      title="Production Status"
      icon={Factory}
      iconColor="bg-purple-500"
      className="border-l-4 border-purple-500"
    >
      {/* Liters Produced */}
      <MetricValue
        label="Free DEF Produced"
        value={`${production.litersProduced.toLocaleString()}L`}
        valueColor="text-purple-600"
      />

      {/* Batches & Urea Consumed */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <FlaskConical className="h-3 w-3 text-purple-600" />
            <p className="text-xs text-gray-500">Batches</p>
          </div>
          <p className="text-lg font-semibold text-purple-600">
            {production.batchesCompleted}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <Droplet className="h-3 w-3 text-blue-600" />
            <p className="text-xs text-gray-500">Urea Used</p>
          </div>
          <p className="text-lg font-semibold text-blue-600">
            {production.ureaConsumed}kg
          </p>
        </div>
      </div>

      {/* Production Efficiency */}
      {production.batchesCompleted > 0 && (
        <div className="pt-2">
          <ProgressBar
            value={production.productionEfficiency}
            max={100}
            color={efficiencyColor}
            showPercentage={true}
            label="Production Efficiency"
          />
        </div>
      )}

      {/* Free DEF Sold & Current Urea Stock */}
      <div className="flex flex-wrap gap-2 pt-2">
        {production.freeDEFSold > 0 && (
          <MetricBadge
            label="DEF Sold"
            value={`${production.freeDEFSold}L`}
            color="bg-orange-100"
          />
        )}
        <MetricBadge
          label="Urea Stock"
          value={`${production.currentUreaStock}kg`}
          color="bg-blue-100"
        />
      </div>
    </MetricCard>
  )
}
