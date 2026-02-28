import { ref } from 'vue'

export type ViewDensity = 'comfortable' | 'condensed'

const density = ref<ViewDensity>('comfortable')

function initDensity() {
  const saved = localStorage.getItem('shortkeys-view-density')
  if (saved === 'condensed' || saved === 'comfortable') {
    density.value = saved
  }
  applyDensity()
}

function applyDensity() {
  document.documentElement.setAttribute('data-density', density.value)
}

function toggleDensity() {
  density.value = density.value === 'comfortable' ? 'condensed' : 'comfortable'
  localStorage.setItem('shortkeys-view-density', density.value)
  applyDensity()
}

function setDensity(value: ViewDensity) {
  density.value = value
  localStorage.setItem('shortkeys-view-density', value)
  applyDensity()
}

export function useViewDensity() {
  return { density, initDensity, toggleDensity, setDensity }
}
