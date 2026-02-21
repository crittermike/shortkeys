import { executeScript, showPageToast } from '../utils/execute-script'
import type { KeySetting } from '../utils/url-matching'

type ActionHandler = (request: KeySetting) => Promise<boolean> | boolean

/** Select a tab by direction or index. */
async function selectTab(direction: string): Promise<void> {
  const tabs = await browser.tabs.query({ currentWindow: true })
  if (tabs.length <= 1) return

  const [currentTab] = await browser.tabs.query({ currentWindow: true, active: true })
  const currentIndex = tabs.findIndex((t) => t.id === currentTab.id)
  let target: browser.Tabs.Tab | undefined

  switch (direction) {
    case 'next':
      target = tabs[(currentIndex + 1) % tabs.length]
      break
    case 'previous':
      target = tabs[(currentIndex - 1 + tabs.length) % tabs.length]
      break
    case 'first':
      target = tabs[0]
      break
    case 'last':
      target = tabs[tabs.length - 1]
      break
    default: {
      const index = parseInt(direction) || 0
      if (index >= 1 && index <= tabs.length) {
        target = tabs[index - 1]
      }
    }
  }

  if (target?.id) {
    await browser.tabs.update(target.id, { active: true })
  }
}

function copyToClipboard(text: string): void {
  executeScript(
    (text: string) => {
      const blob = new Blob([text], { type: 'text/plain' })
      const data = [new ClipboardItem({ 'text/plain': blob })]
      navigator.clipboard.write(data)
    },
    [text],
  )
}

/**
 * Map of action name → handler function.
 * Each handler receives the full request object and returns true if handled.
 */
