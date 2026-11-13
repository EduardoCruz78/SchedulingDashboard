'use client'

import { useRef, useState, useTransition } from 'react'
import { CheckCircle2, Loader2, MoreHorizontal, UserX, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { statusColor } from '@/components/charts/status-chart'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Appointment } from '@/lib/api/types'
import { statusLabels } from '@/lib/api/types'
import type { ActionState } from '@/lib/forms'
import { cn } from '@/lib/utils'
import { cancelAppointment, completeAppointment, markNoShow } from './actions'
import { CancelDialog } from './cancel-dialog'

export interface AppointmentView {
  appointment: Appointment
  time: string
  serviceName: string
  customer: string
  price: string
}

/** One appointment on the timeline, with its actions (only while it is still Scheduled). */
export function AppointmentCard({ view, compact }: { view: AppointmentView; compact: boolean }) {
  const { appointment } = view
  const [pending, startTransition] = useTransition()
  const [cancelOpen, setCancelOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const actionable = appointment.status === 'Scheduled'
  const summary = `${view.serviceName} at ${view.time} for ${view.customer}`

  const run = (action: (id: string) => Promise<ActionState>) => {
    startTransition(async () => {
      const result = await action(appointment.id)
      if (result.status === 'success') toast.success(result.message)
      else if (result.status === 'error') toast.error(result.message)
    })
  }

  return (
    <div
      className={cn(
        'bg-card flex h-full gap-2 overflow-hidden rounded-md border border-l-4 px-2 py-1 text-xs shadow-xs',
        appointment.status === 'Cancelled' && 'opacity-60',
      )}
      style={{ borderLeftColor: statusColor[appointment.status] }}
    >
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-medium', appointment.status === 'Cancelled' && 'line-through')}>
          {view.time} · {view.serviceName}
        </p>
        {!compact ? (
          <p className="text-muted-foreground truncate">
            {view.customer} · {view.price}
          </p>
        ) : null}
        <p className="text-muted-foreground truncate">{statusLabels[appointment.status]}</p>
      </div>
      {actionable ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                ref={menuButton}
                variant="ghost"
                size="icon-xs"
                aria-label={`Actions for ${summary}`}
                disabled={pending}
                className="shrink-0"
              >
                {pending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="max-w-56 truncate">{summary}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  run(completeAppointment)
                }}
              >
                <CheckCircle2 aria-hidden /> Complete
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  run(markNoShow)
                }}
              >
                <UserX aria-hidden /> No-show
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  setCancelOpen(true)
                }}
              >
                <XCircle aria-hidden /> Cancel…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <CancelDialog
            appointmentId={appointment.id}
            summary={summary}
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            returnFocusTo={menuButton}
            action={cancelAppointment}
          />
        </>
      ) : null}
    </div>
  )
}
