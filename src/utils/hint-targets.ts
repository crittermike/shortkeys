/**
 * Discovery of hintable ("clickable") elements and their on-screen geometry.
 *
 * The algorithms here are reimplementations of the ones Vimium-C uses in
 * `content/local_links.ts` and `lib/rect.ts` (Apache-2.0 / MIT,
 * Copyright Gong Dahan — see NOTICE.md). Vimium-C's own code is written
 * against its private runtime and build-time constant folding, so this is a
 * rewrite of the technique rather than a copy of the source.
 *
 * The two things that make it find far more targets than a plain
 * `querySelectorAll` over a fixed selector:
 *
 *  1. Geometry comes from `getClientRects()`, not `getBoundingClientRect()`.
 *     A link wrapped across two lines has two boxes; its bounding box covers
 *     the gap between them and points at empty space. When every box is empty
 *     (a wrapper around a floated or absolutely positioned child) we descend
 *     into the children instead of discarding the element.
 *  2. Clickability is inferred from several weak signals — computed
 *     `cursor: pointer`, ARIA roles, framework attributes, class names,
 *     scrollability — not only from tag names.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

/**
 * Why we think an element is clickable. Strong reasons always produce a hint;
 * weak ones are suppressed when an ancestor already has a hint, so a card with
 * `cursor: pointer` gets one hint instead of one per inner span.
 */
export type HintReason =
  | 'link'        // a[href]
  | 'control'     // button, input, select, textarea, summary, label…
  | 'media'       // audio, video
  | 'editable'    // contenteditable
  | 'attribute'   // onclick, ng-click, jsaction, role=…
  | 'tabindex'
  | 'cursor'      // computed cursor: pointer
  | 'classname'
  | 'scrollable'

/** Strong reasons survive even inside an already-hinted ancestor. */
const STRONG_REASONS: ReadonlySet<HintReason> = new Set<HintReason>([
  'link', 'control', 'media', 'editable',
])

export interface HintTarget {
  element: HTMLElement
  rect: Rect
  reason: HintReason
  /** For image-map areas: the <area> that was matched. */
  area?: HTMLAreaElement
  /** Scroll direction when `reason === 'scrollable'`. */
  scrollAxis?: 'x' | 'y'
}

export interface HintTargetOptions {
  /** Inspect computed styles to catch custom clickable elements. */
  thorough?: boolean
  /** Traverse open shadow roots. */
  shadowDom?: boolean
  /** Offer scrollable containers as targets. */
  scrollables?: boolean
  /** Drop elements that another element covers. */
  skipCovered?: boolean
}

// ---------------------------------------------------------------------------
// Budgets
//
// A full-document walk has to stay cheap on pages with huge DOMs, so the two
// costly operations are capped. Past the cap detection degrades to the cheap
// signals rather than hanging the page.
// ---------------------------------------------------------------------------

const MAX_ELEMENTS = 25_000
const MAX_COMPUTED_STYLES = 5_000
/** Ignore boxes smaller than this — mostly tracking pixels and spacers. */
const MIN_SIZE = 3

// ---------------------------------------------------------------------------
// Heuristic tables
// ---------------------------------------------------------------------------

/** ARIA roles that behave like a control. */
const CLICKABLE_ROLES =
  /^(button|link|tab|menuitem|menuitemcheckbox|menuitemradio|checkbox|radio|option|switch|treeitem|combobox|searchbox|textbox|spinbutton|slider|listbox|gridcell)$/i

/** Class-name fragments that almost always mean "clickable" in the wild. */
const CLICKABLE_CLASSES =
  /(^|[\s_-])(btn|button|clickable|link|tab|chip|pill|toggle|switch|close|dismiss|dropdown|menuitem|selectable|actionable|card--?link|nav-?item)([\s_-]|$)/i

/** Tags that never deserve a hint of their own. */
const SKIPPED_TAGS: ReadonlySet<string> = new Set([
  'html', 'head', 'body', 'script', 'style', 'noscript', 'template', 'meta', 'link', 'title', 'br', 'hr',
])

/** Container tags worth testing for scrollability. */
const SCROLLABLE_TAGS: ReadonlySet<string> = new Set([
  'div', 'section', 'article', 'aside', 'main', 'nav', 'ul', 'ol', 'table', 'tbody', 'pre', 'form',
])

/** Input types that are not interactive. */
const INERT_INPUT_TYPES: ReadonlySet<string> = new Set(['hidden'])

/** Smallest container we bother offering as a scroll target. */
const MIN_SCROLLABLE_SIZE = 100

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

