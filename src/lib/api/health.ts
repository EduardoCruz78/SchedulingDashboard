import 'server-only'
import { connection } from 'next/server'
import { getEnv } from '@/lib/env'

export type ServiceState = 'up' | 'down'

export interface ApiHealth {
  scheduling: ServiceState
  relay: ServiceState
  checkedAt: string
}

async function ping(url: string, timeoutMs: number): Promise<ServiceState> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' })
    return response.ok ? 'up' : 'down'
  } catch {
    return 'down'
  }
}

/**
 * Pings both APIs' /health. A long timeout doubles as a warm-up: the login page calls this as soon as
 * it opens, so a sleeping Render service is already waking while the admin types the password.
 */
export async function checkApiHealth(timeoutMs: number): Promise<ApiHealth> {
  await connection() // live status: never prerendered
  const env = getEnv()
  const [scheduling, relay] = await Promise.all([
    ping(`${env.SCHEDULING_API_URL}/health`, timeoutMs),
    ping(`${env.WEBHOOK_RELAY_URL}/health`, timeoutMs),
  ])
  return { scheduling, relay, checkedAt: new Date().toISOString() }
}
