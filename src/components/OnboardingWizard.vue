<script setup lang="ts">
import { ref, computed } from 'vue'
import ShortcutRecorder from '@/components/ShortcutRecorder.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import { ACTION_CATEGORIES, getActionDescription, getActionLabel } from '@/utils/actions-registry'
import { getBrowserConflict } from '@/utils/shortcut-conflicts'
import { ALL_PACKS } from '@/packs'
import type { ShortcutPack } from '@/packs'

export interface OnboardingShortcutPayload {
  key: string
  action: string
  code?: string
  blacklist?: boolean | string
  activeInInputs?: boolean
  sites?: string
}

const emit = defineEmits<{
  (e: 'finish', payload: { shortcuts: OnboardingShortcutPayload[]; packs: ShortcutPack[] }): void
  (e: 'skip'): void
}>()

interface Draft {
  key: string
  code: string
  blacklist: boolean | string
  activeInInputs: boolean
  sites: string
}

const step = ref(1)
const selectedActions = ref<string[]>([])
const currentActionIndex = ref(0)
const showMoreActions = ref(false)
const selectedPacks = ref<ShortcutPack[]>([])
const previewingPack = ref<ShortcutPack | null>(null)
const drafts = ref<Record<string, Draft>>({})

const INITIAL_ACTIONS = [
  { id: 'toggledarkmode', icon: 'mdi-theme-light-dark' },
  { id: 'copyurl', icon: 'mdi-content-copy' },
  { id: 'copytitleurlmarkdown', icon: 'mdi-language-markdown' },
  { id: 'movetableft', icon: 'mdi-arrow-left-bold' },
  { id: 'movetabright', icon: 'mdi-arrow-right-bold' },
  { id: 'lastusedtab', icon: 'mdi-swap-horizontal' },
  { id: 'javascript', icon: 'mdi-language-javascript' },
  { id: 'linkhints', icon: 'mdi-cursor-default-click-outline' },
  { id: 'reopentab', icon: 'mdi-tab-unselected' },
].map(a => ({ ...a, label: getActionLabel(a.id) || a.id, description: getActionDescription(a.id) }))

const MORE_ACTIONS = [
  { id: 'focusinput', icon: 'mdi-form-textbox' },
  { id: 'showcheatsheet', icon: 'mdi-help-circle-outline' },
  { id: 'openclipboardurl', icon: 'mdi-clipboard-arrow-right-outline' },
  { id: 'closeduplicatetabs', icon: 'mdi-tab-minus' },
  { id: 'audibletab', icon: 'mdi-volume-high' },
  { id: 'sorttabs', icon: 'mdi-sort-alphabetical-ascending' },
  { id: 'videospeedup', icon: 'mdi-fast-forward' },
  { id: 'macro', icon: 'mdi-play-box-multiple-outline' },
  { id: 'togglebookmark', icon: 'mdi-bookmark-outline' },
  { id: 'editurl', icon: 'mdi-pencil-outline' },
  { id: 'urlup', icon: 'mdi-arrow-up-bold' },
  { id: 'disable', icon: 'mdi-cancel' },
].map(a => ({ ...a, label: getActionLabel(a.id) || a.id, description: getActionDescription(a.id) }))

// Featured packs shown initially (3 = fills one row)
const INITIAL_PACKS = ALL_PACKS.slice(0, 3)
const MORE_PACKS = ALL_PACKS.slice(3)


const ALL_ACTIONS = [...INITIAL_ACTIONS, ...MORE_ACTIONS]

const visibleActions = computed(() => {
  return showMoreActions.value ? ALL_ACTIONS : INITIAL_ACTIONS
})

const visiblePacks = computed(() => {
  return showMoreActions.value ? ALL_PACKS : INITIAL_PACKS
})

const currentAction = computed(() => {
  if (selectedActions.value.length === 0) return null
  const id = selectedActions.value[currentActionIndex.value]
  return ALL_ACTIONS.find(a => a.id === id) || null
})

const currentDraft = computed(() => {
  if (!currentAction.value) return null
  return drafts.value[currentAction.value.id] || null
})

const shortcutKey = computed({
  get: () => currentDraft.value?.key || '',
  set: (value: string) => {
    if (currentDraft.value) currentDraft.value.key = value
  },
})

const canAdvance = computed(() => {
  if (!shortcutKey.value) return false
  if (currentAction.value?.id === 'javascript' && !currentDraft.value?.code?.trim()) return false
  return true
})

