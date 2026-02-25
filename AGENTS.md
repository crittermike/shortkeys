# Shortkeys

## What is this project?
Shortkeys is a cross-browser extension that lets users define custom keyboard shortcuts for browser actions (scrolling, tab management, navigation, running custom JavaScript, video controls, page scripts, and more). It has 200K+ Chrome users. Available for Chrome, Firefox, Edge, and Opera. Licensed under MIT, currently at v5.0.0.

## Tech stack
- **Build system**: WXT (Vite-based browser extension framework) -- `wxt.config.ts`
- **Language**: TypeScript throughout
- **UI framework**: Vue 3 with Composition API (`<script setup>`)
- **Testing**: Vitest with 416+ tests across 14 test files
- **Key dependency**: Mousetrap for keyboard shortcut detection in content scripts
- **Code editor**: CodeMirror 6 for JavaScript action editing in the options page
- **IDs**: uuid (v10) for unique shortcut IDs
- **Hosting**: shortkeys.app on Netlify (community site, welcome page, share links)
- **CI/CD**: GitHub Actions (tests + build on Node 22, weekly CodeQL security scanning)

## Project structure
```
src/
├── entrypoints/
│   ├── background.ts          # Service worker: message handling, action dispatch, storage sync
│   ├── content.ts             # Content script: Mousetrap bindings, cheat sheet, dark mode
│   ├── options/               # Options page (Vue 3 SPA)
│   │   ├── App.vue            # Main options UI (~2,111 lines -- largest file in codebase)
│   │   ├── index.html
│   │   └── main.ts
│   └── popup/                 # Command palette popup
│       ├── App.vue            # Searchable list to trigger shortcuts (267 lines)
│       ├── index.html
│       └── main.ts
├── actions/
│   ├── action-handlers.ts     # Map-based action registry (96+ browser actions, 744 lines)
│   ├── capture-screenshot.ts  # Screenshot via Chrome DevTools Protocol
│   └── last-used-tab.ts       # Tab history tracking (two-element queue)
├── components/
│   ├── CodeEditor.vue         # CodeMirror 6 wrapper with One Dark theme
│   ├── SearchSelect.vue       # Autocomplete dropdown with grouped options + sublabel support
│   └── ShortcutRecorder.vue   # Keyboard recorder (captures combos via e.code, multi-key sequences)
├── packs/                     # 9 curated shortcut pack collections
│   ├── index.ts               # ShortcutPack interface + ALL_PACKS array
│   ├── vim.ts, emacs.ts, youtube.ts, productivity.ts, developer.ts,
│   │   reading.ts, tab-manager.ts, keyboard-power.ts, media-control.ts
└── utils/
    ├── actions-registry.ts    # Action definitions, 11 categories, metadata (168 lines)
    ├── content-logic.ts       # Pure functions: fetchConfig, shouldStopCallback
    ├── execute-script.ts      # chrome.scripting.executeScript wrapper + showPageToast
    ├── fetch-userscript.ts    # Greasyfork/OpenUserJS URL resolution + metadata parsing
    ├── js-snippets.ts         # 25 curated JS snippets in 5 categories (also registered as actions)
    ├── shortcut-conflicts.ts  # Platform-aware browser default conflict detection (226 lines)
    ├── storage.ts             # Cloud sync abstraction (sync -> local fallback, 111 lines)
    ├── test-javascript.ts     # chrome.debugger-based JS execution (CSP-proof)
    └── url-matching.ts        # globToRegex, isAllowedSite, KeySetting interface

site/                          # shortkeys.app (Netlify-deployed)
├── index.html                 # Community landing page with pack browser (860 lines)
├── welcome.html               # "Welcome to v5" page (auto-opens on install/upgrade)
├── share.html                 # Share link renderer (import via externally_connectable)
└── catalog.json               # Generated from packs (npm run build:site), gitignored

scripts/
└── build-catalog.ts           # Generates catalog.json from pack data

tests/                         # 14 test files, 416+ tests
```

