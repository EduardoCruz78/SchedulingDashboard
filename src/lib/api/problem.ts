/**
 * Errors from both APIs arrive as RFC 9457 ProblemDetails (`application/problem+json`) with a stable
 * `code`, plus `errors` (field -> messages) for validation failures. This module turns any failure,
 * including timeouts and network errors, into one `ApiError` the UI knows how to show.
 * It has no server-only imports, so Client Components may use the types and `kind`.
 */

export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'business-rule'
  | 'rate-limited'
  | 'timeout'
  | 'unavailable'
  | 'unknown'

export type FieldErrors = Record<string, string[]>

export interface ProblemDetails {
  type?: string | null
  title?: string | null
  status?: number | null
  detail?: string | null
  code?: string | null
  errors?: Record<string, string[]> | null
}

export class ApiError extends Error {
  override readonly name = 'ApiError'

  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly status: number | null = null,
    readonly code: string | null = null,
    readonly fieldErrors: FieldErrors = {},
  ) {
    super(message)
  }

  /** The API was asleep (Render free plan) or unreachable: worth a "waking up" screen and a retry. */
  get isTransient(): boolean {
    return this.kind === 'timeout' || this.kind === 'unavailable'
  }
}

export function kindForStatus(status: number): ApiErrorKind {
  if (status === 400) return 'validation'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not-found'
  if (status === 409) return 'conflict'
  if (status === 422) return 'business-rule'
  if (status === 429) return 'rate-limited'
  if (status === 502 || status === 503 || status === 504) return 'unavailable'
  return 'unknown'
}

const fallbackMessages: Record<ApiErrorKind, string> = {
  validation: 'Some fields are invalid.',
  unauthorized: 'Your session has expired. Sign in again.',
  forbidden: 'You do not have permission to do that.',
  'not-found': 'It no longer exists. It may have been removed.',
  conflict: 'It conflicts with existing data.',
  'business-rule': 'That is not allowed right now.',
  'rate-limited': 'Too many attempts. Wait a moment and try again.',
  timeout: 'The API is taking too long. It may be waking up.',
  unavailable: 'The API is unavailable. It may be waking up.',
  unknown: 'Something went wrong.',
}

export function fallbackMessage(kind: ApiErrorKind): string {
  return fallbackMessages[kind]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * ASP.NET reports nested fields as `Intervals[0].Start`; forms use camelCase names (`intervals.0.start`).
 */
export function normalizeFieldName(field: string): string {
  return field
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((part) => (part.length > 0 ? part.charAt(0).toLowerCase() + part.slice(1) : part))
    .join('.')
}

function parseFieldErrors(value: unknown): FieldErrors {
  if (!isRecord(value)) return {}
  const result: FieldErrors = {}
  for (const [field, messages] of Object.entries(value)) {
    if (!Array.isArray(messages)) continue
    const strings = messages.filter((m): m is string => typeof m === 'string')
    if (strings.length > 0) {
      const key = normalizeFieldName(field)
      result[key] = [...(result[key] ?? []), ...strings]
    }
  }
  return result
}

/** Builds an ApiError from an HTTP status and whatever body came back (ProblemDetails or not). */
export function problemToError(status: number, body: unknown): ApiError {
  const kind = kindForStatus(status)
  if (!isRecord(body)) return new ApiError(kind, fallbackMessage(kind), status)

  const detail = typeof body.detail === 'string' && body.detail.length > 0 ? body.detail : null
  const title = typeof body.title === 'string' && body.title.length > 0 ? body.title : null
  const code = typeof body.code === 'string' ? body.code : null
  const fieldErrors = parseFieldErrors(body.errors)

  // A 401 always reads the same to the user, whatever the API wrote.
  const message = kind === 'unauthorized' ? fallbackMessage(kind) : (detail ?? title ?? fallbackMessage(kind))
  return new ApiError(kind, message, status, code, fieldErrors)
}

/** Turns a thrown fetch failure (abort, DNS, connection refused) into an ApiError. */
export function networkError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  const name = error instanceof Error ? error.name : ''
  if (name === 'TimeoutError' || name === 'AbortError') {
    return new ApiError('timeout', fallbackMessage('timeout'))
  }
  return new ApiError('unavailable', fallbackMessage('unavailable'))
}
