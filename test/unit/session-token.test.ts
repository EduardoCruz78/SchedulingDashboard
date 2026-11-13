import { type Session, sealSession, unsealSession } from '@/lib/auth/session-token'

const secret = 'unit-test-session-secret-0123456789abcdef'
const now = new Date('2026-11-13T12:00:00Z')

const session: Session = {
  accessToken: 'jwt.from.api',
  expiresAt: '2026-11-13T13:00:00Z',
  user: { id: 'u1', name: 'Demo Admin', email: 'admin@scheduling.demo', role: 'Admin' },
}

describe('session token', () => {
  it('round-trips the session', async () => {
    const token = await sealSession(session, secret)
    expect(await unsealSession(token, secret, now)).toEqual(session)
  })

  it('is encrypted: the access token is not readable in the cookie', async () => {
    const token = await sealSession(session, secret)
    expect(token.split('.')).toHaveLength(5) // JWE compact serialization
    const decoded = token
      .split('.')
      .map((part) => Buffer.from(part, 'base64url').toString('latin1'))
      .join('')
    expect(decoded).not.toContain('jwt.from.api')
    expect(decoded).not.toContain('admin@scheduling.demo')
  })

  it('rejects a token sealed with another secret', async () => {
    const token = await sealSession(session, 'another-secret-0123456789abcdefghijkl')
    expect(await unsealSession(token, secret, now)).toBeNull()
  })

  it('rejects a tampered token', async () => {
    const token = await sealSession(session, secret)
    const parts = token.split('.')
    const ciphertext = parts[3] ?? ''
    parts[3] = (ciphertext.startsWith('A') ? 'B' : 'A') + ciphertext.slice(1)
    expect(await unsealSession(parts.join('.'), secret, now)).toBeNull()
  })

  it('expires with the API token', async () => {
    const token = await sealSession(session, secret)
    expect(await unsealSession(token, secret, new Date('2026-11-13T13:00:01Z'))).toBeNull()
  })

  it('treats a missing or garbage cookie as no session', async () => {
    expect(await unsealSession(undefined, secret, now)).toBeNull()
    expect(await unsealSession('not-a-jwe', secret, now)).toBeNull()
  })
})
