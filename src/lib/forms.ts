import type { z } from 'zod'
import type { ApiError, FieldErrors } from '@/lib/api/problem'

/** What every Server Action returns to its form (used with React's useActionState). */
export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | {
      status: 'error'
      message: string
      fieldErrors: FieldErrors
      transient?: boolean
      /** What the user typed, so the form can show it again (React resets forms after an action). */
      values?: Record<string, string>
    }

export const idle: ActionState = { status: 'idle' }

export function success(message: string): ActionState {
  return { status: 'success', message }
}

export function fromZodError(error: z.ZodError): ActionState {
  const fieldErrors: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.')
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
  }
  return { status: 'error', message: 'Check the highlighted fields.', fieldErrors }
}

export function fromApiError(error: ApiError): ActionState {
  return {
    status: 'error',
    message: error.message,
    fieldErrors: error.fieldErrors,
    transient: error.isTransient,
  }
}

export function failure(message: string): ActionState {
  return { status: 'error', message, fieldErrors: {} }
}

/** Reads a FormData entry as a trimmed string ('' when missing or a file). */
export function text(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value.trim() : ''
}
