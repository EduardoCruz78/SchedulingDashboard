import 'server-only'
import { ApiError, networkError, problemToError } from './problem'

/**
 * `fetch` for the typed clients: every call gets a timeout, so a sleeping Render service turns into a
 * "waking up" screen instead of a page that hangs. No Next.js cache: admin data is always read fresh.
 */
export function fetchWithTimeout(timeoutMs: number): (request: Request) => Promise<Response> {
  return (request) => fetch(request, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' })
}

interface ClientResult<D> {
  data?: D
  error?: unknown
  response: Response
}

/**
 * Awaits an openapi-fetch call and returns its data, or throws an ApiError built from the
 * ProblemDetails body (or from the network failure). Callers never see raw responses.
 */
export async function call<D>(request: Promise<ClientResult<D>>): Promise<D> {
  let result: ClientResult<D>
  try {
    result = await request
  } catch (error) {
    throw networkError(error)
  }
  if (!result.response.ok) {
    throw problemToError(result.response.status, result.error)
  }
  return result.data as D
}

export { ApiError }
