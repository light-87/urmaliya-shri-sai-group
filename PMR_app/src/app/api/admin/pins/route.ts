import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { PinRole } from '@/types'

export const dynamic = 'force-dynamic'

// GET - Fetch all PIN roles (not the actual PINs)
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { data: pins, error } = await supabase
      .from('pins')
      .select('id, role, name, is_active')

    if (error) throw error

    return NextResponse.json({
      success: true,
      pins: pins || [],
    })
  } catch (error) {
    console.error('Pins GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch pins' },
      { status: 500 }
    )
  }
}

// PUT - Update PIN for a role
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { role, newPin } = body

    // Validate role
    if (!Object.values(PinRole).includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role' },
        { status: 400 }
      )
    }

    // Validate PIN format
    if (!newPin || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { success: false, message: 'PIN must be exactly 4 digits' },
        { status: 400 }
      )
    }

    // Check if PIN already exists for another role
    const { data: existingPin, error: fetchError } = await supabase
      .from('pins')
      .select('*')
      .eq('pin', newPin)
      .single()

    if (existingPin && existingPin.role !== role) {
      return NextResponse.json(
        { success: false, message: 'PIN already in use by another role' },
        { status: 400 }
      )
    }

    // Update the PIN for the role
    const { error: updateError } = await supabase
      .from('pins')
      .update({ pin: newPin })
      .eq('role', role)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'PIN updated successfully',
    })
  } catch (error) {
    console.error('Pins PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update PIN' },
      { status: 500 }
    )
  }
}
