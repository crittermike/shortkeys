import type { ShortcutPack } from './index'

const pack: ShortcutPack = {
  id: 'developer',
  name: 'Web Developer Tools',
  icon: '🛠️',
  description: 'Handy shortcuts for web developers — clear cache, view source, capture screenshots, and more.',
  color: '#f59e0b',
  shortcuts: [
    { key: 'alt+shift+r', action: 'hardreload', label: 'Hard reload (clear cache)' },
    { key: 'alt+u', action: 'viewsource', label: 'View page source' },
    { key: 'alt+shift+m', action: 'copytitleurlmarkdown', label: 'Copy URL as Markdown link' },
    { key: 'alt+shift+p', action: 'capturescreenshot', label: 'Capture screenshot' },
    { key: 'alt+shift+g', action: 'searchgithub', label: 'Search GitHub for selection' },
    { key: 'alt+shift+d', action: 'toggledarkmode', label: 'Toggle dark mode' },
    { key: 'alt+shift+i', action: 'openincognito', label: 'Open in incognito' },
    { key: 'alt+shift+c', action: 'copyurl', label: 'Copy current URL' },
    { key: 'alt+shift+j', action: 'javascript', label: 'Log DOM element count', code: "console.log('DOM elements:', document.querySelectorAll('*').length)" },
    { key: 'alt+shift+?', action: 'showcheatsheet', label: 'Show cheat sheet' },
  ],
}

export default pack
