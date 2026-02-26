import type { SiteShortcutData } from './types'
import { github } from './github'
import { gmail } from './gmail'
import { reddit } from './reddit'
import { youtube } from './youtube'
import { slack } from './slack'
import { notion } from './notion'
import { twitter } from './twitter'

export type { SiteShortcutData, SiteShortcut, SiteShortcutSection } from './types'

/** All known site shortcut databases. */
const ALL_SITES: SiteShortcutData[] = [
  github,
  gmail,
  reddit,
  youtube,
  slack,
  notion,
  twitter,
]

/**
 * Find matching site shortcut data for the given URL.
 * Returns the first match, or undefined if no match.
 */
export function getSiteShortcuts(url: string): SiteShortcutData | undefined {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return undefined
  }
  return ALL_SITES.find((site) =>
    site.hostPatterns.some((pattern) =>
      hostname === pattern || hostname.endsWith('.' + pattern),
    ),
  )
}
