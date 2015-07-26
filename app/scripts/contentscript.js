'use strict';
/* global Mousetrap */

function globToRegex(glob) {
  var specialChars = '\\^$*+?.()|{}[]';
  var regexChars = ['^'];
  for (var i = 0; i < glob.length; ++i) {
    var c = glob.charAt(i);
    if (c === '*') {
      regexChars.push('.*');
    } else {
      if (specialChars.indexOf(c) >= 0) {
        regexChars.push('\\');
      }
      regexChars.push(c);
    }
  }
  regexChars.push('$');
  return new RegExp(regexChars.join(''));
}

chrome.runtime.sendMessage({action: 'getKeys'}, function(response) {
  function activateKey(keyobj) {
    if (keyobj.blacklist && keyobj.sitesArray && keyobj.blacklist !== 'false') {
      var kill = false;
      if (keyobj.blacklist === 'whitelist') {
        kill = true;
      }
      for (var j = 0; j < keyobj.sitesArray.length; j++) {
        var isMatch = url.match(globToRegex(keyobj.sitesArray[j]));
        if (keyobj.blacklist === 'true' && isMatch) {
          return;
        } else if (keyobj.blacklist === 'whitelist' && isMatch) {
          kill = false;
        }
      }
      if (kill) {
        return;
      }
    }
    var action = function() {
      doAction(keyobj);
      return false;
    };

    var _oldStopCallback = Mousetrap.stopCallback;
    Mousetrap.stopCallback = function(e, element, combo) {
      if (element.classList.contains('mousetrap')) {
        // We're not using the 'mousetrap' class functionality, which allows
        // you to whitelist elements, so if we come across elements with that class
        // then we can assume that they are provided by the site itself, not by
        // us, so we just treat them like normal inputs.
        return true;
      }
      return _oldStopCallback(e, element, combo);
    };

    Mousetrap.bind(keyobj.key, action);
  }

  var url = document.URL;
  if (response) {
    var settings = JSON.parse(response);
    var keys = settings.keys;
    if (keys.length > 0) {
      for (var i = 0; i < keys.length; i++) {
        activateKey(keys[i]);
      }
    }
  }

  function doAction(keyobj) {
    var action = keyobj.action;
    var message = {};
    var curZoom;

    if (action === 'copyurl') {
      message.text = document.URL;
    }

    if (action === 'top') {
      window.scrollTo(0, 0);
    } else if (action === 'bottom') {
      window.scrollTo(0, document.body.scrollHeight);
    } else if (action === 'scrollup') {
      window.scrollBy(0,-50);
    } else if (action === 'scrollupmore') {
      window.scrollBy(0,-500);
    } else if (action === 'scrolldown') {
      window.scrollBy(0,50);
    } else if (action === 'scrolldownmore') {
      window.scrollBy(0,500);

    } else if (action === 'back') {
      history.back();
    } else if (action === 'forward') {
      history.forward();
    } else if (action === 'reload') {
      window.location.reload();
    } else if (action === 'zoomin') {
      curZoom = document.body.style.zoom || 1;
      document.body.style.zoom = (parseFloat(curZoom) + 0.1).toFixed(1);
    } else if (action === 'zoomout') {
      curZoom = document.body.style.zoom || 1;
      document.body.style.zoom = (parseFloat(curZoom) - 0.1).toFixed(1);
    } else if (action === 'zoomreset') {
      document.body.style.zoom = 1;
    } else if (action === 'javascript') {
      var script = document.createElement('script');
      script.textContent = keyobj.code.replace(/^\s*javascript:/, '');
      document.body.appendChild(script);
      document.body.removeChild(script);
    } else {
      for (var attribute in keyobj) {
        message[attribute] = keyobj[attribute];
      }
      chrome.runtime.sendMessage(message);
    }
  }
});