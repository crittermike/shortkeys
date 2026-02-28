import { ref, computed } from 'vue'
import { v4 as uuid } from 'uuid'
import type { KeySetting } from '@/utils/url-matching'
import { useShortcuts } from './useShortcuts'
import { useToast } from './useToast'
import { normalizeKey, couldSiteFiltersOverlap } from '@/utils/shortcut-conflicts'

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

  /** Conflict metadata for a single community pack shortcut */
  interface CommunityPackConflictInfo {
    key: string
    type: 'exact' | 'key'
    existingIndices: number[]
  }

  /**
   * Get detailed conflict info for each shortcut in a community pack.
   * Returns a Map from pack shortcut index to conflict info.
   */
  function getCommunityPackConflicts(pack: CommunityPack): Map<number, CommunityPackConflictInfo> {
    const result = new Map<number, CommunityPackConflictInfo>()
    for (let pi = 0; pi < pack.fullShortcuts.length; pi++) {
      const ps = pack.fullShortcuts[pi]
      const psNorm = normalizeKey(ps.key)
      if (!psNorm) continue

      const matchingIndices: number[] = []
      for (let ei = 0; ei < keys.value.length; ei++) {
        const existing = keys.value[ei]
        if (normalizeKey(existing.key) !== psNorm) continue
        if (!couldSiteFiltersOverlap(ps, existing)) continue
        matchingIndices.push(ei)
      }

      if (matchingIndices.length > 0) {
        const isExact = matchingIndices.some((ei) => keys.value[ei].action === ps.action)
        result.set(pi, {
          key: ps.key,
          type: isExact ? 'exact' : 'key',
          existingIndices: matchingIndices,
        })
      }
    }
    return result
  }

  /** Count of exact duplicates that will be auto-dropped */
  const communityExactDuplicateCount = computed(() => {
    if (!previewCommunityPack.value) return 0
    const conflicts = getCommunityPackConflicts(previewCommunityPack.value)
    let count = 0
    for (const c of conflicts.values()) {
      if (c.type === 'exact') count++
    }
    return count
  })

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
    const conflicts = getCommunityPackConflicts(pack)

    // Auto-drop exact duplicates (same key + same action) regardless of mode
    const nonExactShortcuts = pack.fullShortcuts.filter((_, i) => {
      const conflict = conflicts.get(i)
      return !conflict || conflict.type !== 'exact'
    })

    const newShortcuts = nonExactShortcuts.map((s) => ({
      ...s,
      id: uuid(),
      group: groupName,
      enabled: true,
    }))

    const existingKeys = new Set(keys.value.map((k) => normalizeKey(k.key)).filter(Boolean))

    if (mode === 'skip') {
      const toAdd = newShortcuts.filter((s) => !existingKeys.has(normalizeKey(s.key)))
      keys.value.push(...toAdd)
    } else if (mode === 'replace') {
      const packKeys = new Set(newShortcuts.map((s) => normalizeKey(s.key)))
      keys.value = keys.value.filter((k) => !packKeys.has(normalizeKey(k.key)))
      keys.value.push(...newShortcuts)
    } else {
      keys.value.push(...newShortcuts)
    }

    const droppedCount = pack.fullShortcuts.length - nonExactShortcuts.length
    previewCommunityPack.value = null
    jsWarningPack.value = null
    try {
      await saveShortcuts()
      const msg = droppedCount > 0
        ? `Added "${pack.name}" (${nonExactShortcuts.length} shortcuts, ${droppedCount} duplicate${droppedCount > 1 ? 's' : ''} skipped)`
        : `Added "${pack.name}" (${nonExactShortcuts.length} shortcuts)`
      showSnack(msg)
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
    communityExactDuplicateCount,
    jsWarningPack,
    fetchCommunityPacks,
    getCommunityPackConflicts,
    requestInstallCommunityPack,
    installCommunityPack,
    confirmJsInstall,
    dismissJsWarning,
}
}
