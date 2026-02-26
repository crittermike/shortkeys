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

  function publishToCommunity(group: string) {
    const groupShortcuts = keys.value.filter((k) => (k.group || DEFAULT_GROUP) === group)
    if (groupShortcuts.length === 0) {
      showSnack('No shortcuts in this group to publish.', 'danger')
      return
    }

    const packData = {
      id: `community-${group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: group,
      icon: '📦',
      description: '',
      color: '#4361ee',
      author: '',
      category: 'uncategorized',
      tags: [],
      shortcuts: groupShortcuts.map((s) => ({
        key: s.key,
        action: s.action,
        label: s.label || s.action,
        ...(s.code ? { code: s.code } : {}),
      })),
    }

    const json = JSON.stringify(packData, null, 2)
    const fileName = `${packData.id}.json`
    const title = encodeURIComponent(`Community pack: ${group}`)
    const body = encodeURIComponent(`## New community pack submission\n\n**Pack name:** ${group}\n**File name:** \`community-packs/${fileName}\`\n\n### Pack JSON\n\n\`\`\`json\n${json}\n\`\`\`\n\nPlease fill in the \`description\`, \`author\`, \`icon\`, \`color\`, \`category\`, and \`tags\` fields before submitting.`)
    const url = `https://github.com/crittermike/shortkeys/issues/new?title=${title}&body=${body}&labels=community-pack`
    window.open(url, '_blank')
    showSnack('GitHub issue opened — fill in the details and submit!')
  }

  return { importJson, shareLink, importKeys, copyExport, generateShareLink, shareGroup, publishToCommunity }
}
