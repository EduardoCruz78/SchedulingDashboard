'use server'

import { z } from 'zod'
import { call } from '@/lib/api/http'
import type { DayOfWeek } from '@/lib/api/types'
import { adminScheduling, mutate } from '@/lib/data/mutate'
import { getEnv } from '@/lib/env'
import { type ActionState, failure, fromZodError, text } from '@/lib/forms'
import { zonedToUtc } from '@/lib/time'
import { professionalSchema, timeOffSchema, workingHoursSchema } from '@/lib/validation/catalog'

const idSchema = z.uuid()

function checkId(value: string): string | ActionState {
  const parsed = idSchema.safeParse(value)
  return parsed.success ? parsed.data : fromZodError(parsed.error)
}

/** Create (no id) or update (id) a professional's name and status. */
export async function saveProfessional(_previous: ActionState, form: FormData): Promise<ActionState> {
  const parsed = professionalSchema.safeParse({ name: text(form, 'name'), isActive: text(form, 'isActive') })
  if (!parsed.success) return fromZodError(parsed.error)
  const raw = text(form, 'id')
  const id = raw ? checkId(raw) : null
  if (id !== null && typeof id !== 'string') return id

  return mutate(
    async () => {
      const api = await adminScheduling()
      if (id) {
        await call(api.PUT('/api/professionals/{id}', { params: { path: { id } }, body: parsed.data }))
      } else {
        await call(api.POST('/api/professionals', { body: parsed.data }))
      }
    },
    id ? 'Professional updated.' : 'Professional added.',
  )
}

/** Which services the professional performs (the whole set replaces the previous one). */
export async function saveProfessionalServices(_previous: ActionState, form: FormData): Promise<ActionState> {
  const id = checkId(text(form, 'id'))
  if (typeof id !== 'string') return id
  const serviceIds = form.getAll('serviceIds').filter((v): v is string => typeof v === 'string')
  const parsed = z.array(z.uuid()).safeParse(serviceIds)
  if (!parsed.success) return fromZodError(parsed.error)

  return mutate(async () => {
    const api = await adminScheduling()
    await call(
      api.PUT('/api/professionals/{id}/services', {
        params: { path: { id } },
        body: { serviceIds: parsed.data },
      }),
    )
  }, 'Services updated.')
}

/**
 * The weekly hours editor sends its rows as JSON (a dynamic list). Validated with the same rules as the
 * API, under the `intervals` key, so Zod's paths and the API's (`Intervals[0].End`) name the same fields.
 */
export async function saveWorkingHours(_previous: ActionState, form: FormData): Promise<ActionState> {
  const id = checkId(text(form, 'id'))
  if (typeof id !== 'string') return id
  let rows: unknown
  try {
    rows = JSON.parse(text(form, 'intervals') || '[]')
  } catch {
    return failure('The working hours could not be read. Reload the page and try again.')
  }
  const parsed = z.object({ intervals: workingHoursSchema }).safeParse({ intervals: rows })
  if (!parsed.success) return fromZodError(parsed.error)

  return mutate(async () => {
    const api = await adminScheduling()
    await call(
      api.PUT('/api/professionals/{id}/working-hours', {
        params: { path: { id } },
        body: {
          intervals: parsed.data.intervals.map((i) => ({
            day: i.day as DayOfWeek,
            start: i.start,
            end: i.end,
          })),
        },
      }),
    )
  }, 'Working hours saved.')
}

/** Time off is typed in the business time zone (datetime-local) and sent to the API as UTC instants. */
export async function addTimeOff(_previous: ActionState, form: FormData): Promise<ActionState> {
  const id = checkId(text(form, 'id'))
  if (typeof id !== 'string') return id
  const parsed = timeOffSchema.safeParse({
    startsAt: text(form, 'startsAt'),
    endsAt: text(form, 'endsAt'),
    reason: text(form, 'reason'),
  })
  if (!parsed.success) return fromZodError(parsed.error)

  const timeZone = getEnv().BUSINESS_TIME_ZONE
  const toUtc = (local: string) => {
    const [date = '', time = ''] = local.split('T')
    return zonedToUtc(date, time, timeZone).toISOString()
  }

  return mutate(async () => {
    const api = await adminScheduling()
    await call(
      api.POST('/api/professionals/{id}/time-off', {
        params: { path: { id } },
        body: {
          startsAt: toUtc(parsed.data.startsAt),
          endsAt: toUtc(parsed.data.endsAt),
          reason: parsed.data.reason,
        },
      }),
    )
  }, 'Time off added.')
}

export async function removeTimeOff(professionalId: string, timeOffId: string): Promise<ActionState> {
  const id = checkId(professionalId)
  if (typeof id !== 'string') return id
  const timeOff = checkId(timeOffId)
  if (typeof timeOff !== 'string') return timeOff

  return mutate(async () => {
    const api = await adminScheduling()
    await call(
      api.DELETE('/api/professionals/{id}/time-off/{timeOffId}', {
        params: { path: { id, timeOffId: timeOff } },
      }),
    )
  }, 'Time off removed.')
}
