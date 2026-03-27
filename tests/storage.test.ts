import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSyncGet = vi.fn()
const mockSyncSet = vi.fn()
const mockSyncRemove = vi.fn()
const mockLocalGet = vi.fn()
const mockLocalSet = vi.fn()
const mockOnChanged = vi.fn()

// @ts-ignore
globalThis.chrome = {
  storage: {
    sync: { get: mockSyncGet, set: mockSyncSet, remove: mockSyncRemove },
    local: { get: mockLocalGet, set: mockLocalSet },
    onChanged: { addListener: mockOnChanged },
  },
}
// @ts-ignore
globalThis.Blob = class Blob {
  constructor(public parts: any[]) {}
  get size() { return this.parts.join('').length }
}

const { saveKeys, loadKeys, migrateLocalToSync, onKeysChanged } = await import('../src/utils/storage')

beforeEach(() => {
  vi.clearAllMocks()
  mockSyncGet.mockResolvedValue({})
  mockSyncSet.mockResolvedValue(undefined)
  mockSyncRemove.mockResolvedValue(undefined)
  mockLocalGet.mockResolvedValue({})
  mockLocalSet.mockResolvedValue(undefined)
})

describe('saveKeys', () => {
  it('saves to sync in chunked format when data fits', async () => {
    const keys = [{ key: 'ctrl+b', action: 'newtab' }]
    const result = await saveKeys(keys)

    expect(result).toBe('sync')
    // Should save chunked: keys_meta + keys_0
    expect(mockSyncSet).toHaveBeenCalledWith(
      expect.objectContaining({ keys_meta: 1, keys_0: JSON.stringify(keys) })
    )
    // Also saves local backup
    expect(mockLocalSet).toHaveBeenCalledWith({ keys: JSON.stringify(keys) })
  })

  it('splits large data into multiple chunks', async () => {
    // Create data larger than 7,000 chars but under 102KB
    const keys = Array.from({ length: 50 }, (_, i) => ({
      key: `ctrl+${i}`, action: 'javascript', code: 'x'.repeat(200), label: `Shortcut ${i}`
    }))
    const json = JSON.stringify(keys)
    expect(json.length).toBeGreaterThan(7000)

    const result = await saveKeys(keys)

    expect(result).toBe('sync')
    const setCall = mockSyncSet.mock.calls[0][0]
    expect(setCall.keys_meta).toBeGreaterThan(1)
    // Reassemble chunks should equal original JSON
    let reassembled = ''
    for (let i = 0; i < setCall.keys_meta; i++) {
      expect(setCall[`keys_${i}`]).toBeDefined()
      expect(setCall[`keys_${i}`].length).toBeLessThanOrEqual(7000)
      reassembled += setCall[`keys_${i}`]
    }
    expect(reassembled).toBe(json)
  })

  it('cleans up legacy "keys" entry and excess chunks after saving', async () => {
    const keys = [{ key: 'a', action: 'newtab' }]
    await saveKeys(keys)

    expect(mockSyncRemove).toHaveBeenCalledWith(
      expect.arrayContaining(['keys'])
    )
  })

  it('falls back to local when sync fails', async () => {
    mockSyncSet.mockRejectedValue(new Error('quota exceeded'))
    const keys = [{ key: 'a', action: 'newtab' }]
    const result = await saveKeys(keys)

    expect(result).toBe('local')
    expect(mockLocalSet).toHaveBeenCalledWith({ keys: JSON.stringify(keys) })
  })

  it('falls back to local when data is too large for sync', async () => {
    // Create data larger than 100KB
    const bigCode = 'x'.repeat(110_000)
    const keys = [{ key: 'a', action: 'javascript', code: bigCode }]
    const result = await saveKeys(keys)

    expect(result).toBe('local')
    expect(mockSyncSet).not.toHaveBeenCalled()
    expect(mockLocalSet).toHaveBeenCalled()
  })

  it('throws when both sync and local fail', async () => {
    mockSyncSet.mockRejectedValue(new Error('sync unavailable'))
    mockLocalSet.mockRejectedValue(new Error('local write failed'))
    const keys = [{ key: 'a', action: 'newtab' }]

    await expect(saveKeys(keys)).rejects.toThrow('Failed to save shortcuts to any storage area')
  })

  it('logs errors to console.error on sync failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSyncSet.mockRejectedValue(new Error('quota exceeded'))
    const keys = [{ key: 'a', action: 'newtab' }]
    await saveKeys(keys)

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Shortkeys] Sync save failed'),
      expect.any(Error)
    )
    consoleSpy.mockRestore()
  })

  it('clears all sync data when falling back to local', async () => {
    mockSyncSet.mockRejectedValue(new Error('quota exceeded'))
    const keys = [{ key: 'a', action: 'newtab' }]
    await saveKeys(keys)

    // Should clear legacy key, meta, and chunk keys
    expect(mockSyncRemove).toHaveBeenCalledWith(
      expect.arrayContaining(['keys', 'keys_meta', 'keys_0'])
    )
    expect(mockLocalSet).toHaveBeenCalledWith({ keys: JSON.stringify(keys) })
  })

  it('clears all sync data when data is too large for sync', async () => {
    const bigCode = 'x'.repeat(110_000)
    const keys = [{ key: 'a', action: 'javascript', code: bigCode }]
    await saveKeys(keys)

    expect(mockSyncRemove).toHaveBeenCalledWith(
      expect.arrayContaining(['keys', 'keys_meta'])
    )
    expect(mockLocalSet).toHaveBeenCalled()
  })

  it('still saves to local if sync.remove fails during cleanup', async () => {
    mockSyncSet.mockRejectedValue(new Error('quota exceeded'))
    mockSyncRemove.mockRejectedValue(new Error('remove failed'))
    const keys = [{ key: 'a', action: 'newtab' }]
    const result = await saveKeys(keys)

    expect(result).toBe('local')
    expect(mockLocalSet).toHaveBeenCalledWith({ keys: JSON.stringify(keys) })
  })
})

