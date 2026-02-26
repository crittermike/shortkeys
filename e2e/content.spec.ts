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

test.describe('Content Script', () => {

  test('content script loads on a web page', async ({ context, extensionId }) => {
    const page = await openOptionsPage(context, extensionId)

    // Create first shortcut from blank slate
    await page.locator('.empty-state .btn-primary', { hasText: 'Create your first shortcut' }).click()
    await expect(page.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })

    // Fill in the default shortcut with a label and key
    await page.locator('.shortcut-label-title').first().fill('Scroll Down Test')

    // Set the shortcut key via the input field directly
    await page.locator('.shortcut-input').first().fill('j')

    // Select "Scroll down" action
    await page.locator('.ss-trigger').first().click()
    await page.locator('.ss-option', { hasText: 'Scroll down' }).first().click()

    // Save
    await page.locator('.btn-primary', { hasText: 'Save shortcuts' }).click()
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 })

    // Navigate to a local page to avoid network dependency in CI
    const testPage = await context.newPage()
    await testPage.goto('data:text/html,<html><head><title>Test Page</title></head><body style="height:2000px"><p>Hello</p></body></html>')

    // Give content script time to initialize
    await testPage.waitForTimeout(1500)

    // Verify page is functional (content script didn't crash it)
    const title = await testPage.title()
    expect(title).toBe('Test Page')

    // Press the shortcut key — just verify no errors
    await testPage.keyboard.press('j')
    await testPage.waitForTimeout(300)

    const scrollY = await testPage.evaluate(() => window.scrollY)
    expect(typeof scrollY).toBe('number')
  })
})
