import type { KeySetting } from './url-matching'

/**
 * Browser default shortcuts that work on ALL platforms (no modifier or alt-based).
 */
const UNIVERSAL_DEFAULTS: Record<string, string> = {
  'f5': 'Reload page',
  'f6': 'Focus address bar',
  'f12': 'Open developer tools',
}

/**
 * Browser defaults for Windows/Linux (ctrl-based).
 */
const WINDOWS_LINUX_DEFAULTS: Record<string, string> = {
  ...UNIVERSAL_DEFAULTS,
  'alt+f4': 'Close current window',
  'alt+left': 'Go back',
  'alt+right': 'Go forward',
  'alt+d': 'Focus address bar',

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
  'ctrl+n': 'Open new window',
  'ctrl+shift+n': 'Open new incognito window',
  'ctrl+shift+w': 'Close current window',
  'ctrl+r': 'Reload page',
  'ctrl+shift+r': 'Hard reload (bypass cache)',
  'ctrl+f5': 'Hard reload (bypass cache)',
  'ctrl+l': 'Focus address bar',
  'ctrl+k': 'Focus search bar',
  'ctrl+e': 'Focus search bar',
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
  'ctrl+=': 'Zoom in',
  'ctrl+-': 'Zoom out',
  'ctrl+0': 'Reset zoom',
  'ctrl+shift+i': 'Open developer tools',
  'ctrl+shift+j': 'Open console',
  'ctrl+shift+c': 'Inspect element',
  'ctrl+a': 'Select all',
  'ctrl+c': 'Copy',
  'ctrl+v': 'Paste',
  'ctrl+x': 'Cut',
  'ctrl+z': 'Undo',
  'ctrl+shift+z': 'Redo',
  'ctrl+y': 'Redo',
}

/**
 * Browser defaults for macOS (cmd/meta-based).
 */
const MAC_DEFAULTS: Record<string, string> = {
  ...UNIVERSAL_DEFAULTS,
  'meta+left': 'Go back',
  'meta+right': 'Go forward',

  'meta+t': 'Open new tab',
  'meta+w': 'Close current tab',
  'meta+shift+t': 'Reopen last closed tab',
  'ctrl+tab': 'Next tab',
  'ctrl+shift+tab': 'Previous tab',
  'meta+1': 'Switch to tab 1',
  'meta+2': 'Switch to tab 2',
  'meta+3': 'Switch to tab 3',
  'meta+4': 'Switch to tab 4',
  'meta+5': 'Switch to tab 5',
  'meta+6': 'Switch to tab 6',
  'meta+7': 'Switch to tab 7',
  'meta+8': 'Switch to tab 8',
  'meta+9': 'Switch to last tab',
  'meta+n': 'Open new window',
  'meta+shift+n': 'Open new incognito window',
  'meta+r': 'Reload page',
  'meta+shift+r': 'Hard reload (bypass cache)',
  'meta+l': 'Focus address bar',
  'meta+f': 'Find on page',
  'meta+g': 'Find next',
  'meta+shift+g': 'Find previous',
  'meta+p': 'Print page',
  'meta+s': 'Save page',
  'meta+alt+u': 'View page source',
  'meta+d': 'Bookmark current page',
  'meta+shift+b': 'Toggle bookmarks bar',
  'meta+y': 'Open history',
  'meta+=': 'Zoom in',
  'meta+-': 'Zoom out',
  'meta+0': 'Reset zoom',
  'meta+alt+i': 'Open developer tools',
  'meta+shift+i': 'Open developer tools',
  'meta+alt+j': 'Open console',
  'meta+shift+c': 'Inspect element',
  'meta+a': 'Select all',
  'meta+c': 'Copy',
  'meta+v': 'Paste',
  'meta+x': 'Cut',
  'meta+z': 'Undo',
  'meta+shift+z': 'Redo',
  'meta+h': 'Hide browser',
  'meta+q': 'Quit browser',
  'meta+,': 'Open preferences',
}

/** Detect if the current platform is macOS. */
export function isMacOS(): boolean {
  if (typeof navigator !== 'undefined') {
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
  }
  return false
}

/**
 * Get the browser defaults map for a given platform.
 * Exported for testing.
 */
export function getDefaultsForPlatform(mac: boolean): Record<string, string> {
  return mac ? MAC_DEFAULTS : WINDOWS_LINUX_DEFAULTS
}

export interface ShortcutConflict {
  type: 'browser' | 'duplicate'
  key: string
  message: string
  browserAction?: string
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
 * Platform-aware: only checks defaults relevant to the current OS.
 * Pass `mac` to override platform detection (useful for testing).
 */
export function getBrowserConflict(key: string, mac?: boolean): string | null {
  const normalized = normalizeKey(key)
  const defaults = getDefaultsForPlatform(mac ?? isMacOS())
  return defaults[normalized] ?? null
}

/**
 * Find all conflicts for a set of shortcuts.
 * Returns a Map from shortcut index to an array of conflicts.
 * Pass `mac` to override platform detection (useful for testing).
 */
export function detectConflicts(shortcuts: KeySetting[], mac?: boolean): Map<number, ShortcutConflict[]> {
  const conflicts = new Map<number, ShortcutConflict[]>()

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

    const browserAction = getBrowserConflict(key, mac)
    if (browserAction) {
      shortcutConflicts.push({
        type: 'browser',
        key: norm,
        message: `Overrides browser shortcut: ${browserAction}`,
        browserAction,
      })
    }

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
