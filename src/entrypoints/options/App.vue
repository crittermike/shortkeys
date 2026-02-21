<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { v4 as uuid } from 'uuid'
import {
  ACTION_CATEGORIES,
  SCROLL_ACTIONS,
  WEBSITE_OPTIONS,
  isBuiltInAction,
} from '@/utils/actions-registry'
import type { KeySetting } from '@/utils/url-matching'
import SearchSelect from '@/components/SearchSelect.vue'

const activeTab = ref(0)
const keys = ref<KeySetting[]>([])
const bookmarks = ref<string[]>([])
const importJson = ref('')
const expandedRow = ref<number | null>(null)
const snackMessage = ref('')
const snackType = ref<'success' | 'danger'>('success')

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
  })
}

function addShortcut() {
  keys.value.push({ id: uuid() } as KeySetting)
}

async function saveShortcuts() {
  ensureIds()
  keys.value.forEach((key) => {
    key.sites = key.sites || ''
    key.sitesArray = key.sites.split('\n')
  })
  await chrome.storage.local.set({
    keys: JSON.stringify(keys.value),
    random: Math.random(),
  })
  showSnack('Shortcuts saved!')
}

function importKeys() {
  try {
    const parsed = JSON.parse(importJson.value)
    keys.value = keys.value.concat(parsed)
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

onMounted(async () => {
  const saved = await chrome.storage.local.get('keys')
  if (saved.keys) {
    keys.value = JSON.parse(saved.keys)
    ensureIds()
  } else {
    addShortcut()
  }

  chrome.bookmarks.getTree((tree) => {
    const process = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
      for (const node of nodes) {
        if (node.url) bookmarks.value.push(node.title)
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

        <!-- Shortcut rows -->
        <div class="shortcut-list">
          <div v-for="(row, index) in keys" :key="row.id" class="shortcut-card">
            <div class="shortcut-row">
              <div class="field-group shortcut-col">
                <label class="field-label">Shortcut</label>
                <input
                  class="field-input shortcut-input"
                  type="text"
                  placeholder="e.g. ctrl+shift+k"
                  v-model="row.key"
                />
              </div>
              <div class="field-group behavior-col">
                <label class="field-label">Behavior</label>
                <SearchSelect
                  :modelValue="row.action"
                  @update:modelValue="row.action = $event"
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

            <!-- Expanded details -->
            <Transition name="expand">
              <div v-if="expandedRow === index" class="shortcut-details">
                <article v-if="isBuiltInAction(row.action)" class="alert alert-info">
                  <i class="mdi mdi-information-outline"></i>
                  This action is also available via the browser's native
                  <strong>Keyboard Shortcuts</strong> settings (works on new tab page &amp; address bar).
                  <a href="https://github.com/mikecrittenden/shortkeys/wiki/FAQs-and-Troubleshooting#Do_I_use_the_browsers_Keyboard_Shortcuts_settings_or_the_Shortkeys_options_page" target="_blank">Learn more</a>
                </article>

                <div class="details-columns">
                  <div class="details-col">
                    <h4>Settings</h4>

                    <div class="detail-field">
                      <label>Label <span class="hint">(optional, for your reference)</span></label>
                      <input class="field-input" type="text" placeholder="e.g. Open Gmail" v-model="row.label" />
                    </div>

                    <label v-if="isScrollAction(row.action)" class="check-label">
                      <input type="checkbox" v-model="row.smoothScrolling" /> Smooth scrolling
                    </label>

                    <label v-if="row.action === 'gototab' || row.action === 'gototabbytitle'" class="check-label">
                      <input type="checkbox" v-model="row.currentWindow" /> Search current window only
                    </label>

                    <div v-if="isBookmarkAction(row.action)" class="detail-field">
                      <label>Bookmark</label>
                      <select class="field-select" v-model="row.bookmark">
                        <option v-for="bm in bookmarks" :key="bm" :value="bm">{{ bm }}</option>
                      </select>
                    </div>

                    <div v-if="row.action === 'javascript'" class="detail-field">
                      <label>JavaScript code</label>
                      <textarea class="field-textarea mono" v-model="row.code" rows="5"></textarea>
                    </div>

                    <div v-if="row.action === 'gototabbytitle'" class="detail-field">
                      <label>Text to match (wildcards accepted)</label>
                      <input class="field-input" v-model="row.matchtitle" />
                    </div>

                    <div v-if="row.action === 'gototab'" class="detail-field">
                      <label>URL to match (<a target="_blank" href="https://developer.chrome.com/extensions/match_patterns">examples</a>)</label>
                      <input class="field-input" v-model="row.matchurl" />
                    </div>

                    <div v-if="row.action === 'gototab'" class="detail-field">
                      <label>URL to open if no match</label>
                      <input class="field-input" v-model="row.openurl" />
                    </div>

                    <div v-if="row.action === 'gototabbyindex'" class="detail-field">
                      <label>Tab index (starts from 1)</label>
                      <input class="field-input" type="number" v-model="row.matchindex" />
                    </div>

                    <div v-if="row.action === 'buttonnexttab'" class="detail-field">
                      <label>Button CSS selector</label>
                      <input class="field-input" v-model="row.button" placeholder="#troop_confirm_go" />
                    </div>

                    <div v-if="row.action === 'openapp'" class="detail-field">
                      <label>App ID</label>
                      <input class="field-input" v-model="row.openappid" />
                    </div>

                    <div v-if="row.action === 'trigger'" class="detail-field">
                      <label>Shortcut to trigger</label>
                      <input class="field-input" v-model="row.trigger" placeholder="e.g. ctrl+b" />
                    </div>
                  </div>

                  <div class="details-col">
                    <h4>Activation</h4>

                    <label class="check-label">
                      <input type="checkbox" v-model="row.activeInInputs" /> Active while in form inputs
                    </label>

                    <div class="detail-field">
                      <label>Website filter</label>
                      <select class="field-select" v-model="row.blacklist">
                        <option v-for="opt in WEBSITE_OPTIONS" :key="String(opt.value)" :value="opt.value">
                          {{ opt.label }}
                        </option>
                      </select>
                    </div>

                    <div v-if="row.blacklist && row.blacklist !== 'false'" class="detail-field">
                      <label>URL patterns (one per line)</label>
                      <textarea class="field-textarea" v-model="row.sites" rows="4" placeholder="*example.com*"></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
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

/* ── Shortcut cards ── */
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

.shortcut-col { width: 200px; flex: 0 0 200px; }
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
  border-top: 1px solid #f1f5f9;
  padding: 20px;
  background: #fafbfc;
  border-radius: 0 0 10px 10px;
}

.details-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.details-col h4 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
}

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

.check-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569;
  margin-bottom: 10px;
  cursor: pointer;
}

.check-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #4361ee;
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
