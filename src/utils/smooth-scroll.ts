/**
 * Smooth scrolling that runs inside the content script.
 *
 * Shortkeys used to answer every scroll keypress with a message to the
 * background page and a `chrome.scripting.executeScript` injection that called
 * `scrollBy({ behavior: 'smooth' })`. That costs a round trip per keystroke,
 * and CSS smooth scrolling restarts its own animation every time, so holding a
 * key produced a stuttering crawl.
 *
 * This module keeps one animation per element+axis and *adds* to the pending
 * distance when another keypress arrives, so a held key turns into continuous
 * motion. The approach follows Vimium-C's `content/scroller.ts` (Apache-2.0 /
 * MIT, Copyright Gong Dahan — see NOTICE.md), reimplemented in a much smaller
 * form: an exponential approach to the target instead of their frame-rate
 * calibrated linear ramp.
 */

export type ScrollAxis = 'x' | 'y'

export interface ScrollOptions {
  /** Animate instead of jumping. */
  smooth?: boolean
  /** Base animation duration in ms for one step. */
  duration?: number
  /** Element to scroll. Defaults to the best scrollable element found. */
  target?: HTMLElement | null
}

const DEFAULT_DURATION = 120

/** Below this the remaining distance is applied in one go. */
const MIN_DELTA = 0.5

/** How much of a viewport a page-scroll keeps as context. */
const PAGE_OVERLAP = 0.12

// ---------------------------------------------------------------------------
// Scrollable element discovery
// ---------------------------------------------------------------------------

/** The element that scrolls the page itself. */
export function rootScroller(): HTMLElement {
  return (document.scrollingElement as HTMLElement) || document.documentElement
}

function scrollPos(el: HTMLElement, axis: ScrollAxis): number {
  return axis === 'y' ? el.scrollTop : el.scrollLeft
}

function setScrollPos(el: HTMLElement, axis: ScrollAxis, value: number): void {
  if (axis === 'y') el.scrollTop = value
  else el.scrollLeft = value
}

function maxScroll(el: HTMLElement, axis: ScrollAxis): number {
  return axis === 'y'
    ? el.scrollHeight - el.clientHeight
    : el.scrollWidth - el.clientWidth
}

/** Does this element's own style allow scrolling on the axis? */
function overflowAllowsScroll(el: HTMLElement, axis: ScrollAxis): boolean {
  if (el === rootScroller() || el === document.body || el === document.documentElement) return true
  const style = getComputedStyle(el)
  const overflow = axis === 'y' ? style.overflowY : style.overflowX
  return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay'
}

/**
 * Can `el` still move on this axis in this direction?
 * `dir` is -1 (up/left) or 1 (down/right); 0 means "either way".
 */
export function canScroll(el: HTMLElement, axis: ScrollAxis, dir: number): boolean {
  const limit = maxScroll(el, axis)
  if (limit <= 1) return false
  if (!overflowAllowsScroll(el, axis)) return false

  const pos = scrollPos(el, axis)
  if (dir > 0) return pos < limit - 1
  if (dir < 0) return pos > 1
  return true
}

/** The element that last accepted a scroll, preferred while it still can. */
let lastScrolled: HTMLElement | null = null

/** Reset the remembered scroll container (used when hints pick a new one). */
export function setPreferredScroller(el: HTMLElement | null): void {
  lastScrolled = el
}

/**
 * Walk up from `start` to the first element that can scroll on this axis,
 * falling back to the page itself.
 *
 * Crossing a shadow boundary continues at the host element, which is what a
 * user perceives as "the next container up".
 */
export function findScrollableAncestor(
  start: Element | null,
  axis: ScrollAxis,
  dir: number,
): HTMLElement {
  let node: Node | null = start

  while (node) {
    if (node instanceof HTMLElement && canScroll(node, axis, dir)) return node

    if (node instanceof ShadowRoot) {
      node = node.host
      continue
    }
    node = (node as Element).parentElement ?? (node as Element).getRootNode?.() ?? null
    if (node instanceof Document) break
  }

  return rootScroller()
}

/**
 * Pick the element a scroll command should act on.
 *
 * Preference order: the container the user last scrolled (while it can still
 * move), the focused element's nearest scrollable ancestor, then the page.
 */
export function resolveScrollTarget(axis: ScrollAxis, dir: number, explicit?: HTMLElement | null): HTMLElement {
  if (explicit && canScroll(explicit, axis, dir)) return explicit

  if (lastScrolled) {
    if (!lastScrolled.isConnected) lastScrolled = null
    else if (canScroll(lastScrolled, axis, dir)) return lastScrolled
  }

  const active = document.activeElement
  if (active && active !== document.body) {
    const found = findScrollableAncestor(active, axis, dir)
    if (canScroll(found, axis, dir)) return found
  }

  return rootScroller()
}

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

