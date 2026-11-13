'use client'

import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'
import { setSubscriptionActive } from '@/app/(dashboard)/integrations/actions'
import { Switch } from '@/components/ui/switch'

/** Pause/resume a subscription. Optimistic: the switch moves at once and rolls back if the relay refuses. */
export function SubscriptionToggle({ id, name, isActive }: { id: string; name: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic(isActive)
  return (
    <Switch
      checked={optimistic}
      disabled={pending}
      aria-label={`${name} active`}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          setOptimistic(checked)
          const result = await setSubscriptionActive(id, checked)
          if (result.status === 'success') toast.success(result.message)
          else if (result.status === 'error') toast.error(result.message)
        })
      }}
    />
  )
}
