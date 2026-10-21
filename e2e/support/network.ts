import path from 'node:path'
import fs from 'node:fs'
import type { BrowserContext, Route } from '@playwright/test'

const MDI = path.resolve('node_modules/@mdi/font')

/** Serve MDI icons locally and keep tests off the public network. */
export async function isolateNetwork(context: BrowserContext) {
  await context.route(/^https?:\/\//, (route: Route) => {
    const url = new URL(route.request().url())
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return route.continue()
    const mdi = url.pathname.match(/\/(css|fonts)\/(materialdesignicons[^/]*)$/)
    if (mdi) {
      const file = path.join(MDI, mdi[1], mdi[2])
      if (fs.existsSync(file)) return route.fulfill({ path: file })
    }
    if (url.hostname.endsWith('shortkeys.app')) {
      return route.fulfill({ contentType: 'text/html', body: '<title>Shortkeys</title>' })
    }
    return route.abort('blockedbyclient')
  })
}
