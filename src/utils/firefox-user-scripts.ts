import type { ActionParameters, KeySetting } from './url-matching'
import { loadGroupSettings, loadKeys, loadUserScriptApprovals, updateUserScriptApproval } from './storage'

export async function getFirefoxScriptCode(action: string, parameters: ActionParameters): Promise<string> {
  if (action === 'javascript') return parameters.code || ''
  if (action !== 'openbookmark' || !parameters.bookmark) return ''
  const nodes = await browser.bookmarks.search({ title: parameters.bookmark })
  const url = nodes.reverse().find(node => node.url && node.title === parameters.bookmark)?.url
  if (!url) return ''
  const normalizedUrl = url.trim().toLowerCase()
  if (normalizedUrl.startsWith('data:') || normalizedUrl.startsWith('vbscript:')) return ''
  if (!normalizedUrl.startsWith('javascript:')) return ''
  const code = url.slice(url.indexOf(':') + 1)
  try {
    return decodeURIComponent(code)
  } catch {
    return code
  }
}

export async function hasCustomScripts(shortcut: KeySetting): Promise<boolean> {
  if (shortcut.action !== 'macro') return Boolean(await getFirefoxScriptCode(shortcut.action, shortcut))
  return (await Promise.all((shortcut.macroSteps || []).map(step => getFirefoxScriptCode(step.action, step)))).some(Boolean)
}

async function scriptSnapshot(shortcut: KeySetting): Promise<{ digest: string; codes: string[] }> {
  const groups = await loadGroupSettings()
  const steps = shortcut.action === 'macro' ? shortcut.macroSteps || [] : [shortcut]
  const codes = await Promise.all(steps.map(step => getFirefoxScriptCode(step.action, step)))
  const source = JSON.stringify({
    action: shortcut.action,
    steps: steps.map((step, index) => ({
      ...(shortcut.action === 'macro' ? step : { action: step.action }),
      code: codes[index],
    })),
    sites: shortcut.sites || '',
    sitesArray: shortcut.sitesArray,
    blacklist: String(shortcut.blacklist || false),
    group: shortcut.group || '',
    groupSettings: groups[shortcut.group || 'My Shortcuts'],
  })
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  return {
    digest: Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join(''),
    codes,
  }
}

export function requestFirefoxUserScripts(): Promise<boolean> {
  return browser.permissions.request({ permissions: ['userScripts'] })
}

export async function isFirefoxScriptInstalled(shortcut: KeySetting): Promise<boolean> {
  if (!shortcut.id || !await hasCustomScripts(shortcut)) return false
  const approvals = await loadUserScriptApprovals()
  return approvals[shortcut.id] === (await scriptSnapshot(shortcut)).digest
}

export async function installFirefoxScript(shortcut: KeySetting): Promise<void> {
  if (!shortcut.id || !await hasCustomScripts(shortcut)) throw new Error('No user script to install.')
  if (!await browser.permissions.contains({ permissions: ['userScripts'] })) {
    throw new Error('Enable custom JavaScript in Shortkeys settings first.')
  }
  const snapshot = await scriptSnapshot(shortcut)
  const saved: KeySetting[] = JSON.parse(await loadKeys() || '[]')
  const current = saved.find(key => key.id === shortcut.id)
  if (!current || (await scriptSnapshot(current)).digest !== snapshot.digest) {
    throw new Error('Save the current user script before installing it.')
  }
  await updateUserScriptApproval(shortcut.id, snapshot.digest)
}

export async function removeFirefoxScript(shortcut: KeySetting): Promise<void> {
  if (!shortcut.id) throw new Error('This shortcut has no user-script identity.')
  await updateUserScriptApproval(shortcut.id)
}

export async function executeFirefoxUserScript(tabId: number, shortcut: KeySetting, stepIndex?: number): Promise<void> {
  if (!await browser.permissions.contains({ permissions: ['userScripts'] })) {
    throw new Error('Enable custom JavaScript in Shortkeys settings first.')
  }
  const snapshot = await scriptSnapshot(shortcut)
  const approvals = await loadUserScriptApprovals()
  if (!shortcut.id || approvals[shortcut.id] !== snapshot.digest) {
    throw new Error('Install this user script in Shortkeys settings before running it. Edited scripts must be reinstalled.')
  }
  const saved: KeySetting[] = JSON.parse(await loadKeys() || '[]')
  const current = saved.find(key => key.id === shortcut.id)
  if (!current || (await scriptSnapshot(current)).digest !== snapshot.digest) {
    throw new Error('Save and install the current user script before running it.')
  }
  const code = snapshot.codes[stepIndex ?? 0]
  if (!code) throw new Error('This action has no user script to run.')
  if (!chrome.userScripts?.execute) throw new Error('Firefox 153 or later is required to execute user scripts.')
  const results = await chrome.userScripts.execute({
    target: { tabId },
    world: 'MAIN',
    js: [{ code: `(async function() {\n${code}\n})();` }],
  })
  const failure = results.find(result => result.error)
  if (failure) throw new Error(String(failure.error))
}
