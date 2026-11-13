'use server'

import { z } from 'zod'
import { call } from '@/lib/api/http'
import { adminScheduling, mutate } from '@/lib/data/mutate'
import { type ActionState, fromZodError, text } from '@/lib/forms'

const id = z.uuid()

export async function completeAppointment(appointmentId: string): Promise<ActionState> {
  const parsed = id.safeParse(appointmentId)
  if (!parsed.success) return fromZodError(parsed.error)
  return mutate(async () => {
    const api = await adminScheduling()
    await call(api.POST('/api/appointments/{id}/complete', { params: { path: { id: parsed.data } } }))
  }, 'Appointment completed.')
}

export async function markNoShow(appointmentId: string): Promise<ActionState> {
  const parsed = id.safeParse(appointmentId)
  if (!parsed.success) return fromZodError(parsed.error)
  return mutate(async () => {
    const api = await adminScheduling()
    await call(api.POST('/api/appointments/{id}/no-show', { params: { path: { id: parsed.data } } }))
  }, 'Marked as no-show.')
}

const cancelSchema = z.object({
  appointmentId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(3, 'Tell the customer why (at least 3 characters).')
    .max(500, 'Keep it under 500 characters.'),
})

export async function cancelAppointment(_previous: ActionState, form: FormData): Promise<ActionState> {
  const parsed = cancelSchema.safeParse({
    appointmentId: text(form, 'appointmentId'),
    reason: text(form, 'reason'),
  })
  if (!parsed.success) return fromZodError(parsed.error)
  return mutate(async () => {
    const api = await adminScheduling()
    await call(
      api.POST('/api/appointments/{id}/cancel', {
        params: { path: { id: parsed.data.appointmentId } },
        body: { reason: parsed.data.reason },
      }),
    )
  }, 'Appointment cancelled.')
}
