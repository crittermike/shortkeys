import { describe, it, expect } from 'vitest'
import { resolveUserscriptUrl, parseUserscript } from '../src/utils/fetch-userscript'

describe('resolveUserscriptUrl', () => {
  it('converts Greasyfork page URL to code URL', () => {
    expect(resolveUserscriptUrl('https://greasyfork.org/en/scripts/479944-youtube-downloader'))
      .toBe('https://greasyfork.org/scripts/479944/code/script.user.js')
  })

  it('handles Greasyfork URL without language prefix', () => {
    expect(resolveUserscriptUrl('https://greasyfork.org/scripts/12345-my-script'))
      .toBe('https://greasyfork.org/scripts/12345/code/script.user.js')
  })

  it('handles Greasyfork URL with different languages', () => {
    expect(resolveUserscriptUrl('https://greasyfork.org/zh-CN/scripts/99999-test'))
      .toBe('https://greasyfork.org/scripts/99999/code/script.user.js')
  })

  it('converts OpenUserJS page URL to install URL', () => {
    expect(resolveUserscriptUrl('https://openuserjs.org/scripts/user/My_Script'))
      .toBe('https://openuserjs.org/install/user/My_Script.user.js')
  })

  it('passes through direct .user.js URLs unchanged', () => {
    expect(resolveUserscriptUrl('https://example.com/script.user.js'))
      .toBe('https://example.com/script.user.js')
  })

  it('passes through raw GitHub URLs unchanged', () => {
    expect(resolveUserscriptUrl('https://raw.githubusercontent.com/user/repo/main/script.user.js'))
      .toBe('https://raw.githubusercontent.com/user/repo/main/script.user.js')
  })
})

describe('parseUserscript', () => {
  it('extracts name from metadata', () => {
    const text = `// ==UserScript==
// @name        My Cool Script
// @version     1.0
// @description Does cool things
// ==/UserScript==
console.log("hello");`
    const result = parseUserscript(text)
    expect(result.name).toBe('My Cool Script')
    expect(result.code).toBe('console.log("hello");')
  })

  it('strips metadata header from code', () => {
    const text = `// ==UserScript==
// @name Test
// @match *://*/*
// ==/UserScript==

function doStuff() {
  return 42;
}
doStuff();`
    const result = parseUserscript(text)
    expect(result.code).not.toContain('==UserScript==')
    expect(result.code).toContain('function doStuff()') 
  })

  it('handles script with no metadata header', () => {
    const text = 'alert("no header");'
    const result = parseUserscript(text)
    expect(result.name).toBe('Imported userscript')
    expect(result.code).toBe('alert("no header");')
  })

  it('handles empty script', () => {
    const result = parseUserscript('')
    expect(result.name).toBe('Imported userscript')
    expect(result.code).toBe('')
  })

  it('extracts name with special characters', () => {
    const text = `// ==UserScript==
// @name        YouTube™ Enhancer (v2.0)
// ==/UserScript==
void 0;`
    const result = parseUserscript(text)
    expect(result.name).toBe('YouTube™ Enhancer (v2.0)')
  })
})
