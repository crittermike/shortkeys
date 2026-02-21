/** Execute a script in the active tab. */
export async function executeScript<T>(callback: (...args: any[]) => T, args?: any[]): Promise<any> {
  const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
  if (!tab?.id) {
    throw new Error('No active tab found')
  }
  return browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: callback,
    args,
  })
}
