import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Beaker, Package2, Box } from 'lucide-react'
import type { StockSummary } from '@/types'
import { UREA_PER_BATCH_KG, KG_PER_BAG } from '@/types'

interface StockOverviewCardProps {
  summary: StockSummary | null
}

export function StockOverviewCard({ summary }: StockOverviewCardProps) {
  if (!summary) {
    return <div>Loading...</div>
  }

  const batchesCanProduce = Math.floor(summary.ureaKg / UREA_PER_BATCH_KG)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Raw Materials Card */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-amber-900">
            <Package className="h-5 w-5 mr-2" />
            Raw Materials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-amber-700 font-medium mb-1">Urea Stock</div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-amber-900">
                  {summary.ureaKg.toFixed(1)} kg
                </div>
                <div className="text-sm text-amber-600">
                  ≈ {summary.ureaBags.toFixed(1)} bags ({KG_PER_BAG}kg each)
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-amber-200">
              <div className="text-sm text-amber-700 font-medium mb-1">Production Capacity</div>
              <div className="text-lg font-semibold text-amber-900">
                {summary.ureaCansProduceL.toLocaleString()} L
              </div>
              <div className="text-xs text-amber-600">
                ({batchesCanProduce} batch{batchesCanProduce !== 1 ? 'es' : ''} × 1000L)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finished Goods Card */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-green-900">
            <Box className="h-5 w-5 mr-2" />
            Finished Goods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-green-700 font-medium mb-1">
                Free DEF Available
              </div>
              <div className="text-3xl font-bold text-green-900">
                {summary.finishedGoods.toLocaleString()} L
              </div>
              <div className="text-xs text-green-600 mt-1">
                Ready to sell or fill into buckets
              </div>
            </div>
            <div className="pt-2 border-t border-green-200">
              <div className="flex justify-between items-center text-sm text-green-700">
                <div className="flex items-center">
                  <Package2 className="h-4 w-4 mr-1" />
                  Empty Buckets (inventory)
                </div>
                <div className="font-medium text-green-900">
                  {summary.bucketsInLiters.toLocaleString()} L capacity
                </div>
              </div>
              <div className="text-xs text-green-600 mt-1">
                Buckets are filled when sold
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
