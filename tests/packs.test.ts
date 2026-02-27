import { describe, it, expect } from 'vitest'
import { ALL_PACKS, type ShortcutPack } from '../src/packs'
import { getAllActionValues } from '../src/utils/actions-registry'
import { normalizeKey, couldSiteFiltersOverlap } from '../src/utils/shortcut-conflicts'
import type { KeySetting } from '../src/utils/url-matching'

describe('shortcut packs', () => {
  it('all packs have required metadata', () => {
    for (const pack of ALL_PACKS) {
      expect(pack.id, `${pack.name} missing id`).toBeTruthy()
      expect(pack.name, `${pack.id} missing name`).toBeTruthy()
      expect(pack.icon, `${pack.id} missing icon`).toBeTruthy()
      expect(pack.description, `${pack.id} missing description`).toBeTruthy()
      expect(pack.color, `${pack.id} missing color`).toBeTruthy()
      expect(pack.shortcuts.length, `${pack.id} has no shortcuts`).toBeGreaterThan(0)
    }
  })

  it('all pack IDs are unique', () => {
    const ids = ALL_PACKS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all pack shortcuts have valid action names', () => {
    const validActions = getAllActionValues()
    // Special actions handled outside the registry
    const specialActions = ['lastusedtab']

    for (const pack of ALL_PACKS) {
      for (const s of pack.shortcuts) {
        const allValid = [...validActions, ...specialActions]
        expect(allValid, `Pack "${pack.name}": unknown action "${s.action}" on key "${s.key}"`).toContain(s.action)
      }
    }
  })

  it('all pack shortcuts have a key binding', () => {
    for (const pack of ALL_PACKS) {
      for (const s of pack.shortcuts) {
        expect(s.key, `Pack "${pack.name}": shortcut with action "${s.action}" has no key`).toBeTruthy()
      }
    }
  })

  it('all pack shortcuts have a label', () => {
    for (const pack of ALL_PACKS) {
      for (const s of pack.shortcuts) {
        expect(s.label, `Pack "${pack.name}": key "${s.key}" has no label`).toBeTruthy()
      }
    }
  })

  it('no duplicate keys within a single pack', () => {
    for (const pack of ALL_PACKS) {
      const keys = pack.shortcuts.map((s) => normalizeKey(s.key))
      const unique = new Set(keys)
      expect(unique.size, `Pack "${pack.name}" has duplicate keys`).toBe(keys.length)
    }
  })

  it('pack installation creates correct group name', () => {
    for (const pack of ALL_PACKS) {
      const installed = pack.shortcuts.map((s) => ({ ...s, group: pack.name }))
      for (const s of installed) {
        expect(s.group).toBe(pack.name)
      }
    }
  })
})

  it('no shortcuts use impossible double-shift combos like shift+?', () => {
    // ? is shift+/, so alt+shift+? means alt+shift+shift+/ which is impossible
    for (const pack of ALL_PACKS) {
      for (const s of pack.shortcuts) {
        const parts = s.key.toLowerCase().split('+')
        const hasShift = parts.includes('shift')
        // Characters that already require shift: ? ! @ # $ % ^ & * ( ) _ + { } | : " < > ~
        const shiftChars = ['?', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '{', '}', '|', ':', '"', '<', '>', '~']
        const lastPart = parts[parts.length - 1]
        if (hasShift && shiftChars.includes(lastPart)) {
          throw new Error(`Pack "${pack.name}": key "${s.key}" uses shift+${lastPart} which is an impossible double-shift combo (${lastPart} already requires shift)`)
        }
      }
    }
  })

describe('pack conflict detection', () => {
  it('detects conflicts between pack and existing shortcuts', () => {
    const existingKeys = new Set(['j', 'k', 'ctrl+b'])
    const vimPack = ALL_PACKS.find((p) => p.id === 'vim')!
    const conflicts = vimPack.shortcuts.filter((s) => existingKeys.has(s.key.toLowerCase()))
    expect(conflicts.length).toBeGreaterThan(0)
    expect(conflicts.some((c) => c.key === 'j')).toBe(true)
  })

  it('reports no conflicts when no overlap', () => {
    const existingKeys = new Set(['ctrl+shift+alt+z'])
    const pack = ALL_PACKS[0]
    const conflicts = pack.shortcuts.filter((s) => existingKeys.has(s.key.toLowerCase()))
    expect(conflicts).toHaveLength(0)
  })
})

describe('pack install modes', () => {
  function simulateInstall(
    existing: Array<{ key: string; action: string }>,
    pack: ShortcutPack,
    mode: 'skip' | 'replace' | 'keep',
  ) {
    const existingKeys = new Set(existing.map((k) => k.key.toLowerCase()))
    const newShortcuts = pack.shortcuts.map((s) => ({ ...s, group: pack.name }))
    let result = [...existing]

    if (mode === 'skip') {
      const toAdd = newShortcuts.filter((s) => !existingKeys.has(s.key.toLowerCase()))
      result.push(...toAdd)
    } else if (mode === 'replace') {
      const packKeys = new Set(newShortcuts.map((s) => s.key.toLowerCase()))
      result = result.filter((k) => !packKeys.has(k.key.toLowerCase()))
      result.push(...newShortcuts)
    } else {
      result.push(...newShortcuts)
    }

    return result
  }

  const vimPack = ALL_PACKS.find((p) => p.id === 'vim')!

  it('skip mode preserves existing and only adds non-conflicting', () => {
    const existing = [{ key: 'j', action: 'newtab' }]
    const result = simulateInstall(existing, vimPack, 'skip')
    // Original 'j' preserved
    expect(result.filter((s) => s.key === 'j')).toHaveLength(1)
    expect(result.find((s) => s.key === 'j')!.action).toBe('newtab')
    // Other vim shortcuts added
    expect(result.length).toBeGreaterThan(1)
  })

  it('replace mode removes conflicting and adds all from pack', () => {
    const existing = [{ key: 'j', action: 'newtab' }, { key: 'ctrl+z', action: 'reload' }]
    const result = simulateInstall(existing, vimPack, 'replace')
    // Pack's 'j' replaces existing
    const jEntries = result.filter((s) => s.key === 'j')
    expect(jEntries).toHaveLength(1)
    expect(jEntries[0].action).toBe('scrolldown') // vim's j = scrolldown
    // Non-conflicting existing preserved
    expect(result.find((s) => s.key === 'ctrl+z')).toBeTruthy()
  })

  it('keep mode adds all pack shortcuts alongside existing', () => {
    const existing = [{ key: 'j', action: 'newtab' }]
    const result = simulateInstall(existing, vimPack, 'keep')
    // Both j entries exist
    const jEntries = result.filter((s) => s.key === 'j')
    expect(jEntries).toHaveLength(2)
  })
})

