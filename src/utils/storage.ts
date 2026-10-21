/**
 * Whole-snapshot sync with a local backup. Revisions are logical counters with
 * random tie-breakers: concurrent edits choose one snapshot, not a shortcut merge.
 * Legacy sync wins over unversioned local backups; shortcut counts never imply age.
 */
import { browser } from 'wxt/browser'
import { v4 as uuid } from 'uuid'
import type { GroupSettings } from './url-matching'

const SYNC_QUOTA = 102_400
const SYNC_ITEM_QUOTA = 8_192
const MAX_CHUNKS = Math.ceil(SYNC_QUOTA / SYNC_ITEM_QUOTA)
const SYNC_META_KEY = 'keys_meta'
const LOCAL_REVISION_KEY = 'keys_revision'
const MIGRATED_KEY = '__shortkeys_migrated_to_sync'
const encoder = new TextEncoder()
let pendingStorage: Promise<unknown> = Promise.resolve()

async function withStorageLock<T>(operation: () => Promise<T>): Promise<T> {
  // Options, popup, and background share the extension origin and its Web Lock.
  // This prevents backup refresh/recovery from overwriting an in-flight save.
  if (globalThis.navigator?.locks) return await navigator.locks.request('shortkeys-keys', operation)
  const result = pendingStorage.then(operation)
  pendingStorage = result.catch(() => {})
  return result
}

interface Revision {
  counter: number
  id: string
}

interface Snapshot {
  json: string
  revision?: Revision
}

interface SyncMetadata {
  version: 1
  count: number
  revision: Revision
  hash: string
}

function isSyncMetadata(value: unknown): value is SyncMetadata {
  if (!value || typeof value !== 'object') return false
  const meta = value as Partial<SyncMetadata>
  return meta.version === 1 && typeof meta.count === 'number' &&
    isRevision(meta.revision) && typeof meta.hash === 'string'
}

function isRevision(value: unknown): value is Revision {
  if (!value || typeof value !== 'object') return false
  const revision = value as Partial<Revision>
  return Number.isSafeInteger(revision.counter) && revision.counter! > 0 &&
    typeof revision.id === 'string' && revision.id.length > 0
}

function compare(a?: Revision, b?: Revision): number {
  if (!a) return b ? -1 : 0
  if (!b) return 1
  return a.counter - b.counter || (a.id > b.id ? 1 : a.id < b.id ? -1 : 0)
}

function parseKeys(value: unknown): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !Array.isArray(JSON.parse(value))) {
    throw new Error('Invalid stored shortcuts')
  }
  return value
}

async function hash(json: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(json))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

function itemBytes(key: string, value: unknown): number {
  return encoder.encode(key).length + encoder.encode(JSON.stringify(value)).length
}

/** Account for both JSON string escaping and UTF-8 bytes, including each key. */
async function syncPayload(snapshot: Snapshot): Promise<Record<string, unknown> | undefined> {
  const chunks: string[] = []
  let chunk = ''
  let bytes = itemBytes('keys_0', '')
  for (const char of snapshot.json) {
    const size = encoder.encode(JSON.stringify(char)).length - 2
    if (bytes + size > SYNC_ITEM_QUOTA) {
      chunks.push(chunk)
      chunk = ''
      bytes = itemBytes(`keys_${chunks.length}`, '')
    }
    chunk += char
    bytes += size
    // No need to split arbitrarily large local-only scripts.
    if (chunks.length * SYNC_ITEM_QUOTA > SYNC_QUOTA) return undefined
  }
  chunks.push(chunk)
  const payload: Record<string, unknown> = {
    [SYNC_META_KEY]: {
      version: 1, count: chunks.length, revision: snapshot.revision, hash: await hash(snapshot.json),
    },
  }
  chunks.forEach((value, index) => { payload[`keys_${index}`] = value })
  // Replace old chunks in the same write as metadata, rather than racing a newer
  // snapshot by deleting its chunks during asynchronous cleanup.
  for (let i = chunks.length; i < MAX_CHUNKS; i++) payload[`keys_${i}`] = ''
  const total = Object.entries(payload).reduce((sum, [key, value]) => sum + itemBytes(key, value), 0)
  return total <= SYNC_QUOTA - 2048 ? payload : undefined
}

