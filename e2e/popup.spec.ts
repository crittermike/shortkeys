import { test, expect } from './fixtures'
import type { BrowserContext, Page } from '@playwright/test'

/** Open the options page with onboarding already dismissed. */
async function openOptionsPage(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('shortkeys-onboarding-done', 'true')
  })
  await page.goto(`chrome-extension://${extensionId}/options.html`)
  return page
}

test.describe('Popup Command Palette', () => {

  test('popup page loads with search input', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    // The popup should show the search input
    await expect(page.locator('.search-bar input')).toBeVisible({ timeout: 5000 })
  })

  test('popup shows empty state when no shortcuts configured', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/popup.html`)

    // With no saved shortcuts in storage, the empty message should show
    await expect(page.locator('.empty')).toContainText('No shortcuts configured')
  })

  test('popup lists saved shortcuts', async ({ context, extensionId }) => {
    // First configure a shortcut via the options page
    const optionsPage = await openOptionsPage(context, extensionId)

    // Create first shortcut from blank slate
    await optionsPage.locator('.empty-state .btn-primary', { hasText: 'Create your first shortcut' }).click()
    await expect(optionsPage.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })

    // Fill in the shortcut
    await optionsPage.locator('.shortcut-label-title').first().fill('Popup Test Action')

    // Set a key via input field
    await optionsPage.locator('.shortcut-input').first().fill('p')

    // Select action
    await optionsPage.locator('.ss-trigger').first().click()
    await optionsPage.locator('.ss-option', { hasText: 'New tab' }).first().click()

    // Save and wait for storage to persist
    await optionsPage.locator('.btn-primary', { hasText: 'Save shortcuts' }).click()
    await expect(optionsPage.locator('.toast')).toBeVisible({ timeout: 5000 })
    await optionsPage.waitForTimeout(500)

    // Now open the popup
    const popupPage = await context.newPage()
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`)

    // The shortcut should appear in the popup list
    await expect(popupPage.locator('.result-row')).toHaveCount(1, { timeout: 10000 })
    await expect(popupPage.locator('.result-label').first()).toContainText('Popup Test Action')
  })

  test('popup search filters shortcuts', async ({ context, extensionId }) => {
    // Configure two shortcuts via options page
    const optionsPage = await openOptionsPage(context, extensionId)

    // Create first shortcut from blank slate
    await optionsPage.locator('.empty-state .btn-primary', { hasText: 'Create your first shortcut' }).click()
    await expect(optionsPage.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })

    // Fill the first shortcut
    await optionsPage.locator('.shortcut-label-title').first().fill('Navigate Home')
    await optionsPage.locator('.shortcut-input').first().fill('h')
    await optionsPage.locator('.ss-trigger').first().click()
    await optionsPage.locator('.ss-option', { hasText: 'New tab' }).first().click()

    // Add a second shortcut
    await optionsPage.locator('.stats-actions .btn-sm', { hasText: 'Add shortcut' }).click()
    await optionsPage.locator('.shortcut-label-title').last().fill('Close Window')
    await optionsPage.locator('.shortcut-input').last().fill('w')
    await optionsPage.locator('.ss-trigger').last().click()
    await optionsPage.locator('.ss-option', { hasText: 'Close window' }).first().click()

    // Save
    await optionsPage.locator('.btn-primary', { hasText: 'Save shortcuts' }).click()
    await expect(optionsPage.locator('.toast')).toBeVisible({ timeout: 5000 })

    // Open popup and search
    const popupPage = await context.newPage()
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`)

    // Should see both
    await expect(popupPage.locator('.result-row')).toHaveCount(2, { timeout: 5000 })

    // Search for "Navigate"
    await popupPage.locator('.search-bar input').fill('Navigate')
    await expect(popupPage.locator('.result-row')).toHaveCount(1)
    await expect(popupPage.locator('.result-label').first()).toContainText('Navigate Home')
  })
})