## Key architectural decisions

### Action registry pattern
Actions are dispatched via a `Record<string, ActionHandler>` map in `action-handlers.ts`. To add a new action:
1. Add entry to `ACTION_CATEGORIES` in `actions-registry.ts`
2. Add handler in `action-handlers.ts`
3. Optionally add to manifest commands in `wxt.config.ts` (for global shortcuts)
4. Page Script actions are auto-registered from `js-snippets.ts` via a loop

### Storage: cloud sync with local fallback
All storage goes through `src/utils/storage.ts` which abstracts `chrome.storage.sync` (100KB, synced across devices) with automatic fallback to `chrome.storage.local` if data exceeds sync quota. Never use `chrome.storage.local` directly in app code -- always use `saveKeys()` and `loadKeys()`.

### Content script actions vs background actions
Most actions are handled in the background script. These types are handled directly in the content script (before messaging background):
- `javascript` -- dispatches CustomEvent to MAIN world
- `showcheatsheet` -- injects overlay DOM
- `toggledarkmode` -- injects/removes style element
- `trigger` -- calls Mousetrap.trigger()
These are also forwarded from background when triggered via the command palette popup.

### Live reload
When shortcuts are saved, `storage.onChanged` fires -> background broadcasts `refreshKeys` to all tabs -> content scripts call `Mousetrap.reset()` and re-bind. No tab refresh needed.

### Groups
Shortcuts have an optional `group` field. Ungrouped shortcuts show under "My Shortcuts" (the DEFAULT_GROUP constant). Groups support collapse, rename, bulk enable/disable, delete, and per-group sharing.

### Shortcut packs
Packs are TypeScript files in `src/packs/`. Each exports a `ShortcutPack` object. When imported, all shortcuts get the pack name as their `group` field. Don't create packs that duplicate shortcuts built into websites (e.g. Gmail, Reddit, GitHub already have their own shortcuts).

### Share system
- Export tab has a "Share Link" button that generates `shortkeys.app/share#<base64>`
- Per-group sharing via group menu
- Share page uses `chrome.runtime.sendMessage(extensionId, ...)` to import directly
- Requires `externally_connectable` in manifest (configured for shortkeys.app + localhost)

### Manifest command IDs are permanent
The command keys (e.g., `01-newtab`) in `wxt.config.ts` are stored by Chrome to remember user-set keyboard shortcuts. **Never renumber or rename existing command keys after publishing** -- only append new ones.

### v4 -> v5 migration
v5 is fully backward-compatible with v4 data. Same storage key (`chrome.storage.local` key `"keys"`), same JSON format, same field names. New fields (`enabled`, `group`, `inserttext`) are optional and default gracefully. No migration code needed -- tested with 8 dedicated migration tests.

## Commands
- `npm run dev` -- WXT dev mode with hot reload (Chrome)
- `npm run dev:firefox` -- WXT dev mode (Firefox)
- `npm run build` -- Production build -> `.output/chrome-mv3/`
- `npm run build:firefox` -- Firefox build -> `.output/firefox-mv2/`
- `npm run build:site` -- Build community site (catalog.json + images)
- `npm test` -- Run all Vitest tests
- `npm run test:watch` -- Watch mode
- `npm run test:coverage` -- Coverage report
- `npm run zip` / `npm run zip:firefox` -- Create distributable zip files

## Testing conventions
- Tests live in `tests/` as `*.test.ts` files
- Browser APIs are mocked via `vi.fn()` on a `globalThis.browser` object
- `executeScript` and `showPageToast` are mocked at the module level via `vi.mock()`
- Integration tests verify cross-module behavior and v4->v5 migration compatibility
- The action handler test dynamically generates a test for every action in the registry
- Template correctness tests scan App.vue to prevent stale `row.` references (must use `keys[index].` not `row.`)
- Injected function tests use `@vitest-environment jsdom` to test actual DOM behavior
- Pack tests validate metadata, action names, labels, unique IDs, and JS syntax
- Coverage excludes entrypoints and `capture-screenshot.ts`

