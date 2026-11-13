import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Info } from 'lucide-react'
import { ApiProblem } from '@/components/api-problem'
import { PageHeader } from '@/components/page-header'
import { SectionBoundary } from '@/components/section-boundary'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { load } from '@/lib/data/load'
import { listSubscriptions } from '@/lib/data/relay'
import { canManageSubscriptions } from '@/lib/demo'
import { getEnv } from '@/lib/env'
import { formatDateTime } from '@/lib/time'
import { SubscriptionToggle } from './subscription-toggle'

export const metadata: Metadata = { title: 'Subscriptions' }

export default function SubscriptionsPage() {
  return (
    <>
      <PageHeader title="Subscriptions" description="Who receives which events from the WebhookRelay." />
      <SectionBoundary>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <Subscriptions />
        </Suspense>
      </SectionBoundary>
    </>
  )
}

async function Subscriptions() {
  const result = await load(listSubscriptions)
  if (!result.ok) return <ApiProblem problem={result.problem} />
  const env = getEnv()
  const manage = canManageSubscriptions({
    demoMode: env.DEMO_MODE,
    ownSubscriptionId: env.RELAY_SUBSCRIPTION_ID,
  })

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {!manage.allowed ? (
        <Alert>
          <Info aria-hidden />
          <AlertDescription>
            {manage.reason} Anyone can sign in to the public demo, so changes that would make the relay send
            requests elsewhere are disabled.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  {s.name}
                  {s.id === env.RELAY_SUBSCRIPTION_ID ? (
                    <Badge variant="outline" className="ml-2">
                      This dashboard
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>{s.channel}</TableCell>
                <TableCell className="max-w-72 truncate font-mono text-xs" title={s.target}>
                  {s.target}
                </TableCell>
                <TableCell className="font-mono text-xs">{s.eventTypes.join(', ')}</TableCell>
                <TableCell className="tabular-nums">
                  {formatDateTime(s.createdAt, env.BUSINESS_TIME_ZONE)}
                </TableCell>
                <TableCell>
                  {manage.allowed ? (
                    <SubscriptionToggle id={s.id} name={s.name} isActive={s.isActive} />
                  ) : s.isActive ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Paused</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
