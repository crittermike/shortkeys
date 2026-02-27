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
  /** True when duplicates have the same key AND same action (exact duplicate) */
  exact?: boolean
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
 * Get the effective site filter patterns for a shortcut.
 * Returns null if the shortcut applies to all sites (no filtering).
 * Returns the array of site patterns if filtering is active.
 */
export function getSitePatterns(shortcut: KeySetting): string[] | null {
  // No blacklist field or blacklist is false/undefined = applies everywhere
  if (!shortcut.blacklist || shortcut.blacklist === 'false') {
    return null
  }
  // Prefer sitesArray if populated, otherwise fall back to splitting the sites string
  // (sitesArray is only set on save; the sites string is always current in the UI)
  const patterns = shortcut.sitesArray && shortcut.sitesArray.length > 0
    ? shortcut.sitesArray
    : shortcut.sites
      ? shortcut.sites.split('\n')
      : []
  const filtered = patterns.filter(Boolean)
  // Has site filter but no actual patterns = applies everywhere (vacuous filter)
  if (filtered.length === 0) {
    return null
  }
  return filtered
}

/**
 * Determine if two shortcuts could ever fire on the same URL.
 * If either applies to all sites, they can always overlap.
 * If both have site filters, check conservatively whether any patterns
 * share a common domain substring (not a full URL intersection, which
 * would require regex intersection and be too complex/fragile).
 *
 * For allowlist (blacklist='whitelist') shortcuts, site patterns define WHERE they fire.
 * For blocklist (blacklist=true/'true') shortcuts, they fire everywhere EXCEPT listed sites.
 * Two allowlist shortcuts only conflict if their patterns could match the same URL.
 */
export function couldSiteFiltersOverlap(a: KeySetting, b: KeySetting): boolean {
  const aPats = getSitePatterns(a)
  const bPats = getSitePatterns(b)

  // If either applies everywhere, they always overlap
  if (aPats === null || bPats === null) return true

  // Both have site filters. If both are allowlists (blacklist=true),
  // they only conflict if patterns could match the same URL.
  // If one is an allowlist and the other is a blocklist, it's complex -
  // be conservative and say they overlap.
  const aIsAllowlist = a.blacklist === 'whitelist'
  const bIsAllowlist = b.blacklist === 'whitelist'

  // Case 1: Both are allowlists — only conflict if patterns could match the same URL
  if (aIsAllowlist && bIsAllowlist) {
    for (const ap of aPats) {
      for (const bp of bPats) {
        if (patternsCouldOverlap(ap, bp)) return true
      }
    }
    return false
  }

  // Case 2: One is allowlist, other is blocklist
  // Allowlist fires ONLY on its patterns; blocklist fires EVERYWHERE EXCEPT its patterns.
  // If the blocklist excludes the same domains the allowlist targets, they can never both fire.
  // e.g. allowlist=['*reddit.com*'] + blocklist=['*reddit.com*'] = mutually exclusive
  if (aIsAllowlist !== bIsAllowlist) {
    const allowPats = aIsAllowlist ? aPats : bPats
    const blockPats = aIsAllowlist ? bPats : aPats
    // If every allowlist pattern is covered by a blocklist pattern,
    // the blocklist won't fire on any URL the allowlist fires on.
    const allAllowPatsBlocked = allowPats.every((ap) =>
      blockPats.some((bp) => patternsCouldOverlap(ap, bp))
    )
    if (allAllowPatsBlocked) return false
    // Some allowlist URLs aren't blocked — they could overlap there
    return true
  }

  // Case 3: Both are blocklists — they both fire on most sites, likely overlap
  return true
}

/**
 * Heuristic check if two URL glob patterns could match the same URL.
 * Extracts domain-like substrings and checks for overlap.
 * Conservative: returns true when uncertain.
 */
function patternsCouldOverlap(a: string, b: string): boolean {
  // If either is a regex pattern, be conservative
  if (/^\/.*\/$/.test(a) || /^\/.*\/$/.test(b)) return true

  // If either is just a wildcard, it matches everything
  if (a === '*' || b === '*') return true

  // Extract the non-wildcard core from each pattern
  const coreA = a.replace(/^\*+|\*+$/g, '').toLowerCase()
  const coreB = b.replace(/^\*+|\*+$/g, '').toLowerCase()

  // If either core is empty after stripping wildcards, it matches everything
  if (!coreA || !coreB) return true

  // Check if one core contains the other or they share a domain component
  if (coreA.includes(coreB) || coreB.includes(coreA)) return true

  // Check for domain-level overlap: extract domain-like parts
  // e.g. '*gmail.com*' -> 'gmail.com', '*://github.com/*' -> 'github.com'
  const domainA = extractDomain(coreA)
  const domainB = extractDomain(coreB)

  if (domainA && domainB) {
    return domainA === domainB
  }

  // Can't determine - be conservative
  return true
}

/**
 * Try to extract a domain from a URL pattern fragment.
 * Returns null if no clear domain can be extracted.
 */
function extractDomain(pattern: string): string | null {
  // Try to find a domain-like pattern (word.word)
  const match = pattern.match(/([a-z0-9-]+\.[a-z]{2,})/)
  return match ? match[1] : null
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
      const others = indices.filter((idx) => idx !== i).filter((idx) => {
        // Only flag as duplicate if site filters could overlap (#739)
        return couldSiteFiltersOverlap(shortcuts[i], shortcuts[idx])
      })
      if (others.length > 0) {
        // Check if any duplicate is an exact match (same key + same action)
        const hasExact = others.some((idx) => shortcuts[idx].action === shortcuts[i].action)
        shortcutConflicts.push({
          type: 'duplicate',
          key: norm,
          message: `Duplicate shortcut (also used by shortcut #${others.map((o) => o + 1).join(', #')})`,
          duplicateIndices: others,
          exact: hasExact,
        })
      }
    }

    if (shortcutConflicts.length > 0) {
      conflicts.set(i, shortcutConflicts)
    }
  }

  return conflicts
}
