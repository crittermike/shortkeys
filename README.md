# Shortkeys ⌨️

**Custom keyboard shortcuts for your browser** — 90+ built-in actions, shortcut packs, cloud sync, and more.

[Chrome Web Store](https://chromewebstore.google.com/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck) · [Firefox Add-on](https://addons.mozilla.org/firefox/addon/shortkeys/) · [Website](https://shortkeys.app) · [Documentation](https://github.com/crittermike/shortkeys/wiki) · [Support](https://github.com/crittermike/shortkeys/issues)

## Features

- **90+ built-in actions** — tabs, scrolling, navigation, video controls, page scripts, and more
- **Command palette** — click the extension icon to search and trigger any shortcut
- **Shortcut packs** — one-click install curated collections (Vim, Emacs, YouTube, etc.)
- **Cloud sync** — shortcuts sync across devices via your browser account
- **Groups** — organize shortcuts into collapsible, renamable sections
- **Custom JavaScript** — run any code with a keyboard shortcut, with syntax-highlighted editor
- **Shortcut recorder** — click Record and press keys, supports multi-key sequences
- **Conflict detection** — warns when shortcuts clash with browser defaults
- **Live reload** — save shortcuts and they update in all tabs instantly
- **Share via link** — generate a URL to share shortcuts with anyone
- **Dark mode** — settings page follows your system preference
- **Firefox support** — full Firefox build included
- **Greasyfork import** — paste a userscript URL to bind it to a shortcut

## Getting Started

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck) or [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/shortkeys/), or build from source:

```bash
npm install
npm run build          # Chrome → .output/chrome-mv3/
npm run build:firefox  # Firefox → .output/firefox-mv2/
```

## Development

```bash
npm run dev            # Chrome dev mode with hot reload
npm run dev:firefox    # Firefox dev mode
npm test               # Run all 416 tests
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
npm run build:site     # Build shortkeys.app community site
```

## Architecture

Built with [WXT](https://wxt.dev/) (Vite-based browser extension framework), Vue 3, and TypeScript. See [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for detailed architecture docs.

```
src/
├── entrypoints/
│   ├── background.ts        # Service worker: messaging, storage sync, action dispatch
│   ├── content.ts           # Content script: Mousetrap bindings, cheat sheet, dark mode
│   ├── options/             # Options page (Vue 3 SPA)
│   └── popup/               # Command palette popup
├── actions/
│   └── action-handlers.ts   # Map-based action registry (96+ handlers)
├── components/              # Vue components (CodeEditor, SearchSelect, ShortcutRecorder)
├── packs/                   # Curated shortcut pack collections
└── utils/                   # Pure business logic (URL matching, conflicts, storage, snippets)

site/                        # shortkeys.app (Netlify)
tests/                       # 416 tests across 14 files
```

## Support This Project

Shortkeys is free and open source. If you find it useful, consider supporting development:

- ⭐ [Star this repo](https://github.com/crittermike/shortkeys)
- 💛 [Sponsor on GitHub](https://github.com/sponsors/crittermike)
- ☕ [Buy me a coffee](https://buymeacoffee.com/crittermike)
- 📝 [Leave a review](https://chromewebstore.google.com/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck/reviews)

## Credits

* Icon by [Freepik](https://www.flaticon.com/authors/freepik) from [Flaticon](https://www.flaticon.com/).
