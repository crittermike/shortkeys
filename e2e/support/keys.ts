import { expect, type BrowserContext, type Page } from '@playwright/test'
import type { KeySetting, GroupSettings } from '../../src/utils/url-matching'
import { serviceWorker } from './chrome'

/**
 * Control shortcut seeded alongside the shortcut under test. It scrolls right,
 * which no subject shortcut does, so it proves the content script is bound and,
 * pressed after a key that should be ignored, that the ignored key really did nothing.
 */
export const CONTROL: KeySetting = { id: 'control', key: 'l', action: 'scrollright', label: 'Control' }

export async function seedChrome(context: BrowserContext, keys: KeySetting[], groups: Record<string, GroupSettings> = {}) {
  await (await serviceWorker(context)).evaluate(async ({ keys, groups }) => {
    await chrome.storage.sync.clear()
    await chrome.storage.local.clear()
    await chrome.storage.local.set({ keys: JSON.stringify(keys), groupSettings: JSON.stringify(groups) })
  }, { keys, groups })
}

const scroll = (page: Page) => page.evaluate(() => ({ x: scrollX, y: scrollY }))

/** Wait until the content script has bound shortcuts, then reset scroll. */
export async function waitForBindings(page: Page) {
  await expect.poll(async () => {
    await page.keyboard.press(CONTROL.key)
    return (await scroll(page)).x
  }).toBeGreaterThan(0)
  await page.evaluate(() => scrollTo(0, 0))
}

/** Press the control key and wait for it to land; anything pressed before it has been handled. */
export async function flush(page: Page) {
  const before = (await scroll(page)).x
  await page.keyboard.press(CONTROL.key)
  await expect.poll(async () => (await scroll(page)).x).toBeGreaterThan(before)
}

export { scroll }
