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
const { dragIndex, handleActive, onHandleMouseDown, onDragStart, onDragOver, onDragOverGroup, onDragEnd } = useDragDrop()
const { shareGroup, publishToCommunity } = useImportExport()
const { refreshTabs, loadBookmarks } = useJsTools()
const { init: initUndoRedo, undo, redo, canUndo, canRedo } = useUndoRedo()
const { density, initDensity, toggleDensity } = useViewDensity()
const { previewPack, installPack } = usePacks()

// --- Lifecycle ---
initTheme()
initUndoRedo(keys)
initDensity()

const activeTab = ref(0)
const showOnboarding = ref(false)

const handleWizardFinish = async ({ shortcuts, packs }: {
  shortcuts: Array<{ key: string; action: string; code?: string; blacklist?: boolean | string; activeInInputs?: boolean; sites?: string }>
  packs: import('@/packs').ShortcutPack[]
}) => {
  for (const shortcut of shortcuts) {
    addShortcut()
    const newIndex = keys.value.length - 1
    Object.assign(keys.value[newIndex], shortcut)
  }
  if (shortcuts.length > 0) {
    await saveShortcuts()
  }
  for (const pack of packs) {
    await installPack(pack)
  }
  completeOnboarding()
}

function openExtensionDetails() {
  const isFirefox = navigator.userAgent.includes('Firefox')
  const url = isFirefox ? 'about:addons' : `chrome://extensions/?id=${browser.runtime.id}`
  browser.tabs.create({ url, active: true })
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
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="app-header bg-white/80 backdrop-blur-[16px] backdrop-saturate-[180%] border-b border-border-light sticky top-0 z-10">
      <div class="px-6 h-14 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <img src="/images/icon_48.png" alt="Shortkeys" class="w-7 h-7" />
          <span class="text-base font-bold text-text-primary tracking-tight">Shortkeys</span>
        </div>
        <nav class="flex items-center gap-1">
          <a href="https://chrome.google.com/webstore/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck/reviews" target="_blank" class="text-text-muted text-[13px] font-medium no-underline px-2.5 py-1.5 rounded-lg transition-colors duration-150 hover:text-text-primary hover:bg-surface-hover">Review</a>
          <a href="https://www.shortkeys.app/docs/" target="_blank" class="text-text-muted text-[13px] font-medium no-underline px-2.5 py-1.5 rounded-lg transition-colors duration-150 hover:text-text-primary hover:bg-surface-hover">Docs</a>
          <a href="https://github.com/mikecrittenden/shortkeys/issues" target="_blank" class="text-text-muted text-[13px] font-medium no-underline px-2.5 py-1.5 rounded-lg transition-colors duration-150 hover:text-text-primary hover:bg-surface-hover">Support</a>
          <a href="https://github.com/mikecrittenden/shortkeys" target="_blank" class="text-text-muted text-[13px] font-medium no-underline px-2.5 py-1.5 rounded-lg transition-colors duration-150 hover:text-text-primary hover:bg-surface-hover">GitHub</a>
          <div class="header-divider w-px h-5 bg-border-default mx-1"></div>
          <button class="header-btn w-8 h-8 flex items-center justify-center border border-border-default rounded-[10px] bg-surface-card text-text-secondary cursor-pointer text-base transition-all duration-150 hover:bg-surface-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-default" @click="undo" :disabled="!canUndo" title="Undo (Ctrl+Z)" type="button">
            <i class="mdi mdi-undo"></i>
          </button>
          <button class="header-btn w-8 h-8 flex items-center justify-center border border-border-default rounded-[10px] bg-surface-card text-text-secondary cursor-pointer text-base transition-all duration-150 hover:bg-surface-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-default" @click="redo" :disabled="!canRedo" title="Redo (Ctrl+Shift+Z)" type="button">
            <i class="mdi mdi-redo"></i>
          </button>
          <button class="theme-toggle w-8 h-8 flex items-center justify-center border border-border-default rounded-[10px] bg-surface-card text-text-secondary cursor-pointer text-base transition-all duration-150 hover:bg-surface-hover hover:text-text-primary" @click="toggleTheme" :title="darkMode ? 'Switch to light mode' : 'Switch to dark mode'" type="button">
            <i :class="darkMode ? 'mdi mdi-white-balance-sunny' : 'mdi mdi-moon-waning-crescent'"></i>
          </button>
        </nav>
      </div>
    </header>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="snackMessage" :class="['toast fixed bottom-8 right-8 z-[999] px-6 py-4 rounded-full text-[15px] font-semibold shadow-xl flex items-center gap-3 cursor-pointer backdrop-blur-[16px]', snackType === 'danger' ? 'toast-error bg-danger text-white' : 'toast-success bg-success text-white']" @click="dismissSnack">
        {{ snackMessage }}
        <button v-if="snackAction" class="toast-action ml-3 px-4 py-1.5 bg-white/20 text-inherit border border-white/30 rounded-full cursor-pointer font-bold text-[13px] transition-all duration-200 hover:bg-white/35 hover:scale-105" @click.stop="snackAction.handler(); dismissSnack()" type="button">
          {{ snackAction.label }}
        </button>
      </div>
    </Transition>

    <main class="w-full p-6 flex-1">
      <!-- Tabs -->
      <div class="inline-flex gap-0.5 mb-6 bg-surface-elevated rounded-[10px] p-[3px] border border-border-light">
        <button :class="['tab-btn px-5 py-2.5 border-none rounded-lg bg-transparent text-text-muted text-sm font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap hover:text-text-primary hover:bg-surface-hover', { 'active bg-surface-card !text-text-primary shadow-sm !font-semibold': activeTab === 0 }]" @click="activeTab = 0">
          <i class="mdi mdi-keyboard"></i> Shortcuts
        </button>
        <button :class="['tab-btn px-5 py-2.5 border-none rounded-lg bg-transparent text-text-muted text-sm font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap hover:text-text-primary hover:bg-surface-hover', { 'active bg-surface-card !text-text-primary shadow-sm !font-semibold': activeTab === 1 }]" @click="activeTab = 1">
          <i class="mdi mdi-package-variant"></i> Packs
        </button>
        <button :class="['tab-btn px-5 py-2.5 border-none rounded-lg bg-transparent text-text-muted text-sm font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap hover:text-text-primary hover:bg-surface-hover', { 'active bg-surface-card !text-text-primary shadow-sm !font-semibold': activeTab === 2 }]" @click="activeTab = 2">
          <i class="mdi mdi-import"></i> Import
        </button>
        <button :class="['tab-btn px-5 py-2.5 border-none rounded-lg bg-transparent text-text-muted text-sm font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap hover:text-text-primary hover:bg-surface-hover', { 'active bg-surface-card !text-text-primary shadow-sm !font-semibold': activeTab === 3 }]" @click="activeTab = 3">
          <i class="mdi mdi-export"></i> Export
        </button>
        <button :class="['tab-btn px-5 py-2.5 border-none rounded-lg bg-transparent text-text-muted text-sm font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap hover:text-text-primary hover:bg-surface-hover', { 'active bg-surface-card !text-text-primary shadow-sm !font-semibold': activeTab === 4 }]" @click="activeTab = 4">
          <i class="mdi mdi-chart-line"></i> Analytics
        </button>
      </div>

      <!-- Shortcuts Tab -->
      <div v-show="activeTab === 0">
        <article v-if="needsUserScripts()" class="alert alert-warning p-3.5 px-4.5 rounded-[14px] text-[13px] font-medium mb-5 leading-relaxed flex items-center gap-3 shadow-sm bg-warning-bg border-none border-l-[3px] border-l-warning-text text-warning-text">
          <i class="mdi mdi-alert-circle-outline"></i>
          <div>
            <strong>Allow User Scripts</strong> — In order for JavaScript actions to work, you must first allow User Scripts in your <a href="#" @click.prevent="openExtensionDetails">extension settings page</a>. Then come back and save your shortcuts.
          </div>
        </article>

        <!-- Stats bar -->
        <div v-if="keys.length > 0 && !showOnboarding" class="stats-bar flex justify-between items-center mb-4 gap-3 flex-wrap">
          <div class="flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="stat-chip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold bg-surface-elevated text-text-secondary border border-border-light">
                <i class="mdi mdi-keyboard"></i> {{ stats.total }} shortcut{{ stats.total !== 1 ? 's' : '' }}
              </span>
              <span v-if="stats.disabled > 0" class="stat-chip stat-disabled flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold !bg-warning-bg !text-warning-text border border-border-light">
                <i class="mdi mdi-pause-circle-outline"></i> {{ stats.disabled }} disabled
              </span>
              <span v-if="stats.withConflicts > 0" class="stat-chip stat-warn flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold !bg-danger-bg !text-danger-text border border-border-light">
                <i class="mdi mdi-alert-outline"></i> {{ stats.withConflicts }} with conflicts
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn btn-secondary btn-sm px-3 py-1 text-xs bg-surface-card text-text-secondary border border-border-default rounded-lg font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 hover:bg-surface-hover hover:text-text-primary" @click="addShortcut">
                <i class="mdi mdi-plus"></i> Add shortcut
              </button>
              <button class="btn btn-secondary btn-sm px-3 py-1 text-xs bg-surface-card text-text-secondary border border-border-default rounded-lg font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 hover:bg-surface-hover hover:text-text-primary" @click="createNewGroup">
                <i class="mdi mdi-folder-plus-outline"></i> New group
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="density-toggle w-8 h-8 flex items-center justify-center border border-border-default rounded-[10px] bg-surface-card text-text-secondary cursor-pointer text-base transition-all duration-150 hover:bg-surface-hover hover:text-text-primary" @click="toggleDensity" :title="density === 'comfortable' ? 'Switch to condensed view' : 'Switch to comfortable view'" type="button">
              <i :class="density === 'comfortable' ? 'mdi mdi-view-agenda-outline' : 'mdi mdi-view-headline'"></i>
            </button>
            <div class="search-wrap relative flex-1 max-w-[280px]">
              <i class="mdi mdi-magnify search-icon absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-base"></i>
              <input
                class="search-input w-full py-[7px] pl-8 pr-8 border-[1.5px] border-border-default rounded-lg text-[13px] text-text-primary bg-surface-card transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)] placeholder:text-text-placeholder"
                type="text"
                placeholder="Filter shortcuts…"
                v-model="searchQuery"
              />
              <button v-if="searchQuery" class="search-clear absolute right-1.5 top-1/2 -translate-y-1/2 bg-none border-none text-text-muted cursor-pointer p-0.5 text-sm" @click="searchQuery = ''" type="button">
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
          />
          <div v-else class="empty-state flex flex-col items-center justify-center py-20 px-6 text-center animate-empty-state">
          <div class="text-[72px] text-accent mb-6 opacity-90 drop-shadow-[0_8px_16px_var(--blue-bg)] transition-transform duration-500">
            <i class="mdi mdi-keyboard-outline"></i>
          </div>
          <h2 class="text-2xl font-bold text-text-primary mb-3">No shortcuts yet</h2>
          <p class="text-[15px] text-text-secondary max-w-[480px] leading-relaxed mb-8">
            Create custom keyboard shortcuts for 90+ browser actions — tab management, scrolling, navigation, running JavaScript, and more.
          </p>
          <div class="flex items-center gap-3">
            <button class="btn btn-primary px-4 py-2 border-none rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 tracking-[0.01em] bg-accent text-white shadow-[0_1px_3px_var(--blue-bg)] hover:bg-accent-hover hover:shadow-[0_4px_14px_var(--blue-bg)] hover:-translate-y-px active:translate-y-0" @click="addShortcut">
              <i class="mdi mdi-plus"></i> Create your first shortcut
            </button>
            <button class="btn btn-secondary px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 tracking-[0.01em] bg-surface-card text-text-secondary border border-border-default hover:bg-surface-hover hover:text-text-primary" @click="activeTab = 1">
              <i class="mdi mdi-package-variant"></i> Browse shortcut packs
            </button>
          </div>
          </div>
        </template>

        <!-- Grouped shortcut rows -->
        <div v-if="keys.length > 0 && !showOnboarding" class="shortcut-groups flex flex-col gap-4">
          <template v-for="group in groupNames" :key="group">
          <div v-if="groupedIndices.has(group)" class="shortcut-group flex flex-col bg-surface-card border border-border-default rounded-[14px] shadow-sm transition-shadow duration-200">
            <!-- Group header -->
            <div class="group-header flex items-center gap-2 py-3.5 px-4 bg-surface-elevated border-b border-border-light rounded-t-[14px]" @dragover="onDragOverGroup($event, group)">
              <button class="bg-transparent border-none text-text-muted cursor-pointer p-0.5 text-sm transition-transform duration-150 hover:text-text-primary" @click="toggleGroupCollapse(group)" type="button">
                <i :class="collapsedGroups.has(group) ? 'mdi mdi-chevron-right' : 'mdi mdi-chevron-down'"></i>
              </button>
              <template v-if="editingGroupName === group">
                <input
                  class="group-name-input font-bold text-text-primary text-xs uppercase tracking-[0.04em] bg-surface-input border border-border-default rounded-md px-2 py-1 outline-none focus:border-accent focus:shadow-[var(--focus-ring)]"
                  v-model="newGroupName"
                  @keydown.enter="finishRenameGroup(group)"
                  @blur="finishRenameGroup(group)"
                  @keydown.escape="editingGroupName = null"
                  ref="groupNameInput"
                  autofocus
                />
              </template>
              <template v-else>
                <span class="group-name font-bold text-text-primary select-none uppercase tracking-[0.04em] text-xs" @dblclick="startRenameGroup(group)">{{ group }}</span>
              </template>
              <span class="group-count text-xs font-semibold text-text-muted bg-surface-hover px-2 py-0.5 rounded-full leading-normal">{{ groupedIndices.get(group)?.length || 0 }}</span>
              <i v-if="hasGroupSiteRules(group)" class="mdi mdi-earth text-accent text-xs" title="Site rules active"></i>
              <div class="ml-auto flex items-center gap-1">
                <div class="relative">
                  <button class="btn-icon p-1.5 flex items-center justify-center border border-transparent rounded-lg bg-transparent text-text-muted cursor-pointer transition-all duration-150 text-base shrink-0 hover:bg-surface-hover hover:text-text-secondary hover:border-border-default text-sm" @click.stop="toggleGroupMenu(group)" title="Group options" type="button">
                    <i class="mdi mdi-dots-vertical"></i>
                  </button>
                  <div v-if="groupMenuOpen === group" class="group-menu absolute top-full right-0 mt-2 bg-surface-card border border-border-default rounded-[14px] shadow-xl min-w-[220px] z-20 overflow-hidden p-1.5 backdrop-blur-[12px]" @click="closeGroupMenus">
                    <button class="group-menu-item flex items-center gap-2 w-full px-3 py-2.5 border-none bg-transparent rounded-lg text-[13px] font-medium text-text-primary cursor-pointer text-left transition-all duration-200 hover:bg-surface-hover hover:translate-x-0.5" @click="startRenameGroup(group)">
                      <i class="mdi mdi-pencil-outline"></i> Rename group
                    </button>
                    <button class="group-menu-item flex items-center gap-2 w-full px-3 py-2.5 border-none bg-transparent rounded-lg text-[13px] font-medium text-text-primary cursor-pointer text-left transition-all duration-200 hover:bg-surface-hover hover:translate-x-0.5" @click="toggleGroupEnabled(group)">
                      <i :class="isGroupAllEnabled(group) ? 'mdi mdi-pause-circle-outline' : 'mdi mdi-play-circle-outline'"></i>
                      {{ isGroupAllEnabled(group) ? 'Disable all' : 'Enable all' }}
                    </button>
                    <button class="group-menu-item flex items-center gap-2 w-full px-3 py-2.5 border-none bg-transparent rounded-lg text-[13px] font-medium text-text-primary cursor-pointer text-left transition-all duration-200 hover:bg-surface-hover hover:translate-x-0.5" @click="toggleGroupSiteFilter(group)">
                      <i class="mdi mdi-earth"></i> Site rules
                    </button>
                    <button class="group-menu-item flex items-center gap-2 w-full px-3 py-2.5 border-none bg-transparent rounded-lg text-[13px] font-medium text-text-primary cursor-pointer text-left transition-all duration-200 hover:bg-surface-hover hover:translate-x-0.5" @click="shareGroup(group)">
                      <i class="mdi mdi-share-variant-outline"></i> Share group
                    </button>
                    <button class="group-menu-item flex items-center gap-2 w-full px-3 py-2.5 border-none bg-transparent rounded-lg text-[13px] font-medium text-text-primary cursor-pointer text-left transition-all duration-200 hover:bg-surface-hover hover:translate-x-0.5" @click="publishToCommunity(group)">
                      <i class="mdi mdi-upload-outline"></i> Publish to community
                    </button>
                    <button class="group-menu-item group-menu-danger flex items-center gap-2 w-full px-3 py-2.5 border-none bg-transparent rounded-lg text-[13px] font-medium !text-danger cursor-pointer text-left transition-all duration-200 hover:!bg-danger-bg hover:translate-x-0.5" @click="deleteGroup(group)">
                      <i class="mdi mdi-delete-outline"></i> Delete group
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Group site rules panel -->
            <Transition name="expand">
              <div v-if="expandedGroupSiteFilter === group" class="group-site-panel px-4 py-3 border-b border-border-light bg-surface-elevated">
                <div class="group-site-fields flex gap-3">
                  <div class="group-site-field flex-1 min-w-0">
                    <label class="group-site-label block text-xs font-semibold text-text-secondary mb-1"><i class="mdi mdi-earth-plus"></i> Only activate on</label>
                    <textarea
                      class="field-textarea group-site-textarea w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)] resize-y !text-xs !p-[6px_10px] font-mono"
                      v-model="groupSettings[group].activateOn"
                      @blur="persistGroupSettings()"
                      rows="2"
                      placeholder="e.g. gmail.com&#10;*github.com/myorg*"
                    ></textarea>
                  </div>
                  <div class="group-site-field flex-1 min-w-0">
                    <label class="group-site-label block text-xs font-semibold text-text-secondary mb-1"><i class="mdi mdi-earth-minus"></i> Deactivate on</label>
                    <textarea
                      class="field-textarea group-site-textarea w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)] resize-y !text-xs !p-[6px_10px] font-mono"
                      v-model="groupSettings[group].deactivateOn"
                      @blur="persistGroupSettings()"
                      rows="2"
                      placeholder="e.g. mail.google.com/settings*"
                    ></textarea>
                  </div>
                </div>
                <p class="group-site-hint text-[11px] text-text-muted mt-2">
                  Applies to all shortcuts in this group. Individual shortcuts can still override with their own site filter.
                  Simple domains like <code>gmail.com</code> work automatically, or use <code>*</code> as a wildcard.
                  If both fields are set, the URL must match "activate" and not match "deactivate".
                </p>
              </div>
            </Transition>

            <!-- Shortcuts in this group -->
            <div class="shortcut-list flex flex-col gap-px p-1.5 bg-border-light" v-show="!collapsedGroups.has(group)">
              <div
                v-for="index in (groupedIndices.get(group) || [])"
                :key="keys[index].id"
                :class="['shortcut-card group bg-surface-card rounded-lg transition-all duration-150 relative hover:bg-surface-elevated', { 'disabled opacity-45': keys[index].enabled === false, 'dragging': dragIndex === index, 'expanded border-l-[3px] border-l-accent rounded-[10px] shadow-sm my-1 bg-surface-card': expandedRow === index }]"
                :draggable="handleActive"
                @dragstart="onDragStart($event, index)"
                @dragover="onDragOver($event, index)"
                @dragend="onDragEnd"
              >
                <!-- Editable label above the card -->
                <div class="shortcut-header flex items-center gap-1 px-3 pt-1.5">
                  <i class="mdi mdi-drag-vertical drag-handle text-text-placeholder text-base cursor-grab p-0.5 shrink-0 transition-colors duration-150 opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:text-text-muted" title="Drag to reorder" @mousedown="onHandleMouseDown"></i>
                  <input
                    class="shortcut-label-title flex-1 min-w-0 border-none bg-transparent text-xs font-medium text-text-muted outline-none px-1 py-0.5 rounded-[5px] transition-all duration-150 placeholder:text-text-placeholder focus:text-text-primary focus:bg-surface-input focus:shadow-[var(--focus-ring)]"
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
                <div class="shortcut-row flex items-end gap-3 px-4 pt-2.5 pb-3">
                  <div class="field-group shortcut-col w-80 shrink-0 grow-0 basis-80 flex flex-col gap-1 min-w-0">
                    <label class="field-label text-[11px] font-bold uppercase tracking-[0.06em] text-text-placeholder">Shortcut</label>
                    <ShortcutRecorder
                      :modelValue="keys[index].key"
                      @update:modelValue="keys[index].key = $event"
                    />
                  </div>
                  <div class="field-group behavior-col flex-1 min-w-0 flex flex-col gap-1">
                    <div class="field-label-row flex items-center justify-between gap-2">
                      <label class="field-label text-[11px] font-bold uppercase tracking-[0.06em] text-text-placeholder">Behavior</label>
                      <button
                        v-if="keys[index].action && keys[index].action !== 'macro'"
                        class="text-accent text-[11px] font-medium bg-transparent border-none cursor-pointer flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:underline"
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
                  <div class="shortcut-actions flex items-center gap-0.5 shrink-0 pb-px">
                    <button class="btn-icon p-1.5 flex items-center justify-center border border-transparent rounded-lg bg-transparent text-text-muted cursor-pointer transition-all duration-150 text-base shrink-0 hover:bg-surface-hover hover:text-text-secondary hover:border-border-default" @click="toggleDetails(index)" :title="expandedRow === index ? 'Collapse' : 'Settings'">
                      <i :class="expandedRow === index ? 'mdi mdi-chevron-up' : 'mdi mdi-cog-outline'"></i>
                    </button>
                    <button class="btn-icon btn-delete p-1.5 flex items-center justify-center border border-transparent rounded-lg bg-transparent text-text-muted cursor-pointer transition-all duration-150 text-base shrink-0 hover:!bg-danger-bg hover:!text-danger hover:!border-danger-border" @click="deleteShortcut(index)" title="Delete">
                      <i class="mdi mdi-close"></i>
                    </button>
                  </div>
                </div>

            <!-- Conflict warnings -->
            <div v-if="getConflicts(index).length" class="conflict-warnings flex flex-wrap gap-1.5 px-4 pb-2.5">
              <div v-for="(c, ci) in getConflicts(index)" :key="ci" :class="['conflict-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', c.type === 'browser' ? 'browser bg-warning-bg text-warning-text border border-warning-border' : 'duplicate bg-danger-bg text-danger-text border border-danger-border']">
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
            <button class="btn-add-to-group flex items-center justify-center gap-1 py-2 bg-transparent border-none border-t border-dashed border-t-border-light rounded-b-[10px] text-text-muted text-xs font-medium cursor-pointer transition-all duration-150 hover:bg-surface-elevated hover:text-text-secondary" @click="addShortcutToGroup(group)" type="button" v-show="!collapsedGroups.has(group)">
              <i class="mdi mdi-plus"></i> Add shortcut
            </button>
          </div>
          </template>
        </div>

        <Transition name="toast">
          <div v-if="keys.length > 0 && !showOnboarding && dirty" class="action-bar flex justify-center items-center mt-12 sticky bottom-6 z-50 pointer-events-none">
            <button class="btn btn-primary pointer-events-auto px-7 py-3 text-sm rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15),0_1px_3px_rgba(0,0,0,0.1)] border-none font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 bg-accent text-white hover:bg-accent-hover hover:-translate-y-px active:translate-y-0" @click="saveShortcuts">
              <i class="mdi mdi-content-save"></i> Save shortcuts
            </button>
          </div>
        </Transition>
      </div>

      <!-- Packs Tab -->
      <div v-show="activeTab === 1">
        <PacksTab />
      </div>

      <!-- Import Tab -->
      <div v-show="activeTab === 2">
        <ImportTab />
      </div>

      <!-- Pack Preview Modal -->
      <PackPreviewModal />
      <CommunityPackModal />
      <JsWarningDialog />

      <!-- Export Tab -->
      <div v-show="activeTab === 3">
        <ExportTab />
      </div>

      <!-- Analytics Tab -->
      <div v-show="activeTab === 4">
        <AnalyticsTab />
      </div>
    </main>

  </div>
</template>

