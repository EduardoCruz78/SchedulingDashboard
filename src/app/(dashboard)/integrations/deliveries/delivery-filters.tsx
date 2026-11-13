'use client'

import { useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type DeliveryStatus, deliveryStatuses } from '@/lib/api/types'
import { deliveryStatusView } from './deliveries-table'

const ALL = 'all'

/** Filters in the URL; changing one starts again from the newest page (the cursor is dropped). */
export function DeliveryFilters({
  status,
  subscriptionId,
  subscriptions,
}: {
  status: DeliveryStatus | undefined
  subscriptionId: string | undefined
  subscriptions: { id: string; name: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  const go = (next: { status?: string | undefined; subscription?: string | undefined }) => {
    const params = new URLSearchParams()
    const s = 'status' in next ? next.status : status
    const sub = 'subscription' in next ? next.subscription : subscriptionId
    if (s) params.set('status', s)
    if (sub) params.set('subscription', sub)
    const query = params.toString()
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname)
    })
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3" role="group" aria-label="Delivery filters">
      <div className="grid gap-1.5">
        <Label htmlFor="delivery-status">Status</Label>
        <Select
          value={status ?? ALL}
          onValueChange={(v) => {
            go({ status: v === ALL ? undefined : v })
          }}
        >
          <SelectTrigger id="delivery-status" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {deliveryStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {deliveryStatusView[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="delivery-subscription">Subscription</Label>
        <Select
          value={subscriptionId ?? ALL}
          onValueChange={(v) => {
            go({ subscription: v === ALL ? undefined : v })
          }}
        >
          <SelectTrigger id="delivery-subscription" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subscriptions</SelectItem>
            {subscriptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {pending ? (
        <Loader2 className="text-muted-foreground mb-2 size-4 animate-spin" aria-label="Loading" />
      ) : null}
    </div>
  )
}
