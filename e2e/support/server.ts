import http from 'node:http'
import type { AddressInfo } from 'node:net'

const PAGES: Record<string, string> = {
  '/scroll': '<title>Scroll</title><body>Large page</body>',
  '/a': '<title>Page A</title><body><h1>A</h1><a id="to-b" href="/b">to b</a></body>',
  '/b': '<title>Page B</title><body><h1>B</h1></body>',
  '/links': '<title>Links</title><body><a href="/b">First link</a><br><a href="/a">Second link</a></body>',
  '/form':
    '<title>Form</title><body><input id="text"><textarea id="area"></textarea>' +
    '<div id="editable" contenteditable="true">edit</div><div id="box" role="textbox" tabindex="0">box</div></body>',
}

export interface TestServer {
  port: number
  /** URL on localhost. */
  url(path: string): string
  /** Same server on 127.0.0.1, used as a different "site" for site rules. */
  altUrl(path: string): string
  close(): Promise<void>
}

export async function startServer(): Promise<TestServer> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost')
    // Hosts an extension page in an iframe so WebDriver can drive it (see support/firefox.ts).
    const body = url.pathname === '/frame'
      ? `<body style="margin:0"><iframe id="frame" src="${url.searchParams.get('src')}" style="border:0;width:100vw;height:100vh"></iframe></body>`
      : PAGES[url.pathname]
    res.writeHead(body ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' })
    res.end(body ? `<!doctype html><meta charset="utf-8">${url.pathname === '/frame' ? '' : '<style>html{width:8000px;height:8000px}</style>'}${body}` : 'not found')
  })
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const { port } = server.address() as AddressInfo
  return {
    port,
    url: (p) => `http://localhost:${port}${p}`,
    altUrl: (p) => `http://127.0.0.1:${port}${p}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}
