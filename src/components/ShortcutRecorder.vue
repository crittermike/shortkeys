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
    key = e.key.toLowerCase()
  }

  parts.push(key)
  return parts.join('+')
}

function captureKey(e: KeyboardEvent) {
  e.preventDefault()
  e.stopPropagation()

  const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta', 'OS']
  if (modifierKeys.includes(e.key)) return

  const combo = keyToString(e)
  recordedKeys.value.push(combo)

  // Show live preview
  emit('update:modelValue', recordedKeys.value.join(' '))
  resetAutoStop()
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
  border-radius: 6px 0 0 6px;
  border-right: none;
  flex: 1;
}

.recorder-wrap .field-input:focus + .record-btn {
  border-color: #4361ee;
}

.record-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  border: 1px solid #e2e8f0;
  border-radius: 0 6px 6px 0;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.record-btn:hover {
  background: #f1f5f9;
  color: #1a1a2e;
}

.record-btn.recording {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #ef4444;
  animation: pulse 1s infinite;
}

.record-btn .mdi {
  font-size: 14px;
}

.record-btn.recording .mdi {
  color: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@media (max-width: 600px) {
  .record-text { display: none; }
}
</style>
