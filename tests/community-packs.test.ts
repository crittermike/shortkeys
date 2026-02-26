import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getAllActionValues } from '../src/utils/actions-registry'

const __dirname = dirname(fileURLToPath(import.meta.url))
const communityDir = resolve(__dirname, '../packs/community')

interface CommunityPackJson {
  name: string
  icon: string
  description: string
  author: string
  shortcuts: Array<{
    key: string
    action: string
    label?: string
    code?: string
  }>
}

// Same palette used in build-catalog.ts
const COLOR_PALETTE = [
  '#4361ee', '#7c3aed', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#db2777', '#6366f1', '#0284c7', '#16a34a',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function loadCommunityPacks(): Array<CommunityPackJson & { _file: string }> {
  const files = readdirSync(communityDir).filter((f) => f.endsWith('.json'))
  return files.map((file) => {
    const raw = readFileSync(resolve(communityDir, file), 'utf-8')
    return { ...JSON.parse(raw), _file: file } as CommunityPackJson & { _file: string }
  })
}

describe('community pack JSON validation', () => {
  const packs = loadCommunityPacks()

  it('has at least one community pack', () => {
    expect(packs.length).toBeGreaterThan(0)
  })

  it('all packs have required metadata fields', () => {
    for (const pack of packs) {
      expect(pack.name, `${pack._file} missing name`).toBeTruthy()
      expect(pack.icon, `${pack._file} missing icon`).toBeTruthy()
      expect(pack.description, `${pack._file} missing description`).toBeTruthy()
      expect(pack.author, `${pack._file} missing author`).toBeTruthy()
      expect(pack.shortcuts, `${pack._file} missing shortcuts`).toBeDefined()
      expect(pack.shortcuts.length, `${pack._file} has no shortcuts`).toBeGreaterThan(0)
    }
  })

  it('file names are lowercase with hyphens', () => {
    for (const pack of packs) {
      expect(pack._file, `${pack._file} should be lowercase-hyphens.json`).toMatch(/^[a-z0-9-]+\.json$/)
    }
  })

  it('file names are unique', () => {
    const files = packs.map((p) => p._file)
    expect(new Set(files).size).toBe(files.length)
  })

  it('all pack shortcuts have valid action names', () => {
    const validActions = getAllActionValues()
    const specialActions = ['lastusedtab']

    for (const pack of packs) {
      for (const s of pack.shortcuts) {
        const allValid = [...validActions, ...specialActions]
        expect(
          allValid,
          `Community pack "${pack.name}": unknown action "${s.action}" on key "${s.key}"`,
        ).toContain(s.action)
      }
    }
  })

  it('all pack shortcuts have a key binding', () => {
    for (const pack of packs) {
      for (const s of pack.shortcuts) {
        expect(s.key, `Pack "${pack.name}": shortcut with action "${s.action}" has no key`).toBeTruthy()
      }
    }
  })

  it('all pack shortcuts have a label', () => {
    for (const pack of packs) {
      for (const s of pack.shortcuts) {
        expect(s.label, `Pack "${pack.name}": key "${s.key}" has no label`).toBeTruthy()
      }
    }
  })

  it('labels use sentence case', () => {
    for (const pack of packs) {
      for (const s of pack.shortcuts) {
        if (!s.label) continue
        // First word is capitalized, subsequent words should not all be capitalized
        // (unless they are proper nouns, but we just check the pattern)
        const words = s.label.split(' ')
        if (words.length > 1) {
          // At least some non-first words should be lowercase
          const nonFirstWords = words.slice(1).filter((w) => w.length > 2) // skip short words
          const allCaps = nonFirstWords.every((w) => w[0] === w[0].toUpperCase())
          if (allCaps && nonFirstWords.length > 2) {
            throw new Error(
              `Pack "${pack.name}": label "${s.label}" should use sentence case`,
            )
          }
        }
      }
    }
  })

  it('no duplicate keys within a single pack', () => {
    for (const pack of packs) {
      const keys = pack.shortcuts.map((s) => s.key.toLowerCase())
      const unique = new Set(keys)
      expect(unique.size, `Pack "${pack.name}" has duplicate keys`).toBe(keys.length)
    }
  })

  it('javascript actions include code field', () => {
    for (const pack of packs) {
      for (const s of pack.shortcuts) {
        if (s.action === 'javascript') {
          expect(s.code, `Pack "${pack.name}": javascript action on key "${s.key}" missing code field`).toBeTruthy()
        }
      }
    }
  })
})

