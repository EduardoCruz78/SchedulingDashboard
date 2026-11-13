import { parseEnv } from '@/lib/env'

const valid = {
  SCHEDULING_API_URL: 'http://localhost:8180',
  WEBHOOK_RELAY_URL: 'http://localhost:3100',
  WEBHOOK_RELAY_ADMIN_KEY: 'admin-key-0123456789abcdefghij',
  SESSION_SECRET: 'x'.repeat(32),
  DATABASE_URL: 'postgres://u:p@localhost:5435/db',
  WEBHOOK_SECRET: 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw',
}

describe('parseEnv', () => {
  it('applies defaults', () => {
    const env = parseEnv(valid)
    expect(env.DEMO_MODE).toBe(false)
    expect(env.BUSINESS_TIME_ZONE).toBe('America/Sao_Paulo')
    expect(env.UPSTREAM_TIMEOUT_MS).toBe(10_000)
  })

  it('parses DEMO_MODE as a boolean string', () => {
    expect(parseEnv({ ...valid, DEMO_MODE: 'true' }).DEMO_MODE).toBe(true)
    expect(() => parseEnv({ ...valid, DEMO_MODE: 'maybe' })).toThrow(/DEMO_MODE/)
  })

  it('rejects a short session secret', () => {
    expect(() => parseEnv({ ...valid, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/)
  })

  it('rejects a non-postgres database URL', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: 'mysql://x/y' })).toThrow(/DATABASE_URL/)
  })

  it('rejects an unknown time zone', () => {
    expect(() => parseEnv({ ...valid, BUSINESS_TIME_ZONE: 'Mars/Olympus' })).toThrow(/BUSINESS_TIME_ZONE/)
  })

  it('lists every missing variable at once', () => {
    expect(() => parseEnv({})).toThrow(/SCHEDULING_API_URL.*WEBHOOK_RELAY_URL/)
  })
})
