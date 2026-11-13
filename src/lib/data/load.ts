import 'server-only'
import { redirect } from 'next/navigation'
import { ApiError, type ApiErrorKind } from '@/lib/api/problem'

/** A failure the page can render (serializable, so it can reach a Client Component). */
export interface LoadProblem {
  kind: ApiErrorKind
  message: string
  transient: boolean
}

export type Loaded<T> = { ok: true; data: T } | { ok: false; problem: LoadProblem }

/**
 * Runs a data read for a Server Component. API failures become a value the page renders ("the API is
 * waking up", "not found"...) instead of an exception: in production, Next.js hides the message of
 * errors thrown while rendering, so an error boundary could not tell a cold start from a bug.
 * A 401 means the API no longer accepts the session: clear it and go to the login page.
 * Anything that is not an ApiError (a bug) is rethrown for the error boundary.
 */
export async function load<T>(read: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await read() }
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
    if (error.kind === 'unauthorized') redirect('/auth/signout?reason=expired')
    return { ok: false, problem: { kind: error.kind, message: error.message, transient: error.isTransient } }
  }
}
