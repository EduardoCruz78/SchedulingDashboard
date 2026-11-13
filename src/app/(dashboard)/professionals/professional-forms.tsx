'use client'

import { useActionState, useState, useTransition } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Field } from '@/components/form/field'
import { FormMessage } from '@/components/form/form-message'
import { useActionToast } from '@/components/form/use-action-toast'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type DayOfWeek, daysOfWeek, type Professional, type Service } from '@/lib/api/types'
import { type ActionState, idle } from '@/lib/forms'
import {
  addTimeOff,
  removeTimeOff,
  saveProfessional,
  saveProfessionalServices,
  saveWorkingHours,
} from './actions'

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={pending} className="justify-self-start">
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </Button>
  )
}

export function ProfessionalForm({
  professional,
  onSaved,
}: {
  professional?: Professional
  onSaved?: () => void
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProfessional, idle)
  useActionToast(state, onSaved)
  const errors = state.status === 'error' ? state.fieldErrors : {}
  return (
    <form action={action} className="grid gap-4" noValidate>
      {professional ? <input type="hidden" name="id" value={professional.id} /> : null}
      <Field id="professional-name" label="Name" errors={errors.name}>
        {(p) => <Input {...p} name="name" defaultValue={professional?.name} maxLength={100} required />}
      </Field>
      <div className="flex items-center gap-2">
        <Checkbox id="professional-active" name="isActive" defaultChecked={professional?.isActive ?? true} />
        <Label htmlFor="professional-active">Active (shown to customers)</Label>
      </div>
      <SubmitButton pending={pending}>{professional ? 'Save profile' : 'Add professional'}</SubmitButton>
    </form>
  )
}

export function ServicesForm({
  professional,
  services,
}: {
  professional: Professional
  services: Service[]
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProfessionalServices, idle)
  useActionToast(state)
  // Inactive services stay listed only if the professional still has them (so they can be removed).
  const visible = services.filter((s) => s.isActive || professional.serviceIds.includes(s.id))
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={professional.id} />
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Services this professional performs</legend>
        {visible.map((service) => (
          <div key={service.id} className="flex items-center gap-2">
            <Checkbox
              id={`svc-${service.id}`}
              name="serviceIds"
              value={service.id}
              defaultChecked={professional.serviceIds.includes(service.id)}
            />
            <Label htmlFor={`svc-${service.id}`} className="font-normal">
              {service.name}
              <span className="text-muted-foreground text-xs">
                {service.durationMinutes} min{service.isActive ? '' : ' · inactive'}
              </span>
            </Label>
          </div>
        ))}
      </fieldset>
      <SubmitButton pending={pending}>Save services</SubmitButton>
    </form>
  )
}

interface Row {
  key: number
  day: DayOfWeek
  start: string
  end: string
}

/**
 * Weekly hours as a dynamic list of intervals per day. The rows travel as one JSON field; errors come
 * back keyed by the row's position (`intervals.3.end`), from Zod or from the API alike.
 */
