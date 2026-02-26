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
const selectedAction = ref('')
const shortcutKey = ref('')

const POPULAR_ACTIONS = [
  { id: 'newtab', label: 'New tab', icon: 'mdi-tab-plus' },
  { id: 'closetab', label: 'Close tab', icon: 'mdi-tab-remove' },
  { id: 'reopentab', label: 'Reopen last closed tab', icon: 'mdi-tab-unselected' },
  { id: 'nexttab', label: 'Next tab', icon: 'mdi-arrow-right-bold' },
  { id: 'prevtab', label: 'Previous tab', icon: 'mdi-arrow-left-bold' },
  { id: 'scrolldown', label: 'Scroll down', icon: 'mdi-arrow-down' },
  { id: 'scrollup', label: 'Scroll up', icon: 'mdi-arrow-up' },
  { id: 'back', label: 'Go back', icon: 'mdi-arrow-left' },
  { id: 'forward', label: 'Go forward', icon: 'mdi-arrow-right' },
  { id: 'copyurl', label: 'Copy URL', icon: 'mdi-content-copy' },
  { id: 'toggledarkmode', label: 'Toggle dark mode on current page', icon: 'mdi-theme-light-dark' },
  { id: 'reload', label: 'Reload page', icon: 'mdi-refresh' },
]

const selectedActionLabel = computed(() => {
  return POPULAR_ACTIONS.find(a => a.id === selectedAction.value)?.label || ''
})

const conflictWarning = computed(() => {
  if (!shortcutKey.value) return null
  const conflict = getBrowserConflict(shortcutKey.value)
  return conflict ? `Overrides browser shortcut: ${conflict}` : null
})

const selectAction = (actionId: string) => {
  selectedAction.value = actionId
  step.value = 2
}

const goBack = () => {
  step.value = 1
}

const goNext = () => {
  if (shortcutKey.value) {
    step.value = 3
  }
}

const finish = () => {
  emit('finish', { key: shortcutKey.value, action: selectedAction.value })
  emit('done')
}

const addAnother = () => {
  emit('finish', { key: shortcutKey.value, action: selectedAction.value })
  // Reset wizard
  step.value = 1
  selectedAction.value = ''
  shortcutKey.value = ''
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
        <div :class="['step-line', { active: step >= 2 }]"></div>
        <div :class="['step-dot', { active: step >= 2, current: step === 2 }]">2</div>
        <div :class="['step-line', { active: step >= 3 }]"></div>
        <div :class="['step-dot', { active: step >= 3, current: step === 3 }]">3</div>
      </div>
    </div>

    <div class="wizard-content">
      <!-- Step 1: Pick an action -->
      <Transition name="fade" mode="out-in">
        <div v-if="step === 1" class="step-panel">
          <h2 class="step-title">Pick an action</h2>
          <p class="step-desc">Choose what you want your first shortcut to do.</p>
          
          <div class="action-grid">
            <button 
              v-for="action in POPULAR_ACTIONS" 
              :key="action.id"
              class="action-card"
              @click="selectAction(action.id)"
              type="button"
            >
              <i :class="['mdi', action.icon, 'action-icon']"></i>
              <span class="action-label">{{ action.label }}</span>
            </button>
          </div>
        </div>

        <!-- Step 2: Record a shortcut -->
        <div v-else-if="step === 2" class="step-panel">
          <h2 class="step-title">Record a shortcut</h2>
          <p class="step-desc">Press the keys you want to use for <strong>{{ selectedActionLabel }}</strong>.</p>
          
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
            <button 
              class="btn btn-primary" 
              @click="goNext" 
              :disabled="!shortcutKey"
              type="button"
            >
              Next <i class="mdi mdi-arrow-right"></i>
            </button>
          </div>
        </div>

        <!-- Step 3: Success -->
        <div v-else-if="step === 3" class="step-panel success-panel">
          <div class="confetti-wrap">
            <div class="confetti-icon">🎉</div>
          </div>
          <h2 class="step-title">You're all set!</h2>
          <p class="step-desc">Your shortcut is ready to use.</p>
          
          <div class="success-summary">
            <div class="summary-keys">
              <kbd v-for="k in shortcutKey.split('+')" :key="k">{{ k }}</kbd>
            </div>
            <i class="mdi mdi-arrow-right summary-arrow"></i>
            <div class="summary-action">
              <i :class="['mdi', POPULAR_ACTIONS.find(a => a.id === selectedAction)?.icon]"></i>
              {{ selectedActionLabel }}
            </div>
          </div>

          <div class="step-actions success-actions">
            <button class="btn btn-primary" @click="addAnother" type="button">
              <i class="mdi mdi-plus"></i> Add another shortcut
            </button>
            <button class="btn btn-secondary" @click="finish" type="button">
              <i class="mdi mdi-check"></i> Done
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <div v-if="step < 3" class="wizard-footer">
      <button class="skip-link" @click="skip" type="button">Skip onboarding</button>
    </div>
  </div>
</template>

<style scoped>
.onboarding-wizard {
  max-width: 640px;
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
  justify-content: center;
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
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.action-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text);
}

.action-card:hover {
  background: var(--bg-hover);
  border-color: var(--border-light);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow);
}

.action-icon {
  font-size: 32px;
  color: var(--blue);
  opacity: 0.9;
  transition: transform 0.2s ease;
}

.action-card:hover .action-icon {
  transform: scale(1.1);
  opacity: 1;
}

.action-label {
  font-size: 13px;
  font-weight: 600;
  text-align: center;
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
  margin-top: auto;
  padding-top: 24px;
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
  font-size: 64px;
  margin-bottom: 16px;
  animation: popIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.success-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-elevated);
  padding: 16px 24px;
  border-radius: 12px;
  border: 1px solid var(--border);
  margin-bottom: 32px;
}

.summary-keys {
  display: flex;
  gap: 4px;
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
}

.summary-action .mdi {
  color: var(--blue);
  font-size: 20px;
}

.wizard-footer {
  padding: 16px;
  text-align: center;
  border-top: 1px solid var(--border-light);
  background: var(--bg-elevated);
}

.skip-link {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.skip-link:hover {
  color: var(--text-secondary);
  text-decoration: underline;
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

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
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
