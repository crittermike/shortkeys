import type { ShortcutPack } from './index'

const pack: ShortcutPack = {
  id: 'youtube',
  name: 'YouTube Controls',
  icon: '🎬',
  description: 'Full keyboard control over YouTube videos — speed, playback, skipping, and more.',
  color: '#ef4444',
  shortcuts: [
    { key: 'shift+.', action: 'videospeedup', label: 'Speed up (0.25×)', blacklist: 'whitelist', sites: '*youtube.com*\n*youtu.be*', sitesArray: ['*youtube.com*', '*youtu.be*'] },
    { key: 'shift+,', action: 'videospeeddown', label: 'Slow down (0.25×)', blacklist: 'whitelist', sites: '*youtube.com*\n*youtu.be*', sitesArray: ['*youtube.com*', '*youtu.be*'] },
    { key: 'shift+/', action: 'videospeedreset', label: 'Reset speed to 1×', blacklist: 'whitelist', sites: '*youtube.com*\n*youtu.be*', sitesArray: ['*youtube.com*', '*youtu.be*'] },
    { key: 'shift+right', action: 'videoskipforward', label: 'Skip forward 10s', blacklist: 'whitelist', sites: '*youtube.com*\n*youtu.be*', sitesArray: ['*youtube.com*', '*youtu.be*'] },
    { key: 'shift+left', action: 'videoskipback', label: 'Skip back 10s', blacklist: 'whitelist', sites: '*youtube.com*\n*youtu.be*', sitesArray: ['*youtube.com*', '*youtu.be*'] },
    { key: 'shift+space', action: 'videoplaypause', label: 'Play/pause', blacklist: 'whitelist', sites: '*youtube.com*\n*youtu.be*', sitesArray: ['*youtube.com*', '*youtu.be*'] },
    { key: 'shift+m', action: 'videomute', label: 'Mute/unmute', blacklist: 'whitelist', sites: '*youtube.com*\n*youtu.be*', sitesArray: ['*youtube.com*', '*youtu.be*'] },
    { key: 'shift+f', action: 'videofullscreen', label: 'Toggle fullscreen', blacklist: 'whitelist', sites: '*youtube.com*\n*youtu.be*', sitesArray: ['*youtube.com*', '*youtu.be*'] },
    { key: 'shift+y', action: 'searchyoutube', label: 'Search YouTube for selection', blacklist: 'whitelist', sites: '*youtube.com*\n*youtu.be*', sitesArray: ['*youtube.com*', '*youtu.be*'] },
  ],
}

export default pack
