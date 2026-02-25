import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSyncGet = vi.fn()
const mockSyncSet = vi.fn()
const mockLocalGet = vi.fn()
const mockLocalSet = vi.fn()
const mockOnChanged = vi.fn()
const mockWriteText = vi.fn().mockResolvedValue(undefined)

// @ts-ignore
globalThis.chrome = {
  storage: {
    sync: { get: mockSyncGet, set: mockSyncSet },
    local: { get: mockLocalGet, set: mockLocalSet },
    onChanged: { addListener: mockOnChanged },
  },
}

// @ts-ignore
globalThis.Blob = class Blob {
  constructor(public parts: any[]) {}
  get size() { return this.parts.join('').length }
}

Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: mockWriteText } },
  writable: true,
  configurable: true,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockSyncGet.mockResolvedValue({})
  mockSyncSet.mockResolvedValue(undefined)
  mockLocalGet.mockResolvedValue({})
  mockLocalSet.mockResolvedValue(undefined)
})

describe('autosave on import (#710)', () => {
  describe('useImportExport.importKeys', () => {
    it('saves to storage after importing JSON shortcuts', async () => {
      const { useImportExport } = await import('../src/composables/useImportExport')
      const { importJson, importKeys } = useImportExport()

      importJson.value = JSON.stringify([
        { key: 'ctrl+b', action: 'newtab' },
        { key: 'ctrl+d', action: 'closetab' },
      ])

      await importKeys()

      // saveKeys should have been called (sync.set or local.set)
      const setCalled = mockSyncSet.mock.calls.length > 0 || mockLocalSet.mock.calls.length > 0
      expect(setCalled).toBe(true)
    })

    it('does not save when JSON is invalid', async () => {
      const { useImportExport } = await import('../src/composables/useImportExport')
      const { importJson, importKeys } = useImportExport()

      importJson.value = 'not valid json!!!'

      await importKeys()

      expect(mockSyncSet).not.toHaveBeenCalled()
      expect(mockLocalSet).not.toHaveBeenCalled()
    })

    it('saves imported shortcuts that can be loaded back', async () => {
      const { useImportExport } = await import('../src/composables/useImportExport')
      const { useShortcuts } = await import('../src/composables/useShortcuts')
      const { importJson, importKeys } = useImportExport()
      const { keys } = useShortcuts()

      // Start fresh
      keys.value = []

      importJson.value = JSON.stringify([
        { key: 'alt+1', action: 'scrolldown' },
      ])

      await importKeys()

      // Verify shortcuts were added to keys
      expect(keys.value.length).toBe(1)
      expect(keys.value[0].key).toBe('alt+1')
      expect(keys.value[0].action).toBe('scrolldown')

      // Verify storage was written
      const setCalled = mockSyncSet.mock.calls.length > 0 || mockLocalSet.mock.calls.length > 0
      expect(setCalled).toBe(true)
    })
  })

  describe('usePacks.installPack', () => {
    it('saves to storage after installing a pack', async () => {
      const { usePacks } = await import('../src/composables/usePacks')
      const { useShortcuts } = await import('../src/composables/useShortcuts')
      const { installPack } = usePacks()
      const { keys } = useShortcuts()

      // Start fresh
      keys.value = []

      await installPack({
        id: 'test-pack',
        name: 'Test Pack',
        description: 'A test pack',
        shortcuts: [
          { key: 'j', action: 'scrolldown' },
          { key: 'k', action: 'scrollup' },
        ],
      })

      // Verify shortcuts were added
      expect(keys.value.length).toBe(2)
      expect(keys.value[0].group).toBe('Test Pack')

      // Verify storage was written
      const setCalled = mockSyncSet.mock.calls.length > 0 || mockLocalSet.mock.calls.length > 0
      expect(setCalled).toBe(true)
    })

    it('saves to storage after installing a pack with conflict mode skip', async () => {
      const { usePacks } = await import('../src/composables/usePacks')
      const { useShortcuts } = await import('../src/composables/useShortcuts')
      const { installPack, packConflictMode } = usePacks()
      const { keys } = useShortcuts()

      // Existing shortcut
      keys.value = [{ key: 'j', action: 'newtab', id: 'existing' } as any]
      packConflictMode.value = 'skip'

      vi.clearAllMocks()
      mockSyncSet.mockResolvedValue(undefined)
      mockLocalSet.mockResolvedValue(undefined)

      await installPack({
        id: 'vim-pack',
        name: 'Vim',
        description: 'Vim navigation',
        shortcuts: [
          { key: 'j', action: 'scrolldown' },
          { key: 'k', action: 'scrollup' },
        ],
      })

      // j should be skipped (conflict), only k added
      expect(keys.value.length).toBe(2)
      expect(keys.value[0].action).toBe('newtab') // original kept
      expect(keys.value[1].key).toBe('k')

      // Still saves
      const setCalled = mockSyncSet.mock.calls.length > 0 || mockLocalSet.mock.calls.length > 0
      expect(setCalled).toBe(true)
    })
  })
})
