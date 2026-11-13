'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, MoonStar, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LoadProblem } from '@/lib/data/load'

const AUTO_RETRY_SECONDS = 15
const MAX_AUTO_RETRIES = 4

/**
 * What a section shows when its API call failed. A transient failure (timeout, 502/503, network) is
 * almost always a free Render service waking up, so it explains that and retries on its own a few
 * times; `router.refresh()` re-runs the Server Components without losing client state.
 */
export function ApiProblem({ problem, title }: { problem: LoadProblem; title?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [retries, setRetries] = useState(0)
  const [seconds, setSeconds] = useState(AUTO_RETRY_SECONDS)
  const autoRetry = problem.transient && retries < MAX_AUTO_RETRIES

  const retry = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  useEffect(() => {
    if (!autoRetry || pending) return
    const timer = setTimeout(() => {
      if (seconds > 1) {
        setSeconds(seconds - 1)
        return
      }
      setRetries((r) => r + 1)
      setSeconds(AUTO_RETRY_SECONDS)
      retry()
    }, 1000)
    return () => {
      clearTimeout(timer)
    }
    // `retry` only wraps router.refresh(); listing it would restart the countdown on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRetry, pending, seconds])

  const Icon = problem.transient ? MoonStar : AlertCircle
  return (
    <div role="alert" className="bg-muted/30 flex flex-col items-start gap-3 rounded-lg border p-4 text-sm">
      <div className="flex items-start gap-2">
        <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">
            {title ?? (problem.transient ? 'Waking up the API…' : 'Could not load this section')}
          </p>
          <p className="text-muted-foreground mt-1">
            {problem.transient
              ? 'The demo APIs run on a free plan that sleeps after 15 minutes; the first request can take up to a minute.'
              : problem.message}
          </p>
          {autoRetry && !pending ? (
            <p className="text-muted-foreground mt-1 text-xs" aria-live="polite">
              Retrying in {seconds} s…
            </p>
          ) : null}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={retry} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCw aria-hidden />}
        Try again
      </Button>
    </div>
  )
}
