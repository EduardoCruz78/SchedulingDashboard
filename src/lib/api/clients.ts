import 'server-only'
import createClient from 'openapi-fetch'
import { getEnv } from '@/lib/env'
import type { paths as SchedulingPaths } from './generated/scheduling'
import type { paths as RelayPaths } from './generated/webhook-relay'
import { fetchWithTimeout } from './http'

export type SchedulingClient = ReturnType<typeof createClient<SchedulingPaths>>
export type RelayClient = ReturnType<typeof createClient<RelayPaths>>

/**
 * SchedulingApi client. `accessToken` is the admin's JWT, read from the encrypted session cookie on
 * the server; it never reaches the browser.
 */
export function schedulingClient(accessToken: string | null): SchedulingClient {
  const env = getEnv()
  return createClient<SchedulingPaths>({
    baseUrl: env.SCHEDULING_API_URL,
    fetch: fetchWithTimeout(env.UPSTREAM_TIMEOUT_MS),
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
}

/** WebhookRelay client, authenticated with the admin key. Server-only: the key is never sent to the browser. */
export function relayClient(): RelayClient {
  const env = getEnv()
  return createClient<RelayPaths>({
    baseUrl: env.WEBHOOK_RELAY_URL,
    fetch: fetchWithTimeout(env.UPSTREAM_TIMEOUT_MS),
    headers: { Authorization: `Bearer ${env.WEBHOOK_RELAY_ADMIN_KEY}` },
  })
}
