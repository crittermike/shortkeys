<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { v4 as uuid } from 'uuid'
import {
  ACTION_CATEGORIES,
  SCROLL_ACTIONS,
  WEBSITE_OPTIONS,
  isBuiltInAction,
  getAllActionValues,
} from '@/utils/actions-registry'
import type { KeySetting } from '@/utils/url-matching'
import { detectConflicts, type ShortcutConflict } from '@/utils/shortcut-conflicts'
import { executeJavascriptOnTab } from '@/utils/test-javascript'
import { saveKeys, loadKeys } from '@/utils/storage'
import SearchSelect from '@/components/SearchSelect.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import ShortcutRecorder from '@/components/ShortcutRecorder.vue'
import { ALL_PACKS, type ShortcutPack } from '@/packs'
import { resolveUserscriptUrl, parseUserscript } from '@/utils/fetch-userscript'

const activeTab = ref(0)
const keys = ref<KeySetting[]>([])
const bookmarks = ref<{ title: string; url: string }[]>([])
const importJson = ref('')
const shareLink = ref('')
const expandedRow = ref<number | null>(null)
const snackMessage = ref('')
const snackType = ref<'success' | 'danger'>('success')
const searchQuery = ref('')
const dragIndex = ref<number | null>(null)
const darkMode = ref(false)
const userscriptUrl = ref('')
const userscriptLoading = ref(false)
const userscriptMessage = ref('')

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

function applyTheme() {
  document.documentElement.setAttribute('data-theme', darkMode.value ? 'dark' : 'light')
}

initTheme()

interface BrowserTab { id: number; title: string; url: string; favIconUrl?: string }
const openTabs = ref<BrowserTab[]>([])
const selectedTabId = ref<number | null>(null)

const conflicts = computed(() => detectConflicts(keys.value))

function getConflicts(index: number): ShortcutConflict[] {
  return conflicts.value.get(index) || []
}

/** Build a lookup from action value → label */
const actionLabels = computed(() => {
  const map: Record<string, string> = {}
  for (const actions of Object.values(ACTION_CATEGORIES)) {
    for (const a of actions) map[a.value] = a.label
  }
  return map
})

/** Indices of shortcuts that match the search query */
const filteredIndices = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return keys.value.map((_, i) => i)
  return keys.value
    .map((row, i) => {
      const label = (row.label || '').toLowerCase()
      const key = (row.key || '').toLowerCase()
      const action = (actionLabels.value[row.action] || row.action || '').toLowerCase()
      if (label.includes(q) || key.includes(q) || action.includes(q)) return i
      return -1
    })
    .filter((i) => i >= 0)
})

const stats = computed(() => {
  const total = keys.value.length
  const enabled = keys.value.filter((k) => k.enabled !== false).length
  const disabled = total - enabled
  const withConflicts = conflicts.value.size
  return { total, enabled, disabled, withConflicts }
})

const DEFAULT_GROUP = 'My Shortcuts'
const collapsedGroups = ref<Set<string>>(new Set())
const editingGroupName = ref<string | null>(null)
const newGroupName = ref('')

/** Get ordered list of unique group names */
const groupNames = computed(() => {
  const names = new Set<string>()
  for (const k of keys.value) names.add(k.group || DEFAULT_GROUP)
  // Always put default group first
  const ordered = [DEFAULT_GROUP]
  for (const n of names) {
    if (n !== DEFAULT_GROUP) ordered.push(n)
  }
  return ordered
})

/** Group indices by group name, respecting search filter */
const groupedIndices = computed(() => {
  const map = new Map<string, number[]>()
  for (const i of filteredIndices.value) {
    const group = keys.value[i].group || DEFAULT_GROUP
    if (!map.has(group)) map.set(group, [])
    map.get(group)!.push(i)
  }
  return map
})

function toggleGroupCollapse(group: string) {
  if (collapsedGroups.value.has(group)) {
    collapsedGroups.value.delete(group)
  } else {
    collapsedGroups.value.add(group)
  }
}

function toggleGroupEnabled(group: string) {
  const indices = groupedIndices.value.get(group) || []
  const allEnabled = indices.every((i) => keys.value[i].enabled !== false)
  for (const i of indices) {
    keys.value[i].enabled = allEnabled ? false : true
  }
}

function isGroupAllEnabled(group: string): boolean {
  const indices = groupedIndices.value.get(group) || []
  return indices.length > 0 && indices.every((i) => keys.value[i].enabled !== false)
}

function deleteGroup(group: string) {
  if (!confirm(`Delete all ${groupedIndices.value.get(group)?.length || 0} shortcuts in "${group}"?`)) return
  keys.value = keys.value.filter((k) => (k.group || DEFAULT_GROUP) !== group)
}

function startRenameGroup(group: string) {
  editingGroupName.value = group
  newGroupName.value = group
}

function finishRenameGroup(oldName: string) {
  const trimmed = newGroupName.value.trim()
  if (trimmed && trimmed !== oldName) {
    for (const k of keys.value) {
      if ((k.group || DEFAULT_GROUP) === oldName) {
        k.group = trimmed === DEFAULT_GROUP ? undefined : trimmed
      }
    }
  }
  editingGroupName.value = null
}

function addShortcutToGroup(group: string) {
  keys.value.push({ id: uuid(), enabled: true, group: group === DEFAULT_GROUP ? undefined : group } as KeySetting)
}

async function refreshTabs() {
  const tabs = await chrome.tabs.query({})
  openTabs.value = tabs
    .filter((t) => t.url && !t.url.startsWith('chrome') && t.id)
    .map((t) => ({ id: t.id!, title: t.title || '', url: t.url!, favIconUrl: t.favIconUrl }))
  if (openTabs.value.length > 0 && !selectedTabId.value) {
    selectedTabId.value = openTabs.value[0].id
  }
}

function showSnack(msg: string, type: 'success' | 'danger' = 'success') {
  snackMessage.value = msg
  snackType.value = type
  setTimeout(() => (snackMessage.value = ''), 3000)
}

