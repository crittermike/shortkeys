import { ref } from 'vue'
import { useShortcuts } from './useShortcuts'
import { useToast } from './useToast'
import { DEFAULT_GROUP } from './useGroups'

export function useImportExport() {
  const { keys, ensureIds, saveShortcuts } = useShortcuts()
  const { showSnack } = useToast()

  const importJson = ref('')
  const shareLink = ref('')

  async function importKeys() {
    try {
      const parsed = JSON.parse(importJson.value)
      // Filter out empty/invalid shortcuts (#472/#598)
      const valid = (Array.isArray(parsed) ? parsed : [parsed]).filter(
        (k: any) => k && (k.key || k.action),
      )
      keys.value = keys.value.concat(valid)
      ensureIds()
      await saveShortcuts()
      showSnack('Imported successfully!')
    } catch {
      showSnack('Invalid JSON. Please check and try again.', 'danger')
    }
  }

  function copyExport() {
    navigator.clipboard.writeText(JSON.stringify(keys.value, null, 2))
    showSnack('Copied to clipboard!')
  }

  function generateShareLink() {
    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(keys.value))))
      shareLink.value = `https://shortkeys.app/share#${encoded}`
      navigator.clipboard.writeText(shareLink.value)
      showSnack('Share link copied!')
    } catch {
      showSnack('Failed to generate share link', 'danger')
    }
  }

  function shareGroup(group: string) {
    const groupShortcuts = keys.value.filter((k) => (k.group || DEFAULT_GROUP) === group)
    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(groupShortcuts))))
      const url = `https://shortkeys.app/share#${encoded}`
      navigator.clipboard.writeText(url)
      showSnack(`Share link for "${group}" copied!`)
    } catch {
      showSnack('Failed to generate share link', 'danger')
    }
  }

  return { importJson, shareLink, importKeys, copyExport, generateShareLink, shareGroup }
}
