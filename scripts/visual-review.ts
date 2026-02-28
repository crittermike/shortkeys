/**
 * Visual Review Script
 *
 * Takes screenshots of extension UI pages for visual review after changes.
 * Builds the extension, launches Chrome with it loaded, and captures:
 *   1. Popup — empty state
 *   2. Popup — quick-add form open
 *   3. Options page — default state
 *
 * Usage:
 *   npx tsx scripts/visual-review.ts
 *
 * Screenshots are saved to screenshots/ (gitignored).
 */

import { chromium } from '@playwright/test'
import path from 'path'
import { execSync } from 'child_process'
import fs from 'fs'

const SCREENSHOT_DIR = path.resolve('screenshots')
const EXTENSION_PATH = path.resolve('.output/chrome-mv3')

async function main() {
  // 1. Build the extension
  console.log('Building extension...')
  execSync('npm run build', { stdio: 'inherit' })

  // 2. Ensure screenshot directory exists
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

  // 3. Launch browser with extension
  console.log('Launching browser...')
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      '--headless=new',
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--disable-default-apps',
    ],
  })

  // Wait for service worker
  let [sw] = context.serviceWorkers()
  if (!sw) {
    sw = await context.waitForEvent('serviceworker')
  }
  const extensionId = sw.url().split('/')[2]

  // Close auto-opened pages (welcome/options)
  const deadline = Date.now() + 3000
  while (context.pages().length < 2 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 200))
  }
  for (const p of context.pages()) {
    await p.close().catch(() => {})
  }

  console.log(`Extension loaded: ${extensionId}`)

  // 4. Screenshot: Popup — empty state
  console.log('Capturing popup (empty state)...')
  const popupPage = await context.newPage()
  await popupPage.setViewportSize({ width: 360, height: 480 })
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`)
  await popupPage.waitForSelector('.popup', { timeout: 5000 })
  await popupPage.waitForTimeout(300) // Let fonts/icons load
  await popupPage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'popup-empty.png'),
    fullPage: true,
  })

  // 5. Screenshot: Popup — quick-add form
  console.log('Capturing popup (quick-add form)...')
  await popupPage.click('.settings-link:has(.mdi-plus)')
  await popupPage.waitForSelector('.quick-add', { timeout: 3000 })
  await popupPage.waitForTimeout(300)
  await popupPage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'popup-quick-add.png'),
    fullPage: true,
  })

  // 6. Screenshot: Popup — quick-add with action dropdown open
  console.log('Capturing popup (action dropdown open)...')
  await popupPage.click('.quick-add .ss-trigger')
  await popupPage.waitForSelector('.ss-dropdown', { timeout: 3000 })
  await popupPage.waitForTimeout(300)
  await popupPage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'popup-quick-add-dropdown.png'),
    fullPage: true,
  })

  await popupPage.close()

  // Inject test shortcuts via service worker so options page has data
  console.log('Injecting test shortcuts...')
  const testShortcuts = [
    { id: 'test-1', key: 'ctrl+shift+t', action: 'newtab', label: 'Open new tab', enabled: true, group: 'My Shortcuts' },
    { id: 'test-2', key: 'ctrl+shift+w', action: 'closetab', label: 'Close current tab', enabled: true, group: 'My Shortcuts' },
    { id: 'test-3', key: 'ctrl+shift+l', action: 'nexttab', label: 'Next tab', enabled: true, group: 'My Shortcuts' },
    { id: 'test-4', key: 'ctrl+shift+h', action: 'prevtab', label: 'Previous tab', enabled: false, group: 'My Shortcuts' },
    { id: 'test-5', key: 'alt+s', action: 'scrolldown', label: 'Scroll down', enabled: true, group: 'Navigation' },
    { id: 'test-6', key: 'alt+w', action: 'scrollup', label: 'Scroll up', enabled: true, group: 'Navigation' },
    { id: 'test-7', key: 'alt+d', action: 'scrolldownmore', label: 'Scroll down more', enabled: true, group: 'Navigation' },
    { id: 'test-8', key: 'alt+a', action: 'scrollupmore', label: 'Page up', enabled: true, group: 'Navigation' },
    { id: 'test-9', key: 'g i', action: 'javascript', label: 'Run custom script', enabled: true, group: 'My Shortcuts' },
    { id: 'test-10', key: 'ctrl+b', action: 'bookmark', label: 'Bookmark page', enabled: true, group: 'My Shortcuts' },
  ]
  await sw.evaluate((shortcuts) => {
    return (globalThis as any).chrome.storage.local.set({ keys: JSON.stringify(shortcuts) })
  }, testShortcuts)
  // Also mark onboarding done
  const setupPage = await context.newPage()
  await setupPage.goto(`chrome-extension://${extensionId}/options.html`)
  await setupPage.waitForSelector('.app-main', { timeout: 5000 })
  await setupPage.evaluate(() => {
    localStorage.setItem('shortkeys-onboarding-done', 'true')
  })
  await setupPage.close()

  // 7. Screenshot: Options page — comfortable view (default)
  console.log('Capturing options page (comfortable view)...')
  const optionsPage = await context.newPage()
  await optionsPage.setViewportSize({ width: 1280, height: 900 })
  await optionsPage.goto(`chrome-extension://${extensionId}/options.html`)
  await optionsPage.waitForSelector('.shortcut-card', { timeout: 5000 })
  await optionsPage.waitForTimeout(500)
  await optionsPage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'options-comfortable.png'),
    fullPage: true,
  })

  // 8. Screenshot: Options page — condensed view
  console.log('Capturing options page (condensed view)...')
  // Click the density toggle button
  await optionsPage.click('.density-toggle')
  await optionsPage.waitForTimeout(300)
  await optionsPage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'options-condensed.png'),
    fullPage: true,
  })

  // 8. Screenshot: Options page — Analytics tab
  console.log('Capturing options page (Analytics tab)...')
  const analyticsPage = await context.newPage()
  await analyticsPage.setViewportSize({ width: 1280, height: 800 })
  await analyticsPage.goto(`chrome-extension://${extensionId}/options.html`)
  await analyticsPage.waitForSelector('.app-main', { timeout: 5000 })
  await analyticsPage.waitForTimeout(500)
  // Click the Analytics tab (4th tab button)
  const tabButtons = analyticsPage.locator('.tab-btn')
  await tabButtons.nth(3).click()
  await analyticsPage.waitForTimeout(500)
  await analyticsPage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'options-analytics.png'),
    fullPage: false,
  })

  await analyticsPage.close()

  // 9. Screenshot: Options page — Import tab
  console.log('Capturing options page (Import tab)...')
  const importPage = await context.newPage()
  await importPage.setViewportSize({ width: 1280, height: 800 })
  await importPage.goto(`chrome-extension://${extensionId}/options.html`)
  await importPage.waitForSelector('.app-main', { timeout: 5000 })
  await importPage.waitForTimeout(500)
  // Click the Import tab (2nd tab button, index 1)
  const importTabButtons = importPage.locator('.tab-btn')
  await importTabButtons.nth(1).click()
  await importPage.waitForTimeout(500)
  await importPage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'options-import.png'),
    fullPage: false,
  })

  await importPage.close()

  await context.close()

  console.log(`\nDone! Screenshots saved to ${SCREENSHOT_DIR}/`)
  console.log('  - popup-empty.png')
  console.log('  - popup-quick-add.png')
  console.log('  - popup-quick-add-dropdown.png')
  console.log('  - options-comfortable.png')
  console.log('  - options-condensed.png')
  console.log('  - options-analytics.png')
  console.log('  - options-import.png')
}

main().catch((err) => {
  console.error('Visual review failed:', err)
  process.exit(1)
})