function needsUserScripts(): boolean {
  const hasJs = keys.value.some((k) => k.action === 'javascript')
  if (!hasJs) return false
  try {
    ;(chrome as any).userScripts.register
    return false
  } catch {
    return true
  }
}

function ensureIds() {
  keys.value.forEach((key) => {
    if (!key.id) key.id = uuid()
    if (key.enabled === undefined) key.enabled = true
  })
}

function addShortcut() {
  keys.value.push({ id: uuid(), enabled: true } as KeySetting)
}

async function saveShortcuts() {
  ensureIds()
  // Strip empty shortcuts that have no key and no action
  keys.value = keys.value.filter((k) => k.key || k.action)
  keys.value.forEach((key) => {
    key.sites = key.sites || ''
    key.sitesArray = key.sites.split('\n')
  })
  const area = await saveKeys(keys.value)
  showSnack(area === 'sync' ? 'Shortcuts saved & synced!' : 'Shortcuts saved (local only — too large to sync)')
}

function importKeys() {
  try {
    const parsed = JSON.parse(importJson.value)
    // Filter out empty/invalid shortcuts (#472/#598)
    const valid = (Array.isArray(parsed) ? parsed : [parsed]).filter(
      (k: any) => k && (k.key || k.action),
    )
    keys.value = keys.value.concat(valid)
    ensureIds()
    showSnack('Imported successfully!')
  } catch {
    showSnack('Invalid JSON. Please check and try again.', 'danger')
  }
}

function deleteShortcut(index: number) {
  if (confirm('Delete this shortcut?')) {
    keys.value.splice(index, 1)
    if (expandedRow.value === index) expandedRow.value = null
  }
}

function toggleDetails(index: number) {
  expandedRow.value = expandedRow.value === index ? null : index
}

/** Actions that have required config fields the user needs to fill in */
const ACTIONS_NEEDING_EXPANSION = [
  'javascript', 'openbookmark', 'openbookmarknewtab', 'openbookmarkbackgroundtab',
  'openbookmarkbackgroundtabandclose', 'gototab', 'gototabbytitle', 'gototabbyindex',
  'buttonnexttab', 'openapp', 'trigger', 'openurl', 'inserttext',
]

function onActionChange(row: KeySetting, index: number, action: string) {
  row.action = action
  if (ACTIONS_NEEDING_EXPANSION.includes(action)) {
    expandedRow.value = index
  }
}

function toggleEnabled(row: KeySetting) {
  row.enabled = row.enabled === false ? true : false
}

function onDragStart(index: number) {
  dragIndex.value = index
}

function onDragOver(e: DragEvent, index: number) {
  e.preventDefault()
  if (dragIndex.value === null || dragIndex.value === index) return
  const item = keys.value.splice(dragIndex.value, 1)[0]
  // Update group to match destination
  const destGroup = keys.value[Math.min(index, keys.value.length - 1)]?.group
  item.group = destGroup
  keys.value.splice(index, 0, item)
  dragIndex.value = index
}

function onDragOverGroup(e: DragEvent, group: string) {
  e.preventDefault()
  if (dragIndex.value === null) return
  // Update dragged item's group
  keys.value[dragIndex.value].group = group === DEFAULT_GROUP ? undefined : group
}

function onDragEnd() {
  dragIndex.value = null
}

function createNewGroup() {
  const name = prompt('New group name:')
  if (!name?.trim()) return
  // Add an empty shortcut in the new group so it appears
  keys.value.push({ id: uuid(), enabled: true, group: name.trim() } as KeySetting)
}

// Group header context menu state
const groupMenuOpen = ref<string | null>(null)

function toggleGroupMenu(group: string) {
  groupMenuOpen.value = groupMenuOpen.value === group ? null : group
}

function closeGroupMenus() {
  groupMenuOpen.value = null
}

// Pack preview modal
const previewPack = ref<ShortcutPack | null>(null)
const packConflictMode = ref<'skip' | 'replace' | 'keep'>('replace')

function getPackConflicts(pack: ShortcutPack): string[] {
  const existing = new Set(keys.value.map((k) => k.key?.toLowerCase()).filter(Boolean))
  return pack.shortcuts.filter((s) => existing.has(s.key?.toLowerCase())).map((s) => s.key)
}

function installPack(pack: ShortcutPack) {
  const mode = packConflictMode.value
  const groupName = pack.name
  const existingKeys = new Set(keys.value.map((k) => k.key?.toLowerCase()).filter(Boolean))

  const newShortcuts = pack.shortcuts.map((s) => ({
    ...s,
    id: uuid(),
    group: groupName,
    enabled: true,
  }))

  if (mode === 'skip') {
    // Only add non-conflicting
    const toAdd = newShortcuts.filter((s) => !existingKeys.has(s.key?.toLowerCase()))
    keys.value.push(...toAdd)
  } else if (mode === 'replace') {
    // Remove existing conflicting shortcuts, add all from pack
    const packKeys = new Set(newShortcuts.map((s) => s.key?.toLowerCase()))
    keys.value = keys.value.filter((k) => !packKeys.has(k.key?.toLowerCase()))
    keys.value.push(...newShortcuts)
  } else {
    // Keep both
    keys.value.push(...newShortcuts)
  }

  previewPack.value = null
  showSnack(`✓ Added "${pack.name}" (${newShortcuts.length} shortcuts)`)
}

function isScrollAction(action: string): boolean {
  return (SCROLL_ACTIONS as readonly string[]).includes(action)
}

function isBookmarkAction(action: string): boolean {
  return ['openbookmark', 'openbookmarknewtab', 'openbookmarkbackgroundtab', 'openbookmarkbackgroundtabandclose'].includes(action)
}

function copyExport() {
  navigator.clipboard.writeText(JSON.stringify(keys.value, null, 2))
  showSnack('Copied to clipboard!')
}

function generateShareLink() {
  try {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(keys.value))))
    shareLink.value = `https://shortkeys.app/share#${encoded}`
    navigator.clipboard.writeText(shareLink.value)
    showSnack('Share link copied!')
  } catch {
    showSnack('Failed to generate share link', 'danger')
  }
}

