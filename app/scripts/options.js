'use strict';
/* jshint undef: false, unused: false */

var app = angular.module('ShortkeysOptions', ['ui.bootstrap', 'ui.codemirror', 'localytics.directives']);

app.controller('ShortkeysOptionsCtrl', ['$scope', function($scope) {

  // Set some options for CodeMirror.
  $scope.editorOptions = {
    lineWrapping : true,
    autoCloseBrackets: true,
    mode: 'javascript'
  };

  // Create the possible list of actions.
  $scope.actionOptions = [
    {value:'top', label: 'Scroll to top', group: 'Scrolling'},
    {value:'bottom', label: 'Scroll to bottom', group: 'Scrolling'},
    {value:'scrolldown', label: 'Scroll down', group: 'Scrolling'},
    {value:'scrolldownmore', label: 'Scroll down more', group: 'Scrolling'},
    {value:'scrollup', label: 'Scroll up', group: 'Scrolling'},
    {value:'scrollupmore', label: 'Scroll up more', group: 'Scrolling'},
    {value:'scrollright', label: 'Scroll right', group: 'Scrolling'},
    {value:'scrollrightmore', label: 'Scroll right more', group: 'Scrolling'},
    {value:'scrollleft', label: 'Scroll left', group: 'Scrolling'},
    {value:'scrollleftmore', label: 'Scroll left more', group: 'Scrolling'},
    {value:'back', label: 'Go back', group: 'Location'},
    {value:'forward', label: 'Go forward', group: 'Location'},
    {value:'reload', label: 'Reload page', group: 'Location'},
    {value:'copyurl', label: 'Copy URL', group: 'Location'},
    {value:'openbookmark', label: 'Open Bookmark/Bookmarklet', group: 'Location'},
    {value:'gototab', label: 'Jump to tab or URL', group: 'Tabs'},
    {value:'newtab', label: 'New tab', group: 'Tabs'},
    {value:'closetab', label: 'Close tab', group: 'Tabs'},
    {value:'onlytab', label: 'Close other tabs', group: 'Tabs'},
    {value:'clonetab', label: 'Duplicate tab', group: 'Tabs'},
    {value:'nexttab', label: 'Next tab', group: 'Tabs'},
    {value:'prevtab', label: 'Previous tab', group: 'Tabs'},
    {value:'firsttab', label: 'First tab', group: 'Tabs'},
    {value:'lasttab', label: 'Last tab', group: 'Tabs'},
    {value:'togglepin', label: 'Pin/unpin tab', group: 'Tabs'},
    {value:'movetableft', label: 'Move tab left', group: 'Tabs'},
    {value:'movetabright', label: 'Move tab right', group: 'Tabs'},
    {value:'zoomin', label: 'Zoom In', group: 'Zooming'},
    {value:'zoomout', label: 'Zoom Out', group: 'Zooming'},
    {value:'zoomreset', label: 'Reset Zoom', group: 'Zooming'},
    {value:'javascript', label: 'Run JavaScript', group: 'Other'},
    {value:'cleardownloads', label: 'Clear downloads', group: 'Other'},
    {value:'disable', label: 'Do nothing (disable Chrome shortcut)', group: 'Other'},
    {value:'buttonnexttab', label: 'Click button and switch to next tab (for Tribal Wars players)', group: 'Other'}
  ];

  // Create a default alert.
  $scope.alerts = [{ type: 'warning', msg: 'You MUST reload your browser or tabs after making changes here!'}];

  /**
   * Close/remove an alert at a given index.
   *
   * @param index
   */
  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

  /**
   * Create a flat list of bookmarks from a tree.
   *
   * @param bookmarkTreeNodes
   */
  var traverseBookmarks = function(bookmarkTreeNodes) {
    for(var i = 0; i < bookmarkTreeNodes.length; i++) {
      $scope.bookmarks.push(bookmarkTreeNodes[i].title);
      if(bookmarkTreeNodes[i].children) {
        traverseBookmarks(bookmarkTreeNodes[i].children);
      }
    }
  };

  // Create the list of bookmarks for selection as an action.
  $scope.bookmarks = [];
  chrome.bookmarks.getTree(function(results) {
    traverseBookmarks(results);
    $scope.bookmarks.sort();
    $scope.bookmarks = $scope.bookmarks.filter(function(n) {
      return n !== '';
    });
  });

  /**
   * Given an action machine name, return the readable label for the given action.
   *
   * @param action
   */
  var actionToLabel = function(action) {
    if (action === 'none') {
      return 'New keyboard shortcut';
    }
    for (var i = 0, len = $scope.actionOptions.length; i < len; i++) {
      if ($scope.actionOptions[i].value === action) {
        return $scope.actionOptions[i].label;
      }
    }
  };

  $scope.keyLabel = function(key) {
    if (key.customName) {
      return key.customName;
    } else {
      return actionToLabel(key.action);
    }
  };

  $scope.keys = [];

  /**
   * If we don't have any shortcuts configured, add an empty one.
   */
  $scope.addBlankIfEmpty = function () {
    if ($scope.keys.length === 0) {
      $scope.addEmpty();
    }
  };

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
    });
  };

  /**
   * Delete a shortcut at a given index. Used by the "Delete" buttons/links.
   *
   * @param index
   */
  $scope.deleteKey = function (index) {
    $scope.keys.splice(index, 1);
  };

  /**
   * Save the config form to Chrome sync and localStorage.
   */
  $scope.saveKeys = function () {

    // Remove empty keys
    $scope.keys = $scope.keys.filter(function(element) {
      return element && element.key !== '';
    });

    // Convert the "sites" textarea for each shortcut into an array separated by newlines.
    for (var i = 0; i < $scope.keys.length; i++) {
      $scope.keys[i].open = false; // Close up the open accordions.
      if (typeof $scope.keys[i].sites === 'string') {
        $scope.keys[i].sitesArray = $scope.keys[i].sites.split('\n');
      } else {
        $scope.keys[i].sitesArray = $scope.keys[i].sites;
      }
    }

    // Save the settings to Chrome storage sync and localStorage.
    var settings = {keys: $scope.keys};
    chrome.storage.sync.set(settings, function () {});
    localStorage.shortkeys = JSON.stringify(settings);

    // Add a success messsage, an empty config if needed, and scroll up.
    $scope.alerts = [{ type: 'success', msg: 'Your settings were saved! Remember to reload the window or individual tabs to pick up the changes.'}];
    $scope.addBlankIfEmpty();
    window.scroll(0, 0);
  };

  // Attempt to fetch config from Chrome storage sync, and fall back to localStorage
  // if not found (i.e., if the user never enabled sync in version 1.
  chrome.storage.sync.get(null, function (response) {
    if (response && response.keys) {
      $scope.keys = response.keys;
    } else {
      var settingsStr = localStorage.shortkeys;
      if (settingsStr) {
        var settings = JSON.parse(settingsStr);
        $scope.keys = settings.keys || [];
      }
    }
    $scope.addBlankIfEmpty();
    $scope.$apply();
  });
}]);
