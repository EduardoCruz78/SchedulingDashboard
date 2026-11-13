/**
 * Demo mode (DEMO_MODE=true on the public deployment). The SchedulingApi demo credentials are public,
 * so anyone can sign in. The WebhookRelay admin key is not public, but the dashboard holds it, so
 * without these rules any visitor could use the dashboard to make the relay send requests: create a
 * subscription to any URL and replay deliveries at will. In demo mode the relay is read-only, except
 * replaying deliveries of the dashboard's own subscription (which can only reach this dashboard).
 *
 * Enforced in the Server Actions, not only by hiding buttons: an action is a public endpoint.
 */

export interface DemoPolicy {
  demoMode: boolean
  ownSubscriptionId: string | undefined
}

export type Decision = { allowed: true } | { allowed: false; reason: string }

const allowed: Decision = { allowed: true }

export function canReplay(
  policy: DemoPolicy,
  delivery: { status: string; subscriptionId: string },
): Decision {
  if (delivery.status !== 'dead') {
    return { allowed: false, reason: 'Only dead deliveries can be replayed.' }
  }
  if (!policy.demoMode) return allowed
  if (policy.ownSubscriptionId && delivery.subscriptionId === policy.ownSubscriptionId) return allowed
  return {
    allowed: false,
    reason: "Public demo: only deliveries to this dashboard's own subscription can be replayed.",
  }
}

export function canManageSubscriptions(policy: DemoPolicy): Decision {
  return policy.demoMode
    ? { allowed: false, reason: 'Public demo: relay subscriptions are read-only.' }
    : allowed
}
