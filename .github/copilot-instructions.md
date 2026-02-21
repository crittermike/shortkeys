# Shortkeys - Copilot Instructions

## What is this project?
Shortkeys is a cross-browser extension that lets users define custom keyboard shortcuts for browser actions (scrolling, tab management, navigation, running custom JavaScript, etc.). It's available on Chrome, Firefox, Edge, and Opera.

## Tech stack
- **Build system**: WXT (Vite-based browser extension framework) — `wxt.config.ts`
- **Language**: TypeScript throughout
- **UI framework**: Vue 3 with Composition API (`<script setup>`)
- **Testing**: Vitest with 162+ tests
- **Key dependency**: Mousetrap for keyboard shortcut detection in content scripts
- **Code editor**: CodeMirror 6 for JavaScript action editing in the options page

## Project structure
```
src/
├── entrypoints/
│   ├── background.ts          # Service worker: message handling, action dispatch
│   ├── content.ts             # Content script: Mousetrap bindings, key activation
│   └── options/               # Options page (Vue 3 SPA)
│       ├── App.vue            # Main options UI
│       ├── index.html
│       └── main.ts
├── actions/
│   ├── action-handlers.ts     # Map-based action registry (all ~50 browser actions)
│   ├── capture-screenshot.ts  # Screenshot via Chrome debugger protocol
│   └── last-used-tab.ts       # Tab history tracking
├── components/
│   ├── CodeEditor.vue         # CodeMirror 6 wrapper
│   └── SearchSelect.vue       # Autocomplete dropdown
└── utils/
    ├── actions-registry.ts    # Action definitions, categories, metadata
    ├── content-logic.ts       # Pure functions: fetchConfig, shouldStopCallback
    ├── execute-script.ts      # chrome.scripting.executeScript wrapper
    └── url-matching.ts        # globToRegex, isAllowedSite (blacklist/whitelist)
```

## Key architectural decisions

### Action registry pattern
Actions are dispatched via a `Record<string, ActionHandler>` map in `action-handlers.ts`, NOT a long if/else chain. To add a new action: add an entry to `ACTION_CATEGORIES` in `actions-registry.ts` and a handler in `action-handlers.ts`.

### Business logic is separated from browser APIs
Pure logic (URL matching, content script filtering, action metadata) lives in `src/utils/` and is fully testable without browser mocks. Browser-dependent code lives in `src/entrypoints/` and `src/actions/`.

### Content script ↔ Background communication
1. Content script sends `{action: 'getKeys', url: document.URL}` to background
2. Background filters keys by `isAllowedSite()` and responds
3. Content script binds keys via Mousetrap
4. When a shortcut fires, content script sends the full `KeySetting` object to background
5. Background dispatches to the appropriate action handler

### JavaScript actions use userScripts API
Custom JS runs in the page's MAIN world via `chrome.userScripts`. The background script serializes handler functions as strings and registers them. The content script dispatches a `shortkeys_js_run` CustomEvent to trigger execution. The `chrome.userScripts` API requires the user to enable "Allow User Scripts" in extension details — all calls are guarded with try/catch.

### Vue key for list rendering
Use `row.id` (a stable UUID) as the `:key` for shortcut rows, NEVER `row.key` (the shortcut string), because `row.key` changes as the user types, causing Vue to re-render and lose focus.

## Commands
- `npm run dev` — WXT dev mode with hot reload (Chrome)
- `npm run dev:firefox` — WXT dev mode (Firefox)
- `npm run build` — Production build → `.output/chrome-mv3/`
- `npm test` — Run all Vitest tests
- `npm run test:watch` — Watch mode
- `npm run test:coverage` — Coverage report

## Testing conventions
- Tests live in `tests/` as `*.test.ts` files
- Browser APIs are mocked via `vi.fn()` on a `globalThis.browser` object
- `executeScript` is mocked at the module level via `vi.mock()`
- Integration tests verify cross-module behavior (URL filtering → key lookup → stopCallback)
- The action handler test dynamically generates a test for every action in the registry

## Important gotchas
- The `open_in_tab` option for the options page is set via `<meta name="manifest.open_in_tab" content="true">` in the HTML (WXT convention), not in `wxt.config.ts`
- `chrome.userScripts` may be undefined if the user hasn't enabled the permission — always guard
- The serialized `registerHandlers` function in `registerUserScript()` uses `var` (not `const`) for the handlers object so it's accessible in the closure after `toString()` serialization
- Mousetrap's `stopCallback` prototype override must reference the shared `keys` array from the content script's closure
