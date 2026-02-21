import { describe, it, expect } from 'vitest'

/**
 * Tests for the ShortcutRecorder key capture logic.
 * We test the pure key-mapping function extracted from the component.
 */

// Replicate the key mapping logic from ShortcutRecorder.vue
function captureKeyToString(e: {
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
  key: string
}): string | null {
  const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta', 'OS']
  if (modifierKeys.includes(e.key)) return null

  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push(e.metaKey && !e.ctrlKey ? 'meta' : 'ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')

  const keyMap: Record<string, string> = {
    ' ': 'space',
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'Escape': 'escape',
    'Enter': 'enter',
    'Backspace': 'backspace',
    'Delete': 'del',
    'Tab': 'tab',
    'Home': 'home',
    'End': 'end',
    'PageUp': 'pageup',
    'PageDown': 'pagedown',
    'Insert': 'ins',
    'CapsLock': 'capslock',
  }

  const key = keyMap[e.key] || e.key.toLowerCase()
  parts.push(key)

  return parts.join('+')
}

describe('ShortcutRecorder key capture', () => {
  it('captures simple letter key', () => {
    expect(captureKeyToString({ ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, key: 'a' }))
      .toBe('a')
  })

  it('captures ctrl+key combo', () => {
    expect(captureKeyToString({ ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, key: 'b' }))
      .toBe('ctrl+b')
  })

  it('captures ctrl+shift+key combo', () => {
    expect(captureKeyToString({ ctrlKey: true, altKey: false, shiftKey: true, metaKey: false, key: 'k' }))
      .toBe('ctrl+shift+k')
  })

  it('captures alt+key combo', () => {
    expect(captureKeyToString({ ctrlKey: false, altKey: true, shiftKey: false, metaKey: false, key: 'x' }))
      .toBe('alt+x')
  })

  it('captures ctrl+alt+shift+key', () => {
    expect(captureKeyToString({ ctrlKey: true, altKey: true, shiftKey: true, metaKey: false, key: 'z' }))
      .toBe('ctrl+alt+shift+z')
  })

  it('maps meta key (Cmd on Mac) to meta', () => {
    expect(captureKeyToString({ ctrlKey: false, altKey: false, shiftKey: false, metaKey: true, key: 't' }))
      .toBe('meta+t')
  })

  it('maps meta+ctrl to ctrl (meta assists ctrl)', () => {
    expect(captureKeyToString({ ctrlKey: true, altKey: false, shiftKey: false, metaKey: true, key: 'c' }))
      .toBe('ctrl+c')
  })

  it('ignores standalone modifier keys', () => {
    expect(captureKeyToString({ ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, key: 'Control' }))
      .toBeNull()
    expect(captureKeyToString({ ctrlKey: false, altKey: false, shiftKey: true, metaKey: false, key: 'Shift' }))
      .toBeNull()
    expect(captureKeyToString({ ctrlKey: false, altKey: true, shiftKey: false, metaKey: false, key: 'Alt' }))
      .toBeNull()
    expect(captureKeyToString({ ctrlKey: false, altKey: false, shiftKey: false, metaKey: true, key: 'Meta' }))
      .toBeNull()
    expect(captureKeyToString({ ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, key: 'OS' }))
      .toBeNull()
  })

  it('maps special keys to Mousetrap names', () => {
    const cases: [string, string][] = [
      ['ArrowUp', 'up'],
      ['ArrowDown', 'down'],
      ['ArrowLeft', 'left'],
      ['ArrowRight', 'right'],
      ['Escape', 'escape'],
      ['Enter', 'enter'],
      ['Backspace', 'backspace'],
      ['Delete', 'del'],
      ['Tab', 'tab'],
      ['Home', 'home'],
      ['End', 'end'],
      ['PageUp', 'pageup'],
      ['PageDown', 'pagedown'],
      ['Insert', 'ins'],
      ['CapsLock', 'capslock'],
      [' ', 'space'],
    ]
    for (const [input, expected] of cases) {
      expect(
        captureKeyToString({ ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, key: input }),
        `${input} → ${expected}`,
      ).toBe(expected)
    }
  })

  it('maps special keys with modifiers', () => {
    expect(captureKeyToString({ ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, key: 'ArrowDown' }))
      .toBe('ctrl+down')
    expect(captureKeyToString({ ctrlKey: false, altKey: true, shiftKey: true, metaKey: false, key: ' ' }))
      .toBe('alt+shift+space')
  })

  it('lowercases regular keys', () => {
    expect(captureKeyToString({ ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, key: 'A' }))
      .toBe('ctrl+a')
  })

  it('handles function keys', () => {
    expect(captureKeyToString({ ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, key: 'F1' }))
      .toBe('f1')
    expect(captureKeyToString({ ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, key: 'F5' }))
      .toBe('ctrl+f5')
  })

  it('handles number keys', () => {
    expect(captureKeyToString({ ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, key: '1' }))
      .toBe('ctrl+1')
  })
})
