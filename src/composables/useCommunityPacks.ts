import { ref, computed } from 'vue'
import { v4 as uuid } from 'uuid'
import type { KeySetting } from '@/utils/url-matching'
import { useShortcuts } from './useShortcuts'
import { useToast } from './useToast'

export interface CommunityPack {
  id: string
  name: string
  icon: string
  description: string
  color: string
  author: string
  shortcutCount: number
  hasJavaScript: boolean
  shortcuts: Array<{ key: string; action: string; label: string }>
  fullShortcuts: KeySetting[]
}

interface CommunityCatalog {
  version: number
  updated: string
  packs: CommunityPack[]
}

// Module-level state so all callers share the same refs
const communityPacks = ref<CommunityPack[]>([])
const communityLoading = ref(false)
const communityError = ref<string | null>(null)
const communitySearchQuery = ref('')
const previewCommunityPack = ref<CommunityPack | null>(null)
const communityConflictMode = ref<'skip' | 'replace' | 'keep'>('replace')
const jsWarningPack = ref<CommunityPack | null>(null)

const COMMUNITY_CATALOG_URL = 'https://shortkeys.app/community.json'

export function useCommunityPacks() {
  const { keys, saveShortcuts } = useShortcuts()
  const { showSnack } = useToast()

  /** Filter community packs by search query */
  const filteredCommunityPacks = computed(() => {
    const q = communitySearchQuery.value.toLowerCase().trim()
    if (!q) return communityPacks.value
    return communityPacks.value.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q),
    )
  })

  /** Fetch community packs from the catalog */
  async function fetchCommunityPacks() {
    if (communityPacks.value.length > 0 && !communityError.value) return // Already loaded
    communityLoading.value = true
    communityError.value = null
    try {
      const resp = await fetch(COMMUNITY_CATALOG_URL)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data: CommunityCatalog = await resp.json()
      communityPacks.value = data.packs
    } catch (e) {
      communityError.value = 'Failed to load community packs. Check your internet connection.'
      console.error('Failed to fetch community packs:', e)
    } finally {
      communityLoading.value = false
    }
  }

  /** Get conflicts between a community pack and existing shortcuts */
  function getCommunityPackConflicts(pack: CommunityPack): string[] {
    const existing = new Set(keys.value.map((k) => k.key?.toLowerCase()).filter(Boolean))
    return pack.fullShortcuts.filter((s) => existing.has(s.key?.toLowerCase())).map((s) => s.key)
  }

  /** Try to install a community pack. If it has JS, shows the warning first. */
  function requestInstallCommunityPack(pack: CommunityPack) {
    if (pack.hasJavaScript) {
      jsWarningPack.value = pack
    } else {
      installCommunityPack(pack)
    }
  }

  /** Actually install a community pack */
  async function installCommunityPack(pack: CommunityPack) {
    const mode = communityConflictMode.value
    const groupName = pack.name
    const existingKeys = new Set(keys.value.map((k) => k.key?.toLowerCase()).filter(Boolean))

    const newShortcuts = pack.fullShortcuts.map((s) => ({
      ...s,
      id: uuid(),
      group: groupName,
      enabled: true,
    }))

    if (mode === 'skip') {
      const toAdd = newShortcuts.filter((s) => !existingKeys.has(s.key?.toLowerCase()))
      keys.value.push(...toAdd)
    } else if (mode === 'replace') {
      const packKeys = new Set(newShortcuts.map((s) => s.key?.toLowerCase()))
      keys.value = keys.value.filter((k) => !packKeys.has(k.key?.toLowerCase()))
      keys.value.push(...newShortcuts)
    } else {
      keys.value.push(...newShortcuts)
    }

    previewCommunityPack.value = null
    jsWarningPack.value = null
    try {
      await saveShortcuts()
      showSnack(`Added "${pack.name}" (${newShortcuts.length} shortcuts)`)
    } catch {
      showSnack('Failed to save shortcuts. Please try again.', 'danger')
    }
  }

  /** Confirm JS warning and proceed with install */
  function confirmJsInstall() {
    if (jsWarningPack.value) {
      installCommunityPack(jsWarningPack.value)
    }
  }

  /** Dismiss JS warning */
  function dismissJsWarning() {
    jsWarningPack.value = null
  }

  return {
    communityPacks,
    communityLoading,
    communityError,
    communitySearchQuery,
    filteredCommunityPacks,
    previewCommunityPack,
    communityConflictMode,
    jsWarningPack,
    fetchCommunityPacks,
    getCommunityPackConflicts,
    requestInstallCommunityPack,
    installCommunityPack,
    confirmJsInstall,
    dismissJsWarning,
  }
}
