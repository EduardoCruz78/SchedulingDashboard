'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { ActionState } from '@/lib/forms'

/** Shows a toast once per new action result (success or error) and calls `onSuccess` after a success. */
export function useActionToast(state: ActionState, onSuccess?: () => void) {
  const last = useRef<ActionState>(state)
  useEffect(() => {
    if (state === last.current) return
    last.current = state
    if (state.status === 'success') {
      toast.success(state.message)
      onSuccess?.()
    } else if (state.status === 'error' && Object.keys(state.fieldErrors).length === 0) {
      // Field errors are shown next to the fields; a toast is for errors that belong to the whole form.
      toast.error(state.message)
    }
  }, [state, onSuccess])
}
