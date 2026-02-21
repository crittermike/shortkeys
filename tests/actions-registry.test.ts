import { describe, it, expect } from 'vitest'
import {
  ACTION_CATEGORIES,
  getAllActionValues,
  isBuiltInAction,
  SCROLL_ACTIONS,
  WEBSITE_OPTIONS,
} from '../src/utils/actions-registry'

describe('ACTION_CATEGORIES', () => {
  it('contains all expected categories', () => {
    const categories = Object.keys(ACTION_CATEGORIES)
    expect(categories).toContain('Scrolling')
    expect(categories).toContain('Location')
    expect(categories).toContain('Bookmarks')
    expect(categories).toContain('Tabs')
    expect(categories).toContain('Windows')
    expect(categories).toContain('Zooming')
    expect(categories).toContain('Miscellaneous')
    expect(categories).toContain('Video Controls')
    expect(categories).toContain('Search Providers')
    expect(categories).toContain('Page Tools')
    expect(categories).toHaveLength(10)
  })

  it('has valid structure for every action', () => {
    for (const [category, actions] of Object.entries(ACTION_CATEGORIES)) {
      expect(actions.length).toBeGreaterThan(0)
      for (const action of actions) {
        expect(action).toHaveProperty('value')
        expect(action).toHaveProperty('label')
        expect(typeof action.value).toBe('string')
        expect(typeof action.label).toBe('string')
        expect(action.value.length).toBeGreaterThan(0)
        expect(action.label.length).toBeGreaterThan(0)
      }
    }
  })

  it('has no duplicate action values', () => {
    const values = getAllActionValues()
    // 'disable' appears once, so all should be unique or intended duplicates
    const uniqueValues = new Set(values)
    expect(values.length).toBe(uniqueValues.size)
  })
})

describe('getAllActionValues', () => {
  it('returns a flat array of all action values', () => {
    const values = getAllActionValues()
    expect(Array.isArray(values)).toBe(true)
    expect(values.length).toBeGreaterThan(40)
    expect(values).toContain('newtab')
    expect(values).toContain('closetab')
    expect(values).toContain('javascript')
    expect(values).toContain('top')
    expect(values).toContain('bottom')
    expect(values).toContain('capturescreenshot')
  })

  it('includes all core tab actions', () => {
    const values = getAllActionValues()
    const tabActions = ['newtab', 'closetab', 'nexttab', 'prevtab', 'firsttab', 'lasttab',
      'reopentab', 'clonetab', 'onlytab', 'togglepin', 'togglemute']
    for (const action of tabActions) {
      expect(values).toContain(action)
    }
  })

  it('includes all scrolling actions', () => {
    const values = getAllActionValues()
    for (const action of SCROLL_ACTIONS) {
      expect(values).toContain(action)
    }
  })
})

describe('isBuiltInAction', () => {
  it('returns true for built-in actions', () => {
    expect(isBuiltInAction('newtab')).toBe(true)
    expect(isBuiltInAction('closetab')).toBe(true)
    expect(isBuiltInAction('reload')).toBe(true)
    expect(isBuiltInAction('top')).toBe(true)
    expect(isBuiltInAction('zoomin')).toBe(true)
  })

  it('returns false for non-built-in actions', () => {
    expect(isBuiltInAction('javascript')).toBe(false)
    expect(isBuiltInAction('gototab')).toBe(false)
    expect(isBuiltInAction('openbookmark')).toBe(false)
    expect(isBuiltInAction('lastusedtab')).toBe(false)
    expect(isBuiltInAction('trigger')).toBe(false)
  })

  it('returns false for unknown action values', () => {
    expect(isBuiltInAction('nonexistent')).toBe(false)
    expect(isBuiltInAction('')).toBe(false)
  })
})

describe('SCROLL_ACTIONS', () => {
  it('contains all scroll-related actions', () => {
    expect(SCROLL_ACTIONS).toContain('scrolldown')
    expect(SCROLL_ACTIONS).toContain('scrollup')
    expect(SCROLL_ACTIONS).toContain('scrollleft')
    expect(SCROLL_ACTIONS).toContain('scrollright')
    expect(SCROLL_ACTIONS).toContain('top')
    expect(SCROLL_ACTIONS).toContain('bottom')
    expect(SCROLL_ACTIONS).toContain('pageup')
    expect(SCROLL_ACTIONS).toContain('pagedown')
  })

  it('all scroll actions exist in ACTION_CATEGORIES', () => {
    const allValues = getAllActionValues()
    for (const action of SCROLL_ACTIONS) {
      expect(allValues).toContain(action)
    }
  })
})

describe('WEBSITE_OPTIONS', () => {
  it('has three options', () => {
    expect(WEBSITE_OPTIONS).toHaveLength(3)
  })

  it('has the expected values', () => {
    expect(WEBSITE_OPTIONS[0].value).toBe(false)
    expect(WEBSITE_OPTIONS[1].value).toBe(true)
    expect(WEBSITE_OPTIONS[2].value).toBe('whitelist')
  })

  it('has descriptive labels', () => {
    expect(WEBSITE_OPTIONS[0].label).toMatch(/all sites/i)
    expect(WEBSITE_OPTIONS[1].label).toMatch(/except/i)
    expect(WEBSITE_OPTIONS[2].label).toMatch(/only/i)
  })
})
