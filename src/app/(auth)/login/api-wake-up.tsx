'use client'

import { useEffect, useState } from 'react'
import { StatusDot } from '@/components/status-dot'

type State = 'checking' | 'ready' | 'sleeping'

/**
 * Warms both APIs up as soon as the login page opens. Free Render services sleep after 15 minutes and
 * take up to ~50 s to wake; by the time the admin has typed the password they are usually awake.
 */
export function ApiWakeUp() {
  const [state, setState] = useState<State>('checking')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/status', { signal: controller.signal })
      .then((response) => response.json() as Promise<{ scheduling: string; relay: string }>)
      .then((health) => {
        setState(health.scheduling === 'up' && health.relay === 'up' ? 'ready' : 'sleeping')
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('sleeping')
      })
    return () => {
      controller.abort()
    }
  }, [])

  const text = {
    checking: 'Waking up the APIs (free hosting sleeps; this can take up to a minute)…',
    ready: 'APIs are awake.',
    sleeping: 'An API did not answer yet. Signing in will retry.',
  }[state]

  return (
    <p
      className="text-muted-foreground flex items-center justify-center gap-2 text-center text-xs"
      role="status"
    >
      <StatusDot tone={state === 'ready' ? 'ok' : state === 'checking' ? 'pending' : 'warn'} />
      {text}
    </p>
  )
}
