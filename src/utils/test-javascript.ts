/**
 * Execute JavaScript code on a target tab using Chrome DevTools Protocol.
 * This bypasses page CSP entirely since Runtime.evaluate is injected by the browser.
 *
 * Returns { success: true, hostname } on success, or { success: false, error } on failure.
 */
export async function executeJavascriptOnTab(
  tabId: number,
  code: string,
): Promise<{ success: true; hostname: string } | { success: false; error: string }> {
  try {
    const tabInfo = await chrome.tabs.get(tabId)
    await chrome.tabs.update(tabId, { active: true })
    if (tabInfo.windowId) {
      await chrome.windows.update(tabInfo.windowId, { focused: true })
    }

    await chrome.debugger.attach({ tabId }, '1.3')
    try {
      const result: any = await chrome.debugger.sendCommand(
        { tabId },
        'Runtime.evaluate',
        { expression: code, userGesture: true, awaitPromise: true },
      )
      if (result?.exceptionDetails) {
        const desc = result.exceptionDetails.exception?.description || result.exceptionDetails.text
        return { success: false, error: desc }
      }
      const hostname = tabInfo.url ? new URL(tabInfo.url).hostname : 'tab'
      return { success: true, hostname }
    } finally {
      await chrome.debugger.detach({ tabId })
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
