import type { ShortcutPack } from './index'

const pack: ShortcutPack = {
  id: 'keyboard-power',
  name: 'Keyboard Power User',
  icon: '⌨️',
  description: 'Full keyboard control over your browser. Number keys for tabs, arrows for navigation, shortcuts for everything.',
  color: '#7c3aed',
  shortcuts: [
    { key: 'alt+1', action: 'gototabbyindex', label: 'Tab 1', matchindex: '1', activeInInputs: true },
    { key: 'alt+2', action: 'gototabbyindex', label: 'Tab 2', matchindex: '2', activeInInputs: true },
    { key: 'alt+3', action: 'gototabbyindex', label: 'Tab 3', matchindex: '3', activeInInputs: true },
    { key: 'alt+4', action: 'gototabbyindex', label: 'Tab 4', matchindex: '4', activeInInputs: true },
    { key: 'alt+5', action: 'gototabbyindex', label: 'Tab 5', matchindex: '5', activeInInputs: true },
    { key: 'alt+left', action: 'movetableft', label: 'Move tab left', activeInInputs: true },
    { key: 'alt+right', action: 'movetabright', label: 'Move tab right', activeInInputs: true },
    { key: 'alt+w', action: 'closetab', label: 'Close tab', activeInInputs: true },
    { key: 'alt+shift+w', action: 'closerighttabs', label: 'Close tabs to right', activeInInputs: true },
    { key: 'alt+t', action: 'newtabright', label: 'New tab to the right', activeInInputs: true },
    { key: 'alt+shift+t', action: 'reopentab', label: 'Reopen closed tab', activeInInputs: true },
    { key: 'alt+d', action: 'closeduplicatetabs', label: 'Close duplicates', activeInInputs: true },
    { key: 'alt+p', action: 'togglepin', label: 'Pin/unpin tab', activeInInputs: true },
  ],
}

export default pack
