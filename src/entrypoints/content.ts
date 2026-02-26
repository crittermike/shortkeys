import Mousetrap from 'mousetrap'
import { fetchConfig, shouldStopCallback } from '@/utils/content-logic'
import { ACTION_CATEGORIES } from '@/utils/actions-registry'
import type { KeySetting } from '@/utils/url-matching'
import { getSiteShortcuts } from '@/site-shortcuts'

export default defineContentScript({
  matches: ['<all_urls>', 'file:///*'],
  runAt: 'document_end',
  allFrames: false,

  main() {
    let keys: KeySetting[] = []

    // Build action → label lookup for cheat sheet
    const actionLabels: Record<string, string> = {}
    for (const actions of Object.values(ACTION_CATEGORIES)) {
      for (const a of actions) actionLabels[a.value] = a.label
    }

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
        trackContentAction(keySetting)
        return
      }

      if (action === 'trigger' && keySetting.trigger) {
        Mousetrap.trigger(keySetting.trigger)
        trackContentAction(keySetting)
      }

      // Content-script-only actions (need direct DOM access)
      if (action === 'showcheatsheet') {
        toggleCheatSheet()
        trackContentAction(keySetting)
        return
      }
      if (action === 'toggledarkmode') {
        toggleDarkMode()
        trackContentAction(keySetting)
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
      // Usage tracking for these actions happens in background.ts when it receives the message
      browser.runtime.sendMessage(message).catch(() => {})
    }

    /** Send a tracking message to background for actions handled entirely in content script. */
    function trackContentAction(keySetting: KeySetting): void {
      if (!keySetting.id || !isContextValid()) return
      browser.runtime.sendMessage({ action: 'trackUsage', shortcutId: keySetting.id }).catch(() => {})
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

      const siteData = getSiteShortcuts(document.URL)
      const activeKeys = keys.filter((k) => k.key && k.action && k.enabled !== false)
      const hasSiteShortcuts = !!siteData
      const hasUserShortcuts = activeKeys.length > 0

      // --- Shared styles ---
      const kbdStyle = 'display:inline-block;padding:2px 7px;background:#475569;border-radius:5px;font-size:11px;font-family:SF Mono,Menlo,monospace;color:#f1f5f9;margin-left:3px;text-transform:capitalize'

      function renderKbd(parts: string[]): string {
        return parts.map((p) => `<span style="${kbdStyle}">${p}</span>`).join('')
      }

      function createShortcutRow(labelText: string, kbdHtml: string): HTMLElement {
        const row = document.createElement('div')
        Object.assign(row.style, {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 12px', background: '#334155', borderRadius: '8px', gap: '12px',
        })
        const label = document.createElement('span')
        Object.assign(label.style, { fontSize: '13px', color: '#cbd5e1', flex: '1', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
        label.textContent = labelText
        const kbd = document.createElement('span')
        Object.assign(kbd.style, { flexShrink: '0' })
        kbd.innerHTML = kbdHtml
        row.appendChild(label)
        row.appendChild(kbd)
        return row
      }

      function createEmptyMessage(text: string): HTMLElement {
        const empty = document.createElement('div')
        Object.assign(empty.style, { padding: '16px', textAlign: 'center', color: '#94a3b8' })
        empty.textContent = text
        return empty
      }

      // --- Build user shortcuts content ---
      function buildUserContent(): HTMLElement {
        const container = document.createElement('div')
        const grid = document.createElement('div')
        Object.assign(grid.style, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' })
        if (!hasUserShortcuts) {
          grid.style.gridTemplateColumns = '1fr'
          grid.appendChild(createEmptyMessage('No active shortcuts on this page'))
        } else {
          for (const k of activeKeys) {
            const labelText = k.label || actionLabels[k.action] || k.action
            grid.appendChild(createShortcutRow(labelText, renderKbd(k.key.split('+'))))
          }
        }
        container.appendChild(grid)
        return container
      }

      // --- Build site shortcuts content ---
      function buildSiteContent(): HTMLElement {
        const container = document.createElement('div')
        if (!siteData) return container
        for (const section of siteData.sections) {
          const header = document.createElement('div')
          Object.assign(header.style, {
            fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase',
            letterSpacing: '0.05em', padding: '12px 0 6px', marginTop: '4px',
          })
          header.textContent = section.name
          container.appendChild(header)

          const grid = document.createElement('div')
          Object.assign(grid.style, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' })
          for (const s of section.shortcuts) {
            grid.appendChild(createShortcutRow(s.description, renderKbd(s.keys)))
          }
          container.appendChild(grid)
        }

        // Reference link
        const refLink = document.createElement('a')
        Object.assign(refLink.style, {
          display: 'block', textAlign: 'center', marginTop: '16px',
          fontSize: '12px', color: '#60a5fa', textDecoration: 'none',
        })
        refLink.href = siteData.referenceUrl
        refLink.target = '_blank'
        refLink.rel = 'noopener noreferrer'
        refLink.textContent = `View all ${siteData.title} keyboard shortcuts ↗`
        refLink.addEventListener('mouseenter', () => { refLink.style.textDecoration = 'underline' })
        refLink.addEventListener('mouseleave', () => { refLink.style.textDecoration = 'none' })
        container.appendChild(refLink)

        return container
      }

      // --- Overlay ---
      const overlay = document.createElement('div')
      overlay.id = '__shortkeys-cheatsheet'
      Object.assign(overlay.style, {
        position: 'fixed', inset: '0', zIndex: '2147483647',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      })
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })

      // --- Panel ---
      const panel = document.createElement('div')
      Object.assign(panel.style, {
        background: '#1e293b', color: '#e2e8f0', borderRadius: '16px',
        padding: '24px 32px', maxWidth: '700px', width: '90vw',
        maxHeight: '70vh', overflowY: 'auto',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
      })

      // --- Title bar ---
      const title = document.createElement('div')
      Object.assign(title.style, {
        fontSize: '16px', fontWeight: '700', marginBottom: '16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: '#f1f5f9',
      })
      title.innerHTML = '<span>⌨️ Keyboard Shortcuts</span><span style="color:#64748b;font-size:12px;font-weight:400">Press Esc or click outside to close</span>'
      panel.appendChild(title)

      // --- Content area ---
      const contentArea = document.createElement('div')

      if (hasSiteShortcuts) {
        // Tabbed UI
        const tabBar = document.createElement('div')
        Object.assign(tabBar.style, {
          display: 'flex', gap: '0', marginBottom: '16px',
          borderBottom: '2px solid #334155',
        })

        const tabs: { label: string; build: () => HTMLElement }[] = [
          { label: 'Your shortcuts', build: buildUserContent },
          { label: `${siteData!.title} shortcuts`, build: buildSiteContent },
        ]

        const tabButtons: HTMLElement[] = []

        function activateTab(index: number) {
          contentArea.innerHTML = ''
          contentArea.appendChild(tabs[index].build())
          tabButtons.forEach((btn, i) => {
            if (i === index) {
              Object.assign(btn.style, {
                color: '#60a5fa', borderBottomColor: '#60a5fa',
              })
            } else {
              Object.assign(btn.style, {
                color: '#94a3b8', borderBottomColor: 'transparent',
              })
            }
          })
        }

        tabs.forEach((tab, i) => {
          const btn = document.createElement('button')
          Object.assign(btn.style, {
            background: 'none', border: 'none', borderBottom: '2px solid transparent',
            padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
            color: '#94a3b8', marginBottom: '-2px', transition: 'color 0.15s, border-color 0.15s',
            fontFamily: 'inherit',
          })
          btn.textContent = tab.label
          btn.addEventListener('click', () => activateTab(i))
          btn.addEventListener('mouseenter', () => { if (btn.style.color !== 'rgb(96, 165, 250)') btn.style.color = '#cbd5e1' })
          btn.addEventListener('mouseleave', () => { if (btn.style.color !== 'rgb(96, 165, 250)') btn.style.color = '#94a3b8' })
          tabBar.appendChild(btn)
          tabButtons.push(btn)
        })

        panel.appendChild(tabBar)
        // Default to user shortcuts tab
        activateTab(0)
      } else {
        // No site shortcuts, show user shortcuts directly (no tabs)
        contentArea.appendChild(buildUserContent())
      }

      panel.appendChild(contentArea)
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
