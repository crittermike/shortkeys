import { describe, expect, it, vi } from 'vitest'
import type { KeySetting } from '../src/utils/url-matching'
import { copyActionParameters, needsActionSettings } from '../src/utils/action-parameters'

vi.mock('../src/composables/useShortcuts', () => ({
  useShortcuts: () => ({ expandedRow: { value: null } }),
}))
const { useMacros } = await import('../src/composables/useMacros')

describe('macro parameter conversion', () => {
  it.each([
    ['openurl', { openurl: 'https://example.com' }],
    ['javascript', { code: 'alert(1)' }],
    ['gototab', { matchurl: '*://example.com/*', openurl: 'https://example.com', currentWindow: true }],
    ['gototabbytitle', { matchtitle: '*Docs*', currentWindow: false }],
    ['gototabbyindex', { matchindex: '3' }],
    ['buttonnexttab', { button: '#submit' }],
    ['openbookmark', { bookmark: 'Docs' }],
    ['openapp', { openappid: 'abc' }],
    ['trigger', { trigger: 'ctrl+b' }],
    ['inserttext', { inserttext: 'hello' }],
    ['namegroup', { groupname: 'Research' }],
    ['scrolldown', { smoothScrolling: true }],
  ])('preserves %s parameters through conversion and JSON', (action, parameters) => {
    const row: KeySetting = { key: 'a', action, ...parameters }
    const { convertToMacro, convertToSingleAction } = useMacros()
    convertToMacro(row, 0)
    expect(row.macroSteps).toEqual([{ action, ...parameters }])
    const saved: KeySetting = JSON.parse(JSON.stringify(row))
    convertToSingleAction(saved)
    expect(saved.action).toBe(action)
    expect(copyActionParameters(action, saved)).toEqual(parameters)
    expect(saved.macroSteps).toBeUndefined()
  })

  it('clears stale parent parameters when converting back to a blank step', () => {
    const row: KeySetting = { key: 'a', action: 'macro', openurl: 'https://stale.example', macroSteps: [{ action: 'openurl' }] }
    useMacros().convertToSingleAction(row)
    expect(row.openurl).toBeUndefined()
  })

  it('distinguishes configurable actions from zero-config actions', () => {
    expect(needsActionSettings('openurl')).toBe(true)
    expect(needsActionSettings('macro')).toBe(true)
    expect(needsActionSettings('namegroup')).toBe(true)
    expect(needsActionSettings('scrolldown')).toBe(false)
    expect(needsActionSettings('movetabtonewwindow')).toBe(false)
  })
})
