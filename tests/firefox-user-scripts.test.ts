import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroupSettings, KeySetting } from '../src/utils/url-matching'
import {
  executeFirefoxUserScript, hasCustomScripts, installFirefoxScript,
  isFirefoxScriptInstalled, removeFirefoxScript, requestFirefoxUserScripts,
} from '../src/utils/firefox-user-scripts'

const storage = vi.hoisted(() => ({
  loadKeys: vi.fn(), loadGroupSettings: vi.fn(),
  loadUserScriptApprovals: vi.fn(), updateUserScriptApproval: vi.fn(),
}))
vi.mock('../src/utils/storage', () => storage)

let approvals: Record<string, string>
let groups: Record<string, GroupSettings>
let saved: KeySetting[]
const contains = vi.fn()
const request = vi.fn()
const execute = vi.fn()
const bookmarks = vi.fn()
const shortcut: KeySetting = { id: 'script-1', key: 'alt+j', action: 'javascript', code: 'document.title = "Done"' }

beforeEach(() => {
  vi.clearAllMocks()
  approvals = {}
  groups = {}
  saved = [structuredClone(shortcut)]
  contains.mockResolvedValue(true)
  request.mockResolvedValue(false)
  execute.mockResolvedValue([{}])
  bookmarks.mockResolvedValue([])
  storage.loadKeys.mockImplementation(async () => JSON.stringify(saved))
  storage.loadGroupSettings.mockImplementation(async () => groups)
  storage.loadUserScriptApprovals.mockImplementation(async () => ({ ...approvals }))
  storage.updateUserScriptApproval.mockImplementation(async (id: string, digest?: string) => {
    if (digest) approvals[id] = digest
    else delete approvals[id]
  })
  vi.stubGlobal('browser', { permissions: { contains, request }, bookmarks: { search: bookmarks } })
  vi.stubGlobal('chrome', { userScripts: { execute } })
})

afterEach(() => vi.unstubAllGlobals())

describe('Firefox native user scripts', () => {
  it('requests permission in the click call stack and refuses installation if denied', async () => {
    const result = requestFirefoxUserScripts()
    expect(request).toHaveBeenCalledWith({ permissions: ['userScripts'] })
    expect(await result).toBe(false)
    contains.mockResolvedValue(false)
    await expect(installFirefoxScript(shortcut)).rejects.toThrow('Enable custom JavaScript')
    expect(approvals).toEqual({})
  })

  it('requires installation, executes through the native MAIN world, and honors removal', async () => {
    await expect(executeFirefoxUserScript(7, shortcut)).rejects.toThrow('Install this user script')
    await installFirefoxScript(shortcut)
    expect(await isFirefoxScriptInstalled(shortcut)).toBe(true)
    await executeFirefoxUserScript(7, shortcut)
    expect(execute).toHaveBeenCalledWith({
      target: { tabId: 7 }, world: 'MAIN',
      js: [{ code: `(async function() {\n${shortcut.code}\n})();` }],
    })
    await removeFirefoxScript(shortcut)
    await expect(executeFirefoxUserScript(7, shortcut)).rejects.toThrow('Install this user script')
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('checks native permission on every execution after revocation', async () => {
    await installFirefoxScript(shortcut)
    await executeFirefoxUserScript(7, shortcut)
    contains.mockResolvedValue(false)
    await expect(executeFirefoxUserScript(7, shortcut)).rejects.toThrow('Enable custom JavaScript')
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('invalidates approval after edits and rejects a script that differs from saved code', async () => {
    await installFirefoxScript(shortcut)
    const edited = { ...shortcut, code: 'document.title = "Edited"' }
    expect(await isFirefoxScriptInstalled(edited)).toBe(false)
    await expect(installFirefoxScript(edited)).rejects.toThrow('Save the current user script')
    saved = [edited]
    await expect(executeFirefoxUserScript(7, shortcut)).rejects.toThrow('Save and install')
    await installFirefoxScript(edited)
    await executeFirefoxUserScript(7, edited)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('invalidates approval when shortcut or group website scope changes', async () => {
    await installFirefoxScript(shortcut)
    expect(await isFirefoxScriptInstalled({ ...shortcut, sites: 'example.com', blacklist: true })).toBe(false)
    groups = { 'My Shortcuts': { deactivateOn: 'example.com' } }
    expect(await isFirefoxScriptInstalled(shortcut)).toBe(false)
    expect(execute).not.toHaveBeenCalled()
  })

  it('preserves JavaScript macro steps and rejects edits to a different step', async () => {
    const macro: KeySetting = {
      ...shortcut, action: 'macro', code: undefined,
      macroSteps: [{ action: 'javascript', code: 'window.first = true' }, { action: 'javascript', code: 'window.second = true' }],
    }
    saved = [macro]
    await installFirefoxScript(macro)
    await executeFirefoxUserScript(7, macro, 1)
    expect(execute.mock.calls[0][0].js[0].code).toContain('window.second = true')
    const edited = structuredClone(macro)
    edited.macroSteps![0].code = 'window.first = false'
    await expect(executeFirefoxUserScript(7, edited, 1)).rejects.toThrow('Install this user script')
  })

  it('preserves bookmarklets, handles bare percent signs, and invalidates changed bookmark code', async () => {
    const bookmarklet = { ...shortcut, action: 'openbookmark', code: undefined, bookmark: 'My bookmarklet' }
    saved = [bookmarklet]
    bookmarks.mockResolvedValue([{ title: 'My bookmarklet', url: 'javascript:document.title = "100%"' }])
    expect(await hasCustomScripts(bookmarklet)).toBe(true)
    await installFirefoxScript(bookmarklet)
    await executeFirefoxUserScript(7, bookmarklet)
    expect(execute.mock.calls[0][0].js[0].code).toContain('document.title = "100%"')
    bookmarks.mockResolvedValue([{ title: 'My bookmarklet', url: 'javascript:document.title = "Changed"' }])
    expect(await isFirefoxScriptInstalled(bookmarklet)).toBe(false)
    await expect(executeFirefoxUserScript(7, bookmarklet)).rejects.toThrow('Install this user script')
  })

  it('only treats JavaScript bookmark URLs as executable user scripts', async () => {
    const bookmarklet = { ...shortcut, action: 'openbookmark', code: undefined, bookmark: 'Page action' }
    for (const url of ['data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', 'https://example.com']) {
      bookmarks.mockResolvedValue([{ title: 'Page action', url }])
      expect(await hasCustomScripts(bookmarklet)).toBe(false)
    }
    bookmarks.mockResolvedValue([{ title: 'Page action', url: 'JAVASCRIPT:document.title = "Allowed"' }])
    expect(await hasCustomScripts(bookmarklet)).toBe(true)
  })

  it('does not offer user-script installation for ordinary bookmark shortcuts', async () => {
    bookmarks.mockResolvedValue([{ title: 'Docs', url: 'https://example.com' }])
    expect(await hasCustomScripts({ ...shortcut, action: 'openbookmark', bookmark: 'Docs' })).toBe(false)
  })

  it('surfaces unavailable APIs and execution errors instead of reporting success', async () => {
    await installFirefoxScript(shortcut)
    execute.mockResolvedValue([{ error: 'Script failed' }])
    await expect(executeFirefoxUserScript(7, shortcut)).rejects.toThrow('Script failed')
    vi.stubGlobal('chrome', {})
    await expect(executeFirefoxUserScript(7, shortcut)).rejects.toThrow('Firefox 153')
  })
})
