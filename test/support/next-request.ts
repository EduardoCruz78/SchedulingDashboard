import { sealSession, type Session } from '@/lib/auth/session-token'
import { testEnv } from './test-env'

/**
 * Stand-ins for the Next.js request APIs, so Server Actions run in plain Node:
 * an in-memory cookie jar, a recorded `refresh()` and a `redirect()` that throws like the real one.
 * Each test file wires them with vi.mock (see actions.test.ts).
 */
export const jar = new Map<string, string>()
export const refreshed = { count: 0 }

export class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT ${url}`)
  }
}

export const fakeCookies = async () => ({
  get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) ?? '' } : undefined),
  set: (name: string, value: string) => {
    jar.set(name, value)
  },
  delete: (name: string) => {
    jar.delete(name)
  },
})

export const adminSession: Session = {
  accessToken: 'jwt-admin',
  expiresAt: '2099-01-01T00:00:00Z',
  user: { id: 'u1', name: 'Demo Admin', email: 'admin@scheduling.demo', role: 'Admin' },
}

export async function signInAs(session: Session = adminSession) {
  jar.set('sd_session', await sealSession(session, testEnv.SESSION_SECRET))
}

export function resetRequest() {
  jar.clear()
  refreshed.count = 0
}
