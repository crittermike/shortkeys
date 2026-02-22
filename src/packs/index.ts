import type { KeySetting } from '@/utils/url-matching'

export interface ShortcutPack {
  id: string
  name: string
  icon: string
  description: string
  color: string
  shortcuts: KeySetting[]
}

import vimPack from './vim'
import productivityPack from './productivity'
import youtubePack from './youtube'
import githubPack from './github'
import keyboardPowerPack from './keyboard-power'
import developerPack from './developer'
import readingPack from './reading'
import tabManagerPack from './tab-manager'
import emacsPack from './emacs'
import mediaControlPack from './media-control'

export { vimPack, productivityPack, youtubePack, githubPack, keyboardPowerPack, developerPack, readingPack, tabManagerPack, emacsPack, mediaControlPack }

export const ALL_PACKS: ShortcutPack[] = [
  vimPack,
  productivityPack,
  youtubePack,
  githubPack,
  keyboardPowerPack,
  developerPack,
  readingPack,
  tabManagerPack,
  emacsPack,
  mediaControlPack,
]
