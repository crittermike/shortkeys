// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'

const welcome = readFileSync(resolve('site/src/pages/welcome.astro'), 'utf8')
const script = welcome.match(/<script is:inline>([\s\S]*?)<\/script>/)![1]

afterEach(() => vi.restoreAllMocks())

it.each([
  ['Mozilla/5.0 Firefox/158.0', true],
  ['Mozilla/5.0 Chrome/145.0.0.0 Safari/537.36', false],
])('shows working settings guidance for %s', (userAgent, firefox) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  document.body.innerHTML = welcome
  new Function(script)()

  const links = document.querySelectorAll<HTMLAnchorElement>('[data-settings-link]')
  expect(links).toHaveLength(firefox ? 0 : 2)
  for (const link of links) {
    expect(link.href).toBe('chrome-extension://logpjaacgmcbpdkdchjiaagddngobkck/options.html')
  }
  const hints = document.querySelectorAll<HTMLElement>('[data-firefox-settings]')
  expect(hints).toHaveLength(2)
  for (const hint of hints) {
    expect(hint.hidden).toBe(!firefox)
    expect(hint.textContent).toContain('about:addons')
    expect(hint.textContent).toContain('Preferences')
  }
  expect(document.querySelector('.cta-hint') === null).toBe(firefox)
})
