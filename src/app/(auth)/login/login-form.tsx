'use client'

import { useActionState, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Field } from '@/components/form/field'
import { FormMessage } from '@/components/form/form-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type ActionState, idle } from '@/lib/forms'
import { loginAction } from './actions'

export function LoginForm({
  next,
  notice,
  demo,
}: {
  next: string | null
  notice: string | null
  demo: { email: string; password: string } | null
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(loginAction, idle)
  const email = useRef<HTMLInputElement>(null)
  const password = useRef<HTMLInputElement>(null)
  const fieldErrors = state.status === 'error' ? state.fieldErrors : {}
  const typedEmail = state.status === 'error' ? state.values?.email : undefined

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {notice && state.status === 'idle' ? (
        <FormMessage state={{ status: 'success', message: notice }} />
      ) : null}
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ''} />
      <Field id="email" label="Email" errors={fieldErrors.email}>
        {(props) => (
          <Input
            {...props}
            ref={email}
            name="email"
            type="email"
            autoComplete="username"
            defaultValue={typedEmail}
            required
          />
        )}
      </Field>
      <Field id="password" label="Password" errors={fieldErrors.password}>
        {(props) => (
          <Input
            {...props}
            ref={password}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        )}
      </Field>
      <Button type="submit" disabled={pending} size="lg">
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
      {demo ? (
        <div className="bg-muted/50 rounded-lg border p-3 text-sm">
          <p className="font-medium">Demo credentials</p>
          <p className="text-muted-foreground mt-1">
            <span className="font-mono">{demo.email}</span> /{' '}
            <span className="font-mono">{demo.password}</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              if (email.current) email.current.value = demo.email
              if (password.current) password.current.value = demo.password
            }}
          >
            Fill in demo credentials
          </Button>
        </div>
      ) : null}
    </form>
  )
}
