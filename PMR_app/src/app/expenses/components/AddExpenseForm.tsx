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
import { ACCOUNT_LABELS } from '@/types'
import type { ExpenseAccount, TransactionType } from '@/types'

const formSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.number().positive('Amount must be positive'),
  account: z.enum(['CASH', 'SHIWAM_TRIPATHI', 'ICICI', 'CC_CANARA', 'CANARA_CURRENT', 'SAWALIYA_SETH_MOTORS', 'VINAY', 'SACHIN']),
  type: z.enum(['INCOME', 'EXPENSE']),
  name: z.string().min(1, 'Name is required'),
})

type FormData = z.infer<typeof formSchema>

interface AddExpenseFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  uniqueNames: string[]
  editTransaction?: {
    id: string
    date: string
    amount: number
    account: string
    type: string
    name: string
  } | null
}

export function AddExpenseForm({ open, onClose, onSuccess, uniqueNames, editTransaction }: AddExpenseFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

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
      account: 'CASH',
      type: 'EXPENSE',
      amount: 0,
      name: '',
    },
  })

  const selectedAccount = watch('account')
  const selectedType = watch('type')
  const nameValue = watch('name')

  // Populate form when editing
  useEffect(() => {
    if (editTransaction) {
      setValue('date', editTransaction.date.split('T')[0])
      setValue('amount', editTransaction.amount)
      setValue('account', editTransaction.account as ExpenseAccount)
      setValue('type', editTransaction.type as TransactionType)
      setValue('name', editTransaction.name)
    } else {
      reset()
    }
  }, [editTransaction, setValue, reset])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setValue('name', value)

    if (value.length > 0) {
      const filtered = uniqueNames.filter(name =>
        name.toLowerCase().includes(value.toLowerCase())
      )
      setSuggestions(filtered.slice(0, 5))
      setShowSuggestions(filtered.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectSuggestion = (name: string) => {
    setValue('name', name)
    setShowSuggestions(false)
  }

  const onSubmit = async (data: FormData) => {
    setError('')
    setLoading(true)

    try {
      const url = isEditMode
        ? `/api/expenses/${editTransaction.id}`
        : '/api/expenses'

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
    setShowSuggestions(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add'} Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
            />
            {errors.date && (
              <p className="text-destructive text-sm">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (INR)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min={0}
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-destructive text-sm">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Account</Label>
            <Select
              value={selectedAccount}
              onValueChange={(value) => setValue('account', value as ExpenseAccount)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setValue('type', value as TransactionType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="name">Vendor/Customer Name</Label>
            <Input
              id="name"
              value={nameValue}
              onChange={handleNameChange}
              onFocus={() => nameValue && suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Enter name"
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? (isEditMode ? 'Updating...' : 'Adding...')
                : (isEditMode ? 'Update Transaction' : 'Add Transaction')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