function shareGroup(group: string) {
  const groupShortcuts = keys.value.filter((k) => (k.group || DEFAULT_GROUP) === group)
  try {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(groupShortcuts))))
    const url = `https://shortkeys.app/share#${encoded}`
    navigator.clipboard.writeText(url)
    showSnack(`Share link for "${group}" copied!`)
  } catch {
    showSnack('Failed to generate share link', 'danger')
  }
}

async function testJavascript(row: KeySetting) {
  if (!selectedTabId.value) {
    showSnack('Select a tab to test on', 'danger')
    return
  }
  const result = await executeJavascriptOnTab(selectedTabId.value, row.code || '')
  if (result.success) {
    showSnack(`✓ Ran on ${result.hostname}`)
  } else {
    showSnack(result.error, 'danger')
  }
}

async function importUserscript(index: number) {
  const url = userscriptUrl.value.trim()
  if (!url) return
  userscriptLoading.value = true
  userscriptMessage.value = ''
  try {
    const codeUrl = resolveUserscriptUrl(url)
    const resp: any = await browser.runtime.sendMessage({ action: 'fetchUrl', url: codeUrl })
    if (resp?.error) {
      userscriptMessage.value = '❌ ' + resp.error
      return
    }
    const { code, name } = parseUserscript(resp.text)
    keys.value[index].code = code
    userscriptMessage.value = '✓ Imported: ' + name
    userscriptUrl.value = ''
  } catch (e: any) {
    userscriptMessage.value = '❌ ' + (e.message || 'Failed to fetch')
  } finally {
    userscriptLoading.value = false
  }
}

onMounted(async () => {
  const saved = await loadKeys()
  if (saved) {
    keys.value = JSON.parse(saved)
    ensureIds()
  } else {
    addShortcut()
  }

  refreshTabs()

  // Close group menus on outside click
  document.addEventListener('click', () => { groupMenuOpen.value = null })

  chrome.bookmarks.getTree((tree) => {
    const process = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
      for (const node of nodes) {
        if (node.url) bookmarks.value.push({ title: node.title, url: node.url })
        if (node.children) process(node.children)
      }
    }
    process(tree)
  })
})
</script>

