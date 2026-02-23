import { JS_SNIPPETS } from './js-snippets'

export interface ActionDefinition {
  value: string
  label: string
  builtin?: boolean
}

/**
 * All available shortcut actions organized by category.
 */
export const ACTION_CATEGORIES: Record<string, ActionDefinition[]> = {
  Scrolling: [
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
  Location: [
    { value: 'back', label: 'Go back', builtin: true },
    { value: 'forward', label: 'Go forward', builtin: true },
    { value: 'reload', label: 'Reload page', builtin: true },
    { value: 'hardreload', label: 'Hard reload page (bypass cache)', builtin: true },
    { value: 'copyurl', label: 'Copy URL', builtin: true },
    { value: 'copypagetitle', label: 'Copy page title', builtin: true },
    { value: 'copytitleurl', label: 'Copy title and URL', builtin: true },
    { value: 'copytitleurlmarkdown', label: 'Copy as markdown link [title](url)', builtin: true },
    { value: 'openclipboardurl', label: 'Open URL from clipboard', builtin: true },
    { value: 'openclipboardurlnewtab', label: 'Open URL from clipboard in new tab', builtin: true },
    { value: 'openurl', label: 'Navigate to a specific URL' },
    { value: 'opensettings', label: 'Open settings page', builtin: true },
    { value: 'openextensions', label: 'Open extensions page', builtin: true },
    { value: 'openshortcuts', label: 'Open keyboard shortcuts page', builtin: true },
  ],
  Bookmarks: [
    { value: 'openbookmark', label: 'Open bookmark/bookmarklet in current tab' },
    { value: 'openbookmarknewtab', label: 'Open bookmark/bookmarklet in new tab' },
    { value: 'openbookmarkbackgroundtab', label: 'Open bookmark/bookmarklet in new background tab' },
    { value: 'openbookmarkbackgroundtabandclose', label: 'Open bookmark/bookmarklet in bg tab and close after load' },
  ],
  Tabs: [
    { value: 'gototab', label: 'Jump to tab by URL' },
    { value: 'gototabbytitle', label: 'Jump to tab by title' },
    { value: 'gototabbyindex', label: 'Jump to tab by index' },
    { value: 'newtab', label: 'New tab', builtin: true },
    { value: 'newtabright', label: 'New tab to the right of current', builtin: true },
    { value: 'closetab', label: 'Close tab', builtin: true },
    { value: 'onlytab', label: 'Close other tabs', builtin: true },
    { value: 'closelefttabs', label: 'Close tabs to the left', builtin: true },
    { value: 'closerighttabs', label: 'Close tabs to the right', builtin: true },
    { value: 'closeduplicatetabs', label: 'Close duplicate tabs', builtin: true },
    { value: 'clonetab', label: 'Duplicate tab', builtin: true },
    { value: 'movetabtonewwindow', label: 'Move tab to new window' },
    { value: 'reopentab', label: 'Reopen last closed tab', builtin: true },
    { value: 'nexttab', label: 'Next tab', builtin: true },
    { value: 'prevtab', label: 'Previous tab', builtin: true },
    { value: 'firsttab', label: 'First tab', builtin: true },
    { value: 'lasttab', label: 'Last tab', builtin: true },
    { value: 'lastusedtab', label: 'Switch to last used tab' },
    { value: 'audibletab', label: 'Jump to tab playing audio/video' },
    { value: 'togglepin', label: 'Pin/unpin tab', builtin: true },
    { value: 'togglemute', label: 'Mute/unmute tab', builtin: true },
    { value: 'movetableft', label: 'Move tab left', builtin: true },
    { value: 'movetabright', label: 'Move tab right', builtin: true },
    { value: 'movetabtofirst', label: 'Move tab to first position', builtin: true },
    { value: 'movetabtolast', label: 'Move tab to last position', builtin: true },
    { value: 'sorttabs', label: 'Sort tabs alphabetically by title', builtin: true },
    { value: 'discardtab', label: 'Suspend tab (free memory)', builtin: true },
    { value: 'grouptab', label: 'Add tab to new group' },
    { value: 'ungrouptab', label: 'Remove tab from group' },
  ],
  Windows: [
    { value: 'newwindow', label: 'New window', builtin: true },
    { value: 'newprivatewindow', label: 'New private window', builtin: true },
    { value: 'closewindow', label: 'Close window', builtin: true },
    { value: 'fullscreen', label: 'Toggle fullscreen', builtin: true },
  ],
  Zooming: [
    { value: 'zoomin', label: 'Zoom in', builtin: true },
    { value: 'zoomout', label: 'Zoom out', builtin: true },
    { value: 'zoomreset', label: 'Reset zoom', builtin: true },
  ],
  Miscellaneous: [
    { value: 'javascript', label: 'Run JavaScript' },
    { value: 'showlatestdownload', label: 'Show latest download', builtin: true },
    { value: 'cleardownloads', label: 'Clear downloads', builtin: true },
    { value: 'viewsource', label: 'View source', builtin: true },
    { value: 'disable', label: 'Do nothing (disable browser shortcut)', builtin: true },
    { value: 'trigger', label: 'Trigger another shortcut' },
    { value: 'inserttext', label: 'Insert/type text into focused field' },
    { value: 'print', label: 'Print page', builtin: true },
    { value: 'buttonnexttab', label: 'Click button and switch to next tab' },
    { value: 'openapp', label: 'Open app' },
    { value: 'togglebookmark', label: 'Bookmark/unbookmark current page', builtin: true },
    { value: 'openincognito', label: 'Open current page in incognito window', builtin: true },
    { value: 'capturescreenshot', label: 'Capture current viewport screenshot' },
    { value: 'capturefullsizescreenshot', label: 'Capture full size screenshot (max 16,348px)' },
    { value: 'forcecapturefullsizescreenshot', label: 'Force capture full size screenshot' },
  ],
  'Video Controls': [
    { value: 'videoplaypause', label: 'Play/pause video' },
    { value: 'videomute', label: 'Mute/unmute video' },
    { value: 'videofullscreen', label: 'Toggle video fullscreen' },
    { value: 'videospeedup', label: 'Speed up video (0.25x)' },
    { value: 'videospeeddown', label: 'Slow down video (0.25x)' },
    { value: 'videospeedreset', label: 'Reset video speed to 1x' },
    { value: 'videoskipforward', label: 'Skip forward 10 seconds' },
    { value: 'videoskipback', label: 'Skip back 10 seconds' },
  ],
  'Search Providers': [
    { value: 'searchgoogle', label: 'Search Google for selected text', builtin: true },
    { value: 'searchyoutube', label: 'Search YouTube for selected text', builtin: true },
    { value: 'searchwikipedia', label: 'Search Wikipedia for selected text', builtin: true },
    { value: 'searchgithub', label: 'Search GitHub for selected text', builtin: true },
  ],
  'Page Tools': [
    { value: 'showcheatsheet', label: 'Show shortcut cheat sheet overlay' },
    { value: 'toggledarkmode', label: 'Toggle dark mode on current page' },
  ],
  'Page Scripts': JS_SNIPPETS.map((s) => ({ value: 'script-' + s.id, label: s.name })),
}

/** Get a flat list of all valid action values. */
export function getAllActionValues(): string[] {
  const values: string[] = []
  for (const category of Object.values(ACTION_CATEGORIES)) {
    for (const action of category) {
      values.push(action.value)
    }
  }
  return values
}

/** Check if a given action value corresponds to a built-in browser shortcut. */
export function isBuiltInAction(actionValue: string): boolean {
  for (const category of Object.values(ACTION_CATEGORIES)) {
    for (const action of category) {
      if (action.value === actionValue) {
        return !!action.builtin
      }
    }
  }
  return false
}

/** Actions that involve scrolling (used to show smooth scrolling toggle). */
export const SCROLL_ACTIONS = [
  'scrolldown', 'scrolldownmore', 'pagedown',
  'scrollup', 'scrollupmore', 'pageup',
  'scrollright', 'scrollrightmore',
  'scrollleft', 'scrollleftmore',
  'top', 'bottom',
] as const

/** Website filter options for blacklist/whitelist. */
export const WEBSITE_OPTIONS = [
  { value: false as const, label: 'All sites' },
  { value: true as const, label: 'All sites except...' },
  { value: 'whitelist' as const, label: 'Only on specific sites' },
]
