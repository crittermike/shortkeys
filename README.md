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

### Gulp commands and flags

You can influence most predefined gulp tasks by adding flags to the gulp command:

| Flag           | Description                                                                                                                                                    |
|----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `--watch`      | Starts a livereload server and watches all assets. <br>To reload the extension on change include `livereload.js` in your bundle.                               |
| `--production` | Minifies all assets and sets the `process.env.NODE_ENV` variable to `production`                                                                               |
| `--verbose`    | Log additional data to the console                                                                                                                             |
| `--vendor`     | Compile the extension for different vendors (`chrome`, `firefox`, `opera`, `edge`) and set the global `process.env.VENDOR` variable. <br>**Default:** `chrome` |
| `--sourcemaps` | Force the creation of sourcemaps. <br>**Default:** `!production`                                                                                               |

Here is the full list of support Gulp commands:

| Command     | Description                                                                                                                      |
|--------------|----------------------------------------------------------------------------------------------------------------------------------|
| default      | alias for `build`                                                                                                                |
| `build`      | Runs `clean`,  `manifest`, `scripts`, `styles`, `pages`, `locales`, `images`, `fonts` and `livereload` task                      |
| `clean`      | Deletes the `dist` directory                                                                                                     |
| `style`      | Compiles css, scss and less files in the root of your `app/styles/*` directory                                                   |
| `scripts`    | Compiles the scripts in the root of your `app/scripts/*` directory                                                               |
| `pages`      | Compiles the html files in the pages directory                                                                                   |
| `manifest`   | Compiles the `manifest.json` file and transforms vendor specific keys.                                                           |
| `locales`    | Copies the `_locales` into `dist`                                                                                                |
| `fonts`      | Copies the `fonts` into dist                                                                                                     |
| `livereload` | Starts a livereload server and watches all the assets. The `--watch` flag needs to be present in order for this task to work     |
| `pack`       | Packs the dist directory into a zip file, adds version number and vendor to it and saves the bundle to the `packages` directory  |
| `patch`      | Bumbs the patch version in the `manifest.json`,  `package.json`, commits and adds a git tag                                      |
| `feature`    | Bumbs the minor version in the `manifest.json`, `package.json`, commits and adds a git tag                                       |
| `release`    | Bumbs the major version in the `manifest.json`, `package.json`, commits and adds a git tag                                       |