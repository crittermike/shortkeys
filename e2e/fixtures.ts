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
        '--headless=new',
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-first-run',
        '--disable-default-apps',
      ],
    })

    // Wait for the extension service worker to start
    let [sw] = context.serviceWorkers()
    if (!sw) {
      sw = await context.waitForEvent('serviceworker')
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
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers()
    if (!background) {
      background = await context.waitForEvent('serviceworker')
    }
    const extensionId = background.url().split('/')[2]
    await use(extensionId)
  },
})

export const expect = test.expect
