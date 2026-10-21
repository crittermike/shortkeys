/**
 * Execute JavaScript code on a target tab using Chrome DevTools Protocol.
 * This bypasses page CSP entirely since Runtime.evaluate is injected by the browser.
 * Firefox uses its native userScripts API for explicitly installed scripts.
 *
 * Returns { success: true, hostname } on success, or { success: false, error } on failure.
 */
import { executeFirefoxUserScript } from './firefox-user-scripts'
import type { KeySetting } from './url-matching'

export async function executeJavascriptOnTab(
  tabId: number,
  code: string,
  shortcut?: KeySetting,
): Promise<{ success: true; hostname: string } | { success: false; error: string }> {
  try {
    const tabInfo = await chrome.tabs.get(tabId)
    await chrome.tabs.update(tabId, { active: true })
    if (tabInfo.windowId) {
      await chrome.windows.update(tabInfo.windowId, { focused: true })
    }

    const hostname = tabInfo.url ? new URL(tabInfo.url).hostname : 'tab'

    if (import.meta.env.BROWSER === 'firefox') {
      if (!shortcut) throw new Error('Select an installed user script to test.')
      await executeFirefoxUserScript(tabId, shortcut)
      return { success: true, hostname }
    }

    // Chrome: use DevTools Protocol (bypasses CSP)
    if (chrome.debugger) {
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
        return { success: true, hostname }
      } finally {
        await chrome.debugger.detach({ tabId })
      }
    }

    // Fallback for Chromium builds without the debugger API.
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (code: string) => { new Function(code)() },
      args: [code],
    })
    return { success: true, hostname }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
