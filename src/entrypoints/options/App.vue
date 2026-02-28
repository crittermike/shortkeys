<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ACTION_CATEGORIES } from '@/utils/actions-registry'
import SearchSelect from '@/components/SearchSelect.vue'
import ShortcutRecorder from '@/components/ShortcutRecorder.vue'
import ShortcutDetails from '@/components/ShortcutDetails.vue'
import ImportTab from '@/components/ImportTab.vue'
import PackPreviewModal from '@/components/PackPreviewModal.vue'
import CommunityPackModal from '@/components/CommunityPackModal.vue'
import JsWarningDialog from '@/components/JsWarningDialog.vue'
import ExportTab from '@/components/ExportTab.vue'
import AnalyticsTab from '@/components/AnalyticsTab.vue'
import OnboardingWizard from '@/components/OnboardingWizard.vue'
import { useTheme } from '@/composables/useTheme'
import { useToast } from '@/composables/useToast'
import { useShortcuts } from '@/composables/useShortcuts'
import { useConflicts } from '@/composables/useConflicts'
import { useSearch } from '@/composables/useSearch'
import { useGroups } from '@/composables/useGroups'
import { useMacros } from '@/composables/useMacros'
import { useDragDrop } from '@/composables/useDragDrop'
import { useImportExport } from '@/composables/useImportExport'
import { useJsTools } from '@/composables/useJsTools'
import { useUndoRedo } from '@/composables/useUndoRedo'
import { useViewDensity } from '@/composables/useViewDensity'

// --- Composables ---
const { darkMode, initTheme, toggleTheme } = useTheme()
const { snackMessage, snackType, snackAction, dismissSnack } = useToast()
const {
  keys, expandedRow,
  addShortcut, saveShortcuts, deleteShortcut, toggleDetails,
  onActionChange, toggleEnabled, needsUserScripts, loadSavedKeys,
} = useShortcuts()
const { getConflicts } = useConflicts()
const { searchQuery, filteredIndices, stats } = useSearch()
const {
  collapsedGroups, editingGroupName, newGroupName, groupMenuOpen,
  groupNames, groupedIndices, groupSettings, expandedGroupSiteFilter,
  toggleGroupCollapse, toggleGroupEnabled, isGroupAllEnabled,
  deleteGroup, startRenameGroup, finishRenameGroup,
  addShortcutToGroup, createNewGroup, toggleGroupMenu, closeGroupMenus,
  toggleGroupSiteFilter, hasGroupSiteRules,
  loadGroupSettingsFromStorage, persistGroupSettings,
} = useGroups()
const { convertToMacro } = useMacros()
const { dragIndex, onDragStart, onDragOver, onDragOverGroup, onDragEnd } = useDragDrop()
const { shareGroup, publishToCommunity } = useImportExport()
const { refreshTabs, loadBookmarks } = useJsTools()
const { init: initUndoRedo, undo, redo, canUndo, canRedo } = useUndoRedo()
const { density, initDensity, toggleDensity } = useViewDensity()

// --- Lifecycle ---
initTheme()
initUndoRedo(keys)
initDensity()

const activeTab = ref(0)
const showOnboarding = ref(false)

const handleWizardFinish = async (shortcut: { key: string; action: string }) => {
  addShortcut()
  const newIndex = keys.value.length - 1
  keys.value[newIndex].key = shortcut.key
  keys.value[newIndex].action = shortcut.action
  await saveShortcuts()
}

const completeOnboarding = () => {
  showOnboarding.value = false
  localStorage.setItem('shortkeys-onboarding-done', 'true')
}
function handleKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable
  if (isEditable) return

  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
    e.preventDefault()
    undo()
  } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault()
    redo()
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    e.preventDefault()
    redo()
  }
}

