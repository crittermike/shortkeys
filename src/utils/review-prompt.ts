/**
 * Review prompt state management.
 *
 * Tracks whether the user has been prompted to leave a review,
 * and whether they dismissed the prompt. Stored in browser.storage.local
 * (per-device, not synced — each device should prompt independently).
 */

import { browser } from 'wxt/browser'

const REVIEW_KEY = '__shortkeys_review_prompt'

export const REVIEW_URL =
  'https://chrome.google.com/webstore/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck/reviews'

export interface ReviewPromptState {
  /** User explicitly dismissed the prompt */
  dismissed: boolean
  /** Whether the milestone notification has been shown */
  notificationShown: boolean
  /** ISO date string (YYYY-MM-DD) of first install */
  installDate: string
}

function defaultState(): ReviewPromptState {
  return {
    dismissed: false,
    notificationShown: false,
    installDate: new Date().toISOString().slice(0, 10),
  }
}

export async function loadReviewPromptState(): Promise<ReviewPromptState> {
  try {
    const data = await browser.storage.local.get(REVIEW_KEY)
    if (data[REVIEW_KEY]) return JSON.parse(data[REVIEW_KEY] as string)
  } catch {
    // Ignore — return default
  }
  return defaultState()
}

export async function saveReviewPromptState(state: ReviewPromptState): Promise<void> {
  await browser.storage.local.set({ [REVIEW_KEY]: JSON.stringify(state) })
}

/** Call once on first install to record the install date. */
export async function initReviewPromptState(): Promise<void> {
  try {
    const data = await browser.storage.local.get(REVIEW_KEY)
    if (data[REVIEW_KEY]) return // Already initialised
  } catch {
    // Ignore
  }
  await saveReviewPromptState(defaultState())
}

/** Number of days since install. */
export function daysSinceInstall(state: ReviewPromptState): number {
  const install = new Date(state.installDate + 'T00:00:00')
  const now = new Date()
  return Math.floor((now.getTime() - install.getTime()) / 86_400_000)
}
