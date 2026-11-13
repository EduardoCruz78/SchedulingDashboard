import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { getEnv } from '@/lib/env'
import { type Session, sealSession, unsealSession } from './session-token'

export const SESSION_COOKIE = 'sd_session'

/** Reads and decrypts the session cookie. Request-time data: call it inside a Suspense boundary. */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  // Validating expiry compares with the current time: say explicitly that this is request-time work,
  // so Cache Components never tries to prerender it.
  await connection()
  return unsealSession(token, getEnv().SESSION_SECRET)
}

/**
 * Data Access Layer guard: every read and every Server Action calls this, close to the data.
 * The proxy redirect is only an optimistic check; this is the real one.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.role !== 'Admin') redirect('/auth/signout?reason=forbidden')
  return session
}

/** Server Actions and Route Handlers only: cookies are read-only while a Server Component renders. */
export async function createSession(session: Session): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, await sealSession(session, getEnv().SESSION_SECRET), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(session.expiresAt),
  })
}

export async function deleteSession(): Promise<void> {
  ;(await cookies()).delete(SESSION_COOKIE)
}