function makeRect(left: number, top: number, right: number, bottom: number): Rect {
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

/** Intersect a box with the viewport. Returns null when nothing usable is left. */
export function cropToViewport(
  left: number, top: number, right: number, bottom: number,
  viewWidth: number = window.innerWidth,
  viewHeight: number = window.innerHeight,
): Rect | null {
  const l = Math.max(left, 0)
  const t = Math.max(top, 0)
  const r = Math.min(right, viewWidth)
  const b = Math.min(bottom, viewHeight)
  if (r - l < MIN_SIZE || b - t < MIN_SIZE) return null
  return makeRect(l, t, r, b)
}

/** Cheap style test — does this element render at all? */
function isStyleVisible(style: CSSStyleDeclaration): boolean {
  return style.visibility !== 'hidden'
    && style.display !== 'none'
    && style.opacity !== '0'
}

/**
 * The visible box of an element, cropped to the viewport.
 *
 * Walks every client rect rather than the union bounding box. When all boxes
 * are empty the element is probably a wrapper, so we look at children that are
 * floated, positioned, or inline and use the first one that is visible.
 *
 * Ported from Vimium-C's `getVisibleClientRect_` (lib/rect.ts).
 */
export function getVisibleRect(
  element: Element,
  style?: CSSStyleDeclaration | null,
  depth: number = 0,
): Rect | null {
  const rects = element.getClientRects()
  let sawEmptyBox = false

  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]

    if (rect.width > 0 && rect.height > 0) {
      const cropped = cropToViewport(rect.left, rect.top, rect.right, rect.bottom)
      if (cropped) {
        return isStyleVisible(style || getComputedStyle(element)) ? cropped : null
      }
      continue
    }

    // Zero-sized box. Inspect the children once, then stop.
    if (sawEmptyBox || depth > 2) continue
    sawEmptyBox = true

    const ownStyle = style || getComputedStyle(element)
    const inlineParent = ownStyle.display.startsWith('inline')
      && (ownStyle.fontSize === '0px' || ownStyle.lineHeight === '0px')

    const children = element.children
    for (let j = 0; j < children.length; j++) {
      const child = children[j]
      const childStyle = getComputedStyle(child)
      const position = childStyle.position
      const useChild = childStyle.float !== 'none'
        || (position !== 'static' && position !== 'relative')
        || (rect.height === 0 && inlineParent && childStyle.display.startsWith('inline'))

      if (useChild) {
        const childRect = getVisibleRect(child, childStyle, depth + 1)
        if (childRect) return childRect
      }
    }
  }

  return null
}

/**
 * Client rects for the <area> shapes of an image map.
 * Ported from Vimium-C's `getClientRectsForAreas_`.
 */
