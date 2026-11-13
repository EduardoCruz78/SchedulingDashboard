import { delay, http, HttpResponse } from 'msw'
import { relayClient, schedulingClient } from '@/lib/api/clients'
import { call } from '@/lib/api/http'
import { ApiError } from '@/lib/api/problem'
import { setupMswServer } from '@test/support/msw'
import { RELAY_ADMIN_KEY, SCHEDULING_API, WEBHOOK_RELAY } from '@test/support/test-env'

const server = setupMswServer()

describe('schedulingClient', () => {
  it('sends the bearer token and returns typed data', async () => {
    let authorization: string | null = null
    server.use(
      http.get(`${SCHEDULING_API}/api/services`, ({ request }) => {
        authorization = request.headers.get('authorization')
        return HttpResponse.json({ items: [], page: 1, pageSize: 20, totalCount: 0 })
      }),
    )

    const result = await call(schedulingClient('jwt-123').GET('/api/services', {}))

    expect(authorization).toBe('Bearer jwt-123')
    expect(result.totalCount).toBe(0)
  })

  it('serializes query parameters', async () => {
    let url: URL | undefined
    server.use(
      http.get(`${SCHEDULING_API}/api/appointments`, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({ items: [], page: 1, pageSize: 50, totalCount: 0 })
      }),
    )

    await call(
      schedulingClient('t').GET('/api/appointments', {
        params: { query: { status: 'Scheduled', from: '2026-11-13T03:00:00Z', pageSize: 50 } },
      }),
    )

    expect(url?.searchParams.get('status')).toBe('Scheduled')
    expect(url?.searchParams.get('from')).toBe('2026-11-13T03:00:00Z')
    expect(url?.searchParams.get('pageSize')).toBe('50')
  })

  it('throws an ApiError with field errors on a validation ProblemDetails', async () => {
    server.use(
      http.post(`${SCHEDULING_API}/api/services`, () =>
        HttpResponse.json(
          { status: 400, detail: 'One or more fields are invalid.', errors: { Name: ['Required.'] } },
          { status: 400, headers: { 'content-type': 'application/problem+json' } },
        ),
      ),
    )

    const error = await call(
      schedulingClient('t').POST('/api/services', {
        body: { name: '', description: null, durationMinutes: 30, price: 10, isActive: true },
      }),
    ).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).kind).toBe('validation')
    expect((error as ApiError).fieldErrors).toEqual({ name: ['Required.'] })
  })

  it('turns a slow API into a transient timeout error', async () => {
    // UPSTREAM_TIMEOUT_MS is 1000 in tests; the fake API takes longer, like a Render service waking up.
    server.use(
      http.get(`${SCHEDULING_API}/api/auth/me`, async () => {
        await delay(3000)
        return HttpResponse.json({})
      }),
    )

    const error = await call(schedulingClient('t').GET('/api/auth/me')).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).kind).toBe('timeout')
    expect((error as ApiError).isTransient).toBe(true)
  })

  it('turns a network failure into a transient unavailable error', async () => {
    server.use(http.get(`${SCHEDULING_API}/api/auth/me`, () => HttpResponse.error()))

    const error = await call(schedulingClient('t').GET('/api/auth/me')).catch((e: unknown) => e)

    expect((error as ApiError).kind).toBe('unavailable')
  })
})

describe('relayClient', () => {
  it('authenticates with the admin key from the server environment', async () => {
    let authorization: string | null = null
    server.use(
      http.get(`${WEBHOOK_RELAY}/deliveries`, ({ request }) => {
        authorization = request.headers.get('authorization')
        return HttpResponse.json({ items: [], nextCursor: null })
      }),
    )

    const page = await call(
      relayClient().GET('/deliveries', { params: { query: { status: 'dead', limit: 10 } } }),
    )

    expect(authorization).toBe(`Bearer ${RELAY_ADMIN_KEY}`)
    expect(page.items).toEqual([])
  })
})
