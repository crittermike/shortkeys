import type { KeySetting } from './url-matching'

/**
 * Well-known browser default keyboard shortcuts (Chrome/Edge/Firefox).
 * Normalized to Mousetrap format (lowercase, + separated).
 */
export const BROWSER_DEFAULTS: Record<string, string> = {
  // Tab management
  'ctrl+t': 'Open new tab',
  'ctrl+w': 'Close current tab',
  'ctrl+shift+t': 'Reopen last closed tab',
  'ctrl+tab': 'Next tab',
  'ctrl+shift+tab': 'Previous tab',
  'ctrl+1': 'Switch to tab 1',
  'ctrl+2': 'Switch to tab 2',
  'ctrl+3': 'Switch to tab 3',
  'ctrl+4': 'Switch to tab 4',
  'ctrl+5': 'Switch to tab 5',
  'ctrl+6': 'Switch to tab 6',
  'ctrl+7': 'Switch to tab 7',
  'ctrl+8': 'Switch to tab 8',
  'ctrl+9': 'Switch to last tab',

  // Window management
  'ctrl+n': 'Open new window',
  'ctrl+shift+n': 'Open new incognito window',
  'ctrl+shift+w': 'Close current window',
  'alt+f4': 'Close current window',

  // Navigation
  'alt+left': 'Go back',
  'alt+right': 'Go forward',
  'ctrl+r': 'Reload page',
  'ctrl+shift+r': 'Hard reload (bypass cache)',
  'f5': 'Reload page',
  'ctrl+f5': 'Hard reload (bypass cache)',

  // Address bar & search
  'ctrl+l': 'Focus address bar',
  'alt+d': 'Focus address bar',
  'f6': 'Focus address bar',
  'ctrl+k': 'Focus search bar',
  'ctrl+e': 'Focus search bar',

  // Page actions
  'ctrl+f': 'Find on page',
  'ctrl+g': 'Find next',
  'ctrl+shift+g': 'Find previous',
  'ctrl+p': 'Print page',
  'ctrl+s': 'Save page',
  'ctrl+u': 'View page source',
  'ctrl+d': 'Bookmark current page',
  'ctrl+shift+b': 'Toggle bookmarks bar',
  'ctrl+h': 'Open history',
  'ctrl+j': 'Open downloads',

  // Zoom
  'ctrl++': 'Zoom in',
  'ctrl+=': 'Zoom in',
  'ctrl+-': 'Zoom out',
  'ctrl+0': 'Reset zoom',

  // Developer tools
  'f12': 'Open developer tools',
  'ctrl+shift+i': 'Open developer tools',
  'ctrl+shift+j': 'Open console',
  'ctrl+shift+c': 'Inspect element',

  // Text editing (common, but typically only in inputs)
  'ctrl+a': 'Select all',
  'ctrl+c': 'Copy',
  'ctrl+v': 'Paste',
  'ctrl+x': 'Cut',
  'ctrl+z': 'Undo',
  'ctrl+shift+z': 'Redo',
  'ctrl+y': 'Redo',

  // Mac equivalents (Mousetrap uses meta for Cmd)
  'meta+t': 'Open new tab',
  'meta+w': 'Close current tab',
  'meta+shift+t': 'Reopen last closed tab',
  'meta+n': 'Open new window',
  'meta+shift+n': 'Open new incognito window',
  'meta+r': 'Reload page',
  'meta+shift+r': 'Hard reload',
  'meta+l': 'Focus address bar',
  'meta+f': 'Find on page',
  'meta+p': 'Print page',
  'meta+d': 'Bookmark current page',
  'meta+shift+b': 'Toggle bookmarks bar',
  'meta+h': 'Hide browser (Mac)',
  'meta+q': 'Quit browser (Mac)',
  'meta+,': 'Open preferences (Mac)',
  'meta+shift+i': 'Open developer tools',
  'meta+alt+i': 'Open developer tools (Mac)',
  'meta+alt+j': 'Open console (Mac)',
  'meta+=': 'Zoom in',
  'meta+-': 'Zoom out',
  'meta+0': 'Reset zoom',
}

export interface ShortcutConflict {
  type: 'browser' | 'duplicate'
  key: string
  message: string
  /** For browser conflicts: the browser action being overridden */
  browserAction?: string
  /** For duplicate conflicts: indices of duplicates */
  duplicateIndices?: number[]
}

/**
 * Normalize a shortcut key string for comparison.
 * Sorts modifier keys so "shift+ctrl+a" === "ctrl+shift+a".
 */
export function normalizeKey(key: string): string {
  if (!key) return ''
  const parts = key.toLowerCase().trim().split('+')
  const modifiers = ['ctrl', 'alt', 'shift', 'meta', 'mod', 'command', 'option']
  const mods = parts.filter((p) => modifiers.includes(p)).sort()
  const rest = parts.filter((p) => !modifiers.includes(p))
  return [...mods, ...rest].join('+')
}

/**
 * Check if a shortcut key conflicts with a known browser default.
 * Returns the browser action description if it conflicts, or null.
 */
export function getBrowserConflict(key: string): string | null {
  const normalized = normalizeKey(key)
  return BROWSER_DEFAULTS[normalized] ?? null
}

/**
 * Find all conflicts for a set of shortcuts.
 * Returns a Map from shortcut index to an array of conflicts.
 */
export function detectConflicts(shortcuts: KeySetting[]): Map<number, ShortcutConflict[]> {
  const conflicts = new Map<number, ShortcutConflict[]>()

  // Build a map of normalized keys → indices for duplicate detection
  const keyToIndices = new Map<string, number[]>()
  for (let i = 0; i < shortcuts.length; i++) {
    const key = shortcuts[i].key
    if (!key) continue
    const norm = normalizeKey(key)
    if (!norm) continue
    const existing = keyToIndices.get(norm) || []
    existing.push(i)
    keyToIndices.set(norm, existing)
  }

  for (let i = 0; i < shortcuts.length; i++) {
    const key = shortcuts[i].key
    if (!key) continue
    const norm = normalizeKey(key)
    if (!norm) continue

    const shortcutConflicts: ShortcutConflict[] = []

    // Check browser default conflicts
    const browserAction = getBrowserConflict(key)
    if (browserAction) {
      shortcutConflicts.push({
        type: 'browser',
        key: norm,
        message: `Overrides browser shortcut: ${browserAction}`,
        browserAction,
      })
    }

    // Check duplicate shortcuts within the user's list
    const indices = keyToIndices.get(norm) || []
    if (indices.length > 1) {
      const others = indices.filter((idx) => idx !== i)
      shortcutConflicts.push({
        type: 'duplicate',
        key: norm,
        message: `Duplicate shortcut (also used by shortcut #${others.map((o) => o + 1).join(', #')})`,
        duplicateIndices: others,
      })
    }

    if (shortcutConflicts.length > 0) {
      conflicts.set(i, shortcutConflicts)
    }
  }

  return conflicts
}
