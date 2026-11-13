import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/**
 * Label + control + error messages, wired for screen readers: the control gets `aria-invalid` and
 * `aria-describedby` pointing at the errors (and the hint), so the message is read with the field.
 */
export function Field({
  id,
  label,
  errors,
  hint,
  children,
}: {
  id: string
  label: string
  errors?: string[] | undefined
  hint?: string
  children: (props: {
    id: string
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }) => ReactNode
}) {
  const hasErrors = errors !== undefined && errors.length > 0
  const describedBy = [hint ? `${id}-hint` : null, hasErrors ? `${id}-error` : null].filter(Boolean).join(' ')
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, 'aria-invalid': hasErrors, 'aria-describedby': describedBy || undefined })}
      {hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {hasErrors ? (
        <ul id={`${id}-error`} className="text-destructive text-xs">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
