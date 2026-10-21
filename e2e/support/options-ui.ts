import { expect, type BrowserContext, type Page } from '@playwright/test'

export async function openOptions(context: BrowserContext, extensionId: string, base = 'chrome-extension'): Promise<Page> {
  const page = await context.newPage()
  await page.addInitScript(() => localStorage.setItem('shortkeys-onboarding-done', 'true'))
  await page.goto(`${base}://${extensionId}/options.html`)
  await expect(page.locator('.brand-text')).toBeVisible()
  return page
}

export interface NewShortcut {
  key: string
  action: string
  label?: string
}

/** Add a shortcut card through the UI and return its locator. Does not save. */
export async function addShortcut(page: Page, { key, action, label }: NewShortcut) {
  const empty = page.locator('.empty-state .btn-primary', { hasText: 'Create your first shortcut' })
  if (await empty.isVisible()) await empty.click()
  else await page.locator('.stats-actions .btn-sm', { hasText: 'Add shortcut' }).click()
  const card = page.locator('.shortcut-card').last()
  if (label) await card.locator('.shortcut-label-title').fill(label)
  await card.locator('.shortcut-input').fill(key)
  await card.locator('.ss-trigger').click()
  await page.locator('.ss-search').fill(action)
  await page.locator('.ss-option').filter({ has: page.locator('.ss-opt-label').getByText(action, { exact: true }) }).click()
  return card
}

export async function openDetails(card: ReturnType<Page['locator']>) {
  // Actions with settings expand automatically when selected.
  const cog = card.locator('.mdi-cog-outline')
  if (await cog.count()) await cog.click()
  const details = card.page().locator('.shortcut-details')
  await expect(details).toBeVisible()
  return details
}

export async function save(page: Page) {
  await page.locator('.btn-primary', { hasText: 'Save shortcuts' }).click()
  await expect(page.locator('.toast')).toContainText('saved')
  await expect(page.locator('.btn-primary', { hasText: 'Save shortcuts' })).toHaveCount(0)
}
