import 'server-only'
import { relayClient } from '@/lib/api/clients'
import { call } from '@/lib/api/http'
import type { Delivery, DeliveryStatus } from '@/lib/api/types'
import { requireAdmin } from '@/lib/auth/session'

/**
 * WebhookRelay reads. The admin key is server-side configuration, but the dashboard still requires an
 * admin session for every call: the key must never act on behalf of an anonymous visitor.
 */
async function client() {
  await requireAdmin()
  return relayClient()
}

export async function listDeliveries(query: {
  status?: DeliveryStatus | undefined
  subscriptionId?: string | undefined
  cursor?: string | undefined
  limit?: number
}) {
  const api = await client()
  return call(api.GET('/deliveries', { params: { query: { ...query, limit: query.limit ?? 20 } } }))
}

/** Deliveries created since `since` (newest first), following the cursor; capped at 500. */
export async function listDeliveriesSince(since: Date): Promise<Delivery[]> {
  const api = await client()
  const items: Delivery[] = []
  let cursor: string | undefined
  for (let page = 0; page < 5; page++) {
    const result = await call(api.GET('/deliveries', { params: { query: { limit: 100, cursor } } }))
    for (const delivery of result.items) {
      if (new Date(delivery.createdAt) < since) return items
      items.push(delivery)
    }
    if (!result.nextCursor) break
    cursor = result.nextCursor
  }
  return items
}

export async function getDelivery(id: string) {
  const api = await client()
  return call(api.GET('/deliveries/{id}', { params: { path: { id } } }))
}

export async function listAttempts(id: string) {
  const api = await client()
  return call(api.GET('/deliveries/{id}/attempts', { params: { path: { id } } }))
}

export async function listSubscriptions() {
  const api = await client()
  return call(api.GET('/subscriptions'))
}
