interface TabInfo {
  windowId: number
  tabId: number
}

let usedTabInfoQueue: [TabInfo | undefined, TabInfo | undefined] = [undefined, undefined]
let focusRevision = 0

function trackTab(tab: TabInfo): void {
  const current = usedTabInfoQueue[1]
  if (current?.tabId === tab.tabId && current.windowId === tab.windowId) return
  usedTabInfoQueue = [current, tab]
}

/** Initialize tab tracking listeners. Call once from background script. */
export function initLastUsedTabTracking(): void {
  browser.tabs.onActivated.addListener((currentTab) => {
    focusRevision++
    trackTab({ windowId: currentTab.windowId, tabId: currentTab.tabId })
  })

  browser.windows.onFocusChanged.addListener(async (windowId) => {
    const revision = ++focusRevision
    if (windowId === -1) return
    const [tab] = await browser.tabs.query({ windowId, active: true })
    if (revision !== focusRevision || tab?.id === undefined) return
    trackTab({ windowId, tabId: tab.id })
  })

  browser.tabs.onRemoved.addListener((tabId) => {
    focusRevision++
    usedTabInfoQueue = usedTabInfoQueue.map((tab) =>
      tab && tab.tabId === tabId ? undefined : tab,
    ) as typeof usedTabInfoQueue
  })
}

/** Switch to the last used tab. */
export async function switchToLastUsedTab(): Promise<void> {
  const [lastTab, currentTab] = usedTabInfoQueue
  if (!lastTab || !currentTab) return

  if (lastTab.windowId !== currentTab.windowId) {
    await browser.windows.update(lastTab.windowId, { focused: true })
  } else {
    await browser.tabs.update(lastTab.tabId, { active: true })
  }
}
