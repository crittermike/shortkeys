import { test as base } from '@playwright/test'
import fs from 'node:fs'
import { startServer, type TestServer } from '../support/server'
import { prepareTestCopy, launchFirefox, installExtension, FirefoxExtension } from '../support/firefox'

export const test = base.extend<{ ff: FirefoxExtension }, { server: TestServer; extensionDir: string }>({
  server: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const server = await startServer()
      await use(server)
      await server.close()
    },
    { scope: 'worker' },
  ],
  extensionDir: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const dir = prepareTestCopy()
      await use(dir)
      fs.rmSync(dir, { recursive: true, force: true })
    },
    { scope: 'worker' },
  ],
  ff: async ({ server, extensionDir }, use, testInfo) => {
    const driver = await launchFirefox(testInfo)
    const ff = new FirefoxExtension(driver, server)
    try {
      await installExtension(driver, extensionDir)
      await use(ff)
    } finally {
      await ff.attachFailureArtifacts(testInfo)
      await driver.quit()
    }
  },
})

export const expect = test.expect
