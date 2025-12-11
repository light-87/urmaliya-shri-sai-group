import { Card } from '@/components/ui/card'
import { ArrowRight, Package, FlaskConical, Droplet, ShoppingCart } from 'lucide-react'
import { ProductionMetrics } from '@/types'

interface ProductionFlowChartProps {
  production: ProductionMetrics
}

export function ProductionFlowChart({ production }: ProductionFlowChartProps) {
  const hasProduction = production.batchesCompleted > 0 || production.freeDEFSold > 0

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Production Flow</h3>
        <p className="text-sm text-gray-500">Today's production journey</p>
      </div>

      {hasProduction ? (
        <div className="space-y-6">
          {/* Flow Diagram */}
          <div className="flex flex-col space-y-4">
            {/* Urea Stock */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Urea Stock</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {production.currentUreaStock}kg
                  </p>
                </div>
              </div>
            </div>

            {/* Arrow */}
            {production.ureaConsumed > 0 && (
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <ArrowRight className="h-6 w-6 text-gray-400 mx-auto rotate-90" />
                  <p className="text-xs text-gray-500 mt-1">
                    Used: {production.ureaConsumed}kg
                  </p>
                </div>
              </div>
            )}

            {/* Production */}
            {production.batchesCompleted > 0 && (
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div className="flex items-center gap-3">
                  <FlaskConical className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Batches Produced</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {production.batchesCompleted}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Output</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {production.litersProduced}L
                  </p>
                </div>
              </div>
            )}

            {/* Split Arrow */}
            {production.litersProduced > 0 && (
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <ArrowRight className="h-6 w-6 text-gray-400 rotate-90" />
                  </div>
                </div>
              </div>
            )}

            {/* Free DEF Available */}
            {production.litersProduced > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplet className="h-6 w-6 text-green-600" />
                    <p className="text-sm font-medium text-gray-700">Free DEF</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {production.litersProduced}L
                  </p>
                  <p className="text-xs text-gray-500">Produced</p>
                </div>

                {production.freeDEFSold > 0 && (
                  <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="h-6 w-6 text-orange-600" />
                      <p className="text-sm font-medium text-gray-700">Sold</p>
                    </div>
                    <p className="text-xl font-bold text-orange-600">
                      {production.freeDEFSold}L
                    </p>
                    <p className="text-xs text-gray-500">Free DEF</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Production Efficiency */}
          {production.batchesCompleted > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Production Efficiency</p>
                <p className="text-lg font-bold text-purple-600">
                  {production.productionEfficiency.toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    production.productionEfficiency >= 95
                      ? 'bg-green-500'
                      : production.productionEfficiency >= 80
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(production.productionEfficiency, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <FlaskConical className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No production activity today</p>
          </div>
        </div>
      )}
    </Card>
  )
}
