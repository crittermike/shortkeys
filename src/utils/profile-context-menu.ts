import { loadKeys, saveKeys, loadProfiles, loadActiveProfile, saveActiveProfile } from '@/utils/storage'

export const PROFILE_MENU_PARENT = 'shortkeys-profiles'
export const PROFILE_MENU_CLEAR = 'shortkeys-profile-clear'

/** Build (or rebuild) the profile context menu under the extension icon. */
export async function buildProfileContextMenu(): Promise<void> {
  // contextMenus may be undefined in test environments or Firefox MV2
  if (!chrome.contextMenus) return

  // Remove all existing menu items and rebuild
  await chrome.contextMenus.removeAll()

  const profiles = await loadProfiles()
  if (profiles.length === 0) return

  const activeId = await loadActiveProfile()

  // Parent menu
  chrome.contextMenus.create({
    id: PROFILE_MENU_PARENT,
    title: 'Shortkeys Profiles',
    contexts: ['action'],
  })

  // One item per profile
  for (const profile of profiles) {
    chrome.contextMenus.create({
      id: `shortkeys-profile-${profile.id}`,
      parentId: PROFILE_MENU_PARENT,
      title: `${profile.icon} ${profile.name}`,
      type: 'radio',
      checked: activeId === profile.id,
      contexts: ['action'],
    })
  }

  // Separator + clear option
  chrome.contextMenus.create({
    id: 'shortkeys-profile-sep',
    parentId: PROFILE_MENU_PARENT,
    type: 'separator',
    contexts: ['action'],
  })

  chrome.contextMenus.create({
    id: PROFILE_MENU_CLEAR,
    parentId: PROFILE_MENU_PARENT,
    title: 'All shortcuts (no profile)',
    type: 'radio',
    checked: !activeId,
    contexts: ['action'],
  })
}

/** Handle a context menu click on a profile item. */
export async function handleProfileMenuClick(menuItemId: string): Promise<void> {
  if (menuItemId === PROFILE_MENU_CLEAR) {
    // Clear active profile — enable all shortcuts
    const raw = await loadKeys()
    const allKeys = JSON.parse(raw || '[]')
    for (const k of allKeys) k.enabled = true
    await saveKeys(allKeys)
    await saveActiveProfile(null)
    return
  }

  if (menuItemId.startsWith('shortkeys-profile-')) {
    const profileId = menuItemId.replace('shortkeys-profile-', '')
    const profiles = await loadProfiles()
    const profile = profiles.find(p => p.id === profileId)
    if (!profile) return
    const raw = await loadKeys()
    const allKeys = JSON.parse(raw || '[]')
    for (const k of allKeys) {
      const group = k.group || 'My Shortcuts'
      k.enabled = profile.enabledGroups.includes(group)
    }
    await saveKeys(allKeys)
    await saveActiveProfile(profileId)
  }
}
