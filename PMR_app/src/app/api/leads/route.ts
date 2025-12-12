import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { LeadStatus, Priority, CallOutcome } from '@/types'

export const dynamic = 'force-dynamic'

// Validation schema for creating lead
const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  company: z.string().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  nextFollowUpDate: z.string().transform(str => str ? new Date(str) : undefined).optional(),
  callOutcome: z.nativeEnum(CallOutcome).optional().nullable(),
  quickNote: z.string().optional().nullable(),
  additionalNotes: z.string().optional().nullable(),
})

// GET - Fetch all leads with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission - only ADMIN and EXPENSE_INVENTORY can view leads
    if (session.role === 'INVENTORY_ONLY') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as LeadStatus | null
    const priority = searchParams.get('priority') as Priority | null

    // Build filter conditions
    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (priority) where.priority = priority

    // Fetch all leads
    const leads = await prisma.lead.findMany({
      where,
      orderBy: [
        { priority: 'desc' }, // URGENT first
        { nextFollowUpDate: 'asc' }, // Soonest follow-ups first
        { createdAt: 'desc' }, // Newest first
      ],
    })

    const total = await prisma.lead.count({ where })

    return NextResponse.json({
      success: true,
      leads,
      total,
    })
  } catch (error) {
    console.error('Leads GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

// POST - Create new lead
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission
    if (session.role === 'INVENTORY_ONLY') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createLeadSchema.parse(body)

    // Auto-set lastCallDate if status is CALLED
    const lastCallDate = validatedData.status === 'CALLED' ? new Date() : undefined

    // Auto-set nextFollowUpDate if status is CALL_IN_7_DAYS and not manually set
    let nextFollowUpDate = validatedData.nextFollowUpDate
    if (validatedData.status === 'CALL_IN_7_DAYS' && !nextFollowUpDate) {
      nextFollowUpDate = new Date()
      nextFollowUpDate.setDate(nextFollowUpDate.getDate() + 7)
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        company: validatedData.company,
        status: validatedData.status || 'NEW',
        priority: validatedData.priority || 'MEDIUM',
        lastCallDate,
        nextFollowUpDate,
        callOutcome: validatedData.callOutcome,
        quickNote: validatedData.quickNote,
        additionalNotes: validatedData.additionalNotes,
      },
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
    console.error('Leads POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create lead' },
      { status: 500 }
    )
  }
}
