import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { CalendarClock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getEnv } from '@/lib/env'
import { ApiWakeUp } from './api-wake-up'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }

const reasonMessages: Record<string, string> = {
  expired: 'Your session expired. Sign in again.',
  forbidden: 'Only administrators can use this dashboard.',
}

export default function LoginPage({ searchParams }: PageProps<'/login'>) {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold">
          <CalendarClock className="size-6" aria-hidden />
          SchedulingDashboard
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              <h1>Sign in</h1>
            </CardTitle>
            <CardDescription>Administrators of the SchedulingApi only.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<LoginForm next={null} notice={null} demo={null} />}>
              <LoginFormWithParams searchParams={searchParams} />
            </Suspense>
          </CardContent>
        </Card>
        <ApiWakeUp />
      </div>
    </main>
  )
}

async function LoginFormWithParams({ searchParams }: Pick<PageProps<'/login'>, 'searchParams'>) {
  const params = await searchParams
  await connection()
  const next = typeof params.next === 'string' ? params.next : null
  const reason = typeof params.reason === 'string' ? params.reason : null
  // The demo admin credentials are public (they are in the SchedulingApi README); show them only in demo mode.
  const demo = getEnv().DEMO_MODE ? { email: 'admin@scheduling.demo', password: 'Admin123!' } : null
  return <LoginForm next={next} notice={reason ? (reasonMessages[reason] ?? null) : null} demo={demo} />
}
