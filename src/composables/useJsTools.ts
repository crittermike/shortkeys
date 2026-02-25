import { ref } from 'vue'
import type { KeySetting } from '@/utils/url-matching'
import { executeJavascriptOnTab } from '@/utils/test-javascript'
import { resolveUserscriptUrl, parseUserscript } from '@/utils/fetch-userscript'
import { useShortcuts } from './useShortcuts'
import { useToast } from './useToast'

export function useJsTools() {
  const { keys } = useShortcuts()
  const { showSnack } = useToast()

  const openTabs = ref<{ id: number; title: string; url: string; favIconUrl?: string }[]>([])
  const selectedTabId = ref<number | null>(null)
  const bookmarks = ref<{ title: string; url: string }[]>([])
  const userscriptUrl = ref('')
  const userscriptLoading = ref(false)
  const userscriptMessage = ref('')

  async function refreshTabs() {
    const tabs = await chrome.tabs.query({})
    openTabs.value = tabs
      .filter((t) => t.url && !t.url.startsWith('chrome') && t.id)
      .map((t) => ({ id: t.id!, title: t.title || '', url: t.url!, favIconUrl: t.favIconUrl }))
    if (openTabs.value.length > 0 && !selectedTabId.value) {
      selectedTabId.value = openTabs.value[0].id
    }
  }

  async function testJavascript(row: KeySetting) {
    if (!selectedTabId.value) {
      showSnack('Select a tab to test on', 'danger')
      return
    }
    const result = await executeJavascriptOnTab(selectedTabId.value, row.code || '')
    if (result.success) {
      showSnack(`✓ Ran on ${result.hostname}`)
    } else {
      showSnack(result.error, 'danger')
    }
  }

  async function importUserscript(index: number) {
    const url = userscriptUrl.value.trim()
    if (!url) return
    userscriptLoading.value = true
    userscriptMessage.value = ''
    try {
      const codeUrl = resolveUserscriptUrl(url)
      const resp: any = await browser.runtime.sendMessage({ action: 'fetchUrl', url: codeUrl })
      if (resp?.error) {
        userscriptMessage.value = '❌ ' + resp.error
        return
      }
      const { code, name } = parseUserscript(resp.text)
      keys.value[index].code = code
      userscriptMessage.value = '✓ Imported: ' + name
      userscriptUrl.value = ''
    } catch (e: any) {
      userscriptMessage.value = '❌ ' + (e.message || 'Failed to fetch')
    } finally {
      userscriptLoading.value = false
    }
  }

  async function loadBookmarks() {
    chrome.bookmarks.getTree((tree) => {
      const process = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
        for (const node of nodes) {
          if (node.url) bookmarks.value.push({ title: node.title, url: node.url })
          if (node.children) process(node.children)
        }
      }
      process(tree)
    })
  }

  return {
    openTabs,
    selectedTabId,
    bookmarks,
    userscriptUrl,
    userscriptLoading,
    userscriptMessage,
    refreshTabs,
    testJavascript,
    importUserscript,
    loadBookmarks,
  }
}
