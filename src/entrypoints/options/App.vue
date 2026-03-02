<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ACTION_CATEGORIES, getActionOptionsForSelect } from '@/utils/actions-registry'
import SearchSelect from '@/components/SearchSelect.vue'
import ShortcutRecorder from '@/components/ShortcutRecorder.vue'
import ShortcutDetails from '@/components/ShortcutDetails.vue'
import ImportTab from '@/components/ImportTab.vue'
import PacksTab from '@/components/PacksTab.vue'
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
import { usePacks } from '@/composables/usePacks'

// --- Composables ---
const { darkMode, initTheme, toggleTheme } = useTheme()
const { snackMessage, snackType, snackAction, dismissSnack } = useToast()
const {
  keys, expandedRow, dirty,
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
const { previewPack } = usePacks()

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

const handlePackInstall = (pack: import('@/packs').ShortcutPack) => {
  previewPack.value = pack
  completeOnboarding()
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
function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value) {
    e.preventDefault()
  }
}

onMounted(async () => {
  await loadSavedKeys()
  await loadGroupSettingsFromStorage()
  refreshTabs()
  document.addEventListener('click', () => { groupMenuOpen.value = null })
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('beforeunload', handleBeforeUnload)
  loadBookmarks()
  
  if (localStorage.getItem('shortkeys-onboarding-done') !== 'true') {
    showOnboarding.value = true
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('beforeunload', handleBeforeUnload)
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
          <a href="https://www.shortkeys.app/docs/" target="_blank">Docs</a>
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
          <i class="mdi mdi-package-variant"></i> Packs
        </button>
        <button :class="['tab-btn', { active: activeTab === 2 }]" @click="activeTab = 2">
          <i class="mdi mdi-import"></i> Import
        </button>
        <button :class="['tab-btn', { active: activeTab === 3 }]" @click="activeTab = 3">
          <i class="mdi mdi-export"></i> Export
        </button>
        <button :class="['tab-btn', { active: activeTab === 4 }]" @click="activeTab = 4">
          <i class="mdi mdi-chart-line"></i> Analytics
        </button>
      </div>

      <!-- Shortcuts Tab -->
      <div v-show="activeTab === 0" class="tab-content">
        <article v-if="needsUserScripts()" class="alert alert-warning">
          <i class="mdi mdi-alert-circle-outline"></i>
          <div>
            <strong>Allow User Scripts</strong> — In order for JavaScript actions to work, you must first allow User Scripts in your browser extension details page. Then come back and save your shortcuts.
          </div>
        </article>

        <!-- Stats bar -->
        <div v-if="keys.length > 0 && !showOnboarding" class="stats-bar">
          <div class="stats-bar-left">
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
            <div class="stats-actions">
              <button class="btn btn-secondary btn-sm" @click="addShortcut">
                <i class="mdi mdi-plus"></i> Add shortcut
              </button>
              <button class="btn btn-secondary btn-sm" @click="createNewGroup">
                <i class="mdi mdi-folder-plus-outline"></i> New group
              </button>
            </div>
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
            @installPack="handlePackInstall"
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
                :class="['shortcut-card', { disabled: keys[index].enabled === false, dragging: dragIndex === index, expanded: expandedRow === index }]"
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
                      :options="getActionOptionsForSelect()"
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
          <button class="btn btn-primary" @click="saveShortcuts">
            <i class="mdi mdi-content-save"></i> Save shortcuts
          </button>
        </div>
      </div>

      <!-- Packs Tab -->
      <div v-show="activeTab === 1" class="tab-content">
        <PacksTab />
      </div>

      <!-- Import Tab -->
      <div v-show="activeTab === 2" class="tab-content">
        <ImportTab />
      </div>

      <!-- Pack Preview Modal -->
      <PackPreviewModal />
      <CommunityPackModal />
      <JsWarningDialog />

      <!-- Export Tab -->
      <div v-show="activeTab === 3" class="tab-content">
        <ExportTab />
      </div>

      <!-- Analytics Tab -->
      <div v-show="activeTab === 4" class="tab-content">
        <AnalyticsTab />
      </div>
    </main>

  </div>
</template>

<style>
/* ── Reset & base ── */
*, *::before, *::after { box-sizing: border-box; }

:root {
  /* Surface colors — warm neutral palette */
  --bg: #f8f9fb;
  --bg-card: #ffffff;
  --bg-elevated: #f3f4f8;
  --bg-input: #ffffff;
  --bg-hover: #eef0f5;
  
  /* Text — stronger hierarchy */
  --text: #111827;
  --text-secondary: #4b5563;
  --text-muted: #9ca3af;
  --text-placeholder: #d1d5db;
  
  /* Borders — softer */
  --border: #e5e7eb;
  --border-light: #f0f1f4;
  
  /* Accent — deeper indigo instead of generic blue */
  --blue: #4f46e5;
  --blue-hover: #4338ca;
  --blue-bg: rgba(79,70,229,0.1);
  
  /* Surface shadows — base values used in composed shadows */
  --shadow: rgba(0,0,0,0.04);
  --shadow-hover: rgba(0,0,0,0.08);

  /* Semantic colors */
  --danger: #ef4444;
  --danger-hover: #dc2626;
  --danger-bg: #fef2f2;
  --danger-border: #fecaca;
  --danger-text: #991b1b;
  --success: #059669;
  --success-hover: #047857;
  --success-bg: #ecfdf5;
  --success-border: #a7f3d0;
  --success-text: #065f46;
  --warning-bg: #fffbeb;
  --warning-border: #fde68a;
  --warning-text: #92400e;
  --info-bg: #eef2ff;
  --info-border: #c7d2fe;
  --info-text: #3730a3;

  /* Spacing scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;
  --space-3xl: 48px;

  /* Radius scale — slightly larger for modern feel */
  --radius-sm: 5px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 14px;
  --radius-2xl: 18px;
  --radius-full: 9999px;

  /* Shadow scale — layered, premium */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06);
  --shadow-lg: 0 4px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.08);
  --shadow-xl: 0 8px 16px rgba(0,0,0,0.06), 0 24px 56px rgba(0,0,0,0.12);

  /* Focus ring */
  --focus-ring: 0 0 0 3px rgba(79,70,229,0.15);
}

[data-theme="dark"] {
  --bg: #0c0f1a;
  --bg-card: #161b2e;
  --bg-elevated: #1c2237;
  --bg-input: #0c0f1a;
  --bg-hover: #242b42;
  --text: #e8eaf0;
  --text-secondary: #8b92a8;
  --text-muted: #565e78;
  --text-placeholder: #3d4560;
  --border: #2a3150;
  --border-light: #1e2440;
  --blue: #6366f1;
  --blue-hover: #818cf8;
  --blue-bg: rgba(99,102,241,0.15);
  --shadow: rgba(0,0,0,0.25);
  --shadow-hover: rgba(0,0,0,0.35);

  /* Semantic colors — dark */
  --danger: #f87171;
  --danger-hover: #ef4444;
  --danger-bg: rgba(239,68,68,0.12);
  --danger-border: rgba(239,68,68,0.25);
  --danger-text: #fca5a5;
  --success: #34d399;
  --success-hover: #10b981;
  --success-bg: rgba(52,211,153,0.12);
  --success-border: rgba(52,211,153,0.25);
  --success-text: #6ee7b7;
  --warning-bg: rgba(245,158,11,0.08);
  --warning-border: rgba(245,158,11,0.15);
  --warning-text: #f59e0b;
  --info-bg: rgba(99,102,241,0.12);
  --info-border: rgba(99,102,241,0.25);
  --info-text: #a5b4fc;

  /* Shadow scale — dark */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15);
  --shadow-md: 0 2px 4px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.2);
  --shadow-lg: 0 4px 8px rgba(0,0,0,0.2), 0 12px 32px rgba(0,0,0,0.25);
  --shadow-xl: 0 8px 16px rgba(0,0,0,0.25), 0 24px 56px rgba(0,0,0,0.35);

  /* Focus ring — dark */
  --focus-ring: 0 0 0 3px rgba(99,102,241,0.25);
}

