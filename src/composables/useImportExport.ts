import { ref } from 'vue'
import { useShortcuts } from './useShortcuts'
import { useToast } from './useToast'
import { useUndoRedo } from './useUndoRedo'
import { DEFAULT_GROUP } from './useGroups'
import { getActionLabel } from '../utils/actions-registry'

export function useImportExport() {
  const { keys, ensureIds, saveShortcuts } = useShortcuts()
  const { showSnack } = useToast()

  const importJson = ref('')
  const shareLink = ref('')

  async function importKeys() {
    try {
      const { pushUndo } = useUndoRedo()
      const parsed = JSON.parse(importJson.value)
      // Filter out empty/invalid shortcuts (#472/#598)
      const valid = (Array.isArray(parsed) ? parsed : [parsed]).filter(
        (k: any) => k && (k.key || k.action),
      )
      pushUndo('Shortcuts imported')
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
      const shareData = keys.value.map(k => ({
        ...k,
        label: k.label || getActionLabel(k.action) || k.action,
      }))
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))))
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
      const shareData = groupShortcuts.map(k => ({
        ...k,
        label: k.label || getActionLabel(k.action) || k.action,
      }))
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))))
      const url = `https://shortkeys.app/share#${encoded}`
      navigator.clipboard.writeText(url)
      showSnack(`Share link for "${group}" copied!`)
    } catch {
      showSnack('Failed to generate share link', 'danger')
    }
  }

  function publishToCommunity(group: string) {
    const groupShortcuts = keys.value.filter((k) => (k.group || DEFAULT_GROUP) === group)
    if (groupShortcuts.length === 0) {
      showSnack('No shortcuts in this group to publish.', 'danger')
      return
    }

    const packData = {
      name: group,
      icon: '📦',
      description: '',
      author: '',
      shortcuts: groupShortcuts.map((s) => ({
        key: s.key,
        action: s.action,
        label: s.label || s.action,
        ...(s.code ? { code: s.code } : {}),
      })),
    }

    const json = JSON.stringify(packData, null, 2)
    const fileName = `${group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
    const title = encodeURIComponent(`Community pack: ${group}`)
    const body = encodeURIComponent(`## New community pack submission\n\n**Pack name:** ${group}\n**File name:** \`packs/community/${fileName}\`\n\n### Pack JSON\n\n\`\`\`json\n${json}\n\`\`\`\n\nPlease fill in the \`description\`, \`author\`, and \`icon\` fields before submitting.`)
    const url = `https://github.com/crittermike/shortkeys/issues/new?title=${title}&body=${body}&labels=community-pack`
    window.open(url, '_blank')
    showSnack('GitHub issue opened — fill in the details and submit!')
  }

  return { importJson, shareLink, importKeys, copyExport, generateShareLink, shareGroup, publishToCommunity }
}
