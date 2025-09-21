// Simple utility functions for testing purposes

/**
 * Format a keyboard shortcut for display
 * @param {string} shortcut - The raw shortcut string
 * @returns {string} The formatted shortcut
 */
export function formatShortcut(shortcut) {
  if (!shortcut || typeof shortcut !== 'string') {
    return '';
  }
  
  return shortcut
    .split('+')
    .map(key => key.trim())
    .filter(key => key.length > 0)
    .map(key => {
      // Capitalize first letter of each key
      return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
    })
    .join(' + ');
}

/**
 * Validate if a shortcut string is valid
 * @param {string} shortcut - The shortcut to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidShortcut(shortcut) {
  if (!shortcut || typeof shortcut !== 'string') {
    return false;
  }
  
  const trimmed = shortcut.trim();
  if (trimmed.length === 0) {
    return false;
  }
  
  // Check for valid characters (letters, numbers, +, -)
  const validPattern = /^[a-zA-Z0-9+\s-]+$/;
  return validPattern.test(trimmed);
}