[data-theme="dark"] .app-header {
  background: rgba(12,15,26,0.88);
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  background-image: radial-gradient(circle at 50% 0%, var(--bg-card) 0%, transparent 60%);
  background-attachment: fixed;
  color: var(--text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
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
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid var(--border-light);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 var(--space-xl);
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
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.4px;
}

.header-links {
  display: flex;
  gap: 16px;
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
  border-radius: var(--radius-lg);
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
  border-radius: var(--radius-lg);
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
  max-width: 1120px;
  width: 100%;
  margin: 0 auto;
  padding: var(--space-xl);
  flex: 1;
}

/* ── Tabs ── */
.tab-bar {
  display: inline-flex;
  gap: 2px;
  margin-bottom: var(--space-xl);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  padding: 3px;
  border: 1px solid var(--border-light);
}

.tab-btn {
  padding: 8px 18px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.tab-btn:hover { color: var(--text); background: var(--bg-hover); }
.tab-btn.active { 
  background: var(--bg-card); 
  color: var(--text); 
  box-shadow: var(--shadow-sm);
  font-weight: 600; 
}
.tab-btn .mdi { font-size: 16px; }

.tab-content { animation: fadeIn 0.15s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ── Stats bar ── */
.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
  gap: var(--space-md);
  flex-wrap: wrap;
}

.stats-bar-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.stats-chips {
  display: flex;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.stats-actions {
  display: flex;
  gap: 6px;
}

.stats-bar-right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
}

.stat-chip .mdi { font-size: 14px; }
.stat-disabled { background: var(--warning-bg); color: var(--warning-text); }
.stat-warn { background: var(--danger-bg); color: var(--danger-text); }

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
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text);
  background: var(--bg-card);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input:focus { outline: none; border-color: var(--blue); box-shadow: var(--focus-ring); }
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
  gap: var(--space-lg);
}

