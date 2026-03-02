<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const recording = ref(false)
const recordedKeys = ref<string[]>([])
let autoStopTimer: ReturnType<typeof setTimeout> | null = null

function startRecording() {
  recording.value = true
  recordedKeys.value = []
  emit('update:modelValue', '')
  window.addEventListener('keydown', captureKey, true)
  resetAutoStop()
}

function stopRecording() {
  recording.value = false
  window.removeEventListener('keydown', captureKey, true)
  if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null }
  // Emit the final accumulated sequence (e.g. "j j" for Mousetrap sequence)
  if (recordedKeys.value.length > 0) {
    emit('update:modelValue', recordedKeys.value.join(' '))
  }
}

function resetAutoStop() {
  if (autoStopTimer) clearTimeout(autoStopTimer)
  // Auto-stop 3s after the last keypress (or 10s from start if no keys)
  autoStopTimer = setTimeout(() => stopRecording(), recordedKeys.value.length > 0 ? 3000 : 10000)
}

function keyToString(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.metaKey) parts.push('meta')
  if (e.ctrlKey) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')

  const codeMap: Record<string, string> = {
    'Space': 'space', 'ArrowUp': 'up', 'ArrowDown': 'down',
    'ArrowLeft': 'left', 'ArrowRight': 'right', 'Escape': 'escape',
    'Enter': 'enter', 'Backspace': 'backspace', 'Delete': 'del',
    'Tab': 'tab', 'Home': 'home', 'End': 'end',
    'PageUp': 'pageup', 'PageDown': 'pagedown', 'Insert': 'ins',
    'CapsLock': 'capslock', 'Minus': '-', 'Equal': '=',
    'BracketLeft': '[', 'BracketRight': ']', 'Backslash': '\\',
    'Semicolon': ';', 'Quote': "'", 'Comma': ',',
    'Period': '.', 'Slash': '/', 'Backquote': '`',
  }

  let key: string
  const code = e.code
  if (codeMap[code]) {
    key = codeMap[code]
  } else if (code.startsWith('Key')) {
    key = code.slice(3).toLowerCase()
  } else if (code.startsWith('Digit')) {
    key = code.slice(5)
  } else if (code.startsWith('Numpad')) {
    key = code.slice(6).toLowerCase()
  } else if (code.startsWith('F') && /^F\d+$/.test(code)) {
    key = code.toLowerCase()
  } else {
    // Fallback: derive from e.code to avoid unicode chars (e.g. Alt on Mac)
    key = e.code.toLowerCase()
  }

  parts.push(key)
  return parts.join('+')
}

function captureKey(e: KeyboardEvent) {
  e.preventDefault()
  e.stopPropagation()

  const modifierCodes = ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'OSLeft', 'OSRight']
  if (modifierCodes.includes(e.code)) return

  const combo = keyToString(e)
  recordedKeys.value.push(combo)

  // Show live preview
  emit('update:modelValue', recordedKeys.value.join(' '))
  resetAutoStop()
}

function handleInputKeydown(e: KeyboardEvent) {
  // When not recording, intercept modifier+key combos to prevent unicode insertion on Mac
  // (e.g. Alt+L produces ¬, Alt+D produces ∂)
  const modifierCodes = ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'OSLeft', 'OSRight']
  if (modifierCodes.includes(e.code)) return
  if (!recording.value && (e.altKey || e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    const combo = keyToString(e)
    emit('update:modelValue', combo)
  }
}
</script>

<template>
  <div class="recorder-wrap">
    <input
      class="field-input shortcut-input"
      type="text"
      placeholder="e.g. ctrl+shift+k"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keydown="handleInputKeydown"
      :readonly="recording"
    />
    <button
      :class="['record-btn', { recording }]"
      @click="recording ? stopRecording() : startRecording()"
      type="button"
      :title="recording ? 'Click to stop recording' : 'Record shortcut'"
    >
      <i :class="recording ? 'mdi mdi-stop-circle' : 'mdi mdi-record-circle-outline'"></i>
      <span class="record-text">{{ recording ? 'Stop' : 'Record' }}</span>
    </button>
  </div>
</template>

<style scoped>
.recorder-wrap {
  display: flex;
  gap: 0;
  width: 100%;
}

.recorder-wrap .field-input {
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  border-right: none;
  flex: 1;
}

.recorder-wrap .field-input:focus + .record-btn {
  border-color: var(--blue, #4361ee);
}

.record-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
  border: 1.5px solid var(--border, #e2e8f0);
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
  background: var(--bg-elevated, #f8fafc);
  color: var(--text-secondary, #64748b);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
}

.record-btn:hover {
  background: var(--bg-hover, #f1f5f9);
  color: var(--text, #1a1a2e);
  border-color: var(--text-placeholder, #cbd5e1);
  transform: translateY(-1px);
}

.record-btn.recording {
  background: var(--danger-bg);
  border-color: var(--danger-border);
  color: var(--danger);
  animation: pulse 1.5s infinite cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
}

.record-btn.recording:hover {
  filter: brightness(0.95);
}

.record-btn .mdi {
  font-size: 14px;
}

.record-btn.recording .mdi {
  color: var(--danger);
}

@keyframes pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { transform: scale(0.95); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

@media (max-width: 600px) {
  .record-text { display: none; }
}
</style>
