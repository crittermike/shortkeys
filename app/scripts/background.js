'use strict'

import captureScreenshot from './actions/captureScreenshot'
import lastUsedTab from './actions/lastUsedTab'

/* global localStorage, chrome */

let copyToClipboard = (text) => {
  let copyDiv = document.createElement('div')
  copyDiv.contentEditable = true
  document.body.appendChild(copyDiv)
  copyDiv.innerHTML = text
  copyDiv.unselectable = 'off'
  copyDiv.focus()
  document.execCommand('SelectAll')
  document.execCommand('Copy', false, null)
  document.body.removeChild(copyDiv)
}

let selectTab = (direction) => {
  let searchParam = { currentWindow: true };
  if (process.env.VENDOR === 'firefox') {
    searchParam.hidden = false;
  }
  browser.tabs.query(searchParam).then(function(tabs) {
    if (tabs.length <= 1) {
      return
    }
    browser.tabs.query({currentWindow: true, active: true}).then(function(currentTabInArray) {
      let currentTab = currentTabInArray[0]
      let currentTabIndex = tabs.findIndex(i => i.id === currentTab.id);
      let toSelect
      switch (direction) {
        case 'next':
          toSelect = tabs[(currentTabIndex + 1 + tabs.length) % tabs.length]
          break
        case 'previous':
          toSelect = tabs[(currentTabIndex - 1 + tabs.length) % tabs.length]
          break
        case 'first':
          toSelect = tabs[0]
          break
        case 'last':
          toSelect = tabs[tabs.length - 1]
          break
        default:
          let index = parseInt(direction) || 0
          if (index >= 1 && index <= tabs.length) {
            toSelect = tabs[index - 1]
          } else {
            return
          }
      }
      browser.tabs.update(toSelect.id, {active: true})
    })
  })
}

/**
 * Helper function to convert glob/wildcard * syntax to valid RegExp for URL checking.
 *
 * @param glob
 * @returns {RegExp}
 */
let globToRegex = function (glob) {
  // Use a regexp if the url starts and ends with a slash `/`
  if (/^\/.*\/$/.test(glob)) return new RegExp(glob.replace(/^\/(.*)\/$/, '$1'))

  const specialChars = '\\^$*+?.()|{}[]'
  let regexChars = ['^']
  for (let i = 0; i < glob.length; ++i) {
    let c = glob.charAt(i)
    if (c === '*') {
      regexChars.push('.*')
    } else {
      if (specialChars.indexOf(c) >= 0) {
        regexChars.push('\\')
      }
      regexChars.push(c)
    }
  }
  regexChars.push('$')
  return new RegExp(regexChars.join(''))
}

/**
 * Helper function to determine if the current site is blacklisted or not.
 *
 * @param keySetting
 * @param url
 * @returns {boolean}
 */
let isAllowedSite = function (keySetting, url) {
  if (!keySetting.blacklist || keySetting.blacklist === 'false') {
    // This shortcut is allowed on all sites (not blacklisted or whitelisted).
    return true
  }
  let allowed = (keySetting.blacklist === true || keySetting.blacklist === 'true')
  keySetting.sitesArray.forEach((site) => {
    if (url.match(globToRegex(site))) {
      allowed = !allowed
    }
  })
  return allowed
}

