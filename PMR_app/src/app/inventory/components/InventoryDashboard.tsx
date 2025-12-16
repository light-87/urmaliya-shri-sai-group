'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BUCKET_TYPE_LABELS } from '@/types'
import type { BucketType } from '@/types'

interface InventorySummary {
  bucketType: BucketType
  gurh: number
  rewa: number
  total: number
}

interface InventoryDashboardProps {
  summary: InventorySummary[]
}

export function InventoryDashboard({ summary }: InventoryDashboardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Inventory Stock</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-semibold">Bucket Type</th>
                <th className="text-center p-3 font-semibold">Gurh</th>
                <th className="text-center p-3 font-semibold">Rewa</th>
                <th className="text-center p-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.bucketType} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">
                    {BUCKET_TYPE_LABELS[row.bucketType]}
                  </td>
                  <td className="text-center p-3">{row.gurh}</td>
                  <td className="text-center p-3">{row.rewa}</td>
                  <td className="text-center p-3 font-semibold">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
