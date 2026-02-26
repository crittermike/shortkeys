import type { SiteShortcutData } from './types'

export const slack: SiteShortcutData = {
  title: 'Slack',
  referenceUrl: 'https://slack.com/help/articles/201374536-Slack-keyboard-shortcuts',
  hostPatterns: ['slack.com'],
  sections: [
    {
      name: 'Navigation',
      shortcuts: [
        { description: 'Quick switcher', keys: ['Ctrl', 'K'] },
        { description: 'Search', keys: ['Ctrl', 'G'] },
        { description: 'Next unread channel', keys: ['Alt', 'Shift', 'Down'] },
        { description: 'Previous unread channel', keys: ['Alt', 'Shift', 'Up'] },
        { description: 'Next channel/DM', keys: ['Alt', 'Down'] },
        { description: 'Previous channel/DM', keys: ['Alt', 'Up'] },
        { description: 'Threads', keys: ['Ctrl', 'Shift', 'T'] },
        { description: 'All DMs', keys: ['Ctrl', 'Shift', 'K'] },
        { description: 'Channel browser', keys: ['Ctrl', 'Shift', 'L'] },
        { description: 'Go back in history', keys: ['Alt', 'Left'] },
        { description: 'Go forward in history', keys: ['Alt', 'Right'] },
      ],
    },
    {
      name: 'Messages',
      shortcuts: [
        { description: 'Edit last message', keys: ['Up'] },
        { description: 'New line in message', keys: ['Shift', 'Enter'] },
        { description: 'Bold', keys: ['Ctrl', 'B'] },
        { description: 'Italic', keys: ['Ctrl', 'I'] },
        { description: 'Strikethrough', keys: ['Ctrl', 'Shift', 'X'] },
        { description: 'Quote', keys: ['Ctrl', 'Shift', '9'] },
        { description: 'Code block', keys: ['Ctrl', 'Shift', 'C'] },
        { description: 'Create snippet', keys: ['Ctrl', 'Shift', 'Enter'] },
        { description: 'Upload file', keys: ['Ctrl', 'U'] },
        { description: 'Add emoji reaction', keys: ['Ctrl', 'Shift', '\\'] },
      ],
    },
    {
      name: 'Actions',
      shortcuts: [
        { description: 'Set status', keys: ['Ctrl', 'Shift', 'Y'] },
        { description: 'Toggle sidebar', keys: ['Ctrl', 'Shift', 'D'] },
        { description: 'Open channel details', keys: ['Ctrl', 'Shift', 'I'] },
        { description: 'Mark all as read', keys: ['Shift', 'Esc'] },
        { description: 'Mark channel as read', keys: ['Esc'] },
        { description: 'Mute channel', keys: ['Ctrl', 'Shift', 'M'] },
      ],
    },
  ],
}
