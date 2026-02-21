import { describe, it, expect } from 'vitest'
import {
  normalizeKey,
  getBrowserConflict,
  detectConflicts,
  BROWSER_DEFAULTS,
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

  it('handles mod modifier (Mousetrap cross-platform)', () => {
    expect(normalizeKey('mod+shift+a')).toBe('mod+shift+a')
  })
})

describe('getBrowserConflict', () => {
  it('detects ctrl+t as new tab', () => {
    expect(getBrowserConflict('ctrl+t')).toBe('Open new tab')
  })

  it('detects ctrl+w as close tab', () => {
    expect(getBrowserConflict('ctrl+w')).toBe('Close current tab')
  })

  it('detects f12 as dev tools', () => {
    expect(getBrowserConflict('f12')).toBe('Open developer tools')
  })

  it('detects ctrl+shift+t regardless of modifier order', () => {
    expect(getBrowserConflict('shift+ctrl+t')).toBe('Reopen last closed tab')
  })

  it('detects Mac meta shortcuts', () => {
    expect(getBrowserConflict('meta+t')).toBe('Open new tab')
    expect(getBrowserConflict('meta+w')).toBe('Close current tab')
    expect(getBrowserConflict('meta+q')).toBe('Quit browser (Mac)')
  })

  it('cross-platform: ctrl shortcut matches meta browser default', () => {
    // User types ctrl+q but on Mac the browser default is meta+q
    expect(getBrowserConflict('ctrl+q')).toBe('Quit browser (Mac)')
    expect(getBrowserConflict('ctrl+,')).toBe('Open preferences (Mac)')
  })

  it('cross-platform: meta shortcut matches ctrl browser default', () => {
    // User types meta+j but the list has ctrl+j = Open downloads
    expect(getBrowserConflict('meta+j')).toBe('Open downloads')
    expect(getBrowserConflict('meta+h')).not.toBeNull()
  })

  it('returns null for non-conflicting shortcuts', () => {
    expect(getBrowserConflict('ctrl+shift+k')).toBeNull()
    expect(getBrowserConflict('alt+z')).toBeNull()
    expect(getBrowserConflict('ctrl+shift+x')).toBeNull()
  })

  it('returns null for empty key', () => {
    expect(getBrowserConflict('')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(getBrowserConflict('CTRL+T')).toBe('Open new tab')
    expect(getBrowserConflict('Ctrl+Shift+T')).toBe('Reopen last closed tab')
  })
})

describe('BROWSER_DEFAULTS coverage', () => {
  it('has entries for common browser shortcuts', () => {
    const expectedKeys = [
      'ctrl+t', 'ctrl+w', 'ctrl+n', 'ctrl+l', 'ctrl+f',
      'ctrl+p', 'ctrl+h', 'ctrl+j', 'ctrl+d', 'f5', 'f12',
    ]
    for (const key of expectedKeys) {
      expect(BROWSER_DEFAULTS[key], `Missing: ${key}`).toBeDefined()
    }
  })

  it('has Mac equivalents for common shortcuts', () => {
    const macKeys = ['meta+t', 'meta+w', 'meta+n', 'meta+r', 'meta+f', 'meta+p']
    for (const key of macKeys) {
      expect(BROWSER_DEFAULTS[key], `Missing Mac: ${key}`).toBeDefined()
    }
  })
})

describe('detectConflicts', () => {
  it('detects browser conflicts', () => {
    const shortcuts: KeySetting[] = [
      { key: 'ctrl+t', action: 'newtab' },
      { key: 'ctrl+shift+k', action: 'javascript' },
    ]
    const conflicts = detectConflicts(shortcuts)

    // ctrl+t should conflict with browser default
    expect(conflicts.has(0)).toBe(true)
    const c0 = conflicts.get(0)!
    expect(c0).toHaveLength(1)
    expect(c0[0].type).toBe('browser')
    expect(c0[0].browserAction).toBe('Open new tab')

    // ctrl+shift+k should have no conflicts
    expect(conflicts.has(1)).toBe(false)
  })

  it('detects duplicate shortcuts', () => {
    const shortcuts: KeySetting[] = [
      { key: 'ctrl+b', action: 'newtab' },
      { key: 'ctrl+b', action: 'closetab' },
      { key: 'ctrl+shift+k', action: 'javascript' },
    ]
    const conflicts = detectConflicts(shortcuts)

    // Both ctrl+b entries should have duplicate warnings
    expect(conflicts.has(0)).toBe(true)
    expect(conflicts.has(1)).toBe(true)
    expect(conflicts.has(2)).toBe(false)

    const c0 = conflicts.get(0)!
    expect(c0.some((c) => c.type === 'duplicate')).toBe(true)
    expect(c0.find((c) => c.type === 'duplicate')!.duplicateIndices).toEqual([1])

    const c1 = conflicts.get(1)!
    expect(c1.find((c) => c.type === 'duplicate')!.duplicateIndices).toEqual([0])
  })

  it('detects duplicates with different modifier order', () => {
    const shortcuts: KeySetting[] = [
      { key: 'shift+ctrl+a', action: 'newtab' },
      { key: 'ctrl+shift+a', action: 'closetab' },
    ]
    const conflicts = detectConflicts(shortcuts)
    expect(conflicts.has(0)).toBe(true)
    expect(conflicts.has(1)).toBe(true)
    expect(conflicts.get(0)!.some((c) => c.type === 'duplicate')).toBe(true)
  })

  it('can have both browser and duplicate conflicts simultaneously', () => {
    const shortcuts: KeySetting[] = [
      { key: 'ctrl+t', action: 'newtab' },
      { key: 'ctrl+t', action: 'closetab' },
    ]
    const conflicts = detectConflicts(shortcuts)
    const c0 = conflicts.get(0)!
    expect(c0.length).toBe(2) // browser + duplicate
    expect(c0.some((c) => c.type === 'browser')).toBe(true)
    expect(c0.some((c) => c.type === 'duplicate')).toBe(true)
  })

  it('handles empty key gracefully', () => {
    const shortcuts: KeySetting[] = [
      { key: '', action: 'newtab' },
      { key: 'ctrl+b', action: 'closetab' },
    ]
    const conflicts = detectConflicts(shortcuts)
    expect(conflicts.has(0)).toBe(false)
  })

  it('returns empty map for no conflicts', () => {
    const shortcuts: KeySetting[] = [
      { key: 'ctrl+shift+1', action: 'newtab' },
      { key: 'ctrl+shift+2', action: 'closetab' },
    ]
    const conflicts = detectConflicts(shortcuts)
    expect(conflicts.size).toBe(0)
  })

  it('handles single shortcut with no conflicts', () => {
    const shortcuts: KeySetting[] = [{ key: 'alt+x', action: 'newtab' }]
    const conflicts = detectConflicts(shortcuts)
    expect(conflicts.size).toBe(0)
  })

  it('detects three-way duplicates', () => {
    const shortcuts: KeySetting[] = [
      { key: 'ctrl+b', action: 'newtab' },
      { key: 'ctrl+b', action: 'closetab' },
      { key: 'ctrl+b', action: 'reload' },
    ]
    const conflicts = detectConflicts(shortcuts)
    const c0 = conflicts.get(0)!
    const dup = c0.find((c) => c.type === 'duplicate')!
    expect(dup.duplicateIndices).toEqual([1, 2])
  })
})
