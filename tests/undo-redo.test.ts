import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/storage', () => ({
  saveKeys: vi.fn().mockResolvedValue('sync'),
  loadKeys: vi.fn().mockResolvedValue(null),
}))

import { useUndoRedo } from '../src/composables/useUndoRedo'
import { ref } from 'vue'
import type { KeySetting } from '../src/utils/url-matching'

function makeKey(overrides: Partial<KeySetting> = {}): KeySetting {
  return {
    id: Math.random().toString(36).slice(2),
    key: 'ctrl+a',
    action: 'newtab',
    enabled: true,
    sites: '',
    sitesArray: [''],
    ...overrides,
  } as KeySetting
}

describe('useUndoRedo', () => {
  let keys: ReturnType<typeof ref<KeySetting[]>>

  beforeEach(() => {
    keys = ref<KeySetting[]>([])
    const { init, undoStack, redoStack, lastActionLabel } = useUndoRedo()
    // Reset state
    undoStack.value = []
    redoStack.value = []
    lastActionLabel.value = ''
    init(keys)
  })

  describe('pushUndo', () => {
    it('snapshots the current keys state', () => {
      const { pushUndo, undoStack } = useUndoRedo()
      keys.value = [makeKey({ key: 'ctrl+a' })]
      pushUndo('test action')
      expect(undoStack.value).toHaveLength(1)
      expect(undoStack.value[0]).toHaveLength(1)
      expect(undoStack.value[0][0].key).toBe('ctrl+a')
    })

    it('creates deep clones (modifying keys does not affect stack)', () => {
      const { pushUndo, undoStack } = useUndoRedo()
      keys.value = [makeKey({ key: 'ctrl+a' })]
      pushUndo('test')
      keys.value[0].key = 'ctrl+b'
      expect(undoStack.value[0][0].key).toBe('ctrl+a')
    })

    it('clears redo stack on new action', () => {
      const { pushUndo, redoStack } = useUndoRedo()
      // Simulate some redo state
      redoStack.value = [[makeKey()]]
      pushUndo('new action')
      expect(redoStack.value).toHaveLength(0)
    })

    it('sets lastActionLabel', () => {
      const { pushUndo, lastActionLabel } = useUndoRedo()
      pushUndo('Shortcut deleted')
      expect(lastActionLabel.value).toBe('Shortcut deleted')
    })

    it('respects MAX_UNDO_DEPTH', () => {
      const { pushUndo, undoStack, MAX_UNDO_DEPTH } = useUndoRedo()
      for (let i = 0; i < MAX_UNDO_DEPTH + 5; i++) {
        keys.value = [makeKey({ key: `ctrl+${i}` })]
        pushUndo(`action ${i}`)
      }
      expect(undoStack.value).toHaveLength(MAX_UNDO_DEPTH)
      // Oldest entries should have been shifted off
      expect(undoStack.value[0][0].key).toBe('ctrl+5')
    })
  })

  describe('undo', () => {
    it('restores previous state', async () => {
      const { pushUndo, undo } = useUndoRedo()
      keys.value = [makeKey({ key: 'ctrl+a' })]
      pushUndo('before delete')
      keys.value = [] // simulate deletion
      await undo()
      expect(keys.value).toHaveLength(1)
      expect(keys.value[0].key).toBe('ctrl+a')
    })

    it('pushes current state to redo stack', async () => {
      const { pushUndo, undo, redoStack } = useUndoRedo()
      keys.value = [makeKey({ key: 'ctrl+a' })]
      pushUndo('test')
      keys.value = [makeKey({ key: 'ctrl+b' })]
      await undo()
      expect(redoStack.value).toHaveLength(1)
      expect(redoStack.value[0][0].key).toBe('ctrl+b')
    })

    it('is a no-op when undo stack is empty', async () => {
      const { undo, undoStack } = useUndoRedo()
      keys.value = [makeKey({ key: 'ctrl+a' })]
      await undo()
      expect(keys.value).toHaveLength(1)
      expect(keys.value[0].key).toBe('ctrl+a')
      expect(undoStack.value).toHaveLength(0)
    })

    it('calls saveKeys after undo', async () => {
      const { saveKeys } = await import('../src/utils/storage')
      const { pushUndo, undo } = useUndoRedo()
      keys.value = [makeKey()]
      pushUndo('test')
      keys.value = []
      await undo()
      expect(saveKeys).toHaveBeenCalled()
    })
  })

  describe('redo', () => {
    it('restores undone state', async () => {
      const { pushUndo, undo, redo } = useUndoRedo()
      keys.value = [makeKey({ key: 'ctrl+a' })]
      pushUndo('test')
      keys.value = [makeKey({ key: 'ctrl+b' })]
      await undo()
      expect(keys.value[0].key).toBe('ctrl+a')
      await redo()
      expect(keys.value[0].key).toBe('ctrl+b')
    })

    it('is a no-op when redo stack is empty', async () => {
      const { redo, redoStack } = useUndoRedo()
      keys.value = [makeKey({ key: 'ctrl+a' })]
      await redo()
      expect(keys.value).toHaveLength(1)
      expect(keys.value[0].key).toBe('ctrl+a')
      expect(redoStack.value).toHaveLength(0)
    })

    it('pushes current state to undo stack', async () => {
      const { pushUndo, undo, redo, undoStack } = useUndoRedo()
      keys.value = [makeKey({ key: 'ctrl+a' })]
      pushUndo('test')
      keys.value = []
      await undo()
      await redo()
      expect(undoStack.value.length).toBeGreaterThan(0)
    })
  })

  describe('canUndo / canRedo', () => {
    it('canUndo is false initially', () => {
      const { canUndo } = useUndoRedo()
      expect(canUndo.value).toBe(false)
    })

    it('canRedo is false initially', () => {
      const { canRedo } = useUndoRedo()
      expect(canRedo.value).toBe(false)
    })

    it('canUndo becomes true after pushUndo', () => {
      const { pushUndo, canUndo } = useUndoRedo()
      pushUndo('test')
      expect(canUndo.value).toBe(true)
    })

    it('canRedo becomes true after undo', async () => {
      const { pushUndo, undo, canRedo } = useUndoRedo()
      keys.value = [makeKey()]
      pushUndo('test')
      keys.value = []
      await undo()
      expect(canRedo.value).toBe(true)
    })

    it('canRedo becomes false after new pushUndo', async () => {
      const { pushUndo, undo, canRedo } = useUndoRedo()
      keys.value = [makeKey()]
      pushUndo('test')
      keys.value = []
      await undo()
      expect(canRedo.value).toBe(true)
      pushUndo('new action')
      expect(canRedo.value).toBe(false)
    })
  })

  describe('multiple undo/redo cycles', () => {
    it('handles three sequential undos', async () => {
      const { pushUndo, undo } = useUndoRedo()
      keys.value = [makeKey({ key: 'ctrl+1' })]
      pushUndo('step 1')
      keys.value = [makeKey({ key: 'ctrl+2' })]
      pushUndo('step 2')
      keys.value = [makeKey({ key: 'ctrl+3' })]
      pushUndo('step 3')
      keys.value = []

      await undo() // back to step 3
      expect(keys.value).toHaveLength(1)
      expect(keys.value[0].key).toBe('ctrl+3')

      await undo() // back to step 2
      expect(keys.value[0].key).toBe('ctrl+2')

      await undo() // back to step 1
      expect(keys.value[0].key).toBe('ctrl+1')
    })

    it('handles undo then redo then undo', async () => {
      const { pushUndo, undo, redo } = useUndoRedo()
      keys.value = [makeKey({ key: 'ctrl+a' })]
      pushUndo('step 1')
      keys.value = [makeKey({ key: 'ctrl+b' })]

      await undo()
      expect(keys.value[0].key).toBe('ctrl+a')

      await redo()
      expect(keys.value[0].key).toBe('ctrl+b')

      await undo()
      expect(keys.value[0].key).toBe('ctrl+a')
    })
  })
})
