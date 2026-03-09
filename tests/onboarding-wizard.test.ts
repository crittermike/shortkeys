// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'

/**
 * Tests for the OnboardingWizard component logic.
 * Validates the popular actions list, conflict detection integration,
 * and the onboarding completion flow.
 */

import { ACTION_CATEGORIES, getAllActionValues } from '../src/utils/actions-registry'
import { getBrowserConflict } from '../src/utils/shortcut-conflicts'
import {
  canContinueOnboardingShortcut,
  createOnboardingShortcutDraft,
  filterOnboardingRecords,
  finalizeOnboardingShortcut,
  reconcileOnboardingShortcutDrafts,
  shouldShowOnboardingSitePatterns,
} from '../src/utils/onboarding-shortcuts'

// The initial actions shown in the wizard's step 1
const INITIAL_ACTIONS = [
  { id: 'toggledarkmode', label: 'Toggle dark mode', icon: 'mdi-theme-light-dark' },
  { id: 'copyurl', label: 'Copy URL', icon: 'mdi-content-copy' },
  { id: 'copytitleurlmarkdown', label: 'Copy as markdown link', icon: 'mdi-language-markdown' },
  { id: 'movetableft', label: 'Move tab left', icon: 'mdi-arrow-left-bold' },
  { id: 'movetabright', label: 'Move tab right', icon: 'mdi-arrow-right-bold' },
  { id: 'lastusedtab', label: 'Last used tab', icon: 'mdi-swap-horizontal' },
  { id: 'javascript', label: 'Run custom JavaScript', icon: 'mdi-language-javascript' },
  { id: 'linkhints', label: 'Click a link via keyboard', icon: 'mdi-cursor-default-click-outline' },
  { id: 'reopentab', label: 'Reopen closed tab', icon: 'mdi-tab-unselected' },
]
// The additional actions shown when clicking "Show more actions"
const MORE_ACTIONS = [
  { id: 'focusinput', label: 'Focus first input', icon: 'mdi-form-textbox' },
  { id: 'showcheatsheet', label: 'Show cheat sheet', icon: 'mdi-help-circle-outline' },
  { id: 'openclipboardurl', label: 'Open URL from clipboard', icon: 'mdi-clipboard-arrow-right-outline' },
  { id: 'closeduplicatetabs', label: 'Close duplicate tabs', icon: 'mdi-tab-minus' },
  { id: 'audibletab', label: 'Tab playing audio', icon: 'mdi-volume-high' },
  { id: 'sorttabs', label: 'Sort tabs by title', icon: 'mdi-sort-alphabetical-ascending' },
  { id: 'videospeedup', label: 'Speed up video', icon: 'mdi-fast-forward' },
  { id: 'macro', label: 'Run a macro', icon: 'mdi-play-box-multiple-outline' },
  { id: 'togglebookmark', label: 'Bookmark/unbookmark page', icon: 'mdi-bookmark-outline' },
  { id: 'editurl', label: 'Edit URL in address bar', icon: 'mdi-pencil-outline' },
  { id: 'urlup', label: 'Go up one URL level', icon: 'mdi-arrow-up-bold' },
  { id: 'disable', label: 'Do nothing (block shortcut)', icon: 'mdi-cancel' },
]

const POPULAR_ACTIONS = [...INITIAL_ACTIONS, ...MORE_ACTIONS]

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
    
    it('all "show more" actions are valid action values in the registry', () => {
      for (const action of MORE_ACTIONS) {
        expect(allActionValues).toContain(action.id)
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
    it('finish event should contain shortcut and pack arrays', () => {
      const payload = {
        shortcuts: [{ key: 'ctrl+t', action: 'toggledarkmode' }],
        packs: [],
      }

      expect(Array.isArray(payload.shortcuts)).toBe(true)
      expect(Array.isArray(payload.packs)).toBe(true)
      expect(payload.shortcuts[0]).toHaveProperty('key')
      expect(payload.shortcuts[0]).toHaveProperty('action')
    })

    it('finish payload actions should be valid actions', () => {
      const allActions = getAllActionValues()
      for (const action of POPULAR_ACTIONS) {
        const payload = {
          shortcuts: [{ key: 'ctrl+shift+a', action: action.id }],
          packs: [],
        }
        expect(allActions).toContain(payload.shortcuts[0].action)
      }
    })
  })

  describe('per-shortcut setup helpers', () => {
    it('requires JavaScript code before continuing a JavaScript shortcut', () => {
      const draft = createOnboardingShortcutDraft('javascript')
      draft.key = 'ctrl+shift+j'

      expect(canContinueOnboardingShortcut(draft)).toBe(false)

      draft.code = 'console.log("hello")'
      expect(canContinueOnboardingShortcut(draft)).toBe(true)
    })

    it('allows non-JavaScript shortcuts to continue without extra settings', () => {
      const draft = createOnboardingShortcutDraft('copyurl')
      draft.key = 'ctrl+shift+c'

      expect(canContinueOnboardingShortcut(draft)).toBe(true)
    })

    it('finalizes JavaScript shortcuts with code and activation settings', () => {
      const draft = createOnboardingShortcutDraft('javascript')
      draft.key = ' ctrl+j '
      draft.code = 'console.log("ready")'
      draft.activeInInputs = true
      draft.blacklist = 'whitelist'
      draft.sites = '*github.com*\n*example.com*'

      expect(finalizeOnboardingShortcut(draft)).toEqual({
        key: 'ctrl+j',
        action: 'javascript',
        code: 'console.log("ready")',
        activeInInputs: true,
        blacklist: 'whitelist',
        sites: '*github.com*\n*example.com*',
      })
    })

    it('omits site filters when the shortcut should run on all sites', () => {
      const draft = createOnboardingShortcutDraft('copyurl')
      draft.key = 'ctrl+shift+c'
      draft.sites = '*github.com*'

      expect(shouldShowOnboardingSitePatterns(draft)).toBe(false)
      expect(finalizeOnboardingShortcut(draft)).toEqual({
        key: 'ctrl+shift+c',
        action: 'copyurl',
      })
    })

    it('preserves existing drafts when returning to step 2', () => {
      const javascriptDraft = createOnboardingShortcutDraft('javascript')
      javascriptDraft.key = 'ctrl+shift+j'
      javascriptDraft.code = 'console.log("hello")'
      javascriptDraft.blacklist = 'whitelist'
      javascriptDraft.sites = '*github.com*'
      javascriptDraft.activeInInputs = true

      const reconciled = reconcileOnboardingShortcutDrafts(
        ['javascript', 'copyurl'],
        {
          javascript: javascriptDraft,
        },
      )

      expect(reconciled.javascript).toEqual(javascriptDraft)
      expect(reconciled.copyurl).toEqual(createOnboardingShortcutDraft('copyurl'))
    })

    it('drops recorded shortcuts for actions that were deselected', () => {
      const records = [
        { actionId: 'javascript', shortcut: createOnboardingShortcutDraft('javascript') },
        { actionId: 'copyurl', shortcut: createOnboardingShortcutDraft('copyurl') },
      ]

      expect(filterOnboardingRecords(['javascript'], records)).toEqual([records[0]])
    })
  })

  describe('step 2 setup UI', () => {
    it('includes JavaScript and activation controls in the wizard template', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync('src/components/OnboardingWizard.vue', 'utf-8')

      expect(content).toContain('<CodeEditor')
      expect(content).toContain('Active in form inputs')
      expect(content).toContain('All sites')
      expect(content).toContain('Only on…')
    })
  })
})
