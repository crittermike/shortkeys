/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'

// Polyfill CSS.escape for jsdom (not available in jsdom)
if (typeof globalThis.CSS === 'undefined') {
  ;(globalThis as any).CSS = {
    escape: (value: string) => value.replace(/([\\\-#.:()[\]{}|!$%&*+,/;<=>?@^`~'"\s])/g, '\\$1'),
  }
}
import { generateClickCode } from '../src/utils/css-selector'

describe('generateClickCode', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('uses getElementById for element with unique ID', () => {
    document.body.innerHTML = '<div id="unique">Hello</div>'
    const el = document.getElementById('unique')!
    const { code } = generateClickCode(el)
    expect(code).toContain("getElementById('unique')")
  })

  it('escapes special characters in IDs', () => {
    document.body.innerHTML = '<div id="my.element">Hello</div>'
    const el = document.getElementById('my.element')!
    const { code } = generateClickCode(el)
    expect(code).toContain("getElementById('my.element')")
  })

  it('uses href for links with unique href', () => {
    document.body.innerHTML = `
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    `
    const link = document.querySelector('a[href="/about"]')!
    const { code, label } = generateClickCode(link)
    expect(code).toContain("/about")
    expect(code).toContain("querySelector")
    expect(label).toContain('About')
  })

  it('uses aria-label when unique', () => {
    document.body.innerHTML = `
      <button aria-label="Close dialog">X</button>
      <button>OK</button>
    `
    const btn = document.querySelector('[aria-label="Close dialog"]')!
    const { code } = generateClickCode(btn)
    expect(code).toContain("aria-label")
    expect(code).toContain("Close dialog")
  })

  it('uses text content for buttons with unique text', () => {
    document.body.innerHTML = `
      <button>Submit</button>
      <button>Cancel</button>
    `
    const btn = document.querySelectorAll('button')[0]
    const { code, label } = generateClickCode(btn)
    expect(code).toContain("textContent")
    expect(code).toContain("Submit")
    expect(label).toContain('Submit')
  })

  it('uses text content for links when href is not unique', () => {
    document.body.innerHTML = `
      <a href="#">First</a>
      <a href="#">Second</a>
    `
    const link = document.querySelectorAll('a')[0]
    const { code } = generateClickCode(link)
    // href="#" is shared, so it should fall back to text matching
    expect(code).toContain("textContent")
    expect(code).toContain("First")
  })

  it('falls back to CSS selector path for elements without semantic identifiers', () => {
    document.body.innerHTML = `
      <div>
        <div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    `
    const target = document.querySelectorAll('div > div > div')[1]
    const { code } = generateClickCode(target)
    // Should use querySelector with a path-based selector
    expect(code).toContain("querySelector")
    expect(code).toContain("nth-of-type")
  })

  it('prefers ID over text content', () => {
    document.body.innerHTML = '<button id="submit-btn">Submit</button>'
    const btn = document.querySelector('#submit-btn')!
    const { code } = generateClickCode(btn)
    expect(code).toContain("getElementById")
    expect(code).not.toContain("textContent")
  })

  it('prefers href over text content for links', () => {
    document.body.innerHTML = '<a href="/unique-page">Click here</a>'
    const link = document.querySelector('a')!
    const { code } = generateClickCode(link)
    expect(code).toContain("/unique-page")
    expect(code).not.toContain("textContent")
  })

  it('generates a label from text content', () => {
    document.body.innerHTML = '<button>Save Changes</button>'
    const btn = document.querySelector('button')!
    const { label } = generateClickCode(btn)
    expect(label).toContain('Save Changes')
  })

  it('truncates long text in labels', () => {
    document.body.innerHTML = `<span>${'A'.repeat(60)}</span>`
    const span = document.querySelector('span')!
    const { label } = generateClickCode(span)
    expect(label).toContain('…')
    expect(label.length).toBeLessThan(80)
  })

  it('provides a tag-based label when no text exists', () => {
    document.body.innerHTML = '<div id="empty"></div>'
    const el = document.querySelector('#empty')!
    const { label } = generateClickCode(el)
    expect(label).toContain('div element')
  })

  it('handles complex DOM with links by href', () => {
    document.body.innerHTML = `
      <nav>
        <a href="/home">Home</a>
        <a href="/products">Products</a>
        <a href="/about">About</a>
      </nav>
    `
    const productsLink = document.querySelector('a[href="/products"]')!
    const { code } = generateClickCode(productsLink)
    expect(code).toContain("/products")
    // Evaluating the code should click the right element
    expect(code).toContain("click()")
  })
})
