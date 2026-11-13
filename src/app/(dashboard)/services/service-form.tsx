'use client'

import { useActionState } from 'react'
import { Loader2 } from 'lucide-react'
import { Field } from '@/components/form/field'
import { FormMessage } from '@/components/form/form-message'
import { useToastingAction } from '@/components/form/use-action-toast'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Service } from '@/lib/api/types'
import { type ActionState, idle } from '@/lib/forms'

/**
 * Create or edit a service. Errors come back from the Server Action already keyed by field, whether
 * Zod caught them or the API did (its ProblemDetails `errors` are mapped to the same names).
 * The action is injected so the form is testable on its own.
 */
export function ServiceForm({
  service,
  action,
  onSaved,
}: {
  service?: Service
  action: (previous: ActionState, form: FormData) => Promise<ActionState>
  onSaved?: () => void
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    useToastingAction(action, onSaved),
    idle,
  )
  const errors = state.status === 'error' ? state.fieldErrors : {}
  const hasFieldErrors = Object.keys(errors).length > 0
  // After an error, show what was typed; otherwise the saved service (or the defaults).
  const typed = state.status === 'error' ? state.values : undefined

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {hasFieldErrors ? <FormMessage state={state} /> : null}
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <Field id="service-name" label="Name" errors={errors.name}>
        {(p) => (
          <Input {...p} name="name" defaultValue={typed?.name ?? service?.name} maxLength={100} required />
        )}
      </Field>
      <Field id="service-description" label="Description" errors={errors.description} hint="Optional.">
        {(p) => (
          <Textarea
            {...p}
            name="description"
            defaultValue={typed?.description ?? service?.description ?? ''}
            rows={2}
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field
          id="service-duration"
          label="Duration (minutes)"
          errors={errors.durationMinutes}
          hint="15 to 480, in steps of 15."
        >
          {(p) => (
            <Input
              {...p}
              name="durationMinutes"
              type="number"
              inputMode="numeric"
              min={15}
              max={480}
              step={15}
              defaultValue={typed?.durationMinutes ?? service?.durationMinutes ?? 30}
              required
            />
          )}
        </Field>
        <Field id="service-price" label="Price (BRL)" errors={errors.price}>
          {(p) => (
            <Input
              {...p}
              name="price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              defaultValue={typed?.price ?? service?.price ?? ''}
              required
            />
          )}
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="service-active"
          name="isActive"
          defaultChecked={typed ? typed.isActive === 'on' : (service?.isActive ?? true)}
        />
        <Label htmlFor="service-active">Active (customers can book it)</Label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {service ? 'Save changes' : 'Create service'}
      </Button>
    </form>
  )
}
