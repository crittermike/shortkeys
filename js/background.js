chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (request.method == "getKeys") {
    sendResponse({keys: localStorage['shortkeys']});
  }
  else if (request.method == "nexttab") {
    selectTab("next");
  }
  else if (request.method == "prevtab") {
    selectTab("previous");
  }
  else if (request.method == "firsttab") {
    selectTab("first");
  }
  else if (request.method == "lasttab") {
    selectTab("last");
  }
  else if (request.method == "newtab") {
    chrome.tabs.create({});
  }
  else if (request.method == "closetab") {
    chrome.tabs.getSelected(null, function(tab){ 
      chrome.tabs.remove(tab.id);
    });
  }
  else {
    sendResponse({});
  }
});

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
