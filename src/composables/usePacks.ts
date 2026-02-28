import { ref, computed } from 'vue'
import { v4 as uuid } from 'uuid'
import type { ShortcutPack } from '@/packs'
import { useShortcuts } from './useShortcuts'
import { useToast } from './useToast'
import { normalizeKey, couldSiteFiltersOverlap } from '@/utils/shortcut-conflicts'
import type { KeySetting } from '@/utils/url-matching'

// Module-level state so all callers share the same refs
const previewPack = ref<ShortcutPack | null>(null)
const packConflictMode = ref<'skip' | 'replace' | 'keep'>('replace')

export function usePacks() {
  const { keys, saveShortcuts } = useShortcuts()
  const { showSnack } = useToast()

  /** Conflict metadata for a single pack shortcut */
  interface PackConflictInfo {
    key: string
    /** 'exact' = same key + same action (will be auto-dropped) */
    /** 'key' = same key, different action */
    type: 'exact' | 'key'
    existingIndices: number[]
  }

  /**
   * Get detailed conflict info for each shortcut in a pack.
   * Returns a Map from pack shortcut index to conflict info.
   * Considers site filters (#739): shortcuts with non-overlapping
   * site filters are not considered conflicting.
   */
  function getPackConflicts(pack: ShortcutPack): Map<number, PackConflictInfo> {
    const result = new Map<number, PackConflictInfo>()
    for (let pi = 0; pi < pack.shortcuts.length; pi++) {
      const ps = pack.shortcuts[pi]
      const psNorm = normalizeKey(ps.key)
      if (!psNorm) continue

      const matchingIndices: number[] = []
      for (let ei = 0; ei < keys.value.length; ei++) {
        const existing = keys.value[ei]
        if (normalizeKey(existing.key) !== psNorm) continue
        // Check site filter overlap (#739)
        if (!couldSiteFiltersOverlap(ps as KeySetting, existing)) continue
        matchingIndices.push(ei)
      }

      if (matchingIndices.length > 0) {
        const isExact = matchingIndices.some((ei) => keys.value[ei].action === ps.action)
        result.set(pi, {
          key: ps.key,
          type: isExact ? 'exact' : 'key',
          existingIndices: matchingIndices,
        })
      }
    }
    return result
  }

  /** Count of exact duplicates that will be auto-dropped */
  const exactDuplicateCount = computed(() => {
    if (!previewPack.value) return 0
    const conflicts = getPackConflicts(previewPack.value)
    let count = 0
    for (const c of conflicts.values()) {
      if (c.type === 'exact') count++
    }
    return count
  })

  async function installPack(pack: ShortcutPack) {
    const mode = packConflictMode.value
    const groupName = pack.name
    const conflicts = getPackConflicts(pack)

    // Auto-drop exact duplicates (same key + same action) regardless of mode (#737)
    const nonExactShortcuts = pack.shortcuts.filter((_, i) => {
      const conflict = conflicts.get(i)
      return !conflict || conflict.type !== 'exact'
    })

    const newShortcuts = nonExactShortcuts.map((s) => ({
      ...s,
      id: uuid(),
      group: groupName,
      enabled: true,
    }))

    const existingKeys = new Set(keys.value.map((k) => normalizeKey(k.key)).filter(Boolean))

    if (mode === 'skip') {
      // Only add non-conflicting
      const toAdd = newShortcuts.filter((s) => !existingKeys.has(normalizeKey(s.key)))
      keys.value.push(...toAdd)
    } else if (mode === 'replace') {
      // Remove existing conflicting shortcuts, add all from pack
      const packKeys = new Set(newShortcuts.map((s) => normalizeKey(s.key)))
      keys.value = keys.value.filter((k) => !packKeys.has(normalizeKey(k.key)))
      keys.value.push(...newShortcuts)
    } else {
      // Keep both
      keys.value.push(...newShortcuts)
    }

    const droppedCount = pack.shortcuts.length - nonExactShortcuts.length
    previewPack.value = null
    try {
      await saveShortcuts()
      const msg = droppedCount > 0
        ? `Added "${pack.name}" (${nonExactShortcuts.length} shortcuts, ${droppedCount} duplicate${droppedCount > 1 ? 's' : ''} skipped)`
        : `Added "${pack.name}" (${nonExactShortcuts.length} shortcuts)`
      showSnack(msg)
    } catch {
      showSnack('Failed to save shortcuts. Please try again.', 'danger')
    }
  }

  return { previewPack, packConflictMode, getPackConflicts, exactDuplicateCount, installPack }
}
