import { serviceSchema, timeOffSchema, workingHoursSchema } from '@/lib/validation/catalog'

describe('serviceSchema', () => {
  const valid = { name: 'Haircut', description: '', durationMinutes: '30', price: '50.00', isActive: 'on' }

  it('coerces form values', () => {
    expect(serviceSchema.parse(valid)).toEqual({
      name: 'Haircut',
      description: null,
      durationMinutes: 30,
      price: 50,
      isActive: true,
    })
    expect(serviceSchema.parse({ ...valid, isActive: undefined }).isActive).toBe(false)
  })

  it.each([
    [{ durationMinutes: '20' }, 'durationMinutes', 'Use a multiple of 15 minutes.'],
    [{ durationMinutes: '0' }, 'durationMinutes', 'At least 15 minutes.'],
    [{ durationMinutes: '495' }, 'durationMinutes', 'At most 480 minutes (8 hours).'],
    [{ price: '-1' }, 'price', 'The price cannot be negative.'],
    [{ price: '10.555' }, 'price', 'At most 2 decimal places.'],
    [{ name: '  ' }, 'name', 'Enter a name.'],
  ])('rejects %o', (patch, field, message) => {
    const result = serviceSchema.safeParse({ ...valid, ...patch })
    expect(result.success).toBe(false)
    expect(result.error?.issues.find((i) => i.path[0] === field)?.message).toBe(message)
  })
})

describe('workingHoursSchema', () => {
  it('accepts a split day', () => {
    expect(
      workingHoursSchema.safeParse([
        { day: 'Monday', start: '09:00', end: '12:00' },
        { day: 'Monday', start: '12:00', end: '18:00' },
      ]).success,
    ).toBe(true)
  })

  it('rejects an interval that ends before it starts, pointing at the field', () => {
    const result = workingHoursSchema.safeParse([{ day: 'Monday', start: '18:00', end: '09:00' }])
    expect(result.error?.issues[0]).toMatchObject({ path: [0, 'end'], message: 'End must be after start.' })
  })

  it('rejects overlapping intervals on the same day only', () => {
    const result = workingHoursSchema.safeParse([
      { day: 'Monday', start: '09:00', end: '13:00' },
      { day: 'Tuesday', start: '10:00', end: '11:00' },
      { day: 'Monday', start: '12:00', end: '18:00' },
    ])
    expect(result.error?.issues).toHaveLength(1)
    expect(result.error?.issues[0]).toMatchObject({ path: [2, 'start'] })
  })

  it('rejects a bad time format', () => {
    expect(workingHoursSchema.safeParse([{ day: 'Monday', start: '9:00', end: '18:00' }]).success).toBe(false)
  })
})

describe('timeOffSchema', () => {
  it('requires the end after the start', () => {
    const result = timeOffSchema.safeParse({
      startsAt: '2026-11-20T13:00',
      endsAt: '2026-11-20T12:00',
      reason: '',
    })
    expect(result.error?.issues[0]).toMatchObject({ path: ['endsAt'] })
  })
})
