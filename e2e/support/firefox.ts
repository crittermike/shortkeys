import { Builder, By, Key, until, type WebDriver, type WebElement } from 'selenium-webdriver'
import firefox from 'selenium-webdriver/firefox.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, type TestInfo } from '@playwright/test'
import { FIREFOX_UUID, type TestServer } from './server'
import type { KeySetting, GroupSettings } from '../../src/utils/url-matching'

export const FIREFOX_BUILD = path.resolve('.output/firefox-mv3')
export const FIREFOX_ID = 'Shortkeys@Shortkeys.com'
const MIN_FIREFOX = 153

/**
 * Marionette can't drive moz-extension:// tabs, so the test copy of the build
 * marks extension pages web-accessible and tests load them in an iframe on the
 * local test server. Nothing else in the build changes.
 */
export function prepareTestCopy(source = FIREFOX_BUILD) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shortkeys-ff-'))
  fs.cpSync(source, dir, { recursive: true })
  const manifestPath = path.join(dir, 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  manifest.web_accessible_resources = [
    ...(manifest.web_accessible_resources || []),
    { resources: ['*.html'], matches: ['http://localhost/*', 'http://127.0.0.1/*'] },
  ]
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  return dir
}

export async function launchFirefox(testInfo: TestInfo): Promise<firefox.Driver> {
  const options = new firefox.Options()
  if (!process.env.HEADED) options.addArguments('-headless')
  if (process.env.FIREFOX_BIN) options.setBinary(process.env.FIREFOX_BIN)
  else options.setBrowserVersion('stable')
  options.setPreference('extensions.webextensions.uuids', JSON.stringify({ [FIREFOX_ID]: FIREFOX_UUID }))
  // Keep tests off the public network; only the local test server is reachable.
  options.setPreference('network.proxy.type', 1)
  options.setPreference('network.proxy.http', '127.0.0.1')
  options.setPreference('network.proxy.http_port', 9)
  options.setPreference('network.proxy.ssl', '127.0.0.1')
  options.setPreference('network.proxy.ssl_port', 9)
  options.setPreference('network.proxy.no_proxies_on', 'localhost,127.0.0.1')
  options.setPreference('network.proxy.allow_hijacking_localhost', false)
  const service = new firefox.ServiceBuilder().setStdio(['ignore', 'pipe', 'pipe'])
  const driver = (await new Builder().forBrowser('firefox').setFirefoxOptions(options).setFirefoxService(service).build()) as firefox.Driver
  const version = Number(String((await driver.getCapabilities()).get('browserVersion')).split('.')[0])
  testInfo.annotations.push({ type: 'firefox', description: String(version) })
  if (version < MIN_FIREFOX) {
    await driver.quit()
    throw new Error(`Firefox ${version} is older than the ${MIN_FIREFOX} minimum`)
  }
  return driver
}

export async function installExtension(driver: firefox.Driver, dir: string) {
  const original = await driver.getWindowHandle()
  await driver.installAddon(dir, true)
  // Wait for options itself; Firefox may block the welcome tab before it is created.
  await driver.wait(async () => {
    for (const handle of await driver.getAllWindowHandles()) {
      await driver.switchTo().window(handle)
      if ((await driver.getCurrentUrl()) === `moz-extension://${FIREFOX_UUID}/options.html`) return true
    }
    return false
  }, 10_000, 'options page did not open on install')
  for (const handle of await driver.getAllWindowHandles()) {
    if (handle === original) continue
    await driver.switchTo().window(handle)
    await driver.close()
  }
  await driver.switchTo().window(original)
}

export class FirefoxExtension {
  constructor(public driver: WebDriver, public server: TestServer) {}

  optionsUrl() {
    return this.server.url('/frame')
  }

  /** Load options in the iframe host and switch into it. */
  async openOptions() {
    await this.driver.get(this.optionsUrl())
    const frame = await this.driver.wait(until.elementLocated(By.id('frame')), 10_000, 'options frame host did not load')
    await this.driver.switchTo().frame(frame)
    await this.driver.executeScript("localStorage.setItem('shortkeys-onboarding-done', 'true')")
    await this.driver.navigate().refresh()
    await this.driver.switchTo().defaultContent()
    await this.driver.switchTo().frame(await this.driver.findElement(By.id('frame')))
    await this.driver.wait(until.elementLocated(By.css('.brand-text')), 10_000, 'options page did not render in frame')
  }

