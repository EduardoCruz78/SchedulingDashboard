'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Radio, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ActivityItem } from '@/lib/data/activity'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

export const POLL_INTERVAL_MS = 5000

/**
 * Live feed by polling (decided over SSE: serverless functions on Vercel are short-lived, and every 5 s
 * is "live" for a demo). Polling pauses while the tab is hidden and resumes, with an immediate fetch,
 * when it is visible again. New items are announced to screen readers through a polite live region.
 */
export function ActivityFeed({ initial, timeZone }: { initial: ActivityItem[]; timeZone: string }) {
  const [items, setItems] = useState(initial)
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<'live' | 'paused' | 'offline'>('live')
  const [announcement, setAnnouncement] = useState('')
  const known = useRef(new Set(initial.map((i) => i.webhookId)))

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    const poll = async () => {
      if (document.visibilityState !== 'visible') {
        setStatus('paused')
        return
      }
      try {
        const response = await fetch('/api/activity', { cache: 'no-store' })
        if (!response.ok) throw new Error(String(response.status))
        const body = (await response.json()) as { items: ActivityItem[] }
        const added = body.items.filter((i) => !known.current.has(i.webhookId))
        for (const i of added) known.current.add(i.webhookId)
        setItems(body.items)
        if (added.length > 0) {
          setFresh(new Set(added.map((i) => i.webhookId)))
          setAnnouncement(`${added.length} new event${added.length === 1 ? '' : 's'} received`)
        }
        setStatus('live')
      } catch {
        setStatus('offline')
      }
      if (!stopped) timer = setTimeout(() => void poll(), POLL_INTERVAL_MS)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer)
        void poll()
      }
    }

    timer = setTimeout(() => void poll(), POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2 text-sm">
        {status === 'live' ? (
          <Radio className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
        ) : (
          <Pause className="text-muted-foreground size-4" aria-hidden />
        )}
        <span>
          {status === 'live'
            ? `Live · checking every ${POLL_INTERVAL_MS / 1000} s`
            : status === 'paused'
              ? 'Paused while this tab is hidden'
              : 'Connection lost · retrying'}
        </span>
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          No webhooks yet. Book an appointment in the SchedulingApi: it publishes{' '}
          <code>appointment.created</code>, the WebhookRelay signs it and delivers it here, usually within a
          few seconds.
        </div>
      ) : (
        <ol className="grid gap-3" aria-label="Received webhooks, newest first">
          {items.map((item) => (
            <li
              key={item.webhookId}
              className={cn(
                'bg-card rounded-lg border p-4 transition-colors duration-1000',
                fresh.has(item.webhookId) && 'border-emerald-500/60 bg-emerald-500/5',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {item.eventType}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  Signature verified
                </Badge>
                <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                  Received {formatDateTime(item.receivedAt, timeZone)}
                </span>
              </div>
              <dl className="text-muted-foreground mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                <div>
                  <dt className="inline">webhook-id: </dt>
                  <dd className="inline font-mono break-all">{item.webhookId}</dd>
                </div>
                <div>
                  <dt className="inline">Occurred: </dt>
                  <dd className="inline tabular-nums">
                    {item.occurredAt ? formatDateTime(item.occurredAt, timeZone) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="inline">Signed: </dt>
                  <dd className="inline tabular-nums">{formatDateTime(item.signedAt, timeZone)}</dd>
                </div>
              </dl>
              <details className="mt-2">
                <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                  Payload
                </summary>
                <pre className="bg-muted mt-2 max-h-64 overflow-auto rounded-md p-3 text-xs">
                  {JSON.stringify(item.payload, null, 2)}
                </pre>
              </details>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
