import { test as base, type BrowserContext } from '@playwright/test'
import { launchChrome, extensionIdOf, closeStartupTabs } from './support/chrome'
import { startServer, type TestServer } from './support/server'

export const test = base.extend<
  { context: BrowserContext; extensionId: string },
  { server: TestServer }
>({
  server: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const server = await startServer()
      await use(server)
      await server.close()
    },
    { scope: 'worker' },
  ],
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await launchChrome()
    await extensionIdOf(context)
    await closeStartupTabs(context)
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    await use(await extensionIdOf(context))
  },
})

export const expect = test.expect
