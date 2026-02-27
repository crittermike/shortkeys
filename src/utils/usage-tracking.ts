/**
 * Usage tracking for shortcuts. Data stored in browser.storage.local (device-specific).
 *
 * Uses `browser` from wxt/browser for cross-browser compatibility (Chrome + Firefox).
 *
 * Storage keys:
 *   "usage"           -> ShortcutUsageMap (per-shortcut totals)
 *   "usageDaily"      -> DailyUsage[]     (rolling 90-day per-day counts)
 *   "usageEnabled"    -> boolean          (default true)
 */

import { browser } from 'wxt/browser'

export interface ShortcutUsageEntry {
  count: number
  firstUsed: number   // ms timestamp
  lastUsed: number    // ms timestamp
}

export type ShortcutUsageMap = Record<string, ShortcutUsageEntry>

export interface DailyUsage {
  date: string                        // YYYY-MM-DD
  counts: Record<string, number>      // shortcutId -> count for that day
}

const MAX_DAILY_ENTRIES = 90

/** Today's date as YYYY-MM-DD. */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Check if tracking is enabled. Defaults to true if unset. */
export async function isTrackingEnabled(): Promise<boolean> {
  const data = await browser.storage.local.get('usageEnabled')
  return data.usageEnabled !== false
}

/** Toggle tracking on/off. */
export async function setTrackingEnabled(enabled: boolean): Promise<void> {
  await browser.storage.local.set({ usageEnabled: enabled })
}

/** Load the per-shortcut usage totals. */
export async function loadUsageData(): Promise<ShortcutUsageMap> {
  const data = await browser.storage.local.get('usage')
  return (data.usage as ShortcutUsageMap) || {}
}

/** Load the daily usage history. */
export async function loadDailyUsage(): Promise<DailyUsage[]> {
  const data = await browser.storage.local.get('usageDaily')
  return (data.usageDaily as DailyUsage[]) || []
}

/**
 * Record a single shortcut usage. Updates both the totals and the daily history.
 * Debounced writes are unnecessary -- browser.storage.local handles
 * frequent small writes without issues for typical shortcut usage rates.
 */
export async function trackUsage(shortcutId: string): Promise<void> {
  if (!shortcutId) return
  if (!(await isTrackingEnabled())) return

  const now = Date.now()
  const today = todayKey()

  // Update totals
  const usage = await loadUsageData()
  const entry = usage[shortcutId] || { count: 0, firstUsed: now, lastUsed: now }
  entry.count++
  entry.lastUsed = now
  if (!entry.firstUsed) entry.firstUsed = now
  usage[shortcutId] = entry

  // Update daily history
  const daily = await loadDailyUsage()
  let todayEntry = daily.find((d) => d.date === today)
  if (!todayEntry) {
    todayEntry = { date: today, counts: {} }
    daily.push(todayEntry)
  }
  todayEntry.counts[shortcutId] = (todayEntry.counts[shortcutId] || 0) + 1

  // Prune old entries beyond MAX_DAILY_ENTRIES
  daily.sort((a, b) => a.date.localeCompare(b.date))
  const pruned = daily.slice(-MAX_DAILY_ENTRIES)

  await browser.storage.local.set({ usage, usageDaily: pruned })
}

/** Remove usage entries for shortcut IDs that no longer exist. */
export async function cleanupOrphanedUsage(activeIds: string[]): Promise<void> {
  const activeSet = new Set(activeIds)
  const usage = await loadUsageData()
  const daily = await loadDailyUsage()

  let usageChanged = false
  for (const id of Object.keys(usage)) {
    if (!activeSet.has(id)) {
      delete usage[id]
      usageChanged = true
    }
  }

  let dailyChanged = false
  for (const day of daily) {
    for (const id of Object.keys(day.counts)) {
      if (!activeSet.has(id)) {
        delete day.counts[id]
        dailyChanged = true
      }
    }
  }

  const updates: Record<string, any> = {}
  if (usageChanged) updates.usage = usage
  if (dailyChanged) updates.usageDaily = daily
  if (Object.keys(updates).length) {
    await browser.storage.local.set(updates)
  }
}

/** Clear all analytics data. */
export async function clearUsageData(): Promise<void> {
  await browser.storage.local.remove(['usage', 'usageDaily'])
}
