import { http, HttpResponse } from 'msw'
import { setupMswServer } from '@test/support/msw'
import { fakeCookies, RedirectError, refreshed, resetRequest, signInAs } from '@test/support/next-request'
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

const { saveService, setServiceActive } = await import('@/app/(dashboard)/services/actions')
const { addTimeOff, saveWorkingHours } = await import('@/app/(dashboard)/professionals/actions')

const server = setupMswServer()
const idle = { status: 'idle' } as const
const proId = '01a1d1f5-77ad-7948-93ec-9c46a7ae2409'
const svcId = '01a1d1f5-77ad-7995-9549-f55245287d4c'

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [k, v] of Object.entries(values)) data.set(k, v)
  return data
}

beforeEach(async () => {
  resetRequest()
  await signInAs()
})

describe('services', () => {
  it('creates a service with typed values', async () => {
    let body: unknown
    server.use(
      http.post(`${SCHEDULING_API}/api/services`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({}, { status: 201 })
      }),
    )

    const result = await saveService(
      idle,
      form({ name: 'Shave', description: '', durationMinutes: '30', price: '45.5', isActive: 'on' }),
    )

    expect(result).toEqual({ status: 'success', message: 'Service created.' })
    expect(body).toEqual({
      name: 'Shave',
      description: null,
      durationMinutes: 30,
      price: 45.5,
      isActive: true,
    })
  })

  it("puts the API's field errors on the form fields", async () => {
    server.use(
      http.put(`${SCHEDULING_API}/api/services/:id`, () =>
        HttpResponse.json(
          { status: 400, detail: 'One or more fields are invalid.', errors: { Name: ['Name is taken.'] } },
          { status: 400 },
        ),
      ),
    )

    const result = await saveService(
      idle,
      form({ id: svcId, name: 'Haircut', description: '', durationMinutes: '30', price: '50' }),
    )

    expect(result).toMatchObject({ status: 'error', fieldErrors: { name: ['Name is taken.'] } })
    expect(refreshed.count).toBe(0)
  })

  it('deactivates with DELETE (the API soft-deletes)', async () => {
    let deleted = false
    server.use(
      http.delete(`${SCHEDULING_API}/api/services/:id`, () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    expect(await setServiceActive(svcId, false)).toMatchObject({ status: 'success' })
    expect(deleted).toBe(true)
  })
})

describe('professionals', () => {
  it('sends working hours and maps API errors like Intervals[1].End to the editor rows', async () => {
    let body: unknown
    server.use(
      http.put(`${SCHEDULING_API}/api/professionals/:id/working-hours`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          { status: 400, errors: { 'Intervals[1].End': ['Outside business hours.'] } },
          { status: 400 },
        )
      }),
    )
    const intervals = [
      { day: 'Monday', start: '09:00', end: '12:00' },
      { day: 'Monday', start: '13:00', end: '23:00' },
    ]

    const result = await saveWorkingHours(idle, form({ id: proId, intervals: JSON.stringify(intervals) }))

    expect(body).toEqual({ intervals })
    expect(result).toMatchObject({ fieldErrors: { 'intervals.1.end': ['Outside business hours.'] } })
  })

  it('catches overlapping intervals before calling the API', async () => {
    const result = await saveWorkingHours(
      idle,
      form({
        id: proId,
        intervals: JSON.stringify([
          { day: 'Monday', start: '09:00', end: '13:00' },
          { day: 'Monday', start: '12:00', end: '18:00' },
        ]),
      }),
    )
    expect(result).toMatchObject({
      fieldErrors: { 'intervals.1.start': [expect.stringMatching(/Overlaps/)] },
    })
  })

  it('converts time off typed in the business time zone to UTC', async () => {
    let body: unknown
    server.use(
      http.post(`${SCHEDULING_API}/api/professionals/:id/time-off`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({}, { status: 201 })
      }),
    )

    await addTimeOff(
      idle,
      form({ id: proId, startsAt: '2026-11-20T09:00', endsAt: '2026-11-20T12:30', reason: '' }),
    )

    expect(body).toEqual({
      startsAt: '2026-11-20T12:00:00.000Z',
      endsAt: '2026-11-20T15:30:00.000Z',
      reason: null,
    })
  })
})
