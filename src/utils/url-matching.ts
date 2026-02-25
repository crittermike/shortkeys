/**
 * Convert glob/wildcard * syntax to a valid RegExp for URL checking.
 * If the string starts and ends with `/`, treat it as a raw regex.
 */
export function globToRegex(glob: string): RegExp {
  if (/^\/.*\/$/.test(glob)) {
    return new RegExp(glob.replace(/^\/(.*)\/$/, '$1'))
  }

  const specialChars = '\\^$*+?.()|{}[]'
  let regexChars = ['^']
  for (let i = 0; i < glob.length; ++i) {
    let c = glob.charAt(i)
    if (c === '*') {
      regexChars.push('.*')
    } else {
      if (specialChars.indexOf(c) >= 0) {
        regexChars.push('\\')
      }
      regexChars.push(c)
    }
  }
  regexChars.push('$')
  return new RegExp(regexChars.join(''))
}

export interface MacroStep {
  action: string
  delay?: number
}

export interface GroupSettings {
  activateOn?: string
  deactivateOn?: string
}


export interface KeySetting {
  key: string
  action: string
  blacklist?: boolean | string
  sitesArray?: string[]
  activeInInputs?: boolean
  sites?: string
  label?: string
  id?: string
  code?: string
  bookmark?: string
  openurl?: string
  matchurl?: string
  matchtitle?: string
  matchindex?: string
  button?: string
  openappid?: string
  trigger?: string
  inserttext?: string
  smoothScrolling?: boolean
  currentWindow?: boolean
  enabled?: boolean
  group?: string
  macroSteps?: MacroStep[]
}

/**
 * Determine if a shortcut is allowed on the given URL based on its
 * blacklist/whitelist configuration.
 */
export function isAllowedSite(keySetting: KeySetting, url: string): boolean {
  if (!keySetting.blacklist || keySetting.blacklist === 'false') {
    return true
  }

  let allowed = (keySetting.blacklist === true || keySetting.blacklist === 'true')
  if (keySetting.sitesArray) {
    keySetting.sitesArray.forEach((site) => {
      if (site && url.match(globToRegex(site))) {
        allowed = !allowed
      }
    })
  }
  return allowed
}

/**
 * Determine if a shortcut is allowed on the given URL based on its
 * group-level activation/deactivation patterns.
 * Group settings use the same glob syntax as per-shortcut site filters.
 *
 * - activateOn: group shortcuts only active on matching URLs (whitelist)
 * - deactivateOn: group shortcuts disabled on matching URLs (blacklist)
 * - If both are set, activateOn takes precedence (must match AND not be deactivated)
 * - If neither is set, all URLs are allowed (default behavior)
 */
export function isGroupAllowed(
  groupName: string | undefined,
  url: string,
  allGroupSettings: Record<string, GroupSettings>,
): boolean {
  const DEFAULT_GROUP = 'My Shortcuts'
  const name = groupName || DEFAULT_GROUP
  const settings = allGroupSettings[name]
  if (!settings) return true

  const activatePatterns = settings.activateOn
    ? settings.activateOn.split('\n').map(s => s.trim()).filter(Boolean)
    : []
  const deactivatePatterns = settings.deactivateOn
    ? settings.deactivateOn.split('\n').map(s => s.trim()).filter(Boolean)
    : []

  // If activateOn patterns exist, URL must match at least one
  if (activatePatterns.length > 0) {
    const matchesActivate = activatePatterns.some(pattern => {
      try { return globToRegex(pattern).test(url) } catch { return false }
    })
    if (!matchesActivate) return false
  }

  // If deactivateOn patterns exist, URL must NOT match any
  if (deactivatePatterns.length > 0) {
    const matchesDeactivate = deactivatePatterns.some(pattern => {
      try { return globToRegex(pattern).test(url) } catch { return false }
    })
    if (matchesDeactivate) return false
  }

  return true
}
