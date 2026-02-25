import { ref, computed } from 'vue'
import { ACTION_CATEGORIES } from '@/utils/actions-registry'
import { useShortcuts } from './useShortcuts'
import { useConflicts } from './useConflicts'

export function useSearch() {
  const { keys } = useShortcuts()
  const { conflicts } = useConflicts()

  const searchQuery = ref('')

  /** Build a lookup from action value → label */
  const actionLabels = computed(() => {
    const map: Record<string, string> = {}
    for (const actions of Object.values(ACTION_CATEGORIES)) {
      for (const a of actions) map[a.value] = a.label
    }
    return map
  })

  /** ACTION_CATEGORIES without 'macro' to prevent recursive macros */
  const macroActionOptions = computed(() => {
    const filtered: Record<string, { value: string; label: string }[]> = {}
    for (const [category, actions] of Object.entries(ACTION_CATEGORIES)) {
      const withoutMacro = actions.filter((a) => a.value !== 'macro')
      if (withoutMacro.length > 0) filtered[category] = withoutMacro
    }
    return filtered
  })

  /** Indices of shortcuts that match the search query */
  const filteredIndices = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    if (!q) return keys.value.map((_: any, i: number) => i)
    return keys.value
      .map((row: any, i: number) => {
        const label = (row.label || '').toLowerCase()
        const key = (row.key || '').toLowerCase()
        const action = (actionLabels.value[row.action] || row.action || '').toLowerCase()
        if (label.includes(q) || key.includes(q) || action.includes(q)) return i
        return -1
      })
      .filter((i: number) => i >= 0)
  })

  const stats = computed(() => {
    const total = keys.value.length
    const enabled = keys.value.filter((k: any) => k.enabled !== false).length
    const disabled = total - enabled
    const withConflicts = conflicts.value.size
    return { total, enabled, disabled, withConflicts }
  })

  return { searchQuery, actionLabels, macroActionOptions, filteredIndices, stats }
}
