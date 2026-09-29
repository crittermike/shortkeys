import { ref } from 'vue'
import { loadVimSettings, saveVimSettings } from '@/utils/storage'
import {
  DEFAULT_VIM_SETTINGS,
  isCustomized,
  normalizeVimSettings,
  type VimSettings,
} from '@/utils/vim-settings'
import { useToast } from './useToast'

const settings = ref<VimSettings>({ ...DEFAULT_VIM_SETTINGS })
const loaded = ref(false)

let saveTimer: ReturnType<typeof setTimeout> | null = null

/** Read the stored settings once per options-page session. */
async function initVimSettings(): Promise<void> {
  if (loaded.value) return
  settings.value = await loadVimSettings()
  loaded.value = true
}

/**
 * Persist after a short pause so typing in a text field doesn't write on every
 * keystroke. Values are normalized first, so an out-of-range number is clamped
 * before it reaches storage.
 */
function persistVimSettings(delay = 400): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    settings.value = normalizeVimSettings(settings.value)
    await saveVimSettings(settings.value)
  }, delay)
}

/** Put everything back to the shipped defaults. */
async function resetVimSettings(): Promise<void> {
  if (saveTimer) clearTimeout(saveTimer)
  settings.value = { ...DEFAULT_VIM_SETTINGS }
  await saveVimSettings(settings.value)
  useToast().showSnack('Vim settings reset to defaults')
}

export function useVimSettings() {
  return {
    vimSettings: settings,
    vimSettingsLoaded: loaded,
    initVimSettings,
    persistVimSettings,
    resetVimSettings,
    isVimCustomized: () => isCustomized(settings.value),
  }
}
