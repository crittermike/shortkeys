import { test as base, chromium, type BrowserContext } from '@playwright/test'
import path from 'path'

const pathToExtension = path.resolve('.output/chrome-mv3')

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        // In CI, xvfb-run provides a virtual display so we don't need --headless=new.
        // Locally, --headless=new allows running without a visible browser window.
        ...(process.env.CI ? [] : ['--headless=new']),
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-first-run',
        '--disable-default-apps',
        '--disable-dev-shm-usage',
      ],
    })

    // Wait for the extension service worker to start
    let [sw] = context.serviceWorkers()
    if (!sw) {
      sw = await context.waitForEvent('serviceworker', { timeout: 10_000 })
    }

    // The extension opens welcome + options pages on first install.
    // Wait for them to appear, then close them all so tests start clean.
    // Wait until we see at least 2 pages (the auto-opened ones) or timeout after 3s.
    const deadline = Date.now() + 3000
    while (context.pages().length < 2 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 200))
    }

    // Close all auto-opened pages
    for (const p of context.pages()) {
      await p.close().catch(() => {})
    }

    await use(context)

    // Teardown: close all pages first, then race context.close() against a
    // timeout. MV3 service workers can prevent graceful shutdown, causing
    // context.close() to hang indefinitely.
    for (const p of context.pages()) {
      await p.close().catch(() => {})
    }
    await Promise.race([
      context.close().catch(() => {}),
      new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
    ])
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers()
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 10_000 })
    }
    const extensionId = background.url().split('/')[2]
    await use(extensionId)
  },
})

export const expect = test.expect
