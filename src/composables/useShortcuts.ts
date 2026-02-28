import { ref, watch } from 'vue'
import { v4 as uuid } from 'uuid'
import type { KeySetting } from '@/utils/url-matching'
import { saveKeys, loadKeys } from '@/utils/storage'
import { useToast } from './useToast'
import { useUndoRedo } from './useUndoRedo'

const keys = ref<KeySetting[]>([])
const expandedRow = ref<number | null>(null)
const dirty = ref(false)
let savedSnapshot = ''

const ACTIONS_NEEDING_EXPANSION = [
  'javascript', 'openbookmark', 'openbookmarknewtab', 'openbookmarkbackgroundtab',
  'openbookmarkbackgroundtabandclose', 'gototab', 'gototabbytitle', 'gototabbyindex',
  'buttonnexttab', 'openapp', 'trigger', 'openurl', 'inserttext', 'macro',
]

function ensureIds() {
  keys.value.forEach((key) => {
    if (!key.id) key.id = uuid()
    if (key.enabled === undefined) key.enabled = true
  })
}

function addShortcut() {
  keys.value.push({ id: uuid(), enabled: true } as KeySetting)
}

async function saveShortcuts() {
  const { showSnack } = useToast()
  ensureIds()
  // Strip empty shortcuts that have no key and no action
  keys.value = keys.value.filter((k) => k.key || k.action)
  keys.value.forEach((key) => {
    key.sites = key.sites || ''
    key.sitesArray = key.sites.split('\n')
  })
  try {
    const area = await saveKeys(keys.value)
    savedSnapshot = JSON.stringify(keys.value)
    dirty.value = false
    showSnack(area === 'sync' ? 'Shortcuts saved & synced!' : 'Shortcuts saved (local only -- too large to sync)')
  } catch (e) {
    console.error('[Shortkeys] Failed to save shortcuts:', e)
    showSnack(
      'Failed to save shortcuts. Your browser may not support storage in this mode. Check the browser console for details.',
      'danger'
    )
  }
}

async function deleteShortcut(index: number) {
  const { pushUndo } = useUndoRedo()
  const { showSnack } = useToast()
  const { undo } = useUndoRedo()
  pushUndo('Shortcut deleted')
  keys.value.splice(index, 1)
  if (expandedRow.value === index) expandedRow.value = null
  await saveShortcuts()
  showSnack('Shortcut deleted', 'success', { label: 'Undo', handler: undo })
}

function toggleDetails(index: number) {
  expandedRow.value = expandedRow.value === index ? null : index
}

function onActionChange(row: KeySetting, index: number, action: string) {
  row.action = action
  if (action === 'macro') {
    if (!row.macroSteps) row.macroSteps = []
  }
  if (ACTIONS_NEEDING_EXPANSION.includes(action)) {
    expandedRow.value = index
  }
}

function toggleEnabled(row: KeySetting) {
  row.enabled = row.enabled === false ? true : false
}

function needsUserScripts(): boolean {
  const hasJs = keys.value.some((k) => k.action === 'javascript')
  if (!hasJs) return false
  try {
    ;(chrome as any).userScripts.register
    return false
  } catch {
    return true
  }
}

async function loadSavedKeys() {
  const saved = await loadKeys()
  if (saved) {
    keys.value = JSON.parse(saved)
    ensureIds()
  }
  savedSnapshot = JSON.stringify(keys.value)
  dirty.value = false
}

// Deep watch keys to track unsaved changes
watch(keys, (newKeys) => {
  if (!savedSnapshot) return
  dirty.value = JSON.stringify(newKeys) !== savedSnapshot
}, { deep: true })

export function useShortcuts() {
  return {
    keys,
    expandedRow,
    ACTIONS_NEEDING_EXPANSION,
    ensureIds,
    addShortcut,
    saveShortcuts,
    deleteShortcut,
    toggleDetails,
    onActionChange,
    toggleEnabled,
    needsUserScripts,
    dirty,
    loadSavedKeys,
  }
}
