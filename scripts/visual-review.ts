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

  await optionsPage.close()
  await context.close()

  console.log(`\nDone! Screenshots saved to ${SCREENSHOT_DIR}/`)
  console.log('  - popup-empty.png')
  console.log('  - popup-quick-add.png')
  console.log('  - popup-quick-add-dropdown.png')
  console.log('  - options-page.png')
}

main().catch((err) => {
  console.error('Visual review failed:', err)
  process.exit(1)
})
