# Shortkeys

Custom keyboard shortcuts for your browser

Shortkeys is a cross-browser extension for Chrome, Firefox, Edge, and Opera with over 200,000 Chrome users. It allows users to define custom keyboard shortcuts for a wide range of browser actions.

[Chrome Web Store](https://chromewebstore.google.com/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck) · [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/shortkeys/) · [Website](https://shortkeys.app) · [GitHub Issues](https://github.com/crittermike/shortkeys/issues)

## Features

- **125+ built-in actions**
  Actions across 11 categories including scrolling, tabs, navigation, video controls, search, bookmarks, windows, zooming, page tools, page scripts, and miscellaneous.
- **Command palette popup**
  Click the icon or set a shortcut to search and trigger any action.
- **9 curated shortcut packs**
  One-click installation for Vim, Emacs, YouTube, Productivity, Developer, Reading, Tab Manager, Keyboard Power, and Media Control.
- **Cloud sync**
  Automatic sync with local fallback when data exceeds sync quota.
- **Groups**
  Organize shortcuts into collapsible and renamable groups with bulk enable or disable support.
- **Custom JavaScript execution**
  Run scripts with a syntax-highlighted CodeMirror editor.
- **Macro and chaining support**
  Chain multiple actions into a single shortcut.
- **Shortcut recorder**
  Support for multi-key sequences like "g i" or "g h".
- **Platform-aware conflict detection**
  Warnings for browser default clashes with different defaults for Mac, Windows, and Linux.
- **Live reload**
  Shortcuts update in all tabs instantly on save without requiring a page refresh.
- **Share shortcuts**
  Generate shareable links with support for per-group sharing.
- **Dark mode**
  Follows system preference.
- **Site filtering**
  Apply shortcuts to all sites, or use blocklists and allowlists per shortcut.
- **Userscript import**
  Import from Greasyfork or OpenUserJS.
- **Guided onboarding**
  Wizard to help new users get started.
- **Undo and redo**
  Available in the settings page.
- **Text insertion**
  Type text into form fields with a shortcut.
- **Screenshot capture**
  Capture viewport, full page, or forced full page screenshots.

## Install

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck) or [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/shortkeys/).

### Build from source

```bash
npm install
npm run build          # Chrome → .output/chrome-mv3/
npm run build:firefox  # Firefox → .output/firefox-mv2/
```

## Development

```bash
npm run dev            # Chrome dev mode with hot reload
npm run dev:firefox    # Firefox dev mode
npm test               # Run all tests (569 tests across 21 files)
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

## Project structure

```
src/
├── entrypoints/
│   ├── background.ts        # Service worker: messaging, action dispatch, storage sync
│   ├── content.ts           # Content script: Mousetrap key bindings, cheat sheet, dark mode
│   ├── options/             # Options page (Vue 3 SPA)
│   └── popup/               # Command palette popup
├── actions/                 # Action handlers and helpers
├── components/              # Vue components (CodeEditor, SearchSelect, ShortcutRecorder)
├── composables/             # Vue composables (useShortcuts)
├── packs/                   # 9 curated shortcut pack collections
└── utils/                   # Storage, URL matching, conflict detection, JS snippets

site/                        # shortkeys.app (Astro SSG, deployed to Netlify)
tests/                       # 569 tests across 21 files
```

## Tech stack

- **WXT** (Vite-based browser extension framework)
- **Vue 3** with Composition API
- **TypeScript**
- **Vitest** for testing
- **Mousetrap** for keyboard shortcut detection
- **CodeMirror 6** for JavaScript editing
- **Astro** for the community website

## Contributing

Pull requests are welcome. Please ensure all tests pass by running `npm test` before submitting changes. For bugs and feature requests, please use the GitHub issues tracker.

## Support

Shortkeys is free and open source. If you find it useful, consider supporting development:

- ⭐ [Star this repo](https://github.com/crittermike/shortkeys)
- 💛 [Sponsor on GitHub](https://github.com/sponsors/crittermike)
- ☕ [Buy me a coffee](https://buymeacoffee.com/crittermike)
- 📝 [Leave a review](https://chromewebstore.google.com/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck/reviews)

## Credits and license

Icon credit to [Freepik](https://www.flaticon.com/authors/freepik) from [Flaticon](https://www.flaticon.com/).

This project is licensed under the [MIT License](LICENSE.md).
