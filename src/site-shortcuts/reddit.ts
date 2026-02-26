import type { SiteShortcutData } from './types'

export const reddit: SiteShortcutData = {
  title: 'Reddit',
  referenceUrl: 'https://www.reddit.com/r/help/wiki/faq/#wiki_keyboard_shortcuts',
  hostPatterns: ['reddit.com', 'www.reddit.com', 'old.reddit.com'],
  sections: [
    {
      name: 'Navigation',
      shortcuts: [
        { description: 'Show shortcuts', keys: ['Shift', '?'] },
        { description: 'Next post or comment', keys: ['J'] },
        { description: 'Previous post or comment', keys: ['K'] },
        { description: 'Next post in lightbox', keys: ['N'] },
        { description: 'Previous post in lightbox', keys: ['P'] },
        { description: 'Open post', keys: ['Enter'] },
        { description: 'Open/close expando', keys: ['X'] },
        { description: 'Go to post link', keys: ['L'] },
      ],
    },
    {
      name: 'Actions',
      shortcuts: [
        { description: 'Upvote', keys: ['A'] },
        { description: 'Downvote', keys: ['Z'] },
        { description: 'New post', keys: ['C'] },
        { description: 'Reply', keys: ['R'] },
        { description: 'Submit', keys: ['Ctrl', 'Enter'] },
        { description: 'Save', keys: ['S'] },
        { description: 'Hide', keys: ['H'] },
        { description: 'Open navigation', keys: ['Q'] },
        { description: 'Collapse/expand comment', keys: ['Enter'] },
      ],
    },
  ],
}
