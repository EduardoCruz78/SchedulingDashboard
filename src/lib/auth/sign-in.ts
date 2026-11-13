import 'server-only'
import { z } from 'zod'
import { schedulingClient } from '@/lib/api/clients'
import { call } from '@/lib/api/http'
import { ApiError } from '@/lib/api/problem'
import type { Database } from '@/lib/db'
import { type ActionState, failure, fromApiError, fromZodError } from '@/lib/forms'
import { checkThrottle, clearFailures, recordFailure } from './login-throttle'
import type { Session } from './session-token'

export const credentialsSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export type SignInResult = { ok: true; session: Session } | { ok: false; state: ActionState }

/**
 * The whole sign-in decision, without cookies or redirects (the Server Action does those), so it can be
 * tested against a fake API and a real database:
 * throttle -> API login -> API "who am I" -> Admin only -> session.
 */
export async function signIn(
  input: { email: string; password: string },
  clientKey: string,
  db: Database,
): Promise<SignInResult> {
  const parsed = credentialsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, state: fromZodError(parsed.error) }

  const throttle = await checkThrottle(db, clientKey)
  if (throttle.blocked) {
    const minutes = Math.ceil(throttle.retryAfterSeconds / 60)
    return {
      ok: false,
      state: failure(`Too many failed sign-ins. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`),
    }
  }

  try {
    const token = await call(schedulingClient(null).POST('/api/auth/login', { body: parsed.data }))
    const user = await call(schedulingClient(token.accessToken).GET('/api/auth/me'))

    if (user.role !== 'Admin') {
      // Correct credentials of a customer: not a failed attempt, just the wrong place.
      return {
        ok: false,
        state: failure('This dashboard is for administrators. Customer accounts book through the API.'),
      }
    }

    await clearFailures(db, clientKey)
    return {
      ok: true,
      session: {
        accessToken: token.accessToken,
        expiresAt: token.expiresAt,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    }
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
    if (error.kind === 'unauthorized') {
      await recordFailure(db, clientKey)
      return { ok: false, state: failure('Email or password is incorrect.') }
    }
    if (error.kind === 'rate-limited') {
      return {
        ok: false,
        state: failure('The API is limiting sign-ins right now. Wait a minute and try again.'),
      }
    }
    if (error.isTransient) {
      return {
        ok: false,
        state: {
          status: 'error',
          message: 'The API is waking up (free hosting sleeps). Try again in a few seconds.',
          fieldErrors: {},
          transient: true,
        },
      }
    }
    return { ok: false, state: fromApiError(error) }
  }
}
