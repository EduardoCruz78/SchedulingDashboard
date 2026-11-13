import 'server-only'
import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { schedulingClient, type SchedulingClient } from '@/lib/api/clients'
import { ApiError } from '@/lib/api/problem'
import { deleteSession, requireAdmin } from '@/lib/auth/session'
import { type ActionState, fromApiError, success } from '@/lib/forms'

/**
 * The shape of every Server Action that writes to an API:
 * 1. re-check the session (an action is a public HTTP endpoint: never trust that the page was guarded);
 * 2. run the call;
 * 3. on success, `refresh()` re-renders the current page with fresh data (nothing is cached, so there is
 *    no tag to invalidate) and the form gets a message for its toast;
 * 4. on 401, clear the session and go to the login page; any other API error becomes form state
 *    (field errors from the ProblemDetails, or the API's message).
 */
export async function mutate(run: () => Promise<unknown>, message: string): Promise<ActionState> {
  try {
    await run()
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
    if (error.kind === 'unauthorized') {
      await deleteSession()
      redirect('/login?reason=expired')
    }
    return fromApiError(error)
  }
  refresh()
  return success(message)
}

/** A SchedulingApi client for the signed-in admin, for use inside `mutate`. */
export async function adminScheduling(): Promise<SchedulingClient> {
  const session = await requireAdmin()
  return schedulingClient(session.accessToken)
}
