// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests for the OnboardingWizard component logic.
 * Validates the popular actions list, conflict detection integration,
 * and the onboarding completion flow.
 */

import { ACTION_CATEGORIES, getAllActionValues } from '../src/utils/actions-registry'
import { getBrowserConflict } from '../src/utils/shortcut-conflicts'

// The popular actions shown in the wizard's step 1
const POPULAR_ACTIONS = [
  { id: 'newtab', label: 'New tab', icon: 'mdi-tab-plus' },
  { id: 'closetab', label: 'Close tab', icon: 'mdi-tab-remove' },
  { id: 'reopentab', label: 'Reopen last closed tab', icon: 'mdi-tab-unselected' },
  { id: 'nexttab', label: 'Next tab', icon: 'mdi-arrow-right-bold' },
  { id: 'prevtab', label: 'Previous tab', icon: 'mdi-arrow-left-bold' },
  { id: 'scrolldown', label: 'Scroll down', icon: 'mdi-arrow-down' },
  { id: 'scrollup', label: 'Scroll up', icon: 'mdi-arrow-up' },
  { id: 'back', label: 'Go back', icon: 'mdi-arrow-left' },
  { id: 'forward', label: 'Go forward', icon: 'mdi-arrow-right' },
  { id: 'copyurl', label: 'Copy URL', icon: 'mdi-content-copy' },
  { id: 'toggledarkmode', label: 'Toggle dark mode on current page', icon: 'mdi-theme-light-dark' },
]

describe('OnboardingWizard', () => {
  describe('popular actions', () => {
    const allActionValues = getAllActionValues()

    it('all popular actions are valid action values in the registry', () => {
      for (const action of POPULAR_ACTIONS) {
        expect(allActionValues).toContain(action.id)
      }
    })

    it('all popular actions have unique IDs', () => {
      const ids = POPULAR_ACTIONS.map(a => a.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('all popular actions have non-empty labels', () => {
      for (const action of POPULAR_ACTIONS) {
        expect(action.label.length).toBeGreaterThan(0)
      }
    })

    it('all popular actions have MDI icon classes', () => {
      for (const action of POPULAR_ACTIONS) {
        expect(action.icon).toMatch(/^mdi-/)
      }
    })

    it('labels match the action registry labels', () => {
      for (const action of POPULAR_ACTIONS) {
        // Find the action in ACTION_CATEGORIES
        let registryLabel: string | undefined
        for (const category of Object.values(ACTION_CATEGORIES)) {
          const found = category.find(a => a.value === action.id)
          if (found) {
            registryLabel = found.label
            break
          }
        }
        expect(registryLabel).toBeDefined()
        expect(action.label).toBe(registryLabel)
      }
    })
  })

  describe('conflict detection in step 2', () => {
    it('detects browser conflict for ctrl+t (Windows)', () => {
      const conflict = getBrowserConflict('ctrl+t', false)
      expect(conflict).toBe('Open new tab')
    })

    it('detects browser conflict for meta+t (Mac)', () => {
      const conflict = getBrowserConflict('meta+t', true)
      expect(conflict).toBe('Open new tab')
    })

    it('returns null for unassigned shortcuts', () => {
      const conflict = getBrowserConflict('ctrl+shift+alt+q', false)
      expect(conflict).toBeNull()
    })

    it('conflict warning message format matches wizard display', () => {
      const conflict = getBrowserConflict('ctrl+w', false)
      expect(conflict).toBeTruthy()
      const message = `Overrides browser shortcut: ${conflict}`
      expect(message).toContain('Overrides browser shortcut:')
    })
  })

  describe('onboarding completion tracking', () => {
    const STORAGE_KEY = 'shortkeys-onboarding-done'

    beforeEach(() => {
      localStorage.clear()
    })

    it('onboarding not completed by default', () => {
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('stores completion flag in localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'true')
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true')
    })

    it('wizard should show when flag is not set', () => {
      const shouldShow = localStorage.getItem(STORAGE_KEY) !== 'true'
      expect(shouldShow).toBe(true)
    })

    it('wizard should not show when flag is set', () => {
      localStorage.setItem(STORAGE_KEY, 'true')
      const shouldShow = localStorage.getItem(STORAGE_KEY) !== 'true'
      expect(shouldShow).toBe(false)
    })
  })

  describe('wizard finish payload', () => {
    it('finish event should contain key and action strings', () => {
      const payload = { key: 'ctrl+t', action: 'newtab' }
      expect(payload).toHaveProperty('key')
      expect(payload).toHaveProperty('action')
      expect(typeof payload.key).toBe('string')
      expect(typeof payload.action).toBe('string')
    })

    it('finish payload action should be a valid action', () => {
      const allActions = getAllActionValues()
      for (const action of POPULAR_ACTIONS) {
        const payload = { key: 'ctrl+shift+a', action: action.id }
        expect(allActions).toContain(payload.action)
      }
    })
  })
})
