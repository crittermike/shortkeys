![Logo](https://user-images.githubusercontent.com/32261/33674247-eca884f0-da7c-11e7-8237-409887ef2c52.png)

**Custom keyboard shortcuts for your browser**

## Download

[![chrome](https://user-images.githubusercontent.com/32261/33695359-fe69c322-daca-11e7-8fd3-7a0126d08852.png)](https://chrome.google.com/webstore/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck?hl=en-US&gl=US)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
[![firefox](https://user-images.githubusercontent.com/32261/33695357-fe523b9e-daca-11e7-852b-6af15186b8c7.png)](https://addons.mozilla.org/en-US/firefox/addon/shortkeys-custom-shortcuts/)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
[![opera](https://user-images.githubusercontent.com/32261/33695358-fe5e604a-daca-11e7-85cb-48e98367030d.png)](https://addons.opera.com/en/extensions/details/shortkeys/?display=en)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
[![edge](https://user-images.githubusercontent.com/32261/33695356-fe474342-daca-11e7-8777-e163d19bcbf4.png)](https://github.com/mikecrittenden/shortkeys/releases)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

## Donate

👉 **[DONATE TO SUPPORT SHORTKEYS](https://salt.bountysource.com/teams/chrome-shortkeys)** 👈 

This is a personal side project and donations are welcome and appreciated!

## Review

⭐ **[REVIEW SHORTKEYS ON THE WEBSTORE](https://chrome.google.com/webstore/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck/reviews?hl=en-US&gl=US)** ⭐

## Usage

Visit [the wiki](https://github.com/mikecrittenden/chrome-shortkeys/wiki/How-To-Use-Shortkeys) to learn about how to configure and use Shortkeys.

## How to contribute

Don't be scared! Setup only takes 2 minutes.

**Step 1: Download and install dependencies**

1. Fork this repo and clone your fork locally.
2. Open up the root directory in a terminal.
3. Run `npm install` to install the node dependencies.

**Step 2: Build and enable the extension**

1. Disable the Webstore version of the extension if you have it enabled.
2. Run `gulp build --watch` to build the extension and watch for changes.
3. Open up [chrome://extensions](chrome://extensions) and check "Developer mode".
4. Click "Load unpacked extension" and browse to the `dist/` directory to install it.
5. Open up the "Options" page to configure some shortcuts.

**Step 3: Start developing**

1. Edit some code and test it out.
2. When you're happy, push your changes to your fork and create a pull request.

**Step 4 (Optional): Package the extension**

1. Compile the extension for production using `gulp build --production`.
2. Finally, you can run `gulp pack` to generate a compressed version of the extension suitable for uploading to the Webstore.

For more info on development, see the [docs for the Chrome Extension Kickstart](https://github.com/HaNdTriX/generator-chrome-extension-kickstart/blob/HEAD/DOCUMENTATION.md) generator, which this extension was built from.
