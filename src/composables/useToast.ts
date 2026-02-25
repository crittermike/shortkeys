import { ref } from 'vue'

const snackMessage = ref('')
const snackType = ref<'success' | 'danger'>('success')

function showSnack(msg: string, type: 'success' | 'danger' = 'success') {
  snackMessage.value = msg
  snackType.value = type
  setTimeout(() => (snackMessage.value = ''), 3000)
}

export function useToast() {
  return { snackMessage, snackType, showSnack }
}
