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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

const formSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  quantityL: z.number().positive('Quantity must be positive'),
  customerName: z.string().min(1, 'Customer name is required'),
})

type FormData = z.infer<typeof formSchema>

interface SellFreeDEFFormProps {
  onClose: () => void
  onSuccess: () => void
  currentFreeDEFStock: number
}

export function SellFreeDEFForm({ onClose, onSuccess, currentFreeDEFStock }: SellFreeDEFFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      quantityL: 0,
      customerName: '',
    },
  })

  const quantityL = watch('quantityL')

  const onSubmit = async (data: FormData) => {
    setError('')

    // Validate stock
    if (data.quantityL > currentFreeDEFStock) {
      setError(`Cannot sell ${data.quantityL}L. Only ${currentFreeDEFStock}L available.`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: data.date,
          type: 'SELL_FREE_DEF',
          category: 'FREE_DEF',
          quantity: -data.quantityL,
          unit: 'LITERS',
          description: `Sold ${data.quantityL}L Free DEF to ${data.customerName}`,
        }),
      })

      const result = await response.json()

      if (result.success) {
        onSuccess()
        onClose()
      } else {
        setError(result.message || 'Failed to sell Free DEF')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sell Free DEF (Loose)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Stock Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Available Free DEF:</span> {currentFreeDEFStock.toLocaleString()} L
            </p>
            {quantityL > 0 && quantityL <= currentFreeDEFStock && (
              <p className="text-sm text-blue-600 mt-1">
                After sale: {(currentFreeDEFStock - quantityL).toLocaleString()} L
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
            <Label htmlFor="quantityL">Quantity (Liters)</Label>
            <Input
              id="quantityL"
              type="number"
              step="0.1"
              placeholder="e.g., 500"
              {...register('quantityL', { valueAsNumber: true })}
            />
            {errors.quantityL && (
              <p className="text-sm text-red-500 mt-1">{errors.quantityL.message}</p>
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
            <Button type="submit" disabled={loading} variant="destructive">
              {loading ? 'Processing...' : 'Sell Free DEF'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
