<script setup lang="ts">
import { ref, computed } from 'vue'
import ShortcutRecorder from '@/components/ShortcutRecorder.vue'
import { ACTION_CATEGORIES } from '@/utils/actions-registry'
import { getBrowserConflict } from '@/utils/shortcut-conflicts'

const emit = defineEmits<{
  (e: 'finish', shortcut: { key: string; action: string }): void
  (e: 'skip'): void
  (e: 'done'): void
}>()

const step = ref(1)
const selectedActions = ref<string[]>([])
const currentActionIndex = ref(0)
const shortcutKey = ref('')
const showMoreActions = ref(false)

const recordedShortcuts = ref<{ actionId: string; actionLabel: string; icon: string; key: string }[]>([])

const INITIAL_ACTIONS = [
  { id: 'toggledarkmode', label: 'Toggle dark mode on current page', icon: 'mdi-theme-light-dark' },
  { id: 'copyurl', label: 'Copy URL', icon: 'mdi-content-copy' },
  { id: 'copytitleurlmarkdown', label: 'Copy as markdown link [title](url)', icon: 'mdi-language-markdown' },
  { id: 'movetableft', label: 'Move tab left', icon: 'mdi-arrow-left-bold' },
  { id: 'movetabright', label: 'Move tab right', icon: 'mdi-arrow-right-bold' },
  { id: 'lastusedtab', label: 'Switch to last used tab', icon: 'mdi-swap-horizontal' },
  { id: 'javascript', label: 'Run JavaScript', icon: 'mdi-language-javascript' },
  { id: 'linkhints', label: 'Show link hints (click)', icon: 'mdi-cursor-default-click-outline' },
  { id: 'reopentab', label: 'Reopen last closed tab', icon: 'mdi-tab-unselected' },
]

const MORE_ACTIONS = [
  { id: 'focusinput', label: 'Focus first text input on page', icon: 'mdi-form-textbox' },
  { id: 'showcheatsheet', label: 'Show shortcut cheat sheet overlay', icon: 'mdi-help-circle-outline' },
  { id: 'openclipboardurl', label: 'Open URL from clipboard', icon: 'mdi-clipboard-arrow-right-outline' },
  { id: 'closeduplicatetabs', label: 'Close duplicate tabs', icon: 'mdi-tab-minus' },
  { id: 'audibletab', label: 'Jump to tab playing audio/video', icon: 'mdi-volume-high' },
  { id: 'sorttabs', label: 'Sort tabs alphabetically by title', icon: 'mdi-sort-alphabetical-ascending' },
  { id: 'videospeedup', label: 'Speed up video (0.25x)', icon: 'mdi-fast-forward' },
  { id: 'macro', label: 'Run a macro (chain multiple actions)', icon: 'mdi-play-box-multiple-outline' },
  { id: 'togglebookmark', label: 'Bookmark/unbookmark current page', icon: 'mdi-bookmark-outline' },
  { id: 'editurl', label: 'Edit current URL and navigate', icon: 'mdi-pencil-outline' },
  { id: 'urlup', label: 'Go up one level in URL path', icon: 'mdi-arrow-up-bold' },
  { id: 'disable', label: 'Do nothing (disable browser shortcut)', icon: 'mdi-cancel' },
]

const ALL_ACTIONS = [...INITIAL_ACTIONS, ...MORE_ACTIONS]

const visibleActions = computed(() => {
  return showMoreActions.value ? ALL_ACTIONS : INITIAL_ACTIONS
})

