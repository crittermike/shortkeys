/**
 * This variable stores two tabs - last tab and current tab.
 * @type {chrome.tabs.TabActiveInfo[]}
 */
let usedTabInfoQueue = [undefined, undefined]

/**
 * Save used tabs history.
 */
browser.tabs.onActivated.addListener(function (currentTab) {
    usedTabInfoQueue = [usedTabInfoQueue[1], currentTab]
})

/**
 * When close last tab, will unset usedTabInfoQueue[0] 
 * When close current tab, will unset usedTabInfoQueue[1] 
 * When close other tab, will do nothing
 * When close window, will unset usedTabInfoQueue[0] and usedTabInfoQueue[1]
 */
browser.tabs.onRemoved.addListener(function (tabId) {
    // Do not use Array.prototype.filter, it will break queue.
    // Use Array.prototype.map to keep tab queued in right place.
    usedTabInfoQueue = usedTabInfoQueue.map(tab => {
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
    }
    await browser.tabs.update(lastTab.tabId, {active: true})
    /**
     * Call update function will not trigger 'onActivated' event.
     * So we have to update queue manually.
     */
    usedTabInfoQueue = [currentTab, lastTab]
}

export default switchToLastUsedTab