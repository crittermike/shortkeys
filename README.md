![Shortkeys banner image](https://i.imgur.com/XqLXokB.jpg)

### Installation

Download it [from the Chrome Webstore](https://chrome.google.com/webstore/detail/shortkeys/logpjaacgmcbpdkdchjiaagddngobkck?hl=en-US).

### Usage

Visit [the wiki](https://github.com/mikecrittenden/chrome-shortkeys/wiki/How-To-Use-Shortkeys).

### How to contribute

Don't be scared! Setup only takes 2 minutes.

**Step 1: Download and install dependencies**

1. Fork this repo and clone your fork locally.
2. Open up the root directory in a terminal.
3. Run `npm install` to install the node dependencies.
4. Run `bower install` to install the bower components.

**Step 2: Enable the extension**

1. Disable the Webstore version of the extension if you have it enabled.
2. Open up [chrome://extensions](chrome://extensions) and check "Developer mode".
3. Click "Load unpacked extension" and browse to the `app/` directory to install it.
4. Open up the "Options" page to configure some shortcuts.

**Step 3: Start developing**

1. Run `gulp watch`.
2. Edit some code. The extension itself should reload automatically (thanks Yeoman!).
3. When you're done with your changes, push them to your fork and create a pull request for them.
4. You can also run `gulp build` at any time to generate a distribution version to `dist/`.
5. Finally, you can run `gulp package` to generate a compressed version of the extension suitable for uploading to the Webstore.
