import { delay, http, HttpResponse } from 'msw'
import { setupMswServer } from '@test/support/msw'
import {
  fakeCookies,
  jar,
  RedirectError,
  refreshed,
  resetRequest,
  signInAs,
} from '@test/support/next-request'
import { SCHEDULING_API } from '@test/support/test-env'

vi.mock('next/headers', () => ({ cookies: fakeCookies, headers: async () => new Headers() }))
vi.mock('next/server', () => ({ connection: async () => undefined }))
vi.mock('next/cache', () => ({
  refresh: () => {
    refreshed.count += 1
  },
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new RedirectError(url)
  },
}))

const { cancelAppointment, completeAppointment } = await import('@/app/(dashboard)/schedule/actions')

const server = setupMswServer()
const id = '01a1d1f5-7bf5-7691-b3da-67589fbc729a'

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [k, v] of Object.entries(values)) data.set(k, v)
  return data
}

beforeEach(async () => {
  resetRequest()
  await signInAs()
})

describe('schedule Server Actions against a fake SchedulingApi', () => {
  it('cancels with the reason, using the session token, and refreshes the page', async () => {
    let body: unknown
    let authorization: string | null = null
    server.use(
      http.post(`${SCHEDULING_API}/api/appointments/:id/cancel`, async ({ request }) => {
        authorization = request.headers.get('authorization')
        body = await request.json()
        return HttpResponse.json({})
      }),
    )

    const result = await cancelAppointment(
      { status: 'idle' },
      form({ appointmentId: id, reason: 'Sick day' }),
    )

    expect(result).toEqual({ status: 'success', message: 'Appointment cancelled.' })
    expect(authorization).toBe('Bearer jwt-admin')
    expect(body).toEqual({ reason: 'Sick day' })
    expect(refreshed.count).toBe(1)
  })

  it('validates before calling the API', async () => {
    const result = await cancelAppointment({ status: 'idle' }, form({ appointmentId: id, reason: ' ' }))
    expect(result).toMatchObject({
      status: 'error',
      fieldErrors: { reason: [expect.stringMatching(/3 characters/)] },
    })
    expect(refreshed.count).toBe(0)
  })

  it("shows the API's business rule message (422) without refreshing", async () => {
    server.use(
      http.post(`${SCHEDULING_API}/api/appointments/:id/cancel`, () =>
        HttpResponse.json(
          { status: 422, detail: 'Appointments can only be cancelled up to 2 hours before they start.' },
          { status: 422 },
        ),
      ),
    )

    const result = await cancelAppointment({ status: 'idle' }, form({ appointmentId: id, reason: 'Late' }))

    expect(result).toMatchObject({
      status: 'error',
      message: 'Appointments can only be cancelled up to 2 hours before they start.',
    })
    expect(refreshed.count).toBe(0)
  })

  it('turns a 409 conflict into its message', async () => {
    server.use(
      http.post(`${SCHEDULING_API}/api/appointments/:id/complete`, () =>
        HttpResponse.json({ status: 409, detail: 'The appointment changed meanwhile.' }, { status: 409 }),
      ),
    )
    expect(await completeAppointment(id)).toMatchObject({
      status: 'error',
      message: 'The appointment changed meanwhile.',
    })
  })

  it('clears the session and goes to the login page when the API answers 401', async () => {
    server.use(
      http.post(
        `${SCHEDULING_API}/api/appointments/:id/complete`,
        () => new HttpResponse(null, { status: 401 }),
      ),
    )

    await expect(completeAppointment(id)).rejects.toMatchObject({ url: '/login?reason=expired' })
    expect(jar.has('sd_session')).toBe(false)
  })

  it('reports a sleeping API as transient', async () => {
    server.use(
      http.post(`${SCHEDULING_API}/api/appointments/:id/complete`, async () => {
        await delay(3000)
        return HttpResponse.json({})
      }),
    )
    expect(await completeAppointment(id)).toMatchObject({ status: 'error', transient: true })
  })

  it('refuses to act without a session (the action is a public endpoint)', async () => {
    resetRequest()
    await expect(completeAppointment(id)).rejects.toMatchObject({ url: '/login' })
  })

  it('refuses a non-admin session', async () => {
    resetRequest()
    await signInAs({
      accessToken: 'jwt-customer',
      expiresAt: '2099-01-01T00:00:00Z',
      user: { id: 'c1', name: 'Customer', email: 'c@x.test', role: 'Customer' },
    })
    await expect(completeAppointment(id)).rejects.toMatchObject({ url: '/auth/signout?reason=forbidden' })
  })
})
