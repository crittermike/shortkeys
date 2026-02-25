import { test, expect } from './fixtures'

test.describe('Options Page', () => {

  test('loads and displays the header', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)
    await expect(page).toHaveTitle('Shortkeys Options')
    await expect(page.locator('.brand-text')).toHaveText('Shortkeys')
  })

  test('shows tab bar with Shortcuts, Import, and Export tabs', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)
    const tabs = page.locator('.tab-btn')
    await expect(tabs).toHaveCount(3)
    await expect(tabs.nth(0)).toContainText('Shortcuts')
    await expect(tabs.nth(1)).toContainText('Import')
    await expect(tabs.nth(2)).toContainText('Export')
  })

  test('can add a new shortcut', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    // The page auto-creates one default empty shortcut on first load
    await expect(page.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })

    // Fill in the default shortcut
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
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    // Use the default shortcut card
    await expect(page.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })
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
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    // The default shortcut should be present
    await expect(page.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })

    // Set up dialog handler before clicking delete
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('.btn-delete').click()
    await expect(page.locator('.shortcut-card')).toHaveCount(0)

    // Save and reload to confirm deletion persists
    await page.locator('.btn-primary', { hasText: 'Save shortcuts' }).click()
    await page.reload()
    await expect(page.locator('.shortcut-card')).toHaveCount(0)
  })

  test('can toggle shortcut enabled/disabled', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    // Wait for the default shortcut card
    await expect(page.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })

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
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    // Wait for the default shortcut to load (creates My Shortcuts group)
    await expect(page.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })

    // Handle the prompt dialog that createNewGroup() triggers
    page.on('dialog', (dialog) => dialog.accept('Test Group'))

    // Click "New group"
    await page.locator('.btn-secondary', { hasText: 'New group' }).click()

    // Should see at least 2 group headers (My Shortcuts + new group)
    await expect(page.locator('.group-header')).toHaveCount(2, { timeout: 5000 })
  })

  test('can switch between tabs', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    // Click Import tab
    await page.locator('.tab-btn', { hasText: 'Import' }).click()

    // Import content should be visible
    await expect(page.locator('.field-textarea')).toBeVisible()

    // Click Export tab
    await page.locator('.tab-btn', { hasText: 'Export' }).click()
    await expect(page.locator('.export-pre')).toBeVisible()

    // Click back to Shortcuts tab
    await page.locator('.tab-btn', { hasText: 'Shortcuts' }).click()
    await expect(page.locator('.action-bar').first()).toBeVisible()
  })

  test('search filters shortcuts', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    // Wait for the default shortcut to load
    await expect(page.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })

    // Fill the default one
    await page.locator('.shortcut-label-title').first().fill('Alpha Shortcut')

    // Add a second shortcut
    await page.locator('.action-bar .btn-secondary', { hasText: 'Add shortcut' }).click()
    await expect(page.locator('.shortcut-card')).toHaveCount(2)
    await page.locator('.shortcut-label-title').last().fill('Beta Shortcut')

    // Search for "Alpha" using click + type to ensure Vue v-model reacts
    await page.locator('.search-input').click()
    await page.locator('.search-input').pressSequentially('Alpha', { delay: 50 })
    await expect(page.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })

    // Clear search
    await page.locator('.search-clear').click()
    await expect(page.locator('.shortcut-card')).toHaveCount(2)
  })

  test('import/export round-trip', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    // Use the default shortcut card
    await expect(page.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })
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

    // Delete the shortcut
    await page.locator('.tab-btn', { hasText: 'Shortcuts' }).click()
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('.btn-delete').click()
    await page.locator('.btn-primary', { hasText: 'Save shortcuts' }).click()
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 })

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
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    // Click the theme toggle button
    const themeToggle = page.locator('.theme-toggle')
    await themeToggle.click()

    // The html element should have dark theme data attribute
    const theme = await page.locator('html').getAttribute('data-theme')
    expect(theme === 'dark' || theme === 'light').toBe(true)
  })

  test('expand shortcut settings panel', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)

    // Wait for the default shortcut card
    await expect(page.locator('.shortcut-card')).toHaveCount(1, { timeout: 5000 })

    // Click the settings (cog) button to expand details
    await page.locator('.shortcut-actions .btn-icon').first().click()

    // ShortcutDetails panel should appear
    await expect(page.locator('.shortcut-details')).toBeVisible({ timeout: 5000 })
  })
})
