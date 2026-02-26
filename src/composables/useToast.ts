import { ref } from 'vue'

const snackMessage = ref('')
const snackType = ref<'success' | 'danger'>('success')
const snackAction = ref<{ label: string; handler: () => void } | null>(null)
let snackTimer: ReturnType<typeof setTimeout> | null = null

function showSnack(msg: string, type: 'success' | 'danger' = 'success', action?: { label: string; handler: () => void }) {
  if (snackTimer) clearTimeout(snackTimer)
  snackMessage.value = msg
  snackType.value = type
  snackAction.value = action || null
  const duration = action ? 5000 : 3000
  snackTimer = setTimeout(() => {
    snackMessage.value = ''
    snackAction.value = null
  }, duration)
}

function dismissSnack() {
  if (snackTimer) clearTimeout(snackTimer)
  snackMessage.value = ''
  snackAction.value = null
}

export function useToast() {
  return { snackMessage, snackType, snackAction, showSnack, dismissSnack }
}
