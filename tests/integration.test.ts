import { describe, it, expect } from 'vitest'
import { globToRegex, isAllowedSite } from '../src/utils/url-matching'
import type { KeySetting } from '../src/utils/url-matching'
import { fetchConfig, shouldStopCallback } from '../src/utils/content-logic'
import { getAllActionValues, isBuiltInAction, ACTION_CATEGORIES, SCROLL_ACTIONS } from '../src/utils/actions-registry'

/**
 * Integration tests that verify cross-module behavior and real-world scenarios.
 */

describe('end-to-end shortcut filtering', () => {
  const shortcuts: KeySetting[] = [
    {
      key: 'ctrl+b',
      action: 'newtab',
      blacklist: true,
      sitesArray: ['*facebook.com*'],
      activeInInputs: false,
    },
    {
      key: 'ctrl+shift+g',
      action: 'searchgoogle',
      blacklist: 'whitelist',
      sitesArray: ['*github.com*'],
      activeInInputs: true,
    },
    {
      key: 'j',
      action: 'scrolldown',
      activeInInputs: false,
    },
  ]

  it('filters shortcuts by URL using isAllowedSite', () => {
    const url = 'https://facebook.com/feed'
    const allowed = shortcuts.filter((s) => isAllowedSite(s, url))
    // ctrl+b is blacklisted on facebook, ctrl+shift+g is whitelist-only for github, j has no filter
    expect(allowed.map((s) => s.key)).toEqual(['j'])
  })

  it('allows all shortcuts on non-blacklisted sites', () => {
    const url = 'https://example.com'
    const allowed = shortcuts.filter((s) => isAllowedSite(s, url))
    // ctrl+b allowed (not facebook), ctrl+shift+g blocked (not github), j allowed
    expect(allowed.map((s) => s.key)).toEqual(['ctrl+b', 'j'])
  })

  it('whitelisted shortcut works on matching site', () => {
    const url = 'https://github.com/repo/issues'
    const allowed = shortcuts.filter((s) => isAllowedSite(s, url))
    expect(allowed.map((s) => s.key)).toContain('ctrl+shift+g')
  })

  it('fetchConfig finds the right shortcut from filtered list', () => {
    const url = 'https://example.com'
    const allowed = shortcuts.filter((s) => isAllowedSite(s, url))
    const config = fetchConfig(allowed, 'ctrl+b')
    expect(config).toBeTruthy()
    expect((config as KeySetting).action).toBe('newtab')
  })

  it('stopCallback respects activeInInputs per-shortcut', () => {
    const inputEl = {
      tagName: 'INPUT',
      classList: { contains: () => false },
      isContentEditable: false,
    }

    // 'j' is not active in inputs — should stop
    expect(shouldStopCallback(inputEl, 'j', shortcuts)).toBe(true)

    // ctrl+shift+g IS active in inputs — should not stop
    expect(shouldStopCallback(inputEl, 'ctrl+shift+g', shortcuts)).toBe(false)
  })
})

describe('action registry completeness', () => {
  it('every action in manifest commands has a registry entry or is a special action', () => {
    // These are all the actions referenced in manifest commands
    const manifestActions = [
      'newtab', 'closetab', 'nexttab', 'prevtab', 'togglepin', 'togglemute',
      'onlytab', 'closelefttabs', 'closerighttabs', 'clonetab', 'movetabtonewwindow',
      'reopentab', 'firsttab', 'lasttab', 'lastusedtab', 'movetableft', 'movetabright',
      'movetabtofirst', 'movetabtolast', 'newwindow', 'newprivatewindow', 'closewindow',
      'fullscreen', 'zoomin', 'zoomout', 'zoomreset', 'back', 'forward', 'reload',
      'hardreload', 'searchgoogle', 'copyurl', 'top', 'bottom', 'scrolldown',
      'scrolldownmore', 'pagedown', 'scrollup', 'scrollupmore', 'pageup', 'scrollright',
      'scrollrightmore', 'scrollleft', 'scrollleftmore', 'cleardownloads', 'viewsource',
      'print', 'disable', 'opensettings', 'openextensions', 'openshortcuts',
      'showlatestdownload', 'capturescreenshot', 'capturefullsizescreenshot',
      'forcecapturefullsizescreenshot',
    ]

    const allValues = getAllActionValues()
    // Special actions handled outside the registry
    const specialActions = ['lastusedtab', 'capturescreenshot', 'capturefullsizescreenshot', 'forcecapturefullsizescreenshot']

    for (const action of manifestActions) {
      if (!specialActions.includes(action)) {
        expect(allValues, `Missing action: ${action}`).toContain(action)
      }
    }
  })

  it('SCROLL_ACTIONS are all in the Scrolling category plus top/bottom', () => {
    const scrollCat = ACTION_CATEGORIES['Scrolling'].map((a) => a.value)
    for (const sa of SCROLL_ACTIONS) {
      expect(scrollCat).toContain(sa)
    }
  })

  it('isBuiltInAction returns consistent results with action data', () => {
    for (const [, actions] of Object.entries(ACTION_CATEGORIES)) {
      for (const action of actions) {
        expect(isBuiltInAction(action.value)).toBe(!!action.builtin)
      }
    }
  })
})

describe('KeySetting type usage', () => {
  it('supports all optional fields without errors', () => {
    const minimal: KeySetting = { key: 'a', action: 'newtab' }
    expect(minimal.key).toBe('a')
    expect(minimal.blacklist).toBeUndefined()
    expect(minimal.sitesArray).toBeUndefined()
    expect(minimal.activeInInputs).toBeUndefined()
    expect(minimal.code).toBeUndefined()
    expect(minimal.bookmark).toBeUndefined()
  })

  it('supports full configuration', () => {
    const full: KeySetting = {
      key: 'ctrl+j',
      action: 'javascript',
      id: 'test-id',
      label: 'My Script',
      code: 'alert("hi")',
      activeInInputs: true,
      blacklist: 'whitelist',
      sites: '*example.com*',
      sitesArray: ['*example.com*'],
      smoothScrolling: true,
      currentWindow: false,
      bookmark: 'Test Bookmark',
      openurl: 'https://example.com',
      matchurl: '*example*',
      matchtitle: '*Test*',
      matchindex: '3',
      button: '#btn',
      openappid: 'app123',
      trigger: 'ctrl+k',
    }
    expect(full.key).toBe('ctrl+j')
    expect(full.action).toBe('javascript')
    expect(full.code).toBe('alert("hi")')
  })
})
