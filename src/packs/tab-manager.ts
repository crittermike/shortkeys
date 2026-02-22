import type { ShortcutPack } from './index'

const pack: ShortcutPack = {
  id: 'tab-manager',
  name: 'Tab Manager Pro',
  icon: '🗂️',
  description: 'Full tab management from the keyboard — close, sort, pin, group, move, and organize your tabs.',
  color: '#0891b2',
  shortcuts: [
    { key: 'alt+shift+d', action: 'closeduplicatetabs', label: 'Close duplicate tabs', activeInInputs: true },
    { key: 'alt+shift+s', action: 'sorttabs', label: 'Sort tabs A–Z', activeInInputs: true },
    { key: 'alt+shift+left', action: 'closelefttabs', label: 'Close tabs to the left', activeInInputs: true },
    { key: 'alt+shift+right', action: 'closerighttabs', label: 'Close tabs to the right', activeInInputs: true },
    { key: 'alt+shift+o', action: 'onlytab', label: 'Close all other tabs', activeInInputs: true },
    { key: 'alt+p', action: 'togglepin', label: 'Pin/unpin tab', activeInInputs: true },
    { key: 'alt+m', action: 'togglemute', label: 'Mute/unmute tab', activeInInputs: true },
    { key: 'alt+left', action: 'movetableft', label: 'Move tab left', activeInInputs: true },
    { key: 'alt+right', action: 'movetabright', label: 'Move tab right', activeInInputs: true },
    { key: 'alt+shift+,', action: 'movetabtofirst', label: 'Move tab to first', activeInInputs: true },
    { key: 'alt+shift+.', action: 'movetabtolast', label: 'Move tab to last', activeInInputs: true },
    { key: 'alt+home', action: 'firsttab', label: 'Go to first tab', activeInInputs: true },
    { key: 'alt+end', action: 'lasttab', label: 'Go to last tab', activeInInputs: true },
    { key: 'alt+shift+z', action: 'discardtab', label: 'Suspend/discard tab', activeInInputs: true },
    { key: 'alt+g', action: 'grouptab', label: 'Group tab', activeInInputs: true },
    { key: 'alt+shift+g', action: 'ungrouptab', label: 'Ungroup tab', activeInInputs: true },
    { key: 'alt+shift+n', action: 'movetabtonewwindow', label: 'Move tab to new window', activeInInputs: true },
    { key: 'alt+shift+t', action: 'newtabright', label: 'New tab to the right', activeInInputs: true },
    { key: 'alt+shift+?', action: 'showcheatsheet', label: 'Show cheat sheet' },
  ],
}

export default pack