  /** Run an async snippet with the extension's storage API (must be inside the options frame). */
  async inExtension<T>(body: string, ...args: unknown[]): Promise<T> {
    return this.driver.executeAsyncScript(
      `const done = arguments[arguments.length - 1];
       (async (...args) => { ${body} })(...Array.from(arguments).slice(0, -1)).then(done, (e) => done({ error: String(e) }))`,
      ...args,
    )
  }

  async seed(keys: KeySetting[], groups: Record<string, GroupSettings> = {}) {
    await this.openOptions()
    await this.inExtension(
      `await browser.storage.sync.clear(); await browser.storage.local.clear();
       await browser.storage.local.set({ keys: JSON.stringify(args[0]), groupSettings: JSON.stringify(args[1]) })`,
      keys, groups,
    )
    await this.openOptions()
  }

  async css(selector: string, root?: WebElement) {
    return (root ?? this.driver).findElement(By.css(selector))
  }

  async click(selector: string, text?: string) {
    const el = await this.driver.wait(async () => {
      for (const candidate of await this.driver.findElements(By.css(selector))) {
        if (!text || (await candidate.getText()).includes(text)) {
          if (await candidate.isDisplayed()) return candidate
        }
      }
      return null
    }, 10_000, `No visible ${selector} ${text ?? ''}`)
    await el!.click()
  }

  async addShortcut(key: string, action: string) {
    const empty = await this.driver.findElements(By.css('.empty-state .btn-primary'))
    if (empty.length) await empty[0].click()
    else await this.click('.stats-actions .btn-sm', 'Add shortcut')
    const cards = await this.driver.findElements(By.css('.shortcut-card'))
    const card = cards[cards.length - 1]
    const input = await card.findElement(By.css('.shortcut-input'))
    await input.clear()
    await input.sendKeys(key)
    await (await card.findElement(By.css('.ss-trigger'))).click()
    await (await this.css('.ss-search')).sendKeys(action)
    await this.click('.ss-option', action)
    return card
  }

  async openDetails(card: WebElement) {
    for (const cog of await card.findElements(By.css('button[title="Settings"]'))) await cog.click()
    await this.driver.wait(until.elementLocated(By.css('.shortcut-details')), 10_000, 'details did not open')
  }

  async save() {
    await this.click('.btn-primary', 'Save shortcuts')
    await this.driver.wait(until.elementLocated(By.css('.toast')), 10_000, 'no save toast')
    await this.driver.wait(
      async () => (await this.driver.findElements(By.xpath("//button[contains(., 'Save shortcuts')]"))).length === 0,
      10_000, 'save button still visible')
  }

  async openPage(url: string) {
    await this.driver.switchTo().newWindow('tab')
    await this.driver.get(url)
    await this.waitForBindings()
  }

  scroll() {
    return this.driver.executeScript<{ x: number; y: number }>('return { x: scrollX, y: scrollY }')
  }

  async press(...keys: string[]) {
    await this.driver.actions().sendKeys(...keys).perform()
  }

  async chord(modifier: string, key: string) {
    await this.driver.actions().keyDown(modifier).sendKeys(key).keyUp(modifier).perform()
  }

  async waitForBindings() {
    await expect.poll(async () => {
      await this.press('l')
      return (await this.scroll()).x
    }).toBeGreaterThan(0)
    await this.driver.executeScript('scrollTo(0, 0)')
  }

  async flush() {
    const before = (await this.scroll()).x
    await this.press('l')
    await expect.poll(async () => (await this.scroll()).x).toBeGreaterThan(before)
  }

  async attachFailureArtifacts(testInfo: TestInfo) {
    if (testInfo.status === testInfo.expectedStatus) return
    for (const handle of await this.driver.getAllWindowHandles().catch(() => [])) {
      try {
        await this.driver.switchTo().window(handle)
        const url = await this.driver.getCurrentUrl()
        await testInfo.attach(`screenshot ${url}`, {
          body: Buffer.from(await this.driver.takeScreenshot(), 'base64'),
          contentType: 'image/png',
        })
      } catch { /* window may be privileged or already closed */ }
    }
  }
}

export { Key }
