import type { ShortcutPack } from './index'

const pack: ShortcutPack = {
  id: 'github',
  name: 'GitHub Navigation',
  icon: '🐙',
  description: 'Quick navigation for GitHub — jump to PRs, issues, actions, and search repos.',
  color: '#1a1a2e',
  shortcuts: [
    { key: 'g p', action: 'javascript', label: 'Go to Pull Requests', code: 'window.location.href = window.location.origin + "/" + window.location.pathname.split("/").slice(1,3).join("/") + "/pulls"', blacklist: 'whitelist', sites: '*github.com*', sitesArray: ['*github.com*'] },
    { key: 'g i', action: 'javascript', label: 'Go to Issues', code: 'window.location.href = window.location.origin + "/" + window.location.pathname.split("/").slice(1,3).join("/") + "/issues"', blacklist: 'whitelist', sites: '*github.com*', sitesArray: ['*github.com*'] },
    { key: 'g a', action: 'javascript', label: 'Go to Actions', code: 'window.location.href = window.location.origin + "/" + window.location.pathname.split("/").slice(1,3).join("/") + "/actions"', blacklist: 'whitelist', sites: '*github.com*', sitesArray: ['*github.com*'] },
    { key: 'g c', action: 'javascript', label: 'Go to Code (root)', code: 'window.location.href = window.location.origin + "/" + window.location.pathname.split("/").slice(1,3).join("/")', blacklist: 'whitelist', sites: '*github.com*', sitesArray: ['*github.com*'] },
    { key: 'g s', action: 'javascript', label: 'Go to Settings', code: 'window.location.href = window.location.origin + "/" + window.location.pathname.split("/").slice(1,3).join("/") + "/settings"', blacklist: 'whitelist', sites: '*github.com*', sitesArray: ['*github.com*'] },
    { key: 'g n', action: 'javascript', label: 'Go to Notifications', code: 'window.location.href = "https://github.com/notifications"', blacklist: 'whitelist', sites: '*github.com*', sitesArray: ['*github.com*'] },
    { key: 'alt+g', action: 'searchgithub', label: 'Search GitHub for selection' },
  ],
}

export default pack
