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
        default:
          let index = parseInt(direction) || 0
          if (index >= 1 && index <= tabs.length) {
            toSelect = tabs[index - 1]
          } else {
            return
          }
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
        chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
          chrome.tabs.create({url: 'https://www.google.com/search?q=' + query, index: tabs[0].index + 1})
        })
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
  } else if (action === 'gototabbytitle') {
    if (request.matchtitle) {
      let queryOption = {title: request.matchtitle}
      if (request.currentWindow) {
        queryOption.currentWindow = true
      }
      chrome.tabs.query(queryOption, function (tabs) {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, {active: true})
          chrome.windows.update(tabs[0].windowId, {focused: true})
        }
      })
    }
  } else if (action === 'gototabbyindex') {
    if (request.matchindex) {
      selectTab(request.matchindex)
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
  } else if (action === "updateShortkeys") {
    chrome.tabs.query({discarded: false}, (tabs) => {
      for (let tab of tabs) {
        if (request.inject) {
          let hasLoadedContentScript = false

          chrome.tabs.sendMessage(tab.id, {action: "update"}, function (response) {
            if (chrome.runtime.lastError) {
              return
            }
            if (response && response.handled !== undefined) {
              hasLoadedContentScript = true
            }
          })

          let timeout = 1000
          if (request.timeout) {
            timeout = request.timeout
          }
          setTimeout(function () {
            if (!hasLoadedContentScript) {
              let details = {
                file: "/vendor/mousetrap.min.js",
                allFrames: true,
                matchAboutBlank: true,
                runAt: "document_end",
              }
              chrome.tabs.executeScript(tab.id, details, function () {
                if (chrome.runtime.lastError) {
                  return
                }
                details.file = "/scripts/contentscript.js"
                chrome.tabs.executeScript(tab.id, details)
              })
            }
          }, timeout)
        } else {
          chrome.tabs.sendMessage(tab.id, {action: "update"})
        }
      }
    })
  } else if (action === "log") {
    console.log(request.value)
  } else {
    return false
  }
  return true
}

window.scriptStorage = {}
let scriptStorageName = "scriptStorage"
let scriptStorageAlias = "data"

chrome.commands.onCommand.addListener(function (command) {
  // Remove the integer and hyphen at the beginning.
  command = command.split('-')[1]
  handleAction(command)
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  try {
    if (sender.id !== chrome.runtime.id) {
      // Prevent other extensions from interacting with this extension.
      console.log("Guarded against another extension. Extension's id: " + sender.id)
      return
    }
    const action = request.action
    if (!action) {
      return
    }
    let keepResponseOpen = false
    
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
      sendResponse(keys)
    } else if (action === "backgroundoperation") {
      // If callback returns while operation is being processed then ensure that sendResponse isn't disposed:
      keepResponseOpen = true


      // Operation info:
      let args = request.args
      if (!Array.isArray(args)) {
        args = []
      }

      let propertyName = request.property
      let hasFunctionArg = false
      let isFunctionCall = request.operation === "functionCall"
      let isGetOperation = args.length === 0
      let returnValue = undefined
      let operationCompleted = false


      // Make callbacks for args that are functions:
      for (let funcArgIndex of request.functionArgs) {
        if (0 <= funcArgIndex && funcArgIndex < args.length) {
          args[funcArgIndex] = function () {
            sendResponse({ calledArg: funcArgIndex, args: Array.from(arguments) })
          }
          hasFunctionArg = true
        }
      }


      // Set property filters:
      let allowedGlobals = [
        scriptStorageAlias
      ]
      let blockedProperties = [
        "addListener"
      ]
      if (isFunctionCall || isGetOperation) {
        allowedGlobals.push(
          "chrome",
          "browser"
        )
      }


      let executeOperation = async function () {
        try {
          // Find property:
          let target = window
          let properties = propertyName.split(".")
          for (let i = 0; i < properties.length; i++) {
            let property = properties[i]
            if (!target) {
              break
            }
            if (target === window) {
              if (allowedGlobals.indexOf(property) < 0) {
                throw new Error(
                  "Property not allowed!" +
                  "\nFull property name: " + propertyName +
                  "\nAllowed globals: " + allowedGlobals.map(allowed => "\"" + allowed + "\"")
                )
              } else if (property === scriptStorageAlias) {
                // No blocked properties in script storage:
                blockedProperties = []
                // Redirect to real name:
                property = scriptStorageName
              }
            }
            if (blockedProperties.indexOf(property) >= 0) {
              throw new Error(
                "Function not allowed!" +
                "\nFull property name: " + propertyName +
                "\nBlocked functions: " + blockedProperties.map(blocked => "\"" + blocked + "\"")
              )
            }

            if (isFunctionCall || i + 1 < properties.length) {
              target = target[property]
            } else {
              // Set or get a value:
              if (isGetOperation) {
                returnValue = target[property]
              } else {
                target[property] = args[0]
              }
              operationCompleted = true
            }
          }


          // Execute operation:
          if (isFunctionCall && target && typeof target === "function") {
            returnValue = target.apply(null, args)
            operationCompleted = true
          }

          if (!operationCompleted) {
            throw new Error(
              "Property not found!" +
              "\nFull property name: " + propertyName
            )
          }

          if (!hasFunctionArg) {
            sendResponse({ result: await returnValue })
          }
        } catch (error) {
          hasFunctionArg = false
          sendResponse({ error: error.message })
        }
        if (!hasFunctionArg)
          keepResponseOpen = false
      }
      executeOperation()  // will return with a promise on first "await" used on a promise
    } else {
      handleAction(action, request)
    }

    if (keepResponseOpen)
      return true
  } catch (error) {
    console.log("Message handling failed:\n" + error)
  }
})

chrome.runtime.onInstalled.addListener(function (details) {
  console.log(
    "Extension install event:" +
    "\nReason: " + details.reason +
    "\nPrevious version" + details.previousVersion +
    "\nid: " + details.id
  )

  if (details.reason && (details.reason === "update" || details.reason === "install")) {
    console.log("Extension installed or updated. Checking if content scripts are loaded.")
    handleAction("updateShortkeys", { inject: true })
  }
})
