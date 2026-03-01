import { JS_SNIPPETS } from './js-snippets'

export interface ActionDefinition {
  value: string
  label: string
  description?: string
  builtin?: boolean
}

/**
 * All available shortcut actions organized by category.
 */
export const ACTION_CATEGORIES: Record<string, ActionDefinition[]> = {
  Scrolling: [
    { value: 'top', label: 'Scroll to top', description: 'Jump to the top of the page', builtin: true },
    { value: 'bottom', label: 'Scroll to bottom', description: 'Jump to the bottom of the page', builtin: true },
    { value: 'scrolldown', label: 'Scroll down', description: 'Scroll down by a small amount', builtin: true },
    { value: 'scrolldownmore', label: 'Scroll down more', description: 'Scroll down by a larger amount', builtin: true },
    { value: 'pagedown', label: 'Page down', description: 'Scroll down by one full page', builtin: true },
    { value: 'scrollup', label: 'Scroll up', description: 'Scroll up by a small amount', builtin: true },
    { value: 'scrollupmore', label: 'Scroll up more', description: 'Scroll up by a larger amount', builtin: true },
    { value: 'pageup', label: 'Page up', description: 'Scroll up by one full page', builtin: true },
    { value: 'scrollright', label: 'Scroll right', description: 'Scroll right by a small amount', builtin: true },
    { value: 'scrollrightmore', label: 'Scroll right more', description: 'Scroll right by a larger amount', builtin: true },
    { value: 'scrollleft', label: 'Scroll left', description: 'Scroll left by a small amount', builtin: true },
    { value: 'scrollleftmore', label: 'Scroll left more', description: 'Scroll left by a larger amount', builtin: true },
  ],
  Location: [
    { value: 'back', label: 'Go back', description: 'Navigate to the previous page in history', builtin: true },
    { value: 'forward', label: 'Go forward', description: 'Navigate to the next page in history', builtin: true },
    { value: 'reload', label: 'Reload page', description: 'Refresh the current page', builtin: true },
    { value: 'hardreload', label: 'Hard reload (bypass cache)', description: 'Refresh the page and re-download all resources', builtin: true },
    { value: 'copyurl', label: 'Copy URL', description: 'Copy the current page URL to clipboard', builtin: true },
    { value: 'copypagetitle', label: 'Copy page title', description: 'Copy the current page title to clipboard', builtin: true },
    { value: 'copytitleurl', label: 'Copy title and URL', description: 'Copy both the page title and URL to clipboard', builtin: true },
    { value: 'copytitleurlmarkdown', label: 'Copy as markdown link', description: 'Copy as [title](url) format for pasting in markdown', builtin: true },
    { value: 'openclipboardurl', label: 'Open URL from clipboard', description: 'Navigate to a URL that was copied to clipboard', builtin: true },
    { value: 'openclipboardurlnewtab', label: 'Open URL from clipboard in new tab', description: 'Open a URL from clipboard in a new tab', builtin: true },
    { value: 'openurl', label: 'Go to URL', description: 'Navigate to a specific URL that you configure' },
    { value: 'opensettings', label: 'Open browser settings', description: 'Open your browser\'s settings page', builtin: true },
    { value: 'openextensions', label: 'Open extensions page', description: 'Open the browser extensions management page', builtin: true },
    { value: 'openshortcuts', label: 'Open keyboard shortcuts page', description: 'Open the browser\'s keyboard shortcuts settings', builtin: true },
    { value: 'urlup', label: 'Go up one URL level', description: 'Remove the last segment from the URL path (e.g. /a/b → /a)', builtin: true },
    { value: 'urlroot', label: 'Go to site root', description: 'Navigate to the root domain of the current site', builtin: true },
    { value: 'urlinc', label: 'Increment number in URL', description: 'Find and increase the last number in the URL by 1', builtin: true },
    { value: 'urldec', label: 'Decrement number in URL', description: 'Find and decrease the last number in the URL by 1', builtin: true },
    { value: 'editurl', label: 'Edit URL in address bar', description: 'Focus the address bar with the current URL selected for editing' },
    { value: 'nextpage', label: 'Next page', description: 'Follow the page\'s "next" link (for paginated content)', builtin: true },
    { value: 'prevpage', label: 'Previous page', description: 'Follow the page\'s "previous" link (for paginated content)', builtin: true },
  ],
  Bookmarks: [
    { value: 'openbookmark', label: 'Open bookmark in current tab', description: 'Open a bookmark or bookmarklet in the current tab' },
    { value: 'openbookmarknewtab', label: 'Open bookmark in new tab', description: 'Open a bookmark or bookmarklet in a new foreground tab' },
    { value: 'openbookmarkbackgroundtab', label: 'Open bookmark in background tab', description: 'Open a bookmark or bookmarklet in a new background tab' },
    { value: 'openbookmarkbackgroundtabandclose', label: 'Open bookmark in background tab and close', description: 'Open a bookmark in a background tab that auto-closes after loading' },
  ],
  Tabs: [
    { value: 'gototab', label: 'Jump to tab by URL', description: 'Switch to an open tab matching a URL pattern, or open it if not found' },
    { value: 'gototabbytitle', label: 'Jump to tab by title', description: 'Switch to an open tab matching a title pattern' },
    { value: 'gototabbyindex', label: 'Jump to tab by position', description: 'Switch to a tab at a specific position number' },
    { value: 'newtab', label: 'New tab', description: 'Open a new blank tab', builtin: true },
    { value: 'newtabright', label: 'New tab to the right', description: 'Open a new tab immediately to the right of the current one', builtin: true },
    { value: 'closetab', label: 'Close tab', description: 'Close the current tab', builtin: true },
    { value: 'onlytab', label: 'Close other tabs', description: 'Close all tabs except the current one', builtin: true },
    { value: 'closelefttabs', label: 'Close tabs to the left', description: 'Close all tabs to the left of the current one', builtin: true },
    { value: 'closerighttabs', label: 'Close tabs to the right', description: 'Close all tabs to the right of the current one', builtin: true },
    { value: 'closeduplicatetabs', label: 'Close duplicate tabs', description: 'Close tabs that have the same URL as another tab', builtin: true },
    { value: 'clonetab', label: 'Duplicate tab', description: 'Create an exact copy of the current tab', builtin: true },
    { value: 'movetabtonewwindow', label: 'Move tab to new window', description: 'Move the current tab into its own browser window' },
    { value: 'reopentab', label: 'Reopen closed tab', description: 'Restore the most recently closed tab', builtin: true },
    { value: 'nexttab', label: 'Next tab', description: 'Switch to the next tab on the right', builtin: true },
    { value: 'prevtab', label: 'Previous tab', description: 'Switch to the next tab on the left', builtin: true },
    { value: 'firsttab', label: 'First tab', description: 'Switch to the first (leftmost) tab', builtin: true },
    { value: 'lasttab', label: 'Last tab', description: 'Switch to the last (rightmost) tab', builtin: true },
    { value: 'lastusedtab', label: 'Last used tab', description: 'Switch to the tab you were on before this one' },
    { value: 'audibletab', label: 'Tab playing audio', description: 'Switch to the tab that is currently playing audio or video' },
    { value: 'togglepin', label: 'Pin/unpin tab', description: 'Toggle the current tab\'s pinned state', builtin: true },
    { value: 'togglemute', label: 'Mute/unmute tab', description: 'Toggle audio for the current tab', builtin: true },
    { value: 'movetableft', label: 'Move tab left', description: 'Move the current tab one position to the left', builtin: true },
    { value: 'movetabright', label: 'Move tab right', description: 'Move the current tab one position to the right', builtin: true },
    { value: 'movetabtofirst', label: 'Move tab to start', description: 'Move the current tab to the first position', builtin: true },
    { value: 'movetabtolast', label: 'Move tab to end', description: 'Move the current tab to the last position', builtin: true },
    { value: 'sorttabs', label: 'Sort tabs by title', description: 'Rearrange all tabs in alphabetical order by title', builtin: true },
    { value: 'discardtab', label: 'Suspend tab', description: 'Unload the tab from memory to save resources (tab stays open)', builtin: true },
    { value: 'grouptab', label: 'Group tab', description: 'Add the current tab to a new tab group' },
    { value: 'ungrouptab', label: 'Ungroup tab', description: 'Remove the current tab from its tab group' },
  ],
  Windows: [
    { value: 'newwindow', label: 'New window', description: 'Open a new browser window', builtin: true },
    { value: 'newprivatewindow', label: 'New private window', description: 'Open a new incognito/private browsing window', builtin: true },
    { value: 'closewindow', label: 'Close window', description: 'Close the current browser window', builtin: true },
    { value: 'fullscreen', label: 'Toggle fullscreen', description: 'Enter or exit fullscreen mode', builtin: true },
  ],
  Zooming: [
    { value: 'zoomin', label: 'Zoom in', description: 'Increase the page zoom level', builtin: true },
    { value: 'zoomout', label: 'Zoom out', description: 'Decrease the page zoom level', builtin: true },
    { value: 'zoomreset', label: 'Reset zoom', description: 'Reset the page zoom level back to 100%', builtin: true },
  ],
  Miscellaneous: [
    { value: 'javascript', label: 'Run custom JavaScript', description: 'Execute your own JavaScript code on the page' },
    { value: 'showlatestdownload', label: 'Show latest download', description: 'Reveal the most recent download in your file manager', builtin: true },
    { value: 'cleardownloads', label: 'Clear downloads', description: 'Clear the browser\'s download history list', builtin: true },
    { value: 'viewsource', label: 'View page source', description: 'Open the HTML source code of the current page', builtin: true },
    { value: 'disable', label: 'Do nothing (block shortcut)', description: 'Prevent a browser shortcut from doing anything' },
    { value: 'trigger', label: 'Trigger another shortcut', description: 'Simulate pressing a different keyboard shortcut' },
    { value: 'inserttext', label: 'Type text into field', description: 'Insert pre-configured text into the currently focused input' },
    { value: 'print', label: 'Print page', description: 'Open the print dialog for the current page', builtin: true },
    { value: 'buttonnexttab', label: 'Click button then switch tab', description: 'Click a button on the page (by CSS selector) then switch to the next tab' },
    { value: 'openapp', label: 'Open Chrome app', description: 'Launch an installed Chrome app by its ID' },
    { value: 'togglebookmark', label: 'Bookmark/unbookmark page', description: 'Toggle whether the current page is bookmarked', builtin: true },
    { value: 'openincognito', label: 'Open page in incognito', description: 'Open the current page in a new incognito window', builtin: true },
    { value: 'capturescreenshot', label: 'Screenshot visible area', description: 'Capture a screenshot of what\'s currently visible' },
    { value: 'capturefullsizescreenshot', label: 'Screenshot full page', description: 'Capture the entire page as a screenshot (up to 16,348px tall)' },
    { value: 'forcecapturefullsizescreenshot', label: 'Screenshot full page (force)', description: 'Force-capture the entire page even if very tall' },
    { value: 'macro', label: 'Run a macro', description: 'Chain multiple actions together into a single shortcut' },
    { value: 'focusinput', label: 'Focus first input', description: 'Jump focus to the first text input field on the page', builtin: true },
  ],
  'Video Controls': [
    { value: 'videoplaypause', label: 'Play/pause video', description: 'Toggle playback of the video on the page' },
    { value: 'videomute', label: 'Mute/unmute video', description: 'Toggle audio for the video on the page' },
    { value: 'videofullscreen', label: 'Video fullscreen', description: 'Toggle fullscreen mode for the video on the page' },
    { value: 'videospeedup', label: 'Speed up video', description: 'Increase video playback speed by 0.25x' },
    { value: 'videospeeddown', label: 'Slow down video', description: 'Decrease video playback speed by 0.25x' },
    { value: 'videospeedreset', label: 'Reset video speed', description: 'Set video playback speed back to normal (1x)' },
    { value: 'videoskipforward', label: 'Skip forward 10s', description: 'Jump 10 seconds ahead in the video' },
    { value: 'videoskipback', label: 'Skip back 10s', description: 'Jump 10 seconds back in the video' },
  ],
  'Search Providers': [
    { value: 'searchgoogle', label: 'Search Google', description: 'Search Google for the text you have selected', builtin: true },
    { value: 'searchyoutube', label: 'Search YouTube', description: 'Search YouTube for the text you have selected', builtin: true },
    { value: 'searchwikipedia', label: 'Search Wikipedia', description: 'Search Wikipedia for the text you have selected', builtin: true },
    { value: 'searchgithub', label: 'Search GitHub', description: 'Search GitHub for the text you have selected', builtin: true },
  ],
  'Page Tools': [
    { value: 'showcheatsheet', label: 'Show cheat sheet', description: 'Display an overlay showing all your shortcuts for this page' },
    { value: 'toggledarkmode', label: 'Toggle dark mode', description: 'Invert page colors for comfortable reading in the dark' },
  ],
  'Link Hints': [
    { value: 'linkhints', label: 'Click a link via keyboard', description: 'Show letter labels on links — type to click one without a mouse' },
    { value: 'linkhintsnew', label: 'Open link in new tab via keyboard', description: 'Show letter labels on links — type to open one in a new tab' },
  ],
  'Page Scripts': JS_SNIPPETS.map((s) => ({ value: 'script-' + s.id, label: s.name, description: s.description })),
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

/** Get the human-readable label for an action value. */
export function getActionLabel(actionValue: string): string | undefined {
  for (const category of Object.values(ACTION_CATEGORIES)) {
    for (const action of category) {
      if (action.value === actionValue) {
        return action.label
      }
    }
  }
  return undefined
}

/** Get the description for an action value. */
export function getActionDescription(actionValue: string): string | undefined {
  for (const category of Object.values(ACTION_CATEGORIES)) {
    for (const action of category) {
      if (action.value === actionValue) {
        return action.description
      }
    }
  }
  return undefined
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

/**
 * ACTION_CATEGORIES with descriptions mapped to sublabels for SearchSelect.
 * Use this when passing actions to SearchSelect components.
 */
export function getActionOptionsForSelect(): Record<string, { value: string; label: string; sublabel?: string }[]> {
  const result: Record<string, { value: string; label: string; sublabel?: string }[]> = {}
  for (const [category, actions] of Object.entries(ACTION_CATEGORIES)) {
    result[category] = actions.map((a) => ({
      value: a.value,
      label: a.label,
      sublabel: a.description,
    }))
  }
  return result
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