.shortcut-group {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s ease;
  overflow: visible;
}

.shortcut-group[style*="display: none"] + .shortcut-group { margin-top: 0; }

.group-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 12px 16px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-light);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
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
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  cursor: default;
  user-select: none;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 11px;
}

.group-name-input {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  border: 1px solid var(--blue);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  outline: none;
  background: var(--bg-card);
  box-shadow: var(--focus-ring);
}

.group-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-hover);
  padding: 1px 7px;
  border-radius: var(--radius-full);
  line-height: 1.5;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
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
  margin-top: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  min-width: 220px;
  z-index: 20;
  overflow: hidden;
  padding: 6px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.group-menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.group-menu-item:hover { 
  background: var(--bg-hover); 
  transform: translateX(2px);
}
.group-menu-item .mdi { font-size: 16px; color: var(--text-secondary); }
.group-menu-danger { color: var(--danger); }
.group-menu-danger .mdi { color: var(--danger); }
.group-menu-danger:hover { background: var(--danger-bg); }

.btn-add-to-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: 8px;
  background: transparent;
  border: none;
  border-top: 1px dashed var(--border-light);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-add-to-group:hover { background: var(--bg-elevated); color: var(--text-secondary); }
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px;
  background: var(--border-light);
}

.shortcut-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: none;
  border: none;
  transition: all 0.15s ease;
  margin-bottom: 0;
  position: relative;
}

.shortcut-card:last-child { margin-bottom: 0; }
.shortcut-card:hover { background: var(--bg-elevated); }
.shortcut-card.disabled { opacity: 0.45; }
.shortcut-card.dragging { opacity: 0.4; box-shadow: var(--shadow-lg); outline: 2px solid var(--blue); outline-offset: -2px; }
.shortcut-card.expanded {
  border-left: 3px solid var(--blue);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  margin: 4px 0;
  background: var(--bg-card);
}
.shortcut-card.expanded:hover { background: var(--bg-card); }

.shortcut-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 6px 12px 0 6px;
}

.drag-handle {
  color: var(--text-placeholder);
  font-size: 16px;
  cursor: grab;
  padding: 2px;
  flex-shrink: 0;
  transition: color 0.15s;
  opacity: 0;
}

.shortcut-card:hover .drag-handle { opacity: 0.5; }
.drag-handle:hover { color: var(--text-muted); opacity: 1 !important; }
.shortcut-card.dragging .drag-handle { cursor: grabbing; opacity: 1 !important; }

.shortcut-label-title {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  outline: none;
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  transition: all 0.15s;
}

.shortcut-label-title::placeholder { color: var(--text-placeholder); }
.shortcut-label-title:focus { color: var(--text); background: var(--bg-input); box-shadow: var(--focus-ring); }

.shortcut-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  padding: 6px 12px 10px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.shortcut-col { width: 320px; flex: 0 0 320px; }
.behavior-col { flex: 1; min-width: 0; }

.field-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-placeholder);
}

.field-input, .field-select, .field-textarea {
  width: 100%;
  padding: 7px 11px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text);
  background: var(--bg-input);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.field-input:focus, .field-select:focus, .field-textarea:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: var(--focus-ring);
}

.field-textarea { resize: vertical; }
.mono { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 13px; }