export function getAreaRects(image: HTMLImageElement): Array<{ area: HTMLAreaElement; rect: Rect }> {
  const mapName = image.useMap.replace(/^#/, '')
  if (!mapName) return []

  // Looked up by hand rather than with a selector: map names are author text
  // and may contain characters that would need escaping.
  const maps = image.ownerDocument.getElementsByTagName('map')
  let map: HTMLMapElement | null = null
  for (let i = 0; i < maps.length; i++) {
    if (maps[i].name === mapName) { map = maps[i]; break }
  }
  if (!map) return []

  const imageRect = image.getBoundingClientRect()
  const results: Array<{ area: HTMLAreaElement; rect: Rect }> = []

  for (const area of Array.from(map.getElementsByTagName('area'))) {
    const coords = area.coords.split(/,\s*/).map(Number)
    if (coords.some(isNaN)) continue

    const shape = (area.shape || 'rect').toLowerCase()
    let x1: number, y1: number, x2: number, y2: number

    if (shape.startsWith('rect') && coords.length === 4) {
      [x1, y1, x2, y2] = coords
    } else if (shape.startsWith('circ') && coords.length === 3) {
      const [cx, cy, r] = coords
      x1 = cx - r; y1 = cy - r; x2 = cx + r; y2 = cy + r
    } else if (shape.startsWith('poly') && coords.length >= 6) {
      const xs = coords.filter((_, i) => i % 2 === 0)
      const ys = coords.filter((_, i) => i % 2 === 1)
      x1 = Math.min(...xs); y1 = Math.min(...ys)
      x2 = Math.max(...xs); y2 = Math.max(...ys)
    } else {
      continue
    }

    const rect = cropToViewport(
      imageRect.left + x1, imageRect.top + y1,
      imageRect.left + x2, imageRect.top + y2,
    )
    if (rect) results.push({ area, rect })
  }

  return results
}

// ---------------------------------------------------------------------------
// Traversal
// ---------------------------------------------------------------------------

/**
 * Every element in the document, descending into open shadow roots.
 * Closed roots are invisible to extensions, so they are simply missed.
 */
function collectElements(root: Document | ShadowRoot, shadowDom: boolean, out: HTMLElement[]): void {
  const all = root.querySelectorAll<HTMLElement>('*')

  for (let i = 0; i < all.length; i++) {
    if (out.length >= MAX_ELEMENTS) return
    const el = all[i]
    out.push(el)

    if (shadowDom) {
      const shadow = el.shadowRoot
      if (shadow) collectElements(shadow, shadowDom, out)
    }
  }
}

// ---------------------------------------------------------------------------
// Clickability
// ---------------------------------------------------------------------------

interface DetectionContext {
  thorough: boolean
  scrollables: boolean
  /** Remaining getComputedStyle budget. */
  styleBudget: number
  /** Whether the page uses these frameworks at all — checked once. */
  hasNgClick: boolean
  hasJsAction: boolean
}

function computedStyle(el: Element, ctx: DetectionContext): CSSStyleDeclaration | null {
  if (ctx.styleBudget <= 0) return null
  ctx.styleBudget--
  return getComputedStyle(el)
}

function attr(el: Element, name: string): string | null {
  return el.getAttribute(name)
}

/** Scroll axis for a container that can actually scroll, else null. */
function scrollableAxis(el: HTMLElement): 'x' | 'y' | null {
  const height = el.clientHeight
  if (height >= MIN_SCROLLABLE_SIZE && height + 5 < el.scrollHeight) return 'y'
  const width = el.clientWidth
  if (width >= MIN_SCROLLABLE_SIZE && width + 5 < el.scrollWidth) return 'x'
  return null
}

/**
 * Decide whether an element deserves a hint, and why.
 *
 * Mirrors the ordering of Vimium-C's `getClickable`: known interactive tags
 * first (cheap and certain), then attribute signals, then the fuzzy ones.
 */
export function classifyElement(el: HTMLElement, ctx: DetectionContext): HintReason | null {
  const tag = el.localName

  if (SKIPPED_TAGS.has(tag)) return null

  switch (tag) {
    case 'a':
      // A bare <a> with no href is only a target when something else marks it.
      return (el as HTMLAnchorElement).getAttribute('href') !== null ? 'link' : genericReason(el, ctx)
    case 'button':
    case 'select':
      return (el as HTMLButtonElement).disabled ? null : 'control'
    case 'textarea':
      return (el as HTMLTextAreaElement).disabled ? null : 'control'
    case 'input': {
      const input = el as HTMLInputElement
      if (input.disabled || INERT_INPUT_TYPES.has(input.type)) return null
      return 'control'
    }
    case 'audio':
    case 'video':
      return 'media'
    case 'summary':
      return 'control'
    case 'label':
      // Only hint a label when it drives a control that we would not hint anyway.
      return (el as HTMLLabelElement).control ? null : genericReason(el, ctx)
    case 'details':
      // The <summary> child carries the hint.
      return el.querySelector(':scope > summary') ? null : 'control'
    case 'option':
      // Options are reachable only through their <select>.
      return null
    case 'img': {
      const img = el as HTMLImageElement
      // Image maps are expanded separately; a plain image needs a pointer cursor.
      if (img.useMap) return null
      const inline = el.style.cursor
      if (inline && inline !== 'default' && inline !== 'auto') return 'cursor'
      return ctx.thorough ? cursorReason(el, ctx) : null
    }
  }

  return genericReason(el, ctx)
}

/** `cursor: pointer` (or a zoom/custom cursor) means someone wired up a click. */
function cursorReason(el: HTMLElement, ctx: DetectionContext): HintReason | null {
  const style = computedStyle(el, ctx)
  if (!style) return null
  const cursor = style.cursor
  if (cursor === 'pointer' || cursor.includes('zoom') || cursor.startsWith('url')) return 'cursor'
  return null
}

/** Signals that apply to any tag. */
function genericReason(el: HTMLElement, ctx: DetectionContext): HintReason | null {
  const editable = el.contentEditable
  if (editable === 'true' || editable === 'plaintext-only') return 'editable'

  if (attr(el, 'onclick') || attr(el, 'onmousedown')) return 'attribute'

  const role = attr(el, 'role')
  if (role && CLICKABLE_ROLES.test(role)) {
    // aria-disabled elements do nothing when clicked.
    return attr(el, 'aria-disabled') === 'true' ? null : 'attribute'
  }

  if (ctx.hasNgClick && (attr(el, 'ng-click') || attr(el, 'data-ng-click'))) return 'attribute'
  if (ctx.hasJsAction && attr(el, 'jsaction')) return 'attribute'

  const tabindex = attr(el, 'tabindex')
  if (tabindex !== null && parseInt(tabindex, 10) >= 0) return 'tabindex'

  const className = typeof el.className === 'string' ? el.className : ''
  if (className && CLICKABLE_CLASSES.test(className)) return 'classname'

  if (ctx.thorough) {
    const byCursor = cursorReason(el, ctx)
    if (byCursor) return byCursor
  }

  if (ctx.scrollables && SCROLLABLE_TAGS.has(el.localName) && scrollableAxis(el)) {
    return 'scrollable'
  }

  return null
}

// ---------------------------------------------------------------------------
// Occlusion
// ---------------------------------------------------------------------------

/**
 * Is this element actually reachable by a click at its own coordinates?
 *
 * Cheap protection against hinting elements behind a modal, a sticky header,
 * or a full-page overlay. An ancestor covering the element counts as reachable
 * because the click still lands on the right thing.
 */
export function isReachable(el: HTMLElement, rect: Rect): boolean {
  const doc = el.ownerDocument
  if (typeof doc.elementFromPoint !== 'function') return true

  const points: Array<[number, number]> = [
    [rect.left + Math.min(rect.width / 2, 12), rect.top + Math.min(rect.height / 2, 12)],
    [rect.left + rect.width / 2, rect.top + rect.height / 2],
  ]

  // Nothing hit-tested successfully — we cannot prove the element is covered,
  // so keep it. Losing every hint is far worse than keeping a covered one.
  let anyHit = false

  for (const [x, y] of points) {
    let hit: HTMLElement | null
    try {
      hit = doc.elementFromPoint(x, y) as HTMLElement | null
    } catch {
      return true
    }
    if (!hit) continue
    anyHit = true

    // elementFromPoint stops at a shadow host — descend to compare fairly.
    while (hit && hit.shadowRoot) {
      const inner = hit.shadowRoot.elementFromPoint(x, y) as HTMLElement | null
      if (!inner || inner === hit) break
      hit = inner
    }
    if (!hit) continue

    if (hit === el || el.contains(hit) || hit.contains(el)) return true

    // Same shadow tree: the host contains the element in the flattened tree.
    const root = el.getRootNode()
    if (root instanceof ShadowRoot && (hit === root.host || hit.contains(root.host))) return true
  }

  return !anyHit
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * All hintable targets in the current viewport, in document order.
 *
 * Elements found through a weak signal are dropped when an ancestor is already
 * a target, so nested `cursor: pointer` wrappers collapse into one hint.
 */
export function findHintTargets(options: HintTargetOptions = {}): HintTarget[] {
  const {
    thorough = true,
    shadowDom = true,
    scrollables = true,
    skipCovered = true,
  } = options

  const elements: HTMLElement[] = []
  collectElements(document, shadowDom, elements)

  const ctx: DetectionContext = {
    thorough,
    scrollables,
    styleBudget: MAX_COMPUTED_STYLES,
    hasNgClick: !!document.querySelector('[ng-click], [data-ng-click]'),
    hasJsAction: !!document.querySelector('[jsaction]'),
  }

  const targets: HintTarget[] = []
  const claimed = new Set<HTMLElement>()

  for (const el of elements) {
    const reason = classifyElement(el, ctx)

    // Image maps contribute one target per <area>.
    if (!reason && el.localName === 'img' && (el as HTMLImageElement).useMap) {
      for (const { area, rect } of getAreaRects(el as HTMLImageElement)) {
        targets.push({ element: el, rect, reason: 'link', area })
      }
      continue
    }

    if (!reason) continue

    // A weak signal inside an already-hinted ancestor is almost always noise.
    if (!STRONG_REASONS.has(reason) && hasClaimedAncestor(el, claimed)) continue

    const rect = getVisibleRect(el)
    if (!rect) continue

    if (skipCovered && !isReachable(el, rect)) continue

    targets.push({
      element: el,
      rect,
      reason,
      scrollAxis: reason === 'scrollable' ? scrollableAxis(el) || undefined : undefined,
    })
    claimed.add(el)
  }

  return targets
}

function hasClaimedAncestor(el: HTMLElement, claimed: Set<HTMLElement>): boolean {
  let node: HTMLElement | null = el.parentElement
  while (node) {
    if (claimed.has(node)) return true
    node = node.parentElement
  }
  return false
}
