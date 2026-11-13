import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ApiProblem } from '@/components/api-problem'
import { PageHeader } from '@/components/page-header'
import { SectionBoundary } from '@/components/section-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { deliveryStatuses } from '@/lib/api/types'
import { load } from '@/lib/data/load'
import { listDeliveries, listSubscriptions } from '@/lib/data/relay'
import { getEnv } from '@/lib/env'
import { DeliveriesTable } from './deliveries-table'
import { DeliveryFilters } from './delivery-filters'

export const metadata: Metadata = { title: 'Deliveries' }

export default function DeliveriesPage({ searchParams }: PageProps<'/integrations/deliveries'>) {
  return (
    <>
      <PageHeader
        title="Deliveries"
        description="Every event the WebhookRelay delivered (or is still trying to deliver) to a subscriber."
      />
      <SectionBoundary>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <Deliveries searchParams={searchParams} />
        </Suspense>
      </SectionBoundary>
    </>
  )
}

const uuid = /^[0-9a-f-]{36}$/i

async function Deliveries({ searchParams }: Pick<PageProps<'/integrations/deliveries'>, 'searchParams'>) {
  const params = await searchParams
  const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined)
  const status = deliveryStatuses.find((s) => s === one(params.status))
  const subscriptionRaw = one(params.subscription)
  const subscriptionId = subscriptionRaw && uuid.test(subscriptionRaw) ? subscriptionRaw : undefined
  const cursorRaw = one(params.cursor)
  const cursor = cursorRaw && cursorRaw.length <= 200 ? cursorRaw : undefined

  const [page, subscriptions] = await Promise.all([
    load(() => listDeliveries({ status, subscriptionId, cursor, limit: 20 })),
    load(listSubscriptions),
  ])
  if (!page.ok) return <ApiProblem problem={page.problem} />
  if (!subscriptions.ok) return <ApiProblem problem={subscriptions.problem} />

  const base = new URLSearchParams()
  if (status) base.set('status', status)
  if (subscriptionId) base.set('subscription', subscriptionId)
  const href = (c?: string) => {
    const q = new URLSearchParams(base)
    if (c) q.set('cursor', c)
    const s = q.toString()
    return s ? `/integrations/deliveries?${s}` : '/integrations/deliveries'
  }

  return (
    <>
      <DeliveryFilters
        status={status}
        subscriptionId={subscriptionId}
        subscriptions={subscriptions.data.items.map((s) => ({ id: s.id, name: s.name }))}
      />
      <DeliveriesTable
        deliveries={page.data.items}
        subscriptionNames={Object.fromEntries(subscriptions.data.items.map((s) => [s.id, s.name]))}
        timeZone={getEnv().BUSINESS_TIME_ZONE}
        nextHref={page.data.nextCursor ? href(page.data.nextCursor) : null}
        firstHref={cursor ? href() : null}
      />
    </>
  )
}
