/**
 * Fetch the full key shortcut config given a keyboard combo.
 *
 * @param {Array} keys - Array of key setting objects
 * @param {string} keyCombo - The keyboard combo string to look up
 * @returns {object|false} The matching key config, or false if not found
 */
export function fetchConfig(keys, keyCombo) {
  let returnKey = false
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
 *
 * @param {HTMLElement} element - The currently focused DOM element
 * @param {string} combo - The keyboard combo string
 * @param {Array} keys - Array of key setting objects
 * @returns {boolean} true if the shortcut should be stopped (not fired)
 */
export function shouldStopCallback(element, combo, keys) {
  const keySetting = fetchConfig(keys, combo)

  if (element.classList && element.classList.contains('mousetrap')) {
    // Elements with 'mousetrap' class are from the site itself (e.g., Twitch chat).
    // Don't activate Shortkeys to prevent conflicts.
    return true
  } else if (!keySetting || !keySetting.activeInInputs) {
    // If not configured for form inputs, stop if user is in a form field.
    return element.tagName === 'INPUT' ||
      element.tagName === 'SELECT' ||
      element.tagName === 'TEXTAREA' ||
      (element.isContentEditable === true)
  } else {
    // User explicitly allowed this shortcut in form inputs.
    return false
  }
}
