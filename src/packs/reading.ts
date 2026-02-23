import type { ShortcutPack } from './index'

const pack: ShortcutPack = {
  id: 'reading',
  name: 'Reading & Research',
  icon: '📖',
  description: 'Comfortable reading shortcuts — smooth scrolling, quick search, zoom controls, and citation helpers.',
  color: '#8b5cf6',
  shortcuts: [
    { key: 'alt+j', action: 'scrolldown', label: 'Scroll down' },
    { key: 'alt+k', action: 'scrollup', label: 'Scroll up' },
    { key: 'alt+d', action: 'pagedown', label: 'Page down' },
    { key: 'alt+u', action: 'pageup', label: 'Page up' },
    { key: 'alt+w', action: 'searchwikipedia', label: 'Search Wikipedia for selection' },
    { key: 'alt+g', action: 'searchgoogle', label: 'Search Google for selection' },
    { key: 'alt+shift+c', action: 'copytitleurl', label: 'Copy title + URL for citation' },
    { key: 'alt+shift+d', action: 'toggledarkmode', label: 'Toggle dark mode' },
    { key: 'alt+=', action: 'zoomin', label: 'Zoom in' },
    { key: 'alt+-', action: 'zoomout', label: 'Zoom out' },
    { key: 'alt+0', action: 'zoomreset', label: 'Reset zoom' },
    { key: 'alt+b', action: 'togglebookmark', label: 'Bookmark page' },
    { key: 'alt+shift+?', action: 'showcheatsheet', label: 'Show cheat sheet' },
  ],
}

export default pack
