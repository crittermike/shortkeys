import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Storage mocks ---
const mockSyncGet = vi.fn()
const mockSyncSet = vi.fn()
const mockLocalGet = vi.fn()
const mockLocalSet = vi.fn()
const mockOnChanged = vi.fn()

// Mock executeScript and showPageToast before any imports
vi.mock('../src/utils/execute-script', () => ({
  executeScript: vi.fn().mockResolvedValue([{ result: null }]),
  showPageToast: vi.fn().mockResolvedValue(undefined),
}))

// Set up browser/chrome mocks for action handlers at top level
const mockTabsQuery = vi.fn()
const mockTabsCreate = vi.fn()
const mockTabsRemove = vi.fn()

const browserMock = {
  tabs: {
    query: mockTabsQuery,
    create: mockTabsCreate,
    remove: mockTabsRemove,
    update: vi.fn(),
    move: vi.fn(),
    getZoom: vi.fn(),
    setZoom: vi.fn(),
    reload: vi.fn(),
    duplicate: vi.fn(),
    discard: vi.fn(),
    onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    sendMessage: vi.fn(),
  },
  windows: {
    create: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
    getCurrent: vi.fn().mockResolvedValue({ id: 1, state: 'normal' }),
  },
  sessions: {
    getRecentlyClosed: vi.fn().mockResolvedValue([]),
    restore: vi.fn(),
  },
  browsingData: { remove: vi.fn() },
  bookmarks: { search: vi.fn().mockResolvedValue([]), create: vi.fn(), remove: vi.fn() },
  management: { launchApp: vi.fn() },
  scripting: { executeScript: vi.fn() },
  debugger: { attach: vi.fn(), detach: vi.fn(), sendCommand: vi.fn() },
  permissions: { request: vi.fn().mockResolvedValue(true) },
  storage: {
    sync: { get: mockSyncGet, set: mockSyncSet },
    local: { get: mockLocalGet, set: mockLocalSet },
    onChanged: { addListener: mockOnChanged },
  },
}

// @ts-ignore
globalThis.browser = browserMock
// @ts-ignore
globalThis.chrome = {
  ...browserMock,
  downloads: { search: vi.fn(), show: vi.fn() },
  tabs: { ...browserMock.tabs, group: vi.fn().mockResolvedValue(1), ungroup: vi.fn() },
}
// @ts-ignore
globalThis.Blob = class Blob {
  constructor(public parts: any[]) {}
  get size() { return this.parts.join('').length }
}

// All dynamic imports at top level (required by esbuild -- cannot use await inside describe)
const {
  saveProfiles,
  loadProfiles,
  saveActiveProfile,
  loadActiveProfile,
} = await import('../src/utils/storage')

const { handleAction } = await import('../src/actions/action-handlers')
const { showPageToast } = await import('../src/utils/execute-script')
const mockShowPageToast = vi.mocked(showPageToast)
const { getAllActionValues, ACTION_CATEGORIES } = await import('../src/utils/actions-registry')

const defaultTab = { id: 1, url: 'https://example.com', index: 2, windowId: 1, pinned: false, mutedInfo: { muted: false } }

beforeEach(() => {
  vi.clearAllMocks()
  mockSyncGet.mockResolvedValue({})
  mockSyncSet.mockResolvedValue(undefined)
  mockLocalGet.mockResolvedValue({})
  mockLocalSet.mockResolvedValue(undefined)
  mockTabsQuery.mockResolvedValue([defaultTab])
})

// ============================================================
// Profile Storage Functions
// ============================================================

