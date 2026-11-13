'use client'

import { type RefObject, useActionState, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Field } from '@/components/form/field'
import { useActionToast } from '@/components/form/use-action-toast'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { type ActionState, idle } from '@/lib/forms'

/**
 * Destructive action, so it asks first and requires a reason (it goes to the customer through the
 * appointment.cancelled webhook). Radix keeps focus inside while open and returns it to the menu
 * button when it closes; Escape closes it.
 */
export function CancelDialog({
  appointmentId,
  summary,
  open,
  onOpenChange,
  returnFocusTo,
  action: cancelAction,
}: {
  appointmentId: string
  summary: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The menu item that opened the dialog is gone when it closes; focus goes back to the menu button. */
  returnFocusTo: RefObject<HTMLButtonElement | null>
  /** The Server Action (injected, so the dialog can be tested with a fake). */
  action: (previous: ActionState, form: FormData) => Promise<ActionState>
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(cancelAction, idle)
  useActionToast(state, () => {
    onOpenChange(false)
  })
  const fieldErrors = state.status === 'error' ? state.fieldErrors : {}
  const reason = useRef<HTMLTextAreaElement>(null)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onOpenAutoFocus={(event) => {
          // The reason is the next thing to type; Radix would otherwise focus "Keep it".
          event.preventDefault()
          reason.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
      >
        <form action={action} className="grid gap-4" noValidate>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {summary}. The customer is notified with your reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <Field id={`reason-${appointmentId}`} label="Reason" errors={fieldErrors.reason}>
            {(props) => <Textarea {...props} ref={reason} name="reason" rows={3} maxLength={500} required />}
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Keep it</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Cancel appointment
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
