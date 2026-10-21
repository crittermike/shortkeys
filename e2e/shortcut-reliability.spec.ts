import { test, expect } from './fixtures'
import type { BrowserContext } from '@playwright/test'
import type { KeySetting, GroupSettings } from '../src/utils/url-matching'
import fs from 'node:fs'

async function seed(context: BrowserContext, keys: KeySetting[], groups: Record<string, GroupSettings> = {}) {
  await context.serviceWorkers()[0].evaluate(async ({ keys, groups }) => {
    await chrome.storage.sync.clear()
    await chrome.storage.local.clear()
    await chrome.storage.local.set({ keys: JSON.stringify(keys), groupSettings: JSON.stringify(groups) })
  }, { keys, groups })
}

test('new-tab link hints stay open and open the selected link in a new tab (#881)', async ({ context }) => {
  await seed(context, [{ id: 'hints', key: 'f', action: 'linkhintsnew' }])
  await context.route('https://shortkeys.test/**', route => route.fulfill({
    contentType: 'text/html', body: '<a href="https://shortkeys.test/target">Target</a>',
  }))
  const page = await context.newPage()
  await page.goto('https://shortkeys.test/')
  await expect.poll(() => context.serviceWorkers()[0].evaluate(() => chrome.runtime.id)).toBeTruthy()
  // Content scripts load at document_idle.
  await page.waitForTimeout(500)
  await page.keyboard.press('f')
  const hint = page.locator('[data-shortkeys-hints] [data-hint-label]').first()
  await expect(hint).toBeVisible()
  await page.waitForTimeout(150)
  await expect(hint).toBeVisible()
  const label = await hint.getAttribute('data-hint-label')
  const newTab = context.waitForEvent('page')
  await page.keyboard.type(label!)
  await expect(await newTab).toHaveURL('https://shortkeys.test/target')
  await expect(page).toHaveURL('https://shortkeys.test/')
})

test('macro steps expose, persist and execute independent URLs (#919)', async ({ context, extensionId }) => {
  await seed(context, [{
    id: 'macro', key: 'm', action: 'macro', label: 'Two URLs',
    macroSteps: [{ action: 'openurl' }, { action: 'openurl' }],
  }])
  const page = await context.newPage()
  await page.addInitScript(() => localStorage.setItem('shortkeys-onboarding-done', 'true'))
  await page.goto(`chrome-extension://${extensionId}/options.html`)
  await page.locator('.shortcut-card .mdi-cog-outline').click()
  const inputs = page.locator('.macro-step-parameters input')
  await expect(inputs).toHaveCount(2)
  await inputs.nth(0).fill('https://shortkeys.test/first')
  await inputs.nth(1).fill('https://shortkeys.test/second')
  await expect(page.locator('.shortcut-details')).toHaveCSS('opacity', '1')
  fs.mkdirSync('screenshots', { recursive: true })
  await page.screenshot({ path: 'screenshots/macro-step-urls.png', fullPage: true })
  await page.locator('.btn-primary', { hasText: 'Save shortcuts' }).click()
  await expect(page.locator('.toast')).toBeVisible()
  await page.reload()
  await page.locator('.shortcut-card .mdi-cog-outline').click()
  await expect(inputs.nth(0)).toHaveValue('https://shortkeys.test/first')
  await expect(inputs.nth(1)).toHaveValue('https://shortkeys.test/second')
  await context.route('https://shortkeys.test/**', route => route.fulfill({ body: '<h1>Macro destination</h1>', contentType: 'text/html' }))
  const destination = await context.newPage()
  await destination.goto('https://shortkeys.test/')
  const response = await page.evaluate(() => chrome.runtime.sendMessage({ action: 'runPaletteAction', shortcutId: 'macro' }))
  expect(response).toEqual({ success: true })
  await expect(destination).toHaveURL('https://shortkeys.test/second')
})

test('parameterized quick-add opens an unsaved configurable draft', async ({ context, extensionId }) => {
  const popup = await context.newPage()
  await popup.setViewportSize({ width: 360, height: 480 })
  await popup.goto(`chrome-extension://${extensionId}/popup.html`)
  await popup.locator('.settings-link:has(.mdi-plus)').click()
  await popup.locator('.shortcut-input').fill('alt+u')
  await popup.locator('.ss-trigger').click()
  await popup.locator('.ss-search').fill('Go to URL')
  await popup.locator('.ss-option', { hasText: 'Go to URL' }).click()
  await expect(popup.locator('.quick-add-save')).toHaveText('Configure')
  await popup.screenshot({ path: 'screenshots/popup-configure-url.png' })
  const opened = context.waitForEvent('page')
  await popup.locator('.quick-add-save').click()
  const options = await opened
  await options.waitForLoadState()
  await expect(options.locator('.shortcut-input').first()).toHaveValue('alt+u')
  await expect(options.getByPlaceholder('https://example.com')).toBeVisible()
  const saved = await options.evaluate(async () => {
    const sync = await chrome.storage.sync.get(null)
    const local = await chrome.storage.local.get('keys')
    return { sync, local }
  })
  expect(JSON.stringify(saved)).not.toContain('alt+u')
})

test('unassigned built-ins run directly from the palette', async ({ context, extensionId }) => {
  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extensionId}/popup.html`)
  await popup.locator('.search-bar input').fill('New tab')
  const created = context.waitForEvent('page')
  await popup.locator('.result-row').filter({ has: popup.getByText('New tab', { exact: true }) }).click()
  const newTab = await created
  await newTab.waitForLoadState()
  expect(newTab.url()).toMatch(/^(chrome:\/\/(newtab|new-tab-page)|about:blank)/)
})

test('palette does not bypass saved site or group restrictions, including at dispatch', async ({ context, extensionId }) => {
  await seed(context, [
    { id: 'site', key: 'a', action: 'onlytab', blacklist: 'whitelist', sites: '*allowed.test*' },
    { id: 'group', key: 'b', action: 'movetabtonewwindow', group: 'Work' },
  ], { Work: { activateOn: 'allowed.test' } })
  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extensionId}/popup.html`)
  await popup.locator('.search-bar input').fill('Close other tabs')
  await expect(popup.locator('.result-row')).toHaveCount(0)
  const denied = await popup.evaluate(() => chrome.runtime.sendMessage({ action: 'runPaletteAction', shortcutId: 'site' }))
  expect(denied.error).toContain('not available')
  const bypass = await popup.evaluate(() => chrome.runtime.sendMessage({ action: 'runPaletteAction', builtinAction: 'onlytab' }))
  expect(bypass.error).toContain('no longer available')
  await popup.locator('.search-bar input').fill('Move tab to new window')
  await expect(popup.locator('.result-row')).toHaveCount(0)
})
