/**
 * All available shortcut actions organized by category.
 * Each action has a value (action ID), label (display name),
 * and an optional builtin flag indicating it's available via
 * the browser's native keyboard shortcuts UI.
 */
export const ACTION_CATEGORIES = {
  'Scrolling': [
    { value: 'top', label: 'Scroll to top', builtin: true },
    { value: 'bottom', label: 'Scroll to bottom', builtin: true },
    { value: 'scrolldown', label: 'Scroll down', builtin: true },
    { value: 'scrolldownmore', label: 'Scroll down more', builtin: true },
    { value: 'pagedown', label: 'Page down', builtin: true },
    { value: 'scrollup', label: 'Scroll up', builtin: true },
    { value: 'scrollupmore', label: 'Scroll up more', builtin: true },
    { value: 'pageup', label: 'Page up', builtin: true },
    { value: 'scrollright', label: 'Scroll right', builtin: true },
    { value: 'scrollrightmore', label: 'Scroll right more', builtin: true },
    { value: 'scrollleft', label: 'Scroll left', builtin: true },
    { value: 'scrollleftmore', label: 'Scroll left more', builtin: true },
  ],
  'Location': [
    { value: 'back', label: 'Go back', builtin: true },
    { value: 'forward', label: 'Go forward', builtin: true },
    { value: 'reload', label: 'Reload page', builtin: true },
    { value: 'hardreload', label: 'Hard reload page (bypass cache)', builtin: true },
    { value: 'copyurl', label: 'Copy URL', builtin: true },
    { value: 'opensettings', label: 'Open Settings Page', builtin: true },
    { value: 'openextensions', label: 'Open Extensions Page', builtin: true },
    { value: 'openshortcuts', label: 'Open Keyboard Shortcuts Page', builtin: true },
    { value: 'searchgoogle', label: 'Search Google for selected text', builtin: true },
  ],
  'Bookmarks': [
    { value: 'openbookmark', label: 'Open bookmark/bookmarklet in current tab' },
    { value: 'openbookmarknewtab', label: 'Open bookmark/bookmarklet in new tab' },
    { value: 'openbookmarkbackgroundtab', label: 'Open bookmark/bookmarklet in new background tab' },
    { value: 'openbookmarkbackgroundtabandclose', label: 'Open bookmark/bookmarklet in new background tab and close after load' },
  ],
  'Tabs': [
    { value: 'gototab', label: 'Jump to tab by URL' },
    { value: 'gototabbytitle', label: 'Jump to tab by title' },
    { value: 'gototabbyindex', label: 'Jump to tab by index' },
    { value: 'newtab', label: 'New tab', builtin: true },
    { value: 'closetab', label: 'Close tab', builtin: true },
    { value: 'onlytab', label: 'Close other tabs', builtin: true },
    { value: 'closelefttabs', label: 'Close tabs to the left', builtin: true },
    { value: 'closerighttabs', label: 'Close tabs to the right', builtin: true },
    { value: 'clonetab', label: 'Duplicate tab', builtin: true },
    { value: 'movetabtonewwindow', label: 'Move tab to new window' },
    { value: 'reopentab', label: 'Reopen last closed tab', builtin: true },
    { value: 'nexttab', label: 'Next tab', builtin: true },
    { value: 'prevtab', label: 'Previous tab', builtin: true },
    { value: 'firsttab', label: 'First tab', builtin: true },
    { value: 'lasttab', label: 'Last tab', builtin: true },
    { value: 'lastusedtab', label: 'Switch to last used tab' },
    { value: 'togglepin', label: 'Pin/unpin tab', builtin: true },
    { value: 'togglemute', label: 'Mute/unmute tab', builtin: true },
    { value: 'movetableft', label: 'Move tab left', builtin: true },
    { value: 'movetabright', label: 'Move tab right', builtin: true },
    { value: 'movetabtofirst', label: 'Move tab to first position', builtin: true },
    { value: 'movetabtolast', label: 'Move tab to last position', builtin: true },
  ],
  'Windows': [
    { value: 'newwindow', label: 'New window', builtin: true },
    { value: 'newprivatewindow', label: 'New private window', builtin: true },
    { value: 'closewindow', label: 'Close window', builtin: true },
    { value: 'fullscreen', label: 'Toggle fullscreen', builtin: true },
  ],
  'Zooming': [
    { value: 'zoomin', label: 'Zoom In', builtin: true },
    { value: 'zoomout', label: 'Zoom Out', builtin: true },
    { value: 'zoomreset', label: 'Reset Zoom', builtin: true },
  ],
  'Miscellaneous': [
    { value: 'javascript', label: 'Run JavaScript' },
    { value: 'showlatestdownload', label: 'Show latest download', builtin: true },
    { value: 'cleardownloads', label: 'Clear downloads', builtin: true },
    { value: 'viewsource', label: 'View source', builtin: true },
    { value: 'disable', label: 'Do nothing (disable browser shortcut)', builtin: true },
    { value: 'trigger', label: 'Trigger another shortcut' },
    { value: 'print', label: 'Print page', builtin: true },
    { value: 'buttonnexttab', label: 'Click button and switch to next tab (for Tribal Wars players)' },
    { value: 'openapp', label: 'Open App' },
    { value: 'capturescreenshot', label: 'Capture current viewport screenshot' },
    { value: 'capturefullsizescreenshot', label: 'Capture full size screenshot (max 16,348px)' },
    { value: 'forcecapturefullsizescreenshot', label: 'Force capture full size screenshot (non-scrollable window)' },
  ],
}

/**
 * Get a flat list of all valid action values.
 * @returns {string[]}
 */
export function getAllActionValues() {
  const values = []
  for (const category of Object.values(ACTION_CATEGORIES)) {
    for (const action of category) {
      values.push(action.value)
    }
  }
  return values
}

/**
 * Check if a given action value corresponds to a built-in browser shortcut.
 * @param {string} actionValue
 * @returns {boolean}
 */
export function isBuiltInAction(actionValue) {
  for (const category of Object.values(ACTION_CATEGORIES)) {
    for (const action of category) {
      if (action.value === actionValue) {
        return !!action.builtin
      }
    }
  }
  return false
}

/**
 * Actions that involve scrolling (used to show smooth scrolling toggle).
 */
export const SCROLL_ACTIONS = [
  'scrolldown', 'scrolldownmore', 'pagedown',
  'scrollup', 'scrollupmore', 'pageup',
  'scrollright', 'scrollrightmore',
  'scrollleft', 'scrollleftmore',
  'top', 'bottom',
]

/**
 * Website filter options for blacklist/whitelist.
 */
export const WEBSITE_OPTIONS = [
  { value: false, label: 'All sites' },
  { value: true, label: 'All sites except...' },
  { value: 'whitelist', label: 'Only on specific sites' },
]
