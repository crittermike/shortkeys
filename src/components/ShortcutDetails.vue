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
  <div class="shortcut-details p-8 bg-card-dim">

    <article v-if="isBuiltInAction(keys[index].action)" class="alert alert-info">
      <i class="mdi mdi-information-outline"></i>
      <span>Also available via the browser's native <strong>Keyboard Shortcuts</strong> settings. <a href="https://www.shortkeys.app/docs/#faq-browser-shortcuts-vs-options" target="_blank">Learn more &rarr;</a></span>
    </article>

    <!-- Code editor for JS (full-width, prominent) -->
    <div v-if="keys[index].action === 'javascript'" class="rounded-xl overflow-hidden border border-card-border mb-1">
      <div class="flex justify-between items-center px-3.5 py-2.5 bg-card gap-2">
        <span class="text-card-text-muted text-[13px] font-semibold tracking-wider flex items-center gap-1.5 shrink-0"><i class="mdi mdi-code-braces"></i> JavaScript</span>
        <div class="flex items-center gap-1.5">
          <span class="text-card-text-secondary text-[13px] whitespace-nowrap">Test on:</span>
          <div class="flex items-center gap-1 bg-card-deep rounded-lg px-2 h-[30px]" @click="refreshTabs">
            <i class="mdi mdi-tab"></i>
            <select v-model="selectedTabId" class="bg-transparent border-none text-card-text text-[13px] outline-none cursor-pointer max-w-[200px] p-0">
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
        <i class="mdi mdi-link-variant text-card-text-muted text-base shrink-0"></i>
        <input
          v-model="userscriptUrl"
          class="flex-1 bg-card-deepest border border-card-border-muted rounded-xl text-card-text text-xs px-2.5 py-[7px] outline-none focus:border-blue-500 placeholder:text-card-text-dim"
          placeholder="Paste a Greasyfork or userscript URL to import…"
          @keydown.enter="importUserscript(index)"
        />
        <button class="flex items-center gap-1 px-3.5 py-[7px] rounded-xl border border-card-border-muted bg-card text-card-text-secondary text-xs cursor-pointer whitespace-nowrap hover:bg-card-deep hover:text-card-text disabled:opacity-50 disabled:cursor-not-allowed" @click="importUserscript(index)" type="button" :disabled="userscriptLoading">
          <i :class="['mdi', userscriptLoading ? 'mdi-loading mdi-spin' : 'mdi-download']"></i> Fetch
        </button>
      </div>
      <span v-if="userscriptMessage" class="block text-[11px] mt-1 text-card-text-muted">{{ userscriptMessage }}</span>
    </div>

    <!-- Action-specific settings -->
    <div class="flex flex-col gap-3 empty:hidden">
      <div v-if="isScrollAction(keys[index].action)" class="flex items-center gap-2.5 px-3.5 py-2 bg-card border border-card-border rounded-xl whitespace-nowrap w-fit">
        <span class="text-[10px] uppercase tracking-widest font-bold text-card-text-muted">Smooth scrolling</span>
        <button :class="['toggle', { on: keys[index].smoothScrolling }]" @click="keys[index].smoothScrolling = !keys[index].smoothScrolling" type="button">
          <span class="toggle-knob"></span>
        </button>
      </div>

      <div v-if="isBookmarkAction(keys[index].action)" class="detail-field">
        <label class="block text-[10px] uppercase tracking-widest font-bold text-card-text-muted mb-1">Bookmark</label>
        <SearchSelect
          :modelValue="keys[index].bookmark || ''"
          @update:modelValue="keys[index].bookmark = $event"
          :options="{ Bookmarks: bookmarks.map(bm => ({ value: bm.title, label: bm.title || bm.url, sublabel: bm.url })) }"
          placeholder="Search bookmarks…"
        />
      </div>

      <div v-if="keys[index].action === 'gototabbytitle'" class="flex gap-3 items-end">
        <div class="detail-field flex-1 min-w-0">
          <label class="block text-[10px] uppercase tracking-widest font-bold text-card-text-muted mb-1">Title to match <span class="font-normal text-card-text-dim">(wildcards)</span></label>
          <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-card-border-muted rounded-xl text-sm text-card-text bg-card-deepest transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-blue-500" v-model="keys[index].matchtitle" placeholder="*Gmail*" />
        </div>
        <div class="flex items-center gap-2.5 px-3.5 py-2 bg-card border border-card-border rounded-xl whitespace-nowrap shrink-0">
          <span class="text-[10px] uppercase tracking-widest font-bold text-card-text-muted">Current window only</span>
          <button :class="['toggle', { on: keys[index].currentWindow }]" @click="keys[index].currentWindow = !keys[index].currentWindow" type="button">
            <span class="toggle-knob"></span>
          </button>
        </div>
      </div>

      <div v-if="keys[index].action === 'gototab'" class="flex gap-3 items-end">
        <div class="detail-field flex-1 min-w-0">
          <label class="block text-[10px] uppercase tracking-widest font-bold text-card-text-muted mb-1">URL to match <a class="font-normal text-blue-400 text-xs" target="_blank" href="https://developer.chrome.com/extensions/match_patterns">pattern help →</a></label>
          <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-card-border-muted rounded-xl text-sm text-card-text bg-card-deepest transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-blue-500" v-model="keys[index].matchurl" placeholder="*://mail.google.com/*" />
        </div>
        <div class="detail-field flex-1 min-w-0">
          <label class="block text-[10px] uppercase tracking-widest font-bold text-card-text-muted mb-1">Fallback URL <span class="font-normal text-card-text-dim">(if no match)</span></label>
          <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-card-border-muted rounded-xl text-sm text-card-text bg-card-deepest transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-blue-500" v-model="keys[index].openurl" placeholder="https://mail.google.com" />
        </div>
        <div class="flex items-center gap-2.5 px-3.5 py-2 bg-card border border-card-border rounded-xl whitespace-nowrap shrink-0">
          <span class="text-[10px] uppercase tracking-widest font-bold text-card-text-muted">Current window</span>
          <button :class="['toggle', { on: keys[index].currentWindow }]" @click="keys[index].currentWindow = !keys[index].currentWindow" type="button">
            <span class="toggle-knob"></span>
          </button>
        </div>
      </div>

      <div v-if="keys[index].action === 'gototabbyindex'" class="flex gap-3 items-end">
        <div class="detail-field" style="max-width: 160px">
          <label class="block text-[10px] uppercase tracking-widest font-bold text-card-text-muted mb-1">Tab index <span class="font-normal text-card-text-dim">(from 1)</span></label>
          <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-card-border-muted rounded-xl text-sm text-card-text bg-card-deepest transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-blue-500" type="number" v-model="keys[index].matchindex" min="1" />
        </div>
      </div>

      <div v-if="keys[index].action === 'buttonnexttab'" class="detail-field">
        <label class="block text-[10px] uppercase tracking-widest font-bold text-card-text-muted mb-1">Button CSS selector</label>
        <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-card-border-muted rounded-xl text-sm text-card-text bg-card-deepest transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-blue-500 font-mono" v-model="keys[index].button" placeholder="#submit-btn" />
      </div>

      <div v-if="keys[index].action === 'openurl'" class="detail-field">
        <label class="block text-[10px] uppercase tracking-widest font-bold text-card-text-muted mb-1">URL to open</label>
        <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-card-border-muted rounded-xl text-sm text-card-text bg-card-deepest transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-blue-500 font-mono" v-model="keys[index].openurl" placeholder="https://example.com" />
      </div>

      <div v-if="['grouptab', 'togglegrouptab', 'namegroup'].includes(keys[index].action)" class="detail-field">
        <label class="block text-[10px] uppercase tracking-widest font-bold text-card-text-muted mb-1">Group name</label>
        <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-card-border-muted rounded-xl text-sm text-card-text bg-card-deepest transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-blue-500" v-model="keys[index].groupname" placeholder="e.g. Research" />
      </div>

      <div v-if="keys[index].action === 'openapp'" class="detail-field">
        <label class="block text-[10px] uppercase tracking-widest font-bold text-card-text-muted mb-1">App ID <span class="font-normal text-card-text-dim">(from extensions page)</span></label>
        <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-card-border-muted rounded-xl text-sm text-card-text bg-card-deepest transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-blue-500 font-mono" v-model="keys[index].openappid" />
      </div>

      <div v-if="keys[index].action === 'trigger'" class="detail-field" style="max-width: 250px">
        <label class="block text-[10px] uppercase tracking-widest font-bold text-card-text-muted mb-1">Shortcut to trigger</label>
        <input class="field-input w-full px-3 py-[9px] border-[1.5px] border-card-border-muted rounded-xl text-sm text-card-text bg-card-deepest transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-blue-500 shortcut-input" v-model="keys[index].trigger" placeholder="e.g. ctrl+b" />
      </div>

      <div v-if="keys[index].action === 'inserttext'" class="detail-field">
        <label class="block text-[10px] uppercase tracking-widest font-bold text-card-text-muted mb-1">Text to insert</label>
        <textarea class="field-textarea w-full px-3 py-[9px] border-[1.5px] border-card-border-muted rounded-xl text-sm text-card-text bg-card-deepest transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-blue-500 resize-y font-mono" v-model="keys[index].inserttext" rows="2" placeholder="Text to type into the focused field…"></textarea>
      </div>
      <div v-if="keys[index].action === 'macro'" class="w-full">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            <label class="text-[10px] uppercase tracking-widest font-bold text-card-text-muted">Execution Steps <span class="font-normal text-card-text-dim">(max {{ MAX_MACRO_STEPS }})</span></label>
          </div>
          <div class="flex items-center gap-3">
            <button class="text-card-text-muted text-[10px] font-bold bg-transparent border-none cursor-pointer transition-colors hover:text-card-text" @click="convertToSingleAction(keys[index])" type="button">
              <i class="mdi mdi-arrow-left"></i> Use single action
            </button>
            <button
              v-if="(keys[index].macroSteps || []).length < MAX_MACRO_STEPS"
              class="text-blue-400 text-[10px] font-bold bg-transparent border-none cursor-pointer transition-colors hover:text-blue-300"
              @click="addMacroStep(keys[index])"
              type="button"
            >
              + Add Step
            </button>
          </div>
        </div>
        <div class="flex flex-col">
          <div v-for="(step, si) in (keys[index].macroSteps || [])" :key="si" class="relative pl-10 mb-6 last:mb-0 group/step">
            <!-- Timeline line (not on last step) -->
            <div v-if="si < (keys[index].macroSteps || []).length - 1" class="absolute left-[15px] top-0 bottom-[-24px] w-0.5 bg-gradient-to-b from-blue-500/50 to-card-border"></div>
            <!-- Step number circle -->
            <div class="absolute left-0 top-0 w-8 h-8 rounded-full bg-card-deep border border-card-border-muted flex items-center justify-center text-[11px] font-black z-10 shadow-xl group-hover/step:border-blue-500 transition-colors">{{ si + 1 }}</div>
            <!-- Step card -->
            <div class="bg-card-deepest border border-card-border rounded-xl p-4 shadow-sm hover:border-card-border-muted transition-all">
              <div class="flex items-center gap-2 flex-wrap">
                <div class="flex-1 min-w-0">
                  <SearchSelect
                    :modelValue="step.action"
                    @update:modelValue="step.action = $event"
                    :options="macroActionOptions"
                    placeholder="Choose action…"
                  />
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <div class="flex items-center bg-card-deep px-3 py-1.5 rounded-lg border border-card-border">
                    <span class="text-[10px] text-card-text-dim font-bold uppercase mr-2">Delay</span>
                    <input
                      type="number"
                      class="w-8 text-center text-xs font-mono text-blue-400 bg-transparent outline-none"
                      :value="step.delay || 0"
                      @input="step.delay = parseInt(($event.target as HTMLInputElement).value) || 0"
                      min="0"
                      step="100"
                    />
                    <span class="text-[10px] text-card-text-dim ml-1">ms</span>
                  </div>
                </div>
                <div class="flex gap-0.5 shrink-0">
                  <button class="p-1.5 flex items-center justify-center rounded-lg bg-transparent text-card-text-dim cursor-pointer transition-all duration-150 text-xs hover:bg-card-deep hover:text-card-text border border-transparent" @click="moveMacroStep(keys[index], si, 'up')" :disabled="si === 0" title="Move up" type="button">
                    <i class="mdi mdi-arrow-up"></i>
                  </button>
                  <button class="p-1.5 flex items-center justify-center rounded-lg bg-transparent text-card-text-dim cursor-pointer transition-all duration-150 text-xs hover:bg-card-deep hover:text-card-text border border-transparent" @click="moveMacroStep(keys[index], si, 'down')" :disabled="si === (keys[index].macroSteps || []).length - 1" title="Move down" type="button">
                    <i class="mdi mdi-arrow-down"></i>
                  </button>
                  <button class="p-1.5 flex items-center justify-center rounded-lg bg-transparent text-card-text-dim cursor-pointer transition-all duration-150 text-xs hover:bg-red-500/10 hover:text-red-400 border border-transparent" @click="removeMacroStep(keys[index], si)" title="Remove step" type="button">
                    <i class="mdi mdi-close"></i>
                  </button>
                </div>
              </div>
              <!-- Code editor for JS macro step -->
              <div v-if="step.action === 'javascript'" class="w-full mt-3">
                <CodeEditor :modelValue="step.code || ''" @update:modelValue="step.code = $event" />
              </div>
              <!-- URL field for URL-based actions -->
              <div v-if="step.action === 'openurl'" class="w-full mt-3">
                <label class="block text-[10px] uppercase tracking-widest font-bold text-card-text-muted mb-1.5">URL to open</label>
                <input class="field-input w-full bg-card-deepest border border-card-border rounded-lg px-3 py-2 text-sm text-card-text font-mono outline-none placeholder:text-card-text-dim" v-model="step.openurl" placeholder="https://example.com" />
              </div>
              <!-- Bookmark selector for bookmark actions -->
              <div v-if="['openbookmark', 'openbookmarknewtab', 'openbookmarkbackgroundtab'].includes(step.action)" class="w-full mt-3">
                <label class="block text-[10px] uppercase tracking-widest font-bold text-card-text-muted mb-1.5">Bookmark</label>
                <SearchSelect
                  :modelValue="step.bookmark || ''"
                  @update:modelValue="step.bookmark = $event"
                  :options="{ Bookmarks: bookmarks.map(bm => ({ value: bm.title, label: bm.title || bm.url, sublabel: bm.url })) }"
                  placeholder="Search bookmarks…"
                />
              </div>
            </div>
          </div>
        </div>
        <p v-if="(keys[index].macroSteps || []).length === 0" class="text-[13px] text-card-text-muted m-0 py-2">
          No steps yet. Add actions that will run sequentially when this shortcut is pressed.
        </p>
      </div>
    </div>
  </div>
</template>
