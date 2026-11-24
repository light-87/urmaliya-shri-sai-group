import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { SECTION_IDS, fetchSectionFlags, sectionSettingKey, type SectionId } from '@/lib/sections'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  section: z.enum(SECTION_IDS as [SectionId, ...SectionId[]]),
  enabled: z.boolean(),
})

// PUT - Turn one section on or off (ADMIN only)
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

    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid section or value' },
        { status: 400 }
      )
    }

    const { section, enabled } = parsed.data
    const { error } = await supabase
      .from('system_settings')
      .upsert(
        {
          // id comes from the column default on insert
          key: sectionSettingKey(section),
          value: enabled ? 'true' : 'false',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key', ignoreDuplicates: false }
      )

    // PGRST205 = system_settings table doesn't exist yet (system_settings_setup.sql not run)
    if (error?.code === 'PGRST205') {
      return NextResponse.json(
        { success: false, message: 'Section switches are not set up yet. Please contact support.' },
        { status: 503 }
      )
    }
    if (error) throw error

    const flags = await fetchSectionFlags()
    return NextResponse.json({ success: true, flags })
  } catch (error) {
    console.error('Section flags PUT error:', error)
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Unknown error'
    return NextResponse.json(
      { success: false, message: `Failed to save section setting: ${message}` },
      { status: 500 }
    )
  }
}
