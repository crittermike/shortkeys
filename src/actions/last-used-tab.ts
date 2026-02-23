interface TabInfo {
  windowId: number
  tabId: number
}

let usedTabInfoQueue: [TabInfo | undefined, TabInfo | undefined] = [undefined, undefined]

/** Initialize tab tracking listeners. Call once from background script. */
export function initLastUsedTabTracking(): void {
  browser.tabs.onActivated.addListener((currentTab) => {
    usedTabInfoQueue = [usedTabInfoQueue[1], { windowId: currentTab.windowId!, tabId: currentTab.tabId }]
  })

  browser.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === -1) return
    const [tab] = await browser.tabs.query({ windowId, active: true })
    usedTabInfoQueue = [usedTabInfoQueue[1], { windowId, tabId: tab.id! }]
  })

  browser.tabs.onRemoved.addListener((tabId) => {
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
