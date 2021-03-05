/**
 * This queue stores two tabs - last tab and current tab.
 * @type {chrome.tabs.TabActiveInfo[]}
 */
let usedTabInfoQueue = [undefined, undefined]

/**
 * Manage usedTabInfoQueue.
 */
browser.tabs.onActivated.addListener(function (currentTab) {
  usedTabInfoQueue = [usedTabInfoQueue[1], currentTab]
})

/**
 * When close last tab, unset usedTabInfoQueue[0] 
 * When close current tab, unset usedTabInfoQueue[1] 
 * When close other tab, do nothing
 * When close window, unset usedTabInfoQueue[0] and usedTabInfoQueue[1]
 */
browser.tabs.onRemoved.addListener(function (tabId) {
  // Do not use Array.prototype.filter, it will break queue.
  // Use Array.prototype.map to keep tab queued in right place.
  usedTabInfoQueue = usedTabInfoQueue.map(function (tab) {
    if (tab && tab.tabId === tabId) {
      return undefined
    }
    return tab
  })
})

async function switchToLastUsedTab() {
  const [lastTab, currentTab] = usedTabInfoQueue
  if (!lastTab) return

  if (lastTab.windowId !== currentTab.windowId) {
    await browser.windows.update(lastTab.windowId, {focused: true})
    /**
     * Switch window is no need to update tab.
     * Update queue manually.
     */
    usedTabInfoQueue = [currentTab, lastTab]
  } else {
    /**
     * Call Update will trigger 'onActivated' event.
     * Then the listener above will manage usedTabInfoQueue.
     */
    await browser.tabs.update(lastTab.tabId, {active: true})
  }
}

export default switchToLastUsedTab