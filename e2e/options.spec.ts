import { test, expect } from './fixtures'
import type { BrowserContext, Page } from '@playwright/test'

/** Open the options page with onboarding already dismissed. */
async function openOptionsPage(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage()
  // Skip the onboarding wizard so tests interact with the normal options UI
  await page.addInitScript(() => {
    localStorage.setItem('shortkeys-onboarding-done', 'true')
  })
  await page.goto(`chrome-extension://${extensionId}/options.html`)
  return page
}

/** Click "Create your first shortcut" on the blank slate to add an empty shortcut card. */
async function createFirstShortcut(page: Page) {
  await page.locator('.empty-state .btn-primary', { hasText: 'Create your first shortcut' }).click()
  await expect(page.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })
}

test.describe('Options Page', () => {

  test('loads and displays the header', async ({ context, extensionId }) => {
    const page = await openOptionsPage(context, extensionId)
    await expect(page).toHaveTitle('Shortkeys Options')
    await expect(page.locator('.brand-text')).toHaveText('Shortkeys')
  })

  test('shows tab bar with Shortcuts, Packs, Import, Export, and Analytics tabs', async ({
    context,
    extensionId,
  }) => {
    const page = await openOptionsPage(context, extensionId)
    const tabs = page.locator('.tab-btn')
    await expect(tabs).toHaveCount(5)
    await expect(tabs.nth(0)).toContainText('Shortcuts')
    await expect(tabs.nth(1)).toContainText('Packs')
    await expect(tabs.nth(2)).toContainText('Import')
    await expect(tabs.nth(3)).toContainText('Export')
    await expect(tabs.nth(4)).toContainText('Analytics')
  })

  test('shows empty state when no shortcuts exist', async ({ context, extensionId }) => {
    const page = await openOptionsPage(context, extensionId)

    // Empty state should be visible with CTA buttons
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.empty-state-title')).toHaveText('No shortcuts yet')
    await expect(page.locator('.empty-state .btn-primary')).toContainText('Create your first shortcut')
    await expect(page.locator('.empty-state .btn-secondary')).toContainText('Browse shortcut packs')
  })

  test('can add a new shortcut', async ({ context, extensionId }) => {
    const page = await openOptionsPage(context, extensionId)
    // Click "Create your first shortcut" from the blank slate
    await createFirstShortcut(page)

    // Fill in the shortcut
    await page.locator('.shortcut-label-title').first().fill('Test Shortcut')

    // Open the behavior dropdown and select an action
    await page.locator('.ss-trigger').first().click()
    await page.locator('.ss-option', { hasText: 'New tab' }).first().click()

    // Save
    await page.locator('.btn-primary', { hasText: 'Save shortcuts' }).click()

    // Toast should confirm save
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 })
  })

  test('shortcut persists after page reload', async ({ context, extensionId }) => {
    const page = await openOptionsPage(context, extensionId)
    // Create first shortcut from blank slate
    await createFirstShortcut(page)
    await page.locator('.shortcut-label-title').first().fill('Persist Test')
    await page.locator('.ss-trigger').first().click()
    await page.locator('.ss-option', { hasText: 'New tab' }).first().click()
    await page.locator('.btn-primary', { hasText: 'Save shortcuts' }).click()
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 })

    // Reload and verify it persists
    await page.reload()
    await expect(page.locator('.shortcut-label-title').first()).toHaveValue('Persist Test')
  })

  test('can delete a shortcut', async ({ context, extensionId }) => {
    const page = await openOptionsPage(context, extensionId)
    // Create first shortcut from blank slate and save it
    await createFirstShortcut(page)
    await page.locator('.shortcut-label-title').first().fill('Delete Me')
    // Must select an action so the shortcut isn't stripped as empty on save
    await page.locator('.ss-trigger').first().click()
    await page.locator('.ss-option', { hasText: 'New tab' }).first().click()
    await page.locator('.btn-primary', { hasText: 'Save shortcuts' }).click()
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 })

    // Set up dialog handler before clicking delete
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('.btn-delete').click()
    await expect(page.locator('.shortcut-card')).toHaveCount(0)

    // After deleting the only shortcut, the empty state shows
    await expect(page.locator('.empty-state')).toBeVisible()

    // Deletion auto-saves, so reload should confirm it persisted
    await page.reload()
    await expect(page.locator('.shortcut-card')).toHaveCount(0)
    await expect(page.locator('.empty-state')).toBeVisible()
  })

  test('can toggle shortcut enabled/disabled', async ({ context, extensionId }) => {
    const page = await openOptionsPage(context, extensionId)
    // Create first shortcut from blank slate
    await createFirstShortcut(page)

    // The toggle should default to "on"
    const toggle = page.locator('.toggle').first()
    await expect(toggle).toHaveClass(/on/)

    // Click to disable
    await toggle.click()
    await expect(toggle).not.toHaveClass(/on/)

    // The card should be marked disabled
    await expect(page.locator('.shortcut-card').first()).toHaveClass(/disabled/)
  })

  test('can create a new group', async ({ context, extensionId }) => {
    const page = await openOptionsPage(context, extensionId)
    // Create first shortcut from blank slate (creates My Shortcuts group)
    await createFirstShortcut(page)

    // Handle the prompt dialog that createNewGroup() triggers
    page.on('dialog', (dialog) => dialog.accept('Test Group'))

    // Click "New group"
    await page.locator('.btn-secondary', { hasText: 'New group' }).click()

    // Should see at least 2 group headers (My Shortcuts + new group)
    await expect(page.locator('.group-header')).toHaveCount(2, { timeout: 5000 })
  })

  test('can switch between tabs', async ({ context, extensionId }) => {
    const page = await openOptionsPage(context, extensionId)
    // Click Import tab
    await page.locator('.tab-btn', { hasText: 'Import' }).click()

    // Import content should be visible
    await expect(page.locator('.field-textarea')).toBeVisible()

    // Click Export tab
    await page.locator('.tab-btn', { hasText: 'Export' }).click()
    await expect(page.locator('.export-pre')).toBeVisible()

    // Click back to Shortcuts tab
    await page.locator('.tab-btn', { hasText: 'Shortcuts' }).click()
    // With no shortcuts, the empty state should show
    await expect(page.locator('.empty-state')).toBeVisible()
  })

  test('search filters shortcuts', async ({ context, extensionId }) => {
    const page = await openOptionsPage(context, extensionId)
    // Create first shortcut from blank slate
    await createFirstShortcut(page)

    // Fill the first one
    await page.locator('.shortcut-label-title').first().fill('Alpha Shortcut')

    // Add a second shortcut
    await page.locator('.stats-actions .btn-sm', { hasText: 'Add shortcut' }).click()
    await expect(page.locator('.shortcut-card')).toHaveCount(2)
    await page.locator('.shortcut-label-title').last().fill('Beta Shortcut')

    // Search for "Alpha" using click + type to ensure Vue v-model reacts
    await page.getByPlaceholder('Filter shortcuts…').click()
    await page.getByPlaceholder('Filter shortcuts…').pressSequentially('Alpha', { delay: 50 })
    await expect(page.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })

    // Clear search
    await page.locator('.search-clear').click()
    await expect(page.locator('.shortcut-card')).toHaveCount(2)
  })

  test('import/export round-trip', async ({ context, extensionId }) => {
    const page = await openOptionsPage(context, extensionId)
    // Create first shortcut from blank slate
    await createFirstShortcut(page)
    await page.locator('.shortcut-label-title').first().fill('Round Trip Test')
    await page.locator('.ss-trigger').first().click()
    await page.locator('.ss-option', { hasText: 'New tab' }).first().click()
    await page.locator('.btn-primary', { hasText: 'Save shortcuts' }).click()
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 })

    // Go to Export tab and copy the JSON
    await page.locator('.tab-btn', { hasText: 'Export' }).click()
    const exportPre = page.locator('.export-pre')
    await expect(exportPre).toBeVisible({ timeout: 5000 })
    const exportedJson = await exportPre.textContent()
    expect(exportedJson).toContain('Round Trip Test')

    // Delete the shortcut (auto-saves)
    await page.locator('.tab-btn', { hasText: 'Shortcuts' }).click()
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('.btn-delete').click()
    await expect(page.locator('.shortcut-card')).toHaveCount(0)

    // Import the JSON
    await page.locator('.tab-btn', { hasText: 'Import' }).click()
    const importTextarea = page.locator('.field-textarea')
    await expect(importTextarea).toBeVisible({ timeout: 5000 })
    await importTextarea.fill(exportedJson!)
    await page.locator('.btn-primary', { hasText: 'Import JSON' }).click()

    // Verify shortcut is back
    await page.locator('.tab-btn', { hasText: 'Shortcuts' }).click()
    await expect(page.locator('.shortcut-label-title').first()).toHaveValue('Round Trip Test')
  })

  test('dark mode toggle works', async ({ context, extensionId }) => {
    const page = await openOptionsPage(context, extensionId)
    // Click the theme toggle button
    const themeToggle = page.locator('.theme-toggle')
    await themeToggle.click()

    // The html element should have dark theme data attribute
    const theme = await page.locator('html').getAttribute('data-theme')
    expect(theme === 'dark' || theme === 'light').toBe(true)
  })

  test('expand shortcut settings panel', async ({ context, extensionId }) => {
    const page = await openOptionsPage(context, extensionId)
    // Create first shortcut from blank slate
    await createFirstShortcut(page)

    // Click the settings (cog) button to expand details
    await page.locator('.shortcut-actions .btn-icon').first().click()

    // ShortcutDetails panel should appear
    await expect(page.locator('.shortcut-details')).toBeVisible({ timeout: 5000 })
  })

  test('onboarding wizard shows on fresh install and can be skipped', async ({ context, extensionId }) => {
    // Do NOT use openOptionsPage — we want the wizard to appear
    const page = await context.newPage()
    // Clear the onboarding flag to simulate a fresh install (previous tests may have set it)
    await page.addInitScript(() => {
      localStorage.removeItem('shortkeys-onboarding-done')
    })
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    // The wizard should appear for a fresh install
    await expect(page.locator('.onboarding-wizard')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.step-title')).toHaveText('Quick start')

    // Skip onboarding
    await page.locator('.btn-skip-top').click()

    // The wizard should disappear, showing the empty state
    await expect(page.locator('.onboarding-wizard')).not.toBeVisible()
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 5000 })
  })
})
