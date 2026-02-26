/**
 * Take feature screenshots of the extension for the website.
 *
 * Captures three scenarios:
 *   1. Macros — a shortcut with multiple chained actions visible
 *   2. Custom JavaScript — a shortcut with the CodeMirror editor open
 *   3. Dark mode — the options page in dark theme
 *
 * Usage:
 *   npm run build && npx tsx scripts/take-feature-screenshots.ts
 *
 * Output: site/images/screenshot-macros.png
 *         site/images/screenshot-custom-js.png
 *         site/images/screenshot-dark-mode.png
 */

import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const OUTPUT_DIR = path.resolve('site/images')
const EXTENSION_PATH = path.resolve('.output/chrome-mv3')

/** Demo shortcuts showcasing macros */
const MACRO_SHORTCUTS = [
  {
    id: 'macro-1',
    key: 'ctrl+shift+m',
    action: 'macro',
    label: 'Morning routine',
    enabled: true,
    group: 'Macros',
    macroSteps: [
      { action: 'newtab', delay: 0 },
      { action: 'togglepin', delay: 100 },
      { action: 'togglemute', delay: 0 },
    ],
  },
  {
    id: 'macro-2',
    key: 'ctrl+shift+c',
    action: 'macro',
    label: 'Clean up tabs',
    enabled: true,
    group: 'Macros',
    macroSteps: [
      { action: 'closelefttabs', delay: 0 },
      { action: 'closerighttabs', delay: 100 },
    ],
  },
  {
    id: 'nav-1',
    key: 'shift+k',
    action: 'nexttab',
    label: 'Next tab',
    enabled: true,
    group: 'Navigation',
  },
  {
    id: 'nav-2',
    key: 'shift+j',
    action: 'prevtab',
    label: 'Previous tab',
    enabled: true,
    group: 'Navigation',
  },
  {
    id: 'nav-3',
    key: 'g g',
    action: 'top',
    label: 'Scroll to top',
    enabled: true,
    group: 'Navigation',
  },
]

/** Demo shortcuts showcasing custom JavaScript */
const JS_SHORTCUTS = [
  {
    id: 'js-1',
    key: 'ctrl+shift+h',
    action: 'javascript',
    label: 'Highlight all links',
    enabled: true,
    group: 'Custom Scripts',
    code: `// Highlight all links on the page\ndocument.querySelectorAll('a').forEach(link => {\n  link.style.backgroundColor = '#fef08a';\n  link.style.outline = '2px solid #eab308';\n});\nconsole.log('Highlighted', document.querySelectorAll('a').length, 'links');`,
  },
  {
    id: 'js-2',
    key: 'ctrl+shift+r',
    action: 'javascript',
    label: 'Remove all images',
    enabled: true,
    group: 'Custom Scripts',
    code: `document.querySelectorAll('img').forEach(img => img.remove());`,
  },
  {
    id: 'js-3',
    key: 'ctrl+shift+f',
    action: 'javascript',
    label: 'Focus mode',
    enabled: true,
    group: 'Custom Scripts',
    code: `// Hide distracting elements\nconst selectors = ['header', 'footer', 'aside', 'nav', '[role="banner"]'];\nselectors.forEach(sel => {\n  document.querySelectorAll(sel).forEach(el => el.style.display = 'none');\n});`,
  },
  {
    id: 'nav-1',
    key: 'shift+k',
    action: 'nexttab',
    label: 'Next tab',
    enabled: true,
    group: 'Navigation',
  },
  {
    id: 'nav-2',
    key: 'g g',
    action: 'top',
    label: 'Scroll to top',
    enabled: true,
    group: 'Navigation',
  },
]

/** Demo shortcuts for dark mode screenshot */
const DARK_MODE_SHORTCUTS = [
  {
    id: 'dm-1',
    key: 'shift+k',
    action: 'nexttab',
    label: 'Next tab',
    enabled: true,
    group: 'Tab Management',
  },
  {
    id: 'dm-2',
    key: 'shift+j',
    action: 'prevtab',
    label: 'Previous tab',
    enabled: true,
    group: 'Tab Management',
  },
  {
    id: 'dm-3',
    key: 'ctrl+shift+t',
    action: 'reopentab',
    label: 'Reopen closed tab',
    enabled: true,
    group: 'Tab Management',
  },
  {
    id: 'dm-4',
    key: 'g g',
    action: 'top',
    label: 'Scroll to top',
    enabled: true,
    group: 'Navigation',
  },
  {
    id: 'dm-5',
    key: 'shift+g',
    action: 'bottom',
    label: 'Scroll to bottom',
    enabled: true,
    group: 'Navigation',
  },
  {
    id: 'dm-6',
    key: 'm',
    action: 'togglemute',
    label: 'Toggle mute',
    enabled: true,
    group: 'Media',
  },
  {
    id: 'dm-7',
    key: 'ctrl+shift+s',
    action: 'capturescreenshot',
    label: 'Take screenshot',
    enabled: true,
    group: 'Utilities',
  },
]

