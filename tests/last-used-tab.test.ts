import { describe, it, expect, vi, beforeEach } from 'vitest'

const query = vi.fn()
const updateTab = vi.fn()
const updateWindow = vi.fn()
let activate: (tab: { windowId: number; tabId: number }) => void
let focus: (windowId: number) => Promise<void>
let remove: (tabId: number) => void
let switchToLastUsedTab: () => Promise<void>

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  query.mockResolvedValue([])
  vi.stubGlobal('browser', {
    tabs: {
      onActivated: { addListener: vi.fn(fn => { activate = fn }) },
      onRemoved: { addListener: vi.fn(fn => { remove = fn }) },
      query, update: updateTab,
    },
    windows: {
      onFocusChanged: { addListener: vi.fn(fn => { focus = fn }) },
      update: updateWindow,
    },
  })
  const module = await import('../src/actions/last-used-tab')
  module.initLastUsedTabTracking()
  switchToLastUsedTab = module.switchToLastUsedTab
})

describe('last-used-tab listeners', () => {
  it('registers all tracking listeners', () => {
    expect(browser.tabs.onActivated.addListener).toHaveBeenCalledOnce()
    expect(browser.tabs.onRemoved.addListener).toHaveBeenCalledOnce()
    expect(browser.windows.onFocusChanged.addListener).toHaveBeenCalledOnce()
  })

  it('switches back and forth using real activation events', async () => {
    activate({ windowId: 1, tabId: 100 })
    activate({ windowId: 1, tabId: 200 })
    await switchToLastUsedTab()
    expect(updateTab).toHaveBeenLastCalledWith(100, { active: true })
    activate({ windowId: 1, tabId: 100 })
    await switchToLastUsedTab()
    expect(updateTab).toHaveBeenLastCalledWith(200, { active: true })
  })

  it('preserves the previous tab after deactivation and reactivation (#977)', async () => {
    activate({ windowId: 1, tabId: 100 })
    activate({ windowId: 1, tabId: 200 })
    await focus(-1)
    expect(query).not.toHaveBeenCalled()
    query.mockResolvedValue([{ id: 200 }])
    await focus(1)
    activate({ windowId: 1, tabId: 200 })
    await focus(1)
    await switchToLastUsedTab()
    expect(query).toHaveBeenCalledWith({ windowId: 1, active: true })
    expect(updateTab).toHaveBeenCalledWith(100, { active: true })
    expect(updateWindow).not.toHaveBeenCalled()
  })

  it('focuses the previous window', async () => {
    activate({ windowId: 1, tabId: 100 })
    query.mockResolvedValue([{ id: 200 }])
    await focus(2)
    await switchToLastUsedTab()
    expect(updateWindow).toHaveBeenCalledWith(1, { focused: true })
    expect(updateTab).not.toHaveBeenCalled()
  })

  it.each([100, 200])('does not switch after tracked tab %s is removed', async tabId => {
    activate({ windowId: 1, tabId: 100 })
    activate({ windowId: 1, tabId: 200 })
    remove(tabId)
    await switchToLastUsedTab()
    expect(updateTab).not.toHaveBeenCalled()
    expect(updateWindow).not.toHaveBeenCalled()
  })

  it('does nothing without a previous tab', async () => {
    await switchToLastUsedTab()
    activate({ windowId: 1, tabId: 100 })
    await switchToLastUsedTab()
    expect(updateTab).not.toHaveBeenCalled()
  })

  it('ignores focus events with no active tab', async () => {
    activate({ windowId: 1, tabId: 100 })
    activate({ windowId: 1, tabId: 200 })
    await focus(2)
    await switchToLastUsedTab()
    expect(updateTab).toHaveBeenCalledWith(100, { active: true })
  })

  it('ignores stale focus query results after a newer activation', async () => {
    activate({ windowId: 1, tabId: 100 })
    let resolve!: (tabs: { id: number }[]) => void
    query.mockReturnValueOnce(new Promise(r => { resolve = r }))
    const pending = focus(2)
    activate({ windowId: 3, tabId: 300 })
    resolve([{ id: 200 }])
    await pending
    await switchToLastUsedTab()
    expect(updateWindow).toHaveBeenCalledWith(1, { focused: true })
  })

  it('ignores out-of-order focus results', async () => {
    activate({ windowId: 1, tabId: 100 })
    let resolve!: (tabs: { id: number }[]) => void
    query.mockReturnValueOnce(new Promise(r => { resolve = r }))
    const pending = focus(2)
    query.mockResolvedValueOnce([{ id: 300 }])
    await focus(3)
    resolve([{ id: 200 }])
    await pending
    await switchToLastUsedTab()
    expect(updateWindow).toHaveBeenCalledWith(1, { focused: true })
  })
})
