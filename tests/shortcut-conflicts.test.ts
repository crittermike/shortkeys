import { describe, it, expect } from 'vitest'
import {
  normalizeKey,
  getBrowserConflict,
  detectConflicts,
  getDefaultsForPlatform,
} from '../src/utils/shortcut-conflicts'
import type { KeySetting } from '../src/utils/url-matching'

describe('normalizeKey', () => {
  it('lowercases all parts', () => {
    expect(normalizeKey('Ctrl+Shift+A')).toBe('ctrl+shift+a')
  })

  it('sorts modifier keys alphabetically', () => {
    expect(normalizeKey('shift+ctrl+a')).toBe('ctrl+shift+a')
    expect(normalizeKey('alt+shift+ctrl+x')).toBe('alt+ctrl+shift+x')
  })

  it('preserves non-modifier key at end', () => {
    expect(normalizeKey('ctrl+alt+delete')).toBe('alt+ctrl+delete')
  })

  it('handles single key (no modifiers)', () => {
    expect(normalizeKey('a')).toBe('a')
    expect(normalizeKey('F12')).toBe('f12')
  })

  it('handles meta/command modifier', () => {
    expect(normalizeKey('meta+t')).toBe('meta+t')
    expect(normalizeKey('command+shift+k')).toBe('command+shift+k')
  })

  it('trims whitespace', () => {
    expect(normalizeKey('  ctrl+a  ')).toBe('ctrl+a')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeKey('')).toBe('')
  })
})

describe('getDefaultsForPlatform', () => {
  it('returns ctrl-based defaults for Windows/Linux', () => {
    const defaults = getDefaultsForPlatform(false)
    expect(defaults['ctrl+t']).toBe('Open new tab')
    expect(defaults['ctrl+w']).toBe('Close current tab')
    expect(defaults['ctrl+a']).toBe('Select all')
    // Should NOT have meta shortcuts
    expect(defaults['meta+t']).toBeUndefined()
    expect(defaults['meta+q']).toBeUndefined()
  })

  it('returns meta-based defaults for macOS', () => {
    const defaults = getDefaultsForPlatform(true)
    expect(defaults['meta+t']).toBe('Open new tab')
    expect(defaults['meta+w']).toBe('Close current tab')
    expect(defaults['meta+a']).toBe('Select all')
    expect(defaults['meta+q']).toBe('Quit browser')
    // Should NOT have ctrl variants of the same
    expect(defaults['ctrl+t']).toBeUndefined()
    expect(defaults['ctrl+a']).toBeUndefined()
  })

  it('both platforms share universal defaults', () => {
    const mac = getDefaultsForPlatform(true)
    const win = getDefaultsForPlatform(false)
    expect(mac['f12']).toBe('Open developer tools')
    expect(win['f12']).toBe('Open developer tools')
    expect(mac['f5']).toBe('Reload page')
    expect(win['f5']).toBe('Reload page')
  })
})

describe('getBrowserConflict', () => {
  describe('on Windows/Linux', () => {
    it('detects ctrl+t as new tab', () => {
      expect(getBrowserConflict('ctrl+t', false)).toBe('Open new tab')
    })

    it('detects ctrl+w as close tab', () => {
      expect(getBrowserConflict('ctrl+w', false)).toBe('Close current tab')
    })

    it('detects ctrl+a as select all', () => {
      expect(getBrowserConflict('ctrl+a', false)).toBe('Select all')
    })

    it('detects f12 as dev tools', () => {
      expect(getBrowserConflict('f12', false)).toBe('Open developer tools')
    })

    it('normalizes modifier order', () => {
      expect(getBrowserConflict('shift+ctrl+t', false)).toBe('Reopen last closed tab')
    })

    it('does NOT flag meta+t (not a Windows shortcut)', () => {
      expect(getBrowserConflict('meta+t', false)).toBeNull()
    })

    it('returns null for non-conflicting shortcuts', () => {
      expect(getBrowserConflict('ctrl+shift+k', false)).toBeNull()
      expect(getBrowserConflict('alt+z', false)).toBeNull()
    })
  })

  describe('on macOS', () => {
    it('detects meta+t as new tab', () => {
      expect(getBrowserConflict('meta+t', true)).toBe('Open new tab')
    })

    it('detects meta+w as close tab', () => {
      expect(getBrowserConflict('meta+w', true)).toBe('Close current tab')
    })

    it('detects meta+q as quit browser', () => {
      expect(getBrowserConflict('meta+q', true)).toBe('Quit browser')
    })

    it('does NOT flag ctrl+a (not a Mac browser shortcut)', () => {
      expect(getBrowserConflict('ctrl+a', true)).toBeNull()
    })

    it('does NOT flag ctrl+t (not a Mac browser shortcut)', () => {
      expect(getBrowserConflict('ctrl+t', true)).toBeNull()
    })

    it('detects f12 (universal)', () => {
      expect(getBrowserConflict('f12', true)).toBe('Open developer tools')
    })

    it('returns null for non-conflicting shortcuts', () => {
      expect(getBrowserConflict('ctrl+shift+k', true)).toBeNull()
      expect(getBrowserConflict('alt+z', true)).toBeNull()
    })
  })

  it('returns null for empty key', () => {
    expect(getBrowserConflict('', false)).toBeNull()
    expect(getBrowserConflict('', true)).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(getBrowserConflict('CTRL+T', false)).toBe('Open new tab')
    expect(getBrowserConflict('META+T', true)).toBe('Open new tab')
  })
})