<template>
  <div class="app-wrapper">
    <!-- Header -->
    <header class="app-header">
      <div class="header-inner">
        <div class="brand">
          <img src="/images/icon_48.png" alt="Shortkeys" class="brand-icon" />
          <span class="brand-text">Shortkeys</span>
        </div>
        <nav class="header-links">
          <a href="https://chrome.google.com/webstore/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck/reviews" target="_blank">Review</a>
          <a href="https://github.com/mikecrittenden/shortkeys/wiki/How-To-Use-Shortkeys" target="_blank">Docs</a>
          <a href="https://github.com/mikecrittenden/shortkeys/issues" target="_blank">Support</a>
          <a href="https://github.com/mikecrittenden/shortkeys" target="_blank">GitHub</a>
          <button class="theme-toggle" @click="toggleTheme" :title="darkMode ? 'Switch to light mode' : 'Switch to dark mode'" type="button">
            <i :class="darkMode ? 'mdi mdi-white-balance-sunny' : 'mdi mdi-moon-waning-crescent'"></i>
          </button>
        </nav>
      </div>
    </header>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="snackMessage" :class="['toast', snackType === 'danger' ? 'toast-error' : 'toast-success']">
        {{ snackMessage }}
      </div>
    </Transition>

    <main class="app-main">
      <!-- Tabs -->
      <div class="tab-bar">
        <button :class="['tab-btn', { active: activeTab === 0 }]" @click="activeTab = 0">
          <i class="mdi mdi-keyboard"></i> Shortcuts
        </button>
        <button :class="['tab-btn', { active: activeTab === 1 }]" @click="activeTab = 1">
          <i class="mdi mdi-import"></i> Import
        </button>
        <button :class="['tab-btn', { active: activeTab === 2 }]" @click="activeTab = 2">
          <i class="mdi mdi-export"></i> Export
        </button>
      </div>

      <!-- Shortcuts Tab -->
      <div v-show="activeTab === 0" class="tab-content">
        <article v-if="needsUserScripts()" class="alert alert-warning">
          <strong>Allow User Scripts</strong> —
          In order for JavaScript actions to work, you must first allow User Scripts in your
          browser extension details page. Then come back and save your shortcuts.
        </article>

        <!-- Stats bar -->
        <div v-if="keys.length > 0" class="stats-bar">
          <div class="stats-chips">
            <span class="stat-chip">
              <i class="mdi mdi-keyboard"></i> {{ stats.total }} shortcut{{ stats.total !== 1 ? 's' : '' }}
            </span>
            <span v-if="stats.disabled > 0" class="stat-chip stat-disabled">
              <i class="mdi mdi-pause-circle-outline"></i> {{ stats.disabled }} disabled
            </span>
            <span v-if="stats.withConflicts > 0" class="stat-chip stat-warn">
              <i class="mdi mdi-alert-outline"></i> {{ stats.withConflicts }} with conflicts
            </span>
          </div>
          <div class="search-wrap">
            <i class="mdi mdi-magnify search-icon"></i>
            <input
              class="search-input"
              type="text"
              placeholder="Filter shortcuts…"
              v-model="searchQuery"
            />
            <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''" type="button">
              <i class="mdi mdi-close"></i>
            </button>
          </div>
        </div>

        <!-- Grouped shortcut rows -->
        <div class="shortcut-groups">
          <div v-for="group in groupNames" :key="group" class="shortcut-group" v-show="groupedIndices.has(group)">
            <!-- Group header -->
            <div class="group-header" @dragover="onDragOverGroup($event, group)">
              <button class="group-collapse" @click="toggleGroupCollapse(group)" type="button">
                <i :class="collapsedGroups.has(group) ? 'mdi mdi-chevron-right' : 'mdi mdi-chevron-down'"></i>
              </button>
              <template v-if="editingGroupName === group">
                <input
                  class="group-name-input"
                  v-model="newGroupName"
                  @keydown.enter="finishRenameGroup(group)"
                  @blur="finishRenameGroup(group)"
                  @keydown.escape="editingGroupName = null"
                  ref="groupNameInput"
                  autofocus
                />
              </template>
              <template v-else>
                <span class="group-name" @dblclick="startRenameGroup(group)">{{ group }}</span>
              </template>
              <span class="group-count">{{ groupedIndices.get(group)?.length || 0 }}</span>
              <div class="group-actions">
                <div class="group-menu-wrap">
                  <button class="btn-icon btn-icon-sm" @click.stop="toggleGroupMenu(group)" title="Group options" type="button">
                    <i class="mdi mdi-dots-vertical"></i>
                  </button>
                  <div v-if="groupMenuOpen === group" class="group-menu" @click="closeGroupMenus">
                    <button class="group-menu-item" @click="startRenameGroup(group)">
                      <i class="mdi mdi-pencil-outline"></i> Rename group
                    </button>
                    <button class="group-menu-item" @click="toggleGroupEnabled(group)">
                      <i :class="isGroupAllEnabled(group) ? 'mdi mdi-pause-circle-outline' : 'mdi mdi-play-circle-outline'"></i>
                      {{ isGroupAllEnabled(group) ? 'Disable all' : 'Enable all' }}
                    </button>
                    <button class="group-menu-item" @click="shareGroup(group)">
                      <i class="mdi mdi-share-variant-outline"></i> Share group
                    </button>
                    <button class="group-menu-item group-menu-danger" @click="deleteGroup(group)">
                      <i class="mdi mdi-delete-outline"></i> Delete group
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Shortcuts in this group -->
            <div class="shortcut-list" v-show="!collapsedGroups.has(group)">
              <div
                v-for="index in (groupedIndices.get(group) || [])"
                :key="keys[index].id"
                :class="['shortcut-card', { disabled: keys[index].enabled === false, dragging: dragIndex === index }]"
                draggable="true"
                @dragstart="onDragStart(index)"
                @dragover="onDragOver($event, index)"
                @dragend="onDragEnd"
              >
                <!-- Editable label above the card -->
                <div class="shortcut-header">
                  <i class="mdi mdi-drag-vertical drag-handle" title="Drag to reorder"></i>
                  <input
                    class="shortcut-label-title"
                    type="text"
                    placeholder="Untitled shortcut"
                    v-model="keys[index].label"
                  />
                  <button
                    :class="['toggle toggle-sm', { on: keys[index].enabled !== false }]"
                    @click="toggleEnabled(keys[index])"
                    type="button"
                    :title="keys[index].enabled !== false ? 'Enabled — click to disable' : 'Disabled — click to enable'"
                  >
                    <span class="toggle-knob"></span>
                  </button>
                </div>
                <div class="shortcut-row">
                  <div class="field-group shortcut-col">
                    <label class="field-label">Shortcut</label>
                    <ShortcutRecorder
                      :modelValue="keys[index].key"
                      @update:modelValue="keys[index].key = $event"
                    />
                  </div>
                  <div class="field-group behavior-col">
                    <label class="field-label">Behavior</label>
                    <SearchSelect
                      :modelValue="keys[index].action"
                      @update:modelValue="onActionChange(keys[index], index, $event)"
                      :options="ACTION_CATEGORIES"
                      placeholder="Choose action…"
                    />
                  </div>
                  <div class="shortcut-actions">
                    <button class="btn-icon" @click="toggleDetails(index)" :title="expandedRow === index ? 'Collapse' : 'Settings'">
                      <i :class="expandedRow === index ? 'mdi mdi-chevron-up' : 'mdi mdi-cog-outline'"></i>
                    </button>
                    <button class="btn-icon btn-delete" @click="deleteShortcut(index)" title="Delete">
                      <i class="mdi mdi-close"></i>
                    </button>
                  </div>
                </div>

            <!-- Conflict warnings -->
            <div v-if="getConflicts(index).length" class="conflict-warnings">
              <div v-for="(c, ci) in getConflicts(index)" :key="ci" :class="['conflict-pill', c.type]">
                <i :class="c.type === 'browser' ? 'mdi mdi-alert-outline' : 'mdi mdi-content-duplicate'"></i>
                {{ c.message }}
              </div>
            </div>

            <!-- Expanded details -->
            <Transition name="expand">
              <div v-if="expandedRow === index" class="shortcut-details">

                <article v-if="isBuiltInAction(keys[index].action)" class="alert alert-info">
                  <i class="mdi mdi-information-outline"></i>
                  Also available via the browser's native
                  <strong>Keyboard Shortcuts</strong> settings.
                  <a href="https://github.com/mikecrittenden/shortkeys/wiki/FAQs-and-Troubleshooting#Do_I_use_the_browsers_Keyboard_Shortcuts_settings_or_the_Shortkeys_options_page" target="_blank">Learn more →</a>
                </article>

                <!-- Code editor for JS (full-width, prominent) -->
                <div v-if="keys[index].action === 'javascript'" class="code-editor-wrap">
                  <div class="code-header">
                    <span class="code-title"><i class="mdi mdi-code-braces"></i> JavaScript</span>
                    <div class="code-actions">
                      <span class="run-label">Test on:</span>
                      <div class="tab-picker" @click="refreshTabs">
                        <i class="mdi mdi-tab"></i>
                        <select v-model="selectedTabId" class="tab-picker-select">
                          <option v-for="t in openTabs" :key="t.id" :value="t.id">
                            {{ t.title.substring(0, 35) }}{{ t.title.length > 35 ? '…' : '' }}
                          </option>
                        </select>
                      </div>
                      <button class="btn-run" @click="testJavascript(keys[index])" type="button">
                        <i class="mdi mdi-play"></i> Run
                      </button>
                    </div>
                  </div>
                  <CodeEditor :modelValue="keys[index].code || ''" @update:modelValue="keys[index].code = $event" />
                </div>
                <div v-if="keys[index].action === 'javascript'" class="import-userscript">
                  <div class="import-userscript-row">
                    <i class="mdi mdi-link-variant import-icon"></i>
                    <input
                      v-model="userscriptUrl"
                      class="import-userscript-input"
                      placeholder="Paste a Greasyfork or userscript URL to import…"
                      @keydown.enter="importUserscript(index)"
                    />
                    <button class="btn-fetch" @click="importUserscript(index)" type="button" :disabled="userscriptLoading">
                      <i :class="['mdi', userscriptLoading ? 'mdi-loading mdi-spin' : 'mdi-download']"></i> Fetch
                    </button>
                  </div>
                  <span v-if="userscriptMessage" class="import-userscript-msg">{{ userscriptMessage }}</span>
                </div>

                <!-- Action-specific settings -->
                <div class="details-section">
                  <div v-if="isScrollAction(keys[index].action)" class="toggle-row-inline">
                    <span class="toggle-label-sm">Smooth scrolling</span>
                    <button :class="['toggle', { on: keys[index].smoothScrolling }]" @click="keys[index].smoothScrolling = !keys[index].smoothScrolling" type="button">
                      <span class="toggle-knob"></span>
                    </button>
                  </div>

                  <div v-if="keys[index].action === 'gototab' || keys[index].action === 'gototabbytitle'" class="toggle-row-inline">
                    <span class="toggle-label-sm">Current window only</span>
                    <button :class="['toggle', { on: keys[index].currentWindow }]" @click="keys[index].currentWindow = !keys[index].currentWindow" type="button">
                      <span class="toggle-knob"></span>
                    </button>
                  </div>

                  <div v-if="isBookmarkAction(keys[index].action)" class="detail-field">
                    <label>Bookmark</label>
                    <SearchSelect
                      :modelValue="keys[index].bookmark || ''"
                      @update:modelValue="keys[index].bookmark = $event"
                      :options="{ Bookmarks: bookmarks.map(bm => ({ value: bm.title, label: bm.title || bm.url, sublabel: bm.url })) }"
                      placeholder="Search bookmarks…"
                    />
                  </div>

                  <div v-if="keys[index].action === 'gototabbytitle'" class="detail-field">
                    <label>Title to match <span class="hint">(wildcards accepted)</span></label>
                    <input class="field-input" v-model="keys[index].matchtitle" placeholder="*Gmail*" />
                  </div>

                  <div v-if="keys[index].action === 'gototab'" class="detail-row">
                    <div class="detail-field flex-1">
                      <label>URL to match <a class="hint-link" target="_blank" href="https://developer.chrome.com/extensions/match_patterns">pattern help →</a></label>
                      <input class="field-input" v-model="keys[index].matchurl" placeholder="*://mail.google.com/*" />
                    </div>
                    <div class="detail-field flex-1">
                      <label>Fallback URL <span class="hint">(if no match)</span></label>
                      <input class="field-input" v-model="keys[index].openurl" placeholder="https://mail.google.com" />
                    </div>
                  </div>

                  <div v-if="keys[index].action === 'gototabbyindex'" class="detail-field" style="max-width: 200px">
                    <label>Tab index <span class="hint">(starts from 1)</span></label>
                    <input class="field-input" type="number" v-model="keys[index].matchindex" min="1" />
                  </div>

                  <div v-if="keys[index].action === 'buttonnexttab'" class="detail-field">
                    <label>Button CSS selector</label>
                    <input class="field-input mono" v-model="keys[index].button" placeholder="#submit-btn" />
                  </div>

                  <div v-if="keys[index].action === 'openurl'" class="detail-field">
                    <label>URL to open</label>
                    <input class="field-input mono" v-model="keys[index].openurl" placeholder="https://example.com" />
                  </div>

                  <div v-if="keys[index].action === 'openapp'" class="detail-field">
                    <label>App ID <span class="hint">(from extensions page)</span></label>
                    <input class="field-input mono" v-model="keys[index].openappid" />
                  </div>

                  <div v-if="keys[index].action === 'trigger'" class="detail-field" style="max-width: 250px">
                    <label>Shortcut to trigger</label>
                    <input class="field-input shortcut-input" v-model="keys[index].trigger" placeholder="e.g. ctrl+b" />
                  </div>

                  <div v-if="keys[index].action === 'inserttext'" class="detail-field">
                    <label>Text to insert</label>
                    <textarea class="field-textarea mono" v-model="keys[index].inserttext" rows="2" placeholder="Text to type into the focused field…"></textarea>
                  </div>
                </div>

                <!-- Activation bar: website filter + form inputs toggle -->
                <div class="activation-bar">
                  <div class="site-filter-inline">
                    <div class="segmented">
                      <button
                        :class="['seg-btn', { active: !keys[index].blacklist || keys[index].blacklist === 'false' }]"
                        @click="keys[index].blacklist = false" type="button"
                      >
                        <i class="mdi mdi-earth"></i> All sites
                      </button>
                      <button
                        :class="['seg-btn', { active: keys[index].blacklist === true || keys[index].blacklist === 'true' }]"
                        @click="keys[index].blacklist = true" type="button"
                      >
                        <i class="mdi mdi-earth-minus"></i> Except…
                      </button>
                      <button
                        :class="['seg-btn', { active: keys[index].blacklist === 'whitelist' }]"
                        @click="keys[index].blacklist = 'whitelist'" type="button"
                      >
                        <i class="mdi mdi-earth-plus"></i> Only on…
                      </button>
                    </div>
                  </div>
                  <div class="toggle-row-inline">
                    <span class="toggle-label-sm">Active in form inputs</span>
                    <button :class="['toggle', { on: keys[index].activeInInputs }]" @click="keys[index].activeInInputs = !keys[index].activeInInputs" type="button">
                      <span class="toggle-knob"></span>
                    </button>
                  </div>
                </div>
                <textarea
                  v-if="keys[index].blacklist && keys[index].blacklist !== 'false'"
                  class="field-textarea mono site-patterns"
                  v-model="keys[index].sites"
                  rows="3"
                  :placeholder="keys[index].blacklist === 'whitelist' ? 'Sites to activate on…\n*example.com*' : 'Sites to disable on…\n*example.com*'"
                ></textarea>
              </div>
            </Transition>
          </div>
            </div>
            <!-- Add shortcut to this group -->
            <button class="btn-add-to-group" @click="addShortcutToGroup(group)" type="button" v-show="!collapsedGroups.has(group)">
              <i class="mdi mdi-plus"></i> Add shortcut
            </button>
          </div>
        </div>

        <div class="action-bar">
          <div class="action-bar-left">
            <button class="btn btn-secondary" @click="addShortcut">
              <i class="mdi mdi-plus"></i> Add shortcut
            </button>
            <button class="btn btn-secondary" @click="createNewGroup">
              <i class="mdi mdi-folder-plus-outline"></i> New group
            </button>
          </div>
          <button class="btn btn-primary" @click="saveShortcuts">
            <i class="mdi mdi-content-save"></i> Save shortcuts
          </button>
        </div>
      </div>

      <!-- Import Tab -->
      <div v-show="activeTab === 1" class="tab-content">
        <!-- Pack Library -->
        <h3 class="section-title">Shortcut Packs</h3>
        <p class="tab-desc">One-click install curated shortcut collections. They'll appear as a group you can customize or remove.</p>
        <div class="pack-grid">
          <div v-for="pack in ALL_PACKS" :key="pack.id" class="pack-card" :style="{ borderTopColor: pack.color }">
            <div class="pack-icon">{{ pack.icon }}</div>
            <div class="pack-info">
              <div class="pack-name">{{ pack.name }}</div>
              <div class="pack-desc">{{ pack.description }}</div>
              <div class="pack-meta">{{ pack.shortcuts.length }} shortcuts</div>
            </div>
            <div class="pack-actions">
              <button class="btn btn-secondary btn-sm" @click="previewPack = pack" type="button">Preview</button>
              <button class="btn btn-primary btn-sm" @click="previewPack = pack" type="button">
                <i class="mdi mdi-plus"></i> Add
              </button>
            </div>
          </div>
        </div>

        <!-- JSON Import -->
        <h3 class="section-title" style="margin-top: 32px">Import JSON</h3>
        <p class="tab-desc">Paste a JSON array of shortcut objects to import them.</p>
        <textarea class="field-textarea mono" v-model="importJson" rows="8" placeholder='[{"key":"ctrl+b","action":"newtab"}]'></textarea>
        <div class="action-bar">
          <span></span>
          <button class="btn btn-primary" @click="importKeys">
            <i class="mdi mdi-import"></i> Import JSON
          </button>
        </div>
      </div>

      <!-- Pack Preview Modal -->
      <Transition name="modal">
        <div v-if="previewPack" class="modal-overlay" @click.self="previewPack = null">
          <div class="modal-panel">
            <div class="modal-header" :style="{ background: previewPack.color }">
              <span class="modal-icon">{{ previewPack.icon }}</span>
              <div>
                <h2 class="modal-title">{{ previewPack.name }}</h2>
                <p class="modal-subtitle">{{ previewPack.description }}</p>
              </div>
              <button class="modal-close" @click="previewPack = null" type="button">
                <i class="mdi mdi-close"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="modal-shortcuts">
                <div v-for="s in previewPack.shortcuts" :key="s.key" class="modal-shortcut-row">
                  <span class="modal-shortcut-label">{{ s.label || s.action }}</span>
                  <span class="modal-shortcut-keys">
                    <kbd v-for="(part, pi) in s.key.split('+')" :key="pi">{{ part }}</kbd>
                  </span>
                </div>
              </div>

              <div v-if="getPackConflicts(previewPack).length > 0" class="modal-conflicts">
                <div class="modal-conflict-header">
                  <i class="mdi mdi-alert-outline"></i>
                  {{ getPackConflicts(previewPack).length }} shortcut{{ getPackConflicts(previewPack).length > 1 ? 's' : '' }} conflict with your existing shortcuts
                </div>
                <div class="modal-conflict-options">
                  <label class="radio-option">
                    <input type="radio" v-model="packConflictMode" value="replace" />
                    <span>Replace my shortcuts with pack versions</span>
                  </label>
                  <label class="radio-option">
                    <input type="radio" v-model="packConflictMode" value="skip" />
                    <span>Skip conflicting shortcuts</span>
                  </label>
                  <label class="radio-option">
                    <input type="radio" v-model="packConflictMode" value="keep" />
                    <span>Keep both (I'll sort it out later)</span>
                  </label>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="previewPack = null" type="button">Cancel</button>
              <button class="btn btn-primary" @click="installPack(previewPack)" type="button">
                <i class="mdi mdi-plus"></i> Add {{ previewPack.shortcuts.length }} shortcuts
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Export Tab -->
      <div v-show="activeTab === 2" class="tab-content">
        <div class="export-header">
          <p class="tab-desc">Copy the JSON below to back up or share your shortcuts.</p>
          <div class="export-actions">
            <button class="btn btn-secondary" @click="copyExport">
              <i class="mdi mdi-content-copy"></i> Copy JSON
            </button>
            <button class="btn btn-primary" @click="generateShareLink">
              <i class="mdi mdi-share-variant"></i> Share Link
            </button>
          </div>
        </div>
        <div v-if="shareLink" class="share-link-box">
          <input class="field-input mono" :value="shareLink" readonly @click="($event.target as HTMLInputElement).select()" />
          <p class="share-hint">Anyone with Shortkeys can import your shortcuts from this link.</p>
        </div>
        <pre class="export-pre">{{ JSON.stringify(keys, null, 2) }}</pre>
      </div>
    </main>

  </div>
</template>

<style>
/* ── Reset & base ── */
*, *::before, *::after { box-sizing: border-box; }

:root {
  --bg: #f5f7fa;
  --bg-card: #fff;
  --bg-elevated: #f8fafc;
  --bg-input: #fff;
  --bg-hover: #f1f5f9;
  --text: #1a1a2e;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --text-placeholder: #cbd5e1;
  --border: #e2e8f0;
  --border-light: #eef2f6;
  --blue: #4361ee;
  --blue-hover: #3730a3;
  --blue-bg: rgba(67,97,238,0.12);
  --shadow: var(--shadow);
  --shadow-hover: var(--shadow-hover);
}

[data-theme="dark"] {
  --bg: #0f172a;
  --bg-card: #1e293b;
  --bg-elevated: #1e293b;
  --bg-input: #0f172a;
  --bg-hover: #334155;
  --text: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --text-placeholder: #475569;
  --border: #334155;
  --border-light: #1e293b;
  --blue: #6366f1;
  --blue-hover: #818cf8;
  --blue-bg: rgba(99,102,241,0.15);
  --shadow: rgba(0,0,0,0.2);
  --shadow-hover: rgba(0,0,0,0.3);
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

a { color: var(--blue); text-decoration: none; }
a:hover { text-decoration: underline; }

/* ── Layout ── */
.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon { width: 28px; height: 28px; }

.brand-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}

.header-links {
  display: flex;
  gap: 20px;
  align-items: center;
}

.header-links a {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  transition: color 0.15s;
}

.header-links a:hover { color: var(--blue); text-decoration: none; }

.theme-toggle {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s;
}

.theme-toggle:hover { background: var(--bg-hover); color: var(--text); }

.app-main {
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
  flex: 1;
}

/* ── Tabs ── */
.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: var(--bg-card);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 1px 3px var(--shadow);
}