const actionHandlers: Record<string, ActionHandler> = {
  // -- Downloads --
  cleardownloads: async () => {
    await browser.browsingData.remove({ since: 0 }, { downloads: true })
    return true
  },

  // -- View/Navigation --
  viewsource: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    await browser.tabs.create({ url: `view-source:${tab.url}` })
    return true
  },
  print: async () => {
    await executeScript(() => window.print())
    return true
  },
  opensettings: async () => {
    const isFirefox = navigator.userAgent.includes('Firefox')
    await browser.tabs.create({ url: isFirefox ? 'about:preferences' : 'chrome://settings', active: true })
    return true
  },
  openextensions: async () => {
    const isFirefox = navigator.userAgent.includes('Firefox')
    await browser.tabs.create({ url: isFirefox ? 'about:addons' : 'chrome://extensions', active: true })
    return true
  },
  openshortcuts: async () => {
    const isFirefox = navigator.userAgent.includes('Firefox')
    await browser.tabs.create({ url: isFirefox ? 'about:addons' : 'chrome://extensions/shortcuts', active: true })
    return true
  },

  // -- Tab switching --
  nexttab: async () => { await selectTab('next'); return true },
  prevtab: async () => { await selectTab('previous'); return true },
  firsttab: async () => { await selectTab('first'); return true },
  lasttab: async () => { await selectTab('last'); return true },

  // -- Tab management --
  newtab: async () => { await browser.tabs.create({}); return true },

  newtabright: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    await browser.tabs.create({ index: tab.index + 1 })
    return true
  },

  reopentab: async () => {
    const sessions = await browser.sessions.getRecentlyClosed({ maxResults: 1 })
    if (sessions[0]) {
      await browser.sessions.restore(sessions[0].sessionId)
    }
    return true
  },

  closetab: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    await browser.tabs.remove(tab.id!)
    return true
  },

  clonetab: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    await browser.tabs.duplicate(tab.id!)
    return true
  },

  movetabtonewwindow: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    await browser.windows.create({ url: tab.url, state: 'maximized' })
    await browser.tabs.remove(tab.id!)
    return true
  },

  onlytab: async () => {
    const tabs = await browser.tabs.query({ currentWindow: true, pinned: false, active: false })
    await browser.tabs.remove(tabs.map((t) => t.id!))
    return true
  },

  closelefttabs: async () => {
    const [activeTab] = await browser.tabs.query({ currentWindow: true, active: true })
    const tabs = await browser.tabs.query({ currentWindow: true, pinned: false, active: false })
    const ids = tabs.filter((t) => t.index < activeTab.index).map((t) => t.id!)
    await browser.tabs.remove(ids)
    return true
  },

  closerighttabs: async () => {
    const [activeTab] = await browser.tabs.query({ currentWindow: true, active: true })
    const tabs = await browser.tabs.query({ currentWindow: true, pinned: false, active: false })
    const ids = tabs.filter((t) => t.index > activeTab.index).map((t) => t.id!)
    await browser.tabs.remove(ids)
    return true
  },

  closeduplicatetabs: async () => {
    const tabs = await browser.tabs.query({ currentWindow: true })
    const seen = new Set<string>()
    const toClose: number[] = []
    for (const tab of tabs) {
      if (tab.url && seen.has(tab.url)) {
        toClose.push(tab.id!)
      } else if (tab.url) {
        seen.add(tab.url)
      }
    }
    if (toClose.length > 0) await browser.tabs.remove(toClose)
    showPageToast(toClose.length > 0 ? `✓ Closed ${toClose.length} duplicate tab${toClose.length > 1 ? 's' : ''}` : '✓ No duplicates found')
    return true
  },

  sorttabs: async () => {
    const tabs = await browser.tabs.query({ currentWindow: true })
    const pinned = tabs.filter((t) => t.pinned)
    const unpinned = tabs.filter((t) => !t.pinned)
    unpinned.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    for (let i = 0; i < unpinned.length; i++) {
      await browser.tabs.move(unpinned[i].id!, { index: pinned.length + i })
    }
    showPageToast(`✓ Sorted ${unpinned.length} tabs`)
    return true
  },

  discardtab: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    if (tab.id) {
      // Switch to next tab first, then discard (can't discard active tab)
      await selectTab('next')
      await browser.tabs.discard(tab.id)
    }
    return true
  },

  audibletab: async () => {
    const tabs = await browser.tabs.query({ audible: true })
    if (tabs.length > 0) {
      await browser.tabs.update(tabs[0].id!, { active: true })
      await browser.windows.update(tabs[0].windowId!, { focused: true })
    } else {
      showPageToast('No tabs playing audio')
    }
    return true
  },

  grouptab: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    if (tab.id && chrome.tabs.group) {
      await chrome.tabs.group({ tabIds: [tab.id] })
      showPageToast('✓ Tab added to new group')
    }
    return true
  },

  ungrouptab: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    if (tab.id && chrome.tabs.ungroup) {
      await chrome.tabs.ungroup(tab.id)
      showPageToast('✓ Tab removed from group')
    }
    return true
  },

  togglepin: async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    await browser.tabs.update(tab.id!, { pinned: !tab.pinned })
    return true
  },

  togglemute: async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    await browser.tabs.update(tab.id!, { muted: !tab.mutedInfo?.muted })
    return true
  },

  copyurl: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    copyToClipboard(tab.url!.trim())
    showPageToast('✓ URL copied')
    return true
  },

  copypagetitle: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    copyToClipboard(tab.title || '')
    showPageToast('✓ Title copied')
    return true
  },

  copytitleurl: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    copyToClipboard(`${tab.title} - ${tab.url}`)
    showPageToast('✓ Title & URL copied')
    return true
  },

  copytitleurlmarkdown: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    copyToClipboard(`[${tab.title}](${tab.url})`)
    showPageToast('✓ Markdown link copied')
    return true
  },

  openclipboardurl: async () => {
    const results = await executeScript(() => navigator.clipboard.readText())
    const url = results?.[0]?.result?.trim()
    if (url) {
      const fullUrl = url.match(/^https?:\/\//) ? url : `https://${url}`
      await browser.tabs.update(undefined as any, { url: fullUrl })
    }
    return true
  },

  openclipboardurlnewtab: async () => {
    const results = await executeScript(() => navigator.clipboard.readText())
    const url = results?.[0]?.result?.trim()
    if (url) {
      const fullUrl = url.match(/^https?:\/\//) ? url : `https://${url}`
      await browser.tabs.create({ url: fullUrl })
    }
    return true
  },

  openurl: async (request) => {
    if (request.openurl) {
      await browser.tabs.update(undefined as any, { url: request.openurl })
    }
    return true
  },

  searchgoogle: async () => {
    const results = await executeScript(() => window.getSelection()?.toString())
    const selection = results?.[0]?.result
    if (selection) {
      const query = encodeURIComponent(selection)
      const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
      await browser.tabs.create({
        url: `https://www.google.com/search?q=${query}`,
        index: tab.index + 1,
      })
    }
    return true
  },

  // -- Tab movement --
  movetableft: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    if (tab.index > 0) {
      await browser.tabs.move(tab.id!, { index: tab.index - 1 })
    }
    return true
  },

  movetabright: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    await browser.tabs.move(tab.id!, { index: tab.index + 1 })
    return true
  },

  movetabtofirst: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    if (tab.index > 0) {
      await browser.tabs.move(tab.id!, { index: 0 })
    }
    return true
  },

  movetabtolast: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    await browser.tabs.move(tab.id!, { index: -1 })
    return true
  },

  // -- Jump to tab --
  gototab: async (request) => {
    const createNewTab = () => browser.tabs.create({ url: request.openurl })
    if (request.matchurl) {
      const queryOption: browser.Tabs.QueryQueryInfoType = { url: request.matchurl }
      if (request.currentWindow) queryOption.currentWindow = true
      const tabs = await browser.tabs.query(queryOption)
      if (tabs.length > 0) {
        await browser.tabs.update(tabs[0].id!, { active: true })
        await browser.windows.update(tabs[0].windowId!, { focused: true })
      } else {
        await createNewTab()
      }
    } else {
      await createNewTab()
    }
    return true
  },

  gototabbytitle: async (request) => {
    if (request.matchtitle) {
      const queryOption: browser.Tabs.QueryQueryInfoType = { title: request.matchtitle }
      if (request.currentWindow) queryOption.currentWindow = true
      const tabs = await browser.tabs.query(queryOption)
      if (tabs.length > 0) {
        await browser.tabs.update(tabs[0].id!, { active: true })
        await browser.windows.update(tabs[0].windowId!, { focused: true })
      }
    }
    return true
  },

  gototabbyindex: async (request) => {
    if (request.matchindex) {
      await selectTab(request.matchindex)
    }
    return true
  },

  // -- Windows --
  newwindow: async () => { await browser.windows.create({ state: 'maximized' }); return true },
  newprivatewindow: async () => { await browser.windows.create({ incognito: true, state: 'maximized' }); return true },

  closewindow: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    await browser.windows.remove(tab.windowId!)
    return true
  },

  fullscreen: async () => {
    const win = await browser.windows.getCurrent()
    const state = win.state === 'fullscreen' ? 'normal' : 'fullscreen'
    await browser.windows.update(win.id!, { state })
    return true
  },

  // -- Zoom --
  zoomin: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    const zoom = await browser.tabs.getZoom(tab.id!)
    await browser.tabs.setZoom(tab.id!, zoom + 0.1)
    return true
  },

  zoomout: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    const zoom = await browser.tabs.getZoom(tab.id!)
    await browser.tabs.setZoom(tab.id!, zoom - 0.1)
    return true
  },

  zoomreset: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    await browser.tabs.setZoom(tab.id!, 0)
    return true
  },

  // -- Downloads --
  showlatestdownload: async () => {
    const downloads = await chrome.downloads.search({ orderBy: ['-startTime'], state: 'complete' })
    if (downloads?.length > 0 && chrome.downloads.show) {
      chrome.downloads.show(downloads[0].id)
    }
    return true
  },

  // -- History --
  back: async () => { await executeScript(() => window.history.back()); return true },
  forward: async () => { await executeScript(() => window.history.forward()); return true },
  reload: async () => { await executeScript(() => window.location.reload()); return true },

  hardreload: async () => {
    await browser.tabs.reload({ bypassCache: true } as any)
    return true
  },

  // -- Scrolling --
  // Uses focused scrollable element if available, otherwise window (#300)
  top: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => {
      const el = document.activeElement
      const t = el && el !== document.body && el.scrollHeight > el.clientHeight ? el : window
      t.scrollTo({ left: 0, top: 0, behavior: s as ScrollBehavior })
    }, [s])
    return true
  },
  bottom: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => {
      const el = document.activeElement
      if (el && el !== document.body && el.scrollHeight > el.clientHeight) {
        el.scrollTo({ left: 0, top: el.scrollHeight, behavior: s as ScrollBehavior })
      } else {
        window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: s as ScrollBehavior })
      }
    }, [s])
    return true
  },
  scrollup: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => {
      const el = document.activeElement
      const t = el && el !== document.body && el.scrollHeight > el.clientHeight ? el : window
      t.scrollBy({ left: 0, top: -50, behavior: s as ScrollBehavior })
    }, [s])
    return true
  },
  scrollupmore: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => {
      const el = document.activeElement
      const t = el && el !== document.body && el.scrollHeight > el.clientHeight ? el : window
      t.scrollBy({ left: 0, top: -500, behavior: s as ScrollBehavior })
    }, [s])
    return true
  },
  pageup: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => {
      const el = document.activeElement
      const t = el && el !== document.body && el.scrollHeight > el.clientHeight ? el : window
      t.scrollBy({ left: 0, top: -window.innerHeight, behavior: s as ScrollBehavior })
    }, [s])
    return true
  },
  scrolldown: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => {
      const el = document.activeElement
      const t = el && el !== document.body && el.scrollHeight > el.clientHeight ? el : window
      t.scrollBy({ left: 0, top: 50, behavior: s as ScrollBehavior })
    }, [s])
    return true
  },
  scrolldownmore: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => {
      const el = document.activeElement
      const t = el && el !== document.body && el.scrollHeight > el.clientHeight ? el : window
      t.scrollBy({ left: 0, top: 500, behavior: s as ScrollBehavior })
    }, [s])
    return true
  },
  pagedown: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => {
      const el = document.activeElement
      const t = el && el !== document.body && el.scrollHeight > el.clientHeight ? el : window
      t.scrollBy({ left: 0, top: window.innerHeight, behavior: s as ScrollBehavior })
    }, [s])
    return true
  },
  scrollleft: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => {
      const el = document.activeElement
      const t = el && el !== document.body && el.scrollWidth > el.clientWidth ? el : window
      t.scrollBy({ left: -50, top: 0, behavior: s as ScrollBehavior })
    }, [s])
    return true
  },
  scrollleftmore: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => {
      const el = document.activeElement
      const t = el && el !== document.body && el.scrollWidth > el.clientWidth ? el : window
      t.scrollBy({ left: -500, top: 0, behavior: s as ScrollBehavior })
    }, [s])
    return true
  },
  scrollright: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => {
      const el = document.activeElement
      const t = el && el !== document.body && el.scrollWidth > el.clientWidth ? el : window
      t.scrollBy({ left: 50, top: 0, behavior: s as ScrollBehavior })
    }, [s])
    return true
  },
  scrollrightmore: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => {
      const el = document.activeElement
      const t = el && el !== document.body && el.scrollWidth > el.clientWidth ? el : window
      t.scrollBy({ left: 500, top: 0, behavior: s as ScrollBehavior })
    }, [s])
    return true
  },

  // -- Bookmarks --
  openbookmark: async (request) => {
    const nodes = await browser.bookmarks.search({ title: request.bookmark! })
    const openNode = nodes.reverse().find((n) => n.url && n.title === request.bookmark)
    if (openNode?.url) {
      if (openNode.url.startsWith('javascript:')) {
        // Use try/catch for decodeURIComponent — bare % signs cause URIError (#628)
        let code: string
        try {
          code = decodeURIComponent(openNode.url.replace('javascript:', ''))
        } catch {
          code = openNode.url.replace('javascript:', '')
        }
        await executeScript(
          (code: string) =>
            document.dispatchEvent(new CustomEvent('shortkeys_js_run', { detail: code })),
          [code],
        )
      } else {
        await browser.tabs.update(undefined as any, { url: openNode.url })
      }
    }
    return true
  },

  openbookmarknewtab: async (request) => {
    const nodes = await browser.bookmarks.search({ title: request.bookmark! })
    const openNode = nodes.reverse().find((n) => n.url && n.title === request.bookmark)
    if (openNode?.url) {
      await browser.tabs.create({ url: openNode.url })
    }
    return true
  },

  openbookmarkbackgroundtab: async (request) => {
    const nodes = await browser.bookmarks.search({ title: request.bookmark! })
    const openNode = nodes.reverse().find((n) => n.url && n.title === request.bookmark)
    if (openNode?.url) {
      await browser.tabs.create({ url: openNode.url, active: false })
    }
    return true
  },

  openbookmarkbackgroundtabandclose: async (request) => {
    const nodes = await browser.bookmarks.search({ title: request.bookmark! })
    const openNode = nodes.reverse().find((n) => n.url && n.title === request.bookmark)
    if (openNode?.url) {
      const createdTab = await browser.tabs.create({ url: openNode.url, active: false })
      const closeListener = (tabId: number, changeInfo: browser.Tabs.OnUpdatedChangeInfoType) => {
        if (tabId === createdTab.id && changeInfo.status === 'complete') {
          browser.tabs.remove(createdTab.id!)
          browser.tabs.onUpdated.removeListener(closeListener)
        }
      }
      browser.tabs.onUpdated.addListener(closeListener)
    }
    return true
  },

  // -- Apps --
  openapp: async (request) => {
    if (request.openappid) {
      await browser.management.launchApp(request.openappid)
    }
    return true
  },

  // -- Misc --
  togglebookmark: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    const existing = await browser.bookmarks.search({ url: tab.url! })
    if (existing.length > 0) {
      await browser.bookmarks.remove(existing[0].id)
      showPageToast('✓ Bookmark removed')
    } else {
      await browser.bookmarks.create({ title: tab.title, url: tab.url })
      showPageToast('✓ Bookmarked')
    }
    return true
  },

  openincognito: async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
    await browser.windows.create({ url: tab.url, incognito: true, state: 'maximized' })
    return true
  },

  // -- Insert text --
  inserttext: async (request) => {
    if (request.inserttext) {
      await executeScript((text: string) => {
        const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
        if (el && ('value' in el)) {
          const start = el.selectionStart ?? el.value.length
          const end = el.selectionEnd ?? el.value.length
          el.value = el.value.slice(0, start) + text + el.value.slice(end)
          el.selectionStart = el.selectionEnd = start + text.length
          el.dispatchEvent(new Event('input', { bubbles: true }))
        } else if (document.activeElement?.isContentEditable) {
          document.execCommand('insertText', false, text)
        }
      }, [request.inserttext])
    }
    return true
  },

  // -- Disable (no-op) --
  disable: () => true,

  // -- Video controls --
  videoplaypause: async () => {
    await executeScript(() => { const v = document.querySelector('video'); if (v) v.paused ? v.play() : v.pause() })
    return true
  },
  videomute: async () => {
    await executeScript(() => { const v = document.querySelector('video'); if (v) v.muted = !v.muted })
    return true
  },
  videofullscreen: async () => {
    await executeScript(() => { const v = document.querySelector('video'); if (v) document.fullscreenElement ? document.exitFullscreen() : v.requestFullscreen() })
    return true
  },
  videospeedup: async () => {
    await executeScript(() => { const v = document.querySelector('video'); if (v) { v.playbackRate = Math.min(v.playbackRate + 0.25, 16) } })
    showPageToast('✓ Speed up')
    return true
  },
  videospeeddown: async () => {
    await executeScript(() => { const v = document.querySelector('video'); if (v) { v.playbackRate = Math.max(v.playbackRate - 0.25, 0.25) } })
    showPageToast('✓ Speed down')
    return true
  },
  videospeedreset: async () => {
    await executeScript(() => { const v = document.querySelector('video'); if (v) v.playbackRate = 1 })
    showPageToast('✓ Speed reset to 1×')
    return true
  },
  videoskipforward: async () => {
    await executeScript(() => { const v = document.querySelector('video'); if (v) v.currentTime += 10 })
    return true
  },
  videoskipback: async () => {
    await executeScript(() => { const v = document.querySelector('video'); if (v) v.currentTime -= 10 })
    return true
  },

  // -- Search providers --
  searchyoutube: async () => {
    const results = await executeScript(() => window.getSelection()?.toString())
    const selection = results?.[0]?.result
    if (selection) {
      const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
      await browser.tabs.create({ url: `https://www.youtube.com/results?search_query=${encodeURIComponent(selection)}`, index: tab.index + 1 })
    }
    return true
  },
  searchwikipedia: async () => {
    const results = await executeScript(() => window.getSelection()?.toString())
    const selection = results?.[0]?.result
    if (selection) {
      const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
      await browser.tabs.create({ url: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(selection)}`, index: tab.index + 1 })
    }
    return true
  },
  searchgithub: async () => {
    const results = await executeScript(() => window.getSelection()?.toString())
    const selection = results?.[0]?.result
    if (selection) {
      const [tab] = await browser.tabs.query({ currentWindow: true, active: true })
      await browser.tabs.create({ url: `https://github.com/search?q=${encodeURIComponent(selection)}&type=repositories`, index: tab.index + 1 })
    }
    return true
  },
}

/**
 * Handle an action by looking it up in the action registry.
 * Returns true if the action was handled, false otherwise.
 */
export async function handleAction(action: string, request: KeySetting = {} as KeySetting): Promise<boolean> {
  const handler = actionHandlers[action]
  if (handler) {
    return handler(request)
  }
  return false
}

export { selectTab }