describe('detectConflicts', () => {
  it('detects browser conflicts on Windows', () => {
    const shortcuts: KeySetting[] = [
      { key: 'ctrl+t', action: 'newtab' },
      { key: 'ctrl+shift+k', action: 'javascript' },
    ]
    const conflicts = detectConflicts(shortcuts, false)
    expect(conflicts.has(0)).toBe(true)
    expect(conflicts.get(0)![0].browserAction).toBe('Open new tab')
    expect(conflicts.has(1)).toBe(false)
  })

  it('detects browser conflicts on Mac', () => {
    const shortcuts: KeySetting[] = [
      { key: 'meta+t', action: 'newtab' },
      { key: 'ctrl+t', action: 'javascript' },
    ]
    const conflicts = detectConflicts(shortcuts, true)
    // meta+t conflicts on Mac
    expect(conflicts.has(0)).toBe(true)
    expect(conflicts.get(0)![0].browserAction).toBe('Open new tab')
    // ctrl+t does NOT conflict on Mac
    expect(conflicts.has(1)).toBe(false)
  })

  it('detects duplicate shortcuts', () => {
    const shortcuts: KeySetting[] = [
      { key: 'ctrl+b', action: 'newtab' },
      { key: 'ctrl+b', action: 'closetab' },
      { key: 'ctrl+shift+k', action: 'javascript' },
    ]
    const conflicts = detectConflicts(shortcuts, false)
    expect(conflicts.has(0)).toBe(true)
    expect(conflicts.has(1)).toBe(true)
    expect(conflicts.has(2)).toBe(false)
    expect(conflicts.get(0)!.find((c) => c.type === 'duplicate')!.duplicateIndices).toEqual([1])
  })

  it('detects duplicates with different modifier order', () => {
    const shortcuts: KeySetting[] = [
      { key: 'shift+ctrl+a', action: 'newtab' },
      { key: 'ctrl+shift+a', action: 'closetab' },
    ]
    const conflicts = detectConflicts(shortcuts, false)
    expect(conflicts.has(0)).toBe(true)
    expect(conflicts.get(0)!.some((c) => c.type === 'duplicate')).toBe(true)
  })

  it('can have both browser and duplicate conflicts simultaneously', () => {
    const shortcuts: KeySetting[] = [
      { key: 'ctrl+t', action: 'newtab' },
      { key: 'ctrl+t', action: 'closetab' },
    ]
    const conflicts = detectConflicts(shortcuts, false)
    const c0 = conflicts.get(0)!
    expect(c0.length).toBe(2)
    expect(c0.some((c) => c.type === 'browser')).toBe(true)
    expect(c0.some((c) => c.type === 'duplicate')).toBe(true)
  })

  it('handles empty key gracefully', () => {
    const shortcuts: KeySetting[] = [
      { key: '', action: 'newtab' },
      { key: 'ctrl+b', action: 'closetab' },
    ]
    const conflicts = detectConflicts(shortcuts, false)
    expect(conflicts.has(0)).toBe(false)
  })

  it('returns empty map for no conflicts', () => {
    const shortcuts: KeySetting[] = [
      { key: 'ctrl+shift+1', action: 'newtab' },
      { key: 'ctrl+shift+2', action: 'closetab' },
    ]
    const conflicts = detectConflicts(shortcuts, false)
    expect(conflicts.size).toBe(0)
  })

  it('detects three-way duplicates', () => {
    const shortcuts: KeySetting[] = [
      { key: 'ctrl+b', action: 'newtab' },
      { key: 'ctrl+b', action: 'closetab' },
      { key: 'ctrl+b', action: 'reload' },
    ]
    const conflicts = detectConflicts(shortcuts, false)
    const dup = conflicts.get(0)!.find((c) => c.type === 'duplicate')!
    expect(dup.duplicateIndices).toEqual([1, 2])
  })
})
