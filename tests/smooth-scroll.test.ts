/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  canScroll,
  findScrollableAncestor,
  resolveScrollTarget,
  rootScroller,
  scrollBy,
  scrollToEdge,
  pageAmount,
  stopScrolling,
  setPreferredScroller,
} from '../src/utils/smooth-scroll'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * A container with real scroll behaviour: jsdom keeps scrollTop at 0, so the
 * property is redefined with clamping like a browser does.
 */
function makeScrollable(
  tag = 'div',
  { client = 400, scroll = 2000, axis = 'y' as 'x' | 'y' } = {},
): HTMLElement {
  const el = document.createElement(tag)
  let posY = 0
  let posX = 0

  Object.defineProperty(el, 'clientHeight', { value: axis === 'y' ? client : 100, configurable: true })
  Object.defineProperty(el, 'scrollHeight', { value: axis === 'y' ? scroll : 100, configurable: true })
  Object.defineProperty(el, 'clientWidth', { value: axis === 'x' ? client : 100, configurable: true })
  Object.defineProperty(el, 'scrollWidth', { value: axis === 'x' ? scroll : 100, configurable: true })

  Object.defineProperty(el, 'scrollTop', {
    get: () => posY,
    set: (v: number) => { posY = Math.max(0, Math.min(v, (axis === 'y' ? scroll : 100) - (axis === 'y' ? client : 100))) },
    configurable: true,
  })
  Object.defineProperty(el, 'scrollLeft', {
    get: () => posX,
    set: (v: number) => { posX = Math.max(0, Math.min(v, (axis === 'x' ? scroll : 100) - (axis === 'x' ? client : 100))) },
    configurable: true,
  })

  document.body.appendChild(el)
  return el
}

/** Drive the animation loop by hand. */
let rafCallbacks: FrameRequestCallback[] = []
let now = 0

function flushFrames(count: number, msPerFrame = 16): void {
  for (let i = 0; i < count; i++) {
    const callbacks = rafCallbacks
    rafCallbacks = []
    if (callbacks.length === 0) return
    now += msPerFrame
    for (const cb of callbacks) cb(now)
  }
}

beforeEach(() => {
  document.body.innerHTML = ''
  rafCallbacks = []
  now = 0
  stopScrolling()
  setPreferredScroller(null)

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb)
    return rafCallbacks.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    overflowY: 'auto', overflowX: 'auto',
  } as CSSStyleDeclaration)
})

