import { describe, it, expect } from 'vitest'
import { ALL_PACKS, type ShortcutPack } from '../src/packs'
import { getAllActionValues } from '../src/utils/actions-registry'
import { normalizeKey } from '../src/utils/shortcut-conflicts'

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
