type ExtensionManagementUrlOptions = {
  userAgent?: string
  extensionId?: string
}

function getChromeApi() {
  return (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome
}

function getBrowserScheme(userAgent: string): 'chrome' | 'edge' | 'opera' {
  if (userAgent.includes('Edg/')) return 'edge'
  if (userAgent.includes('OPR/')) return 'opera'
  return 'chrome'
}

export function getExtensionManagementUrl(options: ExtensionManagementUrlOptions = {}): string {
  const userAgent = options.userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent || '')
  if (userAgent.includes('Firefox')) return 'about:addons'

  const extensionId = options.extensionId ?? getChromeApi()?.runtime?.id
  const baseUrl = `${getBrowserScheme(userAgent)}://extensions`
  return extensionId ? `${baseUrl}/?id=${encodeURIComponent(extensionId)}` : baseUrl
}

export async function openExtensionManagementPage(options: ExtensionManagementUrlOptions = {}): Promise<void> {
  const url = getExtensionManagementUrl(options)
  await getChromeApi()?.tabs?.create?.({ url, active: true })
}