async function readSync(): Promise<Snapshot | undefined> {
  if (!browser.storage.sync) return undefined
  const data = await browser.storage.sync.get(null)
  const meta = data[SYNC_META_KEY]
  if (meta !== undefined) {
    if (typeof meta !== 'number' && !isSyncMetadata(meta)) {
      throw new Error('Invalid shortcut sync metadata')
    }
    const count = typeof meta === 'number' ? meta : meta.count
    if (!Number.isInteger(count) || count < 1 || count > 512) {
      throw new Error('Invalid shortcut sync metadata')
    }
    let json = ''
    for (let i = 0; i < count; i++) {
      if (typeof data[`keys_${i}`] !== 'string') throw new Error('Missing shortcut sync chunk')
      json += data[`keys_${i}`]
    }
    if (typeof meta !== 'number' && await hash(json) !== meta.hash) throw new Error('Incomplete shortcut sync snapshot')
    return { json: parseKeys(json)!, revision: typeof meta === 'number' ? undefined : meta.revision }
  }
  const json = parseKeys(data.keys)
  return json === undefined ? undefined : { json }
}

async function readLocal(): Promise<Snapshot | undefined> {
  const data = await browser.storage.local.get(['keys', LOCAL_REVISION_KEY])
  const json = parseKeys(data.keys)
  if (json === undefined) return undefined
  const revision = data[LOCAL_REVISION_KEY]
  if (revision !== undefined && !isRevision(revision)) throw new Error('Invalid local shortcut revision')
  return { json, revision }
}

async function readSnapshots(): Promise<{ sync?: Snapshot; local?: Snapshot; syncReadFailed: boolean }> {
  let syncReadFailed = false
  const [sync, local] = await Promise.all([
    readSync().catch(error => {
      syncReadFailed = true
      console.error('[Shortkeys] Failed to load from sync storage, trying local:', error)
      return undefined
    }),
    readLocal().catch(error => {
      console.error('[Shortkeys] Failed to load from local storage:', error)
      return undefined
    }),
  ])
  return { sync, local, syncReadFailed }
}

async function writeLocal(snapshot: Snapshot): Promise<void> {
  await browser.storage.local.set({ keys: snapshot.json, [LOCAL_REVISION_KEY]: snapshot.revision })
}

async function writeSync(snapshot: Snapshot): Promise<boolean> {
  if (!browser.storage.sync) return false
  const payload = await syncPayload(snapshot)
  if (!payload) return false
  await browser.storage.sync.set(payload)
  // Never delete the cloud copy on local fallback: other devices still need it.
  try {
    const data = await browser.storage.sync.get(null)
    const obsolete = Object.keys(data).filter(key =>
      key === 'keys' || (/^keys_\d+$/.test(key) && Number(key.slice(5)) >= MAX_CHUNKS))
    if (obsolete.length) await browser.storage.sync.remove(obsolete)
  } catch (error) {
    console.error('[Shortkeys] Failed to clean up old sync chunks:', error)
  }
  return true
}

export function saveKeys(keys: unknown[]): Promise<'sync' | 'local'> {
  return withStorageLock(() => saveKeysUnlocked(keys))
}

async function saveKeysUnlocked(keys: unknown[]): Promise<'sync' | 'local'> {
  const { sync, local } = await readSnapshots()
  const snapshot: Snapshot = {
    json: JSON.stringify(keys),
    revision: { counter: Math.max(sync?.revision?.counter ?? 0, local?.revision?.counter ?? 0) + 1, id: uuid() },
  }
  let localSaved = false
  try {
    await writeLocal(snapshot)
    localSaved = true
  } catch (error) {
    console.error('[Shortkeys] Local save failed:', error)
  }
  try {
    if (await writeSync(snapshot)) return 'sync'
  } catch (error) {
    console.error('[Shortkeys] Sync save failed, falling back to local:', error)
  }
  if (localSaved) return 'local'
  throw new Error('Failed to save shortcuts to any storage area')
}

/**
 * Newest revision wins, including empty arrays and deletions. A pending local
 * revision retries sync without creating another revision. Remote winners refresh
 * the offline backup. Hash validation rejects partially delivered sync chunks.
 */
export function loadKeys(): Promise<string | undefined> {
  return withStorageLock(loadKeysUnlocked)
}

