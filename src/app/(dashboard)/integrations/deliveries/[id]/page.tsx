import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { ApiProblem } from '@/components/api-problem'
import { SectionBoundary } from '@/components/section-boundary'
import { StatusDot } from '@/components/status-dot'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { load } from '@/lib/data/load'
import { getDelivery, listAttempts, listSubscriptions } from '@/lib/data/relay'
import { canReplay } from '@/lib/demo'
import { getEnv } from '@/lib/env'
import { formatDateTime } from '@/lib/time'
import { DeliveryStatusLabel } from '../deliveries-table'
import { ReplayButton } from './replay-button'

export const metadata: Metadata = { title: 'Delivery' }

export default function DeliveryPage({ params }: PageProps<'/integrations/deliveries/[id]'>) {
  return (
    <>
      <Link
        href="/integrations/deliveries"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden /> Deliveries
      </Link>
      <SectionBoundary>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <DeliveryDetail params={params} />
        </Suspense>
      </SectionBoundary>
    </>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm break-all">{children}</dd>
    </div>
  )
}

async function DeliveryDetail({ params }: Pick<PageProps<'/integrations/deliveries/[id]'>, 'params'>) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [delivery, attempts, subscriptions] = await Promise.all([
    load(() => getDelivery(id)),
    load(() => listAttempts(id)),
    load(listSubscriptions),
  ])
  if (!delivery.ok) {
    if (delivery.problem.kind === 'not-found') notFound()
    return <ApiProblem problem={delivery.problem} />
  }
  if (!attempts.ok) return <ApiProblem problem={attempts.problem} />

  const env = getEnv()
  const d = delivery.data
  const subscription = subscriptions.ok
    ? subscriptions.data.items.find((s) => s.id === d.subscriptionId)
    : undefined
  const decision = canReplay({ demoMode: env.DEMO_MODE, ownSubscriptionId: env.RELAY_SUBSCRIPTION_ID }, d)
  const tz = env.BUSINESS_TIME_ZONE

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Delivery</h1>
          <p className="text-muted-foreground font-mono text-xs">{d.id}</p>
        </div>
        {d.status === 'dead' ? (
          <ReplayButton deliveryId={d.id} disabledReason={decision.allowed ? null : decision.reason} />
        ) : null}
      </div>
      <Card>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Status">
              <DeliveryStatusLabel status={d.status} />
            </Fact>
            <Fact label="Subscription">
              {subscription ? `${subscription.name} (${subscription.target})` : d.subscriptionId}
            </Fact>
            <Fact label="Event">
              <span className="font-mono text-xs">{d.eventId}</span>
            </Fact>
            <Fact label="Created">{formatDateTime(d.createdAt, tz)}</Fact>
            <Fact label="Attempts">{d.attempts}</Fact>
            <Fact label="Next attempt">{d.nextAttemptAt ? formatDateTime(d.nextAttemptAt, tz) : '—'}</Fact>
            <Fact label="Last error">{d.lastError ?? '—'}</Fact>
            <Fact label="Updated">{formatDateTime(d.updatedAt, tz)}</Fact>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Attempts</h2>
          </CardTitle>
          <CardDescription>Each HTTP call the relay made, oldest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {attempts.data.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No attempts yet.</p>
          ) : (
            <ol className="relative grid gap-4 border-l pl-6">
              {attempts.data.items.map((a) => {
                const ok = a.httpStatus !== null && a.httpStatus >= 200 && a.httpStatus < 300
                return (
                  <li key={a.attemptNumber} className="relative">
                    <StatusDot
                      tone={ok ? 'ok' : 'error'}
                      className="absolute top-1.5 -left-[29px] size-2.5"
                    />
                    <p className="text-sm font-medium">
                      Attempt {a.attemptNumber} ·{' '}
                      {a.httpStatus === null ? 'no response' : `HTTP ${a.httpStatus}`} ·{' '}
                      <span className="tabular-nums">{a.durationMs} ms</span>
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {formatDateTime(a.startedAt, tz)}
                    </p>
                    {a.error ? <p className="text-destructive mt-1 text-xs">{a.error}</p> : null}
                    {a.responseSnippet ? (
                      <pre className="bg-muted mt-2 max-h-40 overflow-auto rounded-md p-2 text-xs whitespace-pre-wrap">
                        {a.responseSnippet}
                      </pre>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
