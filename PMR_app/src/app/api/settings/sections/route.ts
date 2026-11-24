import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchSectionFlags } from '@/lib/sections'

export const dynamic = 'force-dynamic'

// GET - Which optional sections are turned on (any signed-in user)
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const flags = await fetchSectionFlags()
    return NextResponse.json({ success: true, flags })
  } catch (error) {
    console.error('Section flags GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load section settings' },
      { status: 500 }
    )
  }
}
