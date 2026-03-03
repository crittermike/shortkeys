import { ref, computed } from 'vue'
import { v4 as uuid } from 'uuid'
import type { Profile } from '@/utils/storage'
import { saveProfiles, loadProfiles, saveActiveProfile, loadActiveProfile } from '@/utils/storage'
import { useShortcuts } from './useShortcuts'
import { useGroups } from './useGroups'
import { useToast } from './useToast'

const profiles = ref<Profile[]>([])
const activeProfileId = ref<string | null>(null)

const activeProfile = computed<Profile | null>(() => {
  if (!activeProfileId.value) return null
  return profiles.value.find((p) => p.id === activeProfileId.value) || null
})

export function useProfiles() {
  const { keys, saveShortcuts } = useShortcuts()
  const { groupNames } = useGroups()
  const { showSnack } = useToast()

  /** Load profiles and active profile ID from storage */
  async function loadProfilesFromStorage(): Promise<void> {
    profiles.value = await loadProfiles()
    activeProfileId.value = await loadActiveProfile()
    // Clean up: if the active profile was deleted, clear it
    if (activeProfileId.value && !profiles.value.find((p) => p.id === activeProfileId.value)) {
      activeProfileId.value = null
      await saveActiveProfile(null)
    }
  }

  /** Create a new profile. If captureCurrentState is true, enabled groups are captured from current shortcuts. */
  function createProfile(name: string, icon: string, captureCurrentState = true): Profile {
    const enabledGroups = captureCurrentState
      ? groupNames.value.filter((group) => {
          // A group is considered enabled if at least one shortcut in it is enabled
          return keys.value
            .filter((k) => (k.group || 'My Shortcuts') === group)
            .some((k) => k.enabled !== false)
        })
      : [...groupNames.value] // Default: all groups enabled

    const profile: Profile = {
      id: uuid(),
      name: name.trim(),
      icon,
      enabledGroups,
    }
    profiles.value.push(profile)
    persistProfiles()
    return profile
  }

  /** Update an existing profile's name and/or icon */
  function updateProfile(id: string, updates: { name?: string; icon?: string }): void {
    const profile = profiles.value.find((p) => p.id === id)
    if (!profile) return
    if (updates.name !== undefined) profile.name = updates.name.trim()
    if (updates.icon !== undefined) profile.icon = updates.icon
    persistProfiles()
  }

  /** Delete a profile by ID */
  function deleteProfile(id: string): void {
    const index = profiles.value.findIndex((p) => p.id === id)
    if (index === -1) return
    const name = profiles.value[index].name
    profiles.value.splice(index, 1)
    if (activeProfileId.value === id) {
      activeProfileId.value = null
      saveActiveProfile(null)
    }
    persistProfiles()
    showSnack(`Deleted profile "${name}"`)
  }

  /** Toggle a group's inclusion in a profile */
  function toggleProfileGroup(profileId: string, group: string): void {
    const profile = profiles.value.find((p) => p.id === profileId)
    if (!profile) return
    const idx = profile.enabledGroups.indexOf(group)
    if (idx >= 0) {
      profile.enabledGroups.splice(idx, 1)
    } else {
      profile.enabledGroups.push(group)
    }
    persistProfiles()
  }

  /** Apply a profile: enable/disable groups based on the profile's enabledGroups list */
  async function switchProfile(profileId: string | null): Promise<void> {
    if (profileId === null) {
      // Deactivate profile: enable all shortcuts
      activeProfileId.value = null
      await saveActiveProfile(null)
      for (const k of keys.value) {
        k.enabled = true
      }
      await saveShortcuts()
      showSnack('All shortcuts enabled')
      return
    }

    const profile = profiles.value.find((p) => p.id === profileId)
    if (!profile) return

    activeProfileId.value = profileId
    await saveActiveProfile(profileId)

    for (const k of keys.value) {
      const group = k.group || 'My Shortcuts'
      k.enabled = profile.enabledGroups.includes(group)
    }
    await saveShortcuts()
    showSnack(`Switched to ${profile.icon} ${profile.name}`)
  }

  /** Capture the current enabled/disabled state of groups into the active profile */
  function captureCurrentState(profileId: string): void {
    const profile = profiles.value.find((p) => p.id === profileId)
    if (!profile) return

    const enabledGroups: string[] = []
    for (const group of groupNames.value) {
      const groupKeys = keys.value.filter((k) => (k.group || 'My Shortcuts') === group)
      if (groupKeys.some((k) => k.enabled !== false)) {
        enabledGroups.push(group)
      }
    }
    profile.enabledGroups = enabledGroups
    persistProfiles()
    showSnack(`Updated "${profile.name}" with current group states`)
  }

  /** Persist profiles to storage */
  async function persistProfiles(): Promise<void> {
    await saveProfiles(profiles.value)
  }

  /** Get a profile by ID */
  function getProfile(id: string): Profile | undefined {
    return profiles.value.find((p) => p.id === id)
  }

  return {
    profiles,
    activeProfileId,
    activeProfile,
    loadProfilesFromStorage,
    createProfile,
    updateProfile,
    deleteProfile,
    toggleProfileGroup,
    switchProfile,
    captureCurrentState,
    getProfile,
    persistProfiles,
  }
}
