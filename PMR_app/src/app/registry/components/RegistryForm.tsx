'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { RegistryTransactionType, RegistryPaymentStatus, REGISTRY_TYPE_LABELS, REGISTRY_STATUS_LABELS } from '@/types'
import type { RegistryTransaction } from '@/types'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  registrationNumber: z.string().optional(),
  propertyLocation: z.string().min(1, 'Property location is required'),
  sellerName: z.string().min(1, 'Seller name is required'),
  buyerName: z.string().min(1, 'Buyer name is required'),
  transactionType: z.nativeEnum(RegistryTransactionType),
  propertyValue: z.number().positive('Property value must be positive'),

  // Government Fees
  stampDuty: z.number().nonnegative().optional(),
  registrationFees: z.number().nonnegative().optional(),
  mutationFees: z.number().nonnegative().optional(),
  documentationCharge: z.number().nonnegative().optional(),

  // Service Charges
  operatorCost: z.number().nonnegative().optional(),
  brokerCommission: z.number().nonnegative().optional(),
  recommendationFees: z.number().nonnegative().optional(),

  // Payment Information
  creditReceived: z.number().nonnegative().optional(),
  paymentMethod: z.string().optional(),

  // Status
  paymentStatus: z.nativeEnum(RegistryPaymentStatus).optional(),

  // Notes
  notes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface RegistryFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editTransaction?: RegistryTransaction | null
}

