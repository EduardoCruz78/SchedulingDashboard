import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getEnv } from '@/lib/env'
import { receiveWebhook } from '@/lib/webhooks/receiver'

/**
 * Receives signed webhooks from the WebhookRelay (subscription `appointment.*`). Public by design:
 * the signature is the authentication. The body is read as raw text, because the HMAC is computed
 * over the exact bytes sent; parsing first and re-serializing could change them.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const result = await receiveWebhook(rawBody, request.headers, {
    secret: getEnv().WEBHOOK_SECRET,
    db: getDb(),
  })
  if (result.status === 204) {
    return new NextResponse(null, { status: 204, headers: { 'x-duplicate': String(result.duplicate) } })
  }
  return NextResponse.json({ error: result.error }, { status: result.status })
}
