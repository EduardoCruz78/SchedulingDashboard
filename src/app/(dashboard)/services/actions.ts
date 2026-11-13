'use server'

import { z } from 'zod'
import { call } from '@/lib/api/http'
import { adminScheduling, mutate } from '@/lib/data/mutate'
import { type ActionState, fromZodError, text } from '@/lib/forms'
import { serviceSchema } from '@/lib/validation/catalog'

const idSchema = z.uuid()

/** Create (no id) or update (id) a service. Field errors from Zod or from the API land on the form. */
export async function saveService(_previous: ActionState, form: FormData): Promise<ActionState> {
  const parsed = serviceSchema.safeParse({
    name: text(form, 'name'),
    description: text(form, 'description'),
    durationMinutes: text(form, 'durationMinutes'),
    price: text(form, 'price'),
    isActive: text(form, 'isActive'),
  })
  if (!parsed.success) return fromZodError(parsed.error)

  const id = text(form, 'id')
  if (id) {
    const checked = idSchema.safeParse(id)
    if (!checked.success) return fromZodError(checked.error)
  }

  return mutate(
    async () => {
      const api = await adminScheduling()
      if (id) {
        await call(api.PUT('/api/services/{id}', { params: { path: { id } }, body: parsed.data }))
      } else {
        await call(api.POST('/api/services', { body: parsed.data }))
      }
    },
    id ? 'Service updated.' : 'Service created.',
  )
}

/**
 * The API's DELETE is a soft delete (deactivation: past appointments keep pointing at the service).
 * Reactivating is an update with isActive = true.
 */
export async function setServiceActive(id: string, active: boolean): Promise<ActionState> {
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return fromZodError(parsed.error)
  return mutate(
    async () => {
      const api = await adminScheduling()
      if (!active) {
        await call(api.DELETE('/api/services/{id}', { params: { path: { id: parsed.data } } }))
        return
      }
      const service = await call(api.GET('/api/services/{id}', { params: { path: { id: parsed.data } } }))
      await call(
        api.PUT('/api/services/{id}', {
          params: { path: { id: parsed.data } },
          body: {
            name: service.name,
            description: service.description,
            durationMinutes: service.durationMinutes,
            price: service.price,
            isActive: true,
          },
        }),
      )
    },
    active ? 'Service reactivated.' : 'Service deactivated.',
  )
}
