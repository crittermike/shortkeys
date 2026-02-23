import type { ShortcutPack } from './index'

const pack: ShortcutPack = {
  id: 'vim',
  name: 'Vim Navigation',
  icon: '🔤',
  description: 'Navigate your browser like Vim. Scroll, jump between tabs, and manage pages — all from the home row.',
  color: '#059669',
  shortcuts: [
    { key: 'j', action: 'scrolldown', label: 'Scroll down' },
    { key: 'k', action: 'scrollup', label: 'Scroll up' },
    { key: 'g g', action: 'top', label: 'Scroll to top' },
    { key: 'shift+g', action: 'bottom', label: 'Scroll to bottom' },
    { key: 'd', action: 'pagedown', label: 'Half page down' },
    { key: 'u', action: 'pageup', label: 'Half page up' },
    { key: 'shift+h', action: 'prevtab', label: 'Previous tab' },
    { key: 'shift+l', action: 'nexttab', label: 'Next tab' },
    { key: 'x', action: 'closetab', label: 'Close tab' },
    { key: 'shift+x', action: 'reopentab', label: 'Reopen closed tab' },
    { key: 't', action: 'newtab', label: 'New tab' },
    { key: 'r', action: 'reload', label: 'Reload page' },
    { key: 'shift+/', action: 'showcheatsheet', label: 'Show cheat sheet' },
    { key: '/', action: 'searchgoogle', label: 'Search Google for selection' },
    { key: 'y y', action: 'copyurl', label: 'Copy URL' },
    { key: 'g shift+t', action: 'lastusedtab', label: 'Last used tab' },
  ],
}

export default pack
