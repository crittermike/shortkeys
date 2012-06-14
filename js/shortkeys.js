chrome.extension.sendRequest({method: "getKeys"}, function(response) {
  var keys = response.keys;
  if (keys) {
    keys = JSON.parse(keys);
    i = 0;
    while (keys["key" + i] !== undefined) {
      curkey = keys["key" + i];
      key(curkey.key, find_action(curkey.action));
      i++;
    }
  }

  function find_action(shortname) {

    if (shortname == "top") {
      return function(){ window.scrollTo(0, 0); }
    } else if (shortname == "bottom") {
      return function(){ window.scrollTo(0, document.body.scrollHeight); };
    } else if (shortname == "scrollup") {
      return function(){ window.scrollBy(0,-50); };
    } else if (shortname == "scrollupmore") {
      return function(){ window.scrollBy(0,-500); };
    } else if (shortname == "scrolldown") {
      return function(){ window.scrollBy(0,50); };
    } else if (shortname == "scrolldownmore") {
      return function(){ window.scrollBy(0,500); };


    } else if (shortname == 'back') {
      return function(){ history.back(); };
    } else if (shortname == 'forward') {
      return function(){ history.forward(); };
    } else if (shortname == 'reload') {
      return function(){ window.location.reload(); };

    } else if (shortname == 'nexttab') {
      return function(){ chrome.extension.sendRequest({method: "nextTab"}) };
    } else if (shortname == 'prevtab') {
      return function(){ chrome.extension.sendRequest({method: "prevTab"}) };
    } else if (shortname == 'closetab') {
      return function(){ chrome.extension.sendRequest({method: "closeTab"}) };
    } else if (shortname == 'newtab') {
      return function(){ chrome.extension.sendRequest({method: "newTab"}) };
    } else if (shortname == 'firsttab') {
      return function(){ chrome.extension.sendRequest({method: "firstTab"}) };
    } else if (shortname == 'lasttab') {
      return function(){ chrome.extension.sendRequest({method: "lastTab"}) };
    }
  }
});
