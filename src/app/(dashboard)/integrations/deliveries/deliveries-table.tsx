import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { StatusDot } from '@/components/status-dot'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Delivery, DeliveryStatus } from '@/lib/api/types'
import { formatDateTime } from '@/lib/time'

export const deliveryStatusView: Record<
  DeliveryStatus,
  { label: string; tone: 'ok' | 'warn' | 'error' | 'pending' }
> = {
  pending: { label: 'Pending', tone: 'pending' },
  failed: { label: 'Retrying', tone: 'warn' },
  succeeded: { label: 'Succeeded', tone: 'ok' },
  dead: { label: 'Dead', tone: 'error' },
}

/** Status is always icon + text, never color alone. */
export function DeliveryStatusLabel({ status }: { status: DeliveryStatus }) {
  const view = deliveryStatusView[status]
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <StatusDot tone={view.tone} />
      {view.label}
    </span>
  )
}

/** Presentational: the page fetches; this renders (and is tested on its own). */
export function DeliveriesTable({
  deliveries,
  subscriptionNames,
  timeZone,
  nextHref,
  firstHref,
}: {
  deliveries: Delivery[]
  subscriptionNames: Record<string, string>
  timeZone: string
  nextHref: string | null
  firstHref: string | null
}) {
  return (
    <div className="rounded-lg border">
      {deliveries.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">No deliveries match these filters.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Attempts</TableHead>
              <TableHead>Last error</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="tabular-nums">{formatDateTime(d.createdAt, timeZone)}</TableCell>
                <TableCell>
                  {subscriptionNames[d.subscriptionId] ?? `${d.subscriptionId.slice(0, 8)}…`}
                </TableCell>
                <TableCell>
                  <DeliveryStatusLabel status={d.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{d.attempts}</TableCell>
                <TableCell
                  className="text-muted-foreground max-w-64 truncate"
                  title={d.lastError ?? undefined}
                >
                  {d.lastError ?? '—'}
                </TableCell>
                <TableCell>
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link href={`/integrations/deliveries/${d.id}`} aria-label={`Delivery ${d.id} details`}>
                      <ChevronRight />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <nav aria-label="Pagination" className="flex items-center justify-end gap-2 border-t p-3">
        {firstHref ? (
          <Button asChild variant="outline" size="sm">
            <Link href={firstHref}>Newest</Link>
          </Button>
        ) : null}
        {nextHref ? (
          <Button asChild variant="outline" size="sm">
            <Link href={nextHref}>
              Older <ChevronRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">End of the list</span>
        )}
      </nav>
    </div>
  )
}
