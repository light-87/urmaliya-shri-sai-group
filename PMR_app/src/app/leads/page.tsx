'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { AddLeadForm } from './components/AddLeadForm'
import { LeadsTable } from './components/LeadsTable'
import { useAuthStore } from '@/store/authStore'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Plus, Phone } from 'lucide-react'
import type { Lead, LeadStatus, Priority } from '@/types'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [priorityLeads, setPriorityLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL')
  const { role } = useAuthStore()

  const isAdmin = role === 'ADMIN'
  const canEdit = role === 'ADMIN' || role === 'EXPENSE_INVENTORY'

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter)

      const response = await fetch(`/api/leads?${params}`)
      const data = await response.json()

      if (data.success) {
        setLeads(data.leads)

        // Filter priority leads (what to do next)
        const priority = data.leads.filter((lead: Lead) => {
          // Show leads that need action
          if (lead.status === 'CONVERTED' || lead.status === 'NOT_INTERESTED') {
            return false
          }

          // High priority or urgent
          if (lead.priority === 'URGENT' || lead.priority === 'HIGH') {
            return true
          }

          // Need to call today
          if (lead.status === 'NEED_TO_CALL') {
            return true
          }

          // Overdue or due today
          if (lead.nextFollowUpDate) {
            const followUp = new Date(lead.nextFollowUpDate)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            return followUp <= today
          }

          return false
        })

        setPriorityLeads(priority)
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) {
      return
    }

    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchLeads()
      }
    } catch (error) {
      console.error('Failed to delete lead:', error)
    }
  }

  const handleQuickUpdate = async (id: string, updates: Partial<Lead>) => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        fetchLeads()
      }
    } catch (error) {
      console.error('Failed to update lead:', error)
    }
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <PageLoader />
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Leads Management</h1>
            <p className="text-gray-600 mt-1">Track and manage your sales leads</p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>

        {/* Priority Section - What to do next */}
        {priorityLeads.length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-5 w-5 text-red-600" />
              <h2 className="text-xl font-bold text-red-900">
                🔥 Priority - Call These First! ({priorityLeads.length})
              </h2>
            </div>
            <div className="space-y-3">
              {priorityLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-red-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{lead.name}</h3>
                        <span className="text-gray-600">{lead.phone}</span>
                        {lead.company && (
                          <span className="text-sm text-gray-500">({lead.company})</span>
                        )}
                      </div>
                      {lead.quickNote && (
                        <p className="text-sm text-gray-600 mt-1">"{lead.quickNote}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(lead)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Leads Table */}
        <LeadsTable
          leads={leads}
          isAdmin={isAdmin}
          canEdit={canEdit}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onQuickUpdate={handleQuickUpdate}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          onStatusFilterChange={setStatusFilter}
          onPriorityFilterChange={setPriorityFilter}
        />

        {/* Add/Edit Form */}
        <AddLeadForm
          open={showAddForm}
          onClose={() => {
            setShowAddForm(false)
            setEditingLead(null)
          }}
          onSuccess={() => fetchLeads()}
          editLead={editingLead}
        />
      </div>
    </ProtectedLayout>
  )
}
