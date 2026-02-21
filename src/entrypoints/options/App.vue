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

const activeTab = ref(0)
const keys = ref<KeySetting[]>([{}] as KeySetting[])
const bookmarks = ref<string[]>([])
const importJson = ref('')
const expandedRow = ref<string | null>(null)
const snackMessage = ref('')

function showSnack(msg: string) {
  snackMessage.value = msg
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

async function saveShortcuts() {
  keys.value.forEach((key) => {
    if (!key.id) key.id = uuid()
    key.sites = key.sites || ''
    key.sitesArray = key.sites.split('\n')
  })
  await chrome.storage.local.set({
    keys: JSON.stringify(keys.value),
    random: Math.random(),
  })
  showSnack('Shortcuts have been saved!')
}

function importKeys() {
  try {
    const parsed = JSON.parse(importJson.value)
    keys.value = keys.value.concat(parsed)
    showSnack('Imported successfully!')
  } catch {
    showSnack('Invalid JSON. Please check and try again.')
  }
}

function deleteShortcut(key: KeySetting) {
  if (confirm('Delete this shortcut?')) {
    keys.value = keys.value.filter((k) => k.key !== key.key)
  }
}

function toggleDetails(key: string) {
  expandedRow.value = expandedRow.value === key ? null : key
}

function isScrollAction(action: string): boolean {
  return (SCROLL_ACTIONS as readonly string[]).includes(action)
}

onMounted(async () => {
  // Load saved keys
  const saved = await chrome.storage.local.get('keys')
  if (saved.keys) {
    keys.value = JSON.parse(saved.keys)
  }

  // Load bookmarks
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
  <section class="section">
    <!-- Navigation -->
    <nav class="navbar is-light mb-5" role="navigation">
      <div class="navbar-brand">
        <span class="navbar-item has-text-weight-bold">SHORTKEYS</span>
      </div>
      <div class="navbar-menu">
        <div class="navbar-start">
          <a
            class="navbar-item"
            href="https://chrome.google.com/webstore/detail/shortkeys-custom-keyboard/logpjaacgmcbpdkdchjiaagddngobkck/reviews"
            target="_blank"
          >
            Review
          </a>
          <a
            class="navbar-item"
            href="https://github.com/mikecrittenden/shortkeys/wiki/How-To-Use-Shortkeys"
            target="_blank"
          >
            Documentation
          </a>
          <a
            class="navbar-item"
            href="https://github.com/mikecrittenden/shortkeys/issues"
            target="_blank"
          >
            Support
          </a>
          <a
            class="navbar-item"
            href="https://github.com/mikecrittenden/shortkeys"
            target="_blank"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>

    <!-- Snack bar -->
    <div
      v-if="snackMessage"
      class="notification is-success is-light"
      style="position: fixed; bottom: 20px; right: 20px; z-index: 999"
    >
      {{ snackMessage }}
    </div>

    <!-- Tabs -->
    <div class="tabs is-toggle is-fullwidth">
      <ul>
        <li :class="{ 'is-active': activeTab === 0 }">
          <a @click="activeTab = 0">Shortcuts</a>
        </li>
        <li :class="{ 'is-active': activeTab === 1 }">
          <a @click="activeTab = 1">Import</a>
        </li>
        <li :class="{ 'is-active': activeTab === 2 }">
          <a @click="activeTab = 2">Export</a>
        </li>
      </ul>
    </div>

    <!-- Shortcuts Tab -->
    <div v-show="activeTab === 0">
      <!-- User Scripts Warning -->
      <article v-if="needsUserScripts()" class="message is-warning">
        <div class="message-header">
          <p>Allow User Scripts</p>
        </div>
        <div class="message-body">
          In order for JavaScript actions to work, you must first allow User Scripts in your
          browser extension details. Then come back and save your shortcuts.
        </div>
      </article>

      <!-- Shortcuts Table -->
      <table class="table is-fullwidth is-striped">
        <thead>
          <tr>
            <th>Shortcut</th>
            <th>Label</th>
            <th>Behavior</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(row, index) in keys" :key="row.key || index">
            <tr>
              <td>
                <input
                  class="input"
                  type="text"
                  placeholder="Example: ctrl+a"
                  v-model="row.key"
                />
              </td>
              <td>
                <input class="input" type="text" v-model="row.label" />
              </td>
              <td>
                <div class="select">
                  <select v-model="row.action">
                    <optgroup
                      v-for="(group, name) in ACTION_CATEGORIES"
                      :key="name"
                      :label="name"
                    >
                      <option v-for="opt in group" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </optgroup>
                  </select>
                </div>
              </td>
              <td>
                <button
                  class="button is-small"
                  @click="toggleDetails(row.key || String(index))"
                >
                  <span class="icon">
                    <i
                      :class="
                        expandedRow === (row.key || String(index))
                          ? 'mdi mdi-chevron-up'
                          : 'mdi mdi-chevron-down'
                      "
                    ></i>
                  </span>
                </button>
              </td>
              <td>
                <button class="button is-small is-danger is-outlined" @click="deleteShortcut(row)">
                  <span class="icon"><i class="mdi mdi-delete"></i></span>
                </button>
              </td>
            </tr>

            <!-- Expanded details row -->
            <tr v-if="expandedRow === (row.key || String(index))">
              <td colspan="5">
                <!-- Built-in hint -->
                <article v-if="isBuiltInAction(row.action)" class="message is-info mb-4">
                  <div class="message-body">
                    This action is also available via the browser's native Keyboard Shortcuts settings,
                    which allows it to work on the new tab page and when the address bar is focused.
                    <a
                      href="https://github.com/mikecrittenden/shortkeys/wiki/FAQs-and-Troubleshooting#Do_I_use_the_browsers_Keyboard_Shortcuts_settings_or_the_Shortkeys_options_page"
                      target="_blank"
                    >
                      More information...
                    </a>
                  </div>
                </article>

                <div class="columns">
                  <div class="column">
                    <h5 class="title is-5">Shortcut settings</h5>

                    <div v-if="isScrollAction(row.action)" class="field">
                      <label class="checkbox">
                        <input type="checkbox" v-model="row.smoothScrolling" />
                        Smooth scrolling
                      </label>
                    </div>

                    <div
                      v-if="row.action === 'gototab' || row.action === 'gototabbytitle'"
                      class="field"
                    >
                      <label class="checkbox">
                        <input type="checkbox" v-model="row.currentWindow" />
                        Search in current window only
                      </label>
                    </div>

                    <div
                      v-if="
                        ['openbookmark', 'openbookmarknewtab', 'openbookmarkbackgroundtab', 'openbookmarkbackgroundtabandclose'].includes(
                          row.action,
                        )
                      "
                      class="field"
                    >
                      <label class="label">Bookmark</label>
                      <div class="select">
                        <select v-model="row.bookmark">
                          <option v-for="bm in bookmarks" :key="bm" :value="bm">{{ bm }}</option>
                        </select>
                      </div>
                    </div>

                    <div v-if="row.action === 'javascript'" class="field">
                      <label class="label">JavaScript code</label>
                      <textarea class="textarea" v-model="row.code"></textarea>
                    </div>

                    <div v-if="row.action === 'gototabbytitle'" class="field">
                      <label class="label">Text to match (wildcards accepted)</label>
                      <textarea class="textarea" v-model="row.matchtitle"></textarea>
                    </div>

                    <div v-if="row.action === 'gototab'" class="field">
                      <label class="label">
                        URL to match
                        (<a
                          target="_blank"
                          href="https://developer.chrome.com/extensions/match_patterns"
                        >
                          Examples
                        </a>)
                      </label>
                      <textarea class="textarea" v-model="row.matchurl"></textarea>
                    </div>

                    <div v-if="row.action === 'gototab'" class="field">
                      <label class="label">URL to open if no matching tab found</label>
                      <textarea class="textarea" v-model="row.openurl"></textarea>
                    </div>

                    <div v-if="row.action === 'gototabbyindex'" class="field">
                      <label class="label">Tab index (starts from 1)</label>
                      <input class="input" type="number" v-model="row.matchindex" />
                    </div>

                    <div v-if="row.action === 'buttonnexttab'" class="field">
                      <label class="label">Button selector</label>
                      <input class="input" type="text" v-model="row.button" />
                    </div>

                    <div v-if="row.action === 'openapp'" class="field">
                      <label class="label">App ID</label>
                      <input class="input" type="text" v-model="row.openappid" />
                    </div>

                    <div v-if="row.action === 'trigger'" class="field">
                      <label class="label">Keyboard shortcut to trigger</label>
                      <input class="input" type="text" v-model="row.trigger" />
                    </div>
                  </div>

                  <div class="column">
                    <h5 class="title is-5">Activation settings</h5>

                    <div class="field">
                      <label class="checkbox">
                        <input type="checkbox" v-model="row.activeInInputs" />
                        Active while in inputs
                      </label>
                    </div>

                    <div class="field">
                      <div class="select">
                        <select v-model="row.blacklist">
                          <option v-for="opt in WEBSITE_OPTIONS" :key="String(opt.value)" :value="opt.value">
                            {{ opt.label }}
                          </option>
                        </select>
                      </div>
                    </div>

                    <div v-if="row.blacklist && row.blacklist !== 'false'" class="field">
                      <textarea
                        class="textarea"
                        v-model="row.sites"
                        placeholder="One URL pattern per line"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div class="level">
        <div class="level-left">
          <button class="button" @click="keys.push({} as KeySetting)">Add shortcut</button>
        </div>
        <div class="level-right">
          <button class="button is-primary" @click="saveShortcuts">Save shortcuts</button>
        </div>
      </div>
    </div>

    <!-- Import Tab -->
    <div v-show="activeTab === 1">
      <div class="field">
        <textarea
          class="textarea"
          v-model="importJson"
          placeholder="Paste JSON here..."
          rows="10"
        ></textarea>
      </div>
      <div class="level">
        <div class="level-left"></div>
        <div class="level-right">
          <button class="button is-primary" @click="importKeys">Import</button>
        </div>
      </div>
    </div>

    <!-- Export Tab -->
    <div v-show="activeTab === 2">
      <pre class="box">{{ JSON.stringify(keys, null, 2) }}</pre>
    </div>
  </section>
</template>

<style>
.select select {
  max-width: 300px;
}
</style>
