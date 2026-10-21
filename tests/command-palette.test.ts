import { describe, expect, it } from 'vitest'
import { getPaletteItems, isPaletteAction } from '../src/utils/command-palette'
import type { KeySetting } from '../src/utils/url-matching'

describe('command palette', () => {
  it('exposes zero-config actions even without native browser commands', () => {
    const actions = getPaletteItems([], '', {}).map(item => item.action)
    expect(actions).toContain('onlytab')
    expect(actions).toContain('movetabtonewwindow')
    expect(actions).toContain('lastusedtab')
    expect(actions).toContain('script-qr-code')
    expect(actions).not.toContain('openurl')
    expect(actions).not.toContain('javascript')
    expect(actions).not.toContain('macro')
    expect(actions).not.toContain('disable')
  })

  it('puts configured shortcuts first without duplicating built-ins', () => {
    const keys: KeySetting[] = [{ id: 'saved', key: 'a', action: 'onlytab', label: 'Focus' }]
    const items = getPaletteItems(keys, 'https://example.com', {})
    expect(items[0].id).toBe('saved')
    expect(items.filter(item => item.action === 'onlytab')).toHaveLength(1)
  })

  it('does not bypass disabled, site, or group restrictions with built-ins', () => {
    const keys: KeySetting[] = [
      { id: 'disabled', key: 'a', action: 'newtab', enabled: false },
      { id: 'site', key: 'b', action: 'onlytab', blacklist: 'whitelist', sites: '*allowed.example*' },
      { id: 'group', key: 'c', action: 'movetabtonewwindow', group: 'Work' },
    ]
    const items = getPaletteItems(keys, 'https://blocked.example', { Work: { activateOn: 'allowed.example' } })
    expect(items.some(item => ['newtab', 'onlytab', 'movetabtonewwindow'].includes(item.action))).toBe(false)
    expect(getPaletteItems(keys, 'https://allowed.example', { Work: { activateOn: 'allowed.example' } }).slice(0, 2).map(item => item.id)).toEqual(['site', 'group'])
  })

  it('searches keys, custom labels, action names, descriptions and categories', () => {
    const keys: KeySetting[] = [{ id: 'saved', key: 'ctrl+alt+x', action: 'onlytab', label: 'Focus workspace' }]
    for (const query of ['ctrl+alt+x', 'focus workspace', 'onlytab', 'Close other tabs']) {
      expect(getPaletteItems(keys, '', {}, query).some(item => item.id === 'saved')).toBe(true)
    }
    expect(getPaletteItems([], '', {}, 'Scrolling').length).toBeGreaterThan(0)
    expect(getPaletteItems([], '', {}, 'immediately to the right').map(item => item.action)).toContain('newtabright')
    expect(isPaletteAction('not-an-action')).toBe(false)
  })
})