## Important gotchas
- **Vue v-for keys**: Use `row.id` (stable UUID), NEVER `row.key` (changes as user types)
- **Vue v-if + v-for**: Can't be on the same element in Vue 3. Use `<template v-for>` wrapper with `v-if` on inner element
- **Template references**: The v-for iterates `filteredIndices` by index. All template bindings must use `keys[index].field` not `row.field` -- there is no `row` variable. A test enforces this.
- **open_in_tab**: Set via `<meta name="manifest.open_in_tab" content="true">` in HTML, NOT wxt.config.ts
- **userScripts API**: May be undefined -- always guard with `if (!chrome.userScripts) return`
- **var vs const in serialized code**: `registerHandlers` uses `var handlers` because `const` creates block scope that breaks after `.toString()` serialization
- **Mousetrap stopCallback**: Must reference the shared `keys` array from the content script's closure
- **e.code vs e.key**: ShortcutRecorder uses `e.code` (physical key) because `e.key` produces unicode chars with Alt on Mac (e.g., option+l -> `¬`)
- **Meta vs Ctrl**: On Mac, meta (Cmd) and ctrl are separate modifiers. The recorder records both independently
- **Platform-aware conflict detection**: Mac defaults use `meta+`, Windows/Linux use `ctrl+`. Separate default lists in shortcut-conflicts.ts. Never cross-map ctrl<->meta.
- **chrome.debugger for JS testing**: The test button uses DevTools Protocol (Runtime.evaluate) to bypass page CSP. Falls back to executeScript on Firefox (no debugger API)
- **overflow:hidden on groups**: Don't use it -- clips the SearchSelect dropdown. Border-radius works without it
- **position:sticky on group headers**: Don't use with `overflow:hidden` on parent -- the `top` value pushes content down. Currently removed.
- **Content script orphaning**: After extension reload, old content scripts throw "Extension context invalidated". Guard all `browser.runtime.sendMessage` calls with `chrome.runtime?.id` check
- **Empty shortcuts crash**: Blank `key` field causes `toLowerCase()` error. Guard with `if (!keySetting.key) return`
- **shouldStopCallback**: Must check `role="textbox"`, `role="combobox"`, `role="searchbox"` in addition to standard input elements (for sites like Reddit that use non-standard elements)
- **CSS dark mode**: All colors use CSS custom properties (--bg, --text, --border, etc.) with `[data-theme="dark"]` overrides. Component scoped styles use fallbacks: `var(--blue, #4361ee)`
- **Bookmark URLs with %**: `decodeURIComponent` throws on bare `%` signs. Wrap in try/catch with raw fallback
- **Labels should be sentence case**: "Log all events" not "Log All Events"
- **New windows open maximized**: All `browser.windows.create` calls include `state: 'maximized'`
- **Firefox compatibility**: Settings pages use `about:` URIs not `chrome://`. Guard `chrome.tabs.group/ungroup`, `chrome.downloads.show`, `chrome.debugger` with existence checks. Firefox builds as MV2.

## Workflow rules
- **Never push directly to master/main**. Always create a feature branch and open a PR.
- **Never push new features without letting the user test first**. After implementing, open the dev server (`npm run dev`) and wait for the user to confirm it works before committing/pushing.
- **PR workflow**: Create a feature branch (e.g. `feat/issue-700-quick-add`), commit there, push, and create a PR via `gh pr create`. The user will review and merge.
- **Visual review after UI changes**: After any UI change, run `npm run visual-review` to build the extension, launch it headlessly, and screenshot the popup (empty, quick-add, dropdown) and options page. Review the screenshots with `look_at` before presenting to the user. Iterate if anything looks off. Screenshots are saved to `screenshots/` (gitignored).
