import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageHeader } from '@/components/page-header'
import { SectionBoundary } from '@/components/section-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { requireAdmin } from '@/lib/auth/session'
import { listActivity } from '@/lib/data/activity'
import { getEnv } from '@/lib/env'
import { ActivityFeed } from './activity-feed'

export const metadata: Metadata = { title: 'Live activity' }

export default function ActivityPage() {
  return (
    <>
      <PageHeader
        title="Live activity"
        description="Signed webhooks this dashboard received from the WebhookRelay: SchedulingApi → outbox → relay → here."
      />
      <SectionBoundary>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <Feed />
        </Suspense>
      </SectionBoundary>
    </>
  )
}

async function Feed() {
  await requireAdmin()
  const items = await listActivity()
  return <ActivityFeed initial={items} timeZone={getEnv().BUSINESS_TIME_ZONE} />
}
