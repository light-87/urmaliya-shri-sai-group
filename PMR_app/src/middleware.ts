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

    // Admin-only routes
    if (path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/statements')) {
      if (role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/inventory', request.url))
      }
    }

    // Expense routes - require ADMIN or EXPENSE_INVENTORY
    if (path.startsWith('/expenses')) {
      if (role === 'INVENTORY_ONLY') {
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