onMounted(async () => {
  await loadSavedKeys()
  await loadGroupSettingsFromStorage()
  refreshTabs()
  document.addEventListener('click', () => { groupMenuOpen.value = null })
  document.addEventListener('keydown', handleKeydown)
  loadBookmarks()
  
  if (localStorage.getItem('shortkeys-onboarding-done') !== 'true') {
    showOnboarding.value = true
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
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
          <div class="header-divider"></div>
          <button class="header-btn" @click="undo" :disabled="!canUndo" title="Undo (Ctrl+Z)" type="button">
            <i class="mdi mdi-undo"></i>
          </button>
          <button class="header-btn" @click="redo" :disabled="!canRedo" title="Redo (Ctrl+Shift+Z)" type="button">
            <i class="mdi mdi-redo"></i>
          </button>
          <button class="theme-toggle" @click="toggleTheme" :title="darkMode ? 'Switch to light mode' : 'Switch to dark mode'" type="button">
            <i :class="darkMode ? 'mdi mdi-white-balance-sunny' : 'mdi mdi-moon-waning-crescent'"></i>
          </button>
        </nav>
      </div>
    </header>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="snackMessage" :class="['toast', snackType === 'danger' ? 'toast-error' : 'toast-success']" @click="dismissSnack">
        {{ snackMessage }}
        <button v-if="snackAction" class="toast-action" @click.stop="snackAction.handler(); dismissSnack()" type="button">
          {{ snackAction.label }}
        </button>
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
        <button :class="['tab-btn', { active: activeTab === 3 }]" @click="activeTab = 3">
          <i class="mdi mdi-chart-line"></i> Analytics
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
        <div v-if="keys.length > 0 && !showOnboarding" class="stats-bar">
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
          <div class="stats-bar-right">
            <button class="density-toggle" @click="toggleDensity" :title="density === 'comfortable' ? 'Switch to condensed view' : 'Switch to comfortable view'" type="button">
              <i :class="density === 'comfortable' ? 'mdi mdi-view-agenda-outline' : 'mdi mdi-view-headline'"></i>
            </button>
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
          </div>

        <!-- Empty state (no shortcuts yet) -->
        <template v-if="keys.length === 0 || showOnboarding">
          <OnboardingWizard
            v-if="showOnboarding"
            @finish="handleWizardFinish"
            @skip="completeOnboarding"
            @done="completeOnboarding"
          />
          <div v-else class="empty-state">
          <div class="empty-state-icon">
            <i class="mdi mdi-keyboard-outline"></i>
          </div>
          <h2 class="empty-state-title">No shortcuts yet</h2>
          <p class="empty-state-desc">
            Create custom keyboard shortcuts for 90+ browser actions — tab management, scrolling, navigation, running JavaScript, and more.
          </p>
          <div class="empty-state-actions">
            <button class="btn btn-primary" @click="addShortcut">
              <i class="mdi mdi-plus"></i> Create your first shortcut
            </button>
            <button class="btn btn-secondary" @click="activeTab = 1">
              <i class="mdi mdi-package-variant"></i> Browse shortcut packs
            </button>
          </div>
          </div>
        </template>

        <!-- Grouped shortcut rows -->
        <div v-if="keys.length > 0 && !showOnboarding" class="shortcut-groups">
          <template v-for="group in groupNames" :key="group">
          <div v-if="groupedIndices.has(group)" class="shortcut-group">
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
              <i v-if="hasGroupSiteRules(group)" class="mdi mdi-earth group-site-indicator" title="Site rules active"></i>
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
                    <button class="group-menu-item" @click="toggleGroupSiteFilter(group)">
                      <i class="mdi mdi-earth"></i> Site rules
                    </button>
                    <button class="group-menu-item" @click="shareGroup(group)">
                      <i class="mdi mdi-share-variant-outline"></i> Share group
                    </button>
                    <button class="group-menu-item" @click="publishToCommunity(group)">
                      <i class="mdi mdi-upload-outline"></i> Publish to community
                    </button>
                    <button class="group-menu-item group-menu-danger" @click="deleteGroup(group)">
                      <i class="mdi mdi-delete-outline"></i> Delete group
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Group site rules panel -->
            <Transition name="expand">
              <div v-if="expandedGroupSiteFilter === group" class="group-site-panel">
                <div class="group-site-fields">
                  <div class="group-site-field">
                    <label class="group-site-label"><i class="mdi mdi-earth-plus"></i> Only activate on</label>
                    <textarea
                      class="field-textarea mono group-site-textarea"
                      v-model="groupSettings[group].activateOn"
                      @blur="persistGroupSettings()"
                      rows="2"
                      placeholder="e.g. gmail.com&#10;*github.com/myorg*"
                    ></textarea>
                  </div>
                  <div class="group-site-field">
                    <label class="group-site-label"><i class="mdi mdi-earth-minus"></i> Deactivate on</label>
                    <textarea
                      class="field-textarea mono group-site-textarea"
                      v-model="groupSettings[group].deactivateOn"
                      @blur="persistGroupSettings()"
                      rows="2"
                      placeholder="e.g. mail.google.com/settings*"
                    ></textarea>
                  </div>
                </div>
                <p class="group-site-hint">
                  Applies to all shortcuts in this group. Individual shortcuts can still override with their own site filter.
                  Simple domains like <code>gmail.com</code> work automatically, or use <code>*</code> as a wildcard.
                  If both fields are set, the URL must match "activate" and not match "deactivate".
                </p>
              </div>
            </Transition>

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
                    <div class="field-label-row">
                      <label class="field-label">Behavior</label>
                      <button
                        v-if="keys[index].action && keys[index].action !== 'macro'"
                        class="btn-chain-link"
                        @click="convertToMacro(keys[index], index)"
                        type="button"
                      >
                        <i class="mdi mdi-link-variant"></i> Chain multiple actions
                      </button>
                    </div>
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
              <ShortcutDetails v-if="expandedRow === index" :index="index" />
            </Transition>
          </div>
            </div>
            <!-- Add shortcut to this group -->
            <button class="btn-add-to-group" @click="addShortcutToGroup(group)" type="button" v-show="!collapsedGroups.has(group)">
              <i class="mdi mdi-plus"></i> Add shortcut
            </button>
          </div>
          </template>
        </div>

        <div v-if="keys.length > 0 && !showOnboarding" class="action-bar">
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
        <ImportTab />
      </div>

      <!-- Pack Preview Modal -->
      <PackPreviewModal />
      <CommunityPackModal />
      <JsWarningDialog />

      <!-- Export Tab -->
      <div v-show="activeTab === 2" class="tab-content">
        <ExportTab />
      </div>

      <!-- Analytics Tab -->
      <div v-show="activeTab === 3" class="tab-content">
        <AnalyticsTab />
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

.header-btn {
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
.header-btn:hover:not(:disabled) { background: var(--bg-hover); color: var(--text); }
.header-btn:disabled { opacity: 0.3; cursor: default; }

.header-divider {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 0 4px;
}

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

.stats-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
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
  gap: 16px;
}

.shortcut-group {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 1px 3px var(--shadow);
}

.shortcut-group[style*="display: none"] + .shortcut-group { margin-top: 0; }

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-light);
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
  gap: 0;
  padding: 8px;
}

.shortcut-card {
  background: var(--bg-elevated);
  border-radius: 8px;
  box-shadow: none;
  border: none;
  transition: background 0.15s;
  margin-bottom: 6px;
}

.shortcut-card:last-child { margin-bottom: 0; }
.shortcut-card:hover { background: var(--bg-hover); }
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
  gap: 8px;
  padding: 14px 16px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.shortcut-col { width: 320px; flex: 0 0 320px; }
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
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  align-self: flex-end;
}