async function loadKeysUnlocked(): Promise<string | undefined> {
  const { sync, local, syncReadFailed } = await readSnapshots()
  if (sync && (!local || compare(sync.revision, local.revision) >= 0)) {
    if (sync.revision && (!local || compare(sync.revision, local.revision) > 0)) {
      try { await writeLocal(sync) } catch (error) {
        console.error('[Shortkeys] Failed to update local shortcut backup:', error)
      }
    }
    return sync.json
  }
  // A failed read may be a newer snapshot still arriving from another device.
  // Keep the backup, but do not replace cloud data until it can be read safely.
  if (local?.revision && !syncReadFailed) {
    try { await writeSync(local) } catch (error) {
      console.error('[Shortkeys] Sync recovery failed, keeping local shortcuts:', error)
    }
  }
  return local?.json
}

/** Migrate only when sync is absent; a failed attempt remains retryable. */
export function migrateLocalToSync(): Promise<void> {
  return withStorageLock(migrateUnlocked)
}

async function migrateUnlocked(): Promise<void> {
  if (!browser.storage.sync) return
  try {
    const flags = await browser.storage.local.get(MIGRATED_KEY)
    if (flags[MIGRATED_KEY]) return
    if (await readSync()) {
      await browser.storage.local.set({ [MIGRATED_KEY]: true })
      return
    }
    const local = await readLocal()
    if (local && await saveKeysUnlocked(JSON.parse(local.json)) !== 'sync') return
    await browser.storage.local.set({ [MIGRATED_KEY]: true })
  } catch (error) {
    console.error('[Shortkeys] Migration from local to sync failed (non-critical):', error)
  }
}

export function onKeysChanged(callback: () => void): void {
  browser.storage.onChanged.addListener((changes, areaName) => {
    if ((areaName === 'sync' || areaName === 'local') &&
      Object.keys(changes).some(key =>
        key === 'keys' || key === SYNC_META_KEY || key === LOCAL_REVISION_KEY ||
        key === 'groupSettings' || /^keys_\d+$/.test(key))) callback()
  })
}

/**
 * Save group settings to synced storage alongside keys.
 * Group settings are small (just URL patterns per group), so they always fit in sync.
 */
export async function saveGroupSettings(settings: Record<string, GroupSettings>): Promise<void> {
  const json = JSON.stringify(settings)
  if (browser.storage.sync) {
    try {
      await browser.storage.sync.set({ groupSettings: json })
      await browser.storage.local.set({ groupSettings: json })
      return
    } catch (e) {
      console.error('[Shortkeys] Sync save failed for group settings, falling back to local:', e)
    }
  }
  try {
    await browser.storage.local.set({ groupSettings: json })
  } catch (e) {
    console.error('[Shortkeys] Local save failed for group settings:', e)
  }
}

/** Load group settings from storage. Checks sync first, then local. */
export async function loadGroupSettings(): Promise<Record<string, GroupSettings>> {
  if (browser.storage.sync) {
    try {
      const syncData = await browser.storage.sync.get('groupSettings')
      if (syncData.groupSettings) return JSON.parse(syncData.groupSettings as string)
    } catch (e) {
      console.error('[Shortkeys] Failed to load group settings from sync, trying local:', e)
    }
  }
  try {
    const localData = await browser.storage.local.get('groupSettings')
    if (localData.groupSettings) return JSON.parse(localData.groupSettings as string)
  } catch (e) {
    console.error('[Shortkeys] Failed to load group settings from local:', e)
  }
  return {}
}

export async function loadUserScriptApprovals(): Promise<Record<string, string>> {
  const data = await browser.storage.local.get('userScriptApprovals')
  const value = data.userScriptApprovals
  if (value === undefined) return {}
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.values(value).some(digest => typeof digest !== 'string')) {
    throw new Error('Invalid installed user-script approvals')
  }
  return value as Record<string, string>
}

export function updateUserScriptApproval(id: string, digest?: string): Promise<void> {
  return withStorageLock(async () => {
    const approvals = await loadUserScriptApprovals()
    if (digest) approvals[id] = digest
    else delete approvals[id]
    await browser.storage.local.set({ userScriptApprovals: approvals })
  })
}
