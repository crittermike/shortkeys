import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'

vi.mock('@/utils/storage', () => ({
  saveKeys: vi.fn().mockResolvedValue('sync'),
  loadKeys: vi.fn().mockResolvedValue(null),
}))

import { useShortcuts } from '../src/composables/useShortcuts'
import { loadKeys, saveKeys } from '../src/utils/storage'
import type { KeySetting } from '../src/utils/url-matching'

const mockLoadKeys = vi.mocked(loadKeys)
const mockSaveKeys = vi.mocked(saveKeys)

function makeKey(overrides: Partial<KeySetting> = {}): KeySetting {
  return {
    id: 'test-id-' + Math.random().toString(36).slice(2),
    key: 'ctrl+a',
    action: 'newtab',
    enabled: true,
    sites: '',
    sitesArray: [''],
    ...overrides,
  } as KeySetting
}

describe('dirty tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { keys } = useShortcuts()
    keys.value = []
  })

  it('starts clean after loadSavedKeys with no data', async () => {
    mockLoadKeys.mockResolvedValueOnce(null)
    const { dirty, loadSavedKeys } = useShortcuts()
    await loadSavedKeys()
    expect(dirty.value).toBe(false)
  })

  it('starts clean after loadSavedKeys with existing data', async () => {
    const existing = [makeKey({ key: 'ctrl+a', action: 'newtab' })]
    mockLoadKeys.mockResolvedValueOnce(JSON.stringify(existing))
    const { dirty, loadSavedKeys } = useShortcuts()
    await loadSavedKeys()
    expect(dirty.value).toBe(false)
  })

  it('becomes dirty when a shortcut key is changed', async () => {
    const existing = [makeKey({ key: 'ctrl+a', action: 'newtab' })]
    mockLoadKeys.mockResolvedValueOnce(JSON.stringify(existing))
    const { dirty, keys, loadSavedKeys } = useShortcuts()
    await loadSavedKeys()

    keys.value[0].key = 'ctrl+b'
    await nextTick()
    expect(dirty.value).toBe(true)
  })

  it('becomes dirty when a shortcut action is changed', async () => {
    const existing = [makeKey({ key: 'ctrl+a', action: 'newtab' })]
    mockLoadKeys.mockResolvedValueOnce(JSON.stringify(existing))
    const { dirty, keys, loadSavedKeys } = useShortcuts()
    await loadSavedKeys()

    keys.value[0].action = 'closetab'
    await nextTick()
    expect(dirty.value).toBe(true)
  })

  it('becomes dirty when a shortcut is added', async () => {
    mockLoadKeys.mockResolvedValueOnce(JSON.stringify([]))
    const { dirty, addShortcut, loadSavedKeys } = useShortcuts()
    await loadSavedKeys()

    addShortcut()
    await nextTick()
    expect(dirty.value).toBe(true)
  })

  it('becomes dirty when enabled is toggled', async () => {
    const existing = [makeKey({ key: 'ctrl+a', action: 'newtab', enabled: true })]
    mockLoadKeys.mockResolvedValueOnce(JSON.stringify(existing))
    const { dirty, keys, toggleEnabled, loadSavedKeys } = useShortcuts()
    await loadSavedKeys()

    toggleEnabled(keys.value[0])
    await nextTick()
    expect(dirty.value).toBe(true)
  })

  it('becomes clean after saveShortcuts', async () => {
    const existing = [makeKey({ key: 'ctrl+a', action: 'newtab' })]
    mockLoadKeys.mockResolvedValueOnce(JSON.stringify(existing))
    const { dirty, keys, saveShortcuts, loadSavedKeys } = useShortcuts()
    await loadSavedKeys()

    keys.value[0].key = 'ctrl+b'
    await nextTick()
    expect(dirty.value).toBe(true)

    await saveShortcuts()
    expect(dirty.value).toBe(false)
  })

  it('persists onboarding shortcut settings when saving', async () => {
    mockLoadKeys.mockResolvedValueOnce(JSON.stringify([]))
    const { keys, addShortcut, saveShortcuts, loadSavedKeys } = useShortcuts()
    await loadSavedKeys()

    addShortcut()
    keys.value[0].key = 'ctrl+shift+j'
    keys.value[0].action = 'javascript'
    keys.value[0].code = 'console.log("hello")'
    keys.value[0].activeInInputs = true
    keys.value[0].blacklist = 'whitelist'
    keys.value[0].sites = '*github.com*\n*example.com*'

    await saveShortcuts()

    const savedKeys = mockSaveKeys.mock.calls.at(-1)?.[0] as KeySetting[]
    expect(savedKeys).toHaveLength(1)
    expect(savedKeys[0]).toMatchObject({
      key: 'ctrl+shift+j',
      action: 'javascript',
      code: 'console.log("hello")',
      activeInInputs: true,
      blacklist: 'whitelist',
      sites: '*github.com*\n*example.com*',
      sitesArray: ['*github.com*', '*example.com*'],
    })
  })

  it('becomes clean after deleteShortcut (auto-saves)', async () => {
    const existing = [
      makeKey({ key: 'ctrl+a', action: 'newtab' }),
      makeKey({ key: 'ctrl+b', action: 'closetab' }),
    ]
    mockLoadKeys.mockResolvedValueOnce(JSON.stringify(existing))
    const { dirty, keys, deleteShortcut, loadSavedKeys } = useShortcuts()
    await loadSavedKeys()

    // Make a change first to set dirty
    keys.value[0].key = 'ctrl+z'
    await nextTick()
    expect(dirty.value).toBe(true)

    // deleteShortcut calls saveShortcuts internally
    await deleteShortcut(0)
    expect(dirty.value).toBe(false)
  })

  it('returns to clean if change is reverted', async () => {
    const existing = [makeKey({ key: 'ctrl+a', action: 'newtab' })]
    mockLoadKeys.mockResolvedValueOnce(JSON.stringify(existing))
    const { dirty, keys, loadSavedKeys } = useShortcuts()
    await loadSavedKeys()

    keys.value[0].key = 'ctrl+b'
    await nextTick()
    expect(dirty.value).toBe(true)

    // Revert the change
    keys.value[0].key = 'ctrl+a'
    await nextTick()
    expect(dirty.value).toBe(false)
  })

  it('stays clean when no changes are made', async () => {
    const existing = [makeKey({ key: 'ctrl+a', action: 'newtab' })]
    mockLoadKeys.mockResolvedValueOnce(JSON.stringify(existing))
    const { dirty, loadSavedKeys } = useShortcuts()
    await loadSavedKeys()

    await nextTick()
    await nextTick()
    expect(dirty.value).toBe(false)
  })
})
