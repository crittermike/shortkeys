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

  // 7. Screenshot: Options page
  console.log('Capturing options page...')
  const optionsPage = await context.newPage()
  await optionsPage.setViewportSize({ width: 1280, height: 800 })
  await optionsPage.goto(`chrome-extension://${extensionId}/options.html`)
  await optionsPage.waitForSelector('.app-main', { timeout: 5000 })
  await optionsPage.waitForTimeout(500) // Let CodeMirror + icons load
  await optionsPage.screenshot({
    path: path.join(SCREENSHOT_DIR, 'options-page.png'),
    fullPage: false, // Just viewport — options page can be very tall
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

  // 10. Screenshot: Cheat sheet on a supported site (GitHub)
  console.log('Capturing cheat sheet on GitHub...')
  // Set test shortcuts in storage so content script picks them up
  const setupPage = await context.newPage()
  await setupPage.goto(`chrome-extension://${extensionId}/options.html`)
  await setupPage.waitForSelector('.app-main', { timeout: 5000 })
  await setupPage.evaluate(() => {
    return new Promise<void>((resolve) => {
      chrome.storage.sync.set({
        keys: JSON.stringify([
          { id: 'cs-1', key: 'shift+/', action: 'showcheatsheet', enabled: true, label: 'Show cheat sheet' },
          { id: 'cs-2', key: 'alt+t', action: 'newtab', enabled: true, label: 'Open new tab' },
          { id: 'cs-3', key: 'alt+w', action: 'closetab', enabled: true, label: 'Close current tab' },
          { id: 'cs-4', key: 'j', action: 'scrolldown', enabled: true, label: 'Scroll down' },
          { id: 'cs-5', key: 'k', action: 'scrollup', enabled: true, label: 'Scroll up' },
        ]),
      }, () => resolve())
    })
  })
  await setupPage.close()

  const ghPage = await context.newPage()
  await ghPage.setViewportSize({ width: 1280, height: 800 })
  await ghPage.goto('https://github.com/crittermike/shortkeys', { waitUntil: 'load', timeout: 20000 })
  await ghPage.waitForTimeout(3000) // Let content script load + bind keys

  // Trigger cheat sheet via message from background (most reliable method)
  // The content script listens for { action: 'showcheatsheet' } messages
  const ghPageTabId = await ghPage.evaluate(() => {
    return new Promise<number>((resolve) => {
      // Trigger via dispatching to the content script through the extension's runtime
      const event = new KeyboardEvent('keydown', { key: '?', shiftKey: true, bubbles: true })
      document.dispatchEvent(event)
      resolve(0)
    })
  })

  // Also try pressing keyboard directly
  await ghPage.keyboard.press('Shift+/')
  await ghPage.waitForTimeout(1000)

  // Check if cheat sheet appeared
  let cheatsheetVisible = await ghPage.$('#__shortkeys-cheatsheet')

  if (!cheatsheetVisible) {
    // Last resort: send message from extension context to trigger cheat sheet
    const triggerPage = await context.newPage()
    await triggerPage.goto(`chrome-extension://${extensionId}/options.html`)
    await triggerPage.waitForSelector('.app-main', { timeout: 5000 })
    // Get the tab ID of the GitHub page and send it a message
    await triggerPage.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: '*://github.com/*' })
      if (tabs[0]?.id) {
        await chrome.tabs.sendMessage(tabs[0].id, { action: 'showcheatsheet' })
      }
    })
    await triggerPage.close()
    await ghPage.waitForTimeout(1000)
    cheatsheetVisible = await ghPage.$('#__shortkeys-cheatsheet')
  }

  if (cheatsheetVisible) {
    // Screenshot: User shortcuts tab
    await ghPage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'cheatsheet-user-tab.png'),
      fullPage: false,
    })

    // Click the site shortcuts tab (2nd button in tab bar)
    const siteTab = await ghPage.$('#__shortkeys-cheatsheet button:nth-child(2)')
    if (siteTab) {
      await siteTab.click()
      await ghPage.waitForTimeout(300)
      await ghPage.screenshot({
        path: path.join(SCREENSHOT_DIR, 'cheatsheet-site-tab.png'),
        fullPage: false,
      })
    } else {
      console.warn('  \u26a0 Site shortcuts tab not found')
    }
  } else {
    console.warn('  \u26a0 Cheat sheet did not appear \u2014 skipping cheat sheet screenshots')
  }

  await ghPage.close()

  await context.close()

  console.log(`\nDone! Screenshots saved to ${SCREENSHOT_DIR}/`)
  console.log('  - popup-empty.png')
  console.log('  - popup-quick-add.png')
  console.log('  - popup-quick-add-dropdown.png')
  console.log('  - options-page.png')
  console.log('  - options-analytics.png')
  console.log('  - options-import.png')
  if (cheatsheetVisible) {
    console.log('  - cheatsheet-user-tab.png')
    console.log('  - cheatsheet-site-tab.png')
  }
}

main().catch((err) => {
  console.error('Visual review failed:', err)
  process.exit(1)
})
