/**
 * Storage abstraction that uses chrome.storage.sync (cloud-synced across devices)
 * with automatic fallback to chrome.storage.local if data exceeds sync limits.
 *
 * chrome.storage.sync limits:
 *   - QUOTA_BYTES_PER_ITEM: 8,192 bytes per key
 *   - QUOTA_BYTES: 102,400 bytes total
 *   - MAX_ITEMS: 512
 */

const SYNC_QUOTA = 102_400 // 100KB total
const MIGRATED_KEY = '__shortkeys_migrated_to_sync'

/** Get the appropriate storage area. Prefers sync, falls back to local. */
function getStorage(): chrome.storage.SyncStorageArea | chrome.storage.LocalStorageArea {
  return chrome.storage.sync || chrome.storage.local
}

export class StorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'StorageError'
  }
}

/**
 * Verify that data was actually persisted by reading it back.
 * Returns true if the stored value matches what we wrote.
 */
async function verifyWrite(area: 'sync' | 'local', key: string, expected: string): Promise<boolean> {
  try {
    const storage = area === 'sync' ? chrome.storage.sync : chrome.storage.local
    const data = await storage.get(key)
    return data[key] === expected
  } catch (e) {
    console.error(`[Shortkeys] Failed to verify ${area} write for "${key}":`, e)
    return false
  }
}

/**
 * Save keys to synced storage. Falls back to local if too large.
 * Returns 'sync' or 'local' indicating where data was saved.
 * Throws StorageError if data could not be verified in any storage area.
 */
export async function saveKeys(keys: any[]): Promise<'sync' | 'local'> {
  const json = JSON.stringify(keys)
  const byteSize = new Blob([json]).size

  // If data fits in sync, use sync
  if (chrome.storage.sync && byteSize < SYNC_QUOTA - 1024) {
    try {
      await chrome.storage.sync.set({ keys: json })
      // Also keep a local copy as backup
      await chrome.storage.local.set({ keys: json })

      // Verify at least local write succeeded
      const verified = await verifyWrite('local', 'keys', json)
      if (!verified) {
        console.error('[Shortkeys] Save appeared to succeed but verification failed (sync path). Data may not persist.')
        throw new StorageError('Write verification failed after sync save')
      }

      return 'sync'
    } catch (e) {
      if (e instanceof StorageError) throw e
      console.error('[Shortkeys] Sync save failed, falling back to local:', e)
    }
  }

  // Fallback: local only
  try {
    await chrome.storage.local.set({ keys: json })

    const verified = await verifyWrite('local', 'keys', json)
    if (!verified) {
      console.error('[Shortkeys] Local save appeared to succeed but verification failed. Data may not persist.')
      throw new StorageError('Write verification failed after local save')
    }

    return 'local'
  } catch (e) {
    if (e instanceof StorageError) throw e
    console.error('[Shortkeys] Local save failed:', e)
    throw new StorageError('Failed to save shortcuts to any storage area', e)
  }
}

/**
 * Load keys from storage. Checks sync first, then local.
 */
export async function loadKeys(): Promise<string | undefined> {
  // Try sync first
  if (chrome.storage.sync) {
    try {
      const syncData = await chrome.storage.sync.get('keys')
      if (syncData.keys) return syncData.keys
    } catch (e) {
      console.error('[Shortkeys] Failed to load from sync storage, trying local:', e)
    }
  }

  // Fallback to local
  try {
    const localData = await chrome.storage.local.get('keys')
    return localData.keys
  } catch (e) {
    console.error('[Shortkeys] Failed to load from local storage:', e)
    return undefined
  }
}

/**
 * One-time migration: copy existing local data to sync.
 * Called on extension update/install. Safe to call multiple times.
 */
export async function migrateLocalToSync(): Promise<void> {
  if (!chrome.storage.sync) return

  try {
    // Check if already migrated
    const { [MIGRATED_KEY]: migrated } = await chrome.storage.local.get(MIGRATED_KEY)
    if (migrated) return

    // Check if there's local data that isn't in sync yet
    const localData = await chrome.storage.local.get('keys')
    if (!localData.keys) {
      await chrome.storage.local.set({ [MIGRATED_KEY]: true })
      return
    }

    const syncData = await chrome.storage.sync.get('keys')
    if (syncData.keys) {
      // Sync already has data -- don't overwrite (user may have set up on another device)
      await chrome.storage.local.set({ [MIGRATED_KEY]: true })
      return
    }

    // Migrate local -> sync
    const byteSize = new Blob([localData.keys]).size
    if (byteSize < SYNC_QUOTA - 1024) {
      await chrome.storage.sync.set({ keys: localData.keys })
    }
    await chrome.storage.local.set({ [MIGRATED_KEY]: true })
  } catch (e) {
    console.error('[Shortkeys] Migration from local to sync failed (non-critical):', e)
  }
}

/**
 * Listen for storage changes from any area (sync or local).
 * Calls the callback whenever keys change, regardless of which storage area triggered it.
 */
export function onKeysChanged(callback: () => void): void {
  // Listen on both storage areas
  chrome.storage.onChanged.addListener((_changes, areaName) => {
    if (areaName === 'sync' || areaName === 'local') {
      callback()
    }
  })
}

import type { GroupSettings } from './url-matching'

/**
 * Save group settings to synced storage alongside keys.
 * Group settings are small (just URL patterns per group), so they always fit in sync.
 */
export async function saveGroupSettings(settings: Record<string, GroupSettings>): Promise<void> {
  const json = JSON.stringify(settings)
  if (chrome.storage.sync) {
    try {
      await chrome.storage.sync.set({ groupSettings: json })
      await chrome.storage.local.set({ groupSettings: json })
      return
    } catch (e) {
      console.error('[Shortkeys] Sync save failed for group settings, falling back to local:', e)
    }
  }
  try {
    await chrome.storage.local.set({ groupSettings: json })
  } catch (e) {
    console.error('[Shortkeys] Local save failed for group settings:', e)
  }
}

/**
 * Load group settings from storage. Checks sync first, then local.
 */
export async function loadGroupSettings(): Promise<Record<string, GroupSettings>> {
  if (chrome.storage.sync) {
    try {
      const syncData = await chrome.storage.sync.get('groupSettings')
      if (syncData.groupSettings) return JSON.parse(syncData.groupSettings)
    } catch (e) {
      console.error('[Shortkeys] Failed to load group settings from sync, trying local:', e)
    }
  }
  try {
    const localData = await chrome.storage.local.get('groupSettings')
    if (localData.groupSettings) return JSON.parse(localData.groupSettings)
  } catch (e) {
    console.error('[Shortkeys] Failed to load group settings from local:', e)
  }
  return {}
}
