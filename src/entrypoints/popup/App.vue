<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ACTION_CATEGORIES, getActionOptionsForSelect } from '@/utils/actions-registry'
import type { KeySetting } from '@/utils/url-matching'
import ShortcutRecorder from '@/components/ShortcutRecorder.vue'
import SearchSelect from '@/components/SearchSelect.vue'

const query = ref('')
const keys = ref<KeySetting[]>([])
const selectedIndex = ref(0)
const searchInput = ref<HTMLInputElement | null>(null)

const creating = ref(false)
const newKey = ref('')
const newAction = ref('')

function startCreating() {
  creating.value = true
  newKey.value = ''
  newAction.value = ''
}

function cancelCreating() {
  creating.value = false
  newKey.value = ''
  newAction.value = ''
  nextTick(() => {
    searchInput.value?.focus()
  })
}

async function saveNewShortcut() {
  if (!newKey.value || !newAction.value) return
  
  const saved = await loadKeys()
  const currentKeys: KeySetting[] = saved ? JSON.parse(saved) : []
  
  const newShortcut: KeySetting = {
    id: crypto.randomUUID(),
    key: newKey.value,
    action: newAction.value,
    enabled: true
  }
  
  currentKeys.push(newShortcut)
  await saveKeys(currentKeys)
  
  keys.value = currentKeys
  cancelCreating()
}

const actionLabels = computed(() => {
  const map: Record<string, string> = {}
  for (const actions of Object.values(ACTION_CATEGORIES)) {
    for (const a of actions) map[a.value] = a.label
  }
  return map
})

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  const active = keys.value.filter((k) => k.enabled !== false && k.key && k.action)
  if (!q) return active
  return active.filter((k) => {
    const label = (k.label || '').toLowerCase()
    const key = (k.key || '').toLowerCase()
    const action = (actionLabels.value[k.action] || k.action || '').toLowerCase()
    return label.includes(q) || key.includes(q) || action.includes(q)
  })
})

function getLabel(k: KeySetting): string {
  return k.label || actionLabels.value[k.action] || k.action || ''
}

function formatKey(key: string): string[] {
  return key.split('+').map((p) => p.trim())
}

async function triggerShortcut(k: KeySetting) {
  // Send message to background to execute
  await chrome.runtime.sendMessage({
    action: k.action,
    ...k,
  })
  window.close()
}

function onKeydown(e: KeyboardEvent) {
  if (creating.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, filtered.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (filtered.value[selectedIndex.value]) {
      triggerShortcut(filtered.value[selectedIndex.value])
    }
  }
}

function openSettings() {
  chrome.runtime.openOptionsPage()
  window.close()
}

import { loadKeys, saveKeys } from '@/utils/storage'

onMounted(async () => {
  const saved = await loadKeys()
  if (saved) {
    keys.value = JSON.parse(saved)
  }
  await nextTick()
  searchInput.value?.focus()
})
</script>

<template>
  <div class="popup">
    <div class="search-bar">
      <i class="mdi mdi-magnify"></i>
      <input
        ref="searchInput"
        v-model="query"
        @keydown="onKeydown"
        placeholder="Search shortcuts…"
        autofocus
      />
    </div>
    <div v-if="creating" class="quick-add">
      <div class="quick-add-field">
        <label class="quick-add-label">Shortcut</label>
        <ShortcutRecorder v-model="newKey" />
      </div>
      <div class="quick-add-field">
        <label class="quick-add-label">Action</label>
        <SearchSelect v-model="newAction" :options="getActionOptionsForSelect()" placeholder="Choose an action…" />
      </div>
      <div class="quick-add-actions">
        <button class="quick-add-cancel" @click="cancelCreating" type="button">Cancel</button>
        <button class="quick-add-save" @click="saveNewShortcut" type="button" :disabled="!newKey || !newAction">Save</button>
      </div>
    </div>
    <div class="results" v-if="filtered.length > 0 && !creating">
      <button
        v-for="(k, i) in filtered"
        :key="k.id"
        :class="['result-row', { selected: i === selectedIndex }]"
        @click="triggerShortcut(k)"
        @mouseenter="selectedIndex = i"
      >
        <div class="result-info">
          <span class="result-label">{{ getLabel(k) }}</span>
          <span class="result-action">{{ actionLabels[k.action] || k.action }}</span>
        </div>
        <div class="result-key">
          <kbd v-for="(part, pi) in formatKey(k.key)" :key="pi">{{ part }}</kbd>
        </div>
      </button>
    </div>
    <div v-else-if="!creating" class="empty">
      <span v-if="keys.length === 0">No shortcuts configured</span>
      <span v-else>No matching shortcuts</span>
    </div>
    <div class="footer">
      <span class="hint"><kbd>↑↓</kbd> navigate <kbd>↵</kbd> trigger</span>
      <div class="footer-links">
        <a class="settings-link" @click="startCreating" v-if="!creating">
          <i class="mdi mdi-plus"></i> New
        </a>
        <a class="settings-link" @click="openSettings">
          <i class="mdi mdi-cog-outline"></i> Settings
        </a>
      </div>
    </div>
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  width: 360px;
  max-height: 480px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  color: #1a1a2e;
  background: #fff;
}

