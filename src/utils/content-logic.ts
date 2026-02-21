import type { KeySetting } from './url-matching'

/**
 * Fetch the full key shortcut config given a keyboard combo.
 */
export function fetchConfig(keys: KeySetting[], keyCombo: string): KeySetting | false {
  let returnKey: KeySetting | false = false
  if (keys.length > 0) {
    keys.forEach((key) => {
      if (key.key === keyCombo) {
        returnKey = key
      }
    })
  }
  return returnKey
}

/**
 * Determine whether a keyboard shortcut should be suppressed based on
 * the active element and the shortcut's configuration.
 */
export function shouldStopCallback(
  element: { tagName: string; classList: { contains(cls: string): boolean }; isContentEditable?: boolean },
  combo: string,
  keys: KeySetting[],
): boolean {
  const keySetting = fetchConfig(keys, combo)

  if (element.classList && element.classList.contains('mousetrap')) {
    return true
  } else if (!keySetting || !keySetting.activeInInputs) {
    return (
      element.tagName === 'INPUT' ||
      element.tagName === 'SELECT' ||
      element.tagName === 'TEXTAREA' ||
      element.isContentEditable === true
    )
  } else {
    return false
  }
}
