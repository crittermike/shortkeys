import type { SiteShortcutData } from './types'

export const notion: SiteShortcutData = {
  title: 'Notion',
  referenceUrl: 'https://www.notion.so/help/keyboard-shortcuts',
  hostPatterns: ['notion.so', 'www.notion.so'],
  sections: [
    {
      name: 'Navigation',
      shortcuts: [
        { description: 'Search', keys: ['Ctrl', 'P'] },
        { description: 'Go back', keys: ['Ctrl', '['] },
        { description: 'Go forward', keys: ['Ctrl', ']'] },
        { description: 'Switch workspace', keys: ['Ctrl', 'Shift', 'O'] },
        { description: 'Create new page', keys: ['Ctrl', 'N'] },
        { description: 'Open as page', keys: ['Enter'] },
        { description: 'Toggle sidebar', keys: ['Ctrl', '\\'] },
      ],
    },
    {
      name: 'Content',
      shortcuts: [
        { description: 'Bold', keys: ['Ctrl', 'B'] },
        { description: 'Italic', keys: ['Ctrl', 'I'] },
        { description: 'Underline', keys: ['Ctrl', 'U'] },
        { description: 'Strikethrough', keys: ['Ctrl', 'Shift', 'S'] },
        { description: 'Link', keys: ['Ctrl', 'K'] },
        { description: 'Inline code', keys: ['Ctrl', 'E'] },
        { description: 'Undo', keys: ['Ctrl', 'Z'] },
        { description: 'Redo', keys: ['Ctrl', 'Shift', 'Z'] },
      ],
    },
    {
      name: 'Blocks',
      shortcuts: [
        { description: 'Text block', keys: ['/', 'text'] },
        { description: 'To-do list', keys: ['/', 'todo'] },
        { description: 'Heading 1', keys: ['/', 'h1'] },
        { description: 'Heading 2', keys: ['/', 'h2'] },
        { description: 'Heading 3', keys: ['/', 'h3'] },
        { description: 'Bulleted list', keys: ['/', 'bullet'] },
        { description: 'Numbered list', keys: ['/', 'num'] },
        { description: 'Toggle list', keys: ['/', 'toggle'] },
        { description: 'Code block', keys: ['/', 'code'] },
        { description: 'Divider', keys: ['---'] },
        { description: 'Delete block', keys: ['Backspace'] },
        { description: 'Duplicate block', keys: ['Ctrl', 'D'] },
        { description: 'Move block up', keys: ['Ctrl', 'Shift', 'Up'] },
        { description: 'Move block down', keys: ['Ctrl', 'Shift', 'Down'] },
      ],
    },
    {
      name: 'Markdown',
      shortcuts: [
        { description: 'Bold', keys: ['**text**'] },
        { description: 'Italic', keys: ['*text*'] },
        { description: 'To-do checkbox', keys: ['[]'] },
        { description: 'H1', keys: ['#', 'Space'] },
        { description: 'H2', keys: ['##', 'Space'] },
        { description: 'H3', keys: ['###', 'Space'] },
        { description: 'Bullet list', keys: ['-', 'Space'] },
        { description: 'Toggle', keys: ['>', 'Space'] },
      ],
    },
  ],
}
