import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createSession } from '@/lib/auth'
import { triggerBackupIfNeeded } from '@/lib/backup'
import { fetchSectionFlags } from '@/lib/sections'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin } = body

    if (!pin || typeof pin !== 'string' || pin.length !== 4) {
      return NextResponse.json(
        { success: false, message: 'Invalid PIN format' },
        { status: 400 }
      )
    }

    // Find PIN in database using Supabase
    const { data: pinRecord, error } = await supabase
      .from('pins')
      .select('*')
      .eq('pin', pin)
      .eq('is_active', true)
      .single()

    if (error || !pinRecord) {
      return NextResponse.json(
        { success: false, message: 'Invalid PIN' },
        { status: 401 }
      )
    }

    // LEADS and REGISTRY_MANAGER PINs only open one section each. If the admin
    // has turned that section off, there is nothing for them to open.
    if (pinRecord.role === 'LEADS' || pinRecord.role === 'REGISTRY_MANAGER') {
      const flags = await fetchSectionFlags()
      const sectionOn = pinRecord.role === 'LEADS' ? flags.leads : flags.registry
      if (!sectionOn) {
        return NextResponse.json(
          {
            success: false,
            message: `The ${pinRecord.role === 'LEADS' ? 'Leads' : 'Registry'} section is turned off. Ask the admin to turn it on.`,
          },
          { status: 403 }
        )
      }
    }

    // Create session
    await createSession(pinRecord.id, pinRecord.role)

    // Trigger backup if needed (non-blocking, runs in background)
    // This checks if last backup was more than 24 hours ago
    triggerBackupIfNeeded()

    return NextResponse.json({
      success: true,
      role: pinRecord.role,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Something went wrong' },
      { status: 500 }
    )
  }
}
