export const IS_FIREFOX = import.meta.env.BROWSER === 'firefox'

export const FIREFOX_DATA_TYPES = ['browsingActivity', 'websiteContent', 'searchTerms', 'bookmarksInfo', 'technicalAndInteraction'] as const
type FirefoxDataType = typeof FIREFOX_DATA_TYPES[number]

export function getActionDataTypes(action: string): FirefoxDataType[] {
  if (action === 'script-qr-code') return ['browsingActivity']
  if (['searchgoogle', 'searchyoutube', 'searchwikipedia', 'searchgithub'].includes(action)) {
    return ['websiteContent', 'searchTerms']
  }
  return []
}

export async function hasFirefoxDataConsent(types: readonly FirefoxDataType[]): Promise<boolean> {
  if (!IS_FIREFOX || types.length === 0) return true
  const permissions = await browser.permissions.getAll()
  if (!('data_collection' in permissions) || !Array.isArray(permissions.data_collection)) return false
  const granted = permissions.data_collection
  return types.every(type => granted.includes(type))
}

export function requestFirefoxDataConsent(): Promise<boolean> {
  if (!IS_FIREFOX) return Promise.resolve(true)
  // WXT's cross-browser types do not yet include Firefox's data permissions.
  const permissions: Parameters<typeof browser.permissions.request>[0] & { data_collection: string[] } = {
    data_collection: [...FIREFOX_DATA_TYPES],
  }
  return browser.permissions.request(permissions)
}

export function containsRemoteCode(shortcuts: readonly { action: string; code?: string; openurl?: string; macroSteps?: readonly { action: string; code?: string; openurl?: string }[] }[]): boolean {
  return shortcuts.some(shortcut =>
    shortcut.action === 'javascript'
    || Boolean(shortcut.code?.trim())
    || /^\s*javascript:/i.test(shortcut.openurl || '')
    || (shortcut.macroSteps ? containsRemoteCode(shortcut.macroSteps) : false),
  )
}
