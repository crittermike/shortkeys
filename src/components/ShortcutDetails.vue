<script setup lang="ts">
import { SCROLL_ACTIONS, isBuiltInAction } from '@/utils/actions-registry'
import SearchSelect from '@/components/SearchSelect.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import { useShortcuts } from '@/composables/useShortcuts'
import { useSearch } from '@/composables/useSearch'
import { useMacros } from '@/composables/useMacros'
import { useJsTools } from '@/composables/useJsTools'

const props = defineProps<{
  index: number
}>()

const { keys } = useShortcuts()
const { macroActionOptions } = useSearch()
const { MAX_MACRO_STEPS, addMacroStep, removeMacroStep, moveMacroStep, convertToSingleAction } = useMacros()
const {
  openTabs, selectedTabId, bookmarks,
  userscriptUrl, userscriptLoading, userscriptMessage,
  refreshTabs, testJavascript, importUserscript, loadBookmarks,
} = useJsTools()

function isScrollAction(action: string): boolean {
  return (SCROLL_ACTIONS as readonly string[]).includes(action)
}

function isBookmarkAction(action: string): boolean {
  return ['openbookmark', 'openbookmarknewtab', 'openbookmarkbackgroundtab', 'openbookmarkbackgroundtabandclose'].includes(action)
}
</script>

