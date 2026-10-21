import { v4 as uuid } from 'uuid'
import { isShortcutAvailable, type KeySetting } from '@/utils/url-matching'
import { isPaletteAction } from '@/utils/command-palette'
import { handleAction } from '@/actions/action-handlers'
import { initLastUsedTabTracking } from '@/actions/last-used-tab'
import { loadKeys, saveKeys, migrateLocalToSync, onKeysChanged, loadGroupSettings } from '@/utils/storage'
import { trackUsage, loadUsageData } from '@/utils/usage-tracking'
import {
  initReviewPromptState,
  loadReviewPromptState,
  saveReviewPromptState,
  daysSinceInstall,
  REVIEW_URL,
} from '@/utils/review-prompt'

declare var handlers: Record<string, () => void>

export default defineBackground(() => {
  initLastUsedTabTracking()

  async function checkKeys(): Promise<void> {
    const raw = await loadKeys()
    const keys = JSON.parse(raw || '[]')
    for (const key of keys) {
      if (!key.id) {
        key.id = uuid()
      }
    }
    await saveKeys(keys)
  }

  async function registerUserScript(): Promise<void> {
    // userScripts API requires "Allow User Scripts" to be enabled in extension details
    if (!chrome.userScripts) return

    const raw = await loadKeys()
    const keys = JSON.parse(raw || '[]')
    const jsActions = keys.filter((k: any) => k.action === 'javascript')

    if (jsActions.length === 0) return

    const handlersObj =
      jsActions.reduce((acc: string, cur: any) => {
        acc += JSON.stringify(cur.id) + ':'
        acc += 'function() {' + cur.code + '},'
        return acc
      }, '{') + '}'

    function registerHandlers() {
      document.addEventListener('shortkeys_js_run', function (e: any) {
        if (handlers[e.detail]) {
          handlers[e.detail]()
        }
      })
    }

    try {
      const existingScripts = await chrome.userScripts.getScripts({ ids: ['shortkeys-actions'] })
      const scripts = [
        {
          id: 'shortkeys-actions',
          matches: ['*://*/*'] as string[],
          world: 'MAIN' as const,
          js: [{ code: `(function(){var handlers = ${handlersObj};\n(${registerHandlers.toString()})();})();` }],
        },
      ]

      if (existingScripts.length) {
        await chrome.userScripts.update(scripts)
      } else {
        await chrome.userScripts.register(scripts)
      }
    } catch (e) {
      // User hasn't enabled "Allow User Scripts" — silently ignore
    }
  }

  onKeysChanged(() => {
    registerUserScript()
    // Notify all tabs to re-fetch their shortcuts
    chrome.tabs.query({}).then((tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { action: 'refreshKeys' }).catch(() => {})
        }
      }
    })
  })

  const USAGE_MILESTONE = 50

  async function maybeShowReviewNotification(): Promise<void> {
    try {
      const state = await loadReviewPromptState()
      if (state.dismissed || state.notificationShown) return
      if (daysSinceInstall(state) < 7) return

      const usageData = await loadUsageData()
      const totalUses = Object.values(usageData).reduce((sum, entry) => sum + entry.count, 0)
      if (totalUses < USAGE_MILESTONE) return

      chrome.notifications.create('reviewPrompt', {
        type: 'basic',
        iconUrl: '/images/icon_128.png',
        title: 'Enjoying Shortkeys?',
        message:
          'Most of our reviews come from people with problems. A positive review from a happy user like you would really help!',
        requireInteraction: true,
        buttons: [{ title: 'Leave a review ⭐' }],
      })

      state.notificationShown = true
      await saveReviewPromptState(state)
    } catch {
      // Non-critical — silently ignore
    }
  }

  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'update') {
      await migrateLocalToSync()
      await checkKeys()
      await initReviewPromptState()
      registerUserScript()
      // Show what's new page
      chrome.tabs.create({ url: 'https://shortkeys.app/welcome' })
    } else if (details.reason === 'install') {
      await initReviewPromptState()
      // Open welcome page and then options
      chrome.tabs.create({ url: 'https://shortkeys.app/welcome' })
      chrome.runtime.openOptionsPage()
    }
  })

  browser.commands.onCommand.addListener((command) => {
    const action = command.split('-')[1]

    // Track usage for manifest command shortcuts (no shortcut ID available from commands API)
    // Commands don't carry the full KeySetting, so we can't track by ID here.
    // Usage tracking for these is handled when they route through the message listener instead.

    handleAction(action).catch(error => console.error('[Shortkeys] Action failed:', error))
  })

  browser.runtime.onMessage.addListener((request: any, _sender, sendResponse) => {
    const action = request.action

    if (action === 'runPaletteAction') {
      ;(async () => {
        const [raw, groups, tabs] = await Promise.all([
          loadKeys(), loadGroupSettings(), browser.tabs.query({ active: true, currentWindow: true }),
        ])
        const keys: KeySetting[] = JSON.parse(raw || '[]')
        let shortcut: KeySetting | undefined
        if (request.shortcutId) {
          shortcut = keys.find(key => key.id === request.shortcutId)
          if (!shortcut || !isShortcutAvailable(shortcut, tabs[0]?.url || '', groups)) {
            throw new Error('This shortcut is not available on the current site.')
          }
        } else if (isPaletteAction(request.builtinAction) && !keys.some(key => key.action === request.builtinAction)) {
          shortcut = { key: '', action: request.builtinAction }
        }
        if (!shortcut) throw new Error('This action is no longer available. Reopen the palette.')
        if (!await handleAction(shortcut.action, shortcut)) throw new Error('This action is not supported.')
        if (shortcut.id) await trackUsage(shortcut.id)
        sendResponse({ success: true })
      })().catch(error => {
        console.error('[Shortkeys] Palette action failed:', error)
        sendResponse({ error: error.message })
      })
      return true
    }

    if (action === 'fetchUrl') {
      fetch(request.url)
        .then(r => r.text())
        .then(text => sendResponse({ text }))
        .catch(e => sendResponse({ error: e.message }))
      return true
    }

    if (action === 'getKeys') {
      ;(async () => {
        const currentUrl = request.url
        const raw = await loadKeys()
        if (!raw) {
          chrome.notifications.create('settingsNotification', {
            type: 'basic',
            iconUrl: '/images/icon_128.png',
            title: 'Shortkeys upgraded',
            message: 'Action needed: re-save your shortcuts to continue using them.',
            requireInteraction: true,
            buttons: [{ title: 'Open and re-save settings' }],
          })
          sendResponse([])
          return
        }

        const keys = JSON.parse(raw)
        const groupSettingsData = await loadGroupSettings()
        const allowedKeys = keys.filter((key: any) =>
          isShortcutAvailable(key, currentUrl, groupSettingsData)
        )
        sendResponse(allowedKeys)
      })()
      return true
    }

    // Handle usage tracking messages from content scripts
    if (action === 'trackUsage') {
      trackUsage(request.shortcutId).then(() => maybeShowReviewNotification())
      return
    }

    // Track usage for all dispatched actions (if shortcut has an ID)
    if (request.id) {
      trackUsage(request.id).then(() => maybeShowReviewNotification())
    }

    handleAction(action, request).catch(error => console.error('[Shortkeys] Action failed:', error))
  })

  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId === 'settingsNotification' && buttonIndex === 0) {
      chrome.runtime.openOptionsPage()
    }
    if (notificationId === 'reviewPrompt' && buttonIndex === 0) {
      chrome.tabs.create({ url: REVIEW_URL })
    }
  })

  // Handle imports from shortkeys.app share links
  chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
    if (message.action === 'importShortcuts' && Array.isArray(message.shortcuts)) {
      ;(async () => {
        const raw = await loadKeys()
        const existing = JSON.parse(raw || '[]')
        const newShortcuts = message.shortcuts.map((s: any) => ({ ...s, id: s.id || uuid() }))
        const merged = existing.concat(newShortcuts)
        await saveKeys(merged)
        sendResponse({ success: true, count: newShortcuts.length })
      })()
      return true
    }
  })
})
