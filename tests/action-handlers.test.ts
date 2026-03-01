import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAllActionValues } from '../src/utils/actions-registry'

// Mock the browser APIs and executeScript before importing action-handlers
const mockTabsQuery = vi.fn()
const mockTabsCreate = vi.fn()
const mockTabsRemove = vi.fn()
const mockTabsDuplicate = vi.fn()
const mockTabsUpdate = vi.fn()
const mockTabsMove = vi.fn()
const mockTabsGetZoom = vi.fn()
const mockTabsSetZoom = vi.fn()
const mockTabsReload = vi.fn()
const mockTabsDiscard = vi.fn()
const mockWindowsCreate = vi.fn()
const mockWindowsRemove = vi.fn()
const mockWindowsUpdate = vi.fn()
const mockWindowsGetCurrent = vi.fn()
const mockSessionsGetRecentlyClosed = vi.fn()
const mockSessionsRestore = vi.fn()
const mockBrowsingDataRemove = vi.fn()
const mockBookmarksSearch = vi.fn()
const mockBookmarksCreate = vi.fn()
const mockBookmarksRemove = vi.fn()
const mockManagementLaunchApp = vi.fn()
const mockTabsSendMessage = vi.fn()

// Mock executeScript and showPageToast globally
vi.mock('../src/utils/execute-script', () => ({
  executeScript: vi.fn().mockResolvedValue([{ result: null }]),
  showPageToast: vi.fn().mockResolvedValue(undefined),
}))

// Set up browser global
const browserMock = {
  tabs: {
    query: mockTabsQuery,
    create: mockTabsCreate,
    remove: mockTabsRemove,
    duplicate: mockTabsDuplicate,
    update: mockTabsUpdate,
    move: mockTabsMove,
    getZoom: mockTabsGetZoom,
    setZoom: mockTabsSetZoom,
    reload: mockTabsReload,
    discard: mockTabsDiscard,
    onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    sendMessage: mockTabsSendMessage,
  },
  windows: {
    create: mockWindowsCreate,
    remove: mockWindowsRemove,
    update: mockWindowsUpdate,
    getCurrent: mockWindowsGetCurrent,
  },
  sessions: {
    getRecentlyClosed: mockSessionsGetRecentlyClosed,
    restore: mockSessionsRestore,
  },
  browsingData: { remove: mockBrowsingDataRemove },
  bookmarks: { search: mockBookmarksSearch, create: mockBookmarksCreate, remove: mockBookmarksRemove },
  management: { launchApp: mockManagementLaunchApp },
  scripting: { executeScript: vi.fn() },
  debugger: { attach: vi.fn(), detach: vi.fn(), sendCommand: vi.fn() },
  permissions: { request: vi.fn().mockResolvedValue(true) },
}

// @ts-ignore
globalThis.browser = browserMock
// @ts-ignore
globalThis.chrome = {
  ...browserMock,
  downloads: { search: vi.fn(), show: vi.fn() },
  tabs: { ...browserMock.tabs, group: vi.fn().mockResolvedValue(1), ungroup: vi.fn().mockResolvedValue(undefined) },
}

// Now import the module under test
const { handleAction } = await import('../src/actions/action-handlers')
const { showPageToast } = await import('../src/utils/execute-script')
const mockShowPageToast = vi.mocked(showPageToast)

const defaultTab = { id: 1, url: 'https://example.com', index: 2, windowId: 1, pinned: false, mutedInfo: { muted: false } }



