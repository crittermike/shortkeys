/**
 * Storage abstraction that uses browser.storage.sync (cloud-synced across devices)
 * with automatic fallback to browser.storage.local if data exceeds sync limits.
 *
 * Uses `browser` from wxt/browser for cross-browser compatibility (Chrome + Firefox).
 *
 * browser.storage.sync limits:
 *   - QUOTA_BYTES_PER_ITEM: 8,192 bytes per key
 *   - QUOTA_BYTES: 102,400 bytes total
 *   - MAX_ITEMS: 512
 */

import { browser } from 'wxt/browser'

const SYNC_QUOTA = 102_400 // 100KB total
const MIGRATED_KEY = '__shortkeys_migrated_to_sync'


/**
 * Save keys to synced storage. Falls back to local if too large.
 * When falling back to local, clears stale sync data so loadKeys()
 * doesn't return an outdated dataset.
 * Returns 'sync' or 'local' indicating where data was saved.
 */
export async function saveKeys(keys: any[]): Promise<'sync' | 'local'> {
  const json = JSON.stringify(keys)
  const byteSize = new Blob([json]).size

  // If data fits in sync, use sync
  if (browser.storage.sync && byteSize < SYNC_QUOTA - 1024) {
    try {
      await browser.storage.sync.set({ keys: json })
      // Also keep a local copy as backup
      await browser.storage.local.set({ keys: json })
      return 'sync'
    } catch (e) {
      console.error('[Shortkeys] Sync save failed, falling back to local:', e)
    }
  }

  // Fallback: local only. Remove stale sync data so loadKeys() won't
  // return an older dataset that was saved before the data grew too large.
  if (browser.storage.sync) {
    try {
      await browser.storage.sync.remove('keys')
    } catch {
      // Best-effort cleanup -- if this fails, loadKeys() still handles it
    }
  }
  try {
    await browser.storage.local.set({ keys: json })
    return 'local'
  } catch (e) {
    console.error('[Shortkeys] Local save failed:', e)
    throw new Error('Failed to save shortcuts to any storage area')
  }
}

/**
 * Load keys from storage. Checks sync first, then local.
 * If both exist, compares them and returns whichever has more shortcuts
 * (more data = more recent, since shortcuts only grow via import/add).
 */
export async function loadKeys(): Promise<string | undefined> {
  let syncKeys: string | undefined
  let localKeys: string | undefined

  // Try sync first
  if (browser.storage.sync) {
    try {
      const syncData = await browser.storage.sync.get('keys')
      syncKeys = syncData.keys as string | undefined
    } catch (e) {
      console.error('[Shortkeys] Failed to load from sync storage, trying local:', e)
    }
  }

  // Also load local
  try {
    const localData = await browser.storage.local.get('keys')
    localKeys = localData.keys as string | undefined
  } catch (e) {
    console.error('[Shortkeys] Failed to load from local storage:', e)
  }

  // If only one source has data, use it
  if (syncKeys && !localKeys) return syncKeys
  if (!syncKeys && localKeys) return localKeys
  if (!syncKeys && !localKeys) return undefined

  // Both exist -- prefer whichever has more shortcuts.
  // This handles the edge case where sync has stale data that wasn't cleaned up.
  try {
    const syncArr = JSON.parse(syncKeys!)
    const localArr = JSON.parse(localKeys!)
    if (Array.isArray(syncArr) && Array.isArray(localArr)) {
      return localArr.length >= syncArr.length ? localKeys : syncKeys
    }
  } catch {
    // Parse failed -- fall through to sync preference
  }

  return syncKeys
}

/**
 * One-time migration: copy existing local data to sync.
 * Called on extension update/install. Safe to call multiple times.
 */
export async function migrateLocalToSync(): Promise<void> {
  if (!browser.storage.sync) return

  try {
    // Check if already migrated
    const { [MIGRATED_KEY]: migrated } = await browser.storage.local.get(MIGRATED_KEY)
    if (migrated) return

    // Check if there's local data that isn't in sync yet
    const localData = await browser.storage.local.get('keys')
    if (!localData.keys) {
      await browser.storage.local.set({ [MIGRATED_KEY]: true })
      return
    }

    const syncData = await browser.storage.sync.get('keys')
    if (syncData.keys) {
      // Sync already has data -- don't overwrite (user may have set up on another device)
      await browser.storage.local.set({ [MIGRATED_KEY]: true })
      return
    }

    // Migrate local -> sync
    const byteSize = new Blob([localData.keys as string]).size
    if (byteSize < SYNC_QUOTA - 1024) {
      await browser.storage.sync.set({ keys: localData.keys })
    }
    await browser.storage.local.set({ [MIGRATED_KEY]: true })
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
  browser.storage.onChanged.addListener((_changes, areaName) => {
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

/**
 * Load group settings from storage. Checks sync first, then local.
 */
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