const currentAction = computed(() => {
  if (selectedActions.value.length === 0) return null
  const id = selectedActions.value[currentActionIndex.value]
  return ALL_ACTIONS.find(a => a.id === id) || null
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

const toggleShowMore = () => {
  showMoreActions.value = !showMoreActions.value
}

const goToStep2 = () => {
  if (selectedActions.value.length > 0) {
    step.value = 2
    currentActionIndex.value = 0
    shortcutKey.value = ''
    recordedShortcuts.value = []
  }
}

const goBack = () => {
  if (currentActionIndex.value > 0) {
    currentActionIndex.value--
    shortcutKey.value = ''
  } else {
    step.value = 1
  }
}

const skipCurrent = () => {
  advanceOrFinish()
}

const recordNext = () => {
  if (shortcutKey.value && currentAction.value) {
    recordedShortcuts.value.push({
      actionId: currentAction.value.id,
      actionLabel: currentAction.value.label,
      icon: currentAction.value.icon,
      key: shortcutKey.value
    })
    emit('finish', { key: shortcutKey.value, action: currentAction.value.id })
  }
  advanceOrFinish()
}

const advanceOrFinish = () => {
  if (currentActionIndex.value < selectedActions.value.length - 1) {
    currentActionIndex.value++
    shortcutKey.value = ''
  } else {
    step.value = 3
  }
}

const finish = () => {
  emit('done')
}

const skip = () => {
  emit('skip')
}
</script>
<template>
  <div class="onboarding-wizard">
    <div class="wizard-header">
      <div class="step-indicator">
        <div :class="['step-dot', { active: step >= 1, current: step === 1 }]">1</div>
        <div class="step-label" :class="{ active: step >= 1 }">Choose actions</div>
        <div :class="['step-line', { active: step >= 2 }]"></div>
        <div :class="['step-dot', { active: step >= 2, current: step === 2 }]">2</div>
        <div class="step-label" :class="{ active: step >= 2 }">Assign shortcuts</div>
        <div :class="['step-line', { active: step >= 3 }]"></div>
        <div :class="['step-dot', { active: step >= 3, current: step === 3 }]">3</div>
        <div class="step-label" :class="{ active: step >= 3 }">All set!</div>
      </div>
      <button v-if="step < 3" class="btn-skip-top" @click="skip" type="button">
        Skip — I'll set up my own <i class="mdi mdi-arrow-right"></i>
      </button>
    </div>

    <div class="wizard-content">
      <Transition name="fade" mode="out-in">
        <!-- Step 1: Choose actions -->
        <div v-if="step === 1" class="step-panel">
          <h2 class="step-title">Quick start</h2>
          <p class="step-desc">Pick a few actions to get started — you can always add, remove, or change shortcuts later.</p>
          
          <div class="action-grid">
            <button 
              v-for="action in visibleActions" 
              :key="action.id"
              :class="['action-card', { 'selected': selectedActions.includes(action.id) }]"
              @click="toggleAction(action.id)"
              type="button"
            >
              <div class="action-card-header">
                <i :class="['mdi', action.icon, 'action-icon']"></i>
                <div class="checkbox-indicator">
                  <i v-if="selectedActions.includes(action.id)" class="mdi mdi-check"></i>
                </div>
              </div>
              <span class="action-label">{{ action.label }}</span>
            </button>
          </div>

          <div class="show-more-wrap">
            <button class="btn-show-more" @click="toggleShowMore" type="button">
              {{ showMoreActions ? 'Show fewer' : `Show more actions (${MORE_ACTIONS.length} more)` }}
              <i :class="['mdi', showMoreActions ? 'mdi-chevron-up' : 'mdi-chevron-down']"></i>
            </button>
          </div>

          <div class="step-actions step-1-actions">
            <button 
              class="btn btn-primary btn-next-step" 
              @click="goToStep2" 
              :disabled="selectedActions.length === 0"
              type="button"
            >
              Next — Set up {{ selectedActions.length }} shortcut{{ selectedActions.length === 1 ? '' : 's' }} <i class="mdi mdi-arrow-right"></i>
            </button>
          </div>
        </div>

        <!-- Step 2: Record shortcuts -->
        <div v-else-if="step === 2" class="step-panel">
          <div class="progress-wrap">
            <div class="progress-text">Shortcut {{ currentActionIndex + 1 }} of {{ selectedActions.length }}</div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${((currentActionIndex + 1) / selectedActions.length) * 100}%` }"></div>
            </div>
          </div>

          <div class="current-action-display" v-if="currentAction">
            <i :class="['mdi', currentAction.icon]"></i>
            <h2>{{ currentAction.label }}</h2>
          </div>
          
          <div class="recorder-wrap">
            <ShortcutRecorder v-model="shortcutKey" />
          </div>

          <div v-if="conflictWarning" class="conflict-warning">
            <i class="mdi mdi-alert-outline"></i>
            {{ conflictWarning }}
          </div>

          <div class="step-actions">
            <button class="btn btn-secondary" @click="goBack" type="button">
              <i class="mdi mdi-arrow-left"></i> Back
            </button>
            <div class="right-actions">
              <button class="btn btn-secondary btn-skip" @click="skipCurrent" type="button">
                Skip
              </button>
              <button 
                class="btn btn-primary" 
                @click="recordNext" 
                :disabled="!shortcutKey"
                type="button"
              >
                Next <i class="mdi mdi-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Step 3: Success -->
        <div v-else-if="step === 3" class="step-panel success-panel">
          <div class="confetti-wrap">
            <i class="mdi mdi-check-circle success-icon"></i>
          </div>
          <h2 class="step-title">You created {{ recordedShortcuts.length }} shortcut{{ recordedShortcuts.length === 1 ? '' : 's' }}!</h2>
          <p class="step-desc">Your shortcuts are ready to use.</p>
          
          <div class="success-summary-list">
            <div class="success-summary" v-for="(shortcut, idx) in recordedShortcuts" :key="idx">
              <div class="summary-keys">
                <kbd v-for="k in shortcut.key.split('+')" :key="k">{{ k }}</kbd>
              </div>
              <i class="mdi mdi-arrow-right summary-arrow"></i>
              <div class="summary-action">
                <i :class="['mdi', shortcut.icon]"></i>
                {{ shortcut.actionLabel }}
              </div>
            </div>
          </div>

          <div class="step-actions success-actions">
            <button class="btn btn-primary" @click="finish" type="button">
              <i class="mdi mdi-check"></i> Done
            </button>
          </div>
        </div>
      </Transition>
    </div>

  </div>
</template>
<style scoped>
.onboarding-wizard {
  max-width: 680px;
  margin: 40px auto;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 10px 30px var(--shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.wizard-header {
  padding: 24px 24px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.step-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-elevated);
  border: 2px solid var(--border);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.3s ease;
}

.step-dot.active {
  background: var(--blue-bg);
  border-color: var(--blue);
  color: var(--blue);
}

.step-dot.current {
  background: var(--blue);
  color: #fff;
  box-shadow: 0 0 0 4px var(--blue-bg);
}

.step-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  transition: color 0.3s ease;
}

.step-label.active {
  color: var(--text);
}

.step-line {
  width: 40px;
  height: 2px;
  background: var(--border);
  transition: all 0.3s ease;
}

.step-line.active {
  background: var(--blue);
}

.wizard-content {
  padding: 32px 40px;
  min-height: 360px;
  display: flex;
  flex-direction: column;
}

.step-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.step-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 8px;
  text-align: center;
}

.step-desc {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0 0 32px;
  text-align: center;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.action-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  color: var(--text);
  text-align: left;
}

.action-card:hover {
  background: var(--bg-hover);
  border-color: var(--border-light);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow);
}

.action-card.selected {
  background: var(--blue-bg);
  border-color: var(--blue);
}

.action-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.action-icon {
  font-size: 28px;
  color: var(--text-secondary);
  opacity: 0.9;
  transition: all 0.2s ease;
}

.action-card:hover .action-icon {
  color: var(--blue);
  transform: scale(1.05);
  opacity: 1;
}

.action-card.selected .action-icon {
  color: var(--blue);
}

.checkbox-indicator {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  background: var(--bg-card);
}

.action-card.selected .checkbox-indicator {
  background: var(--blue);
  border-color: var(--blue);
  color: white;
}

.checkbox-indicator .mdi {
  font-size: 14px;
  font-weight: bold;
}

.action-label {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.show-more-wrap {
  margin-top: 16px;
  text-align: center;
}

.btn-show-more {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.2s ease;
}

.btn-show-more:hover {
  background: var(--bg-elevated);
  color: var(--text);
}

.step-1-actions {
  justify-content: center;
}

.btn-next-step {
  width: 100%;
  max-width: 300px;
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.progress-wrap {
  margin-bottom: 32px;
}

.progress-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.progress-bar {
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 3px;
  overflow: hidden;
  max-width: 200px;
  margin: 0 auto;
}

.progress-fill {
  height: 100%;
  background: var(--blue);
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.current-action-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
  animation: slideUp 0.3s ease;
}

.current-action-display .mdi {
  font-size: 48px;
  color: var(--blue);
  margin-bottom: 12px;
  background: var(--blue-bg);
  padding: 16px;
  border-radius: 20px;
}

.current-action-display h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.recorder-wrap {
  max-width: 400px;
  margin: 0 auto 24px;
  width: 100%;
}

.conflict-warning {
  max-width: 400px;
  margin: 0 auto 24px;
  width: 100%;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

[data-theme="dark"] .conflict-warning {
  background: rgba(146, 64, 14, 0.2);
  border-color: rgba(253, 230, 138, 0.2);
  color: #fde68a;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 24px;
}

.right-actions {
  display: flex;
  gap: 12px;
}

.btn-skip {
  background: transparent;
  border-color: transparent;
}

.success-actions {
  justify-content: center;
  gap: 16px;
}

.success-panel {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.confetti-wrap {
  margin-bottom: 16px;
  animation: popIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.success-icon {
  font-size: 72px;
  color: #10b981; /* Green success color */
}

.success-summary-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
  width: 100%;
  max-width: 480px;
  max-height: 250px;
  overflow-y: auto;
  padding-right: 8px;
}

.success-summary-list::-webkit-scrollbar {
  width: 6px;
}
.success-summary-list::-webkit-scrollbar-track {
  background: var(--bg-elevated);
  border-radius: 3px;
}
.success-summary-list::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.success-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-elevated);
  padding: 16px 24px;
  border-radius: 12px;
  border: 1px solid var(--border);
}

.summary-keys {
  display: flex;
  gap: 4px;
  min-width: 100px;
  justify-content: flex-end;
}

.summary-keys kbd {
  display: inline-block;
  padding: 6px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  text-transform: capitalize;
  box-shadow: 0 2px 0 var(--border);
}

.summary-arrow {
  color: var(--text-muted);
  font-size: 20px;
}

.summary-action {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  text-align: left;
}

.summary-action .mdi {
  color: var(--blue);
  font-size: 20px;
}

.btn-skip-top {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  }

.btn-skip-top:hover {
  background: var(--bg-elevated);
  border-color: var(--border-light);
  color: var(--text);
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Staggered grid fade for items */
.staggered-fade-move,
.staggered-fade-enter-active,
.staggered-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.staggered-fade-enter-from,
.staggered-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

.staggered-fade-leave-active {
  position: absolute;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.5) rotate(-10deg);
  }
  50% {
    transform: scale(1.1) rotate(5deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}
</style>
