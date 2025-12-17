import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
)

const publicRoutes = ['/login']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Allow public routes
  if (publicRoutes.includes(path)) {
    return NextResponse.next()
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
