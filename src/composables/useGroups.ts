import { ref, computed } from 'vue'
import { v4 as uuid } from 'uuid'
import type { KeySetting } from '@/utils/url-matching'
import { useShortcuts } from './useShortcuts'
import { useSearch } from './useSearch'

export const DEFAULT_GROUP = 'My Shortcuts'

export function useGroups() {
  const { keys } = useShortcuts()
  const { filteredIndices } = useSearch()

  const collapsedGroups = ref<Set<string>>(new Set())
  const editingGroupName = ref<string | null>(null)
  const newGroupName = ref('')
  const groupMenuOpen = ref<string | null>(null)

  /** Get ordered list of unique group names */
  const groupNames = computed(() => {
    const names = new Set<string>()
    for (const k of keys.value) names.add(k.group || DEFAULT_GROUP)
    // Always put default group first
    const ordered = [DEFAULT_GROUP]
    for (const n of names) {
      if (n !== DEFAULT_GROUP) ordered.push(n)
    }
    return ordered
  })

  /** Group indices by group name, respecting search filter */
  const groupedIndices = computed(() => {
    const map = new Map<string, number[]>()
    for (const i of filteredIndices.value) {
      const group = keys.value[i].group || DEFAULT_GROUP
      if (!map.has(group)) map.set(group, [])
      map.get(group)!.push(i)
    }
    return map
  })

  function toggleGroupCollapse(group: string) {
    if (collapsedGroups.value.has(group)) {
      collapsedGroups.value.delete(group)
    } else {
      collapsedGroups.value.add(group)
    }
  }

  function toggleGroupEnabled(group: string) {
    const indices = groupedIndices.value.get(group) || []
    const allEnabled = indices.every((i) => keys.value[i].enabled !== false)
    for (const i of indices) {
      keys.value[i].enabled = allEnabled ? false : true
    }
  }

  function isGroupAllEnabled(group: string): boolean {
    const indices = groupedIndices.value.get(group) || []
    return indices.length > 0 && indices.every((i) => keys.value[i].enabled !== false)
  }

  function deleteGroup(group: string) {
    if (!confirm(`Delete all ${groupedIndices.value.get(group)?.length || 0} shortcuts in "${group}"?`)) return
    keys.value = keys.value.filter((k) => (k.group || DEFAULT_GROUP) !== group)
  }

  function startRenameGroup(group: string) {
    editingGroupName.value = group
    newGroupName.value = group
  }

  function finishRenameGroup(oldName: string) {
    const trimmed = newGroupName.value.trim()
    if (trimmed && trimmed !== oldName) {
      for (const k of keys.value) {
        if ((k.group || DEFAULT_GROUP) === oldName) {
          k.group = trimmed === DEFAULT_GROUP ? undefined : trimmed
        }
      }
    }
    editingGroupName.value = null
  }

  function addShortcutToGroup(group: string) {
    keys.value.push({ id: uuid(), enabled: true, group: group === DEFAULT_GROUP ? undefined : group } as KeySetting)
  }

  function createNewGroup() {
    const name = prompt('New group name:')
    if (!name?.trim()) return
    // Add an empty shortcut in the new group so it appears
    keys.value.push({ id: uuid(), enabled: true, group: name.trim() } as KeySetting)
  }

  function toggleGroupMenu(group: string) {
    groupMenuOpen.value = groupMenuOpen.value === group ? null : group
  }

  function closeGroupMenus() {
    groupMenuOpen.value = null
  }

  return {
    DEFAULT_GROUP,
    collapsedGroups,
    editingGroupName,
    newGroupName,
    groupMenuOpen,
    groupNames,
    groupedIndices,
    toggleGroupCollapse,
    toggleGroupEnabled,
    isGroupAllEnabled,
    deleteGroup,
    startRenameGroup,
    finishRenameGroup,
    addShortcutToGroup,
    createNewGroup,
    toggleGroupMenu,
    closeGroupMenus,
  }
}
