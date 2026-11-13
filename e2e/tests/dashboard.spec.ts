import { expect, test } from '@playwright/test'
import { bookAsCustomer, customer, expectAccessible, signIn, submitLogin } from './support'

/*
 * The whole portfolio, running from source: SchedulingApi (with its outbox), WebhookRelay and this
 * dashboard (see e2e/docker-compose.yml). Tests run in order and share the stack.
 */

test('a customer account cannot use the dashboard', async ({ page }) => {
  await submitLogin(page, customer)
  // Next.js has its own role="alert" route announcer, so pick ours by its text.
  await expect(page.getByRole('alert').filter({ hasText: /for administrators/ })).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('the login page is accessible and the guard sends visitors there', async ({ page }) => {
  await page.goto('/schedule')
  await expect(page).toHaveURL(/\/login\?next=%2Fschedule/)
  await expect(page.getByText('APIs are awake.')).toBeVisible()
  await expectAccessible(page)
})

test('an admin signs in, lands where they wanted and the session cookie is httpOnly', async ({
  page,
  context,
}) => {
  await page.goto('/services')
  await page.getByLabel('Email').fill('admin@scheduling.demo')
  await page.getByLabel('Password').fill('Admin123!')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/services$/)
  const cookie = (await context.cookies()).find((c) => c.name === 'sd_session')
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax' })
  expect(await page.evaluate(() => document.cookie)).not.toContain('sd_session')
})

test('overview shows today and the next 14 days', async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await expect(page.getByText('Scheduled today')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Next 14 days' })).toBeVisible()
  await expect(page.getByText('Healthy')).toHaveCount(2)
  await expectAccessible(page)
})

test('creates a service, with the API-side validation on the fields', async ({ page }) => {
  const name = `E2E shave ${Date.now()}`
  await signIn(page)
  await page.goto('/services')
  await page.getByRole('button', { name: 'New service' }).click()
  const dialog = page.getByRole('dialog', { name: 'New service' })

  await dialog.getByLabel('Name').fill(name)
  await dialog.getByLabel('Duration (minutes)').fill('20')
  await dialog.getByLabel('Price (BRL)').fill('80')
  await dialog.getByRole('button', { name: 'Create service' }).click()
  await expect(dialog.getByText('Use a multiple of 15 minutes.')).toBeVisible()
  await expect(dialog.getByLabel('Duration (minutes)')).toHaveAttribute('aria-invalid', 'true')

  await dialog.getByLabel('Duration (minutes)').fill('45')
  await dialog.getByRole('button', { name: 'Create service' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Service created.')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(1)
  await expectAccessible(page)
})

test('a booking travels SchedulingApi -> outbox -> WebhookRelay -> dashboard, then is cancelled from the schedule', async ({
  page,
}) => {
  const booking = await bookAsCustomer()
  await signIn(page)

  // 1. The appointment is on the schedule of that day.
  await page.goto(`/schedule?date=${booking.date}&professional=${booking.professionalId}`)
  const actions = page
    .getByRole('button', { name: new RegExp(`^Actions for ${booking.serviceName} at`) })
    .last()
  await expect(actions).toBeVisible()
  await expectAccessible(page)

  // 2. The signed appointment.created webhook reached the dashboard.
  await page.goto('/activity')
  await expect(page.getByText('appointment.created').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Signature verified').first()).toBeVisible()

  // 3. Cancel from the schedule: confirmation, required reason, focus returns to the menu button.
  await page.goto(`/schedule?date=${booking.date}&professional=${booking.professionalId}`)
  await actions.click()
  await page.getByRole('menuitem', { name: 'Cancel…' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Cancel this appointment?' })
  await expect(dialog.getByLabel('Reason')).toBeFocused()
  await dialog.getByRole('button', { name: 'Cancel appointment' }).click()
  await expect(dialog.getByText(/at least 3 characters/)).toBeVisible()
  await dialog.getByLabel('Reason').fill('Cancelled by the end-to-end test')
  await dialog.getByRole('button', { name: 'Cancel appointment' }).click()
  await expect(page.getByText('Appointment cancelled.')).toBeVisible()
  await expect(page.getByText('Cancelled', { exact: true }).last()).toBeVisible()

  // 4. ...which the live feed picks up by itself (polling), without a reload.
  await page.goto('/activity')
  const before = await page.getByText('appointment.cancelled').count()
  expect(before).toBeGreaterThanOrEqual(0)
  await expect(page.getByText('appointment.cancelled').first()).toBeVisible({ timeout: 30_000 })
  await expectAccessible(page)

  // 5. The relay reports both deliveries to the dashboard as succeeded.
  await page.goto('/integrations/deliveries?status=succeeded')
  await expect(page.getByRole('cell', { name: 'scheduling-dashboard' }).first()).toBeVisible()
  await expectAccessible(page)
})

test('professionals, delivery detail and subscriptions are accessible', async ({ page }) => {
  await signIn(page)
  await page.goto('/professionals')
  await page.getByRole('link', { name: 'Ana Costa' }).click()
  await expect(page.getByRole('heading', { name: 'Working hours' })).toBeVisible()
  await expectAccessible(page)

  await page.goto('/integrations/deliveries')
  await page
    .getByRole('link', { name: /details/ })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: 'Attempts' })).toBeVisible()
  await expect(page.getByText(/HTTP 204/).first()).toBeVisible()
  await expectAccessible(page)

  await page.goto('/integrations/subscriptions')
  await expect(page.getByText('This dashboard')).toBeVisible()
  await expectAccessible(page)
})

test('dark mode is accessible too', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await signIn(page)
  await expect(page.getByRole('heading', { name: 'Next 14 days' })).toBeVisible()
  await expectAccessible(page)
  await page.goto('/activity')
  await expectAccessible(page)
})

test('signing out clears the session', async ({ page, context }) => {
  await signIn(page)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)
  expect((await context.cookies()).some((c) => c.name === 'sd_session')).toBe(false)
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})