.popup { display: flex; flex-direction: column; max-height: 480px; }

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.search-bar .mdi { color: #94a3b8; font-size: 18px; flex-shrink: 0; }

.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #1a1a2e;
  background: transparent;
}

.search-bar input::placeholder { color: #cbd5e1; }

.results {
  flex: 1;
  overflow-y: auto;
  max-height: 360px;
}

.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
  gap: 12px;
}

.result-row:hover, .result-row.selected { background: #f1f5f9; }
.result-row.selected { background: #eef2ff; }

.result-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.result-label {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a2e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-action {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-key {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
}

.result-key kbd {
  display: inline-block;
  padding: 2px 6px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', Menlo, monospace;
  font-size: 11px;
  color: #475569;
  line-height: 1.4;
  text-transform: capitalize;
}

.empty {
  padding: 32px 14px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.footer .hint {
  color: #94a3b8;
  font-size: 11px;
}

.footer kbd {
  display: inline-block;
  padding: 1px 4px;
  background: #e2e8f0;
  border-radius: 3px;
  font-family: inherit;
  font-size: 10px;
  color: #64748b;
}

.settings-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.15s;
}

.settings-link:hover { color: #4361ee; }
.settings-link .mdi { font-size: 14px; }

.footer-links {
  display: flex;
  gap: 12px;
}

.quick-add {
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.quick-add-field {
  margin-bottom: 8px;
}

.quick-add-label {
  display: block;
  font-size: 10px;
  font-weight: 500;
  color: #94a3b8;
  margin-bottom: 3px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.quick-add-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}

.quick-add-cancel {
  padding: 5px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  background: white;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
}

.quick-add-save {
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  background: #4361ee;
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.quick-add-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-add-save:hover:not(:disabled) {
  background: #3451d1;
}

/* ShortcutRecorder overrides for compact popup */
.quick-add .field-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 5px 0 0 5px;
  border-right: none;
  font-size: 13px;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-weight: 500;
  color: #1a1a2e;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
}

.quick-add .field-input:focus {
  border-color: #4361ee;
  box-shadow: none;
}

.quick-add .field-input::placeholder {
  color: #cbd5e1;
  font-weight: 400;
}

.quick-add .record-btn {
  padding: 0 8px;
  border: 1px solid #e2e8f0;
  border-radius: 0 5px 5px 0;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 400;
  gap: 3px;
}

.quick-add .record-btn:hover {
  background: #f1f5f9;
  color: #64748b;
}

.quick-add .field-input:focus + .record-btn {
  border-color: #4361ee;
}

.quick-add .record-btn .mdi {
  font-size: 12px;
}

.quick-add .record-btn .record-text {
  font-size: 11px;
}

/* SearchSelect overrides for compact popup */
.quick-add .ss-trigger {
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  font-size: 13px;
  color: #1a1a2e;
  background: #fff;
  transition: border-color 0.15s;
}

.quick-add .ss-trigger:hover {
  border-color: #cbd5e1;
}

.quick-add .ss-trigger:focus {
  border-color: #4361ee;
  box-shadow: none;
  outline: none;
}

.quick-add .ss-trigger-text.placeholder {
  color: #cbd5e1;
}

.quick-add .ss-search {
  padding: 6px 10px;
  border: 1px solid #4361ee;
  border-radius: 5px 5px 0 0;
  font-size: 13px;
  box-shadow: none;
}

.quick-add .ss-dropdown {
  max-height: 200px;
  border-radius: 0 0 5px 5px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.quick-add .ss-group-label {
  padding: 4px 10px 3px;
  font-size: 10px;
}

.quick-add .ss-option {
  padding: 5px 10px 5px 16px;
  font-size: 12px;
}
</style>
