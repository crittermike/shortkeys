import { describe, it, expect } from 'vitest'

/**
 * Tests for the ShortcutRecorder key capture logic.
 * Uses e.code (physical key) to avoid unicode issues with Alt on Mac.
 */

interface MockKeyEvent {
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
  key: string
  code: string
}

function captureKeyToString(e: MockKeyEvent): string | null {
  const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta', 'OS']
  if (modifierKeys.includes(e.key)) return null

  const parts: string[] = []
  if (e.metaKey) parts.push('meta')
  if (e.ctrlKey && !e.metaKey) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')

  const codeMap: Record<string, string> = {
    'Space': 'space',
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
    'Minus': '-',
    'Equal': '=',
    'BracketLeft': '[',
    'BracketRight': ']',
    'Backslash': '\\',
    'Semicolon': ';',
    'Quote': "'",
    'Comma': ',',
    'Period': '.',
    'Slash': '/',
    'Backquote': '`',
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

const noMods = { ctrlKey: false, altKey: false, shiftKey: false, metaKey: false }

describe('ShortcutRecorder key capture', () => {
  it('captures simple letter key', () => {
    expect(captureKeyToString({ ...noMods, key: 'a', code: 'KeyA' })).toBe('a')
  })

  it('captures ctrl+key combo', () => {
    expect(captureKeyToString({ ...noMods, ctrlKey: true, key: 'b', code: 'KeyB' })).toBe('ctrl+b')
  })

  it('captures ctrl+shift+key combo', () => {
    expect(captureKeyToString({ ...noMods, ctrlKey: true, shiftKey: true, key: 'K', code: 'KeyK' })).toBe('ctrl+shift+k')
  })

  it('captures alt+key using physical key (not unicode)', () => {
    // On Mac, alt+l produces ¬ in e.key but e.code is still KeyL
    expect(captureKeyToString({ ...noMods, altKey: true, key: '¬', code: 'KeyL' })).toBe('alt+l')
  })

  it('captures alt+key with other unicode chars', () => {
    // alt+p on Mac produces π
    expect(captureKeyToString({ ...noMods, altKey: true, key: 'π', code: 'KeyP' })).toBe('alt+p')
  })

  it('captures ctrl+alt+shift+key', () => {
    expect(captureKeyToString({ ...noMods, ctrlKey: true, altKey: true, shiftKey: true, key: 'z', code: 'KeyZ' }))
      .toBe('ctrl+alt+shift+z')
  })

  it('captures meta (Cmd on Mac) as meta', () => {
    expect(captureKeyToString({ ...noMods, metaKey: true, key: 't', code: 'KeyT' })).toBe('meta+t')
  })

  it('captures meta+shift', () => {
    expect(captureKeyToString({ ...noMods, metaKey: true, shiftKey: true, key: 'T', code: 'KeyT' })).toBe('meta+shift+t')
  })

  it('meta takes precedence over ctrl (no double modifier)', () => {
    // On some systems both metaKey and ctrlKey can be true
    expect(captureKeyToString({ ...noMods, metaKey: true, ctrlKey: true, key: 'c', code: 'KeyC' })).toBe('meta+c')
  })

  it('ignores standalone modifier keys', () => {
    expect(captureKeyToString({ ...noMods, ctrlKey: true, key: 'Control', code: 'ControlLeft' })).toBeNull()
    expect(captureKeyToString({ ...noMods, shiftKey: true, key: 'Shift', code: 'ShiftLeft' })).toBeNull()
    expect(captureKeyToString({ ...noMods, altKey: true, key: 'Alt', code: 'AltLeft' })).toBeNull()
    expect(captureKeyToString({ ...noMods, metaKey: true, key: 'Meta', code: 'MetaLeft' })).toBeNull()
  })

  it('maps special keys via e.code', () => {
    const cases: [string, string, string][] = [
      ['ArrowUp', 'ArrowUp', 'up'],
      ['ArrowDown', 'ArrowDown', 'down'],
      ['ArrowLeft', 'ArrowLeft', 'left'],
      ['ArrowRight', 'ArrowRight', 'right'],
      ['Escape', 'Escape', 'escape'],
      ['Enter', 'Enter', 'enter'],
      ['Backspace', 'Backspace', 'backspace'],
      ['Delete', 'Delete', 'del'],
      ['Tab', 'Tab', 'tab'],
      ['Home', 'Home', 'home'],
      ['End', 'End', 'end'],
      ['PageUp', 'PageUp', 'pageup'],
      ['PageDown', 'PageDown', 'pagedown'],
      [' ', 'Space', 'space'],
    ]
    for (const [key, code, expected] of cases) {
      expect(captureKeyToString({ ...noMods, key, code }), `${code} → ${expected}`).toBe(expected)
    }
  })

  it('maps punctuation keys via e.code', () => {
    expect(captureKeyToString({ ...noMods, key: '-', code: 'Minus' })).toBe('-')
    expect(captureKeyToString({ ...noMods, key: '=', code: 'Equal' })).toBe('=')
    expect(captureKeyToString({ ...noMods, key: ',', code: 'Comma' })).toBe(',')
    expect(captureKeyToString({ ...noMods, key: '.', code: 'Period' })).toBe('.')
    expect(captureKeyToString({ ...noMods, key: '/', code: 'Slash' })).toBe('/')
  })

  it('handles function keys', () => {
    expect(captureKeyToString({ ...noMods, key: 'F1', code: 'F1' })).toBe('f1')
    expect(captureKeyToString({ ...noMods, ctrlKey: true, key: 'F5', code: 'F5' })).toBe('ctrl+f5')
  })

  it('handles digit keys', () => {
    expect(captureKeyToString({ ...noMods, ctrlKey: true, key: '1', code: 'Digit1' })).toBe('ctrl+1')
    expect(captureKeyToString({ ...noMods, key: '0', code: 'Digit0' })).toBe('0')
  })

  it('handles numpad keys', () => {
    expect(captureKeyToString({ ...noMods, key: '5', code: 'Numpad5' })).toBe('5')
  })

  it('ctrl+arrow on Mac', () => {
    expect(captureKeyToString({ ...noMods, ctrlKey: true, key: 'ArrowDown', code: 'ArrowDown' })).toBe('ctrl+down')
  })

  it('meta+alt combo on Mac', () => {
    expect(captureKeyToString({ ...noMods, metaKey: true, altKey: true, key: 'Dead', code: 'KeyI' })).toBe('meta+alt+i')
  })
})
