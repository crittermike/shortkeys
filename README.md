# Shortkeys

Custom keyboard shortcuts for your browser

[Chrome Webstore](https://chrome.google.com/webstore/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck) |
[Firefox Add-on](https://addons.mozilla.org/firefox/addon/shortkeys/) |
[Documentation](https://github.com/mikecrittenden/shortkeys/wiki/How-To-Use-Shortkeys) |
[Support](https://github.com/mikecrittenden/shortkeys/issues)

## Install

    npm install

## Development

    npm run dev           # Chrome
    npm run dev:firefox   # Firefox

## Build

    npm run build           # Chrome
    npm run build:firefox   # Firefox

## Testing

    npm test              # Run all tests
    npm run test:watch    # Watch mode
    npm run test:coverage # With coverage

## Architecture

Built with [WXT](https://wxt.dev/) (Vite-based browser extension framework), Vue 3, and TypeScript.

```
src/
├── entrypoints/
│   ├── background.ts        # Service worker
│   ├── content.ts           # Content script (Mousetrap bindings)
│   └── options/             # Options page (Vue 3)
│       ├── App.vue
│       ├── index.html
│       └── main.ts
├── actions/
│   ├── action-handlers.ts   # Action registry (Map-based dispatch)
│   ├── capture-screenshot.ts
│   └── last-used-tab.ts
└── utils/
    ├── actions-registry.ts  # Action definitions & metadata
    ├── content-logic.ts     # Content script pure logic
    ├── execute-script.ts    # Scripting API wrapper
    └── url-matching.ts      # Glob/regex URL matching
```

## Credits

* Icon made by [Freepik](https://www.flaticon.com/authors/freepik "Freepik") from [www.flaticon.com](https://www.flaticon.com/ "Flaticon").
