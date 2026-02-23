import type { ShortcutPack } from './index'

const pack: ShortcutPack = {
  id: 'media-control',
  name: 'Media Controls',
  icon: '🎵',
  description: 'Universal media controls — play, pause, speed up, skip, mute, and fullscreen for any video on any site.',
  color: '#ec4899',
  shortcuts: [
    { key: 'alt+space', action: 'videoplaypause', label: 'Play/pause video', activeInInputs: true },
    { key: 'alt+m', action: 'videomute', label: 'Mute/unmute video', activeInInputs: true },
    { key: 'alt+f', action: 'videofullscreen', label: 'Toggle video fullscreen', activeInInputs: true },
    { key: 'alt+]', action: 'videospeedup', label: 'Speed up (0.25×)', activeInInputs: true },
    { key: 'alt+[', action: 'videospeeddown', label: 'Slow down (0.25×)', activeInInputs: true },
    { key: 'alt+\\', action: 'videospeedreset', label: 'Reset speed to 1×', activeInInputs: true },
    { key: 'alt+right', action: 'videoskipforward', label: 'Skip forward 10s', activeInInputs: true },
    { key: 'alt+left', action: 'videoskipback', label: 'Skip back 10s', activeInInputs: true },
    { key: 'alt+a', action: 'audibletab', label: 'Jump to audible tab', activeInInputs: true },
    { key: 'alt+shift+m', action: 'togglemute', label: 'Mute/unmute tab audio', activeInInputs: true },
    { key: 'alt+shift+?', action: 'showcheatsheet', label: 'Show cheat sheet' },
  ],
}

export default pack
