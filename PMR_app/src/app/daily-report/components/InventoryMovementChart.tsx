import { Card } from '@/components/ui/card'
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
import { InventoryMetrics, WAREHOUSE_LABELS } from '@/types'

interface InventoryMovementChartProps {
  inventory: InventoryMetrics
}

export function InventoryMovementChart({ inventory }: InventoryMovementChartProps) {
  // Prepare data for warehouse comparison
  const chartData = inventory.warehouseActivity.map((activity) => ({
    name: WAREHOUSE_LABELS[activity.warehouse],
    stocked: activity.stocked,
    sold: activity.sold,
  }))

  const hasData = chartData.some((item) => item.stocked > 0 || item.sold > 0)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-sm text-green-600">
            Stocked: {payload[0].value} buckets
          </p>
          <p className="text-sm text-orange-600">
            Sold: {payload[1].value} buckets
          </p>
          <p className="text-sm font-semibold text-gray-900 border-t mt-1 pt-1">
            Net: {payload[0].value - payload[1].value} buckets
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Inventory Movement</h3>
        <p className="text-sm text-gray-500">Stock and sales by warehouse</p>
      </div>

      {hasData ? (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="stocked" fill="#10B981" name="Stocked" />
              <Bar dataKey="sold" fill="#F59E0B" name="Sold" />
            </BarChart>
          </ResponsiveContainer>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Total Moved</p>
              <p className="text-lg font-semibold text-gray-900">
                {inventory.totalBucketsMoved}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Stocked</p>
              <p className="text-lg font-semibold text-green-600">
                {inventory.bucketsStocked}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Sold</p>
              <p className="text-lg font-semibold text-orange-600">
                {inventory.bucketsSold}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-gray-500 text-sm">No inventory activity today</p>
        </div>
      )}
    </Card>
  )
}
