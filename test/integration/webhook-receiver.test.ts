import { randomUUID } from 'node:crypto'
import { Webhook } from 'standardwebhooks'
import { createTestDatabase } from '@test/support/database'
import { WEBHOOK_SECRET } from '@test/support/test-env'

// The route reads DATABASE_URL through getEnv(); point it at this file's own database before importing.
const database = await createTestDatabase()
process.env.DATABASE_URL = database.url
const { POST } = await import('@/app/api/webhooks/webhook-relay/route')
const { receivedWebhooks } = await import('@/lib/db/schema')

afterAll(async () => {
  await database.close()
})
beforeEach(async () => {
  await database.reset()
})
afterEach(() => {
  vi.useRealTimers()
})

const signer = new Webhook(WEBHOOK_SECRET)

/** Signs exactly like the WebhookRelay: Standard Webhooks headers over the raw body. */
function signedRequest(options: { id?: string; at?: Date; body?: string; secret?: string } = {}) {
  const id = options.id ?? randomUUID()
  const at = options.at ?? new Date()
  const body =
    options.body ??
    JSON.stringify({
      id,
      type: 'appointment.created',
      source: 'scheduling-api',
      occurredAt: '2026-11-13T12:00:00.000Z',
      data: { appointmentId: 'a1', startsAt: '2026-11-14T13:00:00Z' },
    })
  const signature = new Webhook(options.secret ?? WEBHOOK_SECRET).sign(id, at, body)
  return new Request('http://localhost/api/webhooks/webhook-relay', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': String(Math.floor(at.getTime() / 1000)),
      'webhook-signature': signature,
    },
    body,
  })
}

const rows = () => database.db.select().from(receivedWebhooks)

describe('POST /api/webhooks/webhook-relay (real Postgres)', () => {
  it('stores a correctly signed webhook and answers 204', async () => {
    const response = await POST(signedRequest({ id: 'evt-1' }))

    expect(response.status).toBe(204)
    const stored = await rows()
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      webhookId: 'evt-1',
      eventType: 'appointment.created',
      occurredAt: new Date('2026-11-13T12:00:00.000Z'),
    })
    expect(stored[0]?.payload).toMatchObject({ data: { appointmentId: 'a1' } })
  })

  it('rejects a signature made with another secret (401) and stores nothing', async () => {
    const response = await POST(
      signedRequest({ secret: 'whsec_' + Buffer.from('not-the-secret-0123456789').toString('base64') }),
    )

    expect(response.status).toBe(401)
    expect(await rows()).toHaveLength(0)
  })

  it('rejects a body changed after signing', async () => {
    const original = signedRequest({ id: 'evt-2' })
    const tampered = new Request(original.url, {
      method: 'POST',
      headers: original.headers,
      body: (await original.text()).replace('appointment.created', 'appointment.cancelled'),
    })

    expect((await POST(tampered)).status).toBe(401)
  })

  it('does not store a redelivery twice (same webhook-id, new signature)', async () => {
    expect((await POST(signedRequest({ id: 'evt-3' }))).status).toBe(204)
    const again = await POST(signedRequest({ id: 'evt-3' }))

    expect(again.status).toBe(204)
    expect(again.headers.get('x-duplicate')).toBe('true')
    expect(await rows()).toHaveLength(1)
  })

  it('refuses a replayed request whose timestamp is older than 5 minutes', async () => {
    const captured = signedRequest({ id: 'evt-4', at: new Date('2026-11-13T12:00:00Z') })
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-13T12:06:00Z') })

    expect((await POST(captured)).status).toBe(401)
    expect(await rows()).toHaveLength(0)
  })

  it('accepts a request signed 4 minutes ago (clock skew tolerance)', async () => {
    const request = signedRequest({ id: 'evt-5', at: new Date('2026-11-13T12:00:00Z') })
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-13T12:04:00Z') })

    expect((await POST(request)).status).toBe(204)
  })

  it('answers 401 without the Standard Webhooks headers', async () => {
    const response = await POST(new Request('http://localhost/x', { method: 'POST', body: '{}' }))
    expect(response.status).toBe(401)
  })

  it('answers 400 to a signed body that is not a relay event', async () => {
    expect((await POST(signedRequest({ body: '{"hello":"world"}' }))).status).toBe(400)
  })

  it('refuses oversized payloads before verifying', async () => {
    expect((await POST(signedRequest({ body: 'x'.repeat(300 * 1024) }))).status).toBe(413)
  })

  it('accepts the relay signing with two secrets during a rotation', async () => {
    const id = 'evt-6'
    const at = new Date()
    const body = JSON.stringify({ id, type: 'appointment.cancelled', data: {} })
    const old = signer.sign(id, at, body)
    const other = new Webhook(
      'whsec_' + Buffer.from('rotated-secret-0123456789abcdef').toString('base64'),
    ).sign(id, at, body)
    const request = new Request('http://localhost/x', {
      method: 'POST',
      headers: {
        'webhook-id': id,
        'webhook-timestamp': String(Math.floor(at.getTime() / 1000)),
        'webhook-signature': `${other} ${old}`,
      },
      body,
    })

    expect((await POST(request)).status).toBe(204)
  })
})
