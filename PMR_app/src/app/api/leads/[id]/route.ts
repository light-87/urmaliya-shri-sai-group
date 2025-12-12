import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // Check permission - ADMIN and EXPENSE_INVENTORY can edit
    if (session.role === 'INVENTORY_ONLY') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateLeadSchema.parse(body)

    // Check if lead exists
    const existing = await prisma.lead.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Lead not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { ...validatedData }

    // Auto-set lastCallDate if status changed to CALLED
    if (validatedData.status === 'CALLED' && existing.status !== 'CALLED') {
      updateData.lastCallDate = new Date()
    }

    // Auto-set nextFollowUpDate if status changed to CALL_IN_7_DAYS and not manually set
    if (validatedData.status === 'CALL_IN_7_DAYS' && !validatedData.nextFollowUpDate) {
      const followUpDate = new Date()
      followUpDate.setDate(followUpDate.getDate() + 7)
      updateData.nextFollowUpDate = followUpDate
    }

    // Update the lead
    const lead = await prisma.lead.update({
      where: { id },
      data: updateData as any,
    })

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

    // Check permission - ADMIN and EXPENSE_INVENTORY can delete
    if (session.role === 'INVENTORY_ONLY') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id },
    })

    if (!lead) {
      return NextResponse.json(
        { success: false, message: 'Lead not found' },
        { status: 404 }
      )
    }

    // Delete lead
    await prisma.lead.delete({
      where: { id },
    })

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
