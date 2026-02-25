import { ref, computed } from 'vue'
import { useShortcuts } from './useShortcuts'
import { ACTION_CATEGORIES } from '@/utils/actions-registry'
import {
  loadUsageData,
  loadDailyUsage,
  clearUsageData,
  cleanupOrphanedUsage,
  isTrackingEnabled,
  setTrackingEnabled,
  type ShortcutUsageMap,
  type DailyUsage,
} from '@/utils/usage-tracking'
import { useToast } from './useToast'

// Module-level state (singleton — shared across consumers)
const usage = ref<ShortcutUsageMap>({})
const daily = ref<DailyUsage[]>([])
const trackingEnabled = ref(true)
const loaded = ref(false)

export function useAnalytics() {
  const { keys } = useShortcuts()
  const { showSnack } = useToast()

  // Build action → label lookup
  const actionLabels: Record<string, string> = {}
  for (const actions of Object.values(ACTION_CATEGORIES)) {
    for (const a of actions) actionLabels[a.value] = a.label
  }

  /** Get display label for a shortcut. */
  function getLabel(id: string): string {
    const key = keys.value.find((k) => k.id === id)
    if (!key) return 'Deleted shortcut'
    return key.label || actionLabels[key.action] || key.action || 'Unknown'
  }

  /** Get the shortcut key combo for display. */
  function getKeyCombo(id: string): string {
    const key = keys.value.find((k) => k.id === id)
    return key?.key || ''
  }

  // Computed: most used shortcuts, sorted by count descending
  const mostUsed = computed(() => {
    const activeIds = new Set(keys.value.map((k) => k.id).filter(Boolean))
    return Object.entries(usage.value)
      .filter(([id]) => activeIds.has(id))
      .map(([id, entry]) => ({
        id,
        label: getLabel(id),
        key: getKeyCombo(id),
        count: entry.count,
        lastUsed: entry.lastUsed,
        firstUsed: entry.firstUsed,
      }))
      .sort((a, b) => b.count - a.count)
  })

  // Computed: unused shortcuts (defined but never triggered)
  const unusedShortcuts = computed(() => {
    const trackedIds = new Set(Object.keys(usage.value))
    return keys.value
      .filter((k) => k.id && k.key && k.action && !trackedIds.has(k.id!))
      .map((k) => ({
        id: k.id!,
        label: k.label || actionLabels[k.action] || k.action || 'Unknown',
        key: k.key,
      }))
  })

  // Computed: recently used, sorted by lastUsed descending
  const recentlyUsed = computed(() => {
    return [...mostUsed.value]
      .filter((s) => s.lastUsed)
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, 10)
  })

  // Computed: total usage count
  const totalUsage = computed(() => {
    return Object.values(usage.value).reduce((sum, e) => sum + e.count, 0)
  })

  // Computed: chart data for daily usage (aggregated across all shortcuts)
  const chartPeriod = ref<7 | 30>(7)

  const chartData = computed(() => {
    const days = chartPeriod.value
    const today = new Date()
    const result: { date: string; label: string; total: number }[] = []

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayEntry = daily.value.find((e) => e.date === dateStr)
      const total = dayEntry ? Object.values(dayEntry.counts).reduce((s, c) => s + c, 0) : 0
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      result.push({ date: dateStr, label, total })
    }

    return result
  })

  const chartMax = computed(() => Math.max(1, ...chartData.value.map((d) => d.total)))

  /** Load all analytics data from storage. */
  async function loadAnalytics() {
    usage.value = await loadUsageData()
    daily.value = await loadDailyUsage()
    trackingEnabled.value = await isTrackingEnabled()

    // Clean up orphaned entries
    const activeIds = keys.value.map((k) => k.id).filter(Boolean) as string[]
    if (activeIds.length > 0) {
      await cleanupOrphanedUsage(activeIds)
      // Reload after cleanup
      usage.value = await loadUsageData()
      daily.value = await loadDailyUsage()
    }

    loaded.value = true
  }

  /** Clear all analytics data. */
  async function clearAnalytics() {
    if (!confirm('Clear all analytics data? This cannot be undone.')) return
    await clearUsageData()
    usage.value = {}
    daily.value = []
    showSnack('Analytics data cleared')
  }

  /** Toggle tracking on/off. */
  async function toggleTracking() {
    const newValue = !trackingEnabled.value
    await setTrackingEnabled(newValue)
    trackingEnabled.value = newValue
    showSnack(newValue ? 'Usage tracking enabled' : 'Usage tracking disabled')
  }

  return {
    usage,
    daily,
    trackingEnabled,
    loaded,
    mostUsed,
    unusedShortcuts,
    recentlyUsed,
    totalUsage,
    chartPeriod,
    chartData,
    chartMax,
    loadAnalytics,
    clearAnalytics,
    toggleTracking,
    getLabel,
    getKeyCombo,
  }
}
