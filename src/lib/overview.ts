import type { Appointment, AppointmentStatus, Delivery, DeliveryStatus } from '@/lib/api/types'
import { addDays, type LocalDate, toLocalDate } from '@/lib/time'

/** Pure calculations behind the Overview page (unit-tested; no I/O). */

export type StatusCounts = Record<AppointmentStatus, number>

const emptyCounts = (): StatusCounts => ({ Scheduled: 0, Cancelled: 0, Completed: 0, NoShow: 0 })

export function countByStatus(appointments: readonly Appointment[]): StatusCounts {
  const counts = emptyCounts()
  for (const a of appointments) counts[a.status] += 1
  return counts
}

/**
 * Share of appointments that already happened (completed or no-show) where the customer did not come.
 * Cancelled ones are excluded: a cancellation is not a no-show. Null when nothing happened yet.
 */
export function noShowRate(counts: StatusCounts): number | null {
  const happened = counts.Completed + counts.NoShow
  return happened === 0 ? null : counts.NoShow / happened
}

export interface DayStatusRow extends StatusCounts {
  date: LocalDate
}

/** One row per local day in [start, start + days), counting appointments by the local day they start. */
export function dailyStatusSeries(
  appointments: readonly Appointment[],
  start: LocalDate,
  days: number,
  timeZone: string,
): DayStatusRow[] {
  const rows = new Map<LocalDate, DayStatusRow>()
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i)
    rows.set(date, { date, ...emptyCounts() })
  }
  for (const a of appointments) {
    const row = rows.get(toLocalDate(new Date(a.startsAt), timeZone))
    if (row) row[a.status] += 1
  }
  return [...rows.values()]
}

export function appointmentsOn(
  appointments: readonly Appointment[],
  date: LocalDate,
  timeZone: string,
): Appointment[] {
  return appointments.filter((a) => toLocalDate(new Date(a.startsAt), timeZone) === date)
}

export interface DeliveryHealth {
  total: number
  byStatus: Record<DeliveryStatus, number>
  /** succeeded / (succeeded + dead): retries still in flight do not count against it yet. */
  successRate: number | null
}

export function deliveryHealth(deliveries: readonly Delivery[]): DeliveryHealth {
  const byStatus: Record<DeliveryStatus, number> = { pending: 0, failed: 0, succeeded: 0, dead: 0 }
  for (const d of deliveries) byStatus[d.status] += 1
  const settled = byStatus.succeeded + byStatus.dead
  return {
    total: deliveries.length,
    byStatus,
    successRate: settled === 0 ? null : byStatus.succeeded / settled,
  }
}
