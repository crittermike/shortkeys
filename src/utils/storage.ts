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

/**
 * Save keys to synced storage. Falls back to local if too large.
 * Returns 'sync' or 'local' indicating where data was saved.
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
      return 'sync'
    } catch {
      // Sync failed (quota, network, etc.) — fall back to local
    }
  }

  // Fallback: local only
  await chrome.storage.local.set({ keys: json })
  return 'local'
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
    } catch {
      // Sync unavailable — try local
    }
  }

  // Fallback to local
  const localData = await chrome.storage.local.get('keys')
  return localData.keys
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
      // Sync already has data — don't overwrite (user may have set up on another device)
      await chrome.storage.local.set({ [MIGRATED_KEY]: true })
      return
    }

    // Migrate local → sync
    const byteSize = new Blob([localData.keys]).size
    if (byteSize < SYNC_QUOTA - 1024) {
      await chrome.storage.sync.set({ keys: localData.keys })
    }
    await chrome.storage.local.set({ [MIGRATED_KEY]: true })
  } catch {
    // Migration failed — not critical, local data still works
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
