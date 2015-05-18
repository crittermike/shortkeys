'use strict';
/* jshint undef: false, unused: false */

var app = angular.module('ShortkeysOptions', ['ui.bootstrap']);

app.controller('ShortkeysOptionsCtrl', function($scope) {

  $scope.actionOptions = [
    {value:'none', label: 'Select an action...', group: ''},
    {value:'top', label: 'Scroll to top', group: 'Scrolling'},
    {value:'bottom', label: 'Scroll to bottom', group: 'Scrolling'},
    {value:'scrolldown', label: 'Scroll down', group: 'Scrolling'},
    {value:'scrolldownmore', label: 'Scroll down more', group: 'Scrolling'},
    {value:'scrollup', label: 'Scroll up', group: 'Scrolling'},
    {value:'scrollupmore', label: 'Scroll up more', group: 'Scrolling'},
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
    {value:'cleardownloads', label: 'Clear downloads', group: 'Downloads'},
    {value:'javascript', label: 'Run JavaScript', group: 'JavaScript'}
  ];

  $scope.actionToLabel = function(action) {
    if (action === 'none') {
      return 'New keyboard shortcut';
    }
    for (var i = 0, len = $scope.actionOptions.length; i < len; i++) {
      if ($scope.actionOptions[i].value === action) {
        return $scope.actionOptions[i].label;
      }
    }
  };

  $scope.keys = [];

  $scope.addBlankIfEmpty = function () {
    if ($scope.keys.length === 0) {
      $scope.addEmpty();
    }
  };

  $scope.addEmpty = function () {
    $scope.keys.push({
      key: '',
      action: 'none',
      blacklist: false,
      sites: '*mail.google.com*',
      open: true
    });
  };

  $scope.isEmpty = function (element, index, array) {
    return element && element.key !== '';
  };

  $scope.deleteKey = function (index) {
    $scope.keys.splice(index, 1);
  };

  $scope.saveKeys = function () {
    $scope.keys = $scope.keys.filter($scope.isEmpty); // Remove empty keys
    for (var i = 0; i < $scope.keys.length; i++) {
      if (typeof $scope.keys[i].sites === 'string') {
        $scope.keys[i].sitesArray = $scope.keys[i].sites.split('\n');
      } else {
        $scope.keys[i].sitesArray = $scope.keys[i].sites;
      }
    }
    var settings = {keys: $scope.keys};
    chrome.storage.sync.set(settings, function () {});
    localStorage.shortkeys = JSON.stringify(settings);

    $scope.alerts = [{ type: 'success', msg: 'Your settings were saved! Remember to reload the window or individual tabs to pick up the changes.'}];
    $scope.addBlankIfEmpty();
    window.scroll(0, 0);
  };

  $scope.mergeInKeys = function (newKeys, noReplace) {
    if (!newKeys) {
      return;
    }
    var keyIndexMap = {};
    for (var i = 0; i < $scope.keys.length; i++) {
      var key = $scope.keys[i];
      keyIndexMap[key.key] = i;
    }
    for (i = 0; i < newKeys.length; i++) {
      var newKey = newKeys[i];
      var index = keyIndexMap[newKey.key];
      if (index === undefined) {
        $scope.keys.push(newKey);
      } else {
        if (!noReplace) {
          $scope.keys[index] = newKey;
        }
      }
    }
  };

  $scope.exportSettings = function () {
    chrome.runtime.sendMessage({
      action: 'exportSettingsToClipboard',
      keys: $scope.keys
    });
  };

  $scope.importSettings = function () {
    chrome.runtime.sendMessage({action: 'importSettingsFromClipboard'}, function (keysStr) {
      var keys;
      try {
        keys = JSON.parse(keysStr);
      } catch (e) {
        alert('Your clipboard contains invalid JSON. Try clicking "Export" again, or paste it into ' +
        'a plain text editor and copying it back out again, to remove any formatting you might have picked up.');
        return;
      }

      if (keys) {
        $scope.mergeInKeys(keys);
        $scope.$apply();
      }
    });
  };

  $scope.settingsStr = localStorage.shortkeys;
  if ($scope.settingsStr) {
    var settings = JSON.parse($scope.settingsStr);
    if (settings.keys !== undefined) {
      $scope.keys = settings.keys || [];
    } else {
      $scope.keys = settings || [];  // This allows for conversion of the previous data format
    }
  }
  chrome.storage.sync.get(null, function (response) {
    if (!response) {
      $scope.addBlankIfEmpty();
    } else {
      $scope.$apply(function () {
        $scope.mergeInKeys(response.keys);
        $scope.addBlankIfEmpty();
      });
    }
  });

  $scope.alerts = [{ type: 'warning', msg: 'You MUST reload your browser or tabs after making changes here!'}];

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };
});
