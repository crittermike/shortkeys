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

const activeTab = ref(0)
const keys = ref<KeySetting[]>([])
const bookmarks = ref<{ title: string; url: string }[]>([])
const importJson = ref('')
const expandedRow = ref<number | null>(null)
const snackMessage = ref('')
const snackType = ref<'success' | 'danger'>('success')
const searchQuery = ref('')
const dragIndex = ref<number | null>(null)

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
  keys.value.splice(index, 0, item)
  dragIndex.value = index
}

function onDragEnd() {
  dragIndex.value = null
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

onMounted(async () => {
  const saved = await loadKeys()
  if (saved) {
    keys.value = JSON.parse(saved)
    ensureIds()
  } else {
    addShortcut()
  }

  refreshTabs()

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
            <div class="group-header">
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
                <button class="btn-icon btn-icon-sm" @click="startRenameGroup(group)" title="Rename group" type="button">
                  <i class="mdi mdi-pencil-outline"></i>
                </button>
                <button
                  :class="['toggle toggle-sm', { on: isGroupAllEnabled(group) }]"
                  @click="toggleGroupEnabled(group)"
                  type="button"
                  :title="isGroupAllEnabled(group) ? 'Disable all in group' : 'Enable all in group'"
                >
                  <span class="toggle-knob"></span>
                </button>
                <button class="btn-icon btn-icon-sm btn-delete" @click="deleteGroup(group)" title="Delete group" type="button" v-if="group !== DEFAULT_GROUP || groupNames.length > 1">
                  <i class="mdi mdi-delete-outline"></i>
                </button>
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
          <button class="btn btn-secondary" @click="addShortcut">
            <i class="mdi mdi-plus"></i> Add shortcut
          </button>
          <button class="btn btn-primary" @click="saveShortcuts">
            <i class="mdi mdi-content-save"></i> Save shortcuts
          </button>
        </div>
      </div>

      <!-- Import Tab -->
      <div v-show="activeTab === 1" class="tab-content">
        <p class="tab-desc">Paste a JSON array of shortcut objects to import them.</p>
        <textarea class="field-textarea mono" v-model="importJson" rows="12" placeholder='[{"key":"ctrl+b","action":"newtab"}]'></textarea>
        <div class="action-bar">
          <span></span>
          <button class="btn btn-primary" @click="importKeys">
            <i class="mdi mdi-import"></i> Import
          </button>
        </div>
      </div>

      <!-- Export Tab -->
      <div v-show="activeTab === 2" class="tab-content">
        <div class="export-header">
          <p class="tab-desc">Copy the JSON below to back up or share your shortcuts.</p>
          <button class="btn btn-secondary" @click="copyExport">
            <i class="mdi mdi-content-copy"></i> Copy to clipboard
          </button>
        </div>
        <pre class="export-pre">{{ JSON.stringify(keys, null, 2) }}</pre>
      </div>
    </main>
  </div>
</template>

<style>
/* ── Reset & base ── */
*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: #f5f7fa;
  color: #1a1a2e;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

a { color: #4361ee; text-decoration: none; }
a:hover { text-decoration: underline; }

/* ── Layout ── */
.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
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
  color: #1a1a2e;
  letter-spacing: -0.3px;
}

.header-links {
  display: flex;
  gap: 20px;
}

.header-links a {
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  transition: color 0.15s;
}

.header-links a:hover { color: #4361ee; text-decoration: none; }

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
  background: #fff;
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.tab-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab-btn:hover { color: #1a1a2e; background: #f1f5f9; }
.tab-btn.active { background: #4361ee; color: #fff; box-shadow: 0 2px 8px rgba(67,97,238,0.3); }
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
  background: #eef2f6;
  color: #475569;
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
  color: #94a3b8;
  font-size: 16px;
}

.search-input {
  width: 100%;
  padding: 7px 32px 7px 32px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  color: #1a1a2e;
  background: #fff;
  transition: border-color 0.15s;
}

.search-input:focus { outline: none; border-color: #4361ee; }
.search-input::placeholder { color: #cbd5e1; }

.search-clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #94a3b8;
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
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 10px 10px 0 0;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  position: sticky;
  top: 56px;
  z-index: 5;
}

.shortcut-group:first-child .group-header,
.shortcut-group .group-header { border-radius: 10px; }
.shortcut-group .shortcut-list:not([style*="none"]) ~ .btn-add-to-group,
.shortcut-group .shortcut-list { border-top: 1px solid #eef2f6; }
.shortcut-group:has(.shortcut-list:not([style*="display: none"])) .group-header { border-radius: 10px 10px 0 0; }

.group-collapse {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: #94a3b8;
  font-size: 18px;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

.group-collapse:hover { color: #475569; }

.group-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  cursor: default;
  user-select: none;
}

.group-name-input {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  border: 1px solid #4361ee;
  border-radius: 4px;
  padding: 2px 6px;
  outline: none;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(67,97,238,0.12);
}

.group-count {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  background: #f1f5f9;
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

.btn-add-to-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  background: #f8fafc;
  border: 1px dashed #e2e8f0;
  border-top: none;
  border-radius: 0 0 10px 10px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-add-to-group:hover { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
.btn-add-to-group .mdi { font-size: 14px; }
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: box-shadow 0.15s;
}

.shortcut-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.shortcut-card.disabled { opacity: 0.5; }
.shortcut-card.dragging { opacity: 0.4; box-shadow: 0 4px 16px rgba(67,97,238,0.2); }

.shortcut-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px 0 8px;
}

.drag-handle {
  color: #cbd5e1;
  font-size: 18px;
  cursor: grab;
  padding: 2px;
  flex-shrink: 0;
  transition: color 0.15s;
}

.drag-handle:hover { color: #94a3b8; }
.shortcut-card.dragging .drag-handle { cursor: grabbing; }

.shortcut-label-title {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  outline: none;
  padding: 2px 4px;
}

.shortcut-label-title::placeholder { color: #cbd5e1; }
.shortcut-label-title:focus { color: #1a1a2e; }

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
  color: #94a3b8;
}

.field-input, .field-select, .field-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  color: #1a1a2e;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.field-input:focus, .field-select:focus, .field-textarea:focus {
  outline: none;
  border-color: #4361ee;
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
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 16px;
}

.btn-icon:hover { background: #f1f5f9; color: #1a1a2e; }
.btn-delete:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }

/* ── Details panel ── */
.shortcut-details {
  border-top: 1px solid #eef2f6;
  padding: 20px;
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
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
  border-top: 1px solid #eef2f6;
}

.site-filter-inline { flex: 1; }
.site-patterns { margin-top: 8px; }

.toggle-row-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}

.toggle-label-sm { font-size: 13px; font-weight: 500; color: #475569; }

.detail-field {
  margin-bottom: 12px;
}

.detail-field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 4px;
}

.hint { font-weight: 400; color: #94a3b8; }
.hint-link { font-weight: 400; color: #4361ee; font-size: 12px; }

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

.toggle.on { background: #4361ee; }

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
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
  background: #f1f5f9;
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
  color: #64748b;
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

.seg-btn:hover { color: #1a1a2e; }
.seg-btn.active { background: #fff; color: #4361ee; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-weight: 600; }
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
  color: #94a3b8;
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
  color: #64748b;
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

.tab-picker .mdi { color: #94a3b8; font-size: 14px; flex-shrink: 0; }

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

.btn-primary { background: #4361ee; color: #fff; }
.btn-primary:hover { background: #3730a3; }

.btn-secondary { background: #fff; color: #475569; border: 1px solid #e2e8f0; }
.btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; }

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

.export-pre {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
  overflow: auto;
  max-height: 500px;
  color: #334155;
}

.tab-desc {
  color: #64748b;
  margin-bottom: 12px;
}
</style>
