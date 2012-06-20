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

key.filter = function(event) {
  var tagName = (event.target || event.srcElement).tagName;
  var editable = (event.target || event.srcElement).getAttribute('contenteditable');
  return !(tagName == 'INPUT' || tagName == 'SELECT' || tagName == 'TEXTAREA' || editable);
}

chrome.extension.sendRequest({method: "getKeys"}, function(response) {
  var keys = response.keys;
  var url = document.URL;
  if (keys) {
    keys = JSON.parse(keys);
    if (keys.length > 0) {
      for (var i = 0; i < keys.length; i++) {
        activateKey(keys[i]);
      }
    }
  }

  function activateKey(keyobj) {
    if (keyobj.blacklist && keyobj.sitesArray && keyobj.blacklist == "true") {
      for (var j = 0; j < keyobj.sitesArray.length; j++) {
        if (url.match(globToRegex(keyobj.sitesArray[j]))) {
          return;
        } 
      }
    }
    key(keyobj.key, findAction(keyobj.action));
  }

  function findAction(shortname) {

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

    } else {
      return function(){ chrome.extension.sendRequest({method: shortname}) };
    }
  }
});
