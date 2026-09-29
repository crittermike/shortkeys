import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DEFAULT_VIM_SETTINGS,
  VIM_LIMITS,
  isCustomized,
  normalizeVimSettings,
} from '../src/utils/vim-settings'

describe('vim-settings', () => {
  describe('normalizeVimSettings', () => {
    it('returns the defaults for missing input', () => {
      expect(normalizeVimSettings(undefined)).toEqual(DEFAULT_VIM_SETTINGS)
      expect(normalizeVimSettings(null)).toEqual(DEFAULT_VIM_SETTINGS)
      expect(normalizeVimSettings({})).toEqual(DEFAULT_VIM_SETTINGS)
    })

    it('ignores a non-object payload', () => {
      expect(normalizeVimSettings('nonsense')).toEqual(DEFAULT_VIM_SETTINGS)
      expect(normalizeVimSettings(42)).toEqual(DEFAULT_VIM_SETTINGS)
    })

    it('keeps valid values', () => {
      const result = normalizeVimSettings({
        hintChars: 'qwerty',
        hintMode: 'filter',
        smoothScroll: false,
        scrollStepSize: 250,
      })
      expect(result.hintChars).toBe('qwerty')
      expect(result.hintMode).toBe('filter')
      expect(result.smoothScroll).toBe(false)
      expect(result.scrollStepSize).toBe(250)
    })

    it('fills in fields the stored data is missing', () => {
      const result = normalizeVimSettings({ scrollStepSize: 42 })
      expect(result.scrollStepSize).toBe(42)
      expect(result.hintChars).toBe(DEFAULT_VIM_SETTINGS.hintChars)
      expect(result.hintDetection).toBe(DEFAULT_VIM_SETTINGS.hintDetection)
    })

    it('clamps numbers to their limits', () => {
      expect(normalizeVimSettings({ scrollStepSize: -5 }).scrollStepSize)
        .toBe(VIM_LIMITS.scrollStepSize.min)
      expect(normalizeVimSettings({ scrollStepSize: 99_999 }).scrollStepSize)
        .toBe(VIM_LIMITS.scrollStepSize.max)
      expect(normalizeVimSettings({ scrollDuration: 5000 }).scrollDuration)
        .toBe(VIM_LIMITS.scrollDuration.max)
    })

    it('rounds and rescues unparseable numbers', () => {
      expect(normalizeVimSettings({ scrollStepSize: 120.6 }).scrollStepSize).toBe(121)
      expect(normalizeVimSettings({ scrollStepSize: NaN }).scrollStepSize)
        .toBe(DEFAULT_VIM_SETTINGS.scrollStepSize)
      expect(normalizeVimSettings({ scrollStepSize: 'abc' as any }).scrollStepSize)
        .toBe(DEFAULT_VIM_SETTINGS.scrollStepSize)
    })

    it('accepts numbers stored as strings', () => {
      expect(normalizeVimSettings({ scrollStepSize: '300' as any }).scrollStepSize).toBe(300)
    })

    it('falls back for unknown enum values', () => {
      expect(normalizeVimSettings({ hintMode: 'wat' as any }).hintMode).toBe('chars')
      expect(normalizeVimSettings({ hintDetection: 'wat' as any }).hintDetection).toBe('thorough')
    })

    it('rejects non-boolean toggles', () => {
      expect(normalizeVimSettings({ smoothScroll: 'yes' as any }).smoothScroll)
        .toBe(DEFAULT_VIM_SETTINGS.smoothScroll)
    })

    it('rejects a blank hint alphabet', () => {
      expect(normalizeVimSettings({ hintChars: '   ' }).hintChars)
        .toBe(DEFAULT_VIM_SETTINGS.hintChars)
    })
  })

  describe('defaults', () => {
    it('matches the Vimium-C values we intentionally copied', () => {
      expect(DEFAULT_VIM_SETTINGS.scrollStepSize).toBe(100)
      expect(DEFAULT_VIM_SETTINGS.smoothScroll).toBe(true)
      // Vimium-C ships "sadjklewcmpgh"; Shortkeys keeps its historical extra "f".
      expect(DEFAULT_VIM_SETTINGS.hintChars).toBe('sadfjklewcmpgh')
    })
  })

  describe('isCustomized', () => {
    it('is false for the defaults', () => {
      expect(isCustomized({ ...DEFAULT_VIM_SETTINGS })).toBe(false)
    })

    it('is true once any field differs', () => {
      expect(isCustomized({ ...DEFAULT_VIM_SETTINGS, scrollStepSize: 101 })).toBe(true)
      expect(isCustomized({ ...DEFAULT_VIM_SETTINGS, hintMode: 'filter' })).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// Storage round-trip
//
// Mirrors tests/storage.test.ts: the wxt browser shim reads globalThis.chrome
// at import time, so the mock has to exist before the module is loaded.
// ---------------------------------------------------------------------------

let syncStore: Record<string, any> = {}
let localStore: Record<string, any> = {}

// @ts-ignore
globalThis.chrome = {
  storage: {
    sync: {
      get: vi.fn(async (key: string) => (key in syncStore ? { [key]: syncStore[key] } : {})),
      set: vi.fn(async (items: Record<string, any>) => { Object.assign(syncStore, items) }),
      remove: vi.fn(async () => {}),
    },
    local: {
      get: vi.fn(async (key: string) => (key in localStore ? { [key]: localStore[key] } : {})),
      set: vi.fn(async (items: Record<string, any>) => { Object.assign(localStore, items) }),
    },
    onChanged: { addListener: vi.fn() },
  },
}

const { saveVimSettings, loadVimSettings } = await import('../src/utils/storage')

describe('vim settings storage', () => {
  beforeEach(() => {
    syncStore = {}
    localStore = {}
  })

  it('round-trips through sync storage', async () => {
    const settings = { ...DEFAULT_VIM_SETTINGS, hintChars: 'jkl', scrollStepSize: 77 }

    await saveVimSettings(settings)
    expect(syncStore.vimSettings).toBeTruthy()
    // A local copy is kept as a backup, same as shortcuts.
    expect(localStore.vimSettings).toBe(syncStore.vimSettings)

    expect(await loadVimSettings()).toEqual(settings)
  })

  it('falls back to local when sync has nothing', async () => {
    localStore.vimSettings = JSON.stringify({ ...DEFAULT_VIM_SETTINGS, scrollStepSize: 33 })

    expect((await loadVimSettings()).scrollStepSize).toBe(33)
  })

  it('returns defaults when nothing is stored', async () => {
    expect(await loadVimSettings()).toEqual(DEFAULT_VIM_SETTINGS)
  })

  it('returns defaults when the stored JSON is corrupt', async () => {
    syncStore.vimSettings = '{not json'
    localStore.vimSettings = '{also not json'

    expect(await loadVimSettings()).toEqual(DEFAULT_VIM_SETTINGS)
  })

  it('normalizes whatever was stored', async () => {
    syncStore.vimSettings = JSON.stringify({ scrollStepSize: 99_999, hintMode: 'bogus' })

    const loaded = await loadVimSettings()
    expect(loaded.scrollStepSize).toBe(VIM_LIMITS.scrollStepSize.max)
    expect(loaded.hintMode).toBe('chars')
  })
})