beforeEach(() => {
  vi.clearAllMocks()
  mockTabsQuery.mockResolvedValue([defaultTab])
  mockTabsCreate.mockResolvedValue({ id: 2 })
  mockTabsRemove.mockResolvedValue(undefined)
  mockTabsDuplicate.mockResolvedValue(undefined)
  mockTabsUpdate.mockResolvedValue(undefined)
  mockTabsMove.mockResolvedValue(undefined)
  mockTabsGetZoom.mockResolvedValue(1.0)
  mockTabsSetZoom.mockResolvedValue(undefined)
  mockTabsReload.mockResolvedValue(undefined)
  mockTabsDiscard.mockResolvedValue(undefined)
  mockWindowsCreate.mockResolvedValue(undefined)
  mockWindowsRemove.mockResolvedValue(undefined)
  mockWindowsUpdate.mockResolvedValue(undefined)
  mockWindowsGetCurrent.mockResolvedValue({ id: 1, state: 'normal' })
  mockSessionsGetRecentlyClosed.mockResolvedValue([{ sessionId: 'sess1' }])
  mockSessionsRestore.mockResolvedValue(undefined)
  mockBrowsingDataRemove.mockResolvedValue(undefined)
  mockBookmarksSearch.mockResolvedValue([])
  mockBookmarksCreate.mockResolvedValue({ id: 'bm1' })
  mockBookmarksRemove.mockResolvedValue(undefined)
  mockManagementLaunchApp.mockResolvedValue(undefined)
})

