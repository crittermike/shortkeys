import type { SiteShortcutData } from './types'

export const youtube: SiteShortcutData = {
  title: 'YouTube',
  referenceUrl: 'https://support.google.com/youtube/answer/7631406',
  hostPatterns: ['youtube.com', 'www.youtube.com'],
  sections: [
    {
      name: 'Playback',
      shortcuts: [
        { description: 'Play/pause', keys: ['K'] },
        { description: 'Play/pause (seek bar focused)', keys: ['Space'] },
        { description: 'Seek back 5 seconds', keys: ['Left'] },
        { description: 'Seek forward 5 seconds', keys: ['Right'] },
        { description: 'Seek back 10 seconds', keys: ['J'] },
        { description: 'Seek forward 10 seconds', keys: ['L'] },
        { description: 'Seek to 10–90% of video', keys: ['1–9'] },
        { description: 'Seek to beginning', keys: ['0'] },
        { description: 'Previous frame (paused)', keys: [','] },
        { description: 'Next frame (paused)', keys: ['.'] },
        { description: 'Decrease playback speed', keys: ['Shift', '<'] },
        { description: 'Increase playback speed', keys: ['Shift', '>'] },
      ],
    },
    {
      name: 'General',
      shortcuts: [
        { description: 'Toggle fullscreen', keys: ['F'] },
        { description: 'Toggle captions', keys: ['C'] },
        { description: 'Toggle theater mode', keys: ['T'] },
        { description: 'Toggle miniplayer', keys: ['I'] },
        { description: 'Toggle mute', keys: ['M'] },
        { description: 'Increase volume', keys: ['Up'] },
        { description: 'Decrease volume', keys: ['Down'] },
        { description: 'Next video', keys: ['Shift', 'N'] },
        { description: 'Previous video', keys: ['Shift', 'P'] },
        { description: 'Go to search box', keys: ['/'] },
      ],
    },
  ],
}
