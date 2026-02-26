import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { KeySetting } from '../src/utils/url-matching'
import { ACTION_CATEGORIES } from '../src/utils/actions-registry'

/**
 * Tests for the popup quick-add shortcut feature (#700).
 * These test the data flow and logic — the actual Vue component rendering
 * is tested via E2E tests.
 */

const mockSyncGet = vi.fn()
const mockSyncSet = vi.fn()
const mockLocalGet = vi.fn()
const mockLocalSet = vi.fn()
const mockOnChanged = vi.fn()

// @ts-ignore
globalThis.chrome = {
  storage: {
    sync: { get: mockSyncGet, set: mockSyncSet },
    local: { get: mockLocalGet, set: mockLocalSet },
    onChanged: { addListener: mockOnChanged },
  },
}
// @ts-ignore
globalThis.Blob = class Blob {
  constructor(public parts: any[]) {}
  get size() { return this.parts.join('').length }
}

const { saveKeys, loadKeys } = await import('../src/utils/storage')

beforeEach(() => {
  vi.clearAllMocks()
  mockSyncGet.mockResolvedValue({})
  mockSyncSet.mockResolvedValue(undefined)
  mockLocalGet.mockResolvedValue({})
  mockLocalSet.mockResolvedValue(undefined)
  // Set up verification read-back: local.get returns what local.set wrote
  let storedKeys: string | undefined
  mockLocalSet.mockImplementation(async (data: any) => {
    if (data.keys !== undefined) storedKeys = data.keys
  })
  mockLocalGet.mockImplementation(async (key: string) => {
    if (key === 'keys' && storedKeys !== undefined) return { keys: storedKeys }
    return {}
  })
})

describe('popup quick-add shortcut flow', () => {
  it('creates a valid KeySetting with required fields', () => {
    const newShortcut: KeySetting = {
      id: crypto.randomUUID(),
      key: 'ctrl+shift+n',
      action: 'newtab',
      enabled: true,
    }

    expect(newShortcut.id).toBeTruthy()
    expect(newShortcut.id).toMatch(/^[0-9a-f-]+$/)
    expect(newShortcut.key).toBe('ctrl+shift+n')
    expect(newShortcut.action).toBe('newtab')
    expect(newShortcut.enabled).toBe(true)
  })

  it('appends new shortcut to existing keys and saves', async () => {
    const existing: KeySetting[] = [
      { key: 'ctrl+b', action: 'newtab', id: 'existing-1', enabled: true },
    ]
    mockSyncGet.mockResolvedValue({ keys: JSON.stringify(existing) })

    // Simulate the quick-add save flow
    const saved = await loadKeys()
    const currentKeys: KeySetting[] = saved ? JSON.parse(saved) : []

    const newShortcut: KeySetting = {
      id: crypto.randomUUID(),
      key: 'ctrl+shift+k',
      action: 'closetab',
      enabled: true,
    }

    currentKeys.push(newShortcut)
    await saveKeys(currentKeys)

    expect(currentKeys).toHaveLength(2)
    expect(currentKeys[0].id).toBe('existing-1')
    expect(currentKeys[1].key).toBe('ctrl+shift+k')
    expect(currentKeys[1].action).toBe('closetab')
    expect(mockSyncSet).toHaveBeenCalledWith({
      keys: JSON.stringify(currentKeys),
    })
  })

  it('creates shortcut with empty storage (first shortcut)', async () => {
    mockSyncGet.mockResolvedValue({})
    // Override local mock to return empty initially, then return stored data after write
    let storedKeys: string | undefined
    mockLocalSet.mockImplementation(async (data: any) => {
      if (data.keys !== undefined) storedKeys = data.keys
    })
    mockLocalGet.mockImplementation(async (key: string) => {
      if (key === 'keys' && storedKeys !== undefined) return { keys: storedKeys }
      return {}
    })
    const saved = await loadKeys()
    const currentKeys: KeySetting[] = saved ? JSON.parse(saved) : []

    expect(currentKeys).toHaveLength(0)

    const newShortcut: KeySetting = {
      id: crypto.randomUUID(),
      key: 'j',
      action: 'scrolldown',
      enabled: true,
    }

    currentKeys.push(newShortcut)
    await saveKeys(currentKeys)

    expect(currentKeys).toHaveLength(1)
    expect(mockSyncSet).toHaveBeenCalledWith({
      keys: JSON.stringify([newShortcut]),
    })
  })

  it('does not save when key is empty', () => {
    const newKey = ''
    const newAction = 'newtab'

    // Guard check from the component
    const shouldSave = !!(newKey && newAction)
    expect(shouldSave).toBe(false)
  })

  it('does not save when action is empty', () => {
    const newKey = 'ctrl+a'
    const newAction = ''

    const shouldSave = !!(newKey && newAction)
    expect(shouldSave).toBe(false)
  })

  it('generates unique IDs for each new shortcut', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(crypto.randomUUID())
    }
    expect(ids.size).toBe(100)
  })

  it('new shortcut appears in filtered list (enabled, has key and action)', () => {
    const keys: KeySetting[] = [
      { key: 'ctrl+b', action: 'newtab', id: '1', enabled: true },
      { key: 'ctrl+k', action: 'closetab', id: '2', enabled: true },
      { key: '', action: 'reload', id: '3', enabled: true }, // empty key — should be filtered out
      { key: 'ctrl+d', action: 'back', id: '4', enabled: false }, // disabled — should be filtered out
    ]

    // Replicate popup's filtered logic
    const active = keys.filter((k) => k.enabled !== false && k.key && k.action)
    expect(active).toHaveLength(2)
    expect(active.map((k) => k.id)).toEqual(['1', '2'])
  })

  it('new shortcut is searchable by action label', () => {
    const actionLabels: Record<string, string> = {}
    for (const actions of Object.values(ACTION_CATEGORIES)) {
      for (const a of actions) actionLabels[a.value] = a.label
    }

    const keys: KeySetting[] = [
      { key: 'ctrl+n', action: 'newtab', id: '1', enabled: true },
    ]

    const q = 'new tab'
    const filtered = keys.filter((k) => {
      if (k.enabled === false || !k.key || !k.action) return false
      const label = (k.label || '').toLowerCase()
      const key = (k.key || '').toLowerCase()
      const action = (actionLabels[k.action] || k.action || '').toLowerCase()
      return label.includes(q) || key.includes(q) || action.includes(q)
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0].action).toBe('newtab')
  })
})

describe('ACTION_CATEGORIES as SearchSelect options', () => {
  it('ACTION_CATEGORIES has the correct shape for SearchSelect', () => {
    expect(typeof ACTION_CATEGORIES).toBe('object')
    for (const [group, actions] of Object.entries(ACTION_CATEGORIES)) {
      expect(typeof group).toBe('string')
      expect(Array.isArray(actions)).toBe(true)
      for (const action of actions) {
        expect(action).toHaveProperty('value')
        expect(action).toHaveProperty('label')
        expect(typeof action.value).toBe('string')
        expect(typeof action.label).toBe('string')
      }
    }
  })

  it('all action categories have at least one action', () => {
    for (const [group, actions] of Object.entries(ACTION_CATEGORIES)) {
      expect(actions.length, `Category "${group}" is empty`).toBeGreaterThan(0)
    }
  })
})
