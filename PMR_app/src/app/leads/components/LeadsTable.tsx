'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pencil, Trash2 } from 'lucide-react'
import {
  LEAD_STATUS_LABELS,
  PRIORITY_LABELS,
  LEAD_STATUS_COLORS,
  PRIORITY_COLORS,
} from '@/types'
import type { Lead, LeadStatus, Priority } from '@/types'

interface LeadsTableProps {
  leads: Lead[]
  isAdmin: boolean
  canEdit: boolean
  onEdit: (lead: Lead) => void
  onDelete: (id: string) => void
  onQuickUpdate: (id: string, updates: Partial<Lead>) => void
  statusFilter: LeadStatus | 'ALL'
  priorityFilter: Priority | 'ALL'
  onStatusFilterChange: (status: LeadStatus | 'ALL') => void
  onPriorityFilterChange: (priority: Priority | 'ALL') => void
}

export function LeadsTable({
  leads,
  isAdmin,
  canEdit,
  onEdit,
  onDelete,
  onQuickUpdate,
  statusFilter,
  priorityFilter,
  onStatusFilterChange,
  onPriorityFilterChange,
}: LeadsTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleQuickStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    setUpdatingId(leadId)
    await onQuickUpdate(leadId, { status: newStatus })
    setUpdatingId(null)
  }

  const handleQuickPriorityChange = async (leadId: string, newPriority: Priority) => {
    setUpdatingId(leadId)
    await onQuickUpdate(leadId, { priority: newPriority })
    setUpdatingId(null)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return <span className="text-red-600 font-semibold">Overdue!</span>
    } else if (diffDays === 0) {
      return <span className="text-orange-600 font-semibold">Today</span>
    } else if (diffDays === 1) {
      return <span className="text-yellow-600">Tomorrow</span>
    } else if (diffDays <= 7) {
      return <span className="text-blue-600">In {diffDays} days</span>
    }
    return date.toLocaleDateString()
  }

  const getTimeSinceLastCall = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays} days ago`
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg">
        <div className="flex-1">
          <label className="text-sm font-medium mr-2">Filter by Status:</label>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              onStatusFilterChange(value as LeadStatus | 'ALL')
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <label className="text-sm font-medium mr-2">Filter by Priority:</label>
          <Select
            value={priorityFilter}
            onValueChange={(value) =>
              onPriorityFilterChange(value as Priority | 'ALL')
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-gray-600">
          Total: <span className="font-bold">{leads.length}</span> leads
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Last Call</TableHead>
              <TableHead>Next Follow-Up</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No leads found. Click "Add Lead" to create one!
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell className="text-gray-600">
                    {lead.company || '-'}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={lead.status}
                        onValueChange={(value) =>
                          handleQuickStatusChange(lead.id, value as LeadStatus)
                        }
                        disabled={updatingId === lead.id}
                      >
                        <SelectTrigger
                          className={`w-[150px] ${LEAD_STATUS_COLORS[lead.status]}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm ${
                          LEAD_STATUS_COLORS[lead.status]
                        }`}
                      >
                        {LEAD_STATUS_LABELS[lead.status]}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={lead.priority}
                        onValueChange={(value) =>
                          handleQuickPriorityChange(lead.id, value as Priority)
                        }
                        disabled={updatingId === lead.id}
                      >
                        <SelectTrigger
                          className={`w-[120px] ${PRIORITY_COLORS[lead.priority]}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm ${
                          PRIORITY_COLORS[lead.priority]
                        }`}
                      >
                        {PRIORITY_LABELS[lead.priority]}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {getTimeSinceLastCall(lead.lastCallDate)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(lead.nextFollowUpDate)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                    {lead.quickNote || lead.additionalNotes || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(lead)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(lead.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