describe('saveProfiles', () => {
  it('saves to sync first, then local backup', async () => {
    const profiles = [{ id: '1', name: 'Work', icon: '💼', enabledGroups: ['Dev Tools'] }]
    await saveProfiles(profiles)

    expect(mockSyncSet).toHaveBeenCalledWith({ profiles: JSON.stringify(profiles) })
    expect(mockLocalSet).toHaveBeenCalledWith({ profiles: JSON.stringify(profiles) })
  })

  it('falls back to local when sync fails', async () => {
    mockSyncSet.mockRejectedValue(new Error('quota exceeded'))
    const profiles = [{ id: '1', name: 'Work', icon: '💼', enabledGroups: [] }]
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await saveProfiles(profiles)

    expect(mockLocalSet).toHaveBeenCalledWith({ profiles: JSON.stringify(profiles) })
    consoleSpy.mockRestore()
  })

  it('logs error when local also fails', async () => {
    mockSyncSet.mockRejectedValue(new Error('sync failed'))
    mockLocalSet.mockRejectedValue(new Error('local failed'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await saveProfiles([{ id: '1', name: 'X', icon: '🔥', enabledGroups: [] }])

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Shortkeys]'),
      expect.any(Error)
    )
    consoleSpy.mockRestore()
  })

  it('saves empty array', async () => {
    await saveProfiles([])

    expect(mockSyncSet).toHaveBeenCalledWith({ profiles: '[]' })
  })

  it('saves multiple profiles', async () => {
    const profiles = [
      { id: '1', name: 'Work', icon: '💼', enabledGroups: ['Dev Tools', 'Git'] },
      { id: '2', name: 'Browsing', icon: '🌐', enabledGroups: ['My Shortcuts'] },
      { id: '3', name: 'Media', icon: '🎬', enabledGroups: ['YouTube', 'Media Control'] },
    ]
    await saveProfiles(profiles)

    expect(mockSyncSet).toHaveBeenCalledWith({ profiles: JSON.stringify(profiles) })
  })
})

