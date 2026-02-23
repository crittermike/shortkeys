/**
 * Resolve a userscript page URL to the raw code URL.
 * Handles Greasyfork, OpenUserJS, and raw .user.js URLs.
 */
export function resolveUserscriptUrl(url: string): string {
  const greasyforkMatch = url.match(/greasyfork\.org\/(?:[\w-]+\/)?scripts\/(\d+)/)
  if (greasyforkMatch) {
    return `https://greasyfork.org/scripts/${greasyforkMatch[1]}/code/script.user.js`
  }

  const openuserMatch = url.match(/openuserjs\.org\/scripts\/([^/]+)\/([^/]+)/)
  if (openuserMatch) {
    return `https://openuserjs.org/install/${openuserMatch[1]}/${openuserMatch[2]}.user.js`
  }

  return url
}

/**
 * Parse userscript text: extract the name and strip the metadata header.
 */
export function parseUserscript(text: string): { code: string; name: string } {
  const nameMatch = text.match(/@name\s+(.+)/)
  const name = nameMatch ? nameMatch[1].trim() : 'Imported userscript'
  const code = text.replace(/\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==\s*/, '').trim()
  return { code, name }
}
