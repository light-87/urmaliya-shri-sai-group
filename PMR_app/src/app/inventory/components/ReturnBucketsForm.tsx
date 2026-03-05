'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { BUCKET_TYPE_LABELS, BUCKET_SIZES, WAREHOUSE_LABELS } from '@/types'
import type { BucketType, Warehouse, InventorySummary } from '@/types'

// Only bucket types that contain DEF liquid (size > 0)
const DEF_BUCKET_TYPES = Object.entries(BUCKET_SIZES)
  .filter(([, size]) => size > 0)
  .map(([type]) => type as BucketType)

const formSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  warehouse: z.enum(['GURH', 'REWA']),
  bucketType: z.string().min(1, 'Bucket type is required'),
  quantity: z.number().int().positive('Quantity must be a positive whole number'),
  customerName: z.string().min(1, 'Customer name is required'),
})

type FormData = z.infer<typeof formSchema>

interface ReturnBucketsFormProps {
  onClose: () => void
  onSuccess: () => void
  currentFreeDEFStock: number
  summary: InventorySummary[]
}

export function ReturnBucketsForm({ onClose, onSuccess, currentFreeDEFStock, summary }: ReturnBucketsFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      warehouse: 'REWA',
      bucketType: '',
      quantity: 0,
      customerName: '',
    },
  })

  const selectedWarehouse = watch('warehouse')
  const selectedBucketType = watch('bucketType') as BucketType | ''
  const quantity = watch('quantity')

  const bucketSize = selectedBucketType ? BUCKET_SIZES[selectedBucketType] : 0
  const litersToReturn = quantity > 0 && bucketSize > 0 ? quantity * bucketSize : 0

  const getCurrentBucketStock = () => {
    if (!selectedBucketType || !selectedWarehouse) return 0
    const row = summary.find(s => s.bucketType === selectedBucketType)
    if (!row) return 0
    return selectedWarehouse === 'GURH' ? row.gurh : row.rewa
  }

  const onSubmit = async (data: FormData) => {
    setError('')
    setLoading(true)

    try {
      // Step 1: Add buckets back to inventory (STOCK action)
      const inventoryResponse = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: data.date,
          warehouse: data.warehouse,
          bucketType: data.bucketType,
          action: 'STOCK',
          quantity: data.quantity,
          buyerSeller: data.customerName,
        }),
      })

      const inventoryResult = await inventoryResponse.json()

      if (!inventoryResult.success) {
        setError(inventoryResult.message || 'Failed to update inventory')
        setLoading(false)
        return
      }

      // Step 2: Add liters back to Free DEF stock
      const liters = data.quantity * BUCKET_SIZES[data.bucketType as BucketType]
      if (liters > 0) {
        const stockResponse = await fetch('/api/stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: data.date,
            type: 'RETURN_BUCKETS',
            category: 'FREE_DEF',
            quantity: liters,
            unit: 'LITERS',
            description: `Returned ${data.quantity}x ${BUCKET_TYPE_LABELS[data.bucketType as BucketType]} (${liters}L) from ${data.customerName}`,
          }),
        })

        const stockResult = await stockResponse.json()

        if (!stockResult.success) {
          setError(stockResult.message || 'Inventory updated but failed to update Free DEF stock')
          setLoading(false)
          return
        }
      }

      onSuccess()
      onClose()
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const currentBucketStock = getCurrentBucketStock()

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Return Buckets</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Stock Info */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-md space-y-1">
            <p className="text-sm text-green-800">
              <span className="font-medium">Available Free DEF:</span> {currentFreeDEFStock.toLocaleString()} L
            </p>
            {selectedBucketType && selectedWarehouse && (
              <p className="text-sm text-green-700">
                <span className="font-medium">Current {BUCKET_TYPE_LABELS[selectedBucketType]} stock ({selectedWarehouse}):</span> {currentBucketStock}
              </p>
            )}
            {litersToReturn > 0 && (
              <p className="text-sm text-green-600 font-medium mt-1">
                After return: +{quantity} buckets · Free DEF +{litersToReturn.toLocaleString()}L → {(currentFreeDEFStock + litersToReturn).toLocaleString()}L
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
            />
            {errors.date && (
              <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>
            )}
          </div>

          <div>
            <Label>Warehouse</Label>
            <Select
              value={selectedWarehouse}
              onValueChange={(value) => setValue('warehouse', value as 'GURH' | 'REWA')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GURH">{WAREHOUSE_LABELS.GURH}</SelectItem>
                <SelectItem value="REWA">{WAREHOUSE_LABELS.REWA}</SelectItem>
              </SelectContent>
            </Select>
            {errors.warehouse && (
              <p className="text-sm text-red-500 mt-1">{errors.warehouse.message}</p>
            )}
          </div>

          <div>
            <Label>Bucket Type</Label>
            <Select
              value={selectedBucketType}
              onValueChange={(value) => setValue('bucketType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bucket type" />
              </SelectTrigger>
              <SelectContent>
                {DEF_BUCKET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {BUCKET_TYPE_LABELS[type]} ({BUCKET_SIZES[type]}L)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bucketType && (
              <p className="text-sm text-red-500 mt-1">{errors.bucketType.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="quantity">Quantity (buckets)</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              placeholder="e.g., 5"
              {...register('quantity', { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-sm text-red-500 mt-1">{errors.quantity.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              type="text"
              placeholder="Enter customer name"
              {...register('customerName')}
            />
            {errors.customerName && (
              <p className="text-sm text-red-500 mt-1">{errors.customerName.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
              {loading ? 'Processing...' : 'Return Buckets'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
