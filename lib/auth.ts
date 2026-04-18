import { cookies } from 'next/headers'
import { UnauthorizedError } from './errors'

const COOKIE_NAME = 'mia_user'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export interface AuthSession {
  userId: string
  phone: string
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(COOKIE_NAME)?.value
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export async function requireAuthSession(): Promise<AuthSession> {
  const session = await getAuthSession()
  if (!session) throw new UnauthorizedError('Please log in to continue')
  return session
}

export function buildAuthCookie(session: AuthSession): {
  name: string
  value: string
  options: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'lax'
    maxAge: number
    path: string
  }
} {
  return {
    name: COOKIE_NAME,
    value: JSON.stringify(session),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    },
  }
}

export function clearAuthCookie() {
  return {
    name: COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 0,
      path: '/',
    },
  }
}
