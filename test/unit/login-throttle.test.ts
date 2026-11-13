import { clientIpFrom, clientKeyFor } from '@/lib/auth/login-throttle'
import { safeNextPath } from '@/lib/auth/safe-redirect'

describe('clientIpFrom', () => {
  it('prefers x-real-ip, then the first x-forwarded-for entry', () => {
    expect(clientIpFrom(new Headers({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe(
      '1.1.1.1',
    )
    expect(clientIpFrom(new Headers({ 'x-forwarded-for': '2.2.2.2, 10.0.0.1' }))).toBe('2.2.2.2')
    expect(clientIpFrom(new Headers())).toBe('unknown')
  })
})

describe('clientKeyFor', () => {
  it('does not store the IP and depends on the secret', () => {
    const key = clientKeyFor('203.0.113.7', 'secret-a')
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(key).not.toContain('203.0.113.7')
    expect(key).not.toBe(clientKeyFor('203.0.113.7', 'secret-b'))
    expect(key).toBe(clientKeyFor('203.0.113.7', 'secret-a'))
  })
})

describe('safeNextPath', () => {
  it.each([
    ['/schedule?date=2026-11-13', '/schedule?date=2026-11-13'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['/login', '/'],
    [null, '/'],
  ])('%s -> %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected)
  })
})
