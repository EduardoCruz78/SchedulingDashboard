import { http, HttpResponse } from 'msw'
import { MAX_FAILURES, checkThrottle, recordFailure } from '@/lib/auth/login-throttle'
import { signIn } from '@/lib/auth/sign-in'
import { createTestDatabase, type TestDatabase } from '@test/support/database'
import { setupMswServer } from '@test/support/msw'
import { SCHEDULING_API } from '@test/support/test-env'

let database: TestDatabase
beforeAll(async () => {
  database = await createTestDatabase()
})
afterAll(async () => {
  await database.close()
})
beforeEach(async () => {
  await database.reset()
})

const server = setupMswServer()

const admin = { email: 'admin@scheduling.demo', password: 'Admin123!' }
const visitor = 'visitor-hmac'

function fakeApi(options: { role?: string; loginStatus?: number } = {}) {
  server.use(
    http.post(`${SCHEDULING_API}/api/auth/login`, async ({ request }) => {
      const body = (await request.json()) as { password: string }
      const status = options.loginStatus ?? (body.password === admin.password ? 200 : 401)
      if (status !== 200) {
        return HttpResponse.json({ status, title: 'Unauthorized' }, { status })
      }
      return HttpResponse.json({ accessToken: 'jwt-abc', expiresAt: '2099-01-01T00:00:00+00:00' })
    }),
    http.get(`${SCHEDULING_API}/api/auth/me`, ({ request }) => {
      if (request.headers.get('authorization') !== 'Bearer jwt-abc')
        return new HttpResponse(null, { status: 401 })
      return HttpResponse.json({
        id: 'u1',
        name: 'Demo Admin',
        email: admin.email,
        role: options.role ?? 'Admin',
        createdAt: '2026-11-12T22:51:26+00:00',
      })
    }),
  )
}

describe('signIn', () => {
  it('returns a session for an admin', async () => {
    fakeApi()

    const result = await signIn(admin, visitor, database.db)

    expect(result).toEqual({
      ok: true,
      session: {
        accessToken: 'jwt-abc',
        expiresAt: '2099-01-01T00:00:00+00:00',
        user: { id: 'u1', name: 'Demo Admin', email: admin.email, role: 'Admin' },
      },
    })
  })

  it('refuses a customer with a clear message, without counting a failure', async () => {
    fakeApi({ role: 'Customer' })

    const result = await signIn(admin, visitor, database.db)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.state.status === 'error' && result.state.message).toMatch(/administrators/)
    expect((await checkThrottle(database.db, visitor)).blocked).toBe(false)
  })

  it('validates the form before calling the API', async () => {
    const result = await signIn({ email: 'not-an-email', password: '' }, visitor, database.db)

    expect(!result.ok && result.state.status === 'error' && result.state.fieldErrors).toEqual({
      email: ['Enter a valid email address.'],
      password: ['Enter your password.'],
    })
  })

  it('blocks a visitor after too many wrong passwords, and only that visitor', async () => {
    fakeApi()
    for (let i = 0; i < MAX_FAILURES; i++) {
      const wrong = await signIn({ ...admin, password: 'wrong' }, visitor, database.db)
      expect(!wrong.ok && wrong.state.status === 'error' && wrong.state.message).toBe(
        'Email or password is incorrect.',
      )
    }

    const blocked = await signIn(admin, visitor, database.db)
    expect(!blocked.ok && blocked.state.status === 'error' && blocked.state.message).toMatch(
      /Too many failed sign-ins\. Try again in 15 minutes\./,
    )

    // Another visitor behind the same BFF is not affected.
    expect((await signIn(admin, 'another-visitor', database.db)).ok).toBe(true)
  })

  it('forgets failures older than the window and clears them on success', async () => {
    fakeApi()
    const longAgo = new Date(Date.now() - 16 * 60 * 1000)
    for (let i = 0; i < MAX_FAILURES; i++) await recordFailure(database.db, visitor, longAgo)

    expect((await signIn(admin, visitor, database.db)).ok).toBe(true)

    await recordFailure(database.db, visitor)
    await signIn(admin, visitor, database.db)
    const status = await checkThrottle(database.db, visitor)
    expect(status).toEqual({ blocked: false, retryAfterSeconds: 0 })
  })

  it('says the API is waking up when it cannot be reached', async () => {
    server.use(http.post(`${SCHEDULING_API}/api/auth/login`, () => HttpResponse.error()))

    const result = await signIn(admin, visitor, database.db)

    expect(!result.ok && result.state).toMatchObject({ status: 'error', transient: true })
    expect((await checkThrottle(database.db, visitor)).blocked).toBe(false)
  })

  it("explains the API's own rate limit", async () => {
    fakeApi({ loginStatus: 429 })

    const result = await signIn(admin, visitor, database.db)

    expect(!result.ok && result.state.status === 'error' && result.state.message).toMatch(/limiting sign-ins/)
  })
})
