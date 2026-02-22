import type { ShortcutPack } from './index'

const pack: ShortcutPack = {
  id: 'gmail',
  name: 'Gmail Shortcuts',
  icon: '📧',
  description: 'Keyboard shortcuts for Gmail — compose, archive, reply, navigate folders, and manage messages.',
  color: '#ea4335',
  shortcuts: [
    { key: 'c', action: 'javascript', label: 'Compose new email', code: "document.dispatchEvent(new KeyboardEvent('keydown', {key: 'c', bubbles: true}))", blacklist: 'whitelist', sites: '*mail.google.com*', sitesArray: ['*mail.google.com*'] },
    { key: 'e', action: 'javascript', label: 'Archive conversation', code: "document.dispatchEvent(new KeyboardEvent('keydown', {key: 'e', bubbles: true}))", blacklist: 'whitelist', sites: '*mail.google.com*', sitesArray: ['*mail.google.com*'] },
    { key: '/', action: 'javascript', label: 'Search mail', code: "document.dispatchEvent(new KeyboardEvent('keydown', {key: '/', bubbles: true}))", blacklist: 'whitelist', sites: '*mail.google.com*', sitesArray: ['*mail.google.com*'] },
    { key: 'shift+a', action: 'javascript', label: 'Select all conversations', code: "document.dispatchEvent(new KeyboardEvent('keydown', {key: 'a', shiftKey: true, bubbles: true}))", blacklist: 'whitelist', sites: '*mail.google.com*', sitesArray: ['*mail.google.com*'] },
    { key: 'r', action: 'javascript', label: 'Reply', code: "document.dispatchEvent(new KeyboardEvent('keydown', {key: 'r', bubbles: true}))", blacklist: 'whitelist', sites: '*mail.google.com*', sitesArray: ['*mail.google.com*'] },
    { key: 'f', action: 'javascript', label: 'Forward', code: "document.dispatchEvent(new KeyboardEvent('keydown', {key: 'f', bubbles: true}))", blacklist: 'whitelist', sites: '*mail.google.com*', sitesArray: ['*mail.google.com*'] },
    { key: 'l', action: 'javascript', label: 'Label conversation', code: "document.dispatchEvent(new KeyboardEvent('keydown', {key: 'l', bubbles: true}))", blacklist: 'whitelist', sites: '*mail.google.com*', sitesArray: ['*mail.google.com*'] },
    { key: 'g i', action: 'javascript', label: 'Go to Inbox', code: "document.dispatchEvent(new KeyboardEvent('keydown', {key: 'g', bubbles: true})); setTimeout(() => document.dispatchEvent(new KeyboardEvent('keydown', {key: 'i', bubbles: true})), 50)", blacklist: 'whitelist', sites: '*mail.google.com*', sitesArray: ['*mail.google.com*'] },
    { key: 'g s', action: 'javascript', label: 'Go to Sent', code: "document.dispatchEvent(new KeyboardEvent('keydown', {key: 'g', bubbles: true})); setTimeout(() => document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true})), 50)", blacklist: 'whitelist', sites: '*mail.google.com*', sitesArray: ['*mail.google.com*'] },
    { key: 'g d', action: 'javascript', label: 'Go to Drafts', code: "document.dispatchEvent(new KeyboardEvent('keydown', {key: 'g', bubbles: true})); setTimeout(() => document.dispatchEvent(new KeyboardEvent('keydown', {key: 'd', bubbles: true})), 50)", blacklist: 'whitelist', sites: '*mail.google.com*', sitesArray: ['*mail.google.com*'] },
    { key: 'shift+i', action: 'javascript', label: 'Mark as read', code: "document.dispatchEvent(new KeyboardEvent('keydown', {key: 'I', shiftKey: true, bubbles: true}))", blacklist: 'whitelist', sites: '*mail.google.com*', sitesArray: ['*mail.google.com*'] },
    { key: 's', action: 'javascript', label: 'Star/unstar conversation', code: "document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', bubbles: true}))", blacklist: 'whitelist', sites: '*mail.google.com*', sitesArray: ['*mail.google.com*'] },
  ],
}

export default pack
