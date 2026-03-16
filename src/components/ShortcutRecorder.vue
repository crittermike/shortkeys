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
  window.addEventListener('mousedown', onClickOutside, true)
  resetAutoStop()
}

function stopRecording() {
  recording.value = false
  window.removeEventListener('keydown', captureKey, true)
  window.removeEventListener('mousedown', onClickOutside, true)
  if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null }
  // Emit the final accumulated sequence (e.g. "j j" for Mousetrap sequence)
  if (recordedKeys.value.length > 0) {
    emit('update:modelValue', recordedKeys.value.join(' '))
  }
}

function onClickOutside(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest('.recorder-wrap')
  if (!el) stopRecording()
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
  <div class="flex gap-0 w-full">
    <input
      class="field-input shortcut-input peer !rounded-r-none !border-r-0 flex-1"
      type="text"
      placeholder="e.g. ctrl+shift+k"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keydown="handleInputKeydown"
      :readonly="recording"
    />
    <button
      :class="[
        'flex items-center gap-1 px-4 border-[1.5px] border-border-default rounded-r-[10px] rounded-l-none bg-surface-elevated text-text-secondary text-[13px] font-semibold cursor-pointer transition-all duration-200 whitespace-nowrap hover:bg-surface-hover hover:text-text-primary hover:-translate-y-px peer-focus:border-accent',
        { '!bg-danger-bg !border-danger-border !text-danger animate-[pulse-recording_1.5s_infinite_cubic-bezier(0.16,1,0.3,1)] shadow-[0_0_12px_rgba(239,68,68,0.4)]': recording },
      ]"
      @click="recording ? stopRecording() : startRecording()"
      type="button"
      :title="recording ? 'Click to stop recording' : 'Record shortcut'"
    >
      <i :class="[recording ? 'mdi mdi-stop-circle' : 'mdi mdi-record-circle-outline', 'text-sm']"></i>
      <span class="hidden sm:inline">{{ recording ? 'Stop' : 'Record' }}</span>
    </button>
  </div>
</template>
