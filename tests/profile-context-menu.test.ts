import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Storage mocks ---
const mockSyncGet = vi.fn()
const mockSyncSet = vi.fn()
const mockLocalGet = vi.fn()
const mockLocalSet = vi.fn()
const mockOnChanged = vi.fn()

const mockContextMenusCreate = vi.fn()
const mockContextMenusRemoveAll = vi.fn().mockResolvedValue(undefined)
const mockSetBadgeText = vi.fn().mockResolvedValue(undefined)
const mockSetBadgeBackgroundColor = vi.fn().mockResolvedValue(undefined)

const browserMock = {
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
  contextMenus: {
    create: mockContextMenusCreate,
    removeAll: mockContextMenusRemoveAll,
    onClicked: { addListener: vi.fn() },
  },
  action: {
    setBadgeText: mockSetBadgeText,
    setBadgeBackgroundColor: mockSetBadgeBackgroundColor,
  },
}

// Dynamic imports after mocks are set up
const { buildProfileContextMenu, handleProfileMenuClick, PROFILE_MENU_PARENT, PROFILE_MENU_CLEAR } = await import('../src/utils/profile-context-menu')
const { updateProfileBadge } = await import('../src/utils/profile-badge')

beforeEach(() => {
  vi.clearAllMocks()
  mockSyncGet.mockResolvedValue({})
  mockSyncSet.mockResolvedValue(undefined)
  mockLocalGet.mockResolvedValue({})
  mockLocalSet.mockResolvedValue(undefined)
  mockContextMenusRemoveAll.mockResolvedValue(undefined)
})

// ============================================================
// buildProfileContextMenu
// ============================================================

describe('buildProfileContextMenu', () => {
  it('removes all existing menus before rebuilding', async () => {
    mockSyncGet.mockResolvedValue({ profiles: '[]' })
    await buildProfileContextMenu()

    expect(mockContextMenusRemoveAll).toHaveBeenCalledOnce()
  })

  it('does nothing when no profiles exist', async () => {
    mockSyncGet.mockResolvedValue({ profiles: '[]' })
    await buildProfileContextMenu()

    expect(mockContextMenusCreate).not.toHaveBeenCalled()
  })

  it('creates parent menu, profile items, separator, and clear option', async () => {
    const profiles = [
      { id: 'p1', name: 'Work', icon: '💼', enabledGroups: ['Dev'] },
      { id: 'p2', name: 'Leisure', icon: '🏖', enabledGroups: ['Media'] },
    ]
    mockSyncGet.mockResolvedValue({ profiles: JSON.stringify(profiles) })
    mockLocalGet.mockResolvedValue({}) // no active profile

    await buildProfileContextMenu()

    // parent + 2 profiles + separator + clear = 5 creates
    expect(mockContextMenusCreate).toHaveBeenCalledTimes(5)

    // Parent menu
    expect(mockContextMenusCreate).toHaveBeenCalledWith(expect.objectContaining({
      id: PROFILE_MENU_PARENT,
      title: 'Shortkeys Profiles',
      contexts: ['action'],
    }))

    // Profile items
    expect(mockContextMenusCreate).toHaveBeenCalledWith(expect.objectContaining({
      id: 'shortkeys-profile-p1',
      parentId: PROFILE_MENU_PARENT,
      title: '💼 Work',
      type: 'radio',
      checked: false,
    }))
    expect(mockContextMenusCreate).toHaveBeenCalledWith(expect.objectContaining({
      id: 'shortkeys-profile-p2',
      parentId: PROFILE_MENU_PARENT,
      title: '🏖 Leisure',
      type: 'radio',
      checked: false,
    }))

    // Separator
    expect(mockContextMenusCreate).toHaveBeenCalledWith(expect.objectContaining({
      id: 'shortkeys-profile-sep',
      type: 'separator',
    }))

    // Clear option
    expect(mockContextMenusCreate).toHaveBeenCalledWith(expect.objectContaining({
      id: PROFILE_MENU_CLEAR,
      title: 'All shortcuts (no profile)',
      type: 'radio',
      checked: true, // no active profile
    }))
  })

  it('marks active profile as checked', async () => {
    const profiles = [
      { id: 'p1', name: 'Work', icon: '💼', enabledGroups: [] },
      { id: 'p2', name: 'Play', icon: '🎮', enabledGroups: [] },
    ]
    mockSyncGet.mockResolvedValue({ profiles: JSON.stringify(profiles) })
    mockLocalGet.mockResolvedValue({ activeProfile: 'p2' })

    await buildProfileContextMenu()

    // p1 unchecked, p2 checked
    expect(mockContextMenusCreate).toHaveBeenCalledWith(expect.objectContaining({
      id: 'shortkeys-profile-p1',
      checked: false,
    }))
    expect(mockContextMenusCreate).toHaveBeenCalledWith(expect.objectContaining({
      id: 'shortkeys-profile-p2',
      checked: true,
    }))

    // Clear should be unchecked since a profile is active
    expect(mockContextMenusCreate).toHaveBeenCalledWith(expect.objectContaining({
      id: PROFILE_MENU_CLEAR,
      checked: false,
    }))
  })

  it('gracefully handles no contextMenus API', async () => {
    // Temporarily remove contextMenus
    const saved = chrome.contextMenus
    // @ts-ignore
    chrome.contextMenus = undefined

    // Should not throw
    await buildProfileContextMenu()

    // Restore
    // @ts-ignore
    chrome.contextMenus = saved
  })
})

