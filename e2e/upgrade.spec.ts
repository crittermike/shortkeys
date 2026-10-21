import { test as base, expect, type BrowserContext } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { launchChrome, closeStartupTabs, extensionIdOf, serviceWorker, CHROME_BUILD } from './support/chrome'
import { startServer, type TestServer } from './support/server'
import { openOptions } from './support/options-ui'
import { CONTROL, waitForBindings, scroll } from './support/keys'
import type { KeySetting } from '../src/utils/url-matching'

const PREVIOUS = path.resolve('.e2e-cache/previous-release/chrome')

const test = base.extend<{ dirs: { extension: string; profile: string } }, { server: TestServer }>({
  server: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const server = await startServer()
      await use(server)
      await server.close()
    },
    { scope: 'worker' },
  ],
  // eslint-disable-next-line no-empty-pattern
  dirs: async ({}, use) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shortkeys-upgrade-'))
    const dirs = { extension: path.join(root, 'extension'), profile: path.join(root, 'profile') }
    await use(dirs)
    fs.rmSync(root, { recursive: true, force: true })
  },
})

/** A mix of the settings real users have: groups, site rules, macros, disabled shortcuts and scripts. */
function userShortcuts(count: number): KeySetting[] {
  const keys: KeySetting[] = [
    CONTROL,
    { id: 'down', key: 'j', action: 'scrolldown', label: 'Scroll down', group: 'Reading' },
    { id: 'sites', key: 'ctrl+shift+1', action: 'newtab', label: 'Only on example', blacklist: 'whitelist', sites: '*example.com*', sitesArray: ['*example.com*'] },
    { id: 'off', key: 'ctrl+shift+2', action: 'closetab', label: 'Disabled', enabled: false },
    { id: 'macro', key: 'ctrl+shift+3', action: 'macro', label: 'Macro', macroSteps: [{ action: 'scrolldown' }, { action: 'scrollup', delay: 50 }] },
    { id: 'js', key: 'ctrl+shift+4', action: 'javascript', label: 'Script', code: "document.title = 'shortkeys'" },
  ]
  for (let i = keys.length; i < count; i++) {
    keys.push({
      id: `bulk-${i}`, key: `ctrl+alt+shift+${i % 10}`, action: 'javascript', group: `Group ${i % 7}`,
      label: `Bulk shortcut ${i}`, code: `console.log(${JSON.stringify('x'.repeat(120))}, ${i})`,
    })
  }
  return keys
}

async function importShortcuts(context: BrowserContext, keys: KeySetting[]) {
  const options = await openOptions(context, await extensionIdOf(context))
  await options.locator('.tab-btn', { hasText: 'Import' }).click()
  await options.locator('.json-textarea').fill(JSON.stringify(keys))
  await options.locator('.btn-primary', { hasText: 'Import JSON' }).click()
  await expect(options.locator('.toast', { hasText: 'Imported successfully' })).toBeVisible()
  await options.close()
}

/** Read shortcuts the way any version would see them: chunked sync snapshot, legacy sync item, or local. */
async function storedShortcuts(context: BrowserContext) {
  return (await serviceWorker(context)).evaluate(async () => {
    const sync = await chrome.storage.sync.get(null)
    const local = await chrome.storage.local.get(null)
    const meta = sync.keys_meta as { count: number } | undefined
    const chunks = meta ? Array.from({ length: meta.count }, (_, i) => sync[`keys_${i}`]).join('') : undefined
    return { syncChunks: meta?.count ?? 0, sync: (chunks ?? sync.keys) as string | undefined, local: local.keys as string | undefined }
  })
}

async function expectShortcutsFire(context: BrowserContext, server: TestServer) {
  const page = await context.newPage()
  await page.goto(server.url('/scroll'))
  await page.bringToFront()
  await waitForBindings(page)
  await page.keyboard.press('j')
  await expect.poll(async () => (await scroll(page)).y).toBeGreaterThan(0)
  await page.close()
}

async function expectOptionsShow(context: BrowserContext, keys: KeySetting[]) {
  const options = await openOptions(context, await extensionIdOf(context))
  await options.locator('.search-input').fill('Bulk shortcut')
  await expect(options.locator('.shortcut-card')).toHaveCount(keys.filter((k) => k.label?.startsWith('Bulk')).length)
  await options.locator('.search-input').fill('Disabled')
  await expect(options.locator('.shortcut-card .toggle')).not.toHaveClass(/\bon\b/)
  await options.close()
}

