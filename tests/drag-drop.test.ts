// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/storage', () => ({
  saveKeys: vi.fn().mockResolvedValue('sync'),
  loadKeys: vi.fn().mockResolvedValue(null),
}))

import { useDragDrop } from '../src/composables/useDragDrop'
import { useShortcuts } from '../src/composables/useShortcuts'
import { useUndoRedo } from '../src/composables/useUndoRedo'
import { ref } from 'vue'
import type { KeySetting } from '../src/utils/url-matching'

function makeKey(overrides: Partial<KeySetting> = {}): KeySetting {
  return {
    id: 'test-id-' + Math.random().toString(36).slice(2),
    key: 'ctrl+a',
    action: 'newtab',
    enabled: true,
    sites: '',
    sitesArray: [''],
    ...overrides,
  } as KeySetting
}

function makeDragEvent(overrides: Partial<DragEvent> = {}): DragEvent {
  return {
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as DragEvent
}

describe('useDragDrop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { keys } = useShortcuts()
    keys.value = []
    const { undoStack, redoStack, lastActionLabel, init } = useUndoRedo()
    undoStack.value = []
    redoStack.value = []
    lastActionLabel.value = ''
    init(ref<KeySetting[]>([]))
  })

  describe('handle-gated dragging', () => {
    it('handleActive is false by default', () => {
      const { handleActive } = useDragDrop()
      expect(handleActive.value).toBe(false)
    })

    it('onHandleMouseDown sets handleActive to true', () => {
      const { handleActive, onHandleMouseDown } = useDragDrop()
      onHandleMouseDown()
      expect(handleActive.value).toBe(true)
    })

    it('mouseup resets handleActive to false', () => {
      const { handleActive, onHandleMouseDown } = useDragDrop()
      onHandleMouseDown()
      expect(handleActive.value).toBe(true)
      document.dispatchEvent(new MouseEvent('mouseup'))
      expect(handleActive.value).toBe(false)
    })

    it('onDragStart is prevented when handle is not active', () => {
      const { keys } = useShortcuts()
      keys.value = [makeKey()]
      const { onDragStart, dragIndex } = useDragDrop()
      const event = makeDragEvent()
      onDragStart(event, 0)
      expect(event.preventDefault).toHaveBeenCalled()
      expect(dragIndex.value).toBeNull()
    })

    it('onDragStart proceeds when handle is active', () => {
      const { keys } = useShortcuts()
      keys.value = [makeKey()]
      const { init } = useUndoRedo()
      init(keys)
      const { onHandleMouseDown, onDragStart, dragIndex } = useDragDrop()
      onHandleMouseDown()
      const event = makeDragEvent()
      onDragStart(event, 0)
      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(dragIndex.value).toBe(0)
    })

    it('mouseup listener is cleaned up after firing', () => {
      const { handleActive, onHandleMouseDown } = useDragDrop()
      onHandleMouseDown()
      document.dispatchEvent(new MouseEvent('mouseup'))
      expect(handleActive.value).toBe(false)

      // A second mouseup should not change anything (listener was removed)
      handleActive.value = true
      document.dispatchEvent(new MouseEvent('mouseup'))
      expect(handleActive.value).toBe(true)
    })
  })

  describe('drag operations', () => {
    it('onDragOver reorders items', () => {
      const { keys } = useShortcuts()
      keys.value = [makeKey({ key: 'a' }), makeKey({ key: 'b' }), makeKey({ key: 'c' })]
      const { init } = useUndoRedo()
      init(keys)
      const { onHandleMouseDown, onDragStart, onDragOver, dragIndex } = useDragDrop()

      // Start drag from index 0
      onHandleMouseDown()
      onDragStart(makeDragEvent(), 0)
      expect(dragIndex.value).toBe(0)

      // Drag over index 2
      onDragOver(makeDragEvent(), 2)
      expect(keys.value[2].key).toBe('a')
      expect(dragIndex.value).toBe(2)
    })

    it('onDragEnd resets dragIndex', () => {
      const { keys } = useShortcuts()
      keys.value = [makeKey()]
      const { init } = useUndoRedo()
      init(keys)
      const { onHandleMouseDown, onDragStart, onDragEnd, dragIndex } = useDragDrop()

      onHandleMouseDown()
      onDragStart(makeDragEvent(), 0)
      expect(dragIndex.value).toBe(0)
      onDragEnd()
      expect(dragIndex.value).toBeNull()
    })

    it('onDragOver does nothing if dragIndex is null', () => {
      const { keys } = useShortcuts()
      keys.value = [makeKey({ key: 'a' }), makeKey({ key: 'b' })]
      const { onDragOver } = useDragDrop()
      const originalOrder = keys.value.map((k) => k.key)
      onDragOver(makeDragEvent(), 1)
      expect(keys.value.map((k) => k.key)).toEqual(originalOrder)
    })

    it('onDragOver does nothing if dragging over same index', () => {
      const { keys } = useShortcuts()
      keys.value = [makeKey({ key: 'a' }), makeKey({ key: 'b' })]
      const { init } = useUndoRedo()
      init(keys)
      const { onHandleMouseDown, onDragStart, onDragOver } = useDragDrop()
      onHandleMouseDown()
      onDragStart(makeDragEvent(), 0)
      const originalOrder = keys.value.map((k) => k.key)
      onDragOver(makeDragEvent(), 0)
      expect(keys.value.map((k) => k.key)).toEqual(originalOrder)
    })
  })
})
