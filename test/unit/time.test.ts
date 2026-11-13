import {
  addDays,
  dayRange,
  formatDateTime,
  formatLocalDate,
  formatTime,
  isLocalDate,
  minutesIntoDay,
  toLocalDate,
  zoneOffsetMinutes,
  zonedToUtc,
} from '@/lib/time'

const SP = 'America/Sao_Paulo'
const NY = 'America/New_York'

describe('business time zone helpers', () => {
  it('knows the São Paulo offset (no DST since 2019)', () => {
    expect(zoneOffsetMinutes(new Date('2026-01-15T12:00:00Z'), SP)).toBe(-180)
    expect(zoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'), SP)).toBe(-180)
  })

  it('finds the local date of an instant (01:00 UTC is still the previous day in São Paulo)', () => {
    expect(toLocalDate(new Date('2026-11-14T01:00:00Z'), SP)).toBe('2026-11-13')
    expect(toLocalDate(new Date('2026-11-14T03:00:00Z'), SP)).toBe('2026-11-14')
  })

  it('converts a wall-clock time to UTC', () => {
    expect(zonedToUtc('2026-11-13', '10:00', SP).toISOString()).toBe('2026-11-13T13:00:00.000Z')
  })

  it('handles daylight saving: a local day can be 23 hours long', () => {
    // New York springs forward on 2027-03-14.
    const { from, to } = dayRange('2027-03-14', NY)
    expect(from.toISOString()).toBe('2027-03-14T05:00:00.000Z')
    expect(to.toISOString()).toBe('2027-03-15T04:00:00.000Z')
    expect((to.getTime() - from.getTime()) / 3_600_000).toBe(23)
  })

  it('builds the [start, end) range of a São Paulo day', () => {
    const { from, to } = dayRange('2026-11-13', SP)
    expect(from.toISOString()).toBe('2026-11-13T03:00:00.000Z')
    expect(to.toISOString()).toBe('2026-11-14T03:00:00.000Z')
  })

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('validates local dates', () => {
    expect(isLocalDate('2026-11-13')).toBe(true)
    expect(isLocalDate('2026-02-30')).toBe(false)
    expect(isLocalDate('13/11/2026')).toBe(false)
    expect(isLocalDate(undefined)).toBe(false)
  })

  it('formats in the business zone, whatever the machine zone is', () => {
    expect(formatTime('2026-11-13T13:00:00Z', SP)).toBe('10:00')
    expect(formatDateTime('2026-11-13T13:00:05Z', SP)).toBe('Nov 13, 10:00:05')
    expect(formatLocalDate('2026-11-13')).toBe('Fri, Nov 13')
    expect(formatLocalDate('2026-11-13', 'long')).toBe('Friday, November 13, 2026')
  })

  it('places an instant on the local day timeline', () => {
    expect(minutesIntoDay('2026-11-13T13:30:00Z', SP)).toBe(10 * 60 + 30)
  })
})
