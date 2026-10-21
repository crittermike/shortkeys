<script setup lang="ts">
import type { ActionParameters } from '@/utils/url-matching'
import { SCROLL_ACTIONS } from '@/utils/actions-registry'
import { BOOKMARK_ACTIONS } from '@/utils/action-parameters'
import SearchSelect from './SearchSelect.vue'

defineProps<{
  action: string
  parameters: ActionParameters
  bookmarks: { title: string; url: string }[]
}>()
</script>

<template>
  <div v-if="(SCROLL_ACTIONS as readonly string[]).includes(action)" class="toggle-row-inline">
    <span class="toggle-label-sm">Smooth scrolling</span>
    <button :class="['toggle', { on: parameters.smoothScrolling }]" @click="parameters.smoothScrolling = !parameters.smoothScrolling" type="button">
      <span class="toggle-knob"></span>
    </button>
  </div>
  <div v-if="BOOKMARK_ACTIONS.includes(action)" class="detail-field">
    <label>Bookmark</label>
    <SearchSelect
      :modelValue="parameters.bookmark || ''"
      @update:modelValue="parameters.bookmark = $event"
      :options="{ Bookmarks: bookmarks.map(bm => ({ value: bm.title, label: bm.title || bm.url, sublabel: bm.url })) }"
      placeholder="Search bookmarks…"
    />
  </div>
  <div v-if="action === 'gototabbytitle'" class="detail-field">
    <label>Title to match <span class="hint">(wildcards)</span></label>
    <input class="field-input" v-model="parameters.matchtitle" placeholder="*Gmail*" />
  </div>
  <div v-if="action === 'gototab'" class="detail-row">
    <div class="detail-field flex-1">
      <label>URL to match <a class="hint-link" target="_blank" href="https://developer.chrome.com/extensions/match_patterns">pattern help →</a></label>
      <input class="field-input" v-model="parameters.matchurl" placeholder="*://mail.google.com/*" />
    </div>
    <div class="detail-field flex-1">
      <label>Fallback URL <span class="hint">(if no match)</span></label>
      <input class="field-input" v-model="parameters.openurl" placeholder="https://mail.google.com" />
    </div>
  </div>
  <div v-if="['gototab', 'gototabbytitle'].includes(action)" class="toggle-row-inline">
    <span class="toggle-label-sm">Current window only</span>
    <button :class="['toggle', { on: parameters.currentWindow }]" @click="parameters.currentWindow = !parameters.currentWindow" type="button">
      <span class="toggle-knob"></span>
    </button>
  </div>
  <div v-if="action === 'gototabbyindex'" class="detail-field" style="max-width: 160px">
    <label>Tab index <span class="hint">(from 1)</span></label>
    <input class="field-input" type="number" :value="parameters.matchindex" @input="parameters.matchindex = ($event.target as HTMLInputElement).value" min="1" />
  </div>
  <div v-if="action === 'buttonnexttab'" class="detail-field">
    <label>Button CSS selector</label>
    <input class="field-input mono" v-model="parameters.button" placeholder="#submit-btn" />
  </div>
  <div v-if="action === 'openurl'" class="detail-field">
    <label>URL to open</label>
    <input class="field-input mono" v-model="parameters.openurl" placeholder="https://example.com" />
  </div>
  <div v-if="['grouptab', 'togglegrouptab', 'namegroup'].includes(action)" class="detail-field">
    <label>Group name</label>
    <input class="field-input" v-model="parameters.groupname" placeholder="e.g. Research" />
  </div>
  <div v-if="action === 'openapp'" class="detail-field">
    <label>App ID <span class="hint">(from extensions page)</span></label>
    <input class="field-input mono" v-model="parameters.openappid" />
  </div>
  <div v-if="action === 'trigger'" class="detail-field" style="max-width: 250px">
    <label>Shortcut to trigger</label>
    <input class="field-input shortcut-input" v-model="parameters.trigger" placeholder="e.g. ctrl+b" />
  </div>
  <div v-if="action === 'inserttext'" class="detail-field">
    <label>Text to insert</label>
    <textarea class="field-textarea mono" v-model="parameters.inserttext" rows="2" placeholder="Text to type into the focused field…"></textarea>
  </div>
</template>
