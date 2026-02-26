import type { SiteShortcutData } from './types'

export const github: SiteShortcutData = {
  title: 'GitHub',
  referenceUrl: 'https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts',
  hostPatterns: ['github.com'],
  sections: [
    {
      name: 'Site-wide',
      shortcuts: [
        { description: 'Focus the search bar', keys: ['S'] },
        { description: 'Go to notifications', keys: ['G', 'N'] },
        { description: 'Open command palette', keys: ['Ctrl', 'K'] },
        { description: 'Show keyboard shortcuts', keys: ['?'] },
      ],
    },
    {
      name: 'Repositories',
      shortcuts: [
        { description: 'Go to Code tab', keys: ['G', 'C'] },
        { description: 'Go to Issues tab', keys: ['G', 'I'] },
        { description: 'Go to Pull Requests tab', keys: ['G', 'P'] },
        { description: 'Go to Actions tab', keys: ['G', 'A'] },
        { description: 'Go to Projects tab', keys: ['G', 'B'] },
        { description: 'Go to Wiki tab', keys: ['G', 'W'] },
      ],
    },
    {
      name: 'Source code browsing',
      shortcuts: [
        { description: 'Activate file finder', keys: ['T'] },
        { description: 'Jump to line', keys: ['L'] },
        { description: 'Switch branch or tag', keys: ['W'] },
        { description: 'Expand URL to canonical form', keys: ['Y'] },
        { description: 'Show/hide diff comments', keys: ['I'] },
        { description: 'Open blame view', keys: ['B'] },
      ],
    },
    {
      name: 'Issues & pull requests',
      shortcuts: [
        { description: 'Create issue', keys: ['C'] },
        { description: 'Focus search bar', keys: ['Ctrl', '/'] },
        { description: 'Filter by author', keys: ['U'] },
        { description: 'Filter by label', keys: ['L'] },
        { description: 'Filter by milestone', keys: ['M'] },
        { description: 'Filter by assignee', keys: ['A'] },
        { description: 'Open issue', keys: ['O'] },
        { description: 'Request reviewer', keys: ['Q'] },
        { description: 'Submit comment', keys: ['Ctrl', 'Enter'] },
      ],
    },
    {
      name: 'Pull request diffs',
      shortcuts: [
        { description: 'List of commits', keys: ['C'] },
        { description: 'List of changed files', keys: ['T'] },
        { description: 'Move selection down', keys: ['J'] },
        { description: 'Move selection up', keys: ['K'] },
        { description: 'Add single comment', keys: ['Ctrl', 'Shift', 'Enter'] },
      ],
    },
    {
      name: 'Notifications',
      shortcuts: [
        { description: 'Mark as read', keys: ['E'] },
        { description: 'Mute thread', keys: ['Shift', 'M'] },
      ],
    },
  ],
}