.shortcut-input { font-family: 'SF Mono', Menlo, Consolas, monospace; font-weight: 500; }

.shortcut-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
  align-self: flex-end;
}

.btn-icon {
  padding: 6px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 16px;
  flex-shrink: 0;
}

.btn-icon:hover { background: var(--bg-hover); color: var(--text-secondary); border-color: var(--border); }
.btn-delete:hover { background: var(--danger-bg); color: var(--danger); border-color: var(--danger-border); }
.shortcut-header .toggle { flex-shrink: 0; }


/* ── Details panel ── */
.shortcut-details {
  border-top: 1px solid var(--border-light);
  padding: 12px 16px;
  background: var(--bg-elevated);
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
  gap: var(--space-xs);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
}

.conflict-pill .mdi { font-size: 14px; }

.conflict-pill.browser {
  background: var(--warning-bg);
  color: var(--warning-text);
  border: 1px solid var(--warning-border);
}

.conflict-pill.duplicate {
  background: var(--danger-bg);
  color: var(--danger-text);
  border: 1px solid var(--danger-border);
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.details-section:empty { display: none; }

.detail-row {
  display: flex;
  gap: var(--space-md);
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
  gap: var(--space-md);
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
  border-radius: var(--radius-lg);
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
  gap: var(--space-sm);
  padding: 6px 8px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: var(--radius-lg);
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
  padding: 7px 8px !important;
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
  gap: var(--space-xs);
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--blue, #4361ee);
  background: transparent;
  border: 1px dashed var(--blue, #4361ee);
  border-radius: var(--radius-lg);
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
  gap: var(--space-sm);
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
  border-radius: var(--radius-full);
  border: none;
  background: var(--border);
  cursor: pointer;
  transition: background 0.25s cubic-bezier(0.16, 1, 0.3, 1);
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
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.06);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.toggle.on .toggle-knob { transform: translateX(20px); }

/* Small toggle variant (enable/disable) */
.toggle.toggle-sm { width: 36px; height: 20px; border-radius: var(--radius-full); }
.toggle.toggle-sm .toggle-knob { width: 16px; height: 16px; top: 2px; left: 2px; }
.toggle.toggle-sm.on .toggle-knob { transform: translateX(16px); }

/* ── Segmented control ── */
.segmented {
  display: flex;
  background: var(--bg-hover);
  border-radius: var(--radius-lg);
  padding: 3px;
  gap: 2px;
  border: 1px solid var(--border-light);
}

.seg-btn {
  flex: 1;
  padding: 7px 8px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  white-space: nowrap;
}

.seg-btn:hover { color: var(--text); }
.seg-btn.active { background: var(--bg-card); color: var(--blue); box-shadow: var(--shadow-sm); font-weight: 600; }
.seg-btn .mdi { font-size: 14px; }

/* ── Code editor ── */
.code-editor-wrap {
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
  margin-bottom: 4px;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px 6px 14px;
  background: #282c34;
  gap: var(--space-sm);
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
  gap: var(--space-xs);
  background: #334155;
  border-radius: var(--radius-md);
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
  border-radius: var(--radius-md);
  background: var(--success);
  color: #fff;
  border: none;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  transition: background 0.15s;
  height: 30px;
  white-space: nowrap;
}

.btn-run:hover { background: var(--success-hover); }
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
  border-radius: var(--radius-md);
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
  gap: var(--space-xs);
  padding: 7px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-fetch:hover { background: var(--bg-hover); color: var(--text); }
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
  padding: 14px 18px;
  border-radius: var(--radius-xl);
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 20px;
  line-height: 1.6;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-sm);
}

.alert-warning { background: var(--warning-bg); border: none; border-left: 3px solid var(--warning-text); color: var(--warning-text); }
.alert-info { background: var(--info-bg); border: none; border-left: 3px solid var(--info-text); color: var(--info-text); }
.alert-info .mdi, .alert-warning .mdi {
  margin-right: 0;
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 1px;
}

/* ── Buttons ── */
.action-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: var(--space-3xl);
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  position: sticky;
  bottom: 24px;
  z-index: 50;
  pointer-events: none;
}
.action-bar .btn {
  pointer-events: auto;
  padding: 12px 28px;
  font-size: 14px;
  border-radius: var(--radius-full);
  box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1);
}

.btn {
  padding: 9px 18px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  letter-spacing: 0.01em;
}