interface Animation {
  element: HTMLElement
  axis: ScrollAxis
  /** Signed distance still to travel. */
  remaining: number
  /** Fractional pixels carried between frames. */
  carry: number
  duration: number
  lastTime: number
  frame: number
}

/** One animation per axis is plenty — a keypress on the other axis replaces it. */
const animations = new Map<string, Animation>()

function animationKey(el: HTMLElement, axis: ScrollAxis): string {
  // Elements are not valid Map keys alongside the axis, so key on both.
  const id = (el as any).__shortkeysScrollId || ((el as any).__shortkeysScrollId = String(nextId++))
  return `${id}:${axis}`
}

let nextId = 1

/** Stop every running scroll animation. */
export function stopScrolling(): void {
  for (const animation of animations.values()) {
    cancelAnimationFrame(animation.frame)
  }
  animations.clear()
}

function applyScroll(el: HTMLElement, axis: ScrollAxis, delta: number): number {
  const before = scrollPos(el, axis)
  setScrollPos(el, axis, before + delta)
  return scrollPos(el, axis) - before
}

function step(key: string, now: number): void {
  const animation = animations.get(key)
  if (!animation) return

  const { element, axis } = animation
  if (!element.isConnected) {
    animations.delete(key)
    return
  }

  const elapsed = Math.max(1, Math.min(now - animation.lastTime, 100))
  animation.lastTime = now

  // Exponential approach: covers ~95% of the distance in `duration` ms and
  // speeds up automatically when a held key adds more distance.
  const tau = Math.max(animation.duration, 1) / 3
  const portion = 1 - Math.exp(-elapsed / tau)

  let delta = animation.remaining * portion + animation.carry
  const whole = delta > 0 ? Math.floor(delta) : Math.ceil(delta)
  animation.carry = delta - whole

  if (Math.abs(animation.remaining) < MIN_DELTA) {
    animations.delete(key)
    return
  }

  const moved = whole !== 0 ? applyScroll(element, axis, whole) : 0

  // Hit the end of the container — nothing more to do.
  if (whole !== 0 && Math.abs(moved) < Math.abs(whole) - 0.5) {
    animations.delete(key)
    return
  }

  animation.remaining -= moved

  if (Math.abs(animation.remaining) < MIN_DELTA) {
    animations.delete(key)
    return
  }

  animation.frame = requestAnimationFrame((t) => step(key, t))
}

/**
 * Scroll `amount` pixels along `axis`.
 *
 * A positive amount scrolls down/right. When an animation is already running
 * for the same element and axis the distance is added to it, which is what
 * makes a held key scroll continuously instead of restarting each repeat.
 */
export function scrollBy(axis: ScrollAxis, amount: number, options: ScrollOptions = {}): void {
  if (!amount) return

  const dir = amount > 0 ? 1 : -1
  const element = resolveScrollTarget(axis, dir, options.target)
  lastScrolled = element

  if (options.smooth === false) {
    applyScroll(element, axis, amount)
    return
  }

  const key = animationKey(element, axis)
  const existing = animations.get(key)
  const duration = options.duration ?? DEFAULT_DURATION

  if (existing) {
    // Reversing direction should feel immediate, not fight the old motion.
    if (Math.sign(existing.remaining) !== dir) existing.remaining = 0
    existing.remaining += amount
    existing.duration = duration
    return
  }

  const animation: Animation = {
    element,
    axis,
    remaining: amount,
    carry: 0,
    duration,
    lastTime: performance.now(),
    frame: 0,
  }
  animations.set(key, animation)
  animation.frame = requestAnimationFrame((t) => step(key, t))
}

/** Scroll to the start or end of the axis. */
export function scrollToEdge(axis: ScrollAxis, edge: 'start' | 'end', options: ScrollOptions = {}): void {
  const dir = edge === 'end' ? 1 : -1
  const element = resolveScrollTarget(axis, dir, options.target)
  lastScrolled = element

  const current = scrollPos(element, axis)
  const destination = edge === 'end' ? maxScroll(element, axis) : 0
  const amount = destination - current
  if (!amount) return

  if (options.smooth === false) {
    setScrollPos(element, axis, destination)
    return
  }

  // Jumping the whole page takes a little longer, but not proportionally.
  const duration = (options.duration ?? DEFAULT_DURATION)
    * Math.min(3, Math.max(1, Math.abs(amount) / Math.max(1, element.clientHeight)))

  scrollBy(axis, amount, { ...options, duration, target: element })
}

/** Height of one "page" scroll for the element that would be scrolled. */
export function pageAmount(axis: ScrollAxis, dir: number, target?: HTMLElement | null): number {
  const element = resolveScrollTarget(axis, dir, target)
  const size = axis === 'y' ? element.clientHeight : element.clientWidth
  const viewport = axis === 'y' ? window.innerHeight : window.innerWidth
  const base = size > 0 ? size : viewport
  return Math.max(1, Math.round(base * (1 - PAGE_OVERLAP)))
}
