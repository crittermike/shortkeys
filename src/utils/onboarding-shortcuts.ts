import type { KeySetting } from './url-matching'

export type OnboardingShortcut = Pick<KeySetting, 'key' | 'action' | 'code' | 'blacklist' | 'activeInInputs' | 'sites'>

export function createOnboardingShortcutDraft(action: string): OnboardingShortcut {
  return {
    key: '',
    action,
    code: '',
    blacklist: false,
    activeInInputs: false,
    sites: '',
  }
}

export function reconcileOnboardingShortcutDrafts(
  selectedActions: string[],
  existingDrafts: Record<string, OnboardingShortcut>,
): Record<string, OnboardingShortcut> {
  return Object.fromEntries(
    selectedActions.map(actionId => [
      actionId,
      existingDrafts[actionId]
        ? { ...existingDrafts[actionId] }
        : createOnboardingShortcutDraft(actionId),
    ]),
  )
}

export function filterOnboardingRecords<T extends { actionId: string }>(
  selectedActions: string[],
  records: T[],
): T[] {
  return records.filter(record => selectedActions.includes(record.actionId))
}

export function canContinueOnboardingShortcut(shortcut: OnboardingShortcut | null | undefined): boolean {
  if (!shortcut?.key?.trim()) return false
  if (shortcut.action === 'javascript' && !shortcut.code?.trim()) return false
  return true
}

export function shouldShowOnboardingSitePatterns(shortcut: OnboardingShortcut | null | undefined): boolean {
  return !!shortcut?.blacklist && shortcut.blacklist !== 'false'
}

export function finalizeOnboardingShortcut(shortcut: OnboardingShortcut): OnboardingShortcut {
  const finalized: OnboardingShortcut = {
    key: shortcut.key.trim(),
    action: shortcut.action,
  }

  if (shortcut.action === 'javascript') {
    finalized.code = shortcut.code || ''
  }

  if (shortcut.activeInInputs) {
    finalized.activeInInputs = true
  }

  if (shouldShowOnboardingSitePatterns(shortcut)) {
    finalized.blacklist = shortcut.blacklist
    finalized.sites = shortcut.sites || ''
  }

  return finalized
}
