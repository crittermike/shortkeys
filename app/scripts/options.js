'use strict'
/* jshint undef: false, unused: false */
/* global localStorage */

import angular from 'angular'
import CodeMirror from 'codemirror'
import 'codemirror/mode/javascript/javascript.js'
import 'codemirror/addon/edit/closebrackets.js'
import 'codemirror/addon/edit/matchbrackets.js'
import 'angular-ui-bootstrap'
import 'angular-ui-codemirror'

window.CodeMirror = CodeMirror
let app = angular.module('ShortkeysOptions', ['ui.bootstrap', 'ui.codemirror'])

app.controller('ShortkeysOptionsCtrl', ['$scope', function ($scope) {
  // Set some options for CodeMirror.
  $scope.editorOptions = {
    lineWrapping: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    mode: 'javascript'
  }

  // Create the possible list of actions.
  $scope.actionOptions = [
    {value: 'top', label: 'Scroll to top', group: 'Scrolling', builtin: true},
    {value: 'bottom', label: 'Scroll to bottom', group: 'Scrolling', builtin: true},
    {value: 'scrolldown', label: 'Scroll down', group: 'Scrolling', builtin: true},
    {value: 'scrolldownmore', label: 'Scroll down more', group: 'Scrolling', builtin: true},
    {value: 'scrollup', label: 'Scroll up', group: 'Scrolling', builtin: true},
    {value: 'scrollupmore', label: 'Scroll up more', group: 'Scrolling', builtin: true},
    {value: 'scrollright', label: 'Scroll right', group: 'Scrolling', builtin: true},
    {value: 'scrollrightmore', label: 'Scroll right more', group: 'Scrolling', builtin: true},
    {value: 'scrollleft', label: 'Scroll left', group: 'Scrolling', builtin: true},
    {value: 'scrollleftmore', label: 'Scroll left more', group: 'Scrolling', builtin: true},
    {value: 'back', label: 'Go back', group: 'Location', builtin: true},
    {value: 'forward', label: 'Go forward', group: 'Location', builtin: true},
    {value: 'reload', label: 'Reload page', group: 'Location', builtin: true},
    {value: 'copyurl', label: 'Copy URL', group: 'Location', builtin: true},
    {value: 'searchgoogle', label: 'Search Google for selected text', group: 'Location', builtin: true},
    {value: 'openbookmark', label: 'Open bookmark/bookmarklet in current tab', group: 'Bookmarks'},
    {value: 'openbookmarknewtab', label: 'Open bookmark/bookmarklet in new tab', group: 'Bookmarks'},
    {value: 'openbookmarkbackgroundtab', label: 'Open bookmark/bookmarklet in new background tab', group: 'Bookmarks'},
    {value: 'gototab', label: 'Jump to tab or URL', group: 'Tabs'},
    {value: 'newtab', label: 'New tab', group: 'Tabs', builtin: true},
    {value: 'closetab', label: 'Close tab', group: 'Tabs', builtin: true},
    {value: 'onlytab', label: 'Close other tabs', group: 'Tabs', builtin: true},
    {value: 'closelefttabs', label: 'Close tabs to the left', group: 'Tabs', builtin: true},
    {value: 'closerighttabs', label: 'Close tabs to the right', group: 'Tabs', builtin: true},
    {value: 'clonetab', label: 'Duplicate tab', group: 'Tabs', builtin: true},
    {value: 'reopentab', label: 'Reopen last closed tab', group: 'Tabs', builtin: true},
    {value: 'nexttab', label: 'Next tab', group: 'Tabs', builtin: true},
    {value: 'prevtab', label: 'Previous tab', group: 'Tabs', builtin: true},
    {value: 'firsttab', label: 'First tab', group: 'Tabs', builtin: true},
    {value: 'lasttab', label: 'Last tab', group: 'Tabs', builtin: true},
    {value: 'togglepin', label: 'Pin/unpin tab', group: 'Tabs', builtin: true},
    {value: 'togglemute', label: 'Mute/unmute tab', group: 'Tabs', builtin: true},
    {value: 'movetableft', label: 'Move tab left', group: 'Tabs', builtin: true},
    {value: 'movetabright', label: 'Move tab right', group: 'Tabs', builtin: true},
    {value: 'newwindow', label: 'New window', group: 'Windows', builtin: true},
    {value: 'newprivatewindow', label: 'New private window', group: 'Windows', builtin: true},
    {value: 'closewindow', label: 'Close window', group: 'Windows', builtin: true},
    {value: 'zoomin', label: 'Zoom In', group: 'Zooming', builtin: true},
    {value: 'zoomout', label: 'Zoom Out', group: 'Zooming', builtin: true},
    {value: 'zoomreset', label: 'Reset Zoom', group: 'Zooming', builtin: true},
    {value: 'javascript', label: 'Run JavaScript', group: 'Other'},
    {value: 'cleardownloads', label: 'Clear downloads', group: 'Other', builtin: true},
    {value: 'viewsource', label: 'View source', group: 'Other', builtin: true},
    {value: 'disable', label: 'Do nothing (disable browser shortcut)', group: 'Other', builtin: true},
    {value: 'trigger', label: 'Trigger another shortcut', group: 'Other'},
    {value: 'buttonnexttab', label: 'Click button and switch to next tab (for Tribal Wars players)', group: 'Other'}
  ]

  $scope.isBuiltIn = function (action) {
    for (let i = 0, len = $scope.actionOptions.length; i < len; i++) {
      if ($scope.actionOptions[i].value === action) {
        // Firefox doesn't have a UI for keyboard shortcuts yet.
        return ($scope.actionOptions[i].builtin || false) && process.env.VENDOR !== 'firefox'
      }
    }
  }

  // Create a default alert.
  $scope.alerts = []

  /**
   * Create a flat list of bookmarks from a tree.
   *
   * @param bookmarkTreeNodes
   */
  let traverseBookmarks = function (bookmarkTreeNodes) {
    for (let i = 0; i < bookmarkTreeNodes.length; i++) {
      $scope.bookmarks.push(bookmarkTreeNodes[i].title)
      if (bookmarkTreeNodes[i].children) {
        traverseBookmarks(bookmarkTreeNodes[i].children)
      }
    }
  }

  // Create the list of bookmarks for selection as an action.
  $scope.bookmarks = []
  chrome.bookmarks.getTree(function (results) {
    traverseBookmarks(results)
    $scope.bookmarks.sort()
    $scope.bookmarks = $scope.bookmarks.filter(function (n) {
      return n !== ''
    })
  })

  /**
   * Given an action machine name, return the readable label for the given action.
   *
   * @param action
   */
  let actionToLabel = function (action) {
    if (action === 'none') {
      return 'New keyboard shortcut'
    }
    for (let i = 0, len = $scope.actionOptions.length; i < len; i++) {
      if ($scope.actionOptions[i].value === action) {
        return $scope.actionOptions[i].label
      }
    }
  }

  $scope.keyLabel = function (key) {
    if (key.customName) {
      return key.customName
    } else {
      return actionToLabel(key.action)
    }
  }

  $scope.keys = []
  $scope.import = {}
  $scope.export = {}

  /**
   * If we don't have any shortcuts configured, add an empty one.
   */
  $scope.addBlankIfEmpty = function () {
    if ($scope.keys.length === 0) {
      $scope.addEmpty()
    }
  }

  /**
   * Add an empty shortcut config so that the user has something to start from.
   */
  $scope.addEmpty = function () {
    $scope.keys.push({
      key: '',
      action: 'none',
      blacklist: false,
      sites: '*mail.google.com*',
      open: true
    })
  }

  /**
   * Delete a shortcut at a given index. Used by the "Delete" buttons/links.
   *
   * @param index
   */
  $scope.deleteKey = function (index) {
    $scope.keys.splice(index, 1)
  }

  /**
   * Export stringified JSON for a key or set of keys.
   *
   * @param index
   */
  $scope.exportKey = function (index) {
    $scope.exportedConfig = []
    $scope.keys.forEach((key, index) => {
      if (key.exported) {
        $scope.exportedConfig.push($scope.keys[index])
      }
    })
    $scope.exportText = JSON.stringify($scope.exportedConfig)
  }

  /**
   * Check or uncheck all of the export checkboxes for all keys.
   */
  $scope.toggleExportAll = function () {
    $scope.keys.forEach((key, index) => {
      key.exported = $scope.export.isAllExported
      $scope.exportKey(index)
    })
  }

  /**
   * Import keys from a stringified JSON paste.
   */
  $scope.importKeys = function () {
    try {
      let config = JSON.parse($scope.import.text)
      $scope.keys = $scope.keys.concat(config)
      $scope.saveKeys()
    } catch (e) {
      $scope.alerts = [{
        type: 'danger',
        msg: 'Error: invalid settings. Are you sure you copied correctly?'
      }]
    }
  }

  /**
   * Save the config form to Chrome sync and localStorage.
   */
  $scope.saveKeys = function () {
    // Remove empty keys
    $scope.keys = $scope.keys.filter(function (element) {
      return element && element.key !== ''
    })

    $scope.export.isAllExported = false

    // Convert the "sites" textarea for each shortcut into an array separated by newlines.
    for (let i = 0; i < $scope.keys.length; i++) {
      $scope.keys[i].open = false // Close up the open accordions.
      $scope.keys[i].exported = false // Close up the open accordions.
      if (typeof $scope.keys[i].sites === 'string') {
        $scope.keys[i].sitesArray = $scope.keys[i].sites.split('\n')
      } else {
        $scope.keys[i].sitesArray = $scope.keys[i].sites
      }
    }

    // Save the settings to Chrome storage sync and localStorage.
    let settings = {keys: $scope.keys}
    chrome.storage.sync.set(settings, function () {
      if (chrome.runtime.lastError) {
        chrome.storage.sync.clear(function () {
          $scope.alerts = [{
            type: 'success',
            msg: "Your settings were saved, but they were too large to be synced to any other Chrome installations you have due to Chrome's 8KB limitation on the storage sync API. Everything will still work, but if you are logged into Chrome on any other computers, the settings won't sync there."
          }]
          $scope.$apply()
        })
      }
    })
    if(process.env.VENDOR === 'firefox') {
      browser.storage.local.set(settings);
    } else{
      localStorage.shortkeys = JSON.stringify(settings) // @TODO: Why are we stringifying? Stop that.
    }

    // Add a success messsage, an empty config if needed, and scroll up.
    $scope.alerts = [{
      type: 'success',
      msg: 'Your settings were saved! Reload your tabs to use your new shortcuts.'
    }]
    $scope.addBlankIfEmpty()
    window.scroll(0, 0)
  }

  // Attempt to fetch config from Chrome storage sync, and fall back to localStorage
  // if not found (i.e., if the user never enabled sync in version 1.
  chrome.storage.sync.get(null, function (response) {
    if (response && response.keys) {
      $scope.keys = response.keys
    } else if(process.env.VENDOR === 'firefox') {
      browser.storage.local.get().then(function (response) {
        if (response) {
          $scope.keys = response.keys || []
        }

        $scope.addBlankIfEmpty()
        $scope.$apply()
      })
      return
    } else {
      let settingsStr = localStorage.shortkeys
      if (settingsStr) {
        let settings = JSON.parse(settingsStr)
        $scope.keys = settings.keys || []
      }
    }
    $scope.addBlankIfEmpty()
    $scope.$apply()
  })
}])
