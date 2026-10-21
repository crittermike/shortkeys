import { chromium, expect, type BrowserContext, type Worker } from '@playwright/test'
import path from 'node:path'
import { isolateNetwork } from './network'

export const CHROME_BUILD = path.resolve('.output/chrome-mv3')

export async function launchChrome(extensionPath = CHROME_BUILD, userDataDir = ''): Promise<BrowserContext> {
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--headless=new',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--disable-default-apps',
    ],
  })
  await isolateNetwork(context)
  return context
}

export async function serviceWorker(context: BrowserContext): Promise<Worker> {
  return context.serviceWorkers()[0] ?? context.waitForEvent('serviceworker')
}

export async function extensionIdOf(context: BrowserContext) {
  return (await serviceWorker(context)).url().split('/')[2]
}

/**
 * Wait for the tabs the extension opens on startup, then close everything so tests start clean.
 * Chrome reports a changed unpacked extension loaded at startup as a fresh install, so upgrades use 'install'.
 */
export async function closeStartupTabs(context: BrowserContext, reason: 'install' | 'restart' = 'install') {
  const worker = await serviceWorker(context)
  if (reason !== 'restart') {
    await expect.poll(() => worker.evaluate(async () => {
      const urls = (await chrome.tabs.query({})).map((t) => t.url || t.pendingUrl || '')
      return {
        welcome: urls.some((u) => u.includes('shortkeys.app/welcome')),
        options: urls.some((u) => u.startsWith(chrome.runtime.getURL('options.html'))),
      }
    }), { message: `startup tabs after ${reason}`, timeout: 10_000 }).toEqual({ welcome: true, options: true })
  }
  const blank = await context.newPage()
  await worker.evaluate(async () => {
    const tabs = await chrome.tabs.query({})
    await chrome.tabs.remove(tabs.filter((t) => (t.url || t.pendingUrl) !== 'about:blank').map((t) => t.id!))
  })
  for (const p of context.pages()) if (p !== blank) await p.close().catch(() => {})
  await blank.close()
}
