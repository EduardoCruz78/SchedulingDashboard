import { type NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

const reasons = new Set(['expired', 'forbidden'])

/**
 * Server Components cannot change cookies while rendering, so when the API answers 401 (token expired
 * or revoked) the page redirects here: the cookie is cleared and the user lands on the login page with
 * a message. The logout button uses a Server Action (POST) instead.
 */
export function GET(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get('reason')
  const login = new URL('/login', request.url)
  if (reason && reasons.has(reason)) login.searchParams.set('reason', reason)

  const response = NextResponse.redirect(login)
  response.cookies.delete(SESSION_COOKIE)
  return response
}
