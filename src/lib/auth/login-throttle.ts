import 'server-only'
import { createHmac } from 'node:crypto'
import { and, count, eq, gt, lt, min } from 'drizzle-orm'
import type { Database } from '@/lib/db'
import { loginAttempts } from '@/lib/db/schema'

/** At most 5 failed sign-ins per visitor in a sliding 15-minute window. */
export const MAX_FAILURES = 5
export const WINDOW_MS = 15 * 60 * 1000

/**
 * Identifies the visitor without storing their IP: HMAC-SHA256 keyed with the session secret, so the
 * table cannot be reversed into IPs even by someone who reads the database.
 */
export function clientKeyFor(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(ip).digest('hex')
}

/**
 * The visitor's IP as seen by the hosting platform. On Vercel, `x-real-ip` and the first
 * `x-forwarded-for` entry are set by the edge (a client-sent value is overwritten), so they are
 * trustworthy there; elsewhere this is best effort.
 */
export function clientIpFrom(headers: Headers): string {
  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded && forwarded.length > 0 ? forwarded : 'unknown'
}

export interface ThrottleStatus {
  blocked: boolean
  retryAfterSeconds: number
}

export async function checkThrottle(
  db: Database,
  clientKey: string,
  now = new Date(),
): Promise<ThrottleStatus> {
  const since = new Date(now.getTime() - WINDOW_MS)
  const [row] = await db
    .select({ failures: count(), oldest: min(loginAttempts.attemptedAt) })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.clientKey, clientKey), gt(loginAttempts.attemptedAt, since)))

  const failures = row?.failures ?? 0
  if (failures < MAX_FAILURES || !row?.oldest) return { blocked: false, retryAfterSeconds: 0 }

  // Blocked until the oldest failure in the window slides out of it.
  const unblockAt = new Date(row.oldest).getTime() + WINDOW_MS
  return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil((unblockAt - now.getTime()) / 1000)) }
}

export async function recordFailure(db: Database, clientKey: string, now = new Date()): Promise<void> {
  await db.insert(loginAttempts).values({ clientKey, attemptedAt: now })
  // Housekeeping: rows outside the window are useless; delete them as we go (cheap with the index).
  await db.delete(loginAttempts).where(lt(loginAttempts.attemptedAt, new Date(now.getTime() - WINDOW_MS)))
}

export async function clearFailures(db: Database, clientKey: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.clientKey, clientKey))
}
