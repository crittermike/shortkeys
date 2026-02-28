/**
 * Vimium-style link hint mode.
 *
 * Overlays alphabetic labels on all visible clickable elements. The user types
 * letters to narrow down and activate a target. Escape cancels, Backspace
 * removes the last typed character.
 *
 * Two modes:
 *  - "click" — simulate a click on the matched element
 *  - "newtab" — open the element's href in a new background tab (falls back to click)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Characters used for hint labels (home-row first for ergonomics). */
const HINT_CHARS = 'SADFJKLEWCMPGH'

/** CSS class prefix to avoid collisions. */
const PREFIX = '__shortkeys-hint'

/** Selector for elements we consider "clickable". */
const CLICKABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([type=hidden]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[onclick]',
  '[contenteditable="true"]',
  '[contenteditable=""]',
  'summary',
  'details > summary',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface HintState {
  /** Currently displayed hint elements keyed by label string. */
  hints: Map<string, { overlay: HTMLElement; target: HTMLElement }>
  /** Characters typed so far. */
  typed: string
  /** Whether to open links in a new tab. */
  openInNewTab: boolean
  /** The container element holding all hint overlays. */
  container: HTMLElement | null
  /** Keydown listener reference for cleanup. */
  keydownListener: ((e: KeyboardEvent) => void) | null
}

let state: HintState | null = null

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Activate link hint mode. If already active, deactivate first. */
export function activateLinkHints(openInNewTab: boolean = false): void {
  // If already active, toggle off
  if (state) {
    deactivateLinkHints()
    return
  }

  const clickable = findClickableElements()
  if (clickable.length === 0) return

  const labels = generateLabels(clickable.length)
  const container = createContainer()
  const hints = new Map<string, { overlay: HTMLElement; target: HTMLElement }>()

  for (let i = 0; i < clickable.length; i++) {
    const el = clickable[i]
    const label = labels[i]
    const overlay = createHintOverlay(label, el)
    if (overlay) {
      container.appendChild(overlay)
      hints.set(label, { overlay, target: el })
    }
  }

  // Nothing visible after filtering
  if (hints.size === 0) {
    container.remove()
    return
  }

  document.documentElement.appendChild(container)

  state = {
    hints,
    typed: '',
    openInNewTab,
    container,
    keydownListener: null,
  }

  // Capture keystrokes
  const listener = (e: KeyboardEvent) => onKeydown(e)
  state.keydownListener = listener
  // Use capture phase so we intercept before Mousetrap or the page
  document.addEventListener('keydown', listener, true)
}

/** Deactivate link hint mode and clean up. */
export function deactivateLinkHints(): void {
  if (!state) return

  if (state.keydownListener) {
    document.removeEventListener('keydown', state.keydownListener, true)
  }
  state.container?.remove()
  state = null
}

/** Whether link hint mode is currently active (useful for stopCallback). */
export function isLinkHintModeActive(): boolean {
  return state !== null
}

// ---------------------------------------------------------------------------
// Element discovery
// ---------------------------------------------------------------------------

function findClickableElements(): HTMLElement[] {
  const all = document.querySelectorAll<HTMLElement>(CLICKABLE_SELECTOR)
  const results: HTMLElement[] = []

  for (const el of all) {
    if (isElementVisible(el)) {
      results.push(el)
    }
  }

  return results
}

function isElementVisible(el: HTMLElement): boolean {
  // Quick checks
  if (el.offsetWidth === 0 && el.offsetHeight === 0) return false

  const style = getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  }

  // Check if in viewport
  const rect = el.getBoundingClientRect()
  if (
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= window.innerHeight ||
    rect.left >= window.innerWidth
  ) {
    return false
  }

  // Must have some measurable size
  if (rect.width < 3 || rect.height < 3) return false

  return true
}

// ---------------------------------------------------------------------------
// Label generation
// ---------------------------------------------------------------------------

/**
 * Generate unique alphabetic labels for `count` elements.
 *
 * Uses a variable-length prefix scheme similar to Vimium: given N characters
 * in HINT_CHARS, we produce labels of length ceil(log_N(count)). This keeps
 * labels short while remaining unique.
 */
