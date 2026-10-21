import { test, expect } from './fixtures'
import type { BrowserContext, Page } from '@playwright/test'
import { openOptions, addShortcut, openDetails, save } from './support/options-ui'
import { CONTROL, seedChrome, waitForBindings, flush, scroll } from './support/keys'
import { serviceWorker } from './support/chrome'

async function openPage(context: BrowserContext, url: string) {
  const page = await context.newPage()
  await page.goto(url)
  await page.bringToFront()
  await waitForBindings(page)
  return page
}

async function activeTabUrl(context: BrowserContext) {
  return (await serviceWorker(context)).evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    return tab?.url
  })
}

async function tabUrls(context: BrowserContext) {
  return (await serviceWorker(context)).evaluate(async () => (await chrome.tabs.query({})).map((t) => t.url || t.pendingUrl))
}

test.beforeEach(async ({ context }) => {
  await seedChrome(context, [CONTROL])
})

test('a shortcut created in options fires on a page and persists', async ({ context, extensionId, server }) => {
  const options = await openOptions(context, extensionId)
  await addShortcut(options, { key: 'j', action: 'Scroll down', label: 'Down' })
  await save(options)
  await options.reload()
  await expect(options.locator('.shortcut-label-title').last()).toHaveValue('Down')

  const page = await openPage(context, server.url('/scroll'))
  await page.keyboard.press('j')
  await expect.poll(async () => (await scroll(page)).y).toBeGreaterThan(0)
})

test('saving updates open tabs without a reload, and disabled shortcuts stop firing', async ({ context, extensionId, server }) => {
  const page = await openPage(context, server.url('/scroll'))
  const options = await openOptions(context, extensionId)
  const card = await addShortcut(options, { key: 'j', action: 'Scroll down' })
  await save(options)

  await page.bringToFront()
  await expect.poll(async () => {
    await page.keyboard.press('j')
    return (await scroll(page)).y
  }).toBeGreaterThan(0)

  await card.locator('.toggle').first().click()
  await save(options)
  await page.bringToFront()
  await page.evaluate(() => scrollTo(0, 0))
  // The refresh is async; wait until the disabled key is ignored, then confirm it stays ignored.
  await expect.poll(async () => {
    await page.evaluate(() => scrollTo(0, 0))
    await page.keyboard.press('j')
    await flush(page)
    return (await scroll(page)).y
  }).toBe(0)
})

test('navigation shortcuts go to a configured URL and back', async ({ context, extensionId, server }) => {
  const options = await openOptions(context, extensionId)
  const card = await addShortcut(options, { key: 'g', action: 'Go to URL' })
  const details = await openDetails(card)
  await details.locator('input.field-input').first().fill(server.url('/b'))
  await addShortcut(options, { key: 'h', action: 'Go back' })
  await save(options)

  const page = await openPage(context, server.url('/a'))
  await page.keyboard.press('g')
  await expect(page).toHaveURL(server.url('/b'))
  await waitForBindings(page)
  await page.keyboard.press('h')
  await expect(page).toHaveURL(server.url('/a'))
})

test('tab shortcuts open, switch and close tabs', async ({ context, extensionId, server }) => {
  const options = await openOptions(context, extensionId)
  await addShortcut(options, { key: 't', action: 'New tab' })
  await addShortcut(options, { key: 'x', action: 'Close tab' })
  await addShortcut(options, { key: 'n', action: 'Next tab' })
  await addShortcut(options, { key: 'p', action: 'Previous tab' })
  await save(options)
  await options.close()

  const a = await openPage(context, server.url('/a'))
  const b = await openPage(context, server.url('/b'))
  await a.bringToFront()
  await expect.poll(() => activeTabUrl(context)).toBe(server.url('/a'))

  await a.keyboard.press('n')
  await expect.poll(() => activeTabUrl(context)).toBe(server.url('/b'))
  await b.keyboard.press('p')
  await expect.poll(() => activeTabUrl(context)).toBe(server.url('/a'))

  const before = await tabUrls(context)
  await a.keyboard.press('t')
  await expect.poll(async () => (await tabUrls(context)).length).toBe(before.length + 1)
  expect(await activeTabUrl(context)).toMatch(/^chrome:\/\/new/)

  await b.bringToFront()
  // The tab can close before keyup is delivered.
  await b.keyboard.press('x').catch((error) => {
    if (!b.isClosed()) throw error
  })
  await expect.poll(() => tabUrls(context)).not.toContain(server.url('/b'))
  expect(await tabUrls(context)).toHaveLength(before.length)
})

