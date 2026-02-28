/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { activateLinkHints, deactivateLinkHints, isLinkHintModeActive, generateLabels } from '../src/utils/link-hints'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createClickableElement(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }
  // Give it a visible size (jsdom doesn't do layout, so we mock getBoundingClientRect)
  Object.defineProperty(el, 'offsetWidth', { value: 100, configurable: true })
  Object.defineProperty(el, 'offsetHeight', { value: 30, configurable: true })
  el.getBoundingClientRect = () => ({
    top: 10,
    left: 10,
    bottom: 40,
    right: 110,
    width: 100,
    height: 30,
    x: 10,
    y: 10,
    toJSON: () => {},
  })
  document.body.appendChild(el)
  return el
}

function pressKey(key: string, opts: Partial<KeyboardEventInit> = {}): void {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  })
  document.dispatchEvent(event)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('link-hints', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    // jsdom doesn't support getComputedStyle properly — mock it to return visible
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    } as CSSStyleDeclaration)
    // jsdom doesn't have innerHeight/innerWidth
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true })
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
  })

  afterEach(() => {
    deactivateLinkHints()
    vi.restoreAllMocks()
  })

  describe('generateLabels', () => {
    it('returns empty array for count 0', () => {
      expect(generateLabels(0)).toEqual([])
    })

    it('returns single char for count 1', () => {
      const labels = generateLabels(1)
      expect(labels).toHaveLength(1)
      expect(labels[0]).toHaveLength(1)
    })

    it('returns correct number of labels', () => {
      const labels = generateLabels(10)
      expect(labels).toHaveLength(10)
    })

    it('returns unique labels', () => {
      const labels = generateLabels(50)
      const unique = new Set(labels)
      expect(unique.size).toBe(50)
    })

    it('uses longer labels when count exceeds single-char capacity', () => {
      // HINT_CHARS has 14 chars, so >14 elements need 2-char labels
      const labels = generateLabels(20)
      expect(labels).toHaveLength(20)
      expect(labels[0].length).toBeGreaterThanOrEqual(2)
    })

    it('all labels are same length', () => {
      const labels = generateLabels(30)
      const lengths = new Set(labels.map(l => l.length))
      expect(lengths.size).toBe(1)
    })
  })

  describe('activateLinkHints', () => {
    it('creates hint overlays for clickable elements', () => {
      createClickableElement('a', { href: 'https://example.com' })
      createClickableElement('button')

      activateLinkHints(false)

      expect(isLinkHintModeActive()).toBe(true)
      const container = document.getElementById('__shortkeys-hint-container')
      expect(container).not.toBeNull()
      const hints = container!.querySelectorAll('.__shortkeys-hint-label')
      // We use className, check for the spans
      const spans = container!.querySelectorAll('span')
      expect(spans.length).toBe(2)
    })

    it('does nothing when no clickable elements exist', () => {
      activateLinkHints(false)
      expect(isLinkHintModeActive()).toBe(false)
    })

    it('toggles off if called while already active', () => {
      createClickableElement('a', { href: 'https://example.com' })

      activateLinkHints(false)
      expect(isLinkHintModeActive()).toBe(true)

      activateLinkHints(false)
      expect(isLinkHintModeActive()).toBe(false)
    })

    it('sets openInNewTab mode correctly', () => {
      createClickableElement('a', { href: 'https://example.com' })

      activateLinkHints(true)
      expect(isLinkHintModeActive()).toBe(true)
    })
  })

  describe('deactivateLinkHints', () => {
    it('removes the hint container from DOM', () => {
      createClickableElement('a', { href: 'https://example.com' })

      activateLinkHints(false)
      expect(document.getElementById('__shortkeys-hint-container')).not.toBeNull()

      deactivateLinkHints()
      expect(document.getElementById('__shortkeys-hint-container')).toBeNull()
    })

    it('is safe to call when not active', () => {
      expect(() => deactivateLinkHints()).not.toThrow()
    })
  })

  describe('keyboard interaction', () => {
    it('deactivates on Escape', () => {
      createClickableElement('a', { href: 'https://example.com' })

      activateLinkHints(false)
      expect(isLinkHintModeActive()).toBe(true)

      pressKey('Escape')
      expect(isLinkHintModeActive()).toBe(false)
    })

    it('deactivates on non-hint characters', () => {
      createClickableElement('a', { href: 'https://example.com' })

      activateLinkHints(false)
      expect(isLinkHintModeActive()).toBe(true)

      // 'Z' is not in HINT_CHARS 'SADFJKLEWCMPGH'
      pressKey('z')
      expect(isLinkHintModeActive()).toBe(false)
    })

    it('ignores modifier keys', () => {
      createClickableElement('a', { href: 'https://example.com' })

      activateLinkHints(false)
      expect(isLinkHintModeActive()).toBe(true)

      pressKey('Shift')
      expect(isLinkHintModeActive()).toBe(true)

      pressKey('Control')
      expect(isLinkHintModeActive()).toBe(true)
    })

    it('clicks the target element when hint is matched', () => {
      const link = createClickableElement('a', { href: 'https://example.com' })
      const clickSpy = vi.spyOn(link, 'click')
      const focusSpy = vi.spyOn(link, 'focus')

      activateLinkHints(false)

      // With only 1 element, the hint label is a single char (first of HINT_CHARS = 'S')
      pressKey('s')

      expect(isLinkHintModeActive()).toBe(false)
      expect(focusSpy).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
    })

    it('opens link in new tab when openInNewTab is true', () => {
      createClickableElement('a', { href: 'https://example.com' })
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      activateLinkHints(true)

      pressKey('s')

      expect(isLinkHintModeActive()).toBe(false)
      expect(openSpy).toHaveBeenCalledWith('https://example.com/', '_blank', 'noopener')
    })

    it('falls back to click when element has no href in new tab mode', () => {
      const btn = createClickableElement('button')
      const clickSpy = vi.spyOn(btn, 'click')

      activateLinkHints(true)

      pressKey('s')

      expect(isLinkHintModeActive()).toBe(false)
      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe('isLinkHintModeActive', () => {
    it('returns false when inactive', () => {
      expect(isLinkHintModeActive()).toBe(false)
    })

    it('returns true when active', () => {
      createClickableElement('a', { href: 'https://example.com' })
      activateLinkHints(false)
      expect(isLinkHintModeActive()).toBe(true)
    })
  })
})
