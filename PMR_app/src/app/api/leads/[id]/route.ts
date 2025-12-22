import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { LeadStatus, Priority, CallOutcome } from '@/types'

export const dynamic = 'force-dynamic'

// Validation schema for updating lead
const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  company: z.string().optional().nullable(),
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  nextFollowUpDate: z.string().transform(str => str ? new Date(str) : null).optional().nullable(),
  callOutcome: z.nativeEnum(CallOutcome).optional().nullable(),
  quickNote: z.string().optional().nullable(),
  additionalNotes: z.string().optional().nullable(),
})

// PUT - Update lead
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission - ADMIN, EXPENSE_INVENTORY, and LEADS can edit
    if (session.role === 'INVENTORY_ONLY' || session.role === 'REGISTRY_MANAGER') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateLeadSchema.parse(body)

    // Check if lead exists
    const { data: existing, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Lead not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}

    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone
    if (validatedData.company !== undefined) updateData.company = validatedData.company
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority
    if (validatedData.callOutcome !== undefined) updateData.callOutcome = validatedData.callOutcome
    if (validatedData.quickNote !== undefined) updateData.quickNote = validatedData.quickNote
    if (validatedData.additionalNotes !== undefined) updateData.additionalNotes = validatedData.additionalNotes
    if (validatedData.nextFollowUpDate !== undefined) {
      updateData.nextFollowUpDate = validatedData.nextFollowUpDate ? validatedData.nextFollowUpDate.toISOString() : null
    }

    // Auto-set lastCallDate if status changed to CALLED
    if (validatedData.status === 'CALLED' && existing.status !== 'CALLED') {
      updateData.lastCallDate = new Date().toISOString()
    }

    // Auto-set nextFollowUpDate if status changed to CALL_IN_7_DAYS and not manually set
    if (validatedData.status === 'CALL_IN_7_DAYS' && !validatedData.nextFollowUpDate) {
      const followUpDate = new Date()
      followUpDate.setDate(followUpDate.getDate() + 7)
      updateData.nextFollowUpDate = followUpDate.toISOString()
    }

    // Update the lead
    const { data: lead, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      lead,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid data', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Leads PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

// DELETE - Delete lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission - ADMIN, EXPENSE_INVENTORY, and LEADS can delete
    if (session.role === 'INVENTORY_ONLY' || session.role === 'REGISTRY_MANAGER') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check if lead exists
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !lead) {
      return NextResponse.json(
        { success: false, message: 'Lead not found' },
        { status: 404 }
      )
    }

    // Delete lead
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'Lead deleted',
    })
  } catch (error) {
    console.error('Leads DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}