const recordedShortcuts = computed(() => {
  return selectedActions.value
    .map(id => {
      const draft = drafts.value[id]
      const action = ALL_ACTIONS.find(a => a.id === id)
      if (!draft?.key || !action) return null
      return { actionId: id, actionLabel: action.label, icon: action.icon, key: draft.key }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
})

const conflictWarning = computed(() => {
  if (!shortcutKey.value) return null
  const conflict = getBrowserConflict(shortcutKey.value)
  return conflict ? `Overrides browser shortcut: ${conflict}` : null
})

const toggleAction = (actionId: string) => {
  const index = selectedActions.value.indexOf(actionId)
  if (index > -1) {
    selectedActions.value.splice(index, 1)
  } else {
    selectedActions.value.push(actionId)
  }
}

const togglePack = (pack: ShortcutPack) => {
  const index = selectedPacks.value.findIndex(p => p.id === pack.id)
  if (index > -1) {
    selectedPacks.value.splice(index, 1)
  } else {
    previewingPack.value = pack
  }
}

const confirmPack = () => {
  if (previewingPack.value) {
    selectedPacks.value.push(previewingPack.value)
    previewingPack.value = null
  }
}

const closePreview = () => {
  previewingPack.value = null
}

const toggleShowMore = () => {
  showMoreActions.value = !showMoreActions.value
}

const ensureDrafts = () => {
  for (const id of selectedActions.value) {
    if (!drafts.value[id]) {
      drafts.value[id] = { key: '', code: '', blacklist: false, activeInInputs: false, sites: '' }
    }
  }
}

const goToStep2 = () => {
  if (selectedActions.value.length > 0) {
    step.value = 2
    currentActionIndex.value = 0
    ensureDrafts()
  } else if (selectedPacks.value.length > 0) {
    // No individual actions selected, skip straight to success
    step.value = 3
  }
}

const goBack = () => {
  if (currentActionIndex.value > 0) {
    currentActionIndex.value--
  } else {
    step.value = 1
  }
}

const skipCurrent = () => {
  if (currentAction.value) {
    drafts.value[currentAction.value.id] = { key: '', code: '', blacklist: false, activeInInputs: false, sites: '' }
  }
  advanceOrFinish()
}

const recordNext = () => {
  advanceOrFinish()
}

const advanceOrFinish = () => {
  if (currentActionIndex.value < selectedActions.value.length - 1) {
    currentActionIndex.value++
    ensureDrafts()
  } else {
    step.value = 3
  }
}

const finish = () => {
  const shortcuts: OnboardingShortcutPayload[] = selectedActions.value
    .map(id => {
      const draft = drafts.value[id]
      if (!draft?.key) return null
      const payload: OnboardingShortcutPayload = { key: draft.key, action: id }
      if (id === 'javascript' && draft.code) payload.code = draft.code
      if (draft.activeInInputs) payload.activeInInputs = true
      if (draft.blacklist) {
        payload.blacklist = draft.blacklist
        payload.sites = draft.sites || ''
      }
      return payload
    })
    .filter((s): s is OnboardingShortcutPayload => s !== null)

  emit('finish', { shortcuts, packs: selectedPacks.value })
}

const skip = () => {
  emit('skip')
}
</script>
<template>
  <div class="bg-surface-card border border-border-default rounded-[18px] shadow-xl max-w-[680px] mx-auto my-10 flex flex-col">
    <div class="px-8 pt-8 pb-0 flex flex-col items-center gap-4">
      <div class="flex items-center gap-2">
        <div :class="['w-8 h-8 rounded-full bg-surface-elevated border-2 border-border-default text-text-muted flex items-center justify-center text-[13px] font-bold transition-all duration-400', { '!bg-accent-bg !border-accent !text-accent': step >= 1, '!bg-accent !text-white shadow-[0_0_0_6px_var(--blue-bg)]': step === 1 }]">1</div>
        <div :class="['text-[13px] font-semibold text-text-muted transition-colors duration-400', { '!text-text-primary': step >= 1 }]">Choose actions</div>
        <div :class="['w-10 h-[2px] bg-border-default transition-all duration-400', { '!bg-accent': step >= 2 }]"></div>
        <div :class="['w-8 h-8 rounded-full bg-surface-elevated border-2 border-border-default text-text-muted flex items-center justify-center text-[13px] font-bold transition-all duration-400', { '!bg-accent-bg !border-accent !text-accent': step >= 2, '!bg-accent !text-white shadow-[0_0_0_6px_var(--blue-bg)]': step === 2 }]">2</div>
        <div :class="['text-[13px] font-semibold text-text-muted transition-colors duration-400', { '!text-text-primary': step >= 2 }]">Set up shortcuts</div>
        <div :class="['w-10 h-[2px] bg-border-default transition-all duration-400', { '!bg-accent': step >= 3 }]"></div>
        <div :class="['w-8 h-8 rounded-full bg-surface-elevated border-2 border-border-default text-text-muted flex items-center justify-center text-[13px] font-bold transition-all duration-400', { '!bg-accent-bg !border-accent !text-accent': step >= 3, '!bg-accent !text-white shadow-[0_0_0_6px_var(--blue-bg)]': step === 3 }]">3</div>
        <div :class="['text-[13px] font-semibold text-text-muted transition-colors duration-400', { '!text-text-primary': step >= 3 }]">All set!</div>
      </div>
      <button v-if="step < 3" class="text-[13px] text-text-secondary font-semibold bg-transparent border border-border-default px-4 py-2 rounded-[14px] cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 hover:bg-surface-elevated hover:text-text-primary" @click="skip" type="button">
        Skip — I'll set up my own <i class="mdi mdi-arrow-right"></i>
      </button>
    </div>

    <div class="px-12 py-8 min-h-[360px] flex flex-col">
      <Transition name="fade" mode="out-in">
        <!-- Step 1: Choose actions -->
        <div v-if="step === 1" class="flex flex-col flex-1 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
          <h2 class="text-xl font-bold text-text-primary mb-2 tracking-tight text-center">Quick start</h2>
          <p class="text-[15px] text-text-secondary mb-6 leading-relaxed text-center">Pick a few actions below, then assign shortcuts. You can always change these later.</p>
          
          <div class="grid grid-cols-3 gap-3 mb-8">
            <button 
              v-for="action in visibleActions" 
              :key="action.id"
              :class="['flex flex-col gap-3 p-5 bg-surface-elevated border border-border-default rounded-[18px] cursor-pointer transition-all duration-200 text-left hover:bg-surface-hover hover:-translate-y-[3px] hover:shadow-lg', { '!bg-accent-bg !border-accent shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)]': selectedActions.includes(action.id) }]"
              @click="toggleAction(action.id)"
              type="button"
            >
              <div class="flex justify-between items-start w-full">
                <i :class="['mdi', action.icon, 'text-[32px] text-text-secondary opacity-90 transition-all duration-200', { '!text-accent': selectedActions.includes(action.id) }]"></i>
                <div :class="['w-5 h-5 rounded-[10px] border-2 border-border-light bg-surface-card flex items-center justify-center transition-all duration-200', { '!bg-accent !border-accent !text-white': selectedActions.includes(action.id) }]">
                  <i v-if="selectedActions.includes(action.id)" class="mdi mdi-check text-sm font-bold"></i>
                </div>
              </div>
              <span class="text-[13px] font-semibold leading-[1.4]">{{ action.label }}</span>
              <span v-if="action.description" class="text-[11px] font-normal text-text-muted text-left leading-[1.4]">{{ action.description }}</span>
            </button>
          </div>

          <h3 class="text-[15px] font-bold text-text-secondary my-6 text-center">Or try a shortcut pack</h3>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5 mb-4">
            <button
              v-for="pack in visiblePacks"
              :key="pack.id"
              :class="['flex items-center gap-2.5 px-4 py-3 bg-surface-elevated border border-border-default border-l-[3px] rounded-[14px] cursor-pointer transition-all duration-200 text-left hover:bg-surface-hover hover:-translate-y-px hover:shadow-md', selectedPacks.some(p => p.id === pack.id) ? '!bg-accent-bg !border-accent' : '']"
              :style="{ borderLeftColor: pack.color || 'var(--blue)' }"
              @click="togglePack(pack)"
              type="button"
            >
              <span class="text-xl shrink-0">{{ pack.icon }}</span>
              <div class="flex-1 min-w-0 flex flex-col gap-px">
                <span class="text-sm font-medium text-text-primary truncate">{{ pack.name }}</span>
                <span class="text-xs text-text-muted">{{ pack.shortcuts.length }} shortcuts</span>
              </div>
              <div :class="['w-5 h-5 rounded-full border-2 border-border-default flex items-center justify-center shrink-0 transition-all duration-200 text-xs ml-auto', { '!border-accent !bg-accent !text-white': selectedPacks.some(p => p.id === pack.id) }]">
                <i v-if="selectedPacks.some(p => p.id === pack.id)" class="mdi mdi-check"></i>
              </div>
            </button>
          </div>

          <div class="text-center mb-4">
            <button class="text-[13px] text-text-secondary font-semibold bg-transparent border-none cursor-pointer inline-flex items-center gap-1 px-4 py-2 rounded-full transition-all duration-200 hover:bg-surface-elevated hover:text-text-primary" @click="toggleShowMore" type="button">
              {{ showMoreActions ? 'Show fewer' : `Show more (${MORE_ACTIONS.length + MORE_PACKS.length} more)` }}
              <i :class="['mdi', showMoreActions ? 'mdi-chevron-up' : 'mdi-chevron-down']"></i>
            </button>
          </div>

          <div class="flex items-center justify-center mt-6 pt-4 border-t border-border-light">
            <button 
              class="px-4 py-3 border-none rounded-lg text-[15px] font-semibold cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 bg-accent text-white hover:bg-accent-hover w-full max-w-[300px] mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              @click="goToStep2" 
              :disabled="selectedActions.length === 0 && selectedPacks.length === 0"
              type="button"
            >
              <template v-if="selectedActions.length > 0 && selectedPacks.length > 0">
                Next — Set up {{ selectedActions.length }} shortcut{{ selectedActions.length === 1 ? '' : 's' }} + {{ selectedPacks.length }} pack{{ selectedPacks.length === 1 ? '' : 's' }} <i class="mdi mdi-arrow-right"></i>
              </template>
              <template v-else-if="selectedActions.length > 0">
                Next — Set up {{ selectedActions.length }} shortcut{{ selectedActions.length === 1 ? '' : 's' }} <i class="mdi mdi-arrow-right"></i>
              </template>
              <template v-else-if="selectedPacks.length > 0">
                Next — Install {{ selectedPacks.length }} pack{{ selectedPacks.length === 1 ? '' : 's' }} <i class="mdi mdi-arrow-right"></i>
              </template>
              <template v-else>
                Next <i class="mdi mdi-arrow-right"></i>
              </template>
            </button>
          </div>
        </div>

        <!-- Step 2: Record shortcuts -->
        <div v-else-if="step === 2" class="flex flex-col flex-1 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
          <div class="flex flex-col items-center mb-8 animate-[slideUp_0.3s_ease]" v-if="currentAction">
            <i :class="['mdi', currentAction.icon, 'text-[56px] text-accent mb-3 bg-accent-bg p-4 rounded-[18px]']"></i>
            <h2 class="text-2xl font-bold text-text-primary m-0">{{ currentAction.label }}</h2>
          </div>

          <div class="mb-8">
            <div class="text-[13px] font-semibold text-text-secondary mb-2 text-center uppercase tracking-wider">Shortcut {{ currentActionIndex + 1 }} of {{ selectedActions.length }}</div>
            <div class="h-2 bg-surface-elevated rounded-full overflow-hidden max-w-[200px] mx-auto">
              <div class="h-full bg-accent rounded-full transition-all duration-500" :style="{ width: `${((currentActionIndex + 1) / selectedActions.length) * 100}%` }"></div>
            </div>
          </div>
          
          <div class="flex flex-col gap-4 w-full max-w-[680px] mx-auto mb-6">
            <div class="bg-surface-elevated border border-border-default rounded-[18px] p-5 shadow-sm">
              <label class="block mb-3 text-xs font-bold tracking-[0.08em] uppercase text-text-secondary">Shortcut</label>
              <div>
                <ShortcutRecorder v-model="shortcutKey" />
              </div>
              <p class="mt-2.5 mb-0 text-xs text-text-muted">Press a shortcut or type it manually. You can change it later.</p>
            </div>

            <div v-if="currentDraft && currentAction?.id === 'javascript'" class="bg-surface-elevated border border-border-default rounded-[18px] p-5 shadow-sm">
              <h3 class="mt-0 mb-1 text-base font-bold text-text-primary"><i class="mdi mdi-code-braces"></i> JavaScript to run</h3>
              <p class="mt-0 mb-3.5 text-[13px] leading-normal text-text-secondary">This code runs on the current page when the shortcut is pressed.</p>
              <div class="code-editor-wrap !mb-0">
                <CodeEditor :modelValue="currentDraft.code" @update:modelValue="currentDraft.code = $event" />
              </div>
            </div>

            <div v-if="currentDraft" class="bg-surface-elevated border border-border-default rounded-[18px] p-5 shadow-sm">
              <h3 class="mt-0 mb-1 text-base font-bold text-text-primary">Where it works</h3>
              <p class="mt-0 mb-3.5 text-[13px] leading-normal text-text-secondary">Optionally limit to certain sites or allow in form inputs.</p>
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-1 bg-surface-card p-1 rounded-xl border border-border-default shadow-inner">
                  <button
                    :class="['px-4 py-1.5 text-[11px] font-bold rounded-lg transition-colors', (!currentDraft.blacklist || currentDraft.blacklist === 'false') ? 'bg-surface-elevated text-text-primary shadow-lg' : 'text-text-muted hover:text-text-primary']"
                    @click="currentDraft.blacklist = false"
                    type="button"
                  >
                    <i class="mdi mdi-earth"></i> All sites
                  </button>
                  <button
                    :class="['px-4 py-1.5 text-[11px] font-bold rounded-lg transition-colors', (currentDraft.blacklist === true || currentDraft.blacklist === 'true') ? 'bg-surface-elevated text-text-primary shadow-lg' : 'text-text-muted hover:text-text-primary']"
                    @click="currentDraft.blacklist = true"
                    type="button"
                  >
                    <i class="mdi mdi-earth-minus"></i> Except…
                  </button>
                  <button
                    :class="['px-4 py-1.5 text-[11px] font-bold rounded-lg transition-colors', currentDraft.blacklist === 'whitelist' ? 'bg-surface-elevated text-text-primary shadow-lg' : 'text-text-muted hover:text-text-primary']"
                    @click="currentDraft.blacklist = 'whitelist'"
                    type="button"
                  >
                    <i class="mdi mdi-earth-plus"></i> Only on…
                  </button>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-[10px] uppercase font-black text-text-muted tracking-tighter">Form Inputs</span>
                  <button :class="['toggle', { on: currentDraft.activeInInputs }]" @click="currentDraft.activeInInputs = !currentDraft.activeInInputs" type="button">
                    <span class="toggle-knob"></span>
                  </button>
                </div>
              </div>
              <textarea
                v-if="currentDraft.blacklist && currentDraft.blacklist !== 'false'"
                class="field-textarea mono site-patterns"
                v-model="currentDraft.sites"
                rows="3"
                :placeholder="currentDraft.blacklist === 'whitelist' ? 'Sites to activate on…\n*example.com*' : 'Sites to disable on…\n*example.com*'"
              ></textarea>
              <p v-if="currentDraft.blacklist && currentDraft.blacklist !== 'false'" class="mt-2.5 mb-0 text-xs text-text-muted">
                One pattern per line. Wildcards like <code class="bg-surface-card border border-border-default rounded-sm px-[5px] py-px font-mono text-[11px] text-text-primary">*://mail.google.com/*</code> work.
              </p>
            </div>
          </div>

          <div v-if="conflictWarning" class="flex items-center gap-2 px-3 py-2 bg-warning-bg border border-warning-border rounded-lg text-xs text-warning-text mt-3 font-medium">
            <i class="mdi mdi-alert-outline"></i>
            {{ conflictWarning }}
          </div>

          <div class="flex items-center justify-between mt-6 pt-4 border-t border-border-light">
            <button class="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 bg-surface-card text-text-secondary border border-border-default hover:bg-surface-hover" @click="goBack" type="button">
              <i class="mdi mdi-arrow-left"></i> Back
            </button>
            <div class="flex gap-2">
              <button class="text-sm text-text-muted bg-transparent border-none cursor-pointer font-medium hover:text-text-secondary" @click="skipCurrent" type="button">
                Skip
              </button>
              <button 
                class="px-4 py-2 border-none rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed" 
                @click="recordNext" 
                :disabled="!canAdvance"
                type="button"
              >
                Next <i class="mdi mdi-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Step 3: Success -->
        <div v-else-if="step === 3" class="flex flex-col flex-1 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] text-center py-4 items-center justify-center">
          <div class="text-4xl mb-4 animate-[popIn_0.5s_cubic-bezier(0.16,1,0.3,1)]">
            <i class="mdi mdi-check-circle text-[48px] mb-3 animate-[popIn_0.5s_cubic-bezier(0.16,1,0.3,1)_0.2s_both] text-success"></i>
          </div>
          <h2 class="text-xl font-bold text-text-primary mb-2 tracking-tight">
            <template v-if="recordedShortcuts.length > 0 && selectedPacks.length > 0">
              You created {{ recordedShortcuts.length }} shortcut{{ recordedShortcuts.length === 1 ? '' : 's' }} and added {{ selectedPacks.length }} pack{{ selectedPacks.length === 1 ? '' : 's' }}!
            </template>
            <template v-else-if="selectedPacks.length > 0">
              You added {{ selectedPacks.length }} shortcut pack{{ selectedPacks.length === 1 ? '' : 's' }}!
            </template>
            <template v-else>
              You created {{ recordedShortcuts.length }} shortcut{{ recordedShortcuts.length === 1 ? '' : 's' }}!
            </template>
          </h2>
          <p class="text-[15px] text-text-secondary mb-6 leading-relaxed">Your shortcuts are ready to use.</p>
          
          <div class="flex flex-col gap-4 mb-8 w-full max-w-[480px] max-h-[250px] overflow-y-auto pr-2" v-if="recordedShortcuts.length > 0 || selectedPacks.length > 0">
            <div class="flex items-center justify-center gap-4 bg-surface-elevated px-6 py-4 rounded-2xl border border-border-default shadow-sm" v-for="(shortcut, idx) in recordedShortcuts" :key="'s-' + idx">
              <div class="flex gap-1 min-w-[100px] justify-end">
                <kbd v-for="k in shortcut.key.split('+')" :key="k" class="inline-block px-3 py-2 bg-surface-card border border-border-default rounded-md font-mono text-sm font-semibold text-text-primary capitalize shadow-[0_3px_0_var(--color-border-default)]">{{ k }}</kbd>
              </div>
              <i class="mdi mdi-arrow-right text-text-muted text-xl"></i>
              <div class="flex items-center gap-2 text-[15px] font-semibold text-text-primary text-left">
                <i :class="['mdi', shortcut.icon, 'text-accent text-xl']"></i>
                {{ shortcut.actionLabel }}
              </div>
            </div>
            <div class="flex items-center justify-center gap-4 bg-surface-elevated px-6 py-4 rounded-2xl border border-border-default shadow-sm" v-for="pack in selectedPacks" :key="'p-' + pack.id">
              <span class="text-2xl min-w-[100px] text-right shrink-0">{{ pack.icon }}</span>
              <div class="flex items-center gap-2 text-[15px] font-semibold text-text-primary text-left">
                <strong>{{ pack.name }}</strong>
                <span class="text-xs text-text-muted font-normal ml-2">{{ pack.shortcuts.length }} shortcuts</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 justify-center mt-4">
            <button class="px-4 py-2 border-none rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 bg-accent text-white hover:bg-accent-hover" @click="finish" type="button">
              <i class="mdi mdi-check"></i> Done
            </button>
          </div>
        </div>
      </Transition>
    </div>


    <!-- Pack Preview Modal -->
    <Transition name="modal">
      <div v-if="previewingPack" class="modal-overlay z-[1000]" @click.self="closePreview">
        <div class="modal-panel max-w-[540px]">
          <div class="modal-header" :style="{ background: previewingPack.color }">
            <span class="modal-icon">{{ previewingPack.icon }}</span>
            <div>
              <h2 class="modal-title">{{ previewingPack.name }}</h2>
              <p class="modal-subtitle">{{ previewingPack.description }}</p>
            </div>
            <button class="modal-close" @click="closePreview" type="button">
              <i class="mdi mdi-close"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="modal-shortcuts">
              <div
                v-for="s in previewingPack.shortcuts"
                :key="s.key"
                class="modal-shortcut-row"
              >
                <span class="modal-shortcut-label">{{ s.label || s.action }}</span>
                <span class="modal-shortcut-keys">
                  <kbd v-for="(part, pi) in s.key.split('+')" :key="pi">{{ part }}</kbd>
                </span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 bg-surface-card text-text-secondary border border-border-default hover:bg-surface-hover" @click="closePreview" type="button">Cancel</button>
            <button class="px-4 py-2 border-none rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 bg-accent text-white hover:bg-accent-hover" @click="confirmPack" type="button">
              <i class="mdi mdi-plus"></i> Add {{ previewingPack.shortcuts.length }} shortcut{{ previewingPack.shortcuts.length !== 1 ? 's' : '' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>