export function RegistryForm({ open, onClose, onSuccess, editTransaction }: RegistryFormProps) {
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
      transactionType: RegistryTransactionType.SALE_DEED,
      propertyValue: 0,
      stampDuty: 0,
      registrationFees: 0,
      mutationFees: 0,
      documentationCharge: 0,
      operatorCost: 0,
      brokerCommission: 0,
      recommendationFees: 0,
      creditReceived: 0,
      paymentStatus: RegistryPaymentStatus.PENDING,
    },
  })

  // Watch all numeric fields for real-time calculations
  const propertyValue = watch('propertyValue') || 0
  const stampDuty = watch('stampDuty') || 0
  const registrationFees = watch('registrationFees') || 0
  const mutationFees = watch('mutationFees') || 0
  const documentationCharge = watch('documentationCharge') || 0
  const operatorCost = watch('operatorCost') || 0
  const brokerCommission = watch('brokerCommission') || 0
  const recommendationFees = watch('recommendationFees') || 0
  const creditReceived = watch('creditReceived') || 0

  // AUTO-CALCULATIONS (matching database formulas)
  const calculations = useMemo(() => {
    const registrarOfficeFees = propertyValue * 0.0025 // 0.25%
    const stampCommission = stampDuty * 0.015 // 1.5%

    const totalExpenses =
      stampDuty +
      registrationFees +
      mutationFees +
      registrarOfficeFees +
      documentationCharge +
      operatorCost +
      brokerCommission +
      recommendationFees

    const balanceDue = totalExpenses - creditReceived
    const amountProfit = (creditReceived + stampCommission) - totalExpenses
    const totalIncome = creditReceived + stampCommission

    return {
      registrarOfficeFees,
      stampCommission,
      totalExpenses,
      balanceDue,
      amountProfit,
      totalIncome,
    }
  }, [propertyValue, stampDuty, registrationFees, mutationFees, documentationCharge, operatorCost, brokerCommission, recommendationFees, creditReceived])

  // Populate form when editing
  useEffect(() => {
    if (editTransaction) {
      setValue('date', editTransaction.date.split('T')[0])
      setValue('registrationNumber', editTransaction.registrationNumber || '')
      setValue('propertyLocation', editTransaction.propertyLocation)
      setValue('sellerName', editTransaction.sellerName)
      setValue('buyerName', editTransaction.buyerName)
      setValue('transactionType', editTransaction.transactionType)
      setValue('propertyValue', editTransaction.propertyValue)
      setValue('stampDuty', editTransaction.stampDuty)
      setValue('registrationFees', editTransaction.registrationFees)
      setValue('mutationFees', editTransaction.mutationFees)
      setValue('documentationCharge', editTransaction.documentationCharge)
      setValue('operatorCost', editTransaction.operatorCost)
      setValue('brokerCommission', editTransaction.brokerCommission)
      setValue('recommendationFees', editTransaction.recommendationFees)
      setValue('creditReceived', editTransaction.creditReceived)
      setValue('paymentMethod', editTransaction.paymentMethod || '')
      setValue('paymentStatus', editTransaction.paymentStatus)
      setValue('notes', editTransaction.notes || '')
    } else {
      reset()
    }
  }, [editTransaction, setValue, reset])

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true)
      setError('')

      const url = isEditMode
        ? `/api/registry/${editTransaction.id}`
        : '/api/registry'
      const method = isEditMode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Failed to save transaction')
      }

      onSuccess()
      onClose()
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? `Edit Registry Transaction ${editTransaction.transactionId}` : 'New Registry Transaction'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      {...register('date')}
                      className={errors.date ? 'border-red-500' : ''}
                    />
                    {errors.date && (
                      <p className="text-sm text-red-500 mt-1">{errors.date.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="registrationNumber">Registration Number</Label>
                    <Input
                      id="registrationNumber"
                      {...register('registrationNumber')}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="propertyLocation">Property Location *</Label>
                  <Input
                    id="propertyLocation"
                    {...register('propertyLocation')}
                    className={errors.propertyLocation ? 'border-red-500' : ''}
                    placeholder="Enter property location"
                  />
                  {errors.propertyLocation && (
                    <p className="text-sm text-red-500 mt-1">{errors.propertyLocation.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sellerName">Seller Name *</Label>
                    <Input
                      id="sellerName"
                      {...register('sellerName')}
                      className={errors.sellerName ? 'border-red-500' : ''}
                      placeholder="Enter seller name"
                    />
                    {errors.sellerName && (
                      <p className="text-sm text-red-500 mt-1">{errors.sellerName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="buyerName">Buyer Name *</Label>
                    <Input
                      id="buyerName"
                      {...register('buyerName')}
                      className={errors.buyerName ? 'border-red-500' : ''}
                      placeholder="Enter buyer name"
                    />
                    {errors.buyerName && (
                      <p className="text-sm text-red-500 mt-1">{errors.buyerName.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="transactionType">Transaction Type *</Label>
                    <Select
                      value={watch('transactionType')}
                      onValueChange={(value) => setValue('transactionType', value as RegistryTransactionType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(REGISTRY_TYPE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="propertyValue">Property Value (₹) *</Label>
                    <Input
                      id="propertyValue"
                      type="number"
                      step="0.01"
                      {...register('propertyValue', { valueAsNumber: true })}
                      className={errors.propertyValue ? 'border-red-500' : ''}
                      placeholder="0"
                    />
                    {errors.propertyValue && (
                      <p className="text-sm text-red-500 mt-1">{errors.propertyValue.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Government Fees Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Government Fees & Charges</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stampDuty">Stamp Duty (₹)</Label>
                    <Input
                      id="stampDuty"
                      type="number"
                      step="0.01"
                      {...register('stampDuty', { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="registrationFees">Registration Fees (₹)</Label>
                    <Input
                      id="registrationFees"
                      type="number"
                      step="0.01"
                      {...register('registrationFees', { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="mutationFees">Mutation Fees (₹)</Label>
                    <Input
                      id="mutationFees"
                      type="number"
                      step="0.01"
                      {...register('mutationFees', { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="documentationCharge">Documentation Charge (₹)</Label>
                    <Input
                      id="documentationCharge"
                      type="number"
                      step="0.01"
                      {...register('documentationCharge', { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* AUTO-CALCULATED: Registrar Office Fees */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label className="text-gray-700">Registrar Office Fees (Auto)</Label>
                      <p className="text-xs text-gray-500">0.25% of Property Value</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        ₹{calculations.registrarOfficeFees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">EXPENSE</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Charges Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Service Charges & Costs</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="operatorCost">Operator Cost (₹)</Label>
                    <Input
                      id="operatorCost"
                      type="number"
                      step="0.01"
                      {...register('operatorCost', { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="brokerCommission">Broker Commission (₹)</Label>
                    <Input
                      id="brokerCommission"
                      type="number"
                      step="0.01"
                      {...register('brokerCommission', { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="recommendationFees">Recommendation Fees Paid (₹)</Label>
                    <Input
                      id="recommendationFees"
                      type="number"
                      step="0.01"
                      {...register('recommendationFees', { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Payment & Status</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="creditReceived">Credit Received (₹)</Label>
                    <Input
                      id="creditReceived"
                      type="number"
                      step="0.01"
                      {...register('creditReceived', { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Input
                      id="paymentMethod"
                      {...register('paymentMethod')}
                      placeholder="Cash, UPI, Bank Transfer, etc."
                    />
                  </div>
                </div>

                {/* AUTO-CALCULATED: Stamp Commission */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label className="text-green-700">Stamp Commission (Auto)</Label>
                      <p className="text-xs text-green-600">1.5% of Stamp Duty</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-700">
                        ₹{calculations.stampCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-green-600 font-semibold">INCOME</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select
                    value={watch('paymentStatus')}
                    onValueChange={(value) => setValue('paymentStatus', value as RegistryPaymentStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REGISTRY_STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  className="w-full min-h-[80px] px-3 py-2 border rounded-md"
                  placeholder="Additional notes or comments..."
                />
              </div>
            </div>

            {/* Right Column - Summary Panel (Sticky) */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200 shadow-lg">
                  <h3 className="text-lg font-bold text-center mb-4 text-blue-900">
                    TRANSACTION SUMMARY
                  </h3>

                  {/* Total Income */}
                  <div className="mb-4 pb-4 border-b border-blue-200">
                    <p className="text-sm font-semibold text-blue-700 mb-2">Total Income:</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Credit Received:</span>
                        <span className="font-mono">₹{creditReceived.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stamp Commission:</span>
                        <span className="font-mono text-green-600">
                          ₹{calculations.stampCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>TOTAL INCOME:</span>
                        <span className="font-mono text-green-700">
                          ₹{calculations.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total Expenses */}
                  <div className="mb-4 pb-4 border-b border-blue-200">
                    <p className="text-sm font-semibold text-blue-700 mb-2">Total Expenses:</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stamp Duty:</span>
                        <span className="font-mono">₹{stampDuty.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Registration Fees:</span>
                        <span className="font-mono">₹{registrationFees.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Mutation Fees:</span>
                        <span className="font-mono">₹{mutationFees.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Registrar Fees:</span>
                        <span className="font-mono text-blue-600">
                          ₹{calculations.registrarOfficeFees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Documentation:</span>
                        <span className="font-mono">₹{documentationCharge.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Operator Cost:</span>
                        <span className="font-mono">₹{operatorCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Broker Commission:</span>
                        <span className="font-mono">₹{brokerCommission.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Recommendation:</span>
                        <span className="font-mono">₹{recommendationFees.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>TOTAL EXPENSES:</span>
                        <span className="font-mono text-red-700">
                          ₹{calculations.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Balance Due */}
                  <div className={`p-3 rounded-lg mb-4 ${
                    calculations.balanceDue > 0
                      ? 'bg-red-100 border-red-300'
                      : calculations.balanceDue < 0
                        ? 'bg-green-100 border-green-300'
                        : 'bg-gray-100 border-gray-300'
                  } border-2`}>
                    <p className="text-sm font-semibold text-center mb-1">Balance Due:</p>
                    <p className="text-2xl font-bold text-center font-mono">
                      ₹{Math.abs(calculations.balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-center mt-1">
                      {calculations.balanceDue > 0
                        ? '(Client owes)'
                        : calculations.balanceDue < 0
                          ? '(Overpaid)'
                          : '(Settled)'}
                    </p>
                  </div>

                  {/* Amount Profit */}
                  <div className={`p-4 rounded-lg ${
                    calculations.amountProfit >= 0
                      ? 'bg-green-100 border-green-300'
                      : 'bg-red-100 border-red-300'
                  } border-2`}>
                    <p className="text-sm font-semibold text-center mb-2">AMOUNT PROFIT:</p>
                    <p className={`text-3xl font-bold text-center font-mono ${
                      calculations.amountProfit >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {calculations.amountProfit >= 0 ? '+' : ''}₹{calculations.amountProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-center mt-2 text-gray-600">
                      (Income - Expenses)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Update Transaction' : 'Create Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
