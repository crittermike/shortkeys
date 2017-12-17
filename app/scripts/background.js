'use strict'
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
  chrome.tabs.query({currentWindow: true}, (tabs) => {
    if (tabs.length <= 1) {
      return
    }
    chrome.tabs.query({currentWindow: true, active: true}, (currentTabInArray) => {
      let currentTab = currentTabInArray[0]
      let toSelect
      switch (direction) {
        case 'next':
          toSelect = tabs[(currentTab.index + 1 + tabs.length) % tabs.length]
          break
        case 'previous':
          toSelect = tabs[(currentTab.index - 1 + tabs.length) % tabs.length]
          break
        case 'first':
          toSelect = tabs[0]
          break
        case 'last':
          toSelect = tabs[tabs.length - 1]
          break
      }
      chrome.tabs.update(toSelect.id, {active: true})
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
  if (keySetting.blacklist !== 'true' && keySetting.blacklist !== 'whitelist') {
    // This shortcut is allowed on all sites (not blacklisted or whitelisted).
    return true
  }
  let allowed = keySetting.blacklist === 'true'
  keySetting.sitesArray.forEach((site) => {
    if (url.match(globToRegex(site))) {
      allowed = !allowed
    }
  })
  return allowed
}

let handleAction = (action, request = {}) => {
  if (action === 'cleardownloads') {
    chrome.browsingData.remove({'since': 0}, {'downloads': true})
  } else if (action === 'viewsource') {
    chrome.tabs.query({currentWindow: true, active: true}, (tab) => {
      chrome.tabs.create({url: 'view-source:' + tab[0].url})
    })
  } else if (action === 'nexttab') {
    selectTab('next')
  } else if (action === 'prevtab') {
    selectTab('previous')
  } else if (action === 'firsttab') {
    selectTab('first')
  } else if (action === 'lasttab') {
    selectTab('last')
  } else if (action === 'newtab') {
    chrome.tabs.create({})
  } else if (action === 'reopentab') {
    chrome.sessions.getRecentlyClosed({maxResults: 1}, function (sessions) {
      let closedTab = sessions[0]
      chrome.sessions.restore(closedTab.sessionId)
    })
  } else if (action === 'closetab') {
    chrome.tabs.query({currentWindow: true, active: true}, (tab) => {
      chrome.tabs.remove(tab[0].id)
    })
  } else if (action === 'clonetab') {
    chrome.tabs.query({currentWindow: true, active: true}, (tab) => {
      chrome.tabs.duplicate(tab[0].id)
    })
  } else if (action === 'onlytab') {
    chrome.tabs.query({currentWindow: true, pinned: false, active: false}, (tabs) => {
      let ids = []
      tabs.forEach(function (tab) {
        ids.push(tab.id)
      })
      chrome.tabs.remove(ids)
    })
  } else if (action === 'closelefttabs' || action === 'closerighttabs') {
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
      let currentTabIndex = tabs[0].index
      chrome.tabs.query({currentWindow: true, pinned: false, active: false}, (tabs) => {
        let ids = []
        tabs.forEach(function (tab) {
          if ((action === 'closelefttabs' && tab.index < currentTabIndex) ||
            (action === 'closerighttabs' && tab.index > currentTabIndex)) {
            ids.push(tab.id)
          }
        })
        chrome.tabs.remove(ids)
      })
    })
  } else if (action === 'togglepin') {
    chrome.tabs.query({active: true, currentWindow: true}, (tab) => {
      let toggle = !tab[0].pinned
      chrome.tabs.update(tab[0].id, { pinned: toggle })
    })
  } else if (action === 'togglemute') {
    chrome.tabs.query({active: true, currentWindow: true}, (tab) => {
      let toggle = !tab[0].mutedInfo.muted
      chrome.tabs.update(tab[0].id, { muted: toggle })
    })
  } else if (action === 'copyurl') {
    chrome.tabs.query({currentWindow: true, active: true}, (tab) => {
      copyToClipboard(tab[0].url)
    })
  } else if (action === 'searchgoogle') {
    chrome.tabs.executeScript({
      code: 'window.getSelection().toString();'
    }, function (selection) {
      if (selection[0]) {
        let query = encodeURIComponent(selection[0])
        chrome.tabs.create({url: 'https://www.google.com/search?q=' + query})
      }
    })
  } else if (action === 'movetableft') {
    chrome.tabs.query({currentWindow: true, active: true}, (tab) => {
      if (tab[0].index > 0) {
        chrome.tabs.move(tab[0].id, {'index': tab[0].index - 1})
      }
    })
  } else if (action === 'movetabright') {
    chrome.tabs.query({currentWindow: true, active: true}, (tab) => {
      chrome.tabs.move(tab[0].id, {'index': tab[0].index + 1})
    })
  } else if (action === 'gototab') {
    let createNewTab = () => {
      chrome.tabs.create({url: request.openurl})
    }
    if (request.matchurl) {
      let queryOption = {url: request.matchurl}
      if (request.currentWindow) {
        queryOption.currentWindow = true
      }
      chrome.tabs.query(queryOption, function (tabs) {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, {active: true})
          chrome.windows.update(tabs[0].windowId, {focused: true})
        } else {
          createNewTab()
        }
      })
    } else {
      createNewTab()
    }
  } else if (action === 'newwindow') {
    chrome.windows.create()
  } else if (action === 'newprivatewindow') {
    chrome.windows.create({incognito: true})
  } else if (action === 'closewindow') {
    chrome.tabs.query({currentWindow: true, active: true}, (tab) => {
      chrome.windows.remove(tab[0].windowId)
    })
  } else if (action === 'zoomin') {
    chrome.tabs.query({currentWindow: true, active: true}, (tab) => {
      chrome.tabs.getZoom(tab[0].id, (zoomFactor) => {
        console.log(zoomFactor)
        chrome.tabs.setZoom(tab[0].id, zoomFactor + 0.1)
      })
    })
  } else if (action === 'zoomout') {
    chrome.tabs.query({currentWindow: true, active: true}, (tab) => {
      chrome.tabs.getZoom(tab[0].id, (zoomFactor) => {
        chrome.tabs.setZoom(tab[0].id, zoomFactor - 0.1)
      })
    })
  } else if (action === 'zoomreset') {
    chrome.tabs.query({currentWindow: true, active: true}, (tab) => {
      chrome.tabs.setZoom(tab[0].id, 0)
    })
  } else if (action === 'back') {
    chrome.tabs.executeScript(null, {'code': 'window.history.back()'})
  } else if (action === 'forward') {
    chrome.tabs.executeScript(null, {'code': 'window.history.forward()'})
  } else if (action === 'reload') {
    chrome.tabs.executeScript(null, {'code': 'window.location.reload()'})
  } else if (action === 'top') {
    chrome.tabs.executeScript(null, {'code': 'window.scrollTo(0, 0)'})
  } else if (action === 'bottom') {
    chrome.tabs.executeScript(null, {'code': 'window.scrollTo(0, document.body.scrollHeight)'})
  } else if (action === 'scrollup') {
    chrome.tabs.executeScript(null, {'code': 'window.scrollBy(0,-50)'})
  } else if (action === 'scrollupmore') {
    chrome.tabs.executeScript(null, {'code': 'window.scrollBy(0,-500)'})
  } else if (action === 'scrolldown') {
    chrome.tabs.executeScript(null, {'code': 'window.scrollBy(0,50)'})
  } else if (action === 'scrolldownmore') {
    chrome.tabs.executeScript(null, {'code': 'window.scrollBy(0,500)'})
  } else if (action === 'scrollleft') {
    chrome.tabs.executeScript(null, {'code': 'window.scrollBy(-50,0)'})
  } else if (action === 'scrollleftmore') {
    chrome.tabs.executeScript(null, {'code': 'window.scrollBy(-500,0)'})
  } else if (action === 'scrollright') {
    chrome.tabs.executeScript(null, {'code': 'window.scrollBy(50,0)'})
  } else if (action === 'scrollrightmore') {
    chrome.tabs.executeScript(null, {'code': 'window.scrollBy(500,0)'})
  } else if (action === 'openbookmark' || action === 'openbookmarknewtab' || action === 'openbookmarkbackgroundtab') {
    chrome.bookmarks.search({title: request.bookmark}, function (nodes) {
      let openNode
      for (let i = nodes.length; i-- > 0;) {
        let node = nodes[i]
        if (node.url && node.title === request.bookmark) {
          openNode = node
          break
        }
      }
      if (action === 'openbookmark') {
        chrome.tabs.query({currentWindow: true, active: true}, (tab) => {
          chrome.tabs.update(tab[0].id, {url: decodeURI(openNode.url)})
        })
      } else if (action === 'openbookmarkbackgroundtab') {
        chrome.tabs.create({url: decodeURI(openNode.url), active: false})
      } else {
        chrome.tabs.create({url: decodeURI(openNode.url)})
      }
    })
  } else {
    return false
  }
  return true
}

chrome.commands.onCommand.addListener(function (command) {
  // Remove the integer and hyphen at the beginning.
  command = command.split('-')[1]
  handleAction(command)
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  const action = request.action
  if (action === 'getKeys') {
    const currentUrl = request.url
    if(process.env.VENDOR === 'firefox') {
      sendResponse(browser.storage.local.get().then(function (response) {
        let keys = new Array()
        if (response && response.keys) {
          response.keys.forEach((key) => {
            if (isAllowedSite(key, currentUrl)) {
              keys.push(key)
            }
          })
        }
        return keys
      }))
    } else{
      let settings = JSON.parse(localStorage.shortkeys)
      let keys = []
      if (settings.keys.length > 0) {
        settings.keys.forEach((key) => {
          if (isAllowedSite(key, currentUrl)) {
            keys.push(key)
          }
        })
      }
      sendResponse(keys)
    }
  } else {
    handleAction(action, request)
  }
})
