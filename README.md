Shortkeys for Chrome
================

A Chrome extension for custom keyboard shortcuts.

### Installation

Download it [from the Chrome Webstore](https://chrome.google.com/webstore/detail/shortkeys/logpjaacgmcbpdkdchjiaagddngobkck?hl=en-US).

### How to contribute

Don't be scared! Setup only takes 2 minutes.

**Step 1: Download and install dependencies**

1. Fork this repo and clone your fork locally.
2. Open up the root directory in a terminal
3. Run `npm install` to install the node dependencies, such as grunt and bower
4. Run `bower install` to install the bower components

**Step 2: Enable the extension**

1. Disable the Webstore version of the extension if you have it enabled.
2. Open up [chrome://extensions](chrome://extensions) and check "Developer mode".
3. Click "Load unpacked extension" and browse to the `app/` directory to install it.
4. Open up the "Options" page to configure some shortcuts.

**Step 3: Start developing**

1. Run `grunt debug` and confirm that you see something [like this](https://www.dropbox.com/s/eykygm745vilifh/Screenshot%202015-05-18%2015.49.42.png?dl=0).
2. Edit some code. The extension itself should reload automatically (thanks Yeoman!).
3. When you're done with your changes, push them to your fork and create a pull request for them.
4. You can also run `grunt build` at any time to bump the manifest version and generate a
   Webstore compatible zip file for upload.