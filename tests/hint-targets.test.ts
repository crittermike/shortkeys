/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  cropToViewport,
  getVisibleRect,
  getAreaRects,
  isReachable,
  findHintTargets,
} from '../src/utils/hint-targets'

// ---------------------------------------------------------------------------
// Helpers — jsdom has no layout, so geometry is supplied by hand.
// ---------------------------------------------------------------------------

interface Box { left: number; top: number; width: number; height: number }

function boxToRect(box: Box): DOMRect {
  return {
    left: box.left,
    top: box.top,
    right: box.left + box.width,
    bottom: box.top + box.height,
    width: box.width,
    height: box.height,
    x: box.left,
    y: box.top,
    toJSON: () => {},
  } as DOMRect
}

/** Give an element one client rect. */
function withBox<T extends Element>(el: T, box: Box): T {
  const rect = boxToRect(box)
  el.getBoundingClientRect = () => rect
  el.getClientRects = () => [rect] as unknown as DOMRectList
  Object.defineProperty(el, 'offsetWidth', { value: box.width, configurable: true })
  Object.defineProperty(el, 'offsetHeight', { value: box.height, configurable: true })
  return el
}

/** Give an element several client rects (a link wrapped across lines). */
function withBoxes<T extends Element>(el: T, boxes: Box[]): T {
  const rects = boxes.map(boxToRect)
  el.getBoundingClientRect = () => rects[0]
  el.getClientRects = () => rects as unknown as DOMRectList
  return el
}

function add<T extends HTMLElement>(el: T, box: Box = { left: 10, top: 10, width: 80, height: 20 }): T {
  withBox(el, box)
  document.body.appendChild(el)
  return el
}

function el(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  return node
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({
    display: 'block',
    visibility: 'visible',
    opacity: '1',
    cursor: 'auto',
    float: 'none',
    position: 'static',
    fontSize: '16px',
    lineHeight: '20px',
    overflowY: 'visible',
    overflowX: 'visible',
  } as unknown as CSSStyleDeclaration))
  Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true })
  Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
  // Tests that stub elementFromPoint would otherwise leak into later ones.
  document.elementFromPoint = () => null
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

describe('cropToViewport', () => {
  it('keeps a box that is fully on screen', () => {
    expect(cropToViewport(10, 20, 110, 60, 1024, 768))
      .toEqual({ left: 10, top: 20, right: 110, bottom: 60, width: 100, height: 40 })
  })

  it('clips a box that runs off the edges', () => {
    const rect = cropToViewport(-50, -10, 200, 100, 1024, 768)
    expect(rect).toEqual({ left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100 })
  })

  it('clips against the far edges', () => {
    const rect = cropToViewport(900, 700, 1200, 900, 1024, 768)!
    expect(rect.right).toBe(1024)
    expect(rect.bottom).toBe(768)
  })

  it('rejects a box that is off screen entirely', () => {
    expect(cropToViewport(2000, 20, 2100, 60, 1024, 768)).toBeNull()
    expect(cropToViewport(10, -200, 110, -100, 1024, 768)).toBeNull()
  })

  it('rejects slivers below the minimum size', () => {
    expect(cropToViewport(10, 10, 12, 40, 1024, 768)).toBeNull()
  })
})

describe('getVisibleRect', () => {
  it('uses the first non-empty client rect, not the bounding box', () => {
    // A link wrapped across two lines: the bounding box would span both,
    // covering the empty gap on the right of the first line.
    const link = withBoxes(el('a'), [
      { left: 400, top: 100, width: 120, height: 18 },
      { left: 10, top: 120, width: 60, height: 18 },
    ])
    document.body.appendChild(link)

    const rect = getVisibleRect(link)!
    expect(rect.left).toBe(400)
    expect(rect.top).toBe(100)
    expect(rect.width).toBe(120)
  })

  it('skips empty boxes and uses a later real one', () => {
    const link = withBoxes(el('a'), [
      { left: 0, top: 0, width: 0, height: 0 },
      { left: 30, top: 40, width: 50, height: 16 },
    ])
    document.body.appendChild(link)

    expect(getVisibleRect(link)!.left).toBe(30)
  })

  it('descends into a positioned child when every box is empty', () => {
    const wrapper = withBoxes(el('a'), [{ left: 0, top: 0, width: 0, height: 0 }])
    const child = withBox(el('span'), { left: 25, top: 35, width: 40, height: 40 })
    wrapper.appendChild(child)
    document.body.appendChild(wrapper)

    vi.mocked(window.getComputedStyle).mockImplementation(((node: Element) => ({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      cursor: 'auto',
      float: 'none',
      // The child is absolutely positioned, so it carries the real geometry.
      position: node === child ? 'absolute' : 'static',
      fontSize: '16px',
      lineHeight: '20px',
    })) as unknown as typeof window.getComputedStyle)

    const rect = getVisibleRect(wrapper)!
    expect(rect.left).toBe(25)
    expect(rect.height).toBe(40)
  })

  it('returns null for an element with no boxes at all', () => {
    const hidden = withBoxes(el('a'), [])
    document.body.appendChild(hidden)
    expect(getVisibleRect(hidden)).toBeNull()
  })

  it('returns null when the computed style hides the element', () => {
    const link = add(el('a'))
    vi.mocked(window.getComputedStyle).mockReturnValue({
      display: 'block', visibility: 'hidden', opacity: '1',
    } as CSSStyleDeclaration)

    expect(getVisibleRect(link)).toBeNull()
  })

  it('returns null for a fully transparent element', () => {
    const link = add(el('a'))
    vi.mocked(window.getComputedStyle).mockReturnValue({
      display: 'block', visibility: 'visible', opacity: '0',
    } as CSSStyleDeclaration)

    expect(getVisibleRect(link)).toBeNull()
  })
})

