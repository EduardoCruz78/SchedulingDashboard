import 'server-only'
import { schedulingClient } from '@/lib/api/clients'
import { call } from '@/lib/api/http'
import type { Appointment, AppointmentStatus, Professional, Service } from '@/lib/api/types'
import { requireAdmin } from '@/lib/auth/session'

const PAGE_SIZE = 100 // the API's maximum
const MAX_PAGES = 20 // a guard: a dashboard view never needs more than 2000 rows

async function client() {
  const session = await requireAdmin()
  return schedulingClient(session.accessToken)
}

/** Every appointment overlapping [from, to), following the API's pagination. */
export async function listAppointments(filter: {
  from: Date
  to: Date
  professionalId?: string | undefined
  status?: AppointmentStatus | undefined
}): Promise<Appointment[]> {
  const api = await client()
  const items: Appointment[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await call(
      api.GET('/api/appointments', {
        params: {
          query: {
            from: filter.from.toISOString(),
            to: filter.to.toISOString(),
            professionalId: filter.professionalId,
            status: filter.status,
            page,
            pageSize: PAGE_SIZE,
          },
        },
      }),
    )
    items.push(...result.items)
    if (page * PAGE_SIZE >= result.totalCount) break
  }
  return items
}

export async function listServices(): Promise<Service[]> {
  const api = await client()
  const result = await call(
    api.GET('/api/services', { params: { query: { includeInactive: true, pageSize: PAGE_SIZE } } }),
  )
  return result.items
}

export async function getService(id: string): Promise<Service> {
  const api = await client()
  return call(api.GET('/api/services/{id}', { params: { path: { id } } }))
}

export async function listProfessionals(): Promise<Professional[]> {
  const api = await client()
  const result = await call(
    api.GET('/api/professionals', { params: { query: { includeInactive: true, pageSize: PAGE_SIZE } } }),
  )
  return result.items
}

export async function getProfessional(id: string): Promise<Professional> {
  const api = await client()
  return call(api.GET('/api/professionals/{id}', { params: { path: { id } } }))
}