afterEach(() => {
  stopScrolling()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Target selection
// ---------------------------------------------------------------------------

describe('canScroll', () => {
  it('is true for a container with content below', () => {
    expect(canScroll(makeScrollable(), 'y', 1)).toBe(true)
  })

  it('is false at the top when scrolling up', () => {
    const pane = makeScrollable()
    expect(canScroll(pane, 'y', -1)).toBe(false)
  })

  it('is false at the bottom when scrolling down', () => {
    const pane = makeScrollable()
    pane.scrollTop = 1600
    expect(canScroll(pane, 'y', 1)).toBe(false)
    expect(canScroll(pane, 'y', -1)).toBe(true)
  })

  it('is false for content that fits', () => {
    const pane = makeScrollable('div', { client: 400, scroll: 400 })
    expect(canScroll(pane, 'y', 1)).toBe(false)
  })

  it('respects the overflow style', () => {
    const pane = makeScrollable()
    vi.mocked(window.getComputedStyle).mockReturnValue({
      overflowY: 'hidden', overflowX: 'hidden',
    } as CSSStyleDeclaration)
    expect(canScroll(pane, 'y', 1)).toBe(false)
  })
})

describe('findScrollableAncestor', () => {
  it('walks up to the nearest scrollable parent', () => {
    const pane = makeScrollable()
    const inner = document.createElement('span')
    pane.appendChild(inner)

    expect(findScrollableAncestor(inner, 'y', 1)).toBe(pane)
  })

  it('skips a container that cannot move further in that direction', () => {
    const outer = makeScrollable()
    const inner = makeScrollable()
    outer.appendChild(inner)
    const leaf = document.createElement('span')
    inner.appendChild(leaf)

    // inner is at the top, so scrolling up has to fall through to outer…
    outer.scrollTop = 500
    expect(findScrollableAncestor(leaf, 'y', -1)).toBe(outer)
    // …while scrolling down stays on the inner pane.
    expect(findScrollableAncestor(leaf, 'y', 1)).toBe(inner)
  })

  it('falls back to the page when nothing scrolls', () => {
    const plain = document.createElement('div')
    document.body.appendChild(plain)
    expect(findScrollableAncestor(plain, 'y', 1)).toBe(rootScroller())
  })

  it('crosses a shadow boundary via the host', () => {
    const pane = makeScrollable()
    const host = document.createElement('div')
    pane.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const inner = document.createElement('span')
    shadow.appendChild(inner)

    expect(findScrollableAncestor(inner, 'y', 1)).toBe(pane)
  })
})

describe('resolveScrollTarget', () => {
  it('prefers an explicitly supplied container', () => {
    const pane = makeScrollable()
    expect(resolveScrollTarget('y', 1, pane)).toBe(pane)
  })

  it('ignores an explicit container that cannot scroll that way', () => {
    const pane = makeScrollable()
    // At the top already, so an upward scroll must not use it.
    expect(resolveScrollTarget('y', -1, pane)).toBe(rootScroller())
  })

  it('remembers the last scrolled container', () => {
    const pane = makeScrollable()
    scrollBy('y', 100, { smooth: false, target: pane })

    // No explicit target this time — the remembered one is used.
    expect(resolveScrollTarget('y', 1)).toBe(pane)
  })

  it('forgets a container once it is detached', () => {
    const pane = makeScrollable()
    scrollBy('y', 100, { smooth: false, target: pane })
    pane.remove()

    expect(resolveScrollTarget('y', 1)).toBe(rootScroller())
  })
})

// ---------------------------------------------------------------------------
// Scrolling
// ---------------------------------------------------------------------------

describe('scrollBy', () => {
  it('applies the whole amount at once when not smooth', () => {
    const pane = makeScrollable()
    scrollBy('y', 250, { smooth: false, target: pane })
    expect(pane.scrollTop).toBe(250)
  })

  it('does nothing for a zero amount', () => {
    const pane = makeScrollable()
    scrollBy('y', 0, { smooth: false, target: pane })
    expect(pane.scrollTop).toBe(0)
  })

  it('scrolls horizontally on the x axis', () => {
    const pane = makeScrollable('div', { axis: 'x', client: 400, scroll: 2000 })
    scrollBy('x', 120, { smooth: false, target: pane })
    expect(pane.scrollLeft).toBe(120)
  })

  it('animates over several frames and lands on the target', () => {
    const pane = makeScrollable()
    scrollBy('y', 300, { smooth: true, duration: 100, target: pane })

    // Nothing moves until the first frame runs.
    expect(pane.scrollTop).toBe(0)

    flushFrames(1)
    const afterOne = pane.scrollTop
    expect(afterOne).toBeGreaterThan(0)
    expect(afterOne).toBeLessThan(300)

    flushFrames(40)
    expect(pane.scrollTop).toBe(300)
  })

  it('adds to the running animation instead of restarting it', () => {
    const pane = makeScrollable()
    scrollBy('y', 100, { smooth: true, duration: 100, target: pane })
    flushFrames(2)

    // A second keypress while the first is still animating.
    scrollBy('y', 100, { smooth: true, duration: 100, target: pane })
    flushFrames(40)

    // Both steps land — the total is what the user asked for.
    expect(pane.scrollTop).toBe(200)
  })

  it('reverses immediately instead of fighting the old direction', () => {
    const pane = makeScrollable()
    pane.scrollTop = 800

    scrollBy('y', 400, { smooth: true, duration: 100, target: pane })
    flushFrames(1)
    const afterDown = pane.scrollTop
    expect(afterDown).toBeGreaterThan(800)

    scrollBy('y', -200, { smooth: true, duration: 100, target: pane })
    flushFrames(40)

    // Ends 200px above where the reversal started, not 200 below the old goal.
    expect(pane.scrollTop).toBe(afterDown - 200)
  })

  it('stops when the container reaches its end', () => {
    const pane = makeScrollable('div', { client: 400, scroll: 600 })
    scrollBy('y', 5000, { smooth: true, duration: 50, target: pane })
    flushFrames(60)

    expect(pane.scrollTop).toBe(200) // 600 - 400
    // The animation is finished, so later frames are not requested.
    expect(rafCallbacks).toHaveLength(0)
  })

  it('gives up when the element leaves the document', () => {
    const pane = makeScrollable()
    scrollBy('y', 500, { smooth: true, duration: 100, target: pane })
    flushFrames(1)
    pane.remove()
    flushFrames(5)

    expect(rafCallbacks).toHaveLength(0)
  })

  it('stopScrolling halts an animation in progress', () => {
    const pane = makeScrollable()
    scrollBy('y', 1000, { smooth: true, duration: 200, target: pane })
    flushFrames(2)
    const stopped = pane.scrollTop

    stopScrolling()
    flushFrames(10)

    expect(pane.scrollTop).toBe(stopped)
  })
})

describe('scrollToEdge', () => {
  it('jumps to the bottom without animation', () => {
    const pane = makeScrollable()
    scrollToEdge('y', 'end', { smooth: false, target: pane })
    expect(pane.scrollTop).toBe(1600)
  })

  it('jumps to the top without animation', () => {
    const pane = makeScrollable()
    pane.scrollTop = 900
    scrollToEdge('y', 'start', { smooth: false, target: pane })
    expect(pane.scrollTop).toBe(0)
  })

  it('animates to the bottom', () => {
    const pane = makeScrollable()
    scrollToEdge('y', 'end', { smooth: true, duration: 60, target: pane })
    flushFrames(80)
    expect(pane.scrollTop).toBe(1600)
  })

  it('does nothing when already at the edge', () => {
    const pane = makeScrollable()
    scrollToEdge('y', 'start', { smooth: true, target: pane })
    expect(rafCallbacks).toHaveLength(0)
  })
})

describe('pageAmount', () => {
  it('is a little less than the container height, to keep context', () => {
    const pane = makeScrollable('div', { client: 500, scroll: 5000 })
    const amount = pageAmount('y', 1, pane)

    expect(amount).toBeLessThan(500)
    expect(amount).toBeGreaterThan(400)
  })
})
