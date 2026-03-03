import { loadProfiles, loadActiveProfile } from '@/utils/storage'

/** Update the toolbar badge to show the active profile's emoji. Clears if no profile active. */
export async function updateProfileBadge(): Promise<void> {
  // action API may be undefined in test environments or Firefox MV2
  if (!chrome.action) return

  const activeId = await loadActiveProfile()
  if (!activeId) {
    await chrome.action.setBadgeText({ text: '' })
    return
  }

  const profiles = await loadProfiles()
  const profile = profiles.find(p => p.id === activeId)
  if (!profile) {
    await chrome.action.setBadgeText({ text: '' })
    return
  }

  // Show profile emoji as badge
  await chrome.action.setBadgeText({ text: profile.icon })
  await chrome.action.setBadgeBackgroundColor({ color: '#4f46e5' })
}