let handleAction = (action, request = {}) => {
  var smoothScrolling = request.smoothScrolling ? 'smooth' : 'auto';
  if (action === 'cleardownloads') {
    browser.browsingData.remove({'since': 0}, {'downloads': true})
  } else if (action === 'viewsource') {
    browser.tabs.query({currentWindow: true, active: true}).then(function (tab) {
      browser.tabs.create({url: 'view-source:' + tab[0].url})
    })
  } else if (action === 'print') {
    browser.tabs.executeScript(null, {'code': 'window.print()'})
  } else if (action === 'opensettings') {
    browser.tabs.create({ url: 'chrome://settings', active: true })
  } else if (action === 'openextensions') {
    browser.tabs.create({ url: 'chrome://extensions', active: true })
  } else if (action === 'openshortcuts') {
    browser.tabs.create({ url: 'chrome://extensions/shortcuts', active: true })
  } else if (action === 'nexttab') {
    selectTab('next')
  } else if (action === 'prevtab') {
    selectTab('previous')
  } else if (action === 'firsttab') {
    selectTab('first')
  } else if (action === 'lasttab') {
    selectTab('last')
  } else if (action === 'lastusedtab') {
    lastUsedTab()
  } else if (action === 'newtab') {
    browser.tabs.create({})
  } else if (action === 'reopentab') {
    browser.sessions.getRecentlyClosed({maxResults: 1}).then(function(sessions) {
      let closedTab = sessions[0]
      browser.sessions.restore(closedTab.sessionId)
    })
  } else if (action === 'closetab') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.remove(tab[0].id)
    })
  } else if (action === 'clonetab') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.duplicate(tab[0].id)
    })
  } else if (action === 'movetabtonewwindow') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.windows.create({url: tab[0].url})
      browser.tabs.remove(tab[0].id)
    })
  } else if (action === 'onlytab') {
    browser.tabs.query({currentWindow: true, pinned: false, active: false}).then(function(tabs) {
      let ids = []
      tabs.forEach(function (tab) {
        ids.push(tab.id)
      })
      browser.tabs.remove(ids)
    })
  } else if (action === 'closelefttabs' || action === 'closerighttabs') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tabs) {
      let currentTabIndex = tabs[0].index
      browser.tabs.query({currentWindow: true, pinned: false, active: false}).then(function(tabs) {
        let ids = []
        tabs.forEach(function (tab) {
          if ((action === 'closelefttabs' && tab.index < currentTabIndex) ||
              (action === 'closerighttabs' && tab.index > currentTabIndex)) {
            ids.push(tab.id)
          }
        })
        browser.tabs.remove(ids)
      })
    })
  } else if (action === 'togglepin') {
    browser.tabs.query({active: true, currentWindow: true}).then(function(tab) {
      let toggle = !tab[0].pinned
      browser.tabs.update(tab[0].id, { pinned: toggle })
    })
  } else if (action === 'togglemute') {
    browser.tabs.query({active: true, currentWindow: true}).then(function(tab) {
      let toggle = !tab[0].mutedInfo.muted
      browser.tabs.update(tab[0].id, { muted: toggle })
    })
  } else if (action === 'copyurl') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      copyToClipboard(tab[0].url)
    })
  } else if (action === 'searchgoogle') {
    browser.tabs.executeScript({
      code: 'window.getSelection().toString();'
    }).then(function(selection) {
      if (selection[0]) {
        let query = encodeURIComponent(selection[0])
        browser.tabs.query({currentWindow: true, active: true}).then(function(tabs) {
          browser.tabs.create({url: 'https://www.google.com/search?q=' + query, index: tabs[0].index + 1})
        })
      }
    })
  } else if (action === 'movetableft') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      if (tab[0].index > 0) {
        browser.tabs.move(tab[0].id, {'index': tab[0].index - 1})
      }
    })
  } else if (action === 'movetabright') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.move(tab[0].id, {'index': tab[0].index + 1})
    })
  } else if (action === 'movetabtofirst') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      if (tab[0].index > 0) {
        chrome.tabs.move(tab[0].id, {'index': 0})
      }
    })
  } else if (action === 'movetabtolast') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.move(tab[0].id, {'index': -1})
    })
  } else if (action === 'gototab') {
    let createNewTab = () => {
      browser.tabs.create({url: request.openurl})
    }
    if (request.matchurl) {
      let queryOption = {url: request.matchurl}
      if (request.currentWindow) {
        queryOption.currentWindow = true
      }
      browser.tabs.query(queryOption).then(function(tabs) {
        if (tabs.length > 0) {
          browser.tabs.update(tabs[0].id, {active: true})
          browser.windows.update(tabs[0].windowId, {focused: true})
        } else {
          createNewTab()
        }
      })
    } else {
      createNewTab()
    }
  } else if (action === 'gototabbytitle') {
    if (request.matchtitle) {
      let queryOption = {title: request.matchtitle}
      if (request.currentWindow) {
        queryOption.currentWindow = true
      }
      browser.tabs.query(queryOption).then(function (tabs) {
        if (tabs.length > 0) {
          browser.tabs.update(tabs[0].id, {active: true})
          browser.windows.update(tabs[0].windowId, {focused: true})
        }
      })
    }
  } else if (action === 'gototabbyindex') {
    if (request.matchindex) {
      selectTab(request.matchindex)
    }
  } else if (action === 'newwindow') {
    browser.windows.create()
  } else if (action === 'newprivatewindow') {
    browser.windows.create({incognito: true})
  } else if (action === 'closewindow') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.windows.remove(tab[0].windowId)
    })
  } else if (action === 'fullscreen') {
    browser.windows.getCurrent().then(function(window) {
      var state = (window.state === 'fullscreen') ? 'normal' : 'fullscreen';
      browser.windows.update(window.id, {state: state})
    })
  } else if (action === 'zoomin') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.getZoom(tab[0].id).then(function(zoomFactor) {
        browser.tabs.setZoom(tab[0].id, zoomFactor + 0.1)
      })
    })
  } else if (action === 'zoomout') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.getZoom(tab[0].id).then(function(zoomFactor) {
        browser.tabs.setZoom(tab[0].id, zoomFactor - 0.1)
      })
    })
  } else if (action === 'zoomreset') {
    browser.tabs.query({currentWindow: true, active: true}).then(function(tab) {
      browser.tabs.setZoom(tab[0].id, 0)
    })
  } else if (action === 'showlatestdownload') {
    chrome.downloads.search({orderBy: ['-startTime'], state: 'complete'}, downloads => {
      if(downloads && downloads.length > 0 ) {
        chrome.downloads.show(downloads[0].id)
      }
    })
  } else if (action === 'back') {
    browser.tabs.executeScript(null, {'code': 'window.history.back()'})
  } else if (action === 'forward') {
    browser.tabs.executeScript(null, {'code': 'window.history.forward()'})
  } else if (action === 'reload') {
    browser.tabs.executeScript(null, {'code': 'window.location.reload()'})
  } else if (action === 'hardreload') {
    browser.tabs.reload({bypassCache: true});
  } else if (action === 'top') {
    browser.tabs.executeScript(null, {'code': 'window.scrollTo({left: 0, top: 0, behavior: "' + smoothScrolling + '"})'})
  } else if (action === 'bottom') {
    browser.tabs.executeScript(null, {'code': 'window.scrollTo({left: 0, top: document.body.scrollHeight, behavior: "' + smoothScrolling + '"})'})
  } else if (action === 'scrollup') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 0, top: -50, behavior: "' + smoothScrolling + '"})'})
  } else if (action === 'scrollupmore') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 0, top: -500, behavior: "' + smoothScrolling + '"})'})
  } else if (action === 'pageup') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 0, top: -window.innerHeight, behavior: "' + smoothScrolling + '"})'})
  } else if (action === 'scrolldown') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 0, top: 50, behavior: "' + smoothScrolling + '"})'})
  } else if (action === 'scrolldownmore') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 0, top: 500, behavior: "' + smoothScrolling + '"})'})
  } else if (action === 'pagedown') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 0, top: window.innerHeight, behavior: "' + smoothScrolling + '"})'})
  } else if (action === 'scrollleft') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: -50, top: 0, behavior: "' + smoothScrolling + '"})'})
  } else if (action === 'scrollleftmore') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: -500, top: 0, behavior: "' + smoothScrolling + '"})'})
  } else if (action === 'scrollright') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 50, top: 0, behavior: "' + smoothScrolling + '"})'})
  } else if (action === 'scrollrightmore') {
    browser.tabs.executeScript(null, {'code': 'window.scrollBy({left: 500, top: 0, behavior: "' + smoothScrolling + '"})'})
  } else if (action === 'openbookmark' || action === 'openbookmarknewtab' || action === 'openbookmarkbackgroundtab' || action === 'openbookmarkbackgroundtabandclose') {
    browser.bookmarks.search({title: request.bookmark}).then(function(nodes) {
      let openNode
      for (let i = nodes.length; i-- > 0;) {
        let node = nodes[i]
        if (node.url && node.title === request.bookmark) {
          openNode = node
          break
        }
      }
      if (action === 'openbookmark') {
        if (openNode.url.indexOf('javascript:') === 0) {
          browser.tabs.executeScript(null, {'code': decodeURIComponent(openNode.url.replace('javascript:', ''))})
        } else {
          browser.tabs.update(null, {url: decodeURI(openNode.url)})
        }
      } else if (action === 'openbookmarkbackgroundtab') {
        browser.tabs.create({url: decodeURI(openNode.url), active: false})
      } else if (action === 'openbookmarkbackgroundtabandclose') {
        browser.tabs.create({url: decodeURI(openNode.url), active: false}).then(function(createdTab) {
          var closeListener = function (tabId, changeInfo, updatedTab) {
            if (tabId === createdTab.id && changeInfo.status === 'complete') {
              browser.tabs.remove(createdTab.id)
              browser.tabs.onUpdated.removeListener(closeListener)
            }
          }
          browser.tabs.onUpdated.addListener(closeListener)
        });
      } else {
        browser.tabs.create({url: decodeURI(openNode.url)})
      }
    })
  } else if (action === 'openapp') {
    if (request.openappid) {
      browser.management.launchApp(request.openappid)
    }
  } else if (action === 'capturescreenshot') {
    captureScreenshot()
  } else if (action === 'capturefullsizescreenshot') {
    captureScreenshot({fullsize: true})
  } else if (action === 'forcecapturefullsizescreenshot') {
    captureScreenshot({fullsize: true, force: true})
  } else {
    return false
  }
  return true
}

browser.commands.onCommand.addListener(function (command) {
  // Remove the integer and hyphen at the beginning.
  command = command.split('-')[1]
  handleAction(command)
})

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  const action = request.action
  if (action === 'getKeys') {
    const currentUrl = request.url
    let settings = JSON.parse(localStorage.shortkeys)
    let keys = []
    if (settings.keys.length > 0) {
      settings.keys.forEach((key) => {
        if (isAllowedSite(key, currentUrl)) {
          keys.push(key)
        }
      })
    }
  return Promise.resolve(keys)
  }
  handleAction(action, request)
})