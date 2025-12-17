'use client'

import { useState, useEffect } from 'react'
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
import { BUCKET_TYPE_LABELS, WAREHOUSE_LABELS } from '@/types'
import type { BucketType, Warehouse, InventorySummary } from '@/types'

const formSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  warehouse: z.enum(['GURH', 'REWA', 'FACTORY']),
  bucketType: z.enum([
    'TATA_G', 'TATA_W', 'TATA_HP', 'AL_10_LTR', 'AL', 'BB',
    'ES', 'MH', 'MH_10_LTR', 'TATA_10_LTR', 'IBC_TANK', 'ECO', 'INDIAN_OIL_20L', 'FREE_DEF',
    // New bucket types
    'CUMMINS_20L', 'OTHER_20L',
    // New inventory items
    'PP_FILTER', 'WOUND_FILTER', 'BAG_FILTER', 'UF_FILTER', 'CHEMICAL_POWDER',
    'JUMBO_5_MICRON', 'CARTRIDGE_FILTER_022', 'DISPENSER', 'FLOW_METER',
    'IBC_ADAPTOR', 'NOZZLE'
  ]),
  action: z.enum(['STOCK', 'SELL']),
  quantity: z.number().positive('Quantity must be positive'),
  buyerSeller: z.string().min(1, 'Buyer/Seller name is required'),
})

type FormData = z.infer<typeof formSchema>

interface AddEntryFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  summary: InventorySummary[]
  editTransaction?: {
    id: string
    date: string
    warehouse: string
    bucketType: string
    action: string
    quantity: number
    buyerSeller: string
  } | null
}

export function AddEntryForm({ open, onClose, onSuccess, summary, editTransaction }: AddEntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditMode = !!editTransaction

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      warehouse: 'REWA',
      action: 'STOCK',
      quantity: 0,
      buyerSeller: '',
    },
  })

  const selectedWarehouse = watch('warehouse')
  const selectedBucketType = watch('bucketType')
  const selectedAction = watch('action')

  // Populate form when editing
  useEffect(() => {
    if (editTransaction) {
      setValue('date', editTransaction.date.split('T')[0])
      setValue('warehouse', editTransaction.warehouse as Warehouse)
      setValue('bucketType', editTransaction.bucketType as BucketType)
      setValue('action', editTransaction.action as 'STOCK' | 'SELL')
      setValue('quantity', Math.abs(editTransaction.quantity))
      setValue('buyerSeller', editTransaction.buyerSeller)
    } else {
      reset()
    }
  }, [editTransaction, setValue, reset])

  // Get current stock for selected bucket+warehouse
  const getCurrentStock = () => {
    if (!selectedBucketType || !selectedWarehouse) return 0
    // FACTORY warehouse doesn't have stock tracking in summary
    if (selectedWarehouse === 'FACTORY') return 0
    const row = summary.find(s => s.bucketType === selectedBucketType)
    if (!row) return 0
    return selectedWarehouse === 'GURH' ? row.gurh : row.rewa
  }

  const onSubmit = async (data: FormData) => {
    setError('')
    setLoading(true)

    // Validate stock for selling (only for new transactions)
    if (data.action === 'SELL' && !isEditMode) {
      const currentStock = getCurrentStock()
      if (data.quantity > currentStock) {
        setError(`Cannot sell ${data.quantity}. Only ${currentStock} available in stock.`)
        setLoading(false)
        return
      }
    }

    try {
      const url = isEditMode
        ? `/api/inventory/${editTransaction.id}`
        : '/api/inventory'

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        reset()
        onSuccess()
        onClose()
      } else {
        setError(result.message || `Failed to ${isEditMode ? 'update' : 'add'} transaction`)
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode && editTransaction?.warehouse === 'FACTORY'
              ? 'View Factory Transaction (Read-Only)'
              : `${isEditMode ? 'Edit' : 'Add'} Bucket Transaction`
            }
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              disabled={isEditMode && editTransaction?.warehouse === 'FACTORY'}
            />
            {errors.date && (
              <p className="text-destructive text-sm">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select
              value={selectedWarehouse}
              onValueChange={(value) => setValue('warehouse', value as Warehouse)}
              disabled={isEditMode && editTransaction?.warehouse === 'FACTORY'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(WAREHOUSE_LABELS).map(([value, label]) => {
                  // Hide FACTORY for new transactions (auto-created only)
                  if (value === 'FACTORY' && !isEditMode) return null
                  return (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {isEditMode && editTransaction?.warehouse === 'FACTORY' && (
              <p className="text-xs text-muted-foreground">
                Factory transactions are auto-created and cannot be edited
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Bucket Type</Label>
            <Select
              value={selectedBucketType}
              onValueChange={(value) => setValue('bucketType', value as BucketType)}
              disabled={isEditMode && editTransaction?.bucketType === 'FREE_DEF'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bucket type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BUCKET_TYPE_LABELS).map(([value, label]) => {
                  // Hide FREE_DEF for new transactions (auto-created only)
                  if (value === 'FREE_DEF' && !isEditMode) return null
                  return (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {errors.bucketType && (
              <p className="text-destructive text-sm">{errors.bucketType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Action</Label>
            <Select
              value={selectedAction}
              onValueChange={(value) => setValue('action', value as 'STOCK' | 'SELL')}
              disabled={isEditMode && editTransaction?.warehouse === 'FACTORY'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STOCK">Stock (Add)</SelectItem>
                <SelectItem value="SELL">Sell (Remove)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity
              {selectedBucketType && selectedWarehouse && selectedWarehouse !== 'FACTORY' && (
                <span className="text-muted-foreground ml-2 text-xs">
                  (Current stock: {getCurrentStock()})
                </span>
              )}
            </Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              {...register('quantity', { valueAsNumber: true })}
              disabled={isEditMode && editTransaction?.warehouse === 'FACTORY'}
            />
            {errors.quantity && (
              <p className="text-destructive text-sm">{errors.quantity.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="buyerSeller">Buyer/Seller Name</Label>
            <Input
              id="buyerSeller"
              {...register('buyerSeller')}
              placeholder="Enter name"
              disabled={isEditMode && editTransaction?.warehouse === 'FACTORY'}
            />
            {errors.buyerSeller && (
              <p className="text-destructive text-sm">{errors.buyerSeller.message}</p>
            )}
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {isEditMode && editTransaction?.warehouse === 'FACTORY' ? 'Close' : 'Cancel'}
            </Button>
            {!(isEditMode && editTransaction?.warehouse === 'FACTORY') && (
              <Button type="submit" disabled={loading}>
                {loading
                  ? (isEditMode ? 'Updating...' : 'Adding...')
                  : (isEditMode ? 'Update Transaction' : 'Add Transaction')
                }
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