describe('loadKeys', () => {
  it('loads from sync chunked format', async () => {
    const json = '[{"key":"a"}]'
    mockSyncGet.mockImplementation((keys: any) => {
      if (keys === 'keys_meta') return Promise.resolve({ keys_meta: 1 })
      if (Array.isArray(keys) && keys.includes('keys_0')) return Promise.resolve({ keys_0: json })
      return Promise.resolve({})
    })
    const result = await loadKeys()

    expect(result).toBe(json)
  })

  it('loads from sync chunked format with multiple chunks', async () => {
    const chunk0 = '[{"key":"a"},'
    const chunk1 = '{"key":"b"}]'
    mockSyncGet.mockImplementation((keys: any) => {
      if (keys === 'keys_meta') return Promise.resolve({ keys_meta: 2 })
      if (Array.isArray(keys)) return Promise.resolve({ keys_0: chunk0, keys_1: chunk1 })
      return Promise.resolve({})
    })
    const result = await loadKeys()

    expect(result).toBe(chunk0 + chunk1)
  })

  it('falls back to legacy single "keys" format if no chunks', async () => {
    mockSyncGet.mockImplementation((keys: any) => {
      if (keys === 'keys_meta') return Promise.resolve({})
      if (keys === 'keys') return Promise.resolve({ keys: '[{"key":"legacy"}]' })
      return Promise.resolve({})
    })
    const result = await loadKeys()

    expect(result).toBe('[{"key":"legacy"}]')
  })

  it('falls back to local if sync is empty', async () => {
    mockSyncGet.mockResolvedValue({})
    mockLocalGet.mockResolvedValue({ keys: '[{"key":"b"}]' })
    const result = await loadKeys()

    expect(result).toBe('[{"key":"b"}]')
  })

  it('falls back to local if sync throws', async () => {
    mockSyncGet.mockRejectedValue(new Error('sync unavailable'))
    mockLocalGet.mockResolvedValue({ keys: '[{"key":"c"}]' })
    const result = await loadKeys()

    expect(result).toBe('[{"key":"c"}]')
  })

  it('returns undefined if no data anywhere', async () => {
    mockSyncGet.mockResolvedValue({})
    mockLocalGet.mockResolvedValue({})
    const result = await loadKeys()

    expect(result).toBeUndefined()
  })

  it('returns undefined and logs error if both sync and local throw', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSyncGet.mockRejectedValue(new Error('sync unavailable'))
    mockLocalGet.mockRejectedValue(new Error('local unavailable'))
    const result = await loadKeys()

    expect(result).toBeUndefined()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Shortkeys] Failed to load from local storage'),
      expect.any(Error)
    )
    consoleSpy.mockRestore()
  })

  it('returns undefined if a chunk is missing (corrupted)', async () => {
    mockSyncGet.mockImplementation((keys: any) => {
      if (keys === 'keys_meta') return Promise.resolve({ keys_meta: 2 })
      if (Array.isArray(keys)) return Promise.resolve({ keys_0: 'data' }) // keys_1 missing
      return Promise.resolve({})
    })
    mockLocalGet.mockResolvedValue({})
    const result = await loadKeys()

    expect(result).toBeUndefined()
  })

  it('prefers local when local has more shortcuts than sync', async () => {
    mockSyncGet.mockImplementation((keys: any) => {
      if (keys === 'keys_meta') return Promise.resolve({ keys_meta: 1 })
      if (Array.isArray(keys)) return Promise.resolve({ keys_0: '[{"key":"a"}]' })
      return Promise.resolve({})
    })
    mockLocalGet.mockResolvedValue({ keys: '[{"key":"a"},{"key":"b"},{"key":"c"}]' })
    const result = await loadKeys()

    expect(result).toBe('[{"key":"a"},{"key":"b"},{"key":"c"}]')
  })

  it('prefers sync when sync has more shortcuts than local', async () => {
    mockSyncGet.mockImplementation((keys: any) => {
      if (keys === 'keys_meta') return Promise.resolve({ keys_meta: 1 })
      if (Array.isArray(keys)) return Promise.resolve({ keys_0: '[{"key":"a"},{"key":"b"}]' })
      return Promise.resolve({})
    })
    mockLocalGet.mockResolvedValue({ keys: '[{"key":"a"}]' })
    const result = await loadKeys()

    expect(result).toBe('[{"key":"a"},{"key":"b"}]')
  })

  it('prefers local when both have equal number of shortcuts', async () => {
    mockSyncGet.mockImplementation((keys: any) => {
      if (keys === 'keys_meta') return Promise.resolve({ keys_meta: 1 })
      if (Array.isArray(keys)) return Promise.resolve({ keys_0: '[{"key":"a"}]' })
      return Promise.resolve({})
    })
    mockLocalGet.mockResolvedValue({ keys: '[{"key":"b"}]' })
    const result = await loadKeys()

    expect(result).toBe('[{"key":"b"}]')
  })
})

