import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

const mockSyncGet = vi.fn()
const mockSyncSet = vi.fn()
const mockSyncRemove = vi.fn()
const mockLocalGet = vi.fn()
const mockLocalSet = vi.fn()
const mockOnChanged = vi.fn()

const originalChrome = globalThis.chrome
const originalBlob = globalThis.Blob

// @ts-ignore
globalThis.chrome = {
  ...(originalChrome ?? {}),
  storage: {
    sync: { get: mockSyncGet, set: mockSyncSet, remove: mockSyncRemove },
    local: { get: mockLocalGet, set: mockLocalSet },
    onChanged: { addListener: mockOnChanged },
  },
}

// @ts-ignore
globalThis.Blob = class Blob {
  constructor(public parts: any[]) {}
  get size() { return this.parts.join('').length }
}

afterAll(() => {
  globalThis.chrome = originalChrome
  globalThis.Blob = originalBlob
})

beforeEach(() => {
  vi.clearAllMocks()
  mockSyncGet.mockResolvedValue({})
  mockSyncSet.mockResolvedValue(undefined)
  mockSyncRemove.mockResolvedValue(undefined)
  mockLocalGet.mockResolvedValue({})
  mockLocalSet.mockResolvedValue(undefined)
})

describe('pack group site rules', () => {
  it('installs group settings when pack includes groupSettings', async () => {
    const { usePacks } = await import('../src/composables/usePacks')
    const { useShortcuts } = await import('../src/composables/useShortcuts')
    const { installPack } = usePacks()
    const { keys } = useShortcuts()

    keys.value = []

    await installPack({
      id: 'crm-pack',
      name: 'CRM Pack',
      description: 'CRM shortcuts',
      shortcuts: [
        { key: 'meta+shift+k', action: 'javascript', label: 'Prev contact' },
      ],
      groupSettings: {
        activateOn: 'https://app.example.com/*',
      },
    })

    // Shortcuts should be added
    expect(keys.value.length).toBe(1)
    expect(keys.value[0].group).toBe('CRM Pack')

    // Group settings should be saved to storage
    const syncSetCalls = mockSyncSet.mock.calls
    const groupSettingsCall = syncSetCalls.find(
      (call: any[]) => call[0] && call[0].groupSettings
    )
    expect(groupSettingsCall).toBeTruthy()
    const saved = JSON.parse(groupSettingsCall![0].groupSettings)
    expect(saved['CRM Pack']).toBeDefined()
    expect(saved['CRM Pack'].activateOn).toBe('https://app.example.com/*')
  })

  it('installs group settings with both activateOn and deactivateOn', async () => {
    const { usePacks } = await import('../src/composables/usePacks')
    const { useShortcuts } = await import('../src/composables/useShortcuts')
    const { installPack } = usePacks()
    const { keys } = useShortcuts()

    keys.value = []

    await installPack({
      id: 'filtered-pack',
      name: 'Filtered Pack',
      description: 'Pack with both filters',
      shortcuts: [
        { key: 'alt+a', action: 'scrolldown', label: 'Scroll' },
      ],
      groupSettings: {
        activateOn: 'https://app.example.com/*',
        deactivateOn: 'https://app.example.com/admin*',
      },
    })

    const syncSetCalls = mockSyncSet.mock.calls
    const groupSettingsCall = syncSetCalls.find(
      (call: any[]) => call[0] && call[0].groupSettings
    )
    expect(groupSettingsCall).toBeTruthy()
    const saved = JSON.parse(groupSettingsCall![0].groupSettings)
    expect(saved['Filtered Pack'].activateOn).toBe('https://app.example.com/*')
    expect(saved['Filtered Pack'].deactivateOn).toBe('https://app.example.com/admin*')
  })

  it('does not write group settings when pack has no groupSettings', async () => {
    const { usePacks } = await import('../src/composables/usePacks')
    const { useShortcuts } = await import('../src/composables/useShortcuts')
    const { installPack } = usePacks()
    const { keys } = useShortcuts()

    keys.value = []
    vi.clearAllMocks()
    mockSyncSet.mockResolvedValue(undefined)
    mockLocalSet.mockResolvedValue(undefined)

    await installPack({
      id: 'plain-pack',
      name: 'Plain Pack',
      description: 'No site rules',
      shortcuts: [
        { key: 'alt+b', action: 'newtab', label: 'New tab' },
      ],
    })

    // Only saveKeys should be called, not saveGroupSettings
    const groupSettingsCall = mockSyncSet.mock.calls.find(
      (call: any[]) => call[0] && call[0].groupSettings
    )
    expect(groupSettingsCall).toBeUndefined()
  })

  it('preserves existing group settings from other groups', async () => {
    const { usePacks } = await import('../src/composables/usePacks')
    const { useShortcuts } = await import('../src/composables/useShortcuts')
    const { useGroups } = await import('../src/composables/useGroups')
    const { installPack } = usePacks()
    const { keys } = useShortcuts()
    const { groupSettings } = useGroups()

    keys.value = [{ key: 'alt+z', action: 'newtab', id: 'existing', group: 'Other Group', enabled: true } as any]
    // Set up existing group settings (after beforeEach mock reset)
    groupSettings['Other Group'] = { activateOn: 'https://other.com/*' }

    await installPack({
      id: 'new-pack',
      name: 'New Pack',
      description: 'Another pack',
      shortcuts: [
        { key: 'alt+c', action: 'closetab', label: 'Close' },
      ],
      groupSettings: {
        activateOn: 'https://new.com/*',
      },
    })

    // Both group settings should be in the reactive state
    expect(groupSettings['New Pack']).toBeDefined()
    expect(groupSettings['New Pack'].activateOn).toBe('https://new.com/*')
    expect(groupSettings['Other Group']).toBeDefined()
    expect(groupSettings['Other Group'].activateOn).toBe('https://other.com/*')
  })
})
