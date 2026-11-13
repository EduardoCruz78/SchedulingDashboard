import { expect, test } from '@playwright/test'
import { signIn } from './support'

// README images, taken from the real stack. Only with SCREENSHOTS=1 (not part of the CI assertions).
test.skip(!process.env.SCREENSHOTS, 'Set SCREENSHOTS=1 to refresh docs/images')

test.use({ viewport: { width: 1440, height: 900 } })

const pages = [
  { name: 'overview', path: '/', ready: 'Next 14 days' },
  { name: 'schedule', path: '/schedule', ready: 'Schedule' },
  { name: 'activity', path: '/activity', ready: 'Live activity' },
  { name: 'deliveries', path: '/integrations/deliveries', ready: 'Deliveries' },
]

for (const scheme of ['light', 'dark'] as const) {
  test(`screenshots (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await signIn(page)
    for (const p of pages) {
      await page.goto(p.path)
      await expect(page.getByRole('heading', { name: p.ready }).first()).toBeVisible()
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: `docs/images/${p.name}-${scheme}.png` })
    }
  })
}