describe('migrateLocalToSync', () => {
  it('copies local data to sync using chunked format on first run', async () => {
    mockLocalGet
      .mockResolvedValueOnce({ }) // no migration flag
      .mockResolvedValueOnce({ keys: '[{"key":"a"}]' }) // local data
    mockSyncGet.mockResolvedValue({}) // sync is empty (no chunks, no legacy)

    await migrateLocalToSync()

    // Should use chunked format
    expect(mockSyncSet).toHaveBeenCalledWith(
      expect.objectContaining({ keys_meta: 1, keys_0: '[{"key":"a"}]' })
    )
    expect(mockLocalSet).toHaveBeenCalledWith({ __shortkeys_migrated_to_sync: true })
  })

  it('does not overwrite existing chunked sync data', async () => {
    mockLocalGet
      .mockResolvedValueOnce({}) // no migration flag
      .mockResolvedValueOnce({ keys: '[{"key":"local"}]' })
    // Sync has chunked data
    mockSyncGet.mockImplementation((keys: any) => {
      if (keys === 'keys_meta') return Promise.resolve({ keys_meta: 1 })
      if (Array.isArray(keys)) return Promise.resolve({ keys_0: '[{"key":"sync"}]' })
      return Promise.resolve({})
    })

    await migrateLocalToSync()

    expect(mockSyncSet).not.toHaveBeenCalled()
    expect(mockLocalSet).toHaveBeenCalledWith({ __shortkeys_migrated_to_sync: true })
  })

  it('does not overwrite existing legacy sync data', async () => {
    mockLocalGet
      .mockResolvedValueOnce({}) // no migration flag
      .mockResolvedValueOnce({ keys: '[{"key":"local"}]' })
    mockSyncGet.mockImplementation((keys: any) => {
      if (keys === 'keys_meta') return Promise.resolve({}) // no chunks
      if (keys === 'keys') return Promise.resolve({ keys: '[{"key":"sync"}]' }) // legacy
      return Promise.resolve({})
    })

    await migrateLocalToSync()

    expect(mockSyncSet).not.toHaveBeenCalled()
    expect(mockLocalSet).toHaveBeenCalledWith({ __shortkeys_migrated_to_sync: true })
  })

  it('skips if already migrated', async () => {
    mockLocalGet.mockResolvedValueOnce({ __shortkeys_migrated_to_sync: true })

    await migrateLocalToSync()

    expect(mockSyncSet).not.toHaveBeenCalled()
  })

  it('skips if no local data to migrate', async () => {
    mockLocalGet
      .mockResolvedValueOnce({}) // no migration flag
      .mockResolvedValueOnce({}) // no local data

    await migrateLocalToSync()

    expect(mockSyncSet).not.toHaveBeenCalled()
    expect(mockLocalSet).toHaveBeenCalledWith({ __shortkeys_migrated_to_sync: true })
  })

  it('logs error on migration failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockLocalGet.mockRejectedValue(new Error('storage broken'))

    await migrateLocalToSync()

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Shortkeys] Migration from local to sync failed'),
      expect.any(Error)
    )
    consoleSpy.mockRestore()
  })
})

describe('onKeysChanged', () => {
  it('registers a listener on browser.storage.onChanged', () => {
    const callback = vi.fn()
    onKeysChanged(callback)

    expect(mockOnChanged).toHaveBeenCalledWith(expect.any(Function))
  })

  it('fires callback for sync changes', () => {
    const callback = vi.fn()
    onKeysChanged(callback)

    const listener = mockOnChanged.mock.calls[0][0]
    listener({}, 'sync')

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('fires callback for local changes', () => {
    const callback = vi.fn()
    onKeysChanged(callback)

    const listener = mockOnChanged.mock.calls[0][0]
    listener({}, 'local')

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('does not fire for managed or session changes', () => {
    const callback = vi.fn()
    onKeysChanged(callback)

    const listener = mockOnChanged.mock.calls[0][0]
    listener({}, 'managed')

    expect(callback).not.toHaveBeenCalled()
  })
})
