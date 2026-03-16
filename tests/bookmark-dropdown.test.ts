import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

vi.mock('@/utils/storage', () => ({
  saveKeys: vi.fn().mockResolvedValue('sync'),
  loadKeys: vi.fn().mockResolvedValue(null),
}))

// Mock chrome.bookmarks.getTree to return test bookmarks
const mockGetTree = vi.fn()
const mockTabsQuery = vi.fn().mockResolvedValue([])

const originalChrome = globalThis.chrome
const originalBrowser = globalThis.browser

// @ts-ignore
globalThis.chrome = {
  ...(originalChrome ?? {}),
  bookmarks: { ...(originalChrome?.bookmarks ?? {}), getTree: mockGetTree },
  tabs: { ...(originalChrome?.tabs ?? {}), query: mockTabsQuery },
}

// @ts-ignore
globalThis.browser = {
  ...(originalBrowser ?? {}),
  runtime: { ...(originalBrowser?.runtime ?? {}), sendMessage: vi.fn() },
}

afterAll(() => {
  globalThis.chrome = originalChrome
  globalThis.browser = originalBrowser
})

import { useJsTools } from '../src/composables/useJsTools'

const MOCK_BOOKMARK_TREE = [{
  children: [
    { title: 'GitHub', url: 'https://github.com' },
    { title: 'Work', children: [
      { title: 'Jira', url: 'https://jira.example.com' },
      { title: 'Subfolder', children: [
        { title: 'Deep Link', url: 'https://deep.example.com' },
      ]},
    ]},
    { title: 'Empty Folder', children: [] },
  ],
}]

describe('bookmark dropdown (#816)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset shared bookmark state between tests
    const { bookmarks } = useJsTools()
    bookmarks.value = []
  })

  it('loadBookmarks populates the shared bookmarks list', async () => {
    mockGetTree.mockImplementation((cb: Function) => cb(MOCK_BOOKMARK_TREE))
    const { loadBookmarks, bookmarks } = useJsTools()
    await loadBookmarks()

    expect(bookmarks.value).toHaveLength(3)
    expect(bookmarks.value.map(b => b.title)).toEqual(['GitHub', 'Jira', 'Deep Link'])
    expect(bookmarks.value.map(b => b.url)).toEqual([
      'https://github.com',
      'https://jira.example.com',
      'https://deep.example.com',
    ])
  })

  it('bookmarks loaded once are visible from any useJsTools() call', async () => {
    mockGetTree.mockImplementation((cb: Function) => cb(MOCK_BOOKMARK_TREE))

    // First call loads bookmarks (simulates App.vue onMounted)
    const loader = useJsTools()
    await loader.loadBookmarks()

    // Second call reads them (simulates ShortcutDetails.vue rendering the dropdown)
    const reader = useJsTools()
    expect(reader.bookmarks.value).toHaveLength(3)
    expect(reader.bookmarks.value[0].title).toBe('GitHub')
  })

  it('bookmark options for SearchSelect are correctly shaped', async () => {
    mockGetTree.mockImplementation((cb: Function) => cb(MOCK_BOOKMARK_TREE))
    const { loadBookmarks, bookmarks } = useJsTools()
    await loadBookmarks()

    // This mirrors the exact expression in ShortcutDetails.vue line 91:
    // bookmarks.map(bm => ({ value: bm.title, label: bm.title || bm.url, sublabel: bm.url }))
    const options = bookmarks.value.map(bm => ({
      value: bm.title,
      label: bm.title || bm.url,
      sublabel: bm.url,
    }))

    expect(options).toHaveLength(3)
    expect(options[0]).toEqual({ value: 'GitHub', label: 'GitHub', sublabel: 'https://github.com' })
    expect(options[1]).toEqual({ value: 'Jira', label: 'Jira', sublabel: 'https://jira.example.com' })
  })

  it('all useJsTools() calls return the same refs (singleton guard)', () => {
    const a = useJsTools()
    const b = useJsTools()
    expect(a.bookmarks).toBe(b.bookmarks)
    expect(a.openTabs).toBe(b.openTabs)
    expect(a.selectedTabId).toBe(b.selectedTabId)
  })

  it('handles empty bookmark tree gracefully', async () => {
    mockGetTree.mockImplementation((cb: Function) => cb([{ children: [] }]))
    const { loadBookmarks, bookmarks } = useJsTools()
    await loadBookmarks()
    expect(bookmarks.value).toHaveLength(0)
  })
})
