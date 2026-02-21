import Mousetrap from 'mousetrap'
import { fetchConfig, shouldStopCallback } from '@/utils/content-logic'
import type { KeySetting } from '@/utils/url-matching'

export default defineContentScript({
  matches: ['<all_urls>', 'file:///*'],
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

      // Content-script-only actions (need direct DOM access)
      if (action === 'showcheatsheet') {
        toggleCheatSheet()
        return
      }
      if (action === 'toggledarkmode') {
        toggleDarkMode()
        return
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
      if (!keySetting.key) return
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

    function toggleCheatSheet() {
      const existing = document.getElementById('__shortkeys-cheatsheet')
      if (existing) { existing.remove(); return }

      const overlay = document.createElement('div')
      overlay.id = '__shortkeys-cheatsheet'
      Object.assign(overlay.style, {
        position: 'fixed', inset: '0', zIndex: '2147483647',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      })
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })

      const panel = document.createElement('div')
      Object.assign(panel.style, {
        background: '#1e293b', color: '#e2e8f0', borderRadius: '16px',
        padding: '24px 32px', maxWidth: '600px', width: '90vw',
        maxHeight: '70vh', overflowY: 'auto',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
      })

      const title = document.createElement('div')
      Object.assign(title.style, {
        fontSize: '16px', fontWeight: '700', marginBottom: '16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: '#f1f5f9',
      })
      title.innerHTML = '<span>⌨️ Shortkeys — Active Shortcuts</span><span style="color:#64748b;font-size:12px;font-weight:400">Press Esc or click outside to close</span>'
      panel.appendChild(title)

      const grid = document.createElement('div')
      Object.assign(grid.style, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' })

      const activeKeys = keys.filter((k) => k.key && k.action && k.enabled !== false)
      if (activeKeys.length === 0) {
        grid.style.gridTemplateColumns = '1fr'
        const empty = document.createElement('div')
        Object.assign(empty.style, { padding: '16px', textAlign: 'center', color: '#94a3b8' })
        empty.textContent = 'No active shortcuts on this page'
        grid.appendChild(empty)
      } else {
        for (const k of activeKeys) {
          const row = document.createElement('div')
          Object.assign(row.style, {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', background: '#334155', borderRadius: '8px', gap: '12px',
          })
          const label = document.createElement('span')
          Object.assign(label.style, { fontSize: '13px', color: '#cbd5e1', flex: '1', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
          label.textContent = k.label || k.action
          const kbd = document.createElement('span')
          Object.assign(kbd.style, { flexShrink: '0' })
          kbd.innerHTML = k.key.split('+').map((p) =>
            `<span style="display:inline-block;padding:2px 7px;background:#475569;border-radius:5px;font-size:11px;font-family:SF Mono,Menlo,monospace;color:#f1f5f9;margin-left:3px;text-transform:capitalize">${p}</span>`
          ).join('')
          row.appendChild(label)
          row.appendChild(kbd)
          grid.appendChild(row)
        }
      }
      panel.appendChild(grid)
      overlay.appendChild(panel)
      document.body.appendChild(overlay)

      // Close on Escape
      const closeOnEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', closeOnEsc) }
      }
      document.addEventListener('keydown', closeOnEsc)
    }

    function toggleDarkMode() {
      const STYLE_ID = '__shortkeys-darkmode'
      const existing = document.getElementById(STYLE_ID)
      if (existing) { existing.remove(); return }

      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = `
        html { filter: invert(1) hue-rotate(180deg) !important; }
        img, video, picture, canvas, svg, [style*="background-image"] {
          filter: invert(1) hue-rotate(180deg) !important;
        }
      `
      document.documentElement.appendChild(style)
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

    // Listen for live reload and forwarded content-script actions
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === 'refreshKeys') {
        loadKeys()
      } else if (message.action === 'showcheatsheet') {
        toggleCheatSheet()
      } else if (message.action === 'toggledarkmode') {
        toggleDarkMode()
      }
    })

    loadKeys()
  },
})
