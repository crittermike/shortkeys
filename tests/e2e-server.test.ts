import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startServer, type TestServer } from '../e2e/support/server'

describe('E2E iframe host', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await startServer()
  })

  afterAll(async () => {
    await server.close()
  })

  it.each([
    '"></iframe><script>window.__xss = true</script><iframe src="about:blank',
    'javascript:alert(document.domain)',
  ])('does not use an untrusted iframe source: %s', async (src) => {
    const response = await fetch(server.url(`/frame?src=${encodeURIComponent(src)}`))
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('src="moz-extension://5b0f2d4e-7a3c-4c1e-9f62-1d8a7e3b9c40/options.html"')
    expect(html).not.toContain(src)
  })

  it('hosts the fixed options page without a query parameter', async () => {
    const response = await fetch(server.url('/frame'))
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('src="moz-extension://5b0f2d4e-7a3c-4c1e-9f62-1d8a7e3b9c40/options.html"')
  })
})
