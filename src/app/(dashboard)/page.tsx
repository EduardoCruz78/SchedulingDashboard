import type { Metadata } from 'next'
import { cache, Suspense } from 'react'
import { ApiProblem } from '@/components/api-problem'
import { StatusChart } from '@/components/charts/status-chart'
import { PageHeader } from '@/components/page-header'
import { SectionBoundary } from '@/components/section-boundary'
import { StatusDot } from '@/components/status-dot'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { checkApiHealth } from '@/lib/api/health'
import { businessToday } from '@/lib/data/clock'
import { load } from '@/lib/data/load'
import { listDeliveriesSince } from '@/lib/data/relay'
import { listAppointments } from '@/lib/data/scheduling'
import { appointmentsOn, countByStatus, dailyStatusSeries, deliveryHealth, noShowRate } from '@/lib/overview'
import { addDays, dayRange, formatLocalDate, formatTime } from '@/lib/time'

export const metadata: Metadata = { title: 'Overview' }

const PAST_DAYS = 30
const NEXT_DAYS = 14

/**
 * One API read shared by the KPI cards and the chart (React `cache` dedupes it within a request).
 * Nothing is cached across requests: an admin dashboard must show what is true now.
 */
const loadAppointmentWindow = cache(async () => {
  const { today, timeZone, now } = await businessToday()
  const from = dayRange(addDays(today, -PAST_DAYS), timeZone).from
  const to = dayRange(addDays(today, NEXT_DAYS - 1), timeZone).to
  return { today, timeZone, now, result: await load(() => listAppointments({ from, to })) }
})

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description={
          <Suspense fallback={<Skeleton className="h-4 w-56" />}>
            <TodayLabel />
          </Suspense>
        }
      />
      <div className="grid gap-4">
        <SectionBoundary>
          <Suspense fallback={<KpiSkeleton />}>
            <Kpis />
          </Suspense>
        </SectionBoundary>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Next {NEXT_DAYS} days</h2>
            </CardTitle>
            <CardDescription>Appointments per day, by status.</CardDescription>
          </CardHeader>
          <CardContent>
            <SectionBoundary>
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <UpcomingChart />
              </Suspense>
            </SectionBoundary>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Webhook deliveries, last 24 h</h2>
              </CardTitle>
              <CardDescription>Events the WebhookRelay delivered to subscribers.</CardDescription>
            </CardHeader>
            <CardContent>
              <SectionBoundary>
                <Suspense fallback={<Skeleton className="h-24 w-full" />}>
                  <DeliveriesCard />
                </Suspense>
              </SectionBoundary>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>API status</h2>
              </CardTitle>
              <CardDescription>Health checks of the two services behind this dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-16 w-full" />}>
                <ApiStatus />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

async function TodayLabel() {
  const { today, timeZone } = await businessToday()
  return (
    <>
      {formatLocalDate(today, 'long')} · times in {timeZone.replace('_', ' ')}
    </>
  )
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  )
}

function Kpi({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        {detail ? <p className="text-muted-foreground text-xs">{detail}</p> : null}
      </CardHeader>
    </Card>
  )
}

const percent = (value: number | null) => (value === null ? '—' : `${Math.round(value * 100)}%`)

async function Kpis() {
  const { today, timeZone, now: clock, result } = await loadAppointmentWindow()
  if (!result.ok) return <ApiProblem problem={result.problem} />

  const now = clock.getTime()
  const todays = appointmentsOn(result.data, today, timeZone)
  const counts = countByStatus(todays)
  const next = todays
    .filter((a) => a.status === 'Scheduled' && new Date(a.startsAt).getTime() > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  const past = result.data.filter((a) => new Date(a.startsAt).getTime() <= now)
  const monthRate = noShowRate(countByStatus(past))

  return (
    <section aria-label="Today" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi
        label="Scheduled today"
        value={String(counts.Scheduled)}
        detail={next ? `Next at ${formatTime(next.startsAt, timeZone)}` : 'Nothing else today'}
      />
      <Kpi label="Completed today" value={String(counts.Completed)} />
      <Kpi label="Cancelled today" value={String(counts.Cancelled)} />
      <Kpi
        label="No-show rate"
        value={percent(noShowRate(counts))}
        detail={
          monthRate === null
            ? `Today · no finished appointments in the last ${PAST_DAYS} days`
            : `Today · ${percent(monthRate)} over the last ${PAST_DAYS} days`
        }
      />
    </section>
  )
}

async function UpcomingChart() {
  const { today, timeZone, result } = await loadAppointmentWindow()
  if (!result.ok) return <ApiProblem problem={result.problem} />
  return <StatusChart rows={dailyStatusSeries(result.data, today, NEXT_DAYS, timeZone)} />
}

async function DeliveriesCard() {
  const { now } = await businessToday()
  const result = await load(() => listDeliveriesSince(new Date(now.getTime() - 24 * 3_600_000)))
  if (!result.ok) return <ApiProblem problem={result.problem} />

  const health = deliveryHealth(result.data)
  const items = [
    { label: 'Succeeded', value: health.byStatus.succeeded, tone: 'ok' as const },
    { label: 'Retrying', value: health.byStatus.pending + health.byStatus.failed, tone: 'warn' as const },
    { label: 'Dead', value: health.byStatus.dead, tone: 'error' as const },
  ]
  return (
    <div className="space-y-3">
      <p className="text-3xl font-semibold tabular-nums">
        {percent(health.successRate)}
        <span className="text-muted-foreground ml-2 text-sm font-normal">
          success · {health.total} deliveries
        </span>
      </p>
      <ul className="flex flex-wrap gap-4 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <StatusDot tone={item.value > 0 ? item.tone : 'muted'} />
            {item.label}: <span className="font-medium tabular-nums">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

async function ApiStatus() {
  const health = await checkApiHealth(8_000)
  const services = [
    { name: 'SchedulingApi', state: health.scheduling },
    { name: 'WebhookRelay', state: health.relay },
  ]
  return (
    <ul className="space-y-2 text-sm">
      {services.map((s) => (
        <li key={s.name} className="flex items-center gap-2">
          <StatusDot tone={s.state === 'up' ? 'ok' : 'warn'} />
          <span className="font-medium">{s.name}</span>
          <span className="text-muted-foreground">
            {s.state === 'up' ? 'Healthy' : 'Not answering (may be waking up)'}
          </span>
        </li>
      ))}
    </ul>
  )
}