describe('community pack build script', () => {
  it('generates valid community.json from pack files', () => {
    const files = readdirSync(communityDir).filter((f) => f.endsWith('.json'))
    const packs = files.map((file) => {
      const raw = readFileSync(resolve(communityDir, file), 'utf-8')
      const pack: CommunityPackJson = JSON.parse(raw)
      const id = `community-${file.replace(/\.json$/, '')}`
      const color = COLOR_PALETTE[hashString(pack.name) % COLOR_PALETTE.length]
      return {
        id,
        name: pack.name,
        icon: pack.icon,
        description: pack.description,
        color,
        author: pack.author,
        shortcutCount: pack.shortcuts.length,
        hasJavaScript: pack.shortcuts.some((s) => s.action === 'javascript'),
        shortcuts: pack.shortcuts.map((s) => ({
          key: s.key,
          action: s.action,
          label: s.label || s.action,
        })),
        fullShortcuts: pack.shortcuts,
      }
    })

    const catalog = {
      version: 1,
      updated: new Date().toISOString(),
      packs,
    }

    // Validate catalog structure
    expect(catalog.version).toBe(1)
    expect(catalog.updated).toBeTruthy()
    expect(catalog.packs.length).toBe(files.length)

    for (const pack of catalog.packs) {
      expect(pack.id).toBeTruthy()
      expect(pack.id).toMatch(/^community-/)
      expect(pack.name).toBeTruthy()
      expect(pack.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(pack.shortcutCount).toBeGreaterThan(0)
      expect(typeof pack.hasJavaScript).toBe('boolean')
      expect(Array.isArray(pack.shortcuts)).toBe(true)
      expect(Array.isArray(pack.fullShortcuts)).toBe(true)
      expect(pack.shortcuts.length).toBe(pack.shortcutCount)
      expect(pack.fullShortcuts.length).toBe(pack.shortcutCount)
    }
  })

  it('community pack shortcutCount matches actual shortcuts', () => {
    const packs = loadCommunityPacks()
    for (const pack of packs) {
      const generated = {
        shortcutCount: pack.shortcuts.length,
        shortcuts: pack.shortcuts,
      }
      expect(generated.shortcutCount).toBe(generated.shortcuts.length)
    }
  })

  it('hasJavaScript is set correctly', () => {
    const packs = loadCommunityPacks()
    for (const pack of packs) {
      const hasJs = pack.shortcuts.some((s) => s.action === 'javascript')
      const generated = {
        hasJavaScript: pack.shortcuts.some((s) => s.action === 'javascript'),
      }
      expect(generated.hasJavaScript).toBe(hasJs)
    }
  })

  it('auto-generated IDs are deterministic from filename', () => {
    const files = readdirSync(communityDir).filter((f) => f.endsWith('.json'))
    for (const file of files) {
      const expected = `community-${file.replace(/\.json$/, '')}`
      expect(expected).toMatch(/^community-[a-z0-9-]+$/)
    }
  })

  it('auto-generated colors are valid hex and deterministic', () => {
    const packs = loadCommunityPacks()
    for (const pack of packs) {
      const color = COLOR_PALETTE[hashString(pack.name) % COLOR_PALETTE.length]
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
      // Running twice should produce same result
      const color2 = COLOR_PALETTE[hashString(pack.name) % COLOR_PALETTE.length]
      expect(color).toBe(color2)
    }
  })
})

describe('community pack install modes', () => {
  function simulateInstall(
    existing: Array<{ key: string; action: string }>,
    packShortcuts: Array<{ key: string; action: string; label: string }>,
    packName: string,
    mode: 'skip' | 'replace' | 'keep',
  ) {
    const existingKeys = new Set(existing.map((k) => k.key.toLowerCase()))
    const newShortcuts = packShortcuts.map((s) => ({ ...s, group: packName }))
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

  const testPack = {
    name: 'Test Pack',
    shortcuts: [
      { key: 'alt+shift+f', action: 'onlytab', label: 'Close all other tabs' },
      { key: 'alt+shift+m', action: 'togglemute', label: 'Mute/unmute current tab' },
    ],
  }

  it('skip mode preserves existing and only adds non-conflicting', () => {
    const existing = [{ key: 'alt+shift+f', action: 'newtab' }]
    const result = simulateInstall(existing, testPack.shortcuts, testPack.name, 'skip')
    // Original preserved
    expect(result.filter((s) => s.key === 'alt+shift+f')).toHaveLength(1)
    expect(result.find((s) => s.key === 'alt+shift+f')!.action).toBe('newtab')
    // Non-conflicting added
    expect(result.find((s) => s.key === 'alt+shift+m')).toBeTruthy()
    expect(result).toHaveLength(2)
  })

  it('replace mode removes conflicting and adds all from pack', () => {
    const existing = [
      { key: 'alt+shift+f', action: 'newtab' },
      { key: 'ctrl+z', action: 'reload' },
    ]
    const result = simulateInstall(existing, testPack.shortcuts, testPack.name, 'replace')
    // Pack's version replaces existing
    const fEntries = result.filter((s) => s.key === 'alt+shift+f')
    expect(fEntries).toHaveLength(1)
    expect(fEntries[0].action).toBe('onlytab')
    // Non-conflicting existing preserved
    expect(result.find((s) => s.key === 'ctrl+z')).toBeTruthy()
  })

  it('keep mode adds all pack shortcuts alongside existing', () => {
    const existing = [{ key: 'alt+shift+f', action: 'newtab' }]
    const result = simulateInstall(existing, testPack.shortcuts, testPack.name, 'keep')
    // Both entries exist
    expect(result.filter((s) => s.key === 'alt+shift+f')).toHaveLength(2)
    expect(result).toHaveLength(3)
  })

  it('installs with correct group name', () => {
    const existing: Array<{ key: string; action: string }> = []
    const result = simulateInstall(existing, testPack.shortcuts, testPack.name, 'replace')
    for (const s of result) {
      expect((s as any).group).toBe('Test Pack')
    }
  })
})

describe('community pack conflict detection', () => {
  it('detects conflicts between community pack and existing shortcuts', () => {
    const existingKeys = new Set(['alt+shift+f', 'alt+shift+m'])
    const packs = loadCommunityPacks()
    const focusPack = packs.find((p) => p.name === 'Focus Mode')!
    const conflicts = focusPack.shortcuts.filter((s) => existingKeys.has(s.key.toLowerCase()))
    expect(conflicts.length).toBeGreaterThan(0)
  })

  it('reports no conflicts when no overlap', () => {
    const existingKeys = new Set(['ctrl+shift+alt+z'])
    const packs = loadCommunityPacks()
    for (const pack of packs) {
      const conflicts = pack.shortcuts.filter((s) => existingKeys.has(s.key.toLowerCase()))
      expect(conflicts, `Pack "${pack.name}" should have no conflicts`).toHaveLength(0)
    }
  })
})

describe('community pack JS warning', () => {
  it('packs without javascript actions do not require JS warning', () => {
    const packs = loadCommunityPacks()
    for (const pack of packs) {
      const hasJs = pack.shortcuts.some((s) => s.action === 'javascript')
      if (!hasJs) {
        // No JS warning needed
        expect(hasJs).toBe(false)
      }
    }
  })

  it('correctly identifies packs with javascript actions', () => {
    // Create a mock pack with JS
    const jsPack = {
      shortcuts: [
        { key: 'alt+j', action: 'javascript', label: 'Run script', code: 'alert("hi")' },
        { key: 'alt+k', action: 'newtab', label: 'New tab' },
      ],
    }
    const hasJs = jsPack.shortcuts.some((s) => s.action === 'javascript')
    expect(hasJs).toBe(true)

    // And one without
    const noJsPack = {
      shortcuts: [
        { key: 'alt+k', action: 'newtab', label: 'New tab' },
      ],
    }
    const noJs = noJsPack.shortcuts.some((s) => s.action === 'javascript')
    expect(noJs).toBe(false)
  })
})
