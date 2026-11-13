import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { requireAdmin } from '@/lib/auth/session'

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      <Suspense fallback={<Skeleton className="h-6 w-64" />}>
        <Welcome />
      </Suspense>
    </div>
  )
}

async function Welcome() {
  const session = await requireAdmin()
  return <p className="text-muted-foreground">Signed in as {session.user.name}.</p>
}
