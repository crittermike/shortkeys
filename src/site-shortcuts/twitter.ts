import type { SiteShortcutData } from './types'

export const twitter: SiteShortcutData = {
  title: 'X (Twitter)',
  referenceUrl: 'https://help.x.com/en/using-x/x-keyboard-shortcuts',
  hostPatterns: ['x.com', 'twitter.com'],
  sections: [
    {
      name: 'Navigation',
      shortcuts: [
        { description: 'Show shortcuts', keys: ['?'] },
        { description: 'Home', keys: ['G', 'H'] },
        { description: 'Explore', keys: ['G', 'E'] },
        { description: 'Notifications', keys: ['G', 'N'] },
        { description: 'Direct messages', keys: ['G', 'M'] },
        { description: 'Profile', keys: ['G', 'P'] },
        { description: 'Settings', keys: ['G', 'S'] },
        { description: 'Bookmarks', keys: ['G', 'B'] },
        { description: 'Lists', keys: ['G', 'L'] },
        { description: 'Search', keys: ['/'] },
      ],
    },
    {
      name: 'Actions',
      shortcuts: [
        { description: 'New post', keys: ['N'] },
        { description: 'Like', keys: ['L'] },
        { description: 'Reply', keys: ['R'] },
        { description: 'Repost', keys: ['T'] },
        { description: 'Send DM', keys: ['M'] },
        { description: 'Bookmark', keys: ['B'] },
        { description: 'Mute account', keys: ['U'] },
        { description: 'Block account', keys: ['X'] },
        { description: 'Open post details', keys: ['Enter'] },
      ],
    },
    {
      name: 'Timeline',
      shortcuts: [
        { description: 'Next post', keys: ['J'] },
        { description: 'Previous post', keys: ['K'] },
        { description: 'Load new posts', keys: ['.'] },
      ],
    },
    {
      name: 'Media',
      shortcuts: [
        { description: 'Expand photo', keys: ['O'] },
        { description: 'Previous photo', keys: ['I'] },
      ],
    },
  ],
}
