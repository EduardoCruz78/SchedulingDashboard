/**
 * Only same-site paths are allowed after login: `?next=https://evil.example` or `//evil.example`
 * would otherwise turn the login page into an open redirect.
 */
export function safeNextPath(next: unknown, fallback = '/'): string {
  if (typeof next !== 'string') return fallback
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  if (next.startsWith('/login') || next.startsWith('/auth/')) return fallback
  return next
}
