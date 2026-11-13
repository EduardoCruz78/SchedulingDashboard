import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listActivity } from '@/lib/data/activity'

/**
 * Polled by the live feed every few seconds. Answers 401 (not a redirect) without an admin session:
 * the caller is `fetch`, and a redirect to the login HTML would only confuse it.
 */
export async function GET() {
  const session = await getSession()
  if (session?.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Sign in as an administrator.' }, { status: 401 })
  }
  const items = await listActivity()
  return NextResponse.json({ items }, { headers: { 'cache-control': 'no-store' } })
}