export function WorkingHoursEditor({ professional }: { professional: Professional }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveWorkingHours, idle)
  useActionToast(state)
  const [rows, setRows] = useState<Row[]>(() =>
    professional.workingHours.map((w, i) => ({ key: i, day: w.day, start: w.start, end: w.end })),
  )
  const [nextKey, setNextKey] = useState(rows.length)
  const errors = state.status === 'error' ? state.fieldErrors : {}

  const update = (key: number, patch: Partial<Row>) => {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }
  const add = (day: DayOfWeek) => {
    const sameDay = rows.filter((r) => r.day === day)
    const last = sameDay[sameDay.length - 1]
    setRows((current) => [
      ...current,
      { key: nextKey, day, start: last ? last.end : '09:00', end: last ? '18:00' : '18:00' },
    ])
    setNextKey((k) => k + 1)
  }

  const payload = JSON.stringify(rows.map(({ day, start, end }) => ({ day, start, end })))

  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="id" value={professional.id} />
      <input type="hidden" name="intervals" value={payload} />
      {state.status === 'error' && Object.keys(errors).length > 0 ? <FormMessage state={state} /> : null}
      <div className="divide-y rounded-lg border">
        {daysOfWeek.map((day) => {
          const dayRows = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.day === day)
          return (
            <div key={day} className="flex flex-wrap items-start gap-3 p-3">
              <p className="w-24 pt-1.5 text-sm font-medium">{day}</p>
              <div className="grid flex-1 gap-2">
                {dayRows.length === 0 ? <p className="text-muted-foreground pt-1.5 text-sm">Closed</p> : null}
                {dayRows.map(({ row, index }) => {
                  const startErrors = errors[`intervals.${index}.start`]
                  const endErrors = errors[`intervals.${index}.end`]
                  const message = [...(startErrors ?? []), ...(endErrors ?? [])]
                  return (
                    <div key={row.key} className="grid gap-1">
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          aria-label={`${day} interval ${index + 1} start`}
                          className="w-32"
                          value={row.start}
                          aria-invalid={startErrors !== undefined}
                          aria-describedby={message.length ? `wh-${row.key}-error` : undefined}
                          onChange={(e) => {
                            update(row.key, { start: e.target.value })
                          }}
                        />
                        <span aria-hidden>–</span>
                        <Input
                          type="time"
                          aria-label={`${day} interval ${index + 1} end`}
                          className="w-32"
                          value={row.end}
                          aria-invalid={endErrors !== undefined}
                          aria-describedby={message.length ? `wh-${row.key}-error` : undefined}
                          onChange={(e) => {
                            update(row.key, { end: e.target.value })
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${day} ${row.start}–${row.end}`}
                          onClick={() => {
                            setRows((current) => current.filter((r) => r.key !== row.key))
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      {message.length ? (
                        <p id={`wh-${row.key}-error`} className="text-destructive text-xs">
                          {message.join(' ')}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  add(day)
                }}
              >
                <Plus aria-hidden /> Add interval
              </Button>
            </div>
          )
        })}
      </div>
      <SubmitButton pending={pending}>Save working hours</SubmitButton>
    </form>
  )
}

export function AddTimeOffForm({ professionalId }: { professionalId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addTimeOff, idle)
  const [formKey, setFormKey] = useState(0)
  useActionToast(state, () => {
    setFormKey((k) => k + 1) // clear the fields after a success
  })
  const errors = state.status === 'error' ? state.fieldErrors : {}
  return (
    <form
      key={formKey}
      action={action}
      className="grid gap-4 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end"
      noValidate
    >
      <input type="hidden" name="id" value={professionalId} />
      <Field id="timeoff-start" label="From" errors={errors.startsAt}>
        {(p) => <Input {...p} type="datetime-local" name="startsAt" required />}
      </Field>
      <Field id="timeoff-end" label="Until" errors={errors.endsAt}>
        {(p) => <Input {...p} type="datetime-local" name="endsAt" required />}
      </Field>
      <Field id="timeoff-reason" label="Reason" errors={errors.reason}>
        {(p) => <Input {...p} name="reason" maxLength={200} placeholder="Optional" />}
      </Field>
      <SubmitButton pending={pending}>Add time off</SubmitButton>
    </form>
  )
}

export function RemoveTimeOffButton({
  professionalId,
  timeOffId,
  label,
}: {
  professionalId: string
  timeOffId: string
  label: string
}) {
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Remove time off ${label}`} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this time off?</AlertDialogTitle>
          <AlertDialogDescription>
            {label}. Customers will be able to book in this period again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await removeTimeOff(professionalId, timeOffId)
                if (result.status === 'success') toast.success(result.message)
                else if (result.status === 'error') toast.error(result.message)
                setOpen(false)
              })
            }}
          >
            Remove
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
