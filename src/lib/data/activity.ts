import 'server-only'
import { desc } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { receivedWebhooks } from '@/lib/db/schema'

/** A received webhook as the feed shows it (serializable: it crosses to a Client Component). */
export interface ActivityItem {
  webhookId: string
  eventType: string
  occurredAt: string | null
  signedAt: string
  receivedAt: string
  payload: unknown
}

/** Newest first. Callers check the session (the page through requireAdmin, the route by itself). */
export async function listActivity(limit = 50): Promise<ActivityItem[]> {
  const rows = await getDb()
    .select()
    .from(receivedWebhooks)
    .orderBy(desc(receivedWebhooks.receivedAt))
    .limit(limit)
  return rows.map((r) => ({
    webhookId: r.webhookId,
    eventType: r.eventType,
    occurredAt: r.occurredAt?.toISOString() ?? null,
    signedAt: r.signedAt.toISOString(),
    receivedAt: r.receivedAt.toISOString(),
    payload: r.payload,
  }))
}