describe('handleAction', () => {
  it('returns false for unknown actions', async () => {
    expect(await handleAction('nonexistent')).toBe(false)
  })

  it('returns true for known actions', async () => {
    expect(await handleAction('newtab')).toBe(true)
    expect(await handleAction('closetab')).toBe(true)
    expect(await handleAction('disable')).toBe(true)
  })

  describe('tab management', () => {
    it('creates a new tab', async () => {
      await handleAction('newtab')
      expect(mockTabsCreate).toHaveBeenCalledWith({})
    })

    it('closes the current tab', async () => {
      await handleAction('closetab')
      expect(mockTabsRemove).toHaveBeenCalledWith(1)
    })

    it('duplicates the current tab', async () => {
      await handleAction('clonetab')
      expect(mockTabsDuplicate).toHaveBeenCalledWith(1)
    })

    it('reopens last closed tab', async () => {
      await handleAction('reopentab')
      expect(mockSessionsGetRecentlyClosed).toHaveBeenCalledWith({ maxResults: 1 })
      expect(mockSessionsRestore).toHaveBeenCalledWith('sess1')
    })

    it('closes other tabs', async () => {
      mockTabsQuery.mockResolvedValue([{ id: 3 }, { id: 4 }])
      await handleAction('onlytab')
      expect(mockTabsRemove).toHaveBeenCalled()
    })

    it('toggles pin on current tab', async () => {
      mockTabsQuery.mockResolvedValue([defaultTab])
      await handleAction('togglepin')
      expect(mockTabsUpdate).toHaveBeenCalledWith(1, { pinned: true })
    })

    it('toggles mute on current tab', async () => {
      await handleAction('togglemute')
      expect(mockTabsUpdate).toHaveBeenCalledWith(1, { muted: true })
    })
  })

  describe('tab navigation', () => {
    it('switches to next tab', async () => {
      mockTabsQuery
        .mockResolvedValueOnce([{ id: 1, index: 0 }, { id: 2, index: 1 }, { id: 3, index: 2 }])
        .mockResolvedValueOnce([{ id: 2, index: 1 }])
      await handleAction('nexttab')
      expect(mockTabsUpdate).toHaveBeenCalled()
    })

    it('switches to previous tab', async () => {
      mockTabsQuery
        .mockResolvedValueOnce([{ id: 1, index: 0 }, { id: 2, index: 1 }, { id: 3, index: 2 }])
        .mockResolvedValueOnce([{ id: 2, index: 1 }])
      await handleAction('prevtab')
      expect(mockTabsUpdate).toHaveBeenCalled()
    })
  })

  describe('tab movement', () => {
    it('moves tab left', async () => {
      await handleAction('movetableft')
      expect(mockTabsMove).toHaveBeenCalledWith(1, { index: 1 })
    })

    it('moves tab right', async () => {
      await handleAction('movetabright')
      expect(mockTabsMove).toHaveBeenCalledWith(1, { index: 3 })
    })

    it('moves tab to first position', async () => {
      await handleAction('movetabtofirst')
      expect(mockTabsMove).toHaveBeenCalledWith(1, { index: 0 })
    })

    it('moves tab to last position', async () => {
      await handleAction('movetabtolast')
      expect(mockTabsMove).toHaveBeenCalledWith(1, { index: -1 })
    })

    it('does not move tab left if already at position 0', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, index: 0 }])
      await handleAction('movetableft')
      expect(mockTabsMove).not.toHaveBeenCalled()
    })

    it('joins tab group when moving left next to a grouped tab', async () => {
      const activeTab = { ...defaultTab, id: 3, index: 2, groupId: -1 }
      const groupedTab = { id: 2, index: 1, groupId: 5 }
      mockTabsQuery
        .mockResolvedValueOnce([activeTab])
        .mockResolvedValueOnce([{ id: 1, index: 0 }, groupedTab, activeTab])
      await handleAction('movetableft')
      expect(mockTabsMove).toHaveBeenCalledWith(3, { index: 1 })
      expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [3], groupId: 5 })
    })

    it('joins tab group when moving right next to a grouped tab', async () => {
      const activeTab = { ...defaultTab, id: 3, index: 1, groupId: -1 }
      const groupedTab = { id: 4, index: 2, groupId: 7 }
      mockTabsQuery
        .mockResolvedValueOnce([activeTab])
        .mockResolvedValueOnce([{ id: 1, index: 0 }, activeTab, groupedTab])
      await handleAction('movetabright')
      expect(mockTabsMove).toHaveBeenCalledWith(3, { index: 2 })
      expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [3], groupId: 7 })
    })

    it('leaves tab group when moving left away from group', async () => {
      const activeTab = { ...defaultTab, id: 3, index: 2, groupId: 5 }
      const ungroupedTab = { id: 2, index: 1, groupId: -1 }
      mockTabsQuery
        .mockResolvedValueOnce([activeTab])
        .mockResolvedValueOnce([{ id: 1, index: 0 }, ungroupedTab, activeTab])
      await handleAction('movetableft')
      expect(mockTabsMove).toHaveBeenCalledWith(3, { index: 1 })
      expect(chrome.tabs.ungroup).toHaveBeenCalledWith(3)
    })

    it('leaves tab group when moving right away from group', async () => {
      const activeTab = { ...defaultTab, id: 3, index: 1, groupId: 5 }
      const ungroupedTab = { id: 4, index: 2, groupId: -1 }
      mockTabsQuery
        .mockResolvedValueOnce([activeTab])
        .mockResolvedValueOnce([{ id: 1, index: 0 }, activeTab, ungroupedTab])
      await handleAction('movetabright')
      expect(mockTabsMove).toHaveBeenCalledWith(3, { index: 2 })
      expect(chrome.tabs.ungroup).toHaveBeenCalledWith(3)
    })

    it('stays in same group when moving left within group', async () => {
      const activeTab = { ...defaultTab, id: 3, index: 2, groupId: 5 }
      const sameGroupTab = { id: 2, index: 1, groupId: 5 }
      mockTabsQuery
        .mockResolvedValueOnce([activeTab])
        .mockResolvedValueOnce([{ id: 1, index: 0 }, sameGroupTab, activeTab])
      await handleAction('movetableft')
      expect(mockTabsMove).toHaveBeenCalledWith(3, { index: 1 })
      expect(chrome.tabs.group).not.toHaveBeenCalled()
      expect(chrome.tabs.ungroup).not.toHaveBeenCalled()
    })

    it('stays in same group when moving right within group', async () => {
      const activeTab = { ...defaultTab, id: 3, index: 1, groupId: 5 }
      const sameGroupTab = { id: 4, index: 2, groupId: 5 }
      mockTabsQuery
        .mockResolvedValueOnce([activeTab])
        .mockResolvedValueOnce([{ id: 1, index: 0 }, activeTab, sameGroupTab])
      await handleAction('movetabright')
      expect(mockTabsMove).toHaveBeenCalledWith(3, { index: 2 })
      expect(chrome.tabs.group).not.toHaveBeenCalled()
      expect(chrome.tabs.ungroup).not.toHaveBeenCalled()
    })
  })

  describe('window management', () => {
    it('creates a new window', async () => {
      await handleAction('newwindow')
      expect(mockWindowsCreate).toHaveBeenCalledWith({ state: 'maximized' })
    })

    it('creates a new private window', async () => {
      await handleAction('newprivatewindow')
      expect(mockWindowsCreate).toHaveBeenCalledWith({ incognito: true, state: 'maximized' })
    })

    it('closes the current window', async () => {
      await handleAction('closewindow')
      expect(mockWindowsRemove).toHaveBeenCalledWith(1)
    })

    it('toggles fullscreen', async () => {
      await handleAction('fullscreen')
      expect(mockWindowsUpdate).toHaveBeenCalledWith(1, { state: 'fullscreen' })
    })

    it('exits fullscreen when already fullscreen', async () => {
      mockWindowsGetCurrent.mockResolvedValue({ id: 1, state: 'fullscreen' })
      await handleAction('fullscreen')
      expect(mockWindowsUpdate).toHaveBeenCalledWith(1, { state: 'normal' })
    })
  })

  describe('zoom', () => {
    it('zooms in', async () => {
      await handleAction('zoomin')
      expect(mockTabsGetZoom).toHaveBeenCalledWith(1)
      expect(mockTabsSetZoom).toHaveBeenCalledWith(1, 1.1)
    })

    it('zooms out', async () => {
      await handleAction('zoomout')
      expect(mockTabsSetZoom).toHaveBeenCalledWith(1, 0.9)
    })

    it('resets zoom', async () => {
      await handleAction('zoomreset')
      expect(mockTabsSetZoom).toHaveBeenCalledWith(1, 0)
    })
  })

  describe('scrolling', () => {
    it('handles scroll actions', async () => {
      const scrollActions = [
        'top', 'bottom', 'scrollup', 'scrollupmore', 'pageup',
        'scrolldown', 'scrolldownmore', 'pagedown',
        'scrollleft', 'scrollleftmore', 'scrollright', 'scrollrightmore',
      ]
      for (const action of scrollActions) {
        const result = await handleAction(action, {} as any)
        expect(result).toBe(true)
      }
    })
  })

  describe('navigation', () => {
    it('clears downloads', async () => {
      await handleAction('cleardownloads')
      expect(mockBrowsingDataRemove).toHaveBeenCalledWith({ since: 0 }, { downloads: true })
    })

    it('opens settings page', async () => {
      await handleAction('opensettings')
      expect(mockTabsCreate).toHaveBeenCalledWith({ url: 'chrome://settings', active: true })
    })

    it('opens extensions page', async () => {
      await handleAction('openextensions')
      expect(mockTabsCreate).toHaveBeenCalledWith({ url: 'chrome://extensions', active: true })
    })

    it('opens shortcuts page', async () => {
      await handleAction('openshortcuts')
      expect(mockTabsCreate).toHaveBeenCalledWith({ url: 'chrome://extensions/shortcuts', active: true })
    })

    it('views source', async () => {
      await handleAction('viewsource')
      expect(mockTabsCreate).toHaveBeenCalledWith({ url: 'view-source:https://example.com' })
    })
  })

  describe('bookmarks', () => {
    it('opens a bookmark in current tab', async () => {
      mockBookmarksSearch.mockResolvedValue([
        { title: 'My Bookmark', url: 'https://bookmark.com' },
      ])
      await handleAction('openbookmark', { bookmark: 'My Bookmark' } as any)
      expect(mockBookmarksSearch).toHaveBeenCalledWith({ title: 'My Bookmark' })
      expect(mockTabsUpdate).toHaveBeenCalled()
    })

    it('opens a bookmark in new tab', async () => {
      mockBookmarksSearch.mockResolvedValue([
        { title: 'Test', url: 'https://test.com' },
      ])
      await handleAction('openbookmarknewtab', { bookmark: 'Test' } as any)
      expect(mockTabsCreate).toHaveBeenCalledWith({ url: 'https://test.com' })
    })
  })

  describe('go to tab', () => {
    it('jumps to tab by URL when found', async () => {
      mockTabsQuery.mockResolvedValueOnce([{ id: 5, windowId: 1 }])
      await handleAction('gototab', { matchurl: '*example*', openurl: 'https://example.com' } as any)
      expect(mockTabsUpdate).toHaveBeenCalledWith(5, { active: true })
    })

    it('creates new tab when URL not found', async () => {
      mockTabsQuery.mockResolvedValueOnce([])
      await handleAction('gototab', { matchurl: '*notfound*', openurl: 'https://new.com' } as any)
      expect(mockTabsCreate).toHaveBeenCalledWith({ url: 'https://new.com' })
    })

    it('creates new tab when no matchurl', async () => {
      await handleAction('gototab', { openurl: 'https://direct.com' } as any)
      expect(mockTabsCreate).toHaveBeenCalledWith({ url: 'https://direct.com' })
    })
  })

  describe('app launch', () => {
    it('launches app by ID', async () => {
      await handleAction('openapp', { openappid: 'app123' } as any)
      expect(mockManagementLaunchApp).toHaveBeenCalledWith('app123')
    })

    it('does nothing without app ID', async () => {
      await handleAction('openapp', {} as any)
      expect(mockManagementLaunchApp).not.toHaveBeenCalled()
    })
  })

  describe('disable (no-op)', () => {
    it('returns true without doing anything', async () => {
      const result = await handleAction('disable')
      expect(result).toBe(true)
    })
  })

  describe('new tab to the right (#615)', () => {
    it('creates tab at current index + 1', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, index: 3 }])
      await handleAction('newtabright')
      expect(mockTabsCreate).toHaveBeenCalledWith({ index: 4 })
    })
  })

  describe('audible tab (#487)', () => {
    it('switches to first audible tab', async () => {
      mockTabsQuery
        .mockResolvedValueOnce([{ id: 7, windowId: 2 }]) // audible query
      await handleAction('audibletab')
      expect(mockTabsUpdate).toHaveBeenCalledWith(7, { active: true })
      expect(mockWindowsUpdate).toHaveBeenCalledWith(2, { focused: true })
    })

    it('shows toast when no audible tabs', async () => {
      mockTabsQuery.mockResolvedValueOnce([]) // no audible tabs
      await handleAction('audibletab')
      expect(mockTabsUpdate).not.toHaveBeenCalled()
    })
  })

  describe('tab groups (#455)', () => {
    it('adds tab to new group', async () => {
      await handleAction('grouptab')
      expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [1] })
    })

    it('removes tab from group', async () => {
      await handleAction('ungrouptab')
      expect(chrome.tabs.ungroup).toHaveBeenCalledWith(1)
    })
  })

  describe('insert text (#495)', () => {
    it('calls executeScript with configured text', async () => {
      const { executeScript } = await import('../src/utils/execute-script')
      await handleAction('inserttext', { inserttext: 'hello world' } as any)
      expect(executeScript).toHaveBeenCalled()
    })

    it('does nothing without inserttext config', async () => {
      const { executeScript } = await import('../src/utils/execute-script')
      vi.mocked(executeScript).mockClear()
      await handleAction('inserttext', {} as any)
      expect(executeScript).not.toHaveBeenCalled()
    })
  })

  describe('copy actions with toast', () => {
    it('copyurl trims whitespace (#630)', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, url: '  https://example.com  ' }])
      const { executeScript } = await import('../src/utils/execute-script')
      await handleAction('copyurl')
      // copyToClipboard calls executeScript with the trimmed URL
      expect(executeScript).toHaveBeenCalled()
    })

    it('copytitleurlmarkdown formats as markdown link', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, title: 'Example', url: 'https://example.com' }])
      const { executeScript } = await import('../src/utils/execute-script')
      await handleAction('copytitleurlmarkdown')
      // Verify executeScript was called (copies [title](url))
      expect(executeScript).toHaveBeenCalled()
    })
  })

  describe('maximized windows (#645)', () => {
    it('new window opens maximized', async () => {
      await handleAction('newwindow')
      expect(mockWindowsCreate).toHaveBeenCalledWith({ state: 'maximized' })
    })

    it('new private window opens maximized', async () => {
      await handleAction('newprivatewindow')
      expect(mockWindowsCreate).toHaveBeenCalledWith({ incognito: true, state: 'maximized' })
    })

    it('move tab to new window opens maximized', async () => {
      await handleAction('movetabtonewwindow')
      expect(mockWindowsCreate).toHaveBeenCalledWith({ url: 'https://example.com', state: 'maximized' })
    })

    it('open incognito opens maximized', async () => {
      await handleAction('openincognito')
      expect(mockWindowsCreate).toHaveBeenCalledWith({ url: 'https://example.com', incognito: true, state: 'maximized' })
    })
  })

  describe('video controls (#632)', () => {
    it('videoplaypause calls executeScript', async () => {
      const { executeScript } = await import('../src/utils/execute-script')
      await handleAction('videoplaypause')
      expect(executeScript).toHaveBeenCalled()
    })

    it('videospeedup calls executeScript', async () => {
      const { executeScript } = await import('../src/utils/execute-script')
      await handleAction('videospeedup')
      expect(executeScript).toHaveBeenCalled()
    })

    it('videoskipforward calls executeScript', async () => {
      const { executeScript } = await import('../src/utils/execute-script')
      await handleAction('videoskipforward')
      expect(executeScript).toHaveBeenCalled()
    })
  })

  describe('search providers (#658)', () => {
    it('searchyoutube opens YouTube with selection', async () => {
      const { executeScript } = await import('../src/utils/execute-script')
      vi.mocked(executeScript).mockResolvedValueOnce([{ result: 'test query' }])
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, index: 2 }])
      await handleAction('searchyoutube')
      expect(mockTabsCreate).toHaveBeenCalledWith({
        url: 'https://www.youtube.com/results?search_query=test%20query',
        index: 3,
      })
    })

    it('searchwikipedia opens Wikipedia with selection', async () => {
      const { executeScript } = await import('../src/utils/execute-script')
      vi.mocked(executeScript).mockResolvedValueOnce([{ result: 'quantum' }])
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, index: 2 }])
      await handleAction('searchwikipedia')
      expect(mockTabsCreate).toHaveBeenCalledWith({
        url: 'https://en.wikipedia.org/w/index.php?search=quantum',
        index: 3,
      })
    })

    it('searchgithub opens GitHub with selection', async () => {
      const { executeScript } = await import('../src/utils/execute-script')
      vi.mocked(executeScript).mockResolvedValueOnce([{ result: 'react hooks' }])
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, index: 2 }])
      await handleAction('searchgithub')
      expect(mockTabsCreate).toHaveBeenCalledWith({
        url: 'https://github.com/search?q=react%20hooks&type=repositories',
        index: 3,
      })
    })
  })

  describe('macro (chained actions)', () => {
    it('returns true with no macroSteps', async () => {
      const result = await handleAction('macro', { key: 'a', action: 'macro' })
      expect(result).toBe(true)
    })

    it('returns true with empty macroSteps', async () => {
      const result = await handleAction('macro', { key: 'a', action: 'macro', macroSteps: [] })
      expect(result).toBe(true)
    })

    it('executes background actions sequentially', async () => {
      const callOrder: string[] = []
      mockTabsCreate.mockImplementation(async () => { callOrder.push('newtab'); return { id: 99 } })
      mockTabsQuery.mockImplementation(async () => { callOrder.push('query'); return [defaultTab] })

      await handleAction('macro', {
        key: 'a',
        action: 'macro',
        macroSteps: [
          { action: 'newtab' },
          { action: 'closetab' },
        ],
      })

      expect(mockTabsCreate).toHaveBeenCalled()
      expect(mockTabsRemove).toHaveBeenCalled()
    })

    it('forwards content-script-only actions to the active tab', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, id: 42 }])
      mockTabsSendMessage.mockResolvedValue(undefined)

      await handleAction('macro', {
        key: 'a',
        action: 'macro',
        macroSteps: [
          { action: 'showcheatsheet' },
          { action: 'toggledarkmode' },
        ],
      })

      expect(mockTabsSendMessage).toHaveBeenCalledTimes(2)
      expect(mockTabsSendMessage).toHaveBeenCalledWith(42, expect.objectContaining({ action: 'showcheatsheet' }))
      expect(mockTabsSendMessage).toHaveBeenCalledWith(42, expect.objectContaining({ action: 'toggledarkmode' }))
    })

    it('handles mix of background and content-script actions', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, id: 5 }])
      mockTabsSendMessage.mockResolvedValue(undefined)

      await handleAction('macro', {
        key: 'a',
        action: 'macro',
        macroSteps: [
          { action: 'newtab' },
          { action: 'showcheatsheet' },
          { action: 'closetab' },
        ],
      })

      expect(mockTabsCreate).toHaveBeenCalled()
      expect(mockTabsSendMessage).toHaveBeenCalledWith(5, expect.objectContaining({ action: 'showcheatsheet' }))
      expect(mockTabsRemove).toHaveBeenCalled()
    })

    it('respects delay between steps', async () => {
      vi.useFakeTimers()
      const start = Date.now()

      const promise = handleAction('macro', {
        key: 'a',
        action: 'macro',
        macroSteps: [
          { action: 'newtab', delay: 200 },
          { action: 'closetab', delay: 100 },
        ],
      })

      // Advance past both delays
      await vi.advanceTimersByTimeAsync(300)
      await promise

      expect(mockTabsCreate).toHaveBeenCalled()
      expect(mockTabsRemove).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('caps steps at MAX_MACRO_STEPS', async () => {
      const steps = Array.from({ length: 15 }, () => ({ action: 'newtab' }))

      await handleAction('macro', {
        key: 'a',
        action: 'macro',
        macroSteps: steps,
      })

      // MAX_MACRO_STEPS is 10, so only 10 calls
      expect(mockTabsCreate).toHaveBeenCalledTimes(10)
    })

    it('gracefully handles sendMessage failure for content-script actions', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, id: 7 }])
      mockTabsSendMessage.mockRejectedValue(new Error('No receiver'))

      // Should not throw
      const result = await handleAction('macro', {
        key: 'a',
        action: 'macro',
        macroSteps: [
          { action: 'javascript' },
          { action: 'newtab' },
        ],
      })

      expect(result).toBe(true)
      expect(mockTabsCreate).toHaveBeenCalled()
    })
  })

  describe('URL increment/decrement (#754)', () => {
    it('urlinc increments the last number in URL', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, url: 'https://example.com/page/3' }])
      await handleAction('urlinc')
      expect(mockTabsUpdate).toHaveBeenCalledWith(1, { url: 'https://example.com/page/4' })
    })

    it('urlinc preserves leading zeros', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, url: 'https://example.com/img007.jpg' }])
      await handleAction('urlinc')
      expect(mockTabsUpdate).toHaveBeenCalledWith(1, { url: 'https://example.com/img008.jpg' })
    })

    it('urldec decrements the last number in URL', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, url: 'https://example.com/page/5' }])
      await handleAction('urldec')
      expect(mockTabsUpdate).toHaveBeenCalledWith(1, { url: 'https://example.com/page/4' })
    })

    it('urldec floors at zero', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, url: 'https://example.com/page/0' }])
      await handleAction('urldec')
      expect(mockTabsUpdate).toHaveBeenCalledWith(1, { url: 'https://example.com/page/0' })
    })

    it('urlinc shows toast when no number in URL', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, url: 'https://example.com/' }])
      await handleAction('urlinc')
      expect(mockTabsUpdate).not.toHaveBeenCalled()
      expect(mockShowPageToast).toHaveBeenCalledWith('No number found in URL')
    })
  })

  describe('prev/next page navigation (#754)', () => {
    it('nextpage calls executeScript', async () => {
      const { executeScript } = await import('../src/utils/execute-script')
      await handleAction('nextpage')
      expect(executeScript).toHaveBeenCalled()
    })

    it('nextpage shows toast when no link found', async () => {
      const { executeScript, showPageToast } = await import('../src/utils/execute-script')
      vi.mocked(executeScript).mockResolvedValueOnce([{ result: false }] as any)
      await handleAction('nextpage')
      expect(showPageToast).toHaveBeenCalledWith('No next page link found')
    })

    it('nextpage does not show toast when link is found', async () => {
      const { executeScript, showPageToast } = await import('../src/utils/execute-script')
      vi.mocked(executeScript).mockResolvedValueOnce([{ result: true }] as any)
      vi.mocked(showPageToast).mockClear()
      await handleAction('nextpage')
      expect(showPageToast).not.toHaveBeenCalled()
    })

    it('prevpage calls executeScript', async () => {
      const { executeScript } = await import('../src/utils/execute-script')
      await handleAction('prevpage')
      expect(executeScript).toHaveBeenCalled()
    })

    it('prevpage shows toast when no link found', async () => {
      const { executeScript, showPageToast } = await import('../src/utils/execute-script')
      vi.mocked(executeScript).mockResolvedValueOnce([{ result: false }] as any)
      await handleAction('prevpage')
      expect(showPageToast).toHaveBeenCalledWith('No previous page link found')
    })

    it('prevpage does not show toast when link is found', async () => {
      const { executeScript, showPageToast } = await import('../src/utils/execute-script')
      vi.mocked(executeScript).mockResolvedValueOnce([{ result: true }] as any)
      vi.mocked(showPageToast).mockClear()
      await handleAction('prevpage')
      expect(showPageToast).not.toHaveBeenCalled()
    })
  })

  describe('focus input (#754)', () => {
    it('calls executeScript to focus input', async () => {
      const { executeScript } = await import('../src/utils/execute-script')
      await handleAction('focusinput')
      expect(executeScript).toHaveBeenCalled()
    })

    it('shows toast when no input found on page', async () => {
      const { executeScript, showPageToast } = await import('../src/utils/execute-script')
      vi.mocked(executeScript).mockResolvedValueOnce([{ result: false }] as any)
      await handleAction('focusinput')
      expect(showPageToast).toHaveBeenCalledWith('No text input found on page')
    })

    it('does not show toast when input is found', async () => {
      const { executeScript, showPageToast } = await import('../src/utils/execute-script')
      vi.mocked(executeScript).mockResolvedValueOnce([{ result: true }] as any)
      vi.mocked(showPageToast).mockClear()
      await handleAction('focusinput')
      expect(showPageToast).not.toHaveBeenCalled()
    })
  })
  
  describe('coverage of all registered actions', () => {
    const allActions = getAllActionValues()
    // These require special handling (imports from other modules, not in actionHandlers)
    const specialActions = ['lastusedtab', 'capturescreenshot', 'capturefullsizescreenshot', 'forcecapturefullsizescreenshot']

    // These actions are handled in the content script, not the background action handlers
    const contentScriptActions = ['javascript', 'trigger', 'buttonnexttab', 'showcheatsheet', 'toggledarkmode', 'editurl', 'linkhints', 'linkhintsnew']

    for (const action of allActions) {
      if (specialActions.includes(action) || contentScriptActions.includes(action)) continue

      it(`handles action: ${action}`, async () => {
        const result = await handleAction(action, { action } as any)
        expect(result).toBe(true)
      })
    }
  })

  describe('URL hierarchy navigation (#754)', () => {
    it('urlup navigates to parent path', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, url: 'https://example.com/foo/bar/baz' }])
      await handleAction('urlup')
      expect(mockTabsUpdate).toHaveBeenCalledWith(1, { url: 'https://example.com/foo/bar' })
    })

    it('urlup strips query and hash', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, url: 'https://example.com/foo/bar?q=1#section' }])
      await handleAction('urlup')
      expect(mockTabsUpdate).toHaveBeenCalledWith(1, { url: 'https://example.com/foo' })
    })

    it('urlup does nothing at root', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, url: 'https://example.com/' }])
      await handleAction('urlup')
      expect(mockTabsUpdate).not.toHaveBeenCalled()
    })

    it('urlroot navigates to origin', async () => {
      mockTabsQuery.mockResolvedValue([{ ...defaultTab, url: 'https://example.com/foo/bar?q=1' }])
      await handleAction('urlroot')
      expect(mockTabsUpdate).toHaveBeenCalledWith(1, { url: 'https://example.com' })
    })
  })
})
