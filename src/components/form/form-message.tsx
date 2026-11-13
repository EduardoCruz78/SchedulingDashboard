import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { ActionState } from '@/lib/forms'

/** The form-level outcome of a Server Action, announced to screen readers (role="alert"). */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.status === 'idle') return null
  if (state.status === 'success') {
    return (
      <Alert>
        <CheckCircle2 aria-hidden />
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden />
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  )
}
