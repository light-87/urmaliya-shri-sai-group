import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { SECTIONS, fetchSectionFlags, sectionForPath, type SectionFlags, type SectionId } from '@/lib/sections'

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
)

const publicRoutes = ['/login']

// Section flags are cached briefly so a gated page/API doesn't hit the DB on
// every request. Only an "on" answer is reused: an "off" is always re-read,
// so a section the admin just turned on opens straight away. Turning a
// section off reaches every server within ~10 seconds.
const FLAG_CACHE_MS = 10_000
let flagCache: { flags: SectionFlags; at: number } | null = null

async function isSectionOn(id: SectionId): Promise<boolean> {
  if (flagCache && Date.now() - flagCache.at < FLAG_CACHE_MS && flagCache.flags[id]) {
    return true
  }
  const flags = await fetchSectionFlags()
  flagCache = { flags, at: Date.now() }
  return flags[id]
}

function sectionLabel(id: string) {
  return SECTIONS.find((s) => s.id === id)?.label || id
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Allow public routes
  if (publicRoutes.includes(path)) {
    return NextResponse.next()
  }

  // Sections the admin has turned off are blocked for everyone,
  // pages and APIs alike. Only gated paths read the flags.
  const gated = sectionForPath(path)
  const gatedOff = gated ? !(await isSectionOn(gated.id)) : false

  if (gated && gatedOff && gated.isApi) {
    return NextResponse.json(
      {
        success: false,
        message: `${sectionLabel(gated.id)} is turned off. The admin can turn it on from the Admin page.`,
      },
      { status: 403 }
    )
  }

  // Allow API routes to handle their own auth
  if (path.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Get session token
  const token = request.cookies.get('session')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Verify session
    const { payload } = await jwtVerify(token, SECRET_KEY)
    const role = payload.role as string

    // Turned-off section page. LEADS and REGISTRY_MANAGER have nothing else
    // to open, so sign them out instead of bouncing them between redirects.
    if (gated && gatedOff) {
      if (role === 'LEADS' || role === 'REGISTRY_MANAGER') {
        const response = NextResponse.redirect(new URL('/login?off=1', request.url))
        response.cookies.delete('session')
        return response
      }
      return NextResponse.redirect(new URL('/stockboard', request.url))
    }

    // LEADS role - can only access /leads
    if (role === 'LEADS') {
      if (!path.startsWith('/leads')) {
        return NextResponse.redirect(new URL('/leads', request.url))
      }
    }

    // Admin-only routes (now includes Daily Report)
    if (
      path.startsWith('/admin') ||
      path.startsWith('/dashboard') ||
      path.startsWith('/statements') ||
      path.startsWith('/daily-report')
    ) {
      if (role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/inventory', request.url))
      }
    }

    // Leads route - require ADMIN, EXPENSE_INVENTORY, or LEADS
    if (path.startsWith('/leads')) {
      if (role !== 'ADMIN' && role !== 'EXPENSE_INVENTORY' && role !== 'LEADS') {
        return NextResponse.redirect(new URL('/inventory', request.url))
      }
    }

    // Expense routes - require ADMIN or EXPENSE_INVENTORY
    if (path.startsWith('/expenses')) {
      if (role === 'INVENTORY_ONLY' || role === 'LEADS') {
        return NextResponse.redirect(new URL('/inventory', request.url))
      }
    }

    // Registry Dashboard - ADMIN only
    if (path.startsWith('/registry/dashboard')) {
      if (role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/registry', request.url))
      }
    }

    // Registry routes - require ADMIN or REGISTRY_MANAGER
    if (path.startsWith('/registry')) {
      if (role !== 'ADMIN' && role !== 'REGISTRY_MANAGER') {
        return NextResponse.redirect(new URL('/inventory', request.url))
      }
    }

    return NextResponse.next()
  } catch (error) {
    // Invalid token - redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|pmr-logo.png|manifest.json).*)'],
}
