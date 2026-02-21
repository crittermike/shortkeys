import { executeScript } from '../utils/execute-script'
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
    await browser.tabs.create({ url: 'chrome://settings', active: true })
    return true
  },
  openextensions: async () => {
    await browser.tabs.create({ url: 'chrome://extensions', active: true })
    return true
  },
  openshortcuts: async () => {
    await browser.tabs.create({ url: 'chrome://extensions/shortcuts', active: true })
    return true
  },

  // -- Tab switching --
  nexttab: async () => { await selectTab('next'); return true },
  prevtab: async () => { await selectTab('previous'); return true },
  firsttab: async () => { await selectTab('first'); return true },
  lasttab: async () => { await selectTab('last'); return true },

  // -- Tab management --
  newtab: async () => { await browser.tabs.create({}); return true },

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
    await browser.windows.create({ url: tab.url })
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
    copyToClipboard(tab.url!)
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
  newwindow: async () => { await browser.windows.create(); return true },
  newprivatewindow: async () => { await browser.windows.create({ incognito: true }); return true },

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
    if (downloads?.length > 0) {
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
  top: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => window.scrollTo({ left: 0, top: 0, behavior: s as ScrollBehavior }), [s])
    return true
  },
  bottom: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: s as ScrollBehavior }), [s])
    return true
  },
  scrollup: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => window.scrollBy({ left: 0, top: -50, behavior: s as ScrollBehavior }), [s])
    return true
  },
  scrollupmore: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => window.scrollBy({ left: 0, top: -500, behavior: s as ScrollBehavior }), [s])
    return true
  },
  pageup: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => window.scrollBy({ left: 0, top: -window.innerHeight, behavior: s as ScrollBehavior }), [s])
    return true
  },
  scrolldown: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => window.scrollBy({ left: 0, top: 50, behavior: s as ScrollBehavior }), [s])
    return true
  },
  scrolldownmore: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => window.scrollBy({ left: 0, top: 500, behavior: s as ScrollBehavior }), [s])
    return true
  },
  pagedown: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => window.scrollBy({ left: 0, top: window.innerHeight, behavior: s as ScrollBehavior }), [s])
    return true
  },
  scrollleft: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => window.scrollBy({ left: -50, top: 0, behavior: s as ScrollBehavior }), [s])
    return true
  },
  scrollleftmore: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => window.scrollBy({ left: -500, top: 0, behavior: s as ScrollBehavior }), [s])
    return true
  },
  scrollright: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => window.scrollBy({ left: 50, top: 0, behavior: s as ScrollBehavior }), [s])
    return true
  },
  scrollrightmore: async (r) => {
    const s = r.smoothScrolling ? 'smooth' : 'auto'
    await executeScript((s: string) => window.scrollBy({ left: 500, top: 0, behavior: s as ScrollBehavior }), [s])
    return true
  },

  // -- Bookmarks --
  openbookmark: async (request) => {
    const nodes = await browser.bookmarks.search({ title: request.bookmark! })
    const openNode = nodes.reverse().find((n) => n.url && n.title === request.bookmark)
    if (openNode?.url) {
      if (openNode.url.startsWith('javascript:')) {
        const code = decodeURIComponent(openNode.url.replace('javascript:', ''))
        await executeScript(
          (code: string) =>
            document.dispatchEvent(new CustomEvent('shortkeys_js_run', { detail: code })),
          [code],
        )
      } else {
        await browser.tabs.update(undefined as any, { url: decodeURI(openNode.url) })
      }
    }
    return true
  },

  openbookmarknewtab: async (request) => {
    const nodes = await browser.bookmarks.search({ title: request.bookmark! })
    const openNode = nodes.reverse().find((n) => n.url && n.title === request.bookmark)
    if (openNode?.url) {
      await browser.tabs.create({ url: decodeURI(openNode.url) })
    }
    return true
  },

  openbookmarkbackgroundtab: async (request) => {
    const nodes = await browser.bookmarks.search({ title: request.bookmark! })
    const openNode = nodes.reverse().find((n) => n.url && n.title === request.bookmark)
    if (openNode?.url) {
      await browser.tabs.create({ url: decodeURI(openNode.url), active: false })
    }
    return true
  },

  openbookmarkbackgroundtabandclose: async (request) => {
    const nodes = await browser.bookmarks.search({ title: request.bookmark! })
    const openNode = nodes.reverse().find((n) => n.url && n.title === request.bookmark)
    if (openNode?.url) {
      const createdTab = await browser.tabs.create({ url: decodeURI(openNode.url), active: false })
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

  // -- Disable (no-op) --
  disable: () => true,
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
