import { ref } from 'vue'
import { v4 as uuid } from 'uuid'
import type { ShortcutPack } from '@/packs'
import { useShortcuts } from './useShortcuts'
import { useToast } from './useToast'

export function usePacks() {
  const { keys, saveShortcuts } = useShortcuts()
  const { showSnack } = useToast()

  const previewPack = ref<ShortcutPack | null>(null)
  const packConflictMode = ref<'skip' | 'replace' | 'keep'>('replace')

  function getPackConflicts(pack: ShortcutPack): string[] {
    const existing = new Set(keys.value.map((k) => k.key?.toLowerCase()).filter(Boolean))
    return pack.shortcuts.filter((s) => existing.has(s.key?.toLowerCase())).map((s) => s.key)
  }

  async function installPack(pack: ShortcutPack) {
    const mode = packConflictMode.value
    const groupName = pack.name
    const existingKeys = new Set(keys.value.map((k) => k.key?.toLowerCase()).filter(Boolean))

    const newShortcuts = pack.shortcuts.map((s) => ({
      ...s,
      id: uuid(),
      group: groupName,
      enabled: true,
    }))

    if (mode === 'skip') {
      // Only add non-conflicting
      const toAdd = newShortcuts.filter((s) => !existingKeys.has(s.key?.toLowerCase()))
      keys.value.push(...toAdd)
    } else if (mode === 'replace') {
      // Remove existing conflicting shortcuts, add all from pack
      const packKeys = new Set(newShortcuts.map((s) => s.key?.toLowerCase()))
      keys.value = keys.value.filter((k) => !packKeys.has(k.key?.toLowerCase()))
      keys.value.push(...newShortcuts)
    } else {
      // Keep both
      keys.value.push(...newShortcuts)
    }

    previewPack.value = null
    await saveShortcuts()
    showSnack(`✓ Added "${pack.name}" (${newShortcuts.length} shortcuts)`)
  }

  return { previewPack, packConflictMode, getPackConflicts, installPack }
}
