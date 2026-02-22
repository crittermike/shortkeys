import type { ShortcutPack } from './index'

const pack: ShortcutPack = {
  id: 'emacs',
  name: 'Emacs-Style Navigation',
  icon: '🔧',
  description: 'Browse the web with Emacs-style keybindings — Ctrl and Meta combos for scrolling, tabs, and pages.',
  color: '#7c3aed',
  shortcuts: [
    { key: 'ctrl+n', action: 'scrolldown', label: 'Scroll down (C-n)' },
    { key: 'ctrl+p', action: 'scrollup', label: 'Scroll up (C-p)' },
    { key: 'ctrl+f', action: 'nexttab', label: 'Next tab (C-f)' },
    { key: 'ctrl+b', action: 'prevtab', label: 'Previous tab (C-b)' },
    { key: 'ctrl+a', action: 'top', label: 'Scroll to top (C-a)' },
    { key: 'ctrl+e', action: 'bottom', label: 'Scroll to bottom (C-e)' },
    { key: 'alt+v', action: 'pageup', label: 'Page up (M-v)' },
    { key: 'ctrl+v', action: 'pagedown', label: 'Page down (C-v)' },
    { key: 'ctrl+w', action: 'closetab', label: 'Close tab (C-w)' },
    { key: 'alt+w', action: 'copyurl', label: 'Copy URL (M-w)' },
    { key: 'ctrl+shift+f', action: 'searchgoogle', label: 'Search Google for selection' },
    { key: 'ctrl+shift+?', action: 'showcheatsheet', label: 'Show cheat sheet' },
  ],
}

export default pack