.tab-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab-btn:hover { color: var(--text); background: var(--bg-hover); }
.tab-btn.active { background: var(--blue); color: #fff; box-shadow: 0 2px 8px rgba(67,97,238,0.3); }
.tab-btn .mdi { font-size: 16px; }

.tab-content { animation: fadeIn 0.15s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ── Stats bar ── */
.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.stats-chips {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.stat-chip .mdi { font-size: 14px; }
.stat-disabled { background: #fef3c7; color: #92400e; }
.stat-warn { background: #fef2f2; color: #991b1b; }

.search-wrap {
  position: relative;
  flex: 1;
  max-width: 280px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 16px;
}

.search-input {
  width: 100%;
  padding: 7px 32px 7px 32px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text);
  background: var(--bg-card);
  transition: border-color 0.15s;
}

.search-input:focus { outline: none; border-color: var(--blue); }
.search-input::placeholder { color: var(--text-placeholder); }

.search-clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  font-size: 14px;
}

/* ── Shortcut cards ── */
.shortcut-groups {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.shortcut-group {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px var(--shadow);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-light);
  position: sticky;
  top: 56px;
  z-index: 5;
}

.shortcut-group .shortcut-list { border-top: none; }

.group-collapse {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 18px;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

.group-collapse:hover { color: var(--text-secondary); }

.group-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  cursor: default;
  user-select: none;
}

.group-name-input {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  border: 1px solid #4361ee;
  border-radius: 4px;
  padding: 2px 6px;
  outline: none;
  background: var(--bg-card);
  box-shadow: 0 0 0 3px rgba(67,97,238,0.12);
}

.group-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-hover);
  padding: 2px 8px;
  border-radius: 10px;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.btn-icon-sm { width: 28px; height: 28px; font-size: 14px; }

.group-menu-wrap {
  position: relative;
}

.group-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  min-width: 180px;
  z-index: 20;
  overflow: hidden;
}

.group-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}

