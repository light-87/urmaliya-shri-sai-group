import { Package, ArrowUp, ArrowDown } from 'lucide-react'
import { MetricCard, MetricValue, MetricBadge, ProgressBar } from './MetricCard'
import { InventoryMetrics, BUCKET_TYPE_LABELS } from '@/types'

interface InventoryActivityCardProps {
  inventory: InventoryMetrics
}

export function InventoryActivityCard({ inventory }: InventoryActivityCardProps) {
  const stockColor =
    inventory.currentStockLevel >= 70
      ? 'bg-green-500'
      : inventory.currentStockLevel >= 30
      ? 'bg-yellow-500'
      : 'bg-red-500'

  return (
    <MetricCard
      title="Inventory Activity"
      icon={Package}
      iconColor="bg-green-500"
      className="border-l-4 border-green-500"
    >
      {/* Total Buckets Moved */}
      <MetricValue
        label="Total Buckets Moved"
        value={inventory.totalBucketsMoved}
        valueColor="text-gray-900"
      />

      {/* Stocked vs Sold */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <ArrowUp className="h-3 w-3 text-green-600" />
            <p className="text-xs text-gray-500">Stocked</p>
          </div>
          <p className="text-lg font-semibold text-green-600">
            {inventory.bucketsStocked}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <ArrowDown className="h-3 w-3 text-orange-600" />
            <p className="text-xs text-gray-500">Sold</p>
          </div>
          <p className="text-lg font-semibold text-orange-600">
            {inventory.bucketsSold}
          </p>
        </div>
      </div>

      {/* Stock Level Progress Bar */}
      <div className="pt-2">
        <ProgressBar
          value={inventory.currentStockLevel}
          max={100}
          color={stockColor}
          showPercentage={true}
          label="Stock Level"
        />
      </div>

      {/* Active Bucket Types & Most Active */}
      <div className="flex flex-wrap gap-2 pt-2">
        <MetricBadge
          label="Active Types"
          value={inventory.activeBucketTypes}
          color="bg-green-100"
        />
        {inventory.mostActiveBucket && (
          <MetricBadge
            label="Most Active"
            value={`${BUCKET_TYPE_LABELS[inventory.mostActiveBucket.type]} (${inventory.mostActiveBucket.quantity})`}
            color="bg-purple-100"
          />
        )}
      </div>
    </MetricCard>
  )
}