test('custom JavaScript runs in the page', async ({ context, extensionId, server }) => {
  const extensions = await context.newPage()
  await extensions.goto('chrome://extensions')
  await extensions.evaluate(
    // @ts-expect-error developerPrivate is only exposed to chrome://extensions
    (id) => chrome.developerPrivate.updateExtensionConfiguration({ extensionId: id, userScriptsAccess: true }),
    extensionId,
  )
  await extensions.close()

  const options = await openOptions(context, extensionId)
  const card = await addShortcut(options, { key: 'k', action: 'Run custom JavaScript' })
  await openDetails(card)
  await options.locator('.shortcut-details .cm-content').click()
  await options.keyboard.insertText("document.body.dataset.shortkeys = 'ran'")
  await save(options)

  const page = await openPage(context, server.url('/a'))
  await expect.poll(async () => {
    await page.keyboard.press('k')
    return page.evaluate(() => document.body.dataset.shortkeys)
  }).toBe('ran')
})

test('a macro runs each of its steps', async ({ context, server }) => {
  await seedChrome(context, [
    CONTROL,
    {
      id: 'macro', key: 'm', action: 'macro',
      macroSteps: [{ action: 'scrolldown' }, { action: 'scrollright', delay: 100 }],
    },
  ])
  const page = await openPage(context, server.url('/scroll'))
  await page.keyboard.press('m')
  await expect.poll(async () => { const s = await scroll(page); return s.x > 0 && s.y > 0 }).toBe(true)
})

test('per-shortcut site rules limit where a shortcut fires', async ({ context, extensionId, server }) => {
  const options = await openOptions(context, extensionId)
  const card = await addShortcut(options, { key: 'j', action: 'Scroll down' })
  const details = await openDetails(card)
  await details.locator('.seg-btn', { hasText: 'Only on' }).click()
  await details.locator('textarea.site-patterns').fill(`*localhost:${server.port}*`)
  await save(options)

  const allowed = await openPage(context, server.url('/scroll'))
  await allowed.keyboard.press('j')
  await expect.poll(async () => (await scroll(allowed)).y).toBeGreaterThan(0)

  const blocked = await openPage(context, server.altUrl('/scroll'))
  await blocked.keyboard.press('j')
  await flush(blocked)
  expect((await scroll(blocked)).y).toBe(0)
})

test('group site rules disable every shortcut in the group', async ({ context, extensionId, server }) => {
  await seedChrome(context, [CONTROL, { id: 'down', key: 'j', action: 'scrolldown', group: 'Work' }])
  const options = await openOptions(context, extensionId)
  const group = options.locator('.group-header', { has: options.locator('.group-name', { hasText: 'Work' }) })
  await group.locator('.group-menu-wrap .btn-icon').click()
  await group.locator('.group-menu-item', { hasText: 'Site rules' }).click()
  const deactivateOn = options.locator('.group-site-panel .group-site-textarea').nth(1)
  await deactivateOn.fill('127.0.0.1')
  await deactivateOn.blur()
  await expect(options.locator('.group-site-indicator')).toBeVisible()

  const blocked = await openPage(context, server.altUrl('/scroll'))
  await blocked.keyboard.press('j')
  await flush(blocked)
  expect((await scroll(blocked)).y).toBe(0)

  const allowed = await openPage(context, server.url('/scroll'))
  await allowed.keyboard.press('j')
  await expect.poll(async () => (await scroll(allowed)).y).toBeGreaterThan(0)
})

test('shortcuts are ignored while typing unless enabled for inputs', async ({ context, extensionId, server }) => {
  const options = await openOptions(context, extensionId)
  await addShortcut(options, { key: 'j', action: 'Scroll down' })
  const dark = await addShortcut(options, { key: 'alt+d', action: 'Toggle dark mode' })
  const details = await openDetails(dark)
  await details.locator('.toggle-row-inline .toggle').click()
  await save(options)

  const page: Page = await openPage(context, server.url('/form'))
  for (const target of ['#text', '#area', '#editable', '#box']) {
    await page.focus(target)
    await page.keyboard.press('j')
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await flush(page)
    expect((await scroll(page)).y, target).toBe(0)
  }
  await expect(page.locator('#text')).toHaveValue('j')

  await page.focus('#text')
  await page.keyboard.press('Alt+KeyD')
  await expect(page.locator('#__shortkeys-darkmode')).toBeAttached()
})

test('imported shortcuts fire', async ({ context, extensionId, server }) => {
  const options = await openOptions(context, extensionId)
  await options.locator('.tab-btn', { hasText: 'Import' }).click()
  await options.locator('.json-textarea').fill(JSON.stringify([{ key: 'j', action: 'scrolldown', label: 'Imported' }]))
  await options.locator('.btn-primary', { hasText: 'Import JSON' }).click()
  await expect(options.locator('.toast')).toBeVisible()

  const page = await openPage(context, server.url('/scroll'))
  await page.keyboard.press('j')
  await expect.poll(async () => (await scroll(page)).y).toBeGreaterThan(0)
})
