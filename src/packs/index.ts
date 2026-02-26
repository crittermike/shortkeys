import type { KeySetting } from '@/utils/url-matching'

export interface ShortcutPack {
  id: string
  name: string
  icon: string
  description: string
  color: string
  shortcuts: KeySetting[]
}

import vimPack from '../../packs/official/vim.json'
import productivityPack from '../../packs/official/productivity.json'
import youtubePack from '../../packs/official/youtube.json'
import keyboardPowerPack from '../../packs/official/keyboard-power.json'
import developerPack from '../../packs/official/developer.json'
import readingPack from '../../packs/official/reading.json'
import tabManagerPack from '../../packs/official/tab-manager.json'
import emacsPack from '../../packs/official/emacs.json'
import mediaControlPack from '../../packs/official/media-control.json'

export const ALL_PACKS: ShortcutPack[] = [
  vimPack,
  productivityPack,
  youtubePack,
  keyboardPowerPack,
  developerPack,
  readingPack,
  tabManagerPack,
  emacsPack,
  mediaControlPack,
] as ShortcutPack[]
