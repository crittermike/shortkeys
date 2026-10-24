import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Data = Record<string, unknown>
let sync: Data
let local: Data
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

const { saveKeys, loadKeys, migrateLocalToSync, onKeysChanged } = await import('../src/utils/storage')

function get(data: Data, keys: string | string[] | null) {
  if (keys === null) return { ...data }
  return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, data[key]]))
}

function itemBytes(key: string, value: unknown) {
  return new TextEncoder().encode(key).length + new TextEncoder().encode(JSON.stringify(value)).length
}

function keys(label: string) {
  return [{ key: 'a', action: 'newtab', label }]
}

beforeEach(() => {
  vi.resetAllMocks()
  sync = {}
  local = {}
  mockSyncGet.mockImplementation(async requested => get(sync, requested))
  mockLocalGet.mockImplementation(async requested => get(local, requested))
  mockSyncSet.mockImplementation(async payload => {
    for (const [key, value] of Object.entries(payload)) {
      if (itemBytes(key, value) > 8192) throw new Error('per-item quota exceeded')
    }
    const total = Object.entries({ ...sync, ...payload }).reduce((sum, [key, value]) => sum + itemBytes(key, value), 0)
    if (total > 102400) throw new Error('total quota exceeded')
    Object.assign(sync, payload)
  })
  mockLocalSet.mockImplementation(async payload => { Object.assign(local, payload) })
  mockSyncRemove.mockImplementation(async names => { names.forEach((name: string) => { delete sync[name] }) })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('revisioned snapshots', () => {
  it.each([
    ['equal-count edit', keys('remote')],
    ['deletion', []],
  ])('accepts a remote %s over a stale local backup and preserves it offline', async (_name, remoteKeys) => {
    await saveKeys(keys('old'))
    const staleLocal = { ...local }
    await saveKeys(remoteKeys)
    local = staleLocal

    expect(await loadKeys()).toBe(JSON.stringify(remoteKeys))
    expect(local.keys).toBe(JSON.stringify(remoteKeys))
    mockSyncGet.mockRejectedValue(new Error('offline'))
    expect(await loadKeys()).toBe(JSON.stringify(remoteKeys))
  })

  it('uses logical revisions rather than shortcut counts or wall clocks', async () => {
    await saveKeys([...keys('old'), ...keys('extra')])
    const staleLocal = { ...local }
    vi.spyOn(Date, 'now').mockReturnValue(1)
    await saveKeys(keys('newer but smaller'))
    local = staleLocal
    expect(await loadKeys()).toBe(JSON.stringify(keys('newer but smaller')))
  })

  it('advances beyond both observed revisions when saving', async () => {
    await saveKeys(keys('initial'))
    local.keys_revision = { counter: 50, id: 'local' }
    await saveKeys(keys('edited'))
    expect(local.keys_revision).toMatchObject({ counter: 51 })
    expect(sync.keys_meta).toMatchObject({ revision: local.keys_revision })
  })

  it('resolves concurrent equal-counter snapshots deterministically', async () => {
    await saveKeys(keys('cloud'))
    const meta = sync.keys_meta as { revision: { counter: number; id: string } }
    meta.revision.id = 'b'
    local = { keys: JSON.stringify(keys('local')), keys_revision: { counter: 1, id: 'a' } }
    expect(await loadKeys()).toBe(JSON.stringify(keys('cloud')))

    local = { keys: JSON.stringify(keys('local wins')), keys_revision: { counter: 1, id: 'c' } }
    expect(await loadKeys()).toBe(JSON.stringify(keys('local wins')))
    expect(sync.keys_meta).toMatchObject({ revision: { counter: 1, id: 'c' } })
  })

  it('retains the latest remote deletion when the local legacy copy has more rows', async () => {
    await saveKeys([])
    local = { keys: JSON.stringify(keys('stale legacy')) }
    expect(await loadKeys()).toBe('[]')
  })

  it('does not write again when copies already match', async () => {
    await saveKeys(keys('same'))
    mockSyncSet.mockClear()
    mockLocalSet.mockClear()
    await loadKeys()
    expect(mockSyncSet).not.toHaveBeenCalled()
    expect(mockLocalSet).not.toHaveBeenCalled()
  })

  it('serializes overlapping saves and backup reads without losing the last save', async () => {
    await saveKeys(keys('initial'))
    const results = await Promise.all([
      saveKeys(keys('first')),
      loadKeys(),
      saveKeys(keys('last')),
    ])
    expect(results[1]).toBe(JSON.stringify(keys('first')))
    expect(await loadKeys()).toBe(JSON.stringify(keys('last')))
    expect(local.keys_revision).toMatchObject({ counter: 3 })
  })
})

describe('quota sizing and coherent chunks', () => {
  it.each([
    ['ASCII', 'x'],
    ['Unicode', '\u{1F680}\u4E2D'],
    ['JSON escapes', '"\\\n\t'],
  ])('round trips multi-chunk %s using actual per-item and total serialized bytes', async (_name, text) => {
    const value = [{ key: 'a', code: text.repeat(Math.ceil(10000 / text.length)) }]
    expect(await saveKeys(value)).toBe('sync')
    const meta = sync.keys_meta as { count: number }
    expect(meta.count).toBeGreaterThan(1)
    for (const [key, value] of Object.entries(sync)) expect(itemBytes(key, value)).toBeLessThanOrEqual(8192)
    local = {}
    expect(await loadKeys()).toBe(JSON.stringify(value))
  })

  it('uses local fallback when escaped storage bytes exceed quota, even if raw JSON fits', async () => {
    const value = [{ code: '"'.repeat(30000) }]
    expect(new TextEncoder().encode(JSON.stringify(value)).length).toBeLessThan(100000)
    expect(await saveKeys(value)).toBe('local')
    expect(mockSyncSet).not.toHaveBeenCalled()
    expect(await loadKeys()).toBe(JSON.stringify(value))
  })

  it.each(['missing', 'mixed', 'bad hash'])('rejects a %s chunk snapshot and retains the last complete backup', async mode => {
    const value = [{ code: 'x'.repeat(15000) }]
    await saveKeys(value)
    if (mode === 'missing') delete sync.keys_1
    if (mode === 'mixed') sync.keys_1 = (sync.keys_1 as string).replace('x', 'y')
    if (mode === 'bad hash') (sync.keys_meta as { hash: string }).hash = 'invalid'
    mockSyncSet.mockClear()
    expect(await loadKeys()).toBe(JSON.stringify(value))
    expect(mockSyncSet).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load from sync'), expect.any(Error))
  })

  it.each([0, -1, 1.5, 1000000, {}, { version: 2, count: 1 }])('rejects invalid metadata %j', async meta => {
    sync = { keys_meta: meta }
    local = { keys: '[]' }
    expect(await loadKeys()).toBe('[]')
    expect(console.error).toHaveBeenCalled()
  })

  it('clears old chunk contents atomically when saving a shorter snapshot', async () => {
    await saveKeys([{ code: 'x'.repeat(20000) }])
    await saveKeys([])
    expect(sync.keys_1).toBe('')
    expect(sync.keys_2).toBe('')
    expect(await loadKeys()).toBe('[]')
  })
})

describe('fallback and recovery', () => {
  it('retains cloud data on failure and retries the local deletion with the same revision', async () => {
    await saveKeys(keys('old cloud copy'))
    const oldCloud = { ...sync }
    mockSyncSet.mockRejectedValueOnce(new Error('offline'))
    expect(await saveKeys([])).toBe('local')
    const revision = local.keys_revision
    expect(sync).toEqual(oldCloud)
    expect(mockSyncRemove).not.toHaveBeenCalled()

    expect(await loadKeys()).toBe('[]')
    expect(sync.keys_meta).toMatchObject({ revision })
    local = {}
    expect(await loadKeys()).toBe('[]')
  })

  it('keeps oversized local edits without deleting the cloud copy, then recovers on a smaller save', async () => {
    await saveKeys(keys('cloud'))
    const cloud = { ...sync }
    const large = [{ code: 'x'.repeat(110000) }]
    expect(await saveKeys(large)).toBe('local')
    expect(sync).toEqual(cloud)
    expect(await loadKeys()).toBe(JSON.stringify(large))
    expect(await saveKeys([])).toBe('sync')
    local = {}
    expect(await loadKeys()).toBe('[]')
  })

  it('never removes cloud data if the local write and sync save both fail', async () => {
    sync = { keys: JSON.stringify(keys('only copy')) }
    mockLocalSet.mockRejectedValue(new Error('disk full'))
    mockSyncSet.mockRejectedValue(new Error('offline'))
    await expect(saveKeys([])).rejects.toThrow('Failed to save shortcuts to any storage area')
    expect(sync.keys).toBe(JSON.stringify(keys('only copy')))
    expect(mockSyncRemove).not.toHaveBeenCalled()
  })

  it('reports sync success even if the backup fails, without clearing sync', async () => {
    mockLocalSet.mockRejectedValue(new Error('disk full'))
    expect(await saveKeys(keys('cloud only'))).toBe('sync')
    expect(await loadKeys()).toBe(JSON.stringify(keys('cloud only')))
    expect(console.error).toHaveBeenCalled()
  })

  it('returns the surviving local copy if sync is unavailable', async () => {
    local = { keys: '[]' }
    mockSyncGet.mockRejectedValue(new Error('offline'))
    expect(await loadKeys()).toBe('[]')
  })

  it('returns undefined when neither area has data', async () => {
    expect(await loadKeys()).toBeUndefined()
  })

  it('logs invalid JSON and uses the other area', async () => {
    local = { keys: 'broken' }
    sync = { keys: '[]' }
    expect(await loadKeys()).toBe('[]')
    expect(console.error).toHaveBeenCalled()
  })
})

describe('legacy data and migration', () => {
  it('loads and migrates Firefox v4.0.2 localStorage without losing scripts or site rules', async () => {
    const shortcuts = [{
      key: 'j', action: 'javascript', code: "document.title = 'legacy'",
      blacklist: 'whitelist', sites: '*example.com*', sitesArray: ['*example.com*'],
    }]
    const legacy = JSON.stringify({ keys: shortcuts })
    const getItem = vi.fn().mockReturnValue(legacy)
    vi.stubGlobal('localStorage', { getItem })

    expect(await loadKeys()).toBe(JSON.stringify(shortcuts))
    expect(getItem).toHaveBeenCalledWith('shortkeys')
    await migrateLocalToSync()
    expect(local.keys).toBe(JSON.stringify(shortcuts))
    expect(sync.keys_meta).toMatchObject({ version: 1 })
    expect(await loadKeys()).toBe(JSON.stringify(shortcuts))
    expect(local.userScriptApprovals).toBeUndefined()
  })

  it.each(['local', 'sync'])('does not resurrect legacy localStorage after a %s deletion', async area => {
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(JSON.stringify({ keys: keys('old') })) })
    if (area === 'local') local.keys = '[]'
    else sync.keys = '[]'

    await migrateLocalToSync()
    expect(await loadKeys()).toBe('[]')
  })

  it('logs malformed legacy localStorage instead of treating it as shortcuts', async () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue('{"keys":{}}') })
    expect(await loadKeys()).toBeUndefined()
    expect(console.error).toHaveBeenCalledWith(
      '[Shortkeys] Failed to load from local storage:', expect.any(Error),
    )
  })

  it('loads v4 local data without changing its format', async () => {
    local = { keys: JSON.stringify([{ key: 'ctrl+b', action: 'newtab' }]) }
    expect(await loadKeys()).toBe(local.keys)
  })

  it.each(['single key', 'chunks'])('treats legacy sync (%s) as authoritative over unversioned local backups', async mode => {
    sync = mode === 'chunks' ? { keys_meta: 2, keys_0: '[', keys_1: ']' } : { keys: '[]' }
    local = { keys: JSON.stringify(keys('stale')) }
    expect(await loadKeys()).toBe('[]')
  })

  it.each([[[]], [keys('v4')]])('migrates legacy local data including an empty array: %j', async value => {
    local = { keys: JSON.stringify(value) }
    await migrateLocalToSync()
    expect(sync.keys_meta).toMatchObject({ version: 1, revision: local.keys_revision })
    expect(await loadKeys()).toBe(JSON.stringify(value))
    expect(local.__shortkeys_migrated_to_sync).toBe(true)
  })

  it('does not replace an existing cloud deletion during migration', async () => {
    sync = { keys: '[]' }
    local = { keys: JSON.stringify(keys('old local')) }
    await migrateLocalToSync()
    expect(mockSyncSet).not.toHaveBeenCalled()
    expect(await loadKeys()).toBe('[]')
  })

  it('retries migration after sync recovers instead of marking a failed attempt complete', async () => {
    local = { keys: JSON.stringify(keys('legacy')) }
    mockSyncSet.mockRejectedValueOnce(new Error('offline'))
    await migrateLocalToSync()
    expect(local.__shortkeys_migrated_to_sync).toBeUndefined()
    await migrateLocalToSync()
    expect(local.__shortkeys_migrated_to_sync).toBe(true)
    expect(await loadKeys()).toBe(JSON.stringify(keys('legacy')))
  })

  it('does not overwrite an unreadable cloud snapshot during migration', async () => {
    sync = { keys_meta: 2, keys_0: '[' }
    local = { keys: '[]' }
    await migrateLocalToSync()
    expect(mockSyncSet).not.toHaveBeenCalled()
    expect(local.__shortkeys_migrated_to_sync).toBeUndefined()
  })

  it('skips completed migration', async () => {
    local = { keys: '[]', __shortkeys_migrated_to_sync: true }
    await migrateLocalToSync()
    expect(mockSyncGet).not.toHaveBeenCalled()
  })
})

describe('storage change consumers', () => {
  it.each(['keys', 'keys_0', 'keys_meta', 'keys_revision', 'groupSettings'])('refreshes bindings when %s changes', key => {
    const callback = vi.fn()
    onKeysChanged(callback)
    const listener = mockOnChanged.mock.calls[0][0]
    listener({ [key]: { newValue: 'changed' } }, 'sync')
    listener({ [key]: { newValue: 'changed' } }, 'local')
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('does not refresh bindings for usage counters, migration flags, or other areas', () => {
    const callback = vi.fn()
    onKeysChanged(callback)
    const listener = mockOnChanged.mock.calls[0][0]
    listener({ usage: { newValue: 1 } }, 'local')
    listener({ __shortkeys_migrated_to_sync: { newValue: true } }, 'local')
    listener({ keys: { newValue: '[]' } }, 'managed')
    expect(callback).not.toHaveBeenCalled()
  })
})
