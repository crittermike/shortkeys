/**
 * Convert glob/wildcard * syntax to a valid RegExp for URL checking.
 * If the string starts and ends with `/`, treat it as a raw regex.
 *
 * @param {string} glob - Glob pattern or /regex/
 * @returns {RegExp}
 */
export function globToRegex(glob) {
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

/**
 * Determine if a shortcut is allowed on the given URL based on its
 * blacklist/whitelist configuration.
 *
 * @param {object} keySetting - The key configuration object
 * @param {string} url - The current page URL
 * @returns {boolean}
 */
export function isAllowedSite(keySetting, url) {
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
