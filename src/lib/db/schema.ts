import { bigserial, index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Webhooks the WebhookRelay delivered to this dashboard. Only verified deliveries are stored (a bad
 * signature is answered with 401 before anything is written). `webhook_id` is the Standard Webhooks
 * `webhook-id` header: the same on every retry, so a redelivery is ignored (ON CONFLICT DO NOTHING).
 */
export const receivedWebhooks = pgTable(
  'received_webhooks',
  {
    webhookId: text('webhook_id').primaryKey(),
    eventType: text('event_type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }),
    signedAt: timestamp('signed_at', { withTimezone: true }).notNull(),
    payload: jsonb('payload').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('received_webhooks_received_at_idx').on(t.receivedAt.desc())],
)

/**
 * Failed sign-ins per visitor, for rate limiting in the BFF. Behind the BFF every login reaches the
 * SchedulingApi from Vercel's IPs, so its per-IP limit cannot tell visitors apart; this table can.
 * The IP is stored as an HMAC (keyed with SESSION_SECRET), never in clear text.
 */
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    clientKey: text('client_key').notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('login_attempts_client_key_attempted_at_idx').on(t.clientKey, t.attemptedAt)],
)
