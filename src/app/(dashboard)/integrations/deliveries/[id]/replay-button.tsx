'use client'

import { useState, useTransition } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { replayDelivery } from '@/app/(dashboard)/integrations/actions'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function ReplayButton({
  deliveryId,
  disabledReason,
}: {
  deliveryId: string
  disabledReason: string | null
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  if (disabledReason) {
    return (
      <div className="grid gap-1">
        <Button variant="outline" disabled aria-describedby="replay-disabled">
          <RotateCcw aria-hidden /> Replay
        </Button>
        <p id="replay-disabled" className="text-muted-foreground max-w-72 text-xs">
          {disabledReason}
        </p>
      </div>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <RotateCcw aria-hidden /> Replay
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send this delivery again?</AlertDialogTitle>
          <AlertDialogDescription>
            The relay starts a fresh retry budget and sends the same event, with the same webhook-id, so a
            receiver that deduplicates will not process it twice.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          <Button
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await replayDelivery(deliveryId)
                if (result.status === 'success') toast.success(result.message)
                else if (result.status === 'error') toast.error(result.message)
                setOpen(false)
              })
            }}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Replay
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