describe('loadProfiles', () => {
  it('loads from sync first', async () => {
    const profiles = [{ id: '1', name: 'Work', icon: '💼', enabledGroups: ['Dev'] }]
    mockSyncGet.mockResolvedValue({ profiles: JSON.stringify(profiles) })

    const result = await loadProfiles()

    expect(result).toEqual(profiles)
    expect(mockSyncGet).toHaveBeenCalledWith('profiles')
  })

  it('falls back to local if sync is empty', async () => {
    mockSyncGet.mockResolvedValue({})
    const profiles = [{ id: '2', name: 'Media', icon: '🎬', enabledGroups: [] }]
    mockLocalGet.mockResolvedValue({ profiles: JSON.stringify(profiles) })

    const result = await loadProfiles()

    expect(result).toEqual(profiles)
  })

  it('falls back to local if sync throws', async () => {
    mockSyncGet.mockRejectedValue(new Error('sync unavailable'))
    const profiles = [{ id: '3', name: 'Dev', icon: '🛠', enabledGroups: ['Dev'] }]
    mockLocalGet.mockResolvedValue({ profiles: JSON.stringify(profiles) })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await loadProfiles()

    expect(result).toEqual(profiles)
    consoleSpy.mockRestore()
  })

  it('returns empty array if no data anywhere', async () => {
    mockSyncGet.mockResolvedValue({})
    mockLocalGet.mockResolvedValue({})

    const result = await loadProfiles()

    expect(result).toEqual([])
  })

  it('returns empty array when both storage areas fail', async () => {
    mockSyncGet.mockRejectedValue(new Error('sync broken'))
    mockLocalGet.mockRejectedValue(new Error('local broken'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await loadProfiles()

    expect(result).toEqual([])
    consoleSpy.mockRestore()
  })

  it('preserves all profile fields', async () => {
    const profiles = [
      { id: 'abc-123', name: 'Complex Profile', icon: '🏠', enabledGroups: ['Group A', 'Group B', 'My Shortcuts'] },
    ]
    mockSyncGet.mockResolvedValue({ profiles: JSON.stringify(profiles) })

    const result = await loadProfiles()

    expect(result[0].id).toBe('abc-123')
    expect(result[0].name).toBe('Complex Profile')
    expect(result[0].icon).toBe('🏠')
    expect(result[0].enabledGroups).toEqual(['Group A', 'Group B', 'My Shortcuts'])
  })
})

describe('saveActiveProfile', () => {
  it('saves profile ID to local storage', async () => {
    await saveActiveProfile('profile-123')

    expect(mockLocalSet).toHaveBeenCalledWith({ activeProfile: 'profile-123' })
    // Active profile is local-only, not synced
    expect(mockSyncSet).not.toHaveBeenCalled()
  })

  it('saves null to clear active profile', async () => {
    await saveActiveProfile(null)

    expect(mockLocalSet).toHaveBeenCalledWith({ activeProfile: null })
  })

  it('logs error on failure without throwing', async () => {
    mockLocalSet.mockRejectedValue(new Error('storage error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Should not throw
    await saveActiveProfile('profile-456')

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Shortkeys] Failed to save active profile'),
      expect.any(Error)
    )
    consoleSpy.mockRestore()
  })
})

describe('loadActiveProfile', () => {
  it('loads active profile ID from local storage', async () => {
    mockLocalGet.mockResolvedValue({ activeProfile: 'profile-789' })

    const result = await loadActiveProfile()

    expect(result).toBe('profile-789')
  })

  it('returns null if no active profile', async () => {
    mockLocalGet.mockResolvedValue({})

    const result = await loadActiveProfile()

    expect(result).toBeNull()
  })

  it('returns null on storage error', async () => {
    mockLocalGet.mockRejectedValue(new Error('broken'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await loadActiveProfile()

    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })

  it('returns null for empty string value', async () => {
    mockLocalGet.mockResolvedValue({ activeProfile: '' })

    const result = await loadActiveProfile()

    expect(result).toBeNull()
  })
})

// ============================================================
// Profile Action Handlers
// ============================================================

describe('switchprofile', () => {
  it('returns false without profileId', async () => {
    const result = await handleAction('switchprofile', {} as any)
    expect(result).toBe(false)
  })

  it('returns false when profile not found', async () => {
    mockSyncGet.mockResolvedValue({ profiles: '[]' })
    const result = await handleAction('switchprofile', { profileId: 'nonexistent' } as any)
    expect(result).toBe(false)
  })

  it('applies profile and enables/disables groups', async () => {
    const profiles = [
      { id: 'p1', name: 'Work', icon: '💼', enabledGroups: ['Dev Tools'] },
    ]
    // loadProfiles reads from sync
    mockSyncGet
      .mockResolvedValueOnce({ profiles: JSON.stringify(profiles) }) // loadProfiles
      .mockResolvedValueOnce({ keys: JSON.stringify([
        { key: 'a', action: 'newtab', group: 'Dev Tools', enabled: true },
        { key: 'b', action: 'closetab', group: 'Browsing', enabled: true },
        { key: 'c', action: 'reload', enabled: true },  // ungrouped -> "My Shortcuts"
      ]) }) // loadKeys
    mockLocalGet.mockResolvedValue({}) // loadKeys fallback

    const result = await handleAction('switchprofile', { profileId: 'p1' } as any)

    expect(result).toBe(true)
    // saveKeys should be called with updated enabled states
    expect(mockSyncSet).toHaveBeenCalled()
    // saveActiveProfile should store the profile ID
    expect(mockLocalSet).toHaveBeenCalledWith({ activeProfile: 'p1' })
    // Should show toast
    expect(mockShowPageToast).toHaveBeenCalledWith('Switched to 💼 Work')
  })

  it('disables shortcuts not in enabled groups', async () => {
    const profiles = [
      { id: 'p1', name: 'Minimal', icon: '🔇', enabledGroups: ['Work'] },
    ]
    const keys = [
      { key: 'a', action: 'newtab', group: 'Work', enabled: true },
      { key: 'b', action: 'closetab', group: 'Play', enabled: true },
    ]
    mockSyncGet
      .mockResolvedValueOnce({ profiles: JSON.stringify(profiles) })
      .mockResolvedValueOnce({ keys: JSON.stringify(keys) })

    await handleAction('switchprofile', { profileId: 'p1' } as any)

    // Check the saved keys
    const savedCall = mockSyncSet.mock.calls.find((c: any[]) => c[0].keys)
    expect(savedCall).toBeDefined()
    const savedKeys = JSON.parse(savedCall![0].keys)
    expect(savedKeys[0].enabled).toBe(true)  // "Work" group
    expect(savedKeys[1].enabled).toBe(false) // "Play" group
  })

  it('treats ungrouped shortcuts as "My Shortcuts"', async () => {
    const profiles = [
      { id: 'p1', name: 'Test', icon: '🧪', enabledGroups: ['My Shortcuts'] },
    ]
    const keys = [
      { key: 'a', action: 'newtab' },  // no group -> "My Shortcuts"
      { key: 'b', action: 'closetab', group: 'Other' },
    ]
    mockSyncGet
      .mockResolvedValueOnce({ profiles: JSON.stringify(profiles) })
      .mockResolvedValueOnce({ keys: JSON.stringify(keys) })

    await handleAction('switchprofile', { profileId: 'p1' } as any)

    const savedCall = mockSyncSet.mock.calls.find((c: any[]) => c[0].keys)
    const savedKeys = JSON.parse(savedCall![0].keys)
    expect(savedKeys[0].enabled).toBe(true)  // ungrouped -> "My Shortcuts" -> enabled
    expect(savedKeys[1].enabled).toBe(false)  // "Other" -> not in enabledGroups
  })
})

describe('clearprofile', () => {
  it('enables all shortcuts', async () => {
    const keys = [
      { key: 'a', action: 'newtab', enabled: false },
      { key: 'b', action: 'closetab', enabled: false },
      { key: 'c', action: 'reload', enabled: true },
    ]
    mockSyncGet.mockResolvedValueOnce({ keys: JSON.stringify(keys) })

    const result = await handleAction('clearprofile')

    expect(result).toBe(true)

    // Check that all keys are now enabled
    const savedCall = mockSyncSet.mock.calls.find((c: any[]) => c[0].keys)
    expect(savedCall).toBeDefined()
    const savedKeys = JSON.parse(savedCall![0].keys)
    expect(savedKeys.every((k: any) => k.enabled === true)).toBe(true)
  })

  it('clears active profile to null', async () => {
    mockSyncGet.mockResolvedValueOnce({ keys: '[]' })

    await handleAction('clearprofile')

    expect(mockLocalSet).toHaveBeenCalledWith({ activeProfile: null })
  })

  it('shows toast message', async () => {
    mockSyncGet.mockResolvedValueOnce({ keys: '[]' })

    await handleAction('clearprofile')

    expect(mockShowPageToast).toHaveBeenCalledWith('All shortcuts enabled')
  })

  it('handles empty keys gracefully', async () => {
    mockSyncGet.mockResolvedValueOnce({}) // no keys in sync
    mockLocalGet.mockResolvedValueOnce({}) // no keys in local

    const result = await handleAction('clearprofile')

    expect(result).toBe(true)
  })
})

// ============================================================
// Profile Data Integrity
// ============================================================

describe('profile data integrity', () => {
  it('round-trips profiles through save/load cycle', async () => {
    const profiles = [
      { id: 'uuid-1', name: 'Work', icon: '💼', enabledGroups: ['Dev Tools', 'Git Shortcuts'] },
      { id: 'uuid-2', name: 'Leisure', icon: '🏖', enabledGroups: ['YouTube', 'Media Control', 'My Shortcuts'] },
    ]

    await saveProfiles(profiles)

    // Capture what was saved to sync
    const savedJson = mockSyncSet.mock.calls[0][0].profiles

    // Set up load to return what was saved
    mockSyncGet.mockResolvedValue({ profiles: savedJson })

    const loaded = await loadProfiles()

    expect(loaded).toEqual(profiles)
  })

  it('preserves unicode in profile names and icons', async () => {
    const profiles = [
      { id: '1', name: 'Работа', icon: '🇷🇺', enabledGroups: ['Группа'] },
      { id: '2', name: '仕事', icon: '🇯🇵', enabledGroups: ['グループ'] },
    ]

    await saveProfiles(profiles)

    const savedJson = mockSyncSet.mock.calls[0][0].profiles
    mockSyncGet.mockResolvedValue({ profiles: savedJson })

    const loaded = await loadProfiles()

    expect(loaded).toEqual(profiles)
  })

  it('handles profiles with empty enabledGroups', async () => {
    const profiles = [
      { id: '1', name: 'Silent', icon: '🔇', enabledGroups: [] },
    ]

    await saveProfiles(profiles)

    const savedJson = mockSyncSet.mock.calls[0][0].profiles
    mockSyncGet.mockResolvedValue({ profiles: savedJson })

    const loaded = await loadProfiles()

    expect(loaded[0].enabledGroups).toEqual([])
  })

  it('active profile round-trips through save/load', async () => {
    await saveActiveProfile('my-profile-id')

    mockLocalGet.mockResolvedValue({ activeProfile: 'my-profile-id' })

    const loaded = await loadActiveProfile()

    expect(loaded).toBe('my-profile-id')
  })
})

// ============================================================
// Action Registry Integration
// ============================================================

describe('profile actions in registry', () => {
  it('switchprofile action is registered', () => {
    const allActions = getAllActionValues()
    expect(allActions).toContain('switchprofile')
  })

  it('clearprofile action is registered', () => {
    const allActions = getAllActionValues()
    expect(allActions).toContain('clearprofile')
  })

  it('profiles category exists in ACTION_CATEGORIES', () => {
    const profileActions = ACTION_CATEGORIES['Profiles']
    expect(profileActions).toBeDefined()
    expect(profileActions.length).toBeGreaterThanOrEqual(2)
  })

  it('profile actions have labels', () => {
    const profileActions = ACTION_CATEGORIES['Profiles']
    for (const action of profileActions) {
      expect(action.label).toBeTruthy()
      expect(action.value).toBeTruthy()
    }
  })
})
