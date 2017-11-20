'use strict';
/* global Mousetrap */

let keySettings;

/**
 * Helper function to convert glob/wildcard * syntax to valid RegExp for URL checking.
 *
 * @param glob
 * @returns {RegExp}
 */
let globToRegex = function(glob) {
    // Use a regexp if the url starts and ends with a slash `/`
    if (/^\/.*\/$/.test(glob)) return new RegExp(glob.replace(/^\/(.*)\/$/, '$1'));

    const specialChars = '\\^$*+?.()|{}[]';
    let regexChars = ['^'];
    for (let i = 0; i < glob.length; ++i) {
        let c = glob.charAt(i);
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
};

/**
 * Helper function to determine if the current site is blacklisted or not.
 *
 * @param keySetting
 * @returns {boolean}
 */
let isAllowedSite = function(keySetting) {
    if (keySetting.blacklist !== 'true' && keySetting.blacklist !== 'whitelist') {
        // This shortcut is allowed on all sites (not blacklisted or whitelisted).
        return true;
    }
    let url = document.URL;
    let allowed = keySetting.blacklist === 'true';
    for (let i = 0; i < keySetting.sitesArray.length; i++) {
        if (url.match(globToRegex(keySetting.sitesArray[i]))) {
            allowed = !allowed;
            break;
        }
    }
    return allowed;
};

/**
 * Helper function for fetching the full key shortcut config given a keyboard combo.
 *
 * @param keyCombo
 */
let fetchConfig = function(keyCombo) {
    let keys = keySettings.keys;
    if (keys.length > 0) {
        for (let i = 0; i < keys.length; i++) {
            if (keys[i].key === keyCombo) {
                return keys[i];
            }
        }
    }
    return false;
};

/**
 * Given a key shortcut config item, carry out the action configured for it.
 * This is what happens when the user triggers the shortcut.
 *
 * @param keySetting
 */
let doAction = function(keySetting) {
    let action = keySetting.action;
    let message = {};

    if (action === 'copyurl') {
        message.text = document.URL;
    }

    switch(action) {
        case 'buttonnexttab':
            if (keySetting.button) {
                document.querySelector(keySetting.button).click();
            }
            message.action = 'nexttab';
            chrome.runtime.sendMessage(message);
            break;
        default:
            for (let attribute in keySetting) {
                message[attribute] = keySetting[attribute];
            }
            chrome.runtime.sendMessage(message);
    }
};

/**
 * Given a key shortcut config item, ask if the current site is allowed, and if so,
 * activate the shortcut.
 *
 * @param keySetting
 */
let activateKey = function(keySetting) {
    let action = function() {
        if (!isAllowedSite(keySetting)) return false;
        doAction(keySetting);
        return false;
    };
    Mousetrap.bind(keySetting.key, action);
};

/**
 * Overrides the default stopCallback from Mousetrap so that we can customize
 * a few things, such as not using the "whitelist inputs with the mousetrap class"
 * functionality and wire up the "activate in form inputs" checkbox.
 *
 * @param e
 * @param element
 * @param combo
 */
Mousetrap.prototype.stopCallback = function(e, element, combo) {
    let keySetting = fetchConfig(combo);

    if (element.classList.contains('mousetrap')) {
        // We're not using the 'mousetrap' class functionality, which allows
        // you to whitelist elements, so if we come across elements with that class
        // then we can assume that they are provided by the site itself, not by
        // us, so we don't activate Shortkeys in that case, to prevent conflicts.
        // This fixes the chat box in Twitch.tv for example.
        return true;

    } else if (!keySetting.activeInInputs) {
        // If the user has not checked "Also allow in form inputs" for this shortcut,
        // then we cut out of the user is in a form input.
        return element.tagName === 'INPUT' ||
            element.tagName === 'SELECT' ||
            element.tagName === 'TEXTAREA' ||
            element.isContentEditable;

    } else {
        // The user HAS checked "Also allow in form inputs" for this shortcut so we
        // have no reason to stop it from triggering.
        return false;
    }
};

/**
 * Fetches the Shortkeys configuration object and wires up each configured shortcut.
 */
chrome.runtime.sendMessage({action: 'getKeys'}, function(response) {
    if (response) {
        keySettings = JSON.parse(response);
        let keys = keySettings.keys;
        if (keys.length > 0) {
            for (let i = 0; i < keys.length; i++) {
                activateKey(keys[i]);
            }
        }
    }
});