export function generateLabels(count: number): string[] {
  if (count === 0) return []
  if (count === 1) return [HINT_CHARS[0]]

  const chars = HINT_CHARS.split('')
  const base = chars.length

  // Determine label length needed
  let labelLen = 1
  let capacity = base
  while (capacity < count) {
    labelLen++
    capacity *= base
  }

  const labels: string[] = []
  for (let i = 0; i < count; i++) {
    let label = ''
    let n = i
    for (let j = 0; j < labelLen; j++) {
      label = chars[n % base] + label
      n = Math.floor(n / base)
    }
    labels.push(label)
  }

  return labels
}

// ---------------------------------------------------------------------------
// Overlay DOM
// ---------------------------------------------------------------------------

function createContainer(): HTMLElement {
  const container = document.createElement('div')
  container.id = `${PREFIX}-container`
  container.setAttribute('data-shortkeys-hints', 'true')
  // Container is just a positioning parent — no pointer events
  Object.assign(container.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483646',
    pointerEvents: 'none',
  })
  return container
}

function createHintOverlay(label: string, target: HTMLElement): HTMLElement | null {
  const rect = target.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null

  const hint = document.createElement('span')
  hint.className = `${PREFIX}-label`
  hint.dataset.hintLabel = label
  hint.textContent = label

  Object.assign(hint.style, {
    position: 'fixed',
    left: `${Math.max(0, Math.round(rect.left))}px`,
    top: `${Math.max(0, Math.round(rect.top))}px`,
    zIndex: '2147483647',
    pointerEvents: 'none',
    padding: '1px 4px',
    borderRadius: '3px',
    border: '1px solid #c38a22',
    background: 'linear-gradient(to bottom, #fff785, #ffc542)',
    color: '#1a1a1a',
    fontFamily: 'SF Mono, Menlo, Consolas, monospace',
    fontSize: '12px',
    fontWeight: '700',
    lineHeight: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  })

  return hint
}

// ---------------------------------------------------------------------------
// Keystroke handling
// ---------------------------------------------------------------------------

function onKeydown(e: KeyboardEvent): void {
  if (!state) return

  // Always prevent default & stop propagation so the page and Mousetrap don't react
  e.preventDefault()
  e.stopPropagation()
  e.stopImmediatePropagation()

  if (e.key === 'Escape') {
    deactivateLinkHints()
    return
  }

  if (e.key === 'Backspace') {
    if (state.typed.length > 0) {
      state.typed = state.typed.slice(0, -1)
      updateHintVisibility()
    }
    return
  }

  // Ignore modifier-only keys
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return

  const char = e.key.toUpperCase()

  // Only accept characters that are in our hint alphabet
  if (!HINT_CHARS.includes(char)) {
    deactivateLinkHints()
    return
  }

  state.typed += char
  updateHintVisibility()

  // Check for exact match
  const match = state.hints.get(state.typed)
  if (match) {
    const { target } = match
    const openInNewTab = state.openInNewTab
    deactivateLinkHints()
    activateTarget(target, openInNewTab)
  }
}

function updateHintVisibility(): void {
  if (!state) return

  for (const [label, { overlay }] of state.hints) {
    if (label.startsWith(state.typed)) {
      overlay.style.display = ''
      // Highlight matched portion
      const matchedPart = label.slice(0, state.typed.length)
      const remainingPart = label.slice(state.typed.length)
      overlay.innerHTML = `<span style="opacity:0.5">${escapeHtml(matchedPart)}</span>${escapeHtml(remainingPart)}`
    } else {
      overlay.style.display = 'none'
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ---------------------------------------------------------------------------
// Target activation
// ---------------------------------------------------------------------------

function activateTarget(target: HTMLElement, openInNewTab: boolean): void {
  if (openInNewTab) {
    // Try to extract a URL and open it in a new tab
    const href = getLinkHref(target)
    if (href) {
      window.open(href, '_blank', 'noopener')
      return
    }
    // Fall back to regular click if no URL available
  }

  // Focus the element (important for inputs)
  target.focus()

  // Simulate a click
  target.click()
}

function getLinkHref(el: HTMLElement): string | null {
  // Walk up the tree a couple levels to find an anchor
  let current: HTMLElement | null = el
  for (let i = 0; i < 3 && current; i++) {
    if (current instanceof HTMLAnchorElement && current.href) {
      return current.href
    }
    current = current.parentElement
  }
  return null
}
