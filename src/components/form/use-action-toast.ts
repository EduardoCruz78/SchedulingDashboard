'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import type { ActionState } from '@/lib/forms'

type FormAction = (previous: ActionState, form: FormData) => Promise<ActionState>

/**
 * Wraps a Server Action so its result is toasted as soon as it returns, before React re-renders.
 * (An effect would be too late: a successful action calls refresh(), and the component that showed
 * the form, a cancel dialog on an appointment that is now cancelled, may already be gone.)
 * Field errors are shown next to the fields; only form-level errors become an error toast.
 * On error it also returns what was typed (`values`): React resets a form after its action runs, and
 * without this a validation error would wipe the fields the user has to fix.
 */
export function useToastingAction(action: FormAction, onSuccess?: () => void): FormAction {
  return useCallback(
    async (previous, form) => {
      const result = await action(previous, form)
      if (result.status === 'success') {
        toast.success(result.message)
        onSuccess?.()
        return result
      }
      if (result.status === 'error') {
        if (Object.keys(result.fieldErrors).length === 0) toast.error(result.message)
        return { ...result, values: typedValues(form) }
      }
      return result
    },
    [action, onSuccess],
  )
}

/** The text fields of a submitted form (files and hidden ids are irrelevant for re-filling). */
export function typedValues(form: FormData): Record<string, string> {
  const values: Record<string, string> = {}
  for (const [name, value] of form.entries()) {
    if (typeof value === 'string') values[name] = value
  }
  return values
}
