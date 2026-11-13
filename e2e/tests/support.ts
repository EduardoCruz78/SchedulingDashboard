import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export const SCHEDULING = process.env.SCHEDULING_URL ?? 'http://localhost:8380'
export const admin = { email: 'admin@scheduling.demo', password: 'Admin123!' }
export const customer = { email: 'maria@scheduling.demo', password: 'Customer123!' }

/** Submits the login form (and stays on whatever page the server answers with). */
export async function submitLogin(page: Page, user: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** Signs in and waits until the redirect after login has happened (the session cookie is set). */
export async function signIn(page: Page, user = admin) {
  await submitLogin(page, user)
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

/** WCAG 2.1 A/AA checks with axe-core on the current page. */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const summary = results.violations.map(
    (v) =>
      `${v.id}: ${v.help} -> ${v.nodes.map((n) => `${n.target.join(' ')} ${n.failureSummary ?? ''}`).join(' | ')}`,
  )
  expect(summary, 'axe violations').toEqual([])
}

async function api<T>(
  path: string,
  init: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${SCHEDULING}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : null,
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${response.status}: ${text}`)
  return (text ? JSON.parse(text) : undefined) as T
}

export interface Booking {
  appointmentId: string
  professionalId: string
  professionalName: string
  serviceName: string
  /** Local date (America/Sao_Paulo) of the appointment, YYYY-MM-DD. */
  date: string
  startsAt: string
}

/** A customer books the first free slot at least two days ahead, straight on the SchedulingApi. */
export async function bookAsCustomer(): Promise<Booking> {
  const { accessToken } = await api<{ accessToken: string }>('/api/auth/login', {
    method: 'POST',
    body: customer,
  })
  const professionals = await api<{ items: { id: string; name: string; serviceIds: string[] }[] }>(
    '/api/professionals?pageSize=50',
  )
  const services = await api<{ items: { id: string; name: string }[] }>('/api/services?pageSize=50')
  const professional = professionals.items.find((p) => p.serviceIds.length > 0)
  if (!professional) throw new Error('No professional with services in the seed')
  const serviceId = professional.serviceIds[0] ?? ''

  for (let day = 2; day <= 21; day++) {
    const date = new Date(Date.now() + day * 86_400_000).toISOString().slice(0, 10)
    const availability = await api<{ slots: { startsAt: string }[] }>(
      `/api/professionals/${professional.id}/availability?serviceId=${serviceId}&date=${date}`,
    )
    const slot = availability.slots[availability.slots.length - 1]
    if (!slot) continue
    const appointment = await api<{ id: string }>('/api/appointments', {
      method: 'POST',
      token: accessToken,
      body: { professionalId: professional.id, serviceId, startsAt: slot.startsAt },
    })
    return {
      appointmentId: appointment.id,
      professionalId: professional.id,
      professionalName: professional.name,
      serviceName: services.items.find((s) => s.id === serviceId)?.name ?? '',
      date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
        new Date(slot.startsAt),
      ),
      startsAt: slot.startsAt,
    }
  }
  throw new Error('No free slot in the next three weeks')
}