function sameShortcuts(json: string | undefined, keys: KeySetting[]) {
  const saved = JSON.parse(json || '[]') as KeySetting[]
  const pick = (k: KeySetting) => ({ id: k.id, key: k.key, action: k.action, label: k.label, group: k.group, code: k.code, sites: k.sites || '', blacklist: k.blacklist || false, macroSteps: k.macroSteps, enabled: k.enabled !== false })
  expect(saved.map(pick)).toEqual(keys.map(pick))
}

async function relaunch(context: BrowserContext, dirs: { extension: string; profile: string }, reason: 'install' | 'restart') {
  await context.close()
  const next = await launchChrome(dirs.extension, dirs.profile)
  await closeStartupTabs(next, reason)
  return next
}

test.beforeAll(() => {
  if (!fs.existsSync(path.join(PREVIOUS, 'manifest.json'))) {
    throw new Error('Previous release missing. Run scripts/fetch-previous-release.sh first.')
  }
})

const SIZES = [
  { name: 'typical', count: 6, toast: 'saved & synced', syncChunks: 1 },
  { name: 'large (multi-chunk sync)', count: 200, toast: 'saved & synced', syncChunks: 2 },
  { name: 'too large to sync (local only)', count: 400, toast: 'local only', syncChunks: 0 },
] as const

for (const { name, count, toast, syncChunks } of SIZES) {
  test(`upgrading from the latest release keeps ${name} shortcuts working`, async ({ dirs, server }) => {
    const keys = userShortcuts(count)
    fs.cpSync(PREVIOUS, dirs.extension, { recursive: true })
    let context = await launchChrome(dirs.extension, dirs.profile)
    await closeStartupTabs(context)
    const previousId = await extensionIdOf(context)
    await importShortcuts(context, keys)
    await expectShortcutsFire(context, server)

    fs.rmSync(dirs.extension, { recursive: true })
    fs.cpSync(CHROME_BUILD, dirs.extension, { recursive: true })
    // Chrome can't reload an extension under automation, so the upgrade is a relaunch with the new files.
    // Chrome treats that as an install; the update-only migration is covered by unit tests.
    context = await relaunch(context, dirs, 'install')
    try {
      expect(await extensionIdOf(context)).toBe(previousId)
      const version = await (await serviceWorker(context)).evaluate(() => chrome.runtime.getManifest().version)
      expect(version).toBe(JSON.parse(fs.readFileSync(path.join(CHROME_BUILD, 'manifest.json'), 'utf8')).version)

      await expectShortcutsFire(context, server)
      if (count > 6) await expectOptionsShow(context, keys)

      const beforeSave = await storedShortcuts(context)
      sameShortcuts(beforeSave.local, keys)
      if (beforeSave.sync) sameShortcuts(beforeSave.sync, keys)

      // The first save after upgrading writes the new storage format.
      const options = await openOptions(context, previousId)
      await options.locator('.search-input').fill('Scroll down')
      await options.locator('.shortcut-label-title').first().fill('Scroll down (edited)')
      await options.locator('.btn-primary', { hasText: 'Save shortcuts' }).click()
      await expect(options.locator('.toast')).toContainText(toast)
      const stored = await storedShortcuts(context)
      const edited = keys.map((k) => (k.id === 'down' ? { ...k, label: 'Scroll down (edited)' } : k))
      sameShortcuts(stored.local, edited)
      if (syncChunks) {
        expect(stored.syncChunks).toBeGreaterThanOrEqual(syncChunks)
        sameShortcuts(stored.sync, edited)
      } else {
        expect(stored.syncChunks).toBe(0)
      }
    } finally {
      await context.close()
    }
  })
}

test('shortcuts and large synced data survive a browser restart', async ({ dirs, server }) => {
  const keys = userShortcuts(200)
  let context = await launchChrome(CHROME_BUILD, dirs.profile)
  await closeStartupTabs(context)
  await importShortcuts(context, keys)
  const before = await storedShortcuts(context)
  expect(before.syncChunks).toBeGreaterThan(1)
  sameShortcuts(before.sync, keys)

  context = await relaunch(context, { extension: CHROME_BUILD, profile: dirs.profile }, 'restart')
  try {
    const after = await storedShortcuts(context)
    expect(after).toEqual(before)
    await expectShortcutsFire(context, server)
    await expectOptionsShow(context, keys)
  } finally {
    await context.close()
  }
})
