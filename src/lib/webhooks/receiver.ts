import 'server-only'
import { Webhook, WebhookVerificationError } from 'standardwebhooks'
import { z } from 'zod'
import type { Database } from '@/lib/db'
import { receivedWebhooks } from '@/lib/db/schema'

/** Payloads bigger than this are refused before verification (the relay's events are a few KB). */
export const MAX_BODY_BYTES = 256 * 1024

/** What the WebhookRelay sends (see its docs/webhook-signature.md and domain/webhook-message.ts). */
const messageSchema = z.object({
  id: z.string(),
  type: z.string().min(1).max(200),
  source: z.string().optional(),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
  data: z.unknown(),
})

export type ReceiveResult = { status: 204; duplicate: boolean } | { status: 400 | 401 | 413; error: string }

/**
 * The webhook receiver, end to end:
 * 1. size limit, on the raw bytes;
 * 2. Standard Webhooks verification of the RAW body (HMAC-SHA256 over id.timestamp.body, constant-time
 *    comparison, timestamp within 5 minutes so a captured request cannot be replayed later);
 * 3. parse the JSON only after it is trusted;
 * 4. store with ON CONFLICT DO NOTHING on webhook-id: the relay delivers at least once, and a retry
 *    carries the same webhook-id, so a redelivery is acknowledged without a second row.
 */
export async function receiveWebhook(
  rawBody: string,
  headers: Headers,
  deps: { secret: string; db: Database },
): Promise<ReceiveResult> {
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return { status: 413, error: 'Payload too large.' }
  }

  const webhookId = headers.get('webhook-id')
  const timestamp = headers.get('webhook-timestamp')
  const signature = headers.get('webhook-signature')
  if (!webhookId || !timestamp || !signature) {
    return { status: 401, error: 'Missing Standard Webhooks headers.' }
  }

  try {
    new Webhook(deps.secret).verify(rawBody, {
      'webhook-id': webhookId,
      'webhook-timestamp': timestamp,
      'webhook-signature': signature,
    })
  } catch (error) {
    if (error instanceof WebhookVerificationError) return { status: 401, error: 'Invalid signature.' }
    throw error
  }

  let message: z.infer<typeof messageSchema>
  try {
    message = messageSchema.parse(JSON.parse(rawBody))
  } catch {
    return { status: 400, error: 'The body is not a WebhookRelay event.' }
  }

  const inserted = await deps.db
    .insert(receivedWebhooks)
    .values({
      webhookId,
      eventType: message.type,
      occurredAt: message.occurredAt ? new Date(message.occurredAt) : null,
      signedAt: new Date(Number(timestamp) * 1000),
      payload: message,
    })
    .onConflictDoNothing({ target: receivedWebhooks.webhookId })
    .returning({ webhookId: receivedWebhooks.webhookId })

  return { status: 204, duplicate: inserted.length === 0 }
}