describe('getAreaRects', () => {
  it('maps rect, circle and poly areas to viewport boxes', () => {
    const img = withBox(el('img'), { left: 100, top: 50, width: 300, height: 200 }) as HTMLImageElement
    img.setAttribute('usemap', '#m')
    document.body.appendChild(img)

    const map = el('map', { name: 'm' })
    map.appendChild(el('area', { shape: 'rect', coords: '0,0,50,40', href: '#a' }))
    map.appendChild(el('area', { shape: 'circle', coords: '100,100,20', href: '#b' }))
    map.appendChild(el('area', { shape: 'poly', coords: '10,10,60,10,60,60,10,60', href: '#c' }))
    document.body.appendChild(map)

    const rects = getAreaRects(img)
    expect(rects).toHaveLength(3)
    // Offset by the image's own position.
    expect(rects[0].rect.left).toBe(100)
    expect(rects[0].rect.top).toBe(50)
    expect(rects[1].rect.left).toBe(180) // 100 + (100 - 20)
    expect(rects[2].rect.width).toBe(50)
  })

  it('returns nothing when the map is missing', () => {
    const img = withBox(el('img'), { left: 0, top: 0, width: 10, height: 10 }) as HTMLImageElement
    img.setAttribute('usemap', '#nope')
    document.body.appendChild(img)

    expect(getAreaRects(img)).toEqual([])
  })

  it('skips areas with unparseable coordinates', () => {
    const img = withBox(el('img'), { left: 0, top: 0, width: 100, height: 100 }) as HTMLImageElement
    img.setAttribute('usemap', '#m2')
    document.body.appendChild(img)

    const map = el('map', { name: 'm2' })
    map.appendChild(el('area', { shape: 'rect', coords: 'a,b,c,d' }))
    document.body.appendChild(map)

    expect(getAreaRects(img)).toEqual([])
  })
})

