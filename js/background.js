function copyToClipboard(text) {
  var copyDiv = document.createElement('div');
  copyDiv.contentEditable = true;
  document.body.appendChild(copyDiv);
  copyDiv.innerHTML = text;
  copyDiv.unselectable = "off";
  copyDiv.focus();
  document.execCommand('SelectAll');
  document.execCommand("Copy", false, null);
  document.body.removeChild(copyDiv);
}

function copyFromClipboard() {
  var copyDiv = document.createElement('div');
  copyDiv.contentEditable = true;
  document.body.appendChild(copyDiv);
  copyDiv.innerHTML = text;
  copyDiv.unselectable = "off";
  copyDiv.focus();
  document.execCommand('SelectAll');
  document.execCommand("Paste", false, null);
  var text = copyDiv.innerHTML;
  document.body.removeChild(copyDiv);
  return text;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  var action = request.action;
  if (action == "getKeys") {
    sendResponse(localStorage['shortkeys']);
  }
  else if (action == "importSettingsFromClipboard") {
    var keys_str = copyFromClipboard();
    sendResponse(keys_str);
  }
  else if (action == "exportSettingsToClipboard") {
    var keys_str = JSON.stringify(request.keys);
    copyToClipboard(keys_str);
  }
  else if (action == "cleardownloads") {
    chrome.browsingData.remove({"since": 0}, {"downloads": true});
  }
  else if (action == "nexttab") {
    selectTab("next");
  }
  else if (action == "prevtab") {
    selectTab("previous");
  }
  else if (action == "firsttab") {
    selectTab("first");
  }
  else if (action == "lasttab") {
    selectTab("last");
  }
  else if (action == "newtab") {
    chrome.tabs.create({});
  }
  else if (action == "closetab") {
    chrome.tabs.getSelected(null, function(tab){
      chrome.tabs.remove(tab.id);
    });
  }
  else if (action == "clonetab") {
    chrome.tabs.getSelected(null, function(tab){
      chrome.tabs.duplicate(tab.id);
    });
  }
  else if (action == "onlytab") {
    chrome.tabs.query({ windowId: chrome.windows.WINDOW_ID_CURRENT, pinned: false, active: false }, function(tabs){
      var ids = new Array();
      tabs.forEach(function(tab) {
        ids.push(tab.id);
      });
      chrome.tabs.remove(ids);
    });
  }
  else if (action == "togglepin") {
    chrome.tabs.getSelected(null, function(tab){
      var toggle = !tab.pinned;
      chrome.tabs.update(tab.id, { pinned: toggle });
    });
  }
  else if (action == "copyurl") {
    copyToClipboard(request.text);
  }
  else if (action == "movetableft") {
    if  (sender.tab.index > 0) {
      chrome.tabs.move(sender.tab.id, {'index': sender.tab.index -1});
    }
  }
  else if (action == "movetabright") {
    chrome.tabs.move(sender.tab.id, {'index': sender.tab.index +1});
  }
  else if (action == 'gototab') {
    var createNewTab = function() {
      chrome.tabs.create({url: request.openurl});
    }
    if (request.matchurl) {
      chrome.tabs.query({url: request.matchurl, currentWindow: true}, function (tabs) {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, {selected: true});
        } else {
          createNewTab();
        }
      });
    } else {
      createNewTab();
    }
  }
  else if (action == 'openbookmark') {
    chrome.bookmarks.search({title: request.bookmark}, function (nodes) {
      var openNode;
      for (var i = nodes.length; i-- > 0;) {
        var node = nodes[i];
        if (node.url && node.title == request.bookmark) {
          openNode = node;
          break;
        }
      }
      chrome.tabs.update(sender.tab.id, {url: unescape(openNode.url)});
    });
  }
  else if (action == 'zoomreset') {
    setZoom(function() {
      return 100;
    });
  }
  else if (action == 'zoomin') {
    setZoom(function(zoomSteps, zoomLevel) {
      return zoomSteps.reduce(function(prev, cur) { return (zoomLevel < prev) ? prev : cur; });
    });
  }
  else if (action == 'zoomout') {
    setZoom(function(zoomSteps, zoomLevel) {
      return zoomSteps.reduce(function(prev, cur) { return (zoomLevel > cur) ? cur : prev; });
    });
  }
  else {
    sendResponse({});
  }
});

function setZoom(computeZoom) {
  var zoomSteps = [25, 33, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500];

  chrome.tabs.getZoom(null, function(zoomLevel) {
    zoomLevel = Math.round(zoomLevel * 100);
    newZoomLevel = computeZoom(zoomSteps, zoomLevel);
    if (newZoomLevel !== zoomLevel)
      chrome.tabs.setZoom(null, newZoomLevel / 100);
  });
}

function selectTab(direction) {
  chrome.tabs.getAllInWindow(null, function(tabs) {
    if (tabs.length <= 1)
      return;
    chrome.tabs.getSelected(null, function(currentTab) {
      switch (direction) {
        case "next":
          toSelect = tabs[(currentTab.index + 1 + tabs.length) % tabs.length];
          break;
        case "previous":
          toSelect = tabs[(currentTab.index - 1 + tabs.length) % tabs.length];
          break;
        case "first":
          toSelect = tabs[0];
          break;
        case "last":
          toSelect = tabs[tabs.length - 1];
          break;
      }
      chrome.tabs.update(toSelect.id, { selected: true });
    });
  });
}
