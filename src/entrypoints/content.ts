import Mousetrap from 'mousetrap'
import { fetchConfig, shouldStopCallback } from '@/utils/content-logic'
import type { KeySetting } from '@/utils/url-matching'

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  allFrames: false,

  main() {
    let keys: KeySetting[] = []

    /** Check if the extension context is still valid (not orphaned after reload). */
    function isContextValid(): boolean {
      try {
        return !!chrome.runtime?.id
      } catch {
        return false
      }
    }

    function doAction(keySetting: KeySetting): void {
      const action = keySetting.action

      // Custom JS runs via event dispatch to MAIN world
      if (action === 'javascript') {
        document.dispatchEvent(new CustomEvent('shortkeys_js_run', { detail: keySetting.id }))
        return
      }

      if (action === 'trigger' && keySetting.trigger) {
        Mousetrap.trigger(keySetting.trigger)
      }

      const message: any = { ...keySetting }
      if (action === 'buttonnexttab') {
        if (keySetting.button) {
          document.querySelector<HTMLElement>(keySetting.button)?.click()
        }
        message.action = 'nexttab'
      }

      if (!isContextValid()) return
      browser.runtime.sendMessage(message).catch(() => {})
    }

    function activateKey(keySetting: KeySetting): void {
      Mousetrap.bind(keySetting.key.toLowerCase(), () => {
        doAction(keySetting)
        return false
      })
    }

    // Override stopCallback to respect per-shortcut input settings
    Mousetrap.prototype.stopCallback = function (
      _e: KeyboardEvent,
      element: HTMLElement,
      combo: string,
    ) {
      return shouldStopCallback(element, combo, keys)
    }

    function bindAllKeys() {
      Mousetrap.reset()
      keys.forEach(activateKey)
    }

    // Fetch keys from background and activate them
    function loadKeys() {
      if (!isContextValid()) return
      browser.runtime.sendMessage({ action: 'getKeys', url: document.URL }).then((response) => {
        if (response) {
          keys = response
          bindAllKeys()
        }
      }).catch(() => {})
    }

    // Listen for live reload when shortcuts are saved
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === 'refreshKeys') {
        loadKeys()
      }
    })

    loadKeys()
  },
})
