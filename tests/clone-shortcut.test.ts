import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/storage', () => ({
  saveKeys: vi.fn().mockResolvedValue('sync'),
  loadKeys: vi.fn().mockResolvedValue(null),
}))

import { useShortcuts } from '../src/composables/useShortcuts'
import type { KeySetting } from '../src/utils/url-matching'

function makeKey(overrides: Partial<KeySetting> = {}): KeySetting {
  return {
    id: 'original-id',
    key: 'ctrl+a',
    action: 'javascript',
    enabled: true,
    sites: 'example.com',
    sitesArray: ['example.com'],
    code: 'console.log("hello")',
    group: 'My Group',
    label: 'Test shortcut',
    ...overrides,
  } as KeySetting
}

describe('clone shortcut (#829)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { keys } = useShortcuts()
    keys.value = []
  })

  it('inserts a copy directly after the original', () => {
    const { keys, cloneShortcut } = useShortcuts()
    keys.value = [makeKey(), makeKey({ id: 'second', key: 'ctrl+b', action: 'closetab' })]

    cloneShortcut(0)

    expect(keys.value).toHaveLength(3)
    expect(keys.value[1].action).toBe('javascript')
    expect(keys.value[2].id).toBe('second')
  })

  it('assigns a new unique ID to the clone', () => {
    const { keys, cloneShortcut } = useShortcuts()
    keys.value = [makeKey()]

    cloneShortcut(0)

    expect(keys.value[1].id).not.toBe(keys.value[0].id)
    expect(keys.value[1].id).toBeTruthy()
  })

  it('deep-copies all fields from the original', () => {
    const { keys, cloneShortcut } = useShortcuts()
    keys.value = [makeKey()]

    cloneShortcut(0)

    const clone = keys.value[1]
    expect(clone.key).toBe('ctrl+a')
    expect(clone.action).toBe('javascript')
    expect(clone.code).toBe('console.log("hello")')
    expect(clone.sites).toBe('example.com')
    expect(clone.group).toBe('My Group')
    expect(clone.label).toBe('Test shortcut')
    expect(clone.enabled).toBe(true)
  })

  it('clone is independent — modifying it does not affect the original', () => {
    const { keys, cloneShortcut } = useShortcuts()
    keys.value = [makeKey({ macroSteps: [{ action: 'newtab', delay: 100 }] })]

    cloneShortcut(0)

    keys.value[1].key = 'ctrl+z'
    keys.value[1].code = 'modified'
    keys.value[1].macroSteps![0].delay = 999

    expect(keys.value[0].key).toBe('ctrl+a')
    expect(keys.value[0].code).toBe('console.log("hello")')
    expect(keys.value[0].macroSteps![0].delay).toBe(100)
  })

  it('cloning the last item appends to the end', () => {
    const { keys, cloneShortcut } = useShortcuts()
    keys.value = [makeKey({ id: 'first' }), makeKey({ id: 'last', key: 'ctrl+b' })]

    cloneShortcut(1)

    expect(keys.value).toHaveLength(3)
    expect(keys.value[2].key).toBe('ctrl+b')
    expect(keys.value[2].id).not.toBe('last')
  })
})
