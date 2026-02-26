/**
 * Take a hero screenshot of the extension for the website.
 *
 * Pre-populates realistic shortcuts across groups, then screenshots
 * the options page at a marketing-friendly viewport.
 *
 * Usage:
 *   npx tsx scripts/take-hero-screenshot.ts
 *
 * Output: site/images/screenshot-hero.png
 */

import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const OUTPUT_PATH = path.resolve('site/images/screenshot-hero.png')
const EXTENSION_PATH = path.resolve('.output/chrome-mv3')

const DEMO_SHORTCUTS = [
  {
    id: 'demo-1',
    key: 'shift+k',
    action: 'nexttab',
    label: 'Next tab',
    enabled: true,
    group: 'Tab Management',
  },
  {
    id: 'demo-2',
    key: 'shift+j',
    action: 'prevtab',
    label: 'Previous tab',
    enabled: true,
    group: 'Tab Management',
  },
  {
    id: 'demo-3',
    key: 'ctrl+shift+t',
    action: 'reopentab',
    label: 'Reopen closed tab',
    enabled: true,
    group: 'Tab Management',
  },
  {
    id: 'demo-4',
    key: 'ctrl+shift+d',
    action: 'clonetab',
    label: 'Duplicate current tab',
    enabled: true,
    group: 'Tab Management',
  },
  {
    id: 'demo-5',
    key: 'g g',
    action: 'top',
    label: 'Jump to top',
    enabled: true,
    group: 'Navigation',
  },
  {
    id: 'demo-6',
    key: 'shift+g',
    action: 'bottom',
    label: 'Jump to bottom',
    enabled: true,
    group: 'Navigation',
  },
  {
    id: 'demo-7',
    key: 'ctrl+shift+b',
    action: 'back',
    label: 'Go back one page',
    enabled: true,
    group: 'Navigation',
  },
  {
    id: 'demo-8',
    key: 'm',
    action: 'togglemute',
    label: 'Toggle mute',
    enabled: true,
    group: 'Media',
  },
  {
    id: 'demo-9',
    key: 'shift+.',
    action: 'videospeedup',
    label: 'Speed up video',
    enabled: true,
    group: 'Media',
  },
  {
    id: 'demo-10',
    key: 'shift+,',
    action: 'videospeeddown',
    label: 'Slow down video',
    enabled: true,
    group: 'Media',
  },
  {
    id: 'demo-11',
    key: 'ctrl+shift+f',
    action: 'togglefullscreen',
    label: 'Toggle fullscreen',
    enabled: true,
    group: 'Media',
  },
  {
    id: 'demo-12',
    key: 'ctrl+shift+s',
    action: 'capturescreenshot',
    label: 'Take screenshot',
    enabled: true,
    group: 'Utilities',
  },
]

async function main() {
  // Ensure output directory exists
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })

  console.log('Launching browser with extension...')
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
  console.log(`Extension loaded: ${extensionId}`)

  // Close auto-opened pages
  const deadline = Date.now() + 3000
  while (context.pages().length < 2 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 200))
  }
  for (const p of context.pages()) {
    await p.close().catch(() => {})
  }

  // Inject demo shortcuts via service worker
  console.log('Injecting demo shortcuts...')
  await sw.evaluate((shortcuts) => {
    const json = JSON.stringify(shortcuts)
    return Promise.all([
      (chrome.storage.sync as chrome.storage.SyncStorageArea).set({ keys: json }),
      chrome.storage.local.set({ keys: json }),
    ])
  }, DEMO_SHORTCUTS)

  // Small delay for storage to settle
  await new Promise((r) => setTimeout(r, 500))

  // Open options page and screenshot
  console.log('Taking screenshot...')
  const page = await context.newPage()
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`chrome-extension://${extensionId}/options.html`)
  await page.waitForSelector('.app-main', { timeout: 5000 })
  await page.waitForTimeout(1000) // Let everything render

  // Scroll down slightly so shortcuts fill the frame, header is trimmed
  await page.evaluate(() => window.scrollBy(0, 60))
  await page.waitForTimeout(300)

  await page.screenshot({
    path: OUTPUT_PATH,
    fullPage: false,
  })

  await page.close()
  await context.close()

  console.log(`Screenshot saved to ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error('Screenshot failed:', err)
  process.exit(1)
})