// ============================================================
// handleProfileMenuClick
// ============================================================

describe('handleProfileMenuClick', () => {
  it('enables all shortcuts when clear option clicked', async () => {
    const keys = [
      { key: 'a', action: 'newtab', enabled: false },
      { key: 'b', action: 'closetab', enabled: false },
    ]
    mockSyncGet.mockResolvedValueOnce({ keys: JSON.stringify(keys) })

    await handleProfileMenuClick(PROFILE_MENU_CLEAR)

    // saveKeys called — all enabled
    const savedCall = mockSyncSet.mock.calls.find((c: any[]) => c[0].keys)
    expect(savedCall).toBeDefined()
    const savedKeys = JSON.parse(savedCall![0].keys)
    expect(savedKeys.every((k: any) => k.enabled === true)).toBe(true)

    // Active profile cleared
    expect(mockLocalSet).toHaveBeenCalledWith({ activeProfile: null })
  })

  it('switches profile and enables/disables groups', async () => {
    const profiles = [
      { id: 'p1', name: 'Work', icon: '💼', enabledGroups: ['Dev Tools'] },
    ]
    const keys = [
      { key: 'a', action: 'newtab', group: 'Dev Tools', enabled: false },
      { key: 'b', action: 'closetab', group: 'Browsing', enabled: true },
    ]
    mockSyncGet
      .mockResolvedValueOnce({ profiles: JSON.stringify(profiles) }) // loadProfiles
      .mockResolvedValueOnce({ keys: JSON.stringify(keys) }) // loadKeys

    await handleProfileMenuClick('shortkeys-profile-p1')

    const savedCall = mockSyncSet.mock.calls.find((c: any[]) => c[0].keys)
    expect(savedCall).toBeDefined()
    const savedKeys = JSON.parse(savedCall![0].keys)
    expect(savedKeys[0].enabled).toBe(true)  // "Dev Tools" enabled
    expect(savedKeys[1].enabled).toBe(false) // "Browsing" disabled

    expect(mockLocalSet).toHaveBeenCalledWith({ activeProfile: 'p1' })
  })

  it('treats ungrouped shortcuts as "My Shortcuts"', async () => {
    const profiles = [
      { id: 'p1', name: 'Test', icon: '🧪', enabledGroups: ['My Shortcuts'] },
    ]
    const keys = [
      { key: 'a', action: 'newtab' },  // no group
      { key: 'b', action: 'closetab', group: 'Other' },
    ]
    mockSyncGet
      .mockResolvedValueOnce({ profiles: JSON.stringify(profiles) })
      .mockResolvedValueOnce({ keys: JSON.stringify(keys) })

    await handleProfileMenuClick('shortkeys-profile-p1')

    const savedCall = mockSyncSet.mock.calls.find((c: any[]) => c[0].keys)
    const savedKeys = JSON.parse(savedCall![0].keys)
    expect(savedKeys[0].enabled).toBe(true)  // ungrouped → "My Shortcuts" → enabled
    expect(savedKeys[1].enabled).toBe(false) // "Other" → disabled
  })

  it('ignores click for nonexistent profile', async () => {
    mockSyncGet
      .mockResolvedValueOnce({ profiles: '[]' }) // no profiles

    await handleProfileMenuClick('shortkeys-profile-nonexistent')

    // saveKeys should NOT have been called
    expect(mockSyncSet).not.toHaveBeenCalled()
  })

  it('ignores unrelated menu item IDs', async () => {
    await handleProfileMenuClick('some-other-menu-item')

    // Nothing should happen
    expect(mockSyncSet).not.toHaveBeenCalled()
    expect(mockLocalSet).not.toHaveBeenCalled()
  })
})

// ============================================================
// updateProfileBadge
// ============================================================

describe('updateProfileBadge', () => {
  it('clears badge when no active profile', async () => {
    mockLocalGet.mockResolvedValue({}) // no active profile

    await updateProfileBadge()

    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' })
    expect(mockSetBadgeBackgroundColor).not.toHaveBeenCalled()
  })

  it('clears badge when active profile not found in profiles list', async () => {
    mockLocalGet.mockResolvedValue({ activeProfile: 'deleted-id' })
    mockSyncGet.mockResolvedValue({ profiles: '[]' })

    await updateProfileBadge()

    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '' })
  })

  it('sets badge to profile emoji when profile is active', async () => {
    const profiles = [
      { id: 'p1', name: 'Work', icon: '💼', enabledGroups: [] },
    ]
    mockLocalGet.mockResolvedValue({ activeProfile: 'p1' })
    mockSyncGet.mockResolvedValue({ profiles: JSON.stringify(profiles) })

    await updateProfileBadge()

    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '💼' })
    expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#4f46e5' })
  })

  it('uses correct emoji for different profiles', async () => {
    const profiles = [
      { id: 'p1', name: 'Work', icon: '💼', enabledGroups: [] },
      { id: 'p2', name: 'Media', icon: '🎬', enabledGroups: [] },
    ]
    mockLocalGet.mockResolvedValue({ activeProfile: 'p2' })
    mockSyncGet.mockResolvedValue({ profiles: JSON.stringify(profiles) })

    await updateProfileBadge()

    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '🎬' })
  })

  it('gracefully handles no action API', async () => {
    const saved = chrome.action
    // @ts-ignore
    chrome.action = undefined

    // Should not throw
    await updateProfileBadge()

    // Restore
    // @ts-ignore
    chrome.action = saved
  })
})
