import Mousetrap from 'mousetrap'
import { fetchConfig, shouldStopCallback } from '@/utils/content-logic'
import type { KeySetting } from '@/utils/url-matching'

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  allFrames: false,

  main() {
    let keys: KeySetting[] = []

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

      browser.runtime.sendMessage(message)
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

    // Fetch keys from background and activate them
    browser.runtime.sendMessage({ action: 'getKeys', url: document.URL }).then((response) => {
      if (response) {
        keys = response
        keys.forEach(activateKey)
      }
    })
  },
})
