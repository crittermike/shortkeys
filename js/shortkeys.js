function globToRegex(glob) {
  var specialChars = "\\^$*+?.()|{}[]";
  var regexChars = ["^"];
  for (var i = 0; i < glob.length; ++i) {
    var c = glob.charAt(i);
    if (c == '*') {
      regexChars.push(".*");
    } else {
      if (specialChars.indexOf(c) >= 0) {
        regexChars.push("\\");
      }
      regexChars.push(c);
    }
  }
  regexChars.push("$");
  return new RegExp(regexChars.join(""));
}


chrome.extension.sendRequest({method: "getKeys"}, function(response) {
  var keys = response.keys;
  var url = document.URL;
  if (keys) {
    keys = JSON.parse(keys);
    i = 0;
    while (keys["key" + i] !== undefined) {
      var useKey = true;
      var curkey = keys["key" + i];
      if (curkey.blacklist && curkey.sites && curkey.blacklist == "1") {
        curkey.sites;
        for (var j = 0; j < curkey.sites.length; j++) {
          if (url.match(globToRegex(curkey.sites[j]))) {
            useKey = false;
          } 
        }
      }
      if (useKey) {
        key(curkey.key, find_action(curkey.action));
      }
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
