import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
)

export interface SessionData {
  pinId: string
  role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
  expiresAt: number
}

// Create session token
export async function createSession(pinId: string, role: SessionData['role']) {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

  const token = await new SignJWT({ pinId, role, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY)

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  })

  return token
}

// Verify session token
export async function verifySession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    return payload as unknown as SessionData
  } catch (error) {
    return null
  }
}

// Delete session
export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

// Check permissions based on role hierarchy
export function hasPermission(
  userRole: SessionData['role'],
  requiredRole: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
): boolean {
  const roleHierarchy = {
    ADMIN: 3,
    EXPENSE_INVENTORY: 2,
    INVENTORY_ONLY: 1,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

// Get session from request (for API routes)
export async function getSession(): Promise<SessionData | null> {
  return verifySession()
}
