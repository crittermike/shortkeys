/** A single keyboard shortcut for a website. */
export interface SiteShortcut {
  /** Human-readable description of what this shortcut does. */
  description: string
  /** Key parts, e.g. ["Ctrl", "Enter"] or ["G", "I"] for sequences. */
  keys: string[]
}

/** A named group of related shortcuts. */
export interface SiteShortcutSection {
  name: string
  shortcuts: SiteShortcut[]
}

/** Keyboard shortcut data for a single website. */
export interface SiteShortcutData {
  /** Display name shown in the cheat sheet, e.g. "GitHub". */
  title: string
  /** URL to official keyboard shortcut documentation. */
  referenceUrl: string
  /** Hostname patterns to match against, e.g. ["github.com"]. */
  hostPatterns: string[]
  /** Grouped shortcut sections. */
  sections: SiteShortcutSection[]
}
