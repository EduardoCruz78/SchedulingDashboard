import { EncryptJWT, jwtDecrypt } from 'jose'
import { z } from 'zod'

/**
 * The session is the SchedulingApi JWT plus the admin's display data, encrypted (JWE, A256GCM) with a
 * key derived from SESSION_SECRET. Encrypted, not just signed: the cookie holds a bearer token, so the
 * browser must not be able to read it, even though it carries the cookie.
 * Pure functions (no cookies, no env) so they are unit-tested directly.
 */

export const sessionSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.iso.datetime({ offset: true }),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
  }),
})

export type Session = z.infer<typeof sessionSchema>
export type SessionUser = Session['user']

const ISSUER = 'scheduling-dashboard'

async function deriveKey(secret: string): Promise<Uint8Array> {
  // SHA-256 turns any secret of 32+ characters into exactly the 256-bit key A256GCM needs.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return new Uint8Array(digest)
}

export async function sealSession(session: Session, secret: string): Promise<string> {
  const expiresAt = Math.floor(new Date(session.expiresAt).getTime() / 1000)
  return new EncryptJWT({ session })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .encrypt(await deriveKey(secret))
}

/** Returns the session, or null when the token is missing, tampered with, from another key or expired. */
export async function unsealSession(
  token: string | undefined,
  secret: string,
  now: Date = new Date(),
): Promise<Session | null> {
  if (!token) return null
  try {
    const { payload } = await jwtDecrypt(token, await deriveKey(secret), {
      issuer: ISSUER,
      currentDate: now,
    })
    const parsed = sessionSchema.safeParse(payload.session)
    if (!parsed.success) return null
    if (new Date(parsed.data.expiresAt) <= now) return null
    return parsed.data
  } catch {
    return null
  }
}
