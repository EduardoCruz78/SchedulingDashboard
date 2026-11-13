import { type NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'sd_session'

/**
 * Optimistic route guard: no session cookie -> login page, before any rendering work.
 * It does not decrypt or trust the cookie; `requireAdmin()` in the Data Access Layer is the real check
 * (Next.js recommends against doing full authorization in the proxy).
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next()

  const login = new URL('/login', request.url)
  const next = request.nextUrl.pathname + request.nextUrl.search
  if (next !== '/') login.searchParams.set('next', next)
  return NextResponse.redirect(login)
}

export const config = {
  // Everything except the login page, auth helpers, public API routes (webhook receiver, status),
  // Next.js internals and static files.
  matcher: [
    '/((?!login|auth/|api/webhooks|api/status|_next/|favicon.ico|.*\\.(?:svg|png|ico|webmanifest)$).*)',
  ],
}
