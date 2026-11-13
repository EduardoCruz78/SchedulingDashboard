'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { clientIpFrom, clientKeyFor } from '@/lib/auth/login-throttle'
import { safeNextPath } from '@/lib/auth/safe-redirect'
import { createSession, deleteSession } from '@/lib/auth/session'
import { signIn } from '@/lib/auth/sign-in'
import { getDb } from '@/lib/db'
import { getEnv } from '@/lib/env'
import { type ActionState, text } from '@/lib/forms'

export async function loginAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const clientKey = clientKeyFor(clientIpFrom(await headers()), getEnv().SESSION_SECRET)
  const email = text(form, 'email')
  const result = await signIn({ email, password: text(form, 'password') }, clientKey, getDb())
  if (!result.ok) {
    return result.state.status === 'error' ? { ...result.state, values: { email } } : result.state
  }

  await createSession(result.session)
  redirect(safeNextPath(form.get('next')))
}

export async function logoutAction(): Promise<void> {
  await deleteSession()
  redirect('/login')
}
