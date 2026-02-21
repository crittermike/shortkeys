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

/** Show a brief toast notification in the active tab. */
export async function showPageToast(message: string): Promise<void> {
  try {
    await executeScript((msg: string) => {
      const existing = document.getElementById('__shortkeys-toast')
      if (existing) existing.remove()
      const el = document.createElement('div')
      el.id = '__shortkeys-toast'
      el.textContent = msg
      Object.assign(el.style, {
        position: 'fixed', bottom: '24px', right: '24px', zIndex: '2147483647',
        padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        background: '#1e293b', color: '#f1f5f9', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        opacity: '0', transform: 'translateY(8px)', transition: 'all 0.2s ease',
        pointerEvents: 'none',
      })
      document.body.appendChild(el)
      requestAnimationFrame(() => {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      })
      setTimeout(() => {
        el.style.opacity = '0'
        el.style.transform = 'translateY(8px)'
        setTimeout(() => el.remove(), 200)
      }, 1800)
    }, [message])
  } catch {
    // Page may not allow script injection (chrome:// pages, etc.)
  }
}
