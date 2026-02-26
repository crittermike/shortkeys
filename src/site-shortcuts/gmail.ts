import type { SiteShortcutData } from './types'

export const gmail: SiteShortcutData = {
  title: 'Gmail',
  referenceUrl: 'https://support.google.com/mail/answer/6594',
  hostPatterns: ['mail.google.com'],
  sections: [
    {
      name: 'Compose',
      shortcuts: [
        { description: 'Compose new email', keys: ['C'] },
        { description: 'Compose in new tab', keys: ['D'] },
        { description: 'Send', keys: ['Ctrl', 'Enter'] },
        { description: 'Add cc recipients', keys: ['Ctrl', 'Shift', 'C'] },
        { description: 'Add bcc recipients', keys: ['Ctrl', 'Shift', 'B'] },
        { description: 'Insert link', keys: ['Ctrl', 'K'] },
      ],
    },
    {
      name: 'Navigation',
      shortcuts: [
        { description: 'Go to inbox', keys: ['G', 'I'] },
        { description: 'Go to starred', keys: ['G', 'S'] },
        { description: 'Go to sent', keys: ['G', 'T'] },
        { description: 'Go to drafts', keys: ['G', 'D'] },
        { description: 'Go to all mail', keys: ['G', 'A'] },
        { description: 'Go to contacts', keys: ['G', 'C'] },
        { description: 'Go to tasks', keys: ['G', 'K'] },
        { description: 'Next page', keys: ['G', 'N'] },
        { description: 'Previous page', keys: ['G', 'P'] },
        { description: 'Search mail', keys: ['/'] },
      ],
    },
    {
      name: 'Actions',
      shortcuts: [
        { description: 'Select conversation', keys: ['X'] },
        { description: 'Archive', keys: ['E'] },
        { description: 'Delete', keys: ['Shift', '3'] },
        { description: 'Reply', keys: ['R'] },
        { description: 'Reply all', keys: ['A'] },
        { description: 'Forward', keys: ['F'] },
        { description: 'Star/unstar', keys: ['S'] },
        { description: 'Mute conversation', keys: ['M'] },
        { description: 'Mark as read', keys: ['Shift', 'I'] },
        { description: 'Mark as unread', keys: ['Shift', 'U'] },
        { description: 'Mark as important', keys: ['='] },
        { description: 'Snooze', keys: ['B'] },
        { description: 'Undo last action', keys: ['Z'] },
        { description: 'Report spam', keys: ['Shift', '1'] },
      ],
    },
    {
      name: 'Thread list',
      shortcuts: [
        { description: 'Newer conversation', keys: ['K'] },
        { description: 'Older conversation', keys: ['J'] },
        { description: 'Open conversation', keys: ['Enter'] },
        { description: 'Back to list', keys: ['U'] },
        { description: 'Select all', keys: ['Shift', '8', 'A'] },
        { description: 'Deselect all', keys: ['Shift', '8', 'N'] },
      ],
    },
    {
      name: 'Formatting',
      shortcuts: [
        { description: 'Bold', keys: ['Ctrl', 'B'] },
        { description: 'Italic', keys: ['Ctrl', 'I'] },
        { description: 'Underline', keys: ['Ctrl', 'U'] },
        { description: 'Numbered list', keys: ['Ctrl', 'Shift', '7'] },
        { description: 'Bulleted list', keys: ['Ctrl', 'Shift', '8'] },
        { description: 'Remove formatting', keys: ['Ctrl', '\\'] },
      ],
    },
  ],
}
