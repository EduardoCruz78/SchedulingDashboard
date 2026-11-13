/**
 * Friendly names for the generated contract types. Type-only, so Client Components can use them
 * (types disappear at build time; no server code reaches the browser).
 */
import type { components as Scheduling } from './generated/scheduling'
import type { paths as RelayPaths } from './generated/webhook-relay'

export type Appointment = Scheduling['schemas']['AppointmentDto']
export type AppointmentStatus = Scheduling['schemas']['AppointmentStatus']
export type Service = Scheduling['schemas']['ServiceDto']
export type Professional = Scheduling['schemas']['ProfessionalDto']
export type WorkingHours = Scheduling['schemas']['WorkingHoursDto']
export type TimeOff = Scheduling['schemas']['TimeOffDto']
export type DayOfWeek = Scheduling['schemas']['DayOfWeek']

type Json<T> = T extends { content: { 'application/json': infer B } } ? B : never

export type DeliveryPage = Json<RelayPaths['/deliveries']['get']['responses'][200]>
export type Delivery = DeliveryPage['items'][number]
export type DeliveryStatus = Delivery['status']
export type DeliveryAttempt = Json<
  RelayPaths['/deliveries/{id}/attempts']['get']['responses'][200]
>['items'][number]
export type Subscription = Json<RelayPaths['/subscriptions']['get']['responses'][200]>['items'][number]

export const appointmentStatuses: readonly AppointmentStatus[] = [
  'Scheduled',
  'Cancelled',
  'Completed',
  'NoShow',
]
export const deliveryStatuses: readonly DeliveryStatus[] = ['pending', 'failed', 'succeeded', 'dead']
export const daysOfWeek: readonly DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export const statusLabels: Record<AppointmentStatus, string> = {
  Scheduled: 'Scheduled',
  Cancelled: 'Cancelled',
  Completed: 'Completed',
  NoShow: 'No-show',
}