async function launchExtension() {
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

  let [sw] = context.serviceWorkers()
  if (!sw) {
    sw = await context.waitForEvent('serviceworker')
  }
  const extensionId = sw.url().split('/')[2]

  // Close auto-opened pages
  const deadline = Date.now() + 3000
  while (context.pages().length < 2 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 200))
  }
  for (const p of context.pages()) {
    await p.close().catch(() => {})
  }

  return { context, sw, extensionId }
}

async function injectShortcuts(
  sw: ReturnType<Awaited<ReturnType<typeof launchExtension>>['sw'] extends infer T ? () => T : never>,
  shortcuts: typeof MACRO_SHORTCUTS,
) {
  const swAny = sw as any
  await swAny.evaluate((data: any) => {
    const json = JSON.stringify(data)
    return Promise.all([
      (chrome.storage.sync as chrome.storage.SyncStorageArea).set({ keys: json }),
      chrome.storage.local.set({ keys: json }),
    ])
  }, shortcuts)
  await new Promise((r) => setTimeout(r, 500))
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log('Launching browser with extension...')
  const { context, sw, extensionId } = await launchExtension()

  // ── 1. Macros screenshot ──
  console.log('\n📸 Taking macros screenshot...')
  await injectShortcuts(sw, MACRO_SHORTCUTS)

  const macroPage = await context.newPage()
  await macroPage.setViewportSize({ width: 1280, height: 900 })
  await macroPage.goto(`chrome-extension://${extensionId}/options.html`)
  await macroPage.waitForSelector('.app-main', { timeout: 5000 })
  await macroPage.waitForTimeout(1000)

  // Click the settings/expand button on the first macro shortcut to reveal macro builder
  const macroExpandBtn = macroPage.locator('.shortcut-card').first().locator('.btn-icon').first()
  await macroExpandBtn.click()
  await macroPage.waitForSelector('.macro-builder', { timeout: 3000 })
  await macroPage.waitForTimeout(500)

  // Scroll to frame the macro builder nicely
  await macroPage.evaluate(() => window.scrollBy(0, 60))
  await macroPage.waitForTimeout(300)

  await macroPage.screenshot({
    path: path.join(OUTPUT_DIR, 'screenshot-macros.png'),
    fullPage: false,
  })
  console.log('  ✓ Saved screenshot-macros.png')
  await macroPage.close()

  // ── 2. Custom JavaScript screenshot ──
  console.log('\n📸 Taking custom JavaScript screenshot...')
  await injectShortcuts(sw, JS_SHORTCUTS)

  const jsPage = await context.newPage()
  await jsPage.setViewportSize({ width: 1280, height: 900 })
  await jsPage.goto(`chrome-extension://${extensionId}/options.html`)
  await jsPage.waitForSelector('.app-main', { timeout: 5000 })
  await jsPage.waitForTimeout(1000)

  // Hide the 'Allow User Scripts' warning banner if present
  await jsPage.evaluate(() => {
    const alert = document.querySelector('.alert-warning');
    if (alert) (alert as HTMLElement).style.display = 'none';
  })

  // Click the settings/expand button on the first JS shortcut to reveal the code editor
  const jsExpandBtn = jsPage.locator('.shortcut-card').first().locator('.btn-icon').first()
  await jsExpandBtn.click()
  await jsPage.waitForSelector('.code-editor-wrap', { timeout: 3000 })
  await jsPage.waitForTimeout(800) // Let CodeMirror fully render

  // Scroll to frame the editor nicely
  await jsPage.evaluate(() => window.scrollBy(0, 40))
  await jsPage.waitForTimeout(300)

  await jsPage.screenshot({
    path: path.join(OUTPUT_DIR, 'screenshot-custom-js.png'),
    fullPage: false,
  })
  console.log('  ✓ Saved screenshot-custom-js.png')
  await jsPage.close()

  // ── 3. Dark mode screenshot ──
  console.log('\n📸 Taking dark mode screenshot...')
  await injectShortcuts(sw, DARK_MODE_SHORTCUTS)

  const darkPage = await context.newPage()
  await darkPage.setViewportSize({ width: 1280, height: 900 })
  await darkPage.goto(`chrome-extension://${extensionId}/options.html`)
  await darkPage.waitForSelector('.app-main', { timeout: 5000 })
  await darkPage.waitForTimeout(1000)

  // Toggle dark mode via localStorage + attribute
  await darkPage.evaluate(() => {
    localStorage.setItem('shortkeys-theme', 'dark')
    document.documentElement.setAttribute('data-theme', 'dark')
  })
  await darkPage.waitForTimeout(500)

  // Scroll down slightly for good framing
  await darkPage.evaluate(() => window.scrollBy(0, 60))
  await darkPage.waitForTimeout(300)

  await darkPage.screenshot({
    path: path.join(OUTPUT_DIR, 'screenshot-dark-mode.png'),
    fullPage: false,
  })
  console.log('  ✓ Saved screenshot-dark-mode.png')
  await darkPage.close()

  await context.close()

  console.log('\n✅ All feature screenshots saved to site/images/')
  console.log('  - screenshot-macros.png')
  console.log('  - screenshot-custom-js.png')
  console.log('  - screenshot-dark-mode.png')
}

main().catch((err) => {
  console.error('Screenshot failed:', err)
  process.exit(1)
})