.btn-icon {
  padding: 8px;
  box-sizing: border-box;
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
  flex-shrink: 0;
}

.btn-icon:hover { background: var(--bg-hover); color: var(--text); }
.btn-delete:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }
.shortcut-header .toggle { flex-shrink: 0; }


/* ── Details panel ── */
.shortcut-details {
  border-top: 1px solid var(--border-light);
  padding: 12px 20px;
  background: linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-card) 100%);
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
}

.details-section:empty { display: none; }

.detail-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.detail-row > .toggle-row-inline {
  margin-bottom: 1px;
}

.flex-1 { flex: 1; min-width: 0; }

/* Activation bar: toggle + filter side by side */
.activation-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
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
  margin-bottom: 0;
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

/* ── Macro builder ── */
.macro-builder {
  width: 100%;
}

.macro-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.macro-label i {
  margin-right: 4px;
}

.macro-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.macro-step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
}

.macro-step-num {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  min-width: 18px;
  text-align: center;
}

.macro-step-action {
  flex: 1;
  min-width: 0;
}

.macro-step-delay {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.delay-input {
  width: 70px !important;
  text-align: right;
  padding: 4px 6px !important;
  font-size: 12px !important;
}

.delay-unit {
  font-size: 11px;
  color: var(--text-muted);
}

.macro-step-controls {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.macro-step-controls .btn-icon {
  width: 26px !important;
  height: 26px !important;
  font-size: 14px !important;
}

.btn-add-step {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--blue, #4361ee);
  background: transparent;
  border: 1px dashed var(--blue, #4361ee);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-add-step:hover {
  background: var(--bg-hover, rgba(67, 97, 238, 0.06));
}

.macro-empty {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  padding: 8px 0;
}

.field-label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.btn-chain-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  font-size: 11px;
  font-weight: 500;
  color: var(--blue, #4361ee);
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.btn-chain-link:hover {
  opacity: 1;
}

.btn-chain-link i {
  font-size: 12px;
}

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
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toast-success { background: #059669; color: #fff; }
.toast-error { background: #ef4444; color: #fff; }

.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(16px); }
.toast-action {
  margin-left: 4px;
  padding: 4px 12px;
  background: rgba(255,255,255,0.2);
  color: inherit;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
}
.toast-action:hover { background: rgba(255,255,255,0.3); }

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

/* ── Import Tab ── */
.import-tab-container {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.import-section .section-header {
  margin-bottom: 16px;
}

.import-divider {
  height: 1px;
  background: var(--border-light);
  margin: 0;
}

/* ── Pack grid ── */
.pack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.pack-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-top: 4px solid var(--pack-color, #4361ee);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}

.pack-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, var(--pack-color) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 0;
}

.pack-card:hover { 
  box-shadow: 0 8px 24px var(--shadow-hover); 
  transform: translateY(-2px);
  border-color: var(--border-light);
}

.pack-card:hover::before {
  opacity: 0.04;
}

.pack-header {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.pack-icon { 
  font-size: 32px; 
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
  transition: transform 0.2s ease;
}

.pack-card:hover .pack-icon {
  transform: scale(1.1) rotate(-5deg);
}

.pack-info { 
  flex: 1; 
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pack-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}

.pack-meta {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pack-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  flex: 1;
  position: relative;
  z-index: 1;
}

.pack-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  position: relative;
  z-index: 1;
}

.pack-actions .btn {
  flex: 1;
  justify-content: center;
}

.btn-sm { padding: 6px 14px; font-size: 12px; }

/* ── JSON Import ── */
.json-import-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px var(--shadow);
}

.json-textarea {
  min-height: 160px;
  font-size: 13px;
  line-height: 1.5;
}

.json-action-bar {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-light);
}

.json-hint {
  font-size: 13px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.json-hint .mdi {
  font-size: 16px;
  color: var(--text-secondary);
}

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

/* ── Group site rules ── */
.group-site-indicator {
  font-size: 14px;
  color: var(--blue);
  opacity: 0.7;
}

.group-site-panel {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-elevated);
}

.group-site-fields {
  display: flex;
  gap: 12px;
}

.group-site-field {
  flex: 1;
  min-width: 0;
}

.group-site-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.group-site-label .mdi {
  font-size: 13px;
  margin-right: 3px;
}

.group-site-textarea {
  font-size: 12px !important;
  padding: 6px 10px !important;
  resize: vertical;
}

.group-site-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin: 8px 0 0;
}

.group-site-hint code {
  background: var(--bg-hover);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-state-icon {
  font-size: 56px;
  color: var(--text-muted);
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px;
}

.empty-state-desc {
  font-size: 14px;
  color: var(--text-secondary);
  max-width: 440px;
  line-height: 1.5;
  margin: 0 0 24px;
}

.empty-state-actions {
  display: flex;
  gap: 12px;
}

.empty-state-actions .btn {
  font-size: 14px;
  padding: 10px 20px;
}

/* ── Density toggle ── */
.density-toggle {
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
  flex-shrink: 0;
  }
.density-toggle:hover { background: var(--bg-hover); color: var(--text); }

/* ── Condensed view ── */
[data-density="condensed"] .shortcut-header {
  padding: 2px 10px 0 6px;
  gap: 2px;
}

[data-density="condensed"] .shortcut-label-title {
  font-size: 11px;
  padding: 1px 4px;
}

[data-density="condensed"] .shortcut-row {
  padding: 4px 10px 6px;
  gap: 8px;
}

[data-density="condensed"] .shortcut-card {
  margin-bottom: 1px;
  border-radius: 4px;
}

[data-density="condensed"] .shortcut-list {
  padding: 2px;
  gap: 0;
}

[data-density="condensed"] .field-label {
  display: none;
}

[data-density="condensed"] .field-label-row {
  display: none;
}

[data-density="condensed"] .shortcut-col {
  width: 240px;
  flex: 0 0 240px;
}

[data-density="condensed"] .toggle.toggle-sm {
  width: 26px;
  height: 14px;
  border-radius: 7px;
}
[data-density="condensed"] .toggle.toggle-sm .toggle-knob {
  width: 10px;
  height: 10px;
}
[data-density="condensed"] .toggle.toggle-sm.on .toggle-knob {
  transform: translateX(12px);
}

[data-density="condensed"] .drag-handle {
  font-size: 14px;
  padding: 0;
}

[data-density="condensed"] .conflict-warnings {
  padding: 0 10px 4px;
}

[data-density="condensed"] .group-header {
  padding: 5px 10px;
}

[data-density="condensed"] .btn-add-to-group {
  padding: 3px 6px;
  font-size: 11px;
}

[data-density="condensed"] .shortcut-actions .btn-icon {
  font-size: 14px;
  padding: 9px;
}
</style>
