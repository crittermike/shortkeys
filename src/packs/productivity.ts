import type { ShortcutPack } from './index'

const pack: ShortcutPack = {
  id: 'productivity',
  name: 'Productivity Essentials',
  icon: '⚡',
  description: 'Useful shortcuts for daily browsing — copy links, manage tabs, search selected text, and more.',
  color: '#4361ee',
  shortcuts: [
    { key: 'alt+c', action: 'copyurl', label: 'Copy URL' },
    { key: 'alt+shift+c', action: 'copytitleurlmarkdown', label: 'Copy as markdown link' },
    { key: 'alt+shift+d', action: 'toggledarkmode', label: 'Toggle dark mode' },
    { key: 'alt+b', action: 'togglebookmark', label: 'Toggle bookmark' },
    { key: 'alt+s', action: 'sorttabs', label: 'Sort tabs A–Z' },
    { key: 'alt+shift+s', action: 'closeduplicatetabs', label: 'Close duplicate tabs' },
    { key: 'alt+a', action: 'audibletab', label: 'Jump to tab playing audio' },
    { key: 'alt+shift+?', action: 'showcheatsheet', label: 'Show cheat sheet' },
  ],
}

export default pack
