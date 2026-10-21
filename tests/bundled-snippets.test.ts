// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { JS_SNIPPETS } from '../src/utils/js-snippets'

afterEach(() => {
  vi.restoreAllMocks()
  document.getElementById('__sk_darkmode')?.remove()
  document.body.innerHTML = ''
})

describe('packaged snippet functions', () => {
  it('runs bundled page tools without evaluating a code string', () => {
    vi.spyOn(globalThis, 'Function').mockImplementation(() => { throw new Error('Dynamic evaluation forbidden') })
    const snippet = JS_SNIPPETS.find(snippet => snippet.id === 'dark-mode')!
    snippet.run()
    expect(document.getElementById('__sk_darkmode')).not.toBeNull()
    snippet.run()
    expect(document.getElementById('__sk_darkmode')).toBeNull()
  })

  it('QR generation sends only the encoded current URL to its documented service', () => {
    JS_SNIPPETS.find(snippet => snippet.id === 'qr-code')!.run()
    const image = document.querySelector('img')!
    const request = new URL(image.src)
    expect(request.origin).toBe('https://api.qrserver.com')
    expect(request.searchParams.get('data')).toBe(location.href)
    image.click()
    expect(document.querySelector('img')).toBeNull()
  })

  it('renders JSON as text rather than interpreting page content as HTML', () => {
    document.body.innerText = JSON.stringify({ payload: '<img src=x onerror=alert(1)>' })
    JS_SNIPPETS.find(snippet => snippet.id === 'json-viewer')!.run()
    expect(document.querySelector('img')).toBeNull()
    expect(document.querySelector('pre')?.textContent).toContain('<img src=x onerror=alert(1)>')
  })
})
