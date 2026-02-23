import { describe, it, expect } from 'vitest'
import { fetchConfig, shouldStopCallback } from '../src/utils/content-logic'

describe('fetchConfig', () => {
  const keys = [
    { key: 'ctrl+b', action: 'newtab', activeInInputs: false },
    { key: 'ctrl+shift+l', action: 'reload', activeInInputs: true },
    { key: 'g g', action: 'top', activeInInputs: false },
  ]

  it('returns the matching key config for a known combo', () => {
    const result = fetchConfig(keys, 'ctrl+b')
    expect(result).toEqual(keys[0])
  })

  it('returns the matching key config for key sequences', () => {
    const result = fetchConfig(keys, 'g g')
    expect(result).toEqual(keys[2])
  })

  it('returns false for unknown combos', () => {
    expect(fetchConfig(keys, 'ctrl+z')).toBe(false)
  })

  it('returns false for an empty keys array', () => {
    expect(fetchConfig([], 'ctrl+b')).toBe(false)
  })

  it('returns the last match if duplicates exist', () => {
    const dupes = [
      { key: 'ctrl+b', action: 'first' },
      { key: 'ctrl+b', action: 'second' },
    ]
    const result = fetchConfig(dupes, 'ctrl+b')
    expect(result.action).toBe('second')
  })
})

describe('shouldStopCallback', () => {
  const keys = [
    { key: 'ctrl+b', action: 'newtab', activeInInputs: false },
    { key: 'ctrl+shift+l', action: 'reload', activeInInputs: true },
  ]

  function makeElement(tagName, { classList = [], isContentEditable = false, role = null } = {}) {
    return {
      tagName,
      classList: {
        contains: (cls) => classList.includes(cls),
      },
      isContentEditable,
      getAttribute: (name) => name === 'role' ? role : null,
    }
  }

  describe('elements with mousetrap class', () => {
    it('always stops the callback (prevents conflicts with site shortcuts)', () => {
      const el = makeElement('DIV', { classList: ['mousetrap'] })
      expect(shouldStopCallback(el, 'ctrl+b', keys)).toBe(true)
    })

    it('stops even if activeInInputs is true', () => {
      const el = makeElement('INPUT', { classList: ['mousetrap'] })
      expect(shouldStopCallback(el, 'ctrl+shift+l', keys)).toBe(true)
    })
  })

  describe('shortcuts NOT active in inputs', () => {
    it('stops in INPUT elements', () => {
      const el = makeElement('INPUT')
      expect(shouldStopCallback(el, 'ctrl+b', keys)).toBe(true)
    })

    it('stops in TEXTAREA elements', () => {
      const el = makeElement('TEXTAREA')
      expect(shouldStopCallback(el, 'ctrl+b', keys)).toBe(true)
    })

    it('stops in SELECT elements', () => {
      const el = makeElement('SELECT')
      expect(shouldStopCallback(el, 'ctrl+b', keys)).toBe(true)
    })

    it('stops in contentEditable elements', () => {
      const el = makeElement('DIV', { isContentEditable: true })
      expect(shouldStopCallback(el, 'ctrl+b', keys)).toBe(true)
    })

    it('stops in elements with role="textbox" (e.g. Reddit)', () => {
      const el = makeElement('DIV', { role: 'textbox' })
      expect(shouldStopCallback(el, 'ctrl+b', keys)).toBe(true)
    })

    it('stops in elements with role="combobox"', () => {
      const el = makeElement('DIV', { role: 'combobox' })
      expect(shouldStopCallback(el, 'ctrl+b', keys)).toBe(true)
    })

    it('stops in elements with role="searchbox"', () => {
      const el = makeElement('DIV', { role: 'searchbox' })
      expect(shouldStopCallback(el, 'ctrl+b', keys)).toBe(true)
    })

    it('does not stop in regular DIV elements', () => {
      const el = makeElement('DIV')
      expect(shouldStopCallback(el, 'ctrl+b', keys)).toBe(false)
    })

    it('does not stop in BODY elements', () => {
      const el = makeElement('BODY')
      expect(shouldStopCallback(el, 'ctrl+b', keys)).toBe(false)
    })
  })

  describe('shortcuts active in inputs', () => {
    it('does not stop in INPUT elements', () => {
      const el = makeElement('INPUT')
      expect(shouldStopCallback(el, 'ctrl+shift+l', keys)).toBe(false)
    })

    it('does not stop in TEXTAREA elements', () => {
      const el = makeElement('TEXTAREA')
      expect(shouldStopCallback(el, 'ctrl+shift+l', keys)).toBe(false)
    })

    it('does not stop in contentEditable elements', () => {
      const el = makeElement('DIV', { isContentEditable: true })
      expect(shouldStopCallback(el, 'ctrl+shift+l', keys)).toBe(false)
    })
  })

  describe('unknown combos', () => {
    it('stops in form inputs (treats as not active in inputs)', () => {
      const el = makeElement('INPUT')
      expect(shouldStopCallback(el, 'unknown+combo', keys)).toBe(true)
    })

    it('does not stop in non-form elements', () => {
      const el = makeElement('DIV')
      expect(shouldStopCallback(el, 'unknown+combo', keys)).toBe(false)
    })
  })
})