.group-menu-item:hover { background: var(--bg-hover); }
.group-menu-item .mdi { font-size: 16px; color: var(--text-secondary); }
.group-menu-danger { color: #ef4444; }
.group-menu-danger .mdi { color: #ef4444; }
.group-menu-danger:hover { background: #fef2f2; }

.btn-add-to-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  background: transparent;
  border: none;
  border-top: 1px dashed var(--border-light);
  border-radius: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-add-to-group:hover { background: var(--bg-hover); color: var(--text-secondary); }
.btn-add-to-group .mdi { font-size: 14px; }
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-card {
  background: var(--bg-card);
  border-radius: 0;
  box-shadow: none;
  border-bottom: 1px solid var(--border-light);
  transition: box-shadow 0.15s;
}

.shortcut-card:hover { background: var(--bg-elevated); }
.shortcut-card.disabled { opacity: 0.5; }
.shortcut-card.dragging { opacity: 0.4; box-shadow: 0 4px 16px rgba(67,97,238,0.2); }

.shortcut-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 16px 0 8px;
}

.drag-handle {
  color: var(--text-placeholder);
  font-size: 18px;
  cursor: grab;
  padding: 2px;
  flex-shrink: 0;
  transition: color 0.15s;
}

.drag-handle:hover { color: var(--text-muted); }
.shortcut-card.dragging .drag-handle { cursor: grabbing; }

.shortcut-label-title {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  outline: none;
  padding: 2px 4px;
}

.shortcut-label-title::placeholder { color: var(--text-placeholder); }
.shortcut-label-title:focus { color: var(--text); }

.shortcut-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 14px 16px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.shortcut-col { width: 260px; flex: 0 0 260px; }
.behavior-col { flex: 1; min-width: 0; }

.field-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.field-input, .field-select, .field-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text);
  background: var(--bg-card);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.field-input:focus, .field-select:focus, .field-textarea:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(67,97,238,0.12);
}

