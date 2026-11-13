import { buildTimeline, customerLabel, parseScheduleFilters, weekdayOf } from '@/lib/schedule'
import { anAppointment, aProfessional } from '@test/support/builders'

const SP = 'America/Sao_Paulo'
const ana = aProfessional({
  id: '01a1d1f5-77ad-7948-93ec-9c46a7ae2409',
  name: 'Ana',
  workingHours: [
    { day: 'Friday', start: '09:00', end: '12:00' },
    { day: 'Friday', start: '13:00', end: '18:00' },
    { day: 'Monday', start: '07:00', end: '11:00' },
  ],
})
const bruno = aProfessional({ id: '01a1d1f5-77ad-7948-93ec-9c46a7ae2410', name: 'Bruno' })
const retired = aProfessional({ id: '01a1d1f5-77ad-7948-93ec-9c46a7ae2411', name: 'Old', isActive: false })

describe('parseScheduleFilters', () => {
  it('reads valid values from the URL', () => {
    expect(
      parseScheduleFilters({ date: '2026-11-20', status: 'NoShow', professional: ana.id }, '2026-11-13'),
    ).toEqual({ date: '2026-11-20', status: 'NoShow', professionalId: ana.id })
  })

  it('falls back to defaults on invalid values', () => {
    expect(
      parseScheduleFilters({ date: '2026-02-30', status: 'Bogus', professional: 'x' }, '2026-11-13'),
    ).toEqual({
      date: '2026-11-13',
      status: undefined,
      professionalId: undefined,
    })
  })
})

describe('buildTimeline', () => {
  const filters = { date: '2026-11-13', professionalId: undefined, status: undefined } // a Friday

  it('places appointments in local minutes and shows the weekday working hours', () => {
    const timeline = buildTimeline(
      [ana, bruno],
      [
        anAppointment({
          professionalId: ana.id,
          startsAt: '2026-11-13T13:00:00Z',
          endsAt: '2026-11-13T13:45:00Z',
        }),
      ],
      filters,
      SP,
    )

    expect(weekdayOf('2026-11-13')).toBe('Friday')
    expect(timeline.columns.map((c) => c.professional.name)).toEqual(['Ana', 'Bruno'])
    expect(timeline.columns[0]?.working).toEqual([
      { start: 540, end: 720 },
      { start: 780, end: 1080 },
    ])
    expect(timeline.columns[0]?.blocks[0]).toMatchObject({ start: 600, end: 645 })
    expect(timeline).toMatchObject({ start: 480, end: 1080 })
  })

  it('widens the range to fit early or late appointments', () => {
    const timeline = buildTimeline(
      [ana],
      [
        anAppointment({
          professionalId: ana.id,
          startsAt: '2026-11-13T22:30:00Z',
          endsAt: '2026-11-13T23:15:00Z',
        }),
      ],
      filters,
      SP,
    )
    expect(timeline.end).toBe(21 * 60)
  })

  it('filters by professional and status', () => {
    const appointments = [
      anAppointment({ professionalId: ana.id, status: 'Cancelled' }),
      anAppointment({ professionalId: ana.id, status: 'Scheduled' }),
    ]
    const timeline = buildTimeline(
      [ana, bruno],
      appointments,
      { ...filters, professionalId: ana.id, status: 'Cancelled' },
      SP,
    )
    expect(timeline.columns).toHaveLength(1)
    expect(timeline.columns[0]?.blocks.map((b) => b.appointment.status)).toEqual(['Cancelled'])
  })

  it('hides inactive professionals unless they have appointments that day', () => {
    expect(buildTimeline([ana, retired], [], filters, SP).columns.map((c) => c.professional.name)).toEqual([
      'Ana',
    ])
    const withBooking = buildTimeline(
      [ana, retired],
      [anAppointment({ professionalId: retired.id })],
      filters,
      SP,
    )
    expect(withBooking.columns.map((c) => c.professional.name)).toEqual(['Ana', 'Old'])
  })
})

describe('customerLabel', () => {
  it('shows the last four characters of the id', () => {
    expect(customerLabel('01a1d1f5-7614-78b0-9ca0-d51c8bb181d2')).toBe('Customer ···81d2')
  })
})
