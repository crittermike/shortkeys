<script setup lang="ts">
import { isBuiltInAction } from '@/utils/actions-registry'
import ActionParameters from '@/components/ActionParameters.vue'
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

</script>

<template>
  <div class="shortcut-details">

    <article v-if="isBuiltInAction(keys[index].action)" class="alert alert-info">
      <i class="mdi mdi-information-outline"></i>
      <span>Also available via the browser's native <strong>Keyboard Shortcuts</strong> settings. <a href="https://www.shortkeys.app/docs/#faq-browser-shortcuts-vs-options" target="_blank">Learn more &rarr;</a></span>
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
      <ActionParameters :action="keys[index].action" :parameters="keys[index]" :bookmarks="bookmarks" />
      <div v-if="keys[index].action === 'macro'" class="macro-builder">
        <div class="field-label-row">
          <label class="macro-label"><i class="mdi mdi-playlist-play"></i> Macro steps <span class="hint">(max {{ MAX_MACRO_STEPS }})</span></label>
          <button class="btn-chain-link" @click="convertToSingleAction(keys[index])" type="button">
            <i class="mdi mdi-arrow-left"></i> Use single action
          </button>
        </div>
        <div class="macro-steps">
          <div v-for="(step, si) in (keys[index].macroSteps || [])" :key="si" class="macro-step">
            <span class="macro-step-num">{{ si + 1 }}</span>
            <div class="macro-step-action">
              <SearchSelect
                :modelValue="step.action"
                @update:modelValue="step.action = $event"
                :options="macroActionOptions"
                placeholder="Choose action…"
              />
            </div>
            <div class="macro-step-delay">
              <input
                type="number"
                class="field-input delay-input"
                :value="step.delay || 0"
                @input="step.delay = parseInt(($event.target as HTMLInputElement).value) || 0"
                min="0"
                step="100"
                title="Delay before this step (ms)"
              />
              <span class="delay-unit">ms</span>
            </div>
            <div class="macro-step-controls">
              <button class="btn-icon btn-sm" @click="moveMacroStep(keys[index], si, 'up')" :disabled="si === 0" title="Move up" type="button">
                <i class="mdi mdi-arrow-up"></i>
              </button>
              <button class="btn-icon btn-sm" @click="moveMacroStep(keys[index], si, 'down')" :disabled="si === (keys[index].macroSteps || []).length - 1" title="Move down" type="button">
                <i class="mdi mdi-arrow-down"></i>
              </button>
              <button class="btn-icon btn-sm btn-delete" @click="removeMacroStep(keys[index], si)" title="Remove step" type="button">
                <i class="mdi mdi-close"></i>
              </button>
            </div>
            <!-- Code editor for JS macro step -->
            <div v-if="step.action === 'javascript'" class="macro-step-code">
              <CodeEditor :modelValue="step.code || ''" @update:modelValue="step.code = $event" />
            </div>
            <div class="macro-step-parameters">
              <ActionParameters :action="step.action" :parameters="step" :bookmarks="bookmarks" />
            </div>
          </div>
        </div>
        <button
          v-if="(keys[index].macroSteps || []).length < MAX_MACRO_STEPS"
          class="btn-add-step"
          @click="addMacroStep(keys[index])"
          type="button"
        >
          <i class="mdi mdi-plus"></i> Add step
        </button>
        <p v-if="(keys[index].macroSteps || []).length === 0" class="macro-empty">
          No steps yet. Add actions that will run sequentially when this shortcut is pressed.
        </p>
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
</template>
