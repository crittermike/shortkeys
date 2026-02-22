import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSyncGet = vi.fn()
const mockSyncSet = vi.fn()
const mockLocalGet = vi.fn()
const mockLocalSet = vi.fn()
const mockOnChanged = vi.fn()

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

const { saveKeys, loadKeys, migrateLocalToSync, onKeysChanged } = await import('../src/utils/storage')

beforeEach(() => {
  vi.clearAllMocks()
  mockSyncGet.mockResolvedValue({})
  mockSyncSet.mockResolvedValue(undefined)
  mockLocalGet.mockResolvedValue({})
  mockLocalSet.mockResolvedValue(undefined)
})

describe('saveKeys', () => {
  it('saves to sync when data fits', async () => {
    const keys = [{ key: 'ctrl+b', action: 'newtab' }]
    const result = await saveKeys(keys)

    expect(result).toBe('sync')
    expect(mockSyncSet).toHaveBeenCalledWith({ keys: JSON.stringify(keys) })
    // Also saves local backup
    expect(mockLocalSet).toHaveBeenCalledWith({ keys: JSON.stringify(keys) })
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
})

describe('loadKeys', () => {
  it('loads from sync first', async () => {
    mockSyncGet.mockResolvedValue({ keys: '[{"key":"a"}]' })
    const result = await loadKeys()

    expect(result).toBe('[{"key":"a"}]')
    expect(mockSyncGet).toHaveBeenCalledWith('keys')
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
})

describe('migrateLocalToSync', () => {
  it('copies local data to sync on first run', async () => {
    mockLocalGet
      .mockResolvedValueOnce({ }) // no migration flag
      .mockResolvedValueOnce({ keys: '[{"key":"a"}]' }) // local data
    mockSyncGet.mockResolvedValue({}) // sync is empty

    await migrateLocalToSync()

    expect(mockSyncSet).toHaveBeenCalledWith({ keys: '[{"key":"a"}]' })
    expect(mockLocalSet).toHaveBeenCalledWith({ __shortkeys_migrated_to_sync: true })
  })

  it('does not overwrite existing sync data', async () => {
    mockLocalGet
      .mockResolvedValueOnce({}) // no migration flag
      .mockResolvedValueOnce({ keys: '[{"key":"local"}]' })
    mockSyncGet.mockResolvedValue({ keys: '[{"key":"sync"}]' }) // sync already has data

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
})

describe('onKeysChanged', () => {
  it('registers a listener on chrome.storage.onChanged', () => {
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
