import { computed } from 'vue'
import { detectConflicts, type ShortcutConflict } from '@/utils/shortcut-conflicts'
import { useShortcuts } from './useShortcuts'

export function useConflicts() {
  const { keys } = useShortcuts()

  const conflicts = computed(() => detectConflicts(keys.value))

  function getConflicts(index: number): ShortcutConflict[] {
    return conflicts.value.get(index) || []
  }

  return { conflicts, getConflicts }
}
