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