.btn-primary { background: var(--blue); color: #fff; box-shadow: 0 1px 3px var(--blue-bg); }
.btn-primary:hover { background: var(--blue-hover); box-shadow: 0 4px 14px var(--blue-bg); transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); box-shadow: 0 1px 2px var(--blue-bg); }

.btn-secondary { background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border); }
.btn-secondary:hover { background: var(--bg-hover); border-color: var(--border); color: var(--text); }

.btn-sm { padding: 5px 12px; font-size: 12px; border-radius: var(--radius-md); }

/* ── Toast ── */
.toast {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 999;
  padding: 16px 24px;
  border-radius: var(--radius-full);
  font-size: 15px;
  font-weight: 600;
  box-shadow: var(--shadow-xl), 0 0 0 1px rgba(255,255,255,0.1) inset;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  cursor: pointer;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  letter-spacing: 0.01em;
}

.toast-success { background: var(--success); color: #fff; }
.toast-error { background: var(--danger); color: #fff; }

.toast-enter-active, .toast-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(32px) scale(0.9); }
.toast-action {
  margin-left: 12px;
  padding: 6px 16px;
  background: rgba(255,255,255,0.2);
  color: inherit;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: var(--radius-full);
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-action:hover { 
  background: rgba(255,255,255,0.35); 
  transform: scale(1.05);
}

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

.export-actions { display: flex; gap: var(--space-sm); }

.share-link-box {
  margin-bottom: 12px;
  padding: 12px 16px;
  background: var(--info-bg);
  border: 1px solid var(--info-border);
  border-radius: var(--radius-lg);
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
  border-radius: var(--radius-lg);
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-lg);
}

.pack-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}

.pack-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--pack-color, var(--blue));
  opacity: 0;
  transition: opacity 0.25s ease;
}

.pack-card:hover { 
  box-shadow: var(--shadow-md); 
  transform: translateY(-3px);
  border-color: var(--border);
}

.pack-card:hover::before {
  opacity: 1;
}

.pack-header {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
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
  gap: var(--space-sm);
  margin-top: auto;
  position: relative;
  z-index: 1;
}

.pack-actions .btn {
  flex: 1;
  justify-content: center;
}

/* .btn-sm duplicate removed */

/* ── JSON Import ── */
.json-import-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
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
  background: rgba(0,0,0,0.3);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-panel {
  background: var(--bg-card);
  border-radius: 24px;
  width: 100%;
  max-width: 580px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-xl), 0 20px 40px rgba(0,0,0,0.2);
  border: 1px solid var(--border-light);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 32px;
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
  padding: 24px 32px;
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
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  gap: var(--space-md);
  transition: background 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-shortcut-row:nth-child(odd) { background: var(--bg-elevated); }
.modal-shortcut-row:hover { background: var(--bg-hover); }

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
  border-radius: var(--radius-sm);
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.modal-conflicts {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--warning-bg);
  border: 1px solid var(--warning-border);
  border-radius: var(--radius-lg);
}

.modal-conflict-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--warning-text);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-conflict-header .mdi { font-size: 16px; }

.modal-conflict-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.radio-option {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
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
  gap: var(--space-md);
  padding: 20px 32px;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}

.modal-enter-active, .modal-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-panel, .modal-leave-to .modal-panel { transform: scale(0.9) translateY(16px); }

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
  gap: var(--space-md);
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
  padding: 80px 24px;
  text-align: center;
  animation: emptyStateFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes emptyStateFadeIn {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

.empty-state-icon {
  font-size: 72px;
  color: var(--blue);
  margin-bottom: 24px;
  opacity: 0.9;
  filter: drop-shadow(0 8px 16px var(--blue-bg));
  transform: scale(1);
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.empty-state:hover .empty-state-icon {
  transform: scale(1.1) translateY(-4px);
}

.empty-state-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 12px;
  letter-spacing: -0.01em;
}

.empty-state-desc {
  font-size: 15px;
  color: var(--text-secondary);
  max-width: 480px;
  line-height: 1.6;
  margin: 0 0 32px;
}

.empty-state-actions {
  display: flex;
  gap: var(--space-md);
}

.empty-state-actions .btn {
  font-size: 15px;
  padding: 12px 24px;
  border-radius: var(--radius-xl);
}

/* ── Density toggle ── */
.density-toggle {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
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
  gap: var(--space-sm);
}

[data-density="condensed"] .shortcut-card {
  margin-bottom: 1px;
  border-radius: var(--radius-sm);
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