<template>
  <div class="shortcut-details border-t border-border-light px-5 py-4 bg-surface-elevated">

    <article v-if="isBuiltInAction(keys[index].action)" class="alert alert-info">
      <i class="mdi mdi-information-outline"></i>
      <span>Also available via the browser's native <strong>Keyboard Shortcuts</strong> settings. <a href="https://github.com/mikecrittenden/shortkeys/wiki/FAQs-and-Troubleshooting#Do_I_use_the_browsers_Keyboard_Shortcuts_settings_or_the_Shortkeys_options_page" target="_blank">Learn more &rarr;</a></span>
    </article>

    <!-- Code editor for JS (full-width, prominent) -->
    <div v-if="keys[index].action === 'javascript'" class="rounded-[10px] overflow-hidden border border-border-default mb-1">
      <div class="flex justify-between items-center px-3.5 py-2.5 bg-[#282c34] gap-2">
        <span class="text-text-muted text-[13px] font-semibold tracking-wider flex items-center gap-1.5 shrink-0"><i class="mdi mdi-code-braces"></i> JavaScript</span>
        <div class="flex items-center gap-1.5">
          <span class="text-text-secondary text-[13px] whitespace-nowrap">Test on:</span>
          <div class="flex items-center gap-1 bg-[#334155] rounded-lg px-2 h-[30px]" @click="refreshTabs">
            <i class="mdi mdi-tab"></i>
            <select v-model="selectedTabId" class="bg-transparent border-none text-[#e2e8f0] text-[13px] outline-none cursor-pointer max-w-[200px] p-0">
              <option v-for="t in openTabs" :key="t.id" :value="t.id">
                {{ t.title.substring(0, 35) }}{{ t.title.length > 35 ? '…' : '' }}
              </option>
            </select>
          </div>
          <button class="px-4 py-1.5 text-[13px] rounded-lg bg-success text-white border-none cursor-pointer font-semibold flex items-center gap-1 transition-colors duration-150 h-[30px] whitespace-nowrap hover:bg-success-hover" @click="testJavascript(keys[index])" type="button">
            <i class="mdi mdi-play"></i> Run
          </button>
        </div>
      </div>
      <CodeEditor :modelValue="keys[index].code || ''" @update:modelValue="keys[index].code = $event" />
    </div>
    <div v-if="keys[index].action === 'javascript'" class="pt-2.5">
      <div class="flex gap-1.5 items-center">
        <i class="mdi mdi-link-variant text-text-muted text-base shrink-0"></i>
        <input
          v-model="userscriptUrl"
          class="flex-1 bg-surface-input border border-border-default rounded-lg text-text-primary text-xs px-2.5 py-[7px] outline-none focus:border-accent placeholder:text-text-placeholder"
          placeholder="Paste a Greasyfork or userscript URL to import…"
          @keydown.enter="importUserscript(index)"
        />
        <button class="flex items-center gap-1 px-3.5 py-[7px] rounded-lg border border-border-default bg-surface-card text-text-secondary text-xs cursor-pointer whitespace-nowrap hover:bg-surface-hover hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed" @click="importUserscript(index)" type="button" :disabled="userscriptLoading">
          <i :class="['mdi', userscriptLoading ? 'mdi-loading mdi-spin' : 'mdi-download']"></i> Fetch
        </button>
      </div>
      <span v-if="userscriptMessage" class="block text-[11px] mt-1 text-text-muted">{{ userscriptMessage }}</span>
    </div>

    <!-- Action-specific settings -->
    <div class="flex flex-col gap-3 empty:hidden">
      <div v-if="isScrollAction(keys[index].action)" class="flex items-center gap-2.5 px-3.5 py-2 bg-surface-card border border-border-default rounded-[10px] whitespace-nowrap shrink-0">
        <span class="text-[13px] font-medium text-text-secondary">Smooth scrolling</span>
        <button :class="['toggle', { on: keys[index].smoothScrolling }]" @click="keys[index].smoothScrolling = !keys[index].smoothScrolling" type="button">
          <span class="toggle-knob"></span>
        </button>
      </div>

      <div v-if="isBookmarkAction(keys[index].action)" class="detail-field">
        <label class="block text-[13px] font-medium text-text-secondary mb-1">Bookmark</label>
        <SearchSelect
          :modelValue="keys[index].bookmark || ''"
          @update:modelValue="keys[index].bookmark = $event"
          :options="{ Bookmarks: bookmarks.map(bm => ({ value: bm.title, label: bm.title || bm.url, sublabel: bm.url })) }"
          placeholder="Search bookmarks…"
        />
      </div>

      <div v-if="keys[index].action === 'gototabbytitle'" class="flex gap-3 items-end">
        <div class="detail-field flex-1 min-w-0">
          <label class="block text-[13px] font-medium text-text-secondary mb-1">Title to match <span class="font-normal text-text-muted">(wildcards)</span></label>
          <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)]" v-model="keys[index].matchtitle" placeholder="*Gmail*" />
        </div>
        <div class="flex items-center gap-2.5 px-3.5 py-2 bg-surface-card border border-border-default rounded-[10px] whitespace-nowrap shrink-0">
          <span class="text-[13px] font-medium text-text-secondary">Current window only</span>
          <button :class="['toggle', { on: keys[index].currentWindow }]" @click="keys[index].currentWindow = !keys[index].currentWindow" type="button">
            <span class="toggle-knob"></span>
          </button>
        </div>
      </div>

      <div v-if="keys[index].action === 'gototab'" class="flex gap-3 items-end">
        <div class="detail-field flex-1 min-w-0">
          <label class="block text-[13px] font-medium text-text-secondary mb-1">URL to match <a class="font-normal text-accent text-xs" target="_blank" href="https://developer.chrome.com/extensions/match_patterns">pattern help →</a></label>
          <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)]" v-model="keys[index].matchurl" placeholder="*://mail.google.com/*" />
        </div>
        <div class="detail-field flex-1 min-w-0">
          <label class="block text-[13px] font-medium text-text-secondary mb-1">Fallback URL <span class="font-normal text-text-muted">(if no match)</span></label>
          <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)]" v-model="keys[index].openurl" placeholder="https://mail.google.com" />
        </div>
        <div class="flex items-center gap-2.5 px-3.5 py-2 bg-surface-card border border-border-default rounded-[10px] whitespace-nowrap shrink-0">
          <span class="text-[13px] font-medium text-text-secondary">Current window</span>
          <button :class="['toggle', { on: keys[index].currentWindow }]" @click="keys[index].currentWindow = !keys[index].currentWindow" type="button">
            <span class="toggle-knob"></span>
          </button>
        </div>
      </div>

      <div v-if="keys[index].action === 'gototabbyindex'" class="flex gap-3 items-end">
        <div class="detail-field" style="max-width: 160px">
          <label class="block text-[13px] font-medium text-text-secondary mb-1">Tab index <span class="font-normal text-text-muted">(from 1)</span></label>
          <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)]" type="number" v-model="keys[index].matchindex" min="1" />
        </div>
      </div>

      <div v-if="keys[index].action === 'buttonnexttab'" class="detail-field">
        <label class="block text-[13px] font-medium text-text-secondary mb-1">Button CSS selector</label>
        <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)] font-mono" v-model="keys[index].button" placeholder="#submit-btn" />
      </div>

      <div v-if="keys[index].action === 'openurl'" class="detail-field">
        <label class="block text-[13px] font-medium text-text-secondary mb-1">URL to open</label>
        <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)] font-mono" v-model="keys[index].openurl" placeholder="https://example.com" />
      </div>

      <div v-if="['grouptab', 'togglegrouptab', 'namegroup'].includes(keys[index].action)" class="detail-field">
        <label class="block text-[13px] font-medium text-text-secondary mb-1">Group name</label>
        <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)]" v-model="keys[index].groupname" placeholder="e.g. Research" />
      </div>

      <div v-if="keys[index].action === 'openapp'" class="detail-field">
        <label class="block text-[13px] font-medium text-text-secondary mb-1">App ID <span class="font-normal text-text-muted">(from extensions page)</span></label>
        <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)] font-mono" v-model="keys[index].openappid" />
      </div>

      <div v-if="keys[index].action === 'trigger'" class="detail-field" style="max-width: 250px">
        <label class="block text-[13px] font-medium text-text-secondary mb-1">Shortcut to trigger</label>
        <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)] shortcut-input" v-model="keys[index].trigger" placeholder="e.g. ctrl+b" />
      </div>

      <div v-if="keys[index].action === 'inserttext'" class="detail-field">
        <label class="block text-[13px] font-medium text-text-secondary mb-1">Text to insert</label>
        <textarea class="field-textarea w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)] resize-y font-mono" v-model="keys[index].inserttext" rows="2" placeholder="Text to type into the focused field…"></textarea>
      </div>
      <div v-if="keys[index].action === 'macro'" class="w-full">
        <div class="field-label-row flex items-baseline justify-between gap-2">
          <label class="block text-[13px] font-semibold text-text-secondary mb-2"><i class="mdi mdi-playlist-play"></i> Macro steps <span class="font-normal text-text-muted">(max {{ MAX_MACRO_STEPS }})</span></label>
          <button class="inline-flex items-center gap-[3px] p-0 text-[11px] font-medium text-accent bg-none border-none cursor-pointer opacity-60 transition-opacity duration-150 whitespace-nowrap hover:opacity-100" @click="convertToSingleAction(keys[index])" type="button">
            <i class="mdi mdi-arrow-left"></i> Use single action
          </button>
        </div>
        <div class="flex flex-col gap-1.5 mb-2">
          <div v-for="(step, si) in (keys[index].macroSteps || [])" :key="si" class="flex items-center gap-2 px-2.5 py-2 bg-surface-card border border-border-default rounded-[10px] flex-wrap">
            <span class="text-xs font-semibold text-text-muted min-w-[18px] text-center">{{ si + 1 }}</span>
            <div class="flex-1 min-w-0">
              <SearchSelect
                :modelValue="step.action"
                @update:modelValue="step.action = $event"
                :options="macroActionOptions"
                placeholder="Choose action…"
              />
            </div>
            <div class="flex items-center gap-0.5 shrink-0">
              <input
                type="number"
                class="field-input w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)] !w-[70px] !text-right !px-2 !py-[7px] !text-xs"
                :value="step.delay || 0"
                @input="step.delay = parseInt(($event.target as HTMLInputElement).value) || 0"
                min="0"
                step="100"
                title="Delay before this step (ms)"
              />
              <span class="text-[11px] text-text-muted">ms</span>
            </div>
            <div class="flex gap-0.5 shrink-0">
              <button class="btn-icon p-1.5 flex items-center justify-center border border-transparent rounded-lg bg-transparent text-text-muted cursor-pointer transition-all duration-150 text-base shrink-0 hover:bg-surface-hover hover:text-text-secondary hover:border-border-default !px-3 !py-1 !text-xs" @click="moveMacroStep(keys[index], si, 'up')" :disabled="si === 0" title="Move up" type="button">
                <i class="mdi mdi-arrow-up"></i>
              </button>
              <button class="btn-icon p-1.5 flex items-center justify-center border border-transparent rounded-lg bg-transparent text-text-muted cursor-pointer transition-all duration-150 text-base shrink-0 hover:bg-surface-hover hover:text-text-secondary hover:border-border-default !px-3 !py-1 !text-xs" @click="moveMacroStep(keys[index], si, 'down')" :disabled="si === (keys[index].macroSteps || []).length - 1" title="Move down" type="button">
                <i class="mdi mdi-arrow-down"></i>
              </button>
              <button class="btn-icon p-1.5 flex items-center justify-center border border-transparent rounded-lg bg-transparent text-text-muted cursor-pointer transition-all duration-150 text-base shrink-0 hover:bg-surface-hover hover:text-text-secondary hover:border-border-default !px-3 !py-1 !text-xs btn-delete" @click="removeMacroStep(keys[index], si)" title="Remove step" type="button">
                <i class="mdi mdi-close"></i>
              </button>
            </div>
            <!-- Code editor for JS macro step -->
            <div v-if="step.action === 'javascript'" class="w-full mt-1">
              <CodeEditor :modelValue="step.code || ''" @update:modelValue="step.code = $event" />
            </div>
          </div>
        </div>
        <button
          v-if="(keys[index].macroSteps || []).length < MAX_MACRO_STEPS"
          class="inline-flex items-center gap-1 px-3.5 py-1.5 text-[13px] font-medium text-accent bg-transparent border border-dashed border-accent rounded-[10px] cursor-pointer transition-colors duration-150 hover:bg-surface-hover"
          @click="addMacroStep(keys[index])"
          type="button"
        >
          <i class="mdi mdi-plus"></i> Add step
        </button>
        <p v-if="(keys[index].macroSteps || []).length === 0" class="text-[13px] text-text-muted m-0 py-2">
          No steps yet. Add actions that will run sequentially when this shortcut is pressed.
        </p>
      </div>
    </div>

    <!-- Activation bar: website filter + form inputs toggle -->
    <div class="flex items-center gap-3 mt-3 pt-3 border-t border-border-light">
      <div class="flex-1">
        <div class="flex bg-surface-hover rounded-[10px] p-[3px] gap-0.5 border border-border-light">
          <button
            :class="['flex-1 px-2.5 py-2 border-none rounded-lg bg-transparent text-text-muted text-[13px] font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-1 whitespace-nowrap hover:text-text-primary', { '!bg-surface-card !text-accent !shadow-sm !font-semibold': !keys[index].blacklist || keys[index].blacklist === 'false' }]"
            @click="keys[index].blacklist = false" type="button"
          >
            <i class="mdi mdi-earth"></i> All sites
          </button>
          <button
            :class="['flex-1 px-2.5 py-2 border-none rounded-lg bg-transparent text-text-muted text-[13px] font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-1 whitespace-nowrap hover:text-text-primary', { '!bg-surface-card !text-accent !shadow-sm !font-semibold': keys[index].blacklist === true || keys[index].blacklist === 'true' }]"
            @click="keys[index].blacklist = true" type="button"
          >
            <i class="mdi mdi-earth-minus"></i> Except…
          </button>
          <button
            :class="['flex-1 px-2.5 py-2 border-none rounded-lg bg-transparent text-text-muted text-[13px] font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-1 whitespace-nowrap hover:text-text-primary', { '!bg-surface-card !text-accent !shadow-sm !font-semibold': keys[index].blacklist === 'whitelist' }]"
            @click="keys[index].blacklist = 'whitelist'" type="button"
          >
            <i class="mdi mdi-earth-plus"></i> Only on…
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2.5 px-3.5 py-2 bg-surface-card border border-border-default rounded-[10px] whitespace-nowrap shrink-0">
        <span class="text-[13px] font-medium text-text-secondary">Active in form inputs</span>
        <button :class="['toggle', { on: keys[index].activeInInputs }]" @click="keys[index].activeInInputs = !keys[index].activeInInputs" type="button">
          <span class="toggle-knob"></span>
        </button>
      </div>
    </div>
    <textarea
      v-if="keys[index].blacklist && keys[index].blacklist !== 'false'"
      class="field-textarea w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)] resize-y font-mono text-sm mt-2"
      v-model="keys[index].sites"
      rows="3"
      :placeholder="keys[index].blacklist === 'whitelist' ? 'Sites to activate on…\n*example.com*' : 'Sites to disable on…\n*example.com*'"
    ></textarea>
  </div>
</template>
