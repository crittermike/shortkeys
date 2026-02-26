import { ref, computed } from 'vue'
import type { KeySetting } from '@/utils/url-matching'
import { saveKeys } from '@/utils/storage'

const undoStack = ref<KeySetting[][]>([])
const redoStack = ref<KeySetting[][]>([])
const lastActionLabel = ref('')
const MAX_UNDO_DEPTH = 20

// We need a reference to the shared keys array — set via init
let keysRef: { value: KeySetting[] } | null = null

function init(keys: { value: KeySetting[] }) {
  keysRef = keys
}

function pushUndo(label: string) {
  if (!keysRef) return
  undoStack.value.push(JSON.parse(JSON.stringify(keysRef.value)))
  if (undoStack.value.length > MAX_UNDO_DEPTH) {
    undoStack.value.shift()
  }
  redoStack.value = []
  lastActionLabel.value = label
}

async function undo() {
  if (!keysRef || undoStack.value.length === 0) return
  redoStack.value.push(JSON.parse(JSON.stringify(keysRef.value)))
  keysRef.value = undoStack.value.pop()!
  await saveKeys(keysRef.value)
}

async function redo() {
  if (!keysRef || redoStack.value.length === 0) return
  undoStack.value.push(JSON.parse(JSON.stringify(keysRef.value)))
  keysRef.value = redoStack.value.pop()!
  await saveKeys(keysRef.value)
}

const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

export function useUndoRedo() {
  return {
    undoStack,
    redoStack,
    lastActionLabel,
    MAX_UNDO_DEPTH,
    init,
    pushUndo,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
