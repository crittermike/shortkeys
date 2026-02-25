import { ref } from 'vue'

const darkMode = ref(false)

function applyTheme() {
  document.documentElement.setAttribute('data-theme', darkMode.value ? 'dark' : 'light')
}

function initTheme() {
  const saved = localStorage.getItem('shortkeys-theme')
  if (saved === 'dark') {
    darkMode.value = true
  } else if (saved === 'light') {
    darkMode.value = false
  } else {
    darkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  applyTheme()
}

function toggleTheme() {
  darkMode.value = !darkMode.value
  localStorage.setItem('shortkeys-theme', darkMode.value ? 'dark' : 'light')
  applyTheme()
}

export function useTheme() {
  return { darkMode, initTheme, toggleTheme }
}