.field-textarea { resize: vertical; }
.mono { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 13px; }

.shortcut-input { font-family: 'SF Mono', Menlo, Consolas, monospace; font-weight: 500; }

.shortcut-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  padding-bottom: 1px;
}

.btn-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 16px;
}

.btn-icon:hover { background: var(--bg-hover); color: var(--text); }
.btn-delete:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }

/* ── Details panel ── */
.shortcut-details {
  border-top: 1px solid var(--border-light);
  padding: 20px;
  background: linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-card) 100%);
  border-radius: 0 0 10px 10px;
}

/* ── Conflict warnings ── */
.conflict-warnings {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 16px 10px;
}

.conflict-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.conflict-pill .mdi { font-size: 14px; }

.conflict-pill.browser {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}

.conflict-pill.duplicate {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.detail-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.flex-1 { flex: 1; min-width: 0; }

/* Activation bar: toggle + filter side by side */
.activation-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.site-filter-inline { flex: 1; }
.site-patterns { margin-top: 8px; }

.toggle-row-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}

.toggle-label-sm { font-size: 13px; font-weight: 500; color: var(--text-secondary); }

.detail-field {
  margin-bottom: 12px;
}

.detail-field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.hint { font-weight: 400; color: var(--text-muted); }
.hint-link { font-weight: 400; color: var(--blue); font-size: 12px; }