describe('isReachable', () => {
  const rect = { left: 10, top: 10, right: 110, bottom: 50, width: 100, height: 40 }

  it('fails open when the document cannot hit-test', () => {
    const link = add(el('a'))
    // jsdom returns null from elementFromPoint — we must keep the hint.
    expect(isReachable(link, rect)).toBe(true)
  })

  it('accepts the element itself', () => {
    const link = add(el('a'))
    document.elementFromPoint = () => link
    expect(isReachable(link, rect)).toBe(true)
  })

  it('accepts a descendant of the element', () => {
    const link = add(el('a'))
    const inner = el('span')
    link.appendChild(inner)
    document.elementFromPoint = () => inner
    expect(isReachable(link, rect)).toBe(true)
  })

  it('accepts an ancestor covering the element', () => {
    const wrapper = add(el('div'))
    const link = el('a')
    wrapper.appendChild(link)
    document.elementFromPoint = () => wrapper
    expect(isReachable(link, rect)).toBe(true)
  })

  it('rejects an unrelated element on top', () => {
    const link = add(el('a'))
    const overlay = add(el('div'))
    document.elementFromPoint = () => overlay
    expect(isReachable(link, rect)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

describe('findHintTargets', () => {
  it('finds standard controls', () => {
    add(el('a', { href: '#' }))
    add(el('button'))
    add(el('input', { type: 'text' }))
    add(el('select'))
    add(el('textarea'))

    expect(findHintTargets().length).toBe(5)
  })

  it('skips disabled controls and hidden inputs', () => {
    add(el('button', { disabled: '' }))
    add(el('input', { type: 'hidden' }))
    add(el('a', { href: '#' }))

    const targets = findHintTargets()
    expect(targets).toHaveLength(1)
    expect(targets[0].element.localName).toBe('a')
  })

  it('finds an element by its ARIA role', () => {
    add(el('div', { role: 'button' }))
    const targets = findHintTargets()
    expect(targets).toHaveLength(1)
    expect(targets[0].reason).toBe('attribute')
  })

  it('ignores an aria-disabled control', () => {
    add(el('div', { role: 'button', 'aria-disabled': 'true' }))
    expect(findHintTargets()).toHaveLength(0)
  })

  it('finds an element by its onclick attribute', () => {
    add(el('div', { onclick: 'doThing()' }))
    expect(findHintTargets()).toHaveLength(1)
  })

  it('finds an element by a clickable class name', () => {
    add(el('div', { class: 'toolbar-btn' }))
    const targets = findHintTargets()
    expect(targets).toHaveLength(1)
    expect(targets[0].reason).toBe('classname')
  })

  it('finds an element by tabindex', () => {
    add(el('div', { tabindex: '0' }))
    expect(findHintTargets()[0].reason).toBe('tabindex')

    document.body.innerHTML = ''
    add(el('div', { tabindex: '-1' }))
    expect(findHintTargets()).toHaveLength(0)
  })

  it('finds a div made clickable only by cursor: pointer', () => {
    const card = add(el('div'))
    vi.mocked(window.getComputedStyle).mockImplementation(((node: Element) => ({
      display: 'block', visibility: 'visible', opacity: '1',
      cursor: node === card ? 'pointer' : 'auto',
      float: 'none', position: 'static', fontSize: '16px', lineHeight: '20px',
      overflowX: 'visible', overflowY: 'visible',
    })) as unknown as typeof window.getComputedStyle)

    const targets = findHintTargets({ thorough: true })
    expect(targets).toHaveLength(1)
    expect(targets[0].reason).toBe('cursor')

    // Standard detection leaves it alone.
    expect(findHintTargets({ thorough: false })).toHaveLength(0)
  })

  it('collapses nested weak signals into the outermost hint', () => {
    const card = add(el('div', { class: 'card-link' }))
    const inner = withBox(el('span', { class: 'btn' }), { left: 12, top: 12, width: 40, height: 12 })
    card.appendChild(inner)

    const targets = findHintTargets()
    expect(targets).toHaveLength(1)
    expect(targets[0].element).toBe(card)
  })

  it('keeps a real link nested inside a clickable card', () => {
    const card = add(el('div', { class: 'card-link' }))
    const link = withBox(el('a', { href: '#' }), { left: 12, top: 12, width: 40, height: 12 })
    card.appendChild(link)

    const targets = findHintTargets()
    expect(targets.map((t) => t.element)).toContain(link)
    expect(targets).toHaveLength(2)
  })

  it('offers a scrollable container when asked', () => {
    const pane = add(el('div'), { left: 0, top: 0, width: 300, height: 400 })
    Object.defineProperty(pane, 'clientHeight', { value: 400, configurable: true })
    Object.defineProperty(pane, 'scrollHeight', { value: 2000, configurable: true })

    const targets = findHintTargets({ scrollables: true })
    expect(targets).toHaveLength(1)
    expect(targets[0].reason).toBe('scrollable')
    expect(targets[0].scrollAxis).toBe('y')

    expect(findHintTargets({ scrollables: false })).toHaveLength(0)
  })

  it('looks inside an open shadow root when enabled', () => {
    const host = add(el('div'))
    const shadow = host.attachShadow({ mode: 'open' })
    const inner = withBox(document.createElement('button'), { left: 5, top: 5, width: 50, height: 20 })
    shadow.appendChild(inner)

    expect(findHintTargets({ shadowDom: true }).map((t) => t.element)).toContain(inner)
    expect(findHintTargets({ shadowDom: false }).map((t) => t.element)).not.toContain(inner)
  })

  it('expands an image map into one target per area', () => {
    const img = withBox(el('img'), { left: 0, top: 0, width: 200, height: 100 }) as HTMLImageElement
    img.setAttribute('usemap', '#nav')
    document.body.appendChild(img)

    const map = el('map', { name: 'nav' })
    map.appendChild(el('area', { shape: 'rect', coords: '0,0,50,40', href: '#one' }))
    map.appendChild(el('area', { shape: 'rect', coords: '60,0,120,40', href: '#two' }))
    document.body.appendChild(map)

    const targets = findHintTargets()
    expect(targets).toHaveLength(2)
    expect(targets[0].area).toBeTruthy()
  })

  it('drops elements that are covered by something else', () => {
    const link = add(el('a', { href: '#' }))
    const overlay = add(el('div'))
    document.elementFromPoint = () => overlay

    expect(findHintTargets({ skipCovered: true }).map((t) => t.element)).not.toContain(link)
    expect(findHintTargets({ skipCovered: false }).map((t) => t.element)).toContain(link)
  })

  it('ignores elements scrolled out of the viewport', () => {
    add(el('a', { href: '#' }), { left: 10, top: 5000, width: 80, height: 20 })
    expect(findHintTargets()).toHaveLength(0)
  })

  it('never hints structural tags', () => {
    add(el('script'))
    add(el('style'))
    expect(findHintTargets()).toHaveLength(0)
  })
})
