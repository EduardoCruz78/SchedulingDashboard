import { ApiError, kindForStatus, networkError, normalizeFieldName, problemToError } from '@/lib/api/problem'

describe('problemToError', () => {
  it('maps a validation ProblemDetails to field errors with form-friendly names', () => {
    // Body captured from the real SchedulingApi (POST /api/services with invalid data).
    const error = problemToError(400, {
      type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
      title: 'One or more validation errors occurred.',
      status: 400,
      detail: 'One or more fields are invalid.',
      errors: {
        name: ["'Name' must not be empty."],
        DurationMinutes: [
          "'Duration Minutes' must be between 15 and 480.",
          'Duration must be a multiple of 15.',
        ],
      },
      code: 'Validation.Failed',
    })

    expect(error.kind).toBe('validation')
    expect(error.code).toBe('Validation.Failed')
    expect(error.message).toBe('One or more fields are invalid.')
    expect(error.fieldErrors).toEqual({
      name: ["'Name' must not be empty."],
      durationMinutes: [
        "'Duration Minutes' must be between 15 and 480.",
        'Duration must be a multiple of 15.',
      ],
    })
  })

  it('uses the API detail for business errors', () => {
    const error = problemToError(409, { status: 409, detail: 'The slot is no longer available.', code: 'X' })
    expect(error.kind).toBe('conflict')
    expect(error.message).toBe('The slot is no longer available.')
  })

  it('falls back to the title, then to a generic message', () => {
    expect(problemToError(404, { title: 'Not found' }).message).toBe('Not found')
    expect(problemToError(404, 'plain text').message).toMatch(/no longer exists/)
  })

  it('always shows the same message for 401', () => {
    expect(problemToError(401, { detail: 'IDX10223: Lifetime validation failed' }).message).toBe(
      'Your session has expired. Sign in again.',
    )
  })

  it('ignores malformed errors entries', () => {
    expect(problemToError(400, { errors: { a: 'not a list', b: [1, 'ok'] } }).fieldErrors).toEqual({
      b: ['ok'],
    })
  })
})

describe('normalizeFieldName', () => {
  it.each([
    ['Name', 'name'],
    ['durationMinutes', 'durationMinutes'],
    ['Intervals[0].Start', 'intervals.0.start'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeFieldName(input)).toBe(expected)
  })
})

describe('kindForStatus', () => {
  it.each([
    [400, 'validation'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [409, 'conflict'],
    [422, 'business-rule'],
    [429, 'rate-limited'],
    [502, 'unavailable'],
    [503, 'unavailable'],
    [500, 'unknown'],
  ] as const)('%i -> %s', (status, kind) => {
    expect(kindForStatus(status)).toBe(kind)
  })
})

describe('networkError', () => {
  it('treats an aborted request as a timeout (transient)', () => {
    const error = networkError(new DOMException('The operation timed out.', 'TimeoutError'))
    expect(error.kind).toBe('timeout')
    expect(error.isTransient).toBe(true)
  })

  it('treats a connection failure as unavailable (transient)', () => {
    const error = networkError(new TypeError('fetch failed'))
    expect(error.kind).toBe('unavailable')
    expect(error.isTransient).toBe(true)
  })

  it('passes ApiError through', () => {
    const original = new ApiError('conflict', 'x', 409)
    expect(networkError(original)).toBe(original)
  })
})