describe('pack install auto-drop exact duplicates', () => {
  function simulateInstallWithAutoDrop(
    existing: Array<{ key: string; action: string }>,
    packShortcuts: Array<{ key: string; action: string; label: string }>,
    mode: 'skip' | 'replace' | 'keep',
  ) {
    // Simulate the auto-drop logic from usePacks.ts
    const nonExact = packShortcuts.filter((ps) => {
      const existingMatch = existing.find(
        (e) => normalizeKey(e.key) === normalizeKey(ps.key) && e.action === ps.action,
      )
      return !existingMatch
    })

    const existingKeys = new Set(existing.map((k) => normalizeKey(k.key)))
    let result = [...existing]

    if (mode === 'skip') {
      const toAdd = nonExact.filter((s) => !existingKeys.has(normalizeKey(s.key)))
      result.push(...toAdd)
    } else if (mode === 'replace') {
      const packKeys = new Set(nonExact.map((s) => normalizeKey(s.key)))
      result = result.filter((k) => !packKeys.has(normalizeKey(k.key)))
      result.push(...nonExact)
    } else {
      result.push(...nonExact)
    }

    return { result, droppedCount: packShortcuts.length - nonExact.length }
  }

  it('drops exact duplicates (same key + same action) in replace mode', () => {
    const existing = [{ key: 'j', action: 'scrolldown' }]
    const packShortcuts = [
      { key: 'j', action: 'scrolldown', label: 'Scroll down' },
      { key: 'k', action: 'scrollup', label: 'Scroll up' },
    ]
    const { result, droppedCount } = simulateInstallWithAutoDrop(existing, packShortcuts, 'replace')
    expect(droppedCount).toBe(1) // j+scrolldown was exact duplicate
    // Original j preserved (not replaced, since the duplicate was dropped)
    expect(result.filter((s) => s.key === 'j')).toHaveLength(1)
    // k was still added
    expect(result.some((s) => s.key === 'k')).toBe(true)
  })

  it('drops exact duplicates in skip mode', () => {
    const existing = [{ key: 'j', action: 'scrolldown' }]
    const packShortcuts = [
      { key: 'j', action: 'scrolldown', label: 'Scroll down' },
      { key: 'k', action: 'scrollup', label: 'Scroll up' },
    ]
    const { result, droppedCount } = simulateInstallWithAutoDrop(existing, packShortcuts, 'skip')
    expect(droppedCount).toBe(1)
    expect(result.filter((s) => s.key === 'j')).toHaveLength(1)
    expect(result.some((s) => s.key === 'k')).toBe(true)
  })

  it('drops exact duplicates in keep mode', () => {
    const existing = [{ key: 'j', action: 'scrolldown' }]
    const packShortcuts = [
      { key: 'j', action: 'scrolldown', label: 'Scroll down' },
      { key: 'k', action: 'scrollup', label: 'Scroll up' },
    ]
    const { result, droppedCount } = simulateInstallWithAutoDrop(existing, packShortcuts, 'keep')
    expect(droppedCount).toBe(1)
    // Original j preserved, duplicate not added
    expect(result.filter((s) => s.key === 'j')).toHaveLength(1)
    expect(result.some((s) => s.key === 'k')).toBe(true)
  })

  it('does NOT drop shortcuts with same key but different action', () => {
    const existing = [{ key: 'j', action: 'newtab' }]
    const packShortcuts = [
      { key: 'j', action: 'scrolldown', label: 'Scroll down' },
    ]
    const { result, droppedCount } = simulateInstallWithAutoDrop(existing, packShortcuts, 'replace')
    expect(droppedCount).toBe(0)
    // In replace mode, pack version replaces existing
    expect(result.find((s) => s.key === 'j')!.action).toBe('scrolldown')
  })

  it('drops multiple exact duplicates', () => {
    const existing = [
      { key: 'j', action: 'scrolldown' },
      { key: 'k', action: 'scrollup' },
    ]
    const packShortcuts = [
      { key: 'j', action: 'scrolldown', label: 'Scroll down' },
      { key: 'k', action: 'scrollup', label: 'Scroll up' },
      { key: 'g g', action: 'scrolltop', label: 'Scroll to top' },
    ]
    const { result, droppedCount } = simulateInstallWithAutoDrop(existing, packShortcuts, 'replace')
    expect(droppedCount).toBe(2)
    // Only g g was actually added
    expect(result.some((s) => s.key === 'g g')).toBe(true)
    expect(result.filter((s) => s.key === 'j')).toHaveLength(1)
    expect(result.filter((s) => s.key === 'k')).toHaveLength(1)
  })
})
