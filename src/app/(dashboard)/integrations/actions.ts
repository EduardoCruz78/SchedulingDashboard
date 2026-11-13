'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { relayClient } from '@/lib/api/clients'
import { call } from '@/lib/api/http'
import { ApiError } from '@/lib/api/problem'
import { requireAdmin } from '@/lib/auth/session'
import { canManageSubscriptions, canReplay, type DemoPolicy } from '@/lib/demo'
import { getEnv } from '@/lib/env'
import { type ActionState, failure, fromApiError, fromZodError, success } from '@/lib/forms'

const idSchema = z.uuid()

function policy(): DemoPolicy {
  const env = getEnv()
  return { demoMode: env.DEMO_MODE, ownSubscriptionId: env.RELAY_SUBSCRIPTION_ID }
}

async function relay<T>(run: () => Promise<T>, message: string): Promise<ActionState> {
  try {
    await run()
  } catch (error) {
    if (error instanceof ApiError) return fromApiError(error)
    throw error
  }
  refresh()
  return success(message)
}

/**
 * Replays a dead delivery. The rule is checked here, against the delivery as the relay reports it
 * now (never against what the page showed), so a crafted request cannot bypass demo mode.
 */
export async function replayDelivery(deliveryId: string): Promise<ActionState> {
  await requireAdmin()
  const id = idSchema.safeParse(deliveryId)
  if (!id.success) return fromZodError(id.error)

  const api = relayClient()
  let delivery
  try {
    delivery = await call(api.GET('/deliveries/{id}', { params: { path: { id: id.data } } }))
  } catch (error) {
    if (error instanceof ApiError) return fromApiError(error)
    throw error
  }
  const decision = canReplay(policy(), delivery)
  if (!decision.allowed) return failure(decision.reason)

  return relay(
    () => call(api.POST('/deliveries/{id}/replay', { params: { path: { id: id.data } } })),
    'Delivery queued again. The relay will retry it now.',
  )
}

export async function setSubscriptionActive(subscriptionId: string, isActive: boolean): Promise<ActionState> {
  await requireAdmin()
  const decision = canManageSubscriptions(policy())
  if (!decision.allowed) return failure(decision.reason)
  const id = idSchema.safeParse(subscriptionId)
  if (!id.success) return fromZodError(id.error)

  return relay(
    () =>
      call(
        relayClient().PATCH('/subscriptions/{id}', { params: { path: { id: id.data } }, body: { isActive } }),
      ),
    isActive ? 'Subscription activated.' : 'Subscription paused.',
  )
}