/* ── Toggle switch ── */
.toggle {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background: #cbd5e1;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
  padding: 0;
}

.toggle.on { background: var(--blue); }

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-card);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.2s;
}

.toggle.on .toggle-knob { transform: translateX(20px); }

/* Small toggle variant (enable/disable) */
.toggle.toggle-sm { width: 36px; height: 20px; border-radius: 10px; }
.toggle.toggle-sm .toggle-knob { width: 16px; height: 16px; top: 2px; left: 2px; }
.toggle.toggle-sm.on .toggle-knob { transform: translateX(16px); }

/* ── Segmented control ── */
.segmented {
  display: flex;
  background: var(--bg-hover);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}

.seg-btn {
  flex: 1;
  padding: 8px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
}

.seg-btn:hover { color: var(--text); }
.seg-btn.active { background: var(--bg-card); color: var(--blue); box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-weight: 600; }
.seg-btn .mdi { font-size: 14px; }

/* ── Code editor ── */
.code-editor-wrap {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #1e293b;
  margin-bottom: 4px;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px 6px 14px;
  background: #1e293b;
  gap: 8px;
}

.code-title {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.code-title .mdi { font-size: 14px; color: #60a5fa; }

.code-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.run-label {
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.tab-picker {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #334155;
  border-radius: 6px;
  padding: 0 8px;
  height: 30px;
}

.tab-picker .mdi { color: var(--text-muted); font-size: 14px; flex-shrink: 0; }

.tab-picker-select {
  background: transparent;
  border: none;
  color: #e2e8f0;
  font-size: 12px;
  outline: none;
  cursor: pointer;
  max-width: 200px;
  padding: 0;
}

.tab-picker-select option { background: #1e293b; color: #e2e8f0; }

.btn-run {
  padding: 5px 14px;
  font-size: 12px;
  border-radius: 6px;
  background: #059669;
  color: #fff;
  border: none;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background 0.15s;
  height: 30px;
  white-space: nowrap;
}

.btn-run:hover { background: #047857; }
.btn-run .mdi { font-size: 14px; }

/* ── Import userscript ── */
.import-userscript {
  padding: 10px 0 0;
}

.import-userscript-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.import-icon {
  color: var(--text-muted);
  font-size: 16px;
  flex-shrink: 0;
}

.import-userscript-input {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 12px;
  padding: 7px 10px;
  outline: none;
}

.import-userscript-input:focus { border-color: var(--blue); }
.import-userscript-input::placeholder { color: var(--text-placeholder); }

.btn-fetch {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 14px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-fetch:hover { background: #475569; }
.btn-fetch:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-fetch .mdi { font-size: 14px; }

.import-userscript-msg {
  display: block;
  font-size: 11px;
  margin-top: 4px;
  color: var(--text-muted);
}


/* ── Alerts ── */
.alert {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
  line-height: 1.5;
}

.alert-warning { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
.alert-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
.alert-info .mdi { margin-right: 4px; }

/* ── Buttons ── */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.action-bar-left {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-primary { background: var(--blue); color: #fff; }
.btn-primary:hover { background: var(--blue-hover); }

.btn-secondary { background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border); }
.btn-secondary:hover { background: var(--bg-elevated); border-color: var(--text-placeholder); }

/* ── Toast ── */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.toast-success { background: #059669; color: #fff; }
.toast-error { background: #ef4444; color: #fff; }

.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(16px); }

/* ── Expand animation ── */
.expand-enter-active, .expand-leave-active { transition: all 0.2s ease; }
.expand-enter-from, .expand-leave-to { opacity: 0; }

/* ── Export ── */
.export-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.export-header .tab-desc { margin-bottom: 0; }

.export-actions { display: flex; gap: 8px; }

.share-link-box {
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
}

.share-link-box .field-input {
  font-size: 12px;
  cursor: text;
  margin-bottom: 6px;
}

.share-hint {
  font-size: 12px;
  color: var(--blue);
  margin: 0;
}

.export-pre {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
  overflow: auto;
  max-height: 500px;
  color: var(--text);
}

.tab-desc {
  color: var(--text-secondary);
  margin-bottom: 12px;
}

/* ── Section titles ── */
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

/* ── Pack grid ── */
.pack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.pack-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-top: 3px solid #4361ee;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: box-shadow 0.15s;
}

.pack-card:hover { box-shadow: 0 4px 16px var(--shadow-hover); }

.pack-icon { font-size: 28px; }

.pack-info { flex: 1; }

.pack-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.pack-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 6px;
}

.pack-meta {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

.pack-actions {
  display: flex;
  gap: 8px;
}

.btn-sm { padding: 6px 14px; font-size: 12px; }

/* ── Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-panel {
  background: var(--bg-card);
  border-radius: 16px;
  width: 90vw;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0,0,0,0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  color: #fff;
  position: relative;
}

.modal-icon { font-size: 36px; flex-shrink: 0; }

.modal-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.modal-subtitle {
  font-size: 13px;
  opacity: 0.85;
  margin: 4px 0 0;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255,255,255,0.2);
  border: none;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.15s;
}

.modal-close:hover { background: rgba(255,255,255,0.35); }

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-shortcuts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.modal-shortcut-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  gap: 12px;
}

.modal-shortcut-row:nth-child(odd) { background: var(--bg-elevated); }

.modal-shortcut-label {
  font-size: 13px;
  color: var(--text);
}

.modal-shortcut-keys {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
}

.modal-shortcut-keys kbd {
  display: inline-block;
  padding: 2px 7px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.modal-conflicts {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
}

.modal-conflict-header {
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-conflict-header .mdi { font-size: 16px; }

.modal-conflict-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}

.radio-option input[type="radio"] {
  accent-color: var(--blue);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}

.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-panel, .modal-leave-to .modal-panel { transform: scale(0.95); }
</style>
