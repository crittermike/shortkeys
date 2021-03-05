/// <reference path='../browser.d.ts' />
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
 * Switch window will not trigger 'onActivated' event.
 * So we have to manually save current window's current tab.
 */
browser.windows.onFocusChanged.addListener(async function (windowId) {
  // -1 means focused a devtools debug window, just ignore it.
  if (windowId === -1) return

  const [{ id }] = await browser.tabs.query({windowId, active: true})
  usedTabInfoQueue = [usedTabInfoQueue[1], {windowId, tabId: id}]
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
    /**
     * Call windows.update will trigger 'onFocusChanged' event.
     * Then the listener above will manage usedTabInfoQueue.
     */
    await browser.windows.update(lastTab.windowId, {focused: true})
  } else {
    /**
     * Call tabs.update will trigger 'onActivated' event.
     * Then the listener above will manage usedTabInfoQueue.
     */
    await browser.tabs.update(lastTab.tabId, {active: true})
  }
}

export default switchToLastUsedTab