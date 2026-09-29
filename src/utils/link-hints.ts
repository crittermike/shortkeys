/**
 * Vimium-style link hint mode.
 *
 * Overlays labels on every clickable element in the viewport. The user either
 * types the label ("chars" mode) or types part of the link's text and picks a
 * number ("filter" mode). Escape cancels, Backspace removes the last keystroke.
 *
 * Element discovery and geometry live in `hint-targets.ts`; this module owns
 * the overlay, the keystroke handling, and target activation.
 *
 * Behaviour follows Vimium-C (Apache-2.0 / MIT, Copyright Gong Dahan — see
 * NOTICE.md), reimplemented for Shortkeys.
 */

import { findHintTargets, type HintTarget, type HintTargetOptions } from './hint-targets'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default characters used for hint labels (home-row first for ergonomics). */
export const DEFAULT_HINT_CHARS = 'SADFJKLEWCMPGH'

/** Digits used for labels in filter mode. */
const FILTER_DIGITS = '1234567890'

/** Minimum number of distinct characters needed to build usable labels. */
const MIN_HINT_CHARS = 2

/** CSS class prefix to avoid collisions. */
const PREFIX = '__shortkeys-hint'

/**
 * Clean a user-supplied hint alphabet.
 *
 * Keeps letters and digits only, uppercases them, and drops duplicates so a
 * repeated character can't produce two hints with the same label. Falls back
 * to DEFAULT_HINT_CHARS when fewer than MIN_HINT_CHARS survive.
 */
export function normalizeHintChars(input?: string | null): string {
  if (!input) return DEFAULT_HINT_CHARS

  const seen = new Set<string>()
  for (const char of input.toUpperCase()) {
    if (/[A-Z0-9]/.test(char)) seen.add(char)
  }

  if (seen.size < MIN_HINT_CHARS) return DEFAULT_HINT_CHARS
  return Array.from(seen).join('')
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface LinkHintOptions extends HintTargetOptions {
  /** Alphabet for `chars` mode. */
  hintChars?: string
  /** `chars` types the label; `filter` types the link text. */
  mode?: 'chars' | 'filter'
  /** Filter mode: require Enter to activate when one match is left. */
  waitForEnter?: boolean
}

/** Accept a bare alphabet string for backwards compatibility. */
function toOptions(input: string | LinkHintOptions | undefined): LinkHintOptions {
  return typeof input === 'string' ? { hintChars: input } : (input || {})
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface Hint {
  label: string
  target: HintTarget
  overlay: HTMLElement
  /** Lowercased text used by filter mode. */
  text: string
  /** Whether the hint currently passes the filter. */
  visible: boolean
}

interface HintState {
  hints: Hint[]
  /** Characters typed so far (a label in `chars` mode, a query in `filter`). */
  typed: string
  /** Digits typed after the query in `filter` mode. */
  typedDigits: string
  mode: 'chars' | 'filter'
  waitForEnter: boolean
  /** The hint alphabet in use for this session. */
  chars: string
  /** Whether to open links in a new tab. */
  openInNewTab: boolean
  /** The container element holding all hint overlays. */
  container: HTMLElement | null
  statusBar: HTMLElement | null
  /** Keydown listener reference for cleanup. */
  keydownListener: ((e: KeyboardEvent) => void) | null
  dismissListener: (() => void) | null
}

let state: HintState | null = null

/** Set when the user picks a scrollable container via a hint. */
let preferredScrollContainer: HTMLElement | null = null

/** The container the user last picked via a scrollable hint, if still valid. */
export function getPreferredScrollContainer(): HTMLElement | null {
  if (preferredScrollContainer && !preferredScrollContainer.isConnected) {
    preferredScrollContainer = null
  }
  return preferredScrollContainer
}

export function clearPreferredScrollContainer(): void {
  preferredScrollContainer = null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Activate link hint mode. If already active, deactivate first.
 *
 * `options` may be a bare alphabet string (a shortcut's own `hintChars`) or a
 * full options object built from the global Vim settings.
 */
export function activateLinkHints(
  openInNewTab: boolean = false,
  options?: string | LinkHintOptions,
): void {
  // If already active, toggle off
  if (state) {
    deactivateLinkHints()
    return
  }

  const opts = toOptions(options)
  const mode = opts.mode === 'filter' ? 'filter' : 'chars'
  const chars = normalizeHintChars(opts.hintChars)

  const targets = findHintTargets({
    thorough: opts.thorough,
    shadowDom: opts.shadowDom,
    scrollables: opts.scrollables,
    skipCovered: opts.skipCovered,
  })
  if (targets.length === 0) return

  const labels = generateLabels(targets.length, mode === 'filter' ? FILTER_DIGITS : chars)
  const container = createContainer()
  const hints: Hint[] = []

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]
    const overlay = createHintOverlay(labels[i], target)
    if (!overlay) continue
    container.appendChild(overlay)
    hints.push({
      label: labels[i],
      target,
      overlay,
      text: mode === 'filter' ? hintText(target).toLowerCase() : '',
      visible: true,
    })
  }

  // Nothing visible after filtering
  if (hints.length === 0) {
    container.remove()
    return
  }

  document.documentElement.appendChild(container)

  state = {
    hints,
    typed: '',
    typedDigits: '',
    mode,
    waitForEnter: opts.waitForEnter !== false,
    chars,
    openInNewTab,
    container,
    statusBar: null,
    keydownListener: null,
    dismissListener: null,
  }

  if (mode === 'filter') {
    // Renumber and show the readout straight away.
    updateHintVisibility()
  }

  // Capture keystrokes. Capture phase so we intercept before Mousetrap or the page.
  const listener = (e: KeyboardEvent) => onKeydown(e)
  state.keydownListener = listener
  document.addEventListener('keydown', listener, true)

  // Hint positions go stale the moment the page moves under them.
  const dismiss = () => deactivateLinkHints()
  state.dismissListener = dismiss
  window.addEventListener('scroll', dismiss, true)
  window.addEventListener('resize', dismiss, true)
}

/** Deactivate link hint mode and clean up. */
export function deactivateLinkHints(): void {
  if (!state) return

  if (state.keydownListener) {
    document.removeEventListener('keydown', state.keydownListener, true)
  }
  if (state.dismissListener) {
    window.removeEventListener('scroll', state.dismissListener, true)
    window.removeEventListener('resize', state.dismissListener, true)
  }
  state.container?.remove()
  state = null
}

/** Whether link hint mode is currently active (useful for stopCallback). */
export function isLinkHintModeActive(): boolean {
  return state !== null
}

// ---------------------------------------------------------------------------
// Label generation
// ---------------------------------------------------------------------------

/**
 * Generate unique alphabetic labels for `count` elements.
 *
 * Uses a variable-length prefix scheme similar to Vimium: given N characters
 * in the hint alphabet, we produce labels of length ceil(log_N(count)). This
 * keeps labels short while remaining unique.
 */
export function generateLabels(count: number, hintChars: string = DEFAULT_HINT_CHARS): string[] {
  if (count === 0) return []

  const alphabet = normalizeHintChars(hintChars)
  if (count === 1) return [alphabet[0]]

  const chars = alphabet.split('')
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
// Hint text (filter mode)
// ---------------------------------------------------------------------------

/**
 * The text a user would search for to find this element.
 * Mirrors the sources Vimium-C's `generateHintText` looks at.
 */
export function hintText(target: HintTarget): string {
  const el = target.element

  if (target.area) {
    return target.area.alt || target.area.title || target.area.href || ''
  }

  const aria = el.getAttribute('aria-label')
  if (aria) return aria.trim()

  const tag = el.localName
  if (tag === 'input') {
    const input = el as HTMLInputElement
    if (input.type === 'submit' || input.type === 'button' || input.type === 'reset') {
      return (input.value || input.title || '').trim()
    }
    return (input.placeholder || input.title || input.name || '').trim()
  }
  if (tag === 'img') {
    const img = el as HTMLImageElement
    return (img.alt || img.title || '').trim()
  }
  if (tag === 'select' || tag === 'textarea') {
    return (el.getAttribute('placeholder') || el.getAttribute('name') || '').trim()
  }

  const text = (el.innerText || el.textContent || '').trim()
  if (text) return text.slice(0, 120)

  return (el.title || el.getAttribute('alt') || el.getAttribute('name') || '').trim()
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

function createHintOverlay(label: string, target: HintTarget): HTMLElement | null {
  const { rect } = target
  if (rect.width === 0 && rect.height === 0) return null

  const hint = document.createElement('span')
  hint.className = `${PREFIX}-label`
  hint.dataset.hintLabel = label
  hint.textContent = label

  // Sit just above and left of the target so the element itself stays readable.
  const left = Math.max(0, Math.round(rect.left) - 2)
  const top = Math.max(0, Math.round(rect.top) - 6)

  Object.assign(hint.style, {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
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

  // Scrollable containers get a different colour so they read as "scroll here".
  if (target.reason === 'scrollable') {
    Object.assign(hint.style, {
      border: '1px solid #2d6ea8',
      background: 'linear-gradient(to bottom, #d3ecff, #8fc7f5)',
    })
  }

  return hint
}

/** The small readout that shows the current filter query. */
function updateStatusBar(): void {
  if (!state || state.mode !== 'filter') return

  if (!state.statusBar) {
    const bar = document.createElement('div')
    Object.assign(bar.style, {
      position: 'fixed',
      left: '0',
      bottom: '0',
      zIndex: '2147483647',
      padding: '4px 10px',
      background: '#1e293b',
      color: '#f1f5f9',
      font: '12px SF Mono, Menlo, Consolas, monospace',
      borderTopRightRadius: '6px',
      pointerEvents: 'none',
    })
    state.container?.appendChild(bar)
    state.statusBar = bar
  }

  const matches = state.hints.filter((h) => h.visible).length
  state.statusBar.textContent = state.typed
    ? `${state.typed}${state.typedDigits ? ' ' + state.typedDigits : ''} — ${matches} match${matches === 1 ? '' : 'es'}`
    : `Type to filter — ${matches} link${matches === 1 ? '' : 's'}`
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

  // Ignore modifier-only keys
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return

  if (state.mode === 'filter') {
    onFilterKey(e)
    return
  }

  if (e.key === 'Backspace') {
    if (state.typed.length > 0) {
      state.typed = state.typed.slice(0, -1)
      updateHintVisibility()
    }
    return
  }

  const char = e.key.toUpperCase()

  // Only accept characters that are in this session's hint alphabet
  if (!state.chars.includes(char)) {
    deactivateLinkHints()
    return
  }

  state.typed += char
  updateHintVisibility()

  // Check for exact match
  const match = state.hints.find((h) => h.label === state.typed)
  if (match) {
    const openInNewTab = state.openInNewTab
    deactivateLinkHints()
    activateTarget(match.target, openInNewTab)
  }
}

/** Filter mode: letters narrow the list, digits pick from what is left. */
function onFilterKey(e: KeyboardEvent): void {
  if (!state) return

  if (e.key === 'Backspace') {
    if (state.typedDigits) {
      state.typedDigits = state.typedDigits.slice(0, -1)
    } else if (state.typed) {
      state.typed = state.typed.slice(0, -1)
    }
    updateHintVisibility()
    return
  }

  if (e.key === 'Enter') {
    const visible = state.hints.filter((h) => h.visible)
    const chosen = state.typedDigits
      ? visible.find((h) => h.label === state.typedDigits)
      : visible[0]
    if (chosen) {
      const openInNewTab = state.openInNewTab
      deactivateLinkHints()
      activateTarget(chosen.target, openInNewTab)
    }
    return
  }

  if (e.key.length !== 1) return

  if (FILTER_DIGITS.includes(e.key)) {
    state.typedDigits += e.key
    updateHintVisibility()

    const exact = state.hints.find((h) => h.visible && h.label === state.typedDigits)
    if (exact && !hasLongerLabel(state.typedDigits)) {
      const openInNewTab = state.openInNewTab
      deactivateLinkHints()
      activateTarget(exact.target, openInNewTab)
    }
    return
  }

  state.typed += e.key.toLowerCase()
  state.typedDigits = ''
  updateHintVisibility()

  // A single remaining match activates itself unless the user asked to confirm.
  const visible = state.hints.filter((h) => h.visible)
  if (visible.length === 1 && !state.waitForEnter) {
    const openInNewTab = state.openInNewTab
    deactivateLinkHints()
    activateTarget(visible[0].target, openInNewTab)
  }
}

/** True when another visible label extends the digits typed so far. */
function hasLongerLabel(prefix: string): boolean {
  if (!state) return false
  return state.hints.some((h) => h.visible && h.label !== prefix && h.label.startsWith(prefix))
}

function updateHintVisibility(): void {
  if (!state) return

  if (state.mode === 'filter') {
    updateFilterHints()
    return
  }

  for (const hint of state.hints) {
    if (hint.label.startsWith(state.typed)) {
      hint.visible = true
      hint.overlay.style.display = ''
      // Highlight matched portion
      const matchedPart = hint.label.slice(0, state.typed.length)
      const remainingPart = hint.label.slice(state.typed.length)
      hint.overlay.innerHTML =
        `<span style="opacity:0.5">${escapeHtml(matchedPart)}</span>${escapeHtml(remainingPart)}`
    } else {
      hint.visible = false
      hint.overlay.style.display = 'none'
    }
  }
}

function updateFilterHints(): void {
  if (!state) return

  const query = state.typed
  let index = 1
  for (const hint of state.hints) {
    const matches = !query || hint.text.includes(query)
    hint.visible = matches
    hint.overlay.style.display = matches ? '' : 'none'
    if (matches) {
      // Renumber so the visible hints always read 1, 2, 3…
      hint.label = String(index++)
      hint.overlay.textContent = hint.label
    }
  }

  for (const hint of state.hints) {
    if (!hint.visible) continue
    hint.overlay.style.opacity =
      state.typedDigits && !hint.label.startsWith(state.typedDigits) ? '0.35' : '1'
  }

  updateStatusBar()
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ---------------------------------------------------------------------------
// Target activation
// ---------------------------------------------------------------------------

const TEXT_INPUT_TYPES: ReadonlySet<string> = new Set([
  'text', 'search', 'email', 'url', 'tel', 'password', 'number', 'date', 'time',
  'datetime-local', 'month', 'week',
])

/** Elements that should be focused rather than clicked. */
function shouldFocusOnly(el: HTMLElement): boolean {
  const tag = el.localName
  if (tag === 'textarea' || tag === 'select') return true
  if (tag === 'input') return TEXT_INPUT_TYPES.has((el as HTMLInputElement).type)
  return el.isContentEditable
}

export function activateTarget(target: HintTarget, openInNewTab: boolean): void {
  const el = target.element

  // A scrollable container becomes the scroll target instead of being clicked.
  if (target.reason === 'scrollable') {
    preferredScrollContainer = el
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
    el.focus({ preventScroll: true })
    return
  }

  if (openInNewTab) {
    // Try to extract a URL and open it in a new tab
    const href = target.area?.href || getLinkHref(el)
    if (href) {
      window.open(href, '_blank', 'noopener')
      return
    }
    // Fall back to regular click if no URL available
  }

  if (target.area) {
    target.area.click()
    return
  }

  // Focus the element (important for inputs)
  el.focus({ preventScroll: true })
  if (shouldFocusOnly(el)) return

  simulateClick(el)
}

/**
 * Send the pointer/mouse sequence a real click produces, then click natively.
 *
 * Plenty of sites act on `pointerdown` or `mousedown` and never see a bare
 * `click()`; Vimium-C sends the same sequence for that reason. The native
 * `click()` at the end still runs the element's default action (following an
 * href, submitting a form), which a synthetic event alone does not guarantee
 * across browsers.
 */
function simulateClick(el: HTMLElement): void {
  const rect = el.getBoundingClientRect()
  const init: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  }

  const view = el.ownerDocument.defaultView
  if (view) init.view = view

  try {
    if (typeof PointerEvent === 'function') {
      el.dispatchEvent(new PointerEvent('pointerover', init))
      el.dispatchEvent(new PointerEvent('pointerdown', init))
      el.dispatchEvent(new PointerEvent('pointerup', init))
    }
    for (const type of ['mouseover', 'mousemove', 'mousedown', 'mouseup'] as const) {
      const notCancelled = el.dispatchEvent(new MouseEvent(type, init))
      // If the page cancels mousedown it usually handles the interaction itself.
      if (type === 'mousedown' && !notCancelled) { el.click(); return }
    }
  } catch {
    // Older engines can reject some event inits — the native click still works.
  }

  el.click()
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
