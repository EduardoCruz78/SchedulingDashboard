// Subscribes the dashboard to appointment.* on the e2e WebhookRelay and writes the subscription's
// secret and id to e2e/.env.generated, which run.sh passes to the dashboard container.
// The relay generates the secret, so the dashboard can only start after this step.
import { writeFile } from 'node:fs/promises'

const RELAY = process.env.RELAY_URL ?? 'http://localhost:3300'
const SCHEDULING = process.env.SCHEDULING_URL ?? 'http://localhost:8380'
const ADMIN_KEY = 'e2e-admin-key-0123456789abcdefghijklmnop'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(what, probe, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      if (await probe()) return
    } catch {
      // not ready yet
    }
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`)
    await sleep(1000)
  }
}

await waitFor('WebhookRelay', () => fetch(`${RELAY}/health`).then((r) => r.ok))
await waitFor('SchedulingApi', () => fetch(`${SCHEDULING}/health`).then((r) => r.ok))

const response = await fetch(`${RELAY}/subscriptions`, {
  method: 'POST',
  headers: { authorization: `Bearer ${ADMIN_KEY}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    name: 'scheduling-dashboard',
    channel: 'webhook',
    target: 'http://dashboard:3000/api/webhooks/webhook-relay',
    eventTypes: ['appointment.*'],
  }),
})
if (!response.ok) throw new Error(`POST /subscriptions -> ${response.status}: ${await response.text()}`)
const subscription = await response.json()

await writeFile(
  new URL('./.env.generated', import.meta.url),
  `WEBHOOK_SECRET=${subscription.secret}\nRELAY_SUBSCRIPTION_ID=${subscription.id}\n`,
)
console.info(`- subscribed the dashboard to appointment.* (${subscription.id})`)
