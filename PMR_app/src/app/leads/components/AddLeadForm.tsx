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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LEAD_STATUS_LABELS,
  PRIORITY_LABELS,
  CALL_OUTCOME_LABELS,
  QUICK_NOTE_OPTIONS,
} from '@/types'
import type { Lead, LeadStatus, Priority, CallOutcome } from '@/types'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  company: z.string().optional(),
  status: z.enum([
    'NEW',
    'NEED_TO_CALL',
    'CALLED',
    'GOT_RESPONSE',
    'ON_HOLD',
    'CALL_IN_7_DAYS',
    'CONVERTED',
    'NOT_INTERESTED',
  ]).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  nextFollowUpDate: z.string().optional(),
  callOutcome: z.enum([
    'NO_ANSWER',
    'BUSY',
    'INTERESTED',
    'NEED_INFO',
    'CALL_BACK_LATER',
    'WRONG_NUMBER',
    'NOT_INTERESTED_NOW',
  ]).optional(),
  quickNote: z.string().optional(),
  additionalNotes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface AddLeadFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editLead?: Lead | null
}

export function AddLeadForm({ open, onClose, onSuccess, editLead }: AddLeadFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditMode = !!editLead

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
      name: '',
      phone: '',
      company: '',
      status: 'NEW',
      priority: 'MEDIUM',
      nextFollowUpDate: '',
      callOutcome: undefined,
      quickNote: '',
      additionalNotes: '',
    },
  })

  const selectedStatus = watch('status')
  const selectedPriority = watch('priority')
  const selectedCallOutcome = watch('callOutcome')
  const selectedQuickNote = watch('quickNote')

  // Populate form when editing
  useEffect(() => {
    if (editLead) {
      setValue('name', editLead.name)
      setValue('phone', editLead.phone)
      setValue('company', editLead.company || '')
      setValue('status', editLead.status)
      setValue('priority', editLead.priority)
      setValue(
        'nextFollowUpDate',
        editLead.nextFollowUpDate ? editLead.nextFollowUpDate.split('T')[0] : ''
      )
      setValue('callOutcome', editLead.callOutcome || undefined)
      setValue('quickNote', editLead.quickNote || '')
      setValue('additionalNotes', editLead.additionalNotes || '')
    } else {
      reset()
    }
  }, [editLead, setValue, reset])

  const onSubmit = async (data: FormData) => {
    setError('')
    setLoading(true)

    try {
      const url = isEditMode ? `/api/leads/${editLead.id}` : '/api/leads'

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
        setError(result.message || `Failed to ${isEditMode ? 'update' : 'add'} lead`)
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Required Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter name"
                autoComplete="off"
              />
              {errors.name && (
                <p className="text-destructive text-sm">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="Enter phone number"
                autoComplete="off"
              />
              {errors.phone && (
                <p className="text-destructive text-sm">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Optional Company */}
          <div className="space-y-2">
            <Label htmlFor="company">Company (Optional)</Label>
            <Input
              id="company"
              {...register('company')}
              placeholder="Enter company name"
              autoComplete="off"
            />
          </div>

          {/* Dropdowns for Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={selectedPriority}
                onValueChange={(value) => setValue('priority', value as Priority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setValue('status', value as LeadStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Next Follow-Up Date */}
          <div className="space-y-2">
            <Label htmlFor="nextFollowUpDate">Next Follow-Up Date (Optional)</Label>
            <Input
              id="nextFollowUpDate"
              type="date"
              {...register('nextFollowUpDate')}
            />
            <p className="text-xs text-muted-foreground">
              When should you call this lead next?
            </p>
          </div>

          {/* Call Outcome Dropdown */}
          <div className="space-y-2">
            <Label>What Happened on Last Call? (Optional)</Label>
            <Select
              value={selectedCallOutcome || 'NONE'}
              onValueChange={(value) =>
                setValue('callOutcome', value !== 'NONE' ? (value as CallOutcome) : undefined)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                {Object.entries(CALL_OUTCOME_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Note Dropdown */}
          <div className="space-y-2">
            <Label>Quick Note (Optional)</Label>
            <Select
              value={selectedQuickNote || 'NONE'}
              onValueChange={(value) => setValue('quickNote', value !== 'NONE' ? value : '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a common note" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                {QUICK_NOTE_OPTIONS.map((note) => (
                  <SelectItem key={note} value={note}>
                    {note}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose a common note or leave blank
            </p>
          </div>

          {/* Additional Notes - Free Text (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
            <Textarea
              id="additionalNotes"
              {...register('additionalNotes')}
              placeholder="Any extra details you want to remember..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Only type here if you need to add something specific
            </p>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEditMode
                  ? 'Updating...'
                  : 'Adding...'
                : isEditMode
                ? 'Update Lead'
                : 'Add Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
