import { ref } from 'vue'
import { useShortcuts } from './useShortcuts'
import { useUndoRedo } from './useUndoRedo'
import { DEFAULT_GROUP } from './useGroups'

export function useDragDrop() {
  const { keys } = useShortcuts()

  const dragIndex = ref<number | null>(null)

  function onDragStart(index: number) {
    const { pushUndo } = useUndoRedo()
    pushUndo('Shortcuts reordered')
    dragIndex.value = index
  }

  function onDragOver(e: DragEvent, index: number) {
    e.preventDefault()
    if (dragIndex.value === null || dragIndex.value === index) return
    const item = keys.value.splice(dragIndex.value, 1)[0]
    // Update group to match destination
    const destGroup = keys.value[Math.min(index, keys.value.length - 1)]?.group
    item.group = destGroup
    keys.value.splice(index, 0, item)
    dragIndex.value = index
  }

  function onDragOverGroup(e: DragEvent, group: string) {
    e.preventDefault()
    if (dragIndex.value === null) return
    // Update dragged item's group
    keys.value[dragIndex.value].group = group === DEFAULT_GROUP ? undefined : group
  }

  function onDragEnd() {
    dragIndex.value = null
  }

  return { dragIndex, onDragStart, onDragOver, onDragOverGroup, onDragEnd }
}
