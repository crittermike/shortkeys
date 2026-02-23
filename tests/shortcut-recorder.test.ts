import { describe, it, expect } from 'vitest'

/**
 * Tests for the ShortcutRecorder key capture logic.
 * Uses e.code (physical key) to avoid unicode issues with Alt on Mac.
 * Supports ctrl+meta together and multi-key sequences (e.g. "j j").
 */

interface MockKeyEvent {
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
  key: string
  code: string
}

function keyToString(e: MockKeyEvent): string | null {
  const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta', 'OS']
  if (modifierKeys.includes(e.key)) return null

  const parts: string[] = []
  if (e.metaKey) parts.push('meta')
  if (e.ctrlKey) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')

  const codeMap: Record<string, string> = {
    'Space': 'space', 'ArrowUp': 'up', 'ArrowDown': 'down',
    'ArrowLeft': 'left', 'ArrowRight': 'right', 'Escape': 'escape',
    'Enter': 'enter', 'Backspace': 'backspace', 'Delete': 'del',
    'Tab': 'tab', 'Home': 'home', 'End': 'end',
    'PageUp': 'pageup', 'PageDown': 'pagedown', 'Insert': 'ins',
    'CapsLock': 'capslock', 'Minus': '-', 'Equal': '=',
    'BracketLeft': '[', 'BracketRight': ']', 'Backslash': '\\',
    'Semicolon': ';', 'Quote': "'", 'Comma': ',',
    'Period': '.', 'Slash': '/', 'Backquote': '`',
  }

  let key: string
  const code = e.code
  if (codeMap[code]) {
    key = codeMap[code]
  } else if (code.startsWith('Key')) {
    key = code.slice(3).toLowerCase()
  } else if (code.startsWith('Digit')) {
    key = code.slice(5)
  } else if (code.startsWith('Numpad')) {
    key = code.slice(6).toLowerCase()
  } else if (code.startsWith('F') && /^F\d+$/.test(code)) {
    key = code.toLowerCase()
  } else {
    key = e.key.toLowerCase()
  }

  parts.push(key)
  return parts.join('+')
}

/** Simulate recording a sequence of keys */
function recordSequence(events: MockKeyEvent[]): string {
  const keys: string[] = []
  for (const e of events) {
    const result = keyToString(e)
    if (result) keys.push(result)
  }
  return keys.join(' ')
}

const noMods = { ctrlKey: false, altKey: false, shiftKey: false, metaKey: false }

describe('ShortcutRecorder key capture', () => {
  it('captures simple letter key', () => {
    expect(keyToString({ ...noMods, key: 'a', code: 'KeyA' })).toBe('a')
  })

  it('captures ctrl+key combo', () => {
    expect(keyToString({ ...noMods, ctrlKey: true, key: 'b', code: 'KeyB' })).toBe('ctrl+b')
  })

  it('captures ctrl+shift+key combo', () => {
    expect(keyToString({ ...noMods, ctrlKey: true, shiftKey: true, key: 'K', code: 'KeyK' })).toBe('ctrl+shift+k')
  })

  it('captures alt+key using physical key (not unicode)', () => {
    expect(keyToString({ ...noMods, altKey: true, key: '¬', code: 'KeyL' })).toBe('alt+l')
  })

  it('captures alt+key with other unicode chars', () => {
    expect(keyToString({ ...noMods, altKey: true, key: 'π', code: 'KeyP' })).toBe('alt+p')
  })

  it('captures meta (Cmd) as meta', () => {
    expect(keyToString({ ...noMods, metaKey: true, key: 't', code: 'KeyT' })).toBe('meta+t')
  })

  it('captures ctrl+meta together', () => {
    expect(keyToString({ ...noMods, metaKey: true, ctrlKey: true, key: 'o', code: 'KeyO' }))
      .toBe('meta+ctrl+o')
  })

  it('captures ctrl+meta+shift together', () => {
    expect(keyToString({ ...noMods, metaKey: true, ctrlKey: true, shiftKey: true, key: 'A', code: 'KeyA' }))
      .toBe('meta+ctrl+shift+a')
  })

  it('captures all four modifiers together', () => {
    expect(keyToString({ metaKey: true, ctrlKey: true, altKey: true, shiftKey: true, key: 'x', code: 'KeyX' }))
      .toBe('meta+ctrl+alt+shift+x')
  })

  it('ignores standalone modifier keys', () => {
    expect(keyToString({ ...noMods, ctrlKey: true, key: 'Control', code: 'ControlLeft' })).toBeNull()
    expect(keyToString({ ...noMods, shiftKey: true, key: 'Shift', code: 'ShiftLeft' })).toBeNull()
    expect(keyToString({ ...noMods, altKey: true, key: 'Alt', code: 'AltLeft' })).toBeNull()
    expect(keyToString({ ...noMods, metaKey: true, key: 'Meta', code: 'MetaLeft' })).toBeNull()
  })

  it('maps special keys via e.code', () => {
    const cases: [string, string, string][] = [
      ['ArrowUp', 'ArrowUp', 'up'],
      ['ArrowDown', 'ArrowDown', 'down'],
      [' ', 'Space', 'space'],
      ['Enter', 'Enter', 'enter'],
      ['Escape', 'Escape', 'escape'],
      ['Backspace', 'Backspace', 'backspace'],
      ['Tab', 'Tab', 'tab'],
    ]
    for (const [key, code, expected] of cases) {
      expect(keyToString({ ...noMods, key, code }), `${code} → ${expected}`).toBe(expected)
    }
  })

  it('maps punctuation keys', () => {
    expect(keyToString({ ...noMods, key: '-', code: 'Minus' })).toBe('-')
    expect(keyToString({ ...noMods, key: '=', code: 'Equal' })).toBe('=')
    expect(keyToString({ ...noMods, key: ',', code: 'Comma' })).toBe(',')
  })

  it('handles function keys', () => {
    expect(keyToString({ ...noMods, key: 'F1', code: 'F1' })).toBe('f1')
    expect(keyToString({ ...noMods, ctrlKey: true, key: 'F5', code: 'F5' })).toBe('ctrl+f5')
  })

  it('handles digit keys', () => {
    expect(keyToString({ ...noMods, ctrlKey: true, key: '1', code: 'Digit1' })).toBe('ctrl+1')
  })
})

describe('ShortcutRecorder sequence recording', () => {
  it('records single key as single entry', () => {
    expect(recordSequence([
      { ...noMods, key: 'j', code: 'KeyJ' },
    ])).toBe('j')
  })

  it('records vim-style double key (j j)', () => {
    expect(recordSequence([
      { ...noMods, key: 'j', code: 'KeyJ' },
      { ...noMods, key: 'j', code: 'KeyJ' },
    ])).toBe('j j')
  })

  it('records multi-key sequence (g i)', () => {
    expect(recordSequence([
      { ...noMods, key: 'g', code: 'KeyG' },
      { ...noMods, key: 'i', code: 'KeyI' },
    ])).toBe('g i')
  })

  it('records mixed modifier + plain sequence', () => {
    expect(recordSequence([
      { ...noMods, ctrlKey: true, key: 'a', code: 'KeyA' },
      { ...noMods, key: 'x', code: 'KeyX' },
    ])).toBe('ctrl+a x')
  })

  it('skips standalone modifiers in sequence', () => {
    expect(recordSequence([
      { ...noMods, ctrlKey: true, key: 'Control', code: 'ControlLeft' },
      { ...noMods, key: 'j', code: 'KeyJ' },
    ])).toBe('j')
  })
})
