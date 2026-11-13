/**
 * Dates in the business time zone (America/Sao_Paulo for the demo), with plain Intl: no date library.
 *
 * Every function takes the time zone explicitly and formats with a fixed locale, so the server and
 * the browser produce the same string for the same instant. That is what prevents hydration errors:
 * `toLocaleString()` without a zone would use the server's zone (UTC on Vercel) on the server and the
 * visitor's zone in the browser, and React would see two different texts.
 */

export const LOCALE = 'en-US'

/** A calendar date in the business zone, as 'YYYY-MM-DD'. */
export type LocalDate = string

const ymd = /^(\d{4})-(\d{2})-(\d{2})$/

export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string' || !ymd.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value)
}

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

function zonedParts(instant: Date, timeZone: string): ZonedParts {
  let formatter = partsFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    partsFormatters.set(timeZone, formatter)
  }
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(formatter.formatToParts(instant).find((p) => p.type === type)?.value ?? 0)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

/** Offset of the zone from UTC at that instant, in minutes (São Paulo: -180). */
export function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000)
}

/** The calendar date of an instant in the zone. */
export function toLocalDate(instant: Date, timeZone: string): LocalDate {
  const p = zonedParts(instant, timeZone)
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/**
 * The instant at which a wall-clock time happens in the zone. Two passes handle offset changes
 * (daylight saving) correctly, as long as the local time exists.
 */
export function zonedToUtc(date: LocalDate, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const wall = Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0)
  let guess = new Date(wall - zoneOffsetMinutes(new Date(wall), timeZone) * 60_000)
  guess = new Date(wall - zoneOffsetMinutes(guess, timeZone) * 60_000)
  return guess
}

/** [start, end) of a local day, as UTC instants. */
export function dayRange(date: LocalDate, timeZone: string): { from: Date; to: Date } {
  return { from: zonedToUtc(date, '00:00', timeZone), to: zonedToUtc(addDays(date, 1), '00:00', timeZone) }
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatTime(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

export function formatDateTime(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

/** 'Fri, Nov 13' for a local date. Formatted in UTC because the date has no time to shift. */
export function formatLocalDate(date: LocalDate, style: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: 'UTC',
    weekday: style === 'long' ? 'long' : 'short',
    month: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    year: style === 'long' ? 'numeric' : undefined,
  }).format(new Date(`${date}T12:00:00Z`))
}

/** Minutes since local midnight, for placing an appointment on a day timeline. */
export function minutesIntoDay(iso: string | Date, timeZone: string): number {
  const p = zonedParts(new Date(iso), timeZone)
  return p.hour * 60 + p.minute
}
