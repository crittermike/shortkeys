import { v4 as uuid } from 'uuid'
import { isAllowedSite } from '@/utils/url-matching'
import { handleAction } from '@/actions/action-handlers'
import { initLastUsedTabTracking, switchToLastUsedTab } from '@/actions/last-used-tab'
import captureScreenshot from '@/actions/capture-screenshot'
import { loadKeys, saveKeys, migrateLocalToSync, onKeysChanged } from '@/utils/storage'

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
          js: [{ code: `var handlers = ${handlersObj};\n(${registerHandlers.toString()})();` }],
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

  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'update') {
      await migrateLocalToSync()
      await checkKeys()
      registerUserScript()
    } else if (details.reason === 'install') {
      chrome.runtime.openOptionsPage()
    }
  })

  browser.commands.onCommand.addListener((command) => {
    const action = command.split('-')[1]

    // Handle special actions that need direct imports
    if (action === 'lastusedtab') {
      switchToLastUsedTab()
      return
    }
    if (action === 'capturescreenshot') {
      captureScreenshot()
      return
    }
    if (action === 'capturefullsizescreenshot') {
      captureScreenshot({ fullsize: true })
      return
    }
    if (action === 'forcecapturefullsizescreenshot') {
      captureScreenshot({ fullsize: true, force: true })
      return
    }

    handleAction(action)
  })

  browser.runtime.onMessage.addListener((request: any, _sender, sendResponse) => {
    const action = request.action

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
        const allowedKeys = keys.filter((key: any) => key.enabled !== false && isAllowedSite(key, currentUrl))
        sendResponse(allowedKeys)
      })()
      return true
    }

    // Handle special actions
    if (action === 'lastusedtab') {
      switchToLastUsedTab()
      return
    }
    if (action === 'capturescreenshot') {
      captureScreenshot()
      return
    }
    if (action === 'capturefullsizescreenshot') {
      captureScreenshot({ fullsize: true })
      return
    }
    if (action === 'forcecapturefullsizescreenshot') {
      captureScreenshot({ fullsize: true, force: true })
      return
    }

    // Content-script-only actions — forward to active tab
    const contentScriptActions = ['showcheatsheet', 'toggledarkmode']
    if (contentScriptActions.includes(action)) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.id) chrome.tabs.sendMessage(tab.id, request).catch(() => {})
      })
      return
    }

    handleAction(action, request)
  })

  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId === 'settingsNotification' && buttonIndex === 0) {
      chrome.runtime.openOptionsPage()
    }
  })
})
