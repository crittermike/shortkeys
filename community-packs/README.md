# Contributing Community Packs

Community packs are user-contributed shortcut collections that anyone can install from the Import tab in Shortkeys.

## How to submit a pack

1. **Create your shortcuts** in Shortkeys and organize them into a group
2. **Right-click the group** → "Publish to community" to auto-generate a submission
3. **Fill in the details** (description, author, icon, category, tags) in the GitHub issue
4. A maintainer will review your submission and create a PR

Or submit manually:

1. Fork this repository
2. Create a JSON file in `community-packs/` (see format below)
3. Open a pull request

## Pack format

Each pack is a single JSON file in the `community-packs/` directory:

```json
{
  "id": "community-your-pack-name",
  "name": "Your Pack Name",
  "icon": "🎯",
  "description": "A short description of what this pack does.",
  "color": "#7c3aed",
  "author": "your-github-username",
  "category": "productivity",
  "tags": ["tag1", "tag2"],
  "shortcuts": [
    { "key": "alt+shift+f", "action": "onlytab", "label": "Close all other tabs" },
    { "key": "alt+shift+m", "action": "togglemute", "label": "Mute/unmute current tab" }
  ]
}
```

### Required fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID, must start with `community-` |
| `name` | string | Display name for the pack |
| `icon` | string | Single emoji |
| `description` | string | Short description (1-2 sentences) |
| `color` | string | Hex color for the pack card |
| `author` | string | Your GitHub username |
| `category` | string | One of: `productivity`, `navigation`, `accessibility`, `developer`, `media`, `reading`, `uncategorized` |
| `tags` | string[] | Relevant keywords for search |
| `shortcuts` | array | Array of shortcut objects |

### Shortcut fields

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Keyboard shortcut (e.g. `alt+shift+f`) |
| `action` | string | Action ID from the [actions registry](../src/utils/actions-registry.ts) |
| `label` | string | Human-readable description |
| `code` | string | (Optional) JavaScript code, only for `javascript` actions |

## Guidelines

- **Don't duplicate built-in packs** — check `src/packs/` for existing Vim, Emacs, YouTube, etc. packs
- **Don't duplicate website shortcuts** — if a site already has keyboard shortcuts (Gmail, GitHub, etc.), don't recreate them
- **Use sentence case for labels** — "Close all other tabs" not "Close All Other Tabs"
- **Keep packs focused** — 4-12 shortcuts is ideal, avoid kitchen-sink packs
- **Test your shortcuts** — make sure every shortcut works before submitting
- **JavaScript actions require extra review** — packs with `code` fields will show a security warning to users before install

## Categories

| Category | Description |
|----------|-------------|
| `productivity` | Workflow optimization, tab management, focus tools |
| `navigation` | Page scrolling, link navigation, history |
| `accessibility` | Font size, contrast, screen reader helpers |
| `developer` | DevTools, console, debugging shortcuts |
| `media` | Video/audio controls, playback |
| `reading` | Read mode, text formatting, bookmarks |
| `uncategorized` | Everything else |

## What happens after you submit

1. A maintainer reviews your pack for quality and security
2. If approved, it's merged into the `community-packs/` directory
3. On the next site build, your pack appears in the community catalog
4. Users can discover and install it from the Import tab
