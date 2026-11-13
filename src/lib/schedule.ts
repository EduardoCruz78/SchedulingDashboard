import type { Appointment, AppointmentStatus, DayOfWeek, Professional } from '@/lib/api/types'
import { appointmentStatuses } from '@/lib/api/types'
import { isLocalDate, type LocalDate, minutesIntoDay } from '@/lib/time'

/** Pure layout of the day timeline (unit-tested). Minutes are counted from local midnight. */

export interface ScheduleFilters {
  date: LocalDate
  professionalId: string | undefined
  status: AppointmentStatus | undefined
}

/** Reads the URL (?date=&professional=&status=). Invalid values fall back to defaults, never to an error. */
export function parseScheduleFilters(
  params: Record<string, string | string[] | undefined>,
  today: LocalDate,
): ScheduleFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const date = first(params.date)
  const status = first(params.status)
  const professional = first(params.professional)
  return {
    date: isLocalDate(date) ? date : today,
    status: appointmentStatuses.find((s) => s === status),
    professionalId: professional && /^[0-9a-f-]{36}$/i.test(professional) ? professional : undefined,
  }
}

const weekdays: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function weekdayOf(date: LocalDate): DayOfWeek {
  return weekdays[new Date(`${date}T12:00:00Z`).getUTCDay()] ?? 'Sunday'
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export interface TimelineBlock {
  appointment: Appointment
  start: number
  end: number
}

export interface TimelineColumn {
  professional: Professional
  working: { start: number; end: number }[]
  blocks: TimelineBlock[]
}

export interface Timeline {
  start: number
  end: number
  columns: TimelineColumn[]
}

export function buildTimeline(
  professionals: readonly Professional[],
  appointments: readonly Appointment[],
  filters: ScheduleFilters,
  timeZone: string,
): Timeline {
  const weekday = weekdayOf(filters.date)
  const visible = appointments.filter((a) => !filters.status || a.status === filters.status)

  const columns: TimelineColumn[] = professionals
    .filter((p) => !filters.professionalId || p.id === filters.professionalId)
    .map((professional) => ({
      professional,
      working: professional.workingHours
        .filter((w) => w.day === weekday)
        .map((w) => ({ start: toMinutes(w.start), end: toMinutes(w.end) }))
        .sort((a, b) => a.start - b.start),
      blocks: visible
        .filter((a) => a.professionalId === professional.id)
        .map((appointment) => {
          const start = minutesIntoDay(appointment.startsAt, timeZone)
          const duration =
            (new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime()) / 60_000
          return { appointment, start, end: Math.min(24 * 60, start + duration) }
        })
        .sort((a, b) => a.start - b.start),
    }))
    // Inactive professionals only appear when they still have appointments that day.
    .filter((c) => c.professional.isActive || c.blocks.length > 0)

  const edges = columns.flatMap((c) => [...c.working, ...c.blocks])
  const earliest = Math.min(8 * 60, ...edges.map((e) => e.start))
  const latest = Math.max(18 * 60, ...edges.map((e) => e.end))
  return {
    start: Math.floor(earliest / 60) * 60,
    end: Math.min(24 * 60, Math.ceil(latest / 60) * 60),
    columns,
  }
}

/** Short, stable label for a customer: the API exposes ids, not customer names, to the admin list. */
export function customerLabel(customerId: string): string {
  return `Customer ···${customerId.replaceAll('-', '').slice(-4)}`
}
