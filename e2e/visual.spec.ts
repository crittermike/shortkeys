import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { seedChrome } from './support/keys'
import type { KeySetting } from '../src/utils/url-matching'

// Pixel baselines are rendered in the Linux Playwright image (see npm run test:visual:update),
// so screenshots are only compared on Linux. Layout assertions run everywhere.
const comparePixels = process.platform === 'linux'

const SHORTCUTS: KeySetting[] = [
  { id: 'v1', key: 'j', action: 'scrolldown', label: 'Scroll down' },
  { id: 'v2', key: 'ctrl+shift+k', action: 'closetab', label: 'Close tab' },
  { id: 'v3', key: 'g g', action: 'top', label: 'A long label that should be truncated rather than pushing the shortcut input out of line' },
  { id: 'v4', key: 'alt+n', action: 'newtab', label: 'Disabled shortcut', enabled: false },
  { id: 'v5', key: 'ctrl+alt+r', action: 'reload', label: 'Reload on work sites', group: 'Work', blacklist: 'whitelist', sites: '*example.com*', sitesArray: ['*example.com*'] },
  { id: 'v6', key: 'shift+y', action: 'copyurl', label: 'Copy URL', group: 'Work' },
]

async function openStyledOptions(page: Page, extensionId: string, theme: string, density: string) {
  await page.addInitScript(([t, d]) => {
    localStorage.setItem('shortkeys-onboarding-done', 'true')
    localStorage.setItem('shortkeys-theme', t)
    localStorage.setItem('shortkeys-view-density', d)
  }, [theme, density])
  await page.goto(`chrome-extension://${extensionId}/options.html`)
  await expect(page.locator('.shortcut-card')).toHaveCount(SHORTCUTS.length)
  await expect(page.locator('html')).toHaveAttribute('data-density', density)
  await page.evaluate(() => document.fonts.ready)
}

/** Every card's title, key and action columns line up, and nothing overflows the page horizontally. */
async function expectCleanLayout(page: Page) {
  const report = await page.evaluate(() => {
    const doc = document.documentElement
    // Where the text starts: the box edge plus its left padding and border.
    const textLeft = (el: Element | null) => {
      if (!el) return null
      const style = getComputedStyle(el)
      return Math.round(el.getBoundingClientRect().left + parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth))
    }
    const boxLeft = (el: Element | null) => (el ? Math.round(el.getBoundingClientRect().left) : null)
    const cards = [...document.querySelectorAll('.shortcut-card')].map((card) => {
      const rect = card.getBoundingClientRect()
      const overflowing = [...card.querySelectorAll('*')].filter((el) => {
        const r = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        if (!r.width || style.opacity === '0' || style.visibility === 'hidden') return false
        const contentLeft = r.left + parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth)
        const contentRight = r.right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth)
        return contentRight > rect.right + 1 || contentLeft < rect.left - 1
      }).map((el) => el.className)
      return {
        titleLeft: textLeft(card.querySelector('.shortcut-label-title')),
        inputLeft: boxLeft(card.querySelector('.shortcut-input')),
        overflowing,
      }
    })
    return { pageOverflow: doc.scrollWidth - doc.clientWidth, cards }
  })
  expect(report.pageOverflow, 'horizontal page overflow').toBeLessThanOrEqual(0)
  for (const card of report.cards) {
    expect(card.overflowing, 'elements escaping their card').toEqual([])
    expect(card.inputLeft, 'card title and shortcut input share a left edge').toBe(card.titleLeft)
  }
  const inputLefts = new Set(report.cards.map((c) => c.inputLeft))
  expect(inputLefts.size, 'shortcut inputs line up across cards').toBe(1)
}

test.beforeEach(async ({ context }) => {
  await seedChrome(context, SHORTCUTS)
})

for (const width of [1280, 900, 600]) {
  test(`options layout stays aligned at ${width}px`, async ({ context, extensionId }) => {
    for (const density of ['comfortable', 'condensed']) {
      const page = await context.newPage()
      try {
        await page.setViewportSize({ width, height: 900 })
        await openStyledOptions(page, extensionId, 'light', density)
        await expectCleanLayout(page)
      } finally {
        await page.close()
      }
    }
  })
}

for (const theme of ['light', 'dark']) {
  for (const density of ['comfortable', 'condensed']) {
    test(`options page looks right: ${theme}, ${density}`, async ({ context, extensionId }) => {
      test.skip(!comparePixels, 'pixel baselines are Linux-only')
      const page = await context.newPage()
      await page.setViewportSize({ width: 1280, height: 900 })
      await openStyledOptions(page, extensionId, theme, density)
      await expect(page).toHaveScreenshot(`options-${theme}-${density}.png`, { fullPage: true })
    })
  }
}

test('options page looks right at a narrow width', async ({ context, extensionId }) => {
  test.skip(!comparePixels, 'pixel baselines are Linux-only')
  const page = await context.newPage()
  await page.setViewportSize({ width: 600, height: 900 })
  await openStyledOptions(page, extensionId, 'light', 'comfortable')
  await expect(page).toHaveScreenshot('options-narrow.png', { fullPage: true })
})

test('popup looks right', async ({ context, extensionId }) => {
  const page = await context.newPage()
  await page.setViewportSize({ width: 360, height: 520 })
  await page.goto(`chrome-extension://${extensionId}/popup.html`)
  await expect(page.locator('.popup')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  if (comparePixels) await expect(page).toHaveScreenshot('popup.png')
})
