import { connection, NextResponse } from 'next/server'
import { checkApiHealth } from '@/lib/api/health'

/**
 * Public, read-only: whether each API is up. Reveals nothing beyond what the APIs' own /health does.
 * The 55 s timeout covers a Render cold start (~50 s); Vercel Hobby functions may run up to 60 s.
 */
export const maxDuration = 60

export async function GET() {
  // Request-time only: without this, Cache Components would prerender the answer at build time.
  await connection()
  const health = await checkApiHealth(55_000)
  return NextResponse.json(health, { headers: { 'cache-control': 'no-store' } })
}
