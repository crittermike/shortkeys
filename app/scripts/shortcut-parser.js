/**
 * Parse a key combination string into its components
 * @param {string} keyCombo - The key combination string (e.g., "ctrl+shift+t")
 * @returns {Object} Object with modifiers and key
 */
export function parseKeyCombo(keyCombo) {
  if (!keyCombo || typeof keyCombo !== 'string') {
    return { modifiers: [], key: null };
  }

  const parts = keyCombo.toLowerCase().split('+').map(part => part.trim());
  const modifiers = [];
  let key = null;

  const modifierKeys = ['ctrl', 'alt', 'shift', 'meta', 'cmd'];

  for (const part of parts) {
    if (modifierKeys.includes(part)) {
      if (!modifiers.includes(part)) {
        modifiers.push(part);
      }
    } else {
      // Last non-modifier part becomes the key
      key = part;
    }
  }

  return { modifiers: modifiers.sort(), key };
}

/**
 * Check if a key combination conflicts with browser defaults
 * @param {string} keyCombo - The key combination to check
 * @returns {boolean} True if it conflicts with common browser shortcuts
 */
export function isSystemShortcut(keyCombo) {
  const systemShortcuts = [
    'ctrl+t',      // New tab
    'ctrl+w',      // Close tab
    'ctrl+n',      // New window
    'ctrl+shift+n', // New private window
    'ctrl+r',      // Reload
    'ctrl+f',      // Find
    'alt+f4',      // Close window
    'f5',          // Reload
    'f11',         // Fullscreen
    'ctrl+l',      // Address bar
    'ctrl+shift+delete' // Clear data
  ];

  return systemShortcuts.includes(keyCombo.toLowerCase());
}