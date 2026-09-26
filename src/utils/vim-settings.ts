/**
 * Global settings for the Vim-style navigation features (link hints and
 * scrolling).
 *
 * The option names and defaults follow Vimium-C so users coming from it find
 * the behaviour they expect. See NOTICE.md for attribution.
 *
 * These are global preferences, not per-shortcut ones. A shortcut may still
 * override a few of them (`hintChars`, `smoothScrolling`) via its own fields.
 */

/** How the user picks a hint. */
export type HintMode = 'chars' | 'filter'

/** How hard we look for clickable elements. */
export type HintDetection = 'standard' | 'thorough'

export interface VimSettings {
  // --- Link hints ---
  /** Characters used to build hint labels in `chars` mode. */
  hintChars: string
  /** `chars` types the label; `filter` types the link text and picks by number. */
  hintMode: HintMode
  /** In `filter` mode, require Enter before activating the single match. */
  hintWaitForEnter: boolean
  /** `thorough` also inspects computed styles to find custom clickable elements. */
  hintDetection: HintDetection
  /** Look inside open shadow roots (web components). */
  hintShadowDom: boolean
  /** Offer scrollable containers as hint targets. */
  hintScrollables: boolean
  /** Drop elements that another element covers. */
  hintSkipCovered: boolean

  // --- Scrolling ---
  /** Animate scrolling instead of jumping. */
  smoothScroll: boolean
  /** Pixels for a normal scroll step. */
  scrollStepSize: number
  /** Pixels for the "more" scroll actions. */
  scrollBigStepSize: number
  /** Animation duration in ms for a single step (larger jumps scale up). */
  scrollDuration: number
}

/**
 * Defaults. `hintChars`, `scrollStepSize` and `smoothScroll` match Vimium-C's
 * own defaults; the rest are Shortkeys' previous behaviour where Vimium-C has
 * no equivalent.
 */
export const DEFAULT_VIM_SETTINGS: VimSettings = {
  hintChars: 'sadfjklewcmpgh',
  hintMode: 'chars',
  hintWaitForEnter: true,
  hintDetection: 'thorough',
  hintShadowDom: true,
  hintScrollables: true,
  hintSkipCovered: true,

  smoothScroll: true,
  scrollStepSize: 100,
  scrollBigStepSize: 500,
  scrollDuration: 120,
}

/** Bounds for the numeric settings, also used by the options UI. */
export const VIM_LIMITS = {
  scrollStepSize: { min: 1, max: 2000 },
  scrollBigStepSize: { min: 1, max: 5000 },
  scrollDuration: { min: 0, max: 1000 },
} as const

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  if (!isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/**
 * Merge stored (possibly partial or corrupt) settings over the defaults.
 * Never throws — anything unusable falls back to its default.
 */
export function normalizeVimSettings(raw: unknown): VimSettings {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<VimSettings>
  const d = DEFAULT_VIM_SETTINGS

  return {
    hintChars: typeof input.hintChars === 'string' && input.hintChars.trim()
      ? input.hintChars
      : d.hintChars,
    hintMode: input.hintMode === 'filter' ? 'filter' : 'chars',
    hintWaitForEnter: asBoolean(input.hintWaitForEnter, d.hintWaitForEnter),
    hintDetection: input.hintDetection === 'standard' ? 'standard' : 'thorough',
    hintShadowDom: asBoolean(input.hintShadowDom, d.hintShadowDom),
    hintScrollables: asBoolean(input.hintScrollables, d.hintScrollables),
    hintSkipCovered: asBoolean(input.hintSkipCovered, d.hintSkipCovered),

    smoothScroll: asBoolean(input.smoothScroll, d.smoothScroll),
    scrollStepSize: clampNumber(
      input.scrollStepSize, d.scrollStepSize,
      VIM_LIMITS.scrollStepSize.min, VIM_LIMITS.scrollStepSize.max,
    ),
    scrollBigStepSize: clampNumber(
      input.scrollBigStepSize, d.scrollBigStepSize,
      VIM_LIMITS.scrollBigStepSize.min, VIM_LIMITS.scrollBigStepSize.max,
    ),
    scrollDuration: clampNumber(
      input.scrollDuration, d.scrollDuration,
      VIM_LIMITS.scrollDuration.min, VIM_LIMITS.scrollDuration.max,
    ),
  }
}

/** True when the settings differ from the shipped defaults. */
export function isCustomized(settings: VimSettings): boolean {
  return (Object.keys(DEFAULT_VIM_SETTINGS) as Array<keyof VimSettings>)
    .some((key) => settings[key] !== DEFAULT_VIM_SETTINGS[key])
}
