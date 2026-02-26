import { ref, reactive, computed } from 'vue'
import { v4 as uuid } from 'uuid'
import type { KeySetting, GroupSettings } from '@/utils/url-matching'
import { useShortcuts } from './useShortcuts'
import { useSearch } from './useSearch'
import { useToast } from './useToast'
import { useUndoRedo } from './useUndoRedo'
import { saveGroupSettings, loadGroupSettings } from '@/utils/storage'

export const DEFAULT_GROUP = 'My Shortcuts'

export function useGroups() {
  const { keys } = useShortcuts()
  const { filteredIndices } = useSearch()

  const collapsedGroups = ref<Set<string>>(new Set())
  const editingGroupName = ref<string | null>(null)
  const newGroupName = ref('')
  const groupMenuOpen = ref<string | null>(null)
  const groupSettings = reactive<Record<string, GroupSettings>>({})
  const expandedGroupSiteFilter = ref<string | null>(null)

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

  /** Load group settings from storage */
  async function loadGroupSettingsFromStorage() {
    const loaded = await loadGroupSettings()
    // Clear existing and merge loaded settings
    for (const key of Object.keys(groupSettings)) delete groupSettings[key]
    Object.assign(groupSettings, loaded)
  }

  /** Save group settings to storage */
  async function persistGroupSettings() {
    // Only save groups that have non-empty settings
    const toSave: Record<string, GroupSettings> = {}
    for (const [name, settings] of Object.entries(groupSettings)) {
      if (settings.activateOn?.trim() || settings.deactivateOn?.trim()) {
        toSave[name] = settings
      }
    }
    await saveGroupSettings(toSave)
  }

  /** Check if a group has site activation rules configured */
  function hasGroupSiteRules(group: string): boolean {
    const settings = groupSettings[group]
    if (!settings) return false
    return !!(settings.activateOn?.trim() || settings.deactivateOn?.trim())
  }

  function toggleGroupCollapse(group: string) {
    if (collapsedGroups.value.has(group)) {
      collapsedGroups.value.delete(group)
    } else {
      collapsedGroups.value.add(group)
    }
  }

  function toggleGroupEnabled(group: string) {
    const { pushUndo } = useUndoRedo()
    pushUndo('Group toggled')
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
    const { pushUndo, undo } = useUndoRedo()
    const { showSnack } = useToast()
    const count = groupedIndices.value.get(group)?.length || 0
    pushUndo('Group deleted')
    keys.value = keys.value.filter((k) => (k.group || DEFAULT_GROUP) !== group)
    // Clean up group settings
    if (groupSettings[group]) {
      delete groupSettings[group]
      persistGroupSettings()
    }
    showSnack(`Deleted ${count} shortcut${count !== 1 ? 's' : ''} in "${group}"`, 'success', { label: 'Undo', handler: undo })
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
      // Migrate group settings to new name
      if (groupSettings[oldName]) {
        groupSettings[trimmed] = { ...groupSettings[oldName] }
        delete groupSettings[oldName]
        persistGroupSettings()
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

  function toggleGroupSiteFilter(group: string) {
    if (expandedGroupSiteFilter.value === group) {
      expandedGroupSiteFilter.value = null
    } else {
      expandedGroupSiteFilter.value = group
      // Initialize settings object if it doesn't exist
      if (!groupSettings[group]) {
        groupSettings[group] = {}
      }
    }
  }

  return {
    DEFAULT_GROUP,
    collapsedGroups,
    editingGroupName,
    newGroupName,
    groupMenuOpen,
    groupNames,
    groupedIndices,
    groupSettings,
    expandedGroupSiteFilter,
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
    toggleGroupSiteFilter,
    hasGroupSiteRules,
    loadGroupSettingsFromStorage,
    persistGroupSettings,
  }
}
