/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'

// Polyfill CSS.escape for jsdom (not available in jsdom)
if (typeof globalThis.CSS === 'undefined') {
  ;(globalThis as any).CSS = {
    escape: (value: string) => value.replace(/([\\#.:()[\]{}|!$%&*+,/;<=>?@^`~'"\s])/g, '\\$1'),
  }
}
import { generateSelector } from '../src/utils/css-selector'

describe('generateSelector', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('returns #id for element with unique ID', () => {
    document.body.innerHTML = '<div id="unique">Hello</div>'
    const el = document.getElementById('unique')!
    expect(generateSelector(el)).toBe('#unique')
  })

  it('escapes special characters in IDs', () => {
    document.body.innerHTML = '<div id="my.element">Hello</div>'
    const el = document.getElementById('my.element')!
    expect(generateSelector(el)).toBe('#my\\.element')
  })

  it('does not use ID if it is not unique on the page', () => {
    document.body.innerHTML = `
      <div id="dup">First</div>
      <div id="dup">Second</div>
    `
    const els = document.querySelectorAll('#dup')
    const selector = generateSelector(els[0])
    // Should not be just #dup since the ID is duplicated
    expect(selector).not.toBe('#dup')
    // But the selector should still uniquely match the element
    expect(document.querySelector(selector)).toBe(els[0])
  })

  it('builds a path with nth-of-type for siblings of the same tag', () => {
    document.body.innerHTML = `
      <ul>
        <li>First</li>
        <li>Second</li>
        <li>Third</li>
      </ul>
    `
    const secondLi = document.querySelectorAll('li')[1]
    const selector = generateSelector(secondLi)
    expect(selector).toContain('nth-of-type(2)')
    expect(document.querySelector(selector)).toBe(secondLi)
  })

  it('does not add nth-of-type when element is only child of its type', () => {
    document.body.innerHTML = '<div><span>Only</span></div>'
    const span = document.querySelector('span')!
    const selector = generateSelector(span)
    expect(selector).not.toContain('nth-of-type')
    expect(document.querySelector(selector)).toBe(span)
  })

  it('anchors to nearest ancestor with a unique ID', () => {
    document.body.innerHTML = `
      <div id="container">
        <div>
          <span class="target">Deep</span>
        </div>
      </div>
    `
    const span = document.querySelector('.target')!
    const selector = generateSelector(span)
    expect(selector).toMatch(/^#container > /)
    expect(document.querySelector(selector)).toBe(span)
  })

  it('falls back to body path when no IDs exist', () => {
    document.body.innerHTML = '<div><p>Hello</p></div>'
    const p = document.querySelector('p')!
    const selector = generateSelector(p)
    expect(selector).toMatch(/^body > /)
    expect(document.querySelector(selector)).toBe(p)
  })

  it('produces a selector that uniquely matches the original element in a complex DOM', () => {
    document.body.innerHTML = `
      <div>
        <ul>
          <li><a href="/a">Link A</a></li>
          <li><a href="/b">Link B</a></li>
          <li><a href="/c">Link C</a></li>
        </ul>
        <ul>
          <li><a href="/d">Link D</a></li>
          <li><a href="/e">Link E</a></li>
        </ul>
      </div>
    `
    const linkB = document.querySelectorAll('a')[1]
    const selector = generateSelector(linkB)
    expect(document.querySelector(selector)).toBe(linkB)
  })

  it('handles direct child of body', () => {
    document.body.innerHTML = '<button>Click me</button>'
    const btn = document.querySelector('button')!
    const selector = generateSelector(btn)
    expect(document.querySelector(selector)).toBe(btn)
  })

  it('handles deeply nested elements', () => {
    document.body.innerHTML = `
      <div>
        <div>
          <div>
            <div>
              <span>Deep</span>
            </div>
          </div>
        </div>
      </div>
    `
    const span = document.querySelector('span')!
    const selector = generateSelector(span)
    expect(document.querySelector(selector)).toBe(span)
  })

  it('correctly disambiguates mixed tag siblings', () => {
    document.body.innerHTML = `
      <div>
        <span>One</span>
        <p>Two</p>
        <span>Three</span>
      </div>
    `
    const secondSpan = document.querySelectorAll('span')[1]
    const selector = generateSelector(secondSpan)
    expect(selector).toContain('nth-of-type(2)')
    expect(document.querySelector(selector)).toBe(secondSpan)
  })
})
