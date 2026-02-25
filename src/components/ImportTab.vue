<script setup lang="ts">
import { ALL_PACKS } from '@/packs'
import { usePacks } from '@/composables/usePacks'
import { useImportExport } from '@/composables/useImportExport'

const { previewPack } = usePacks()
const { importJson, importKeys } = useImportExport()
</script>

<template>
  <div class="import-tab-container">
    <!-- Pack Library -->
    <div class="import-section packs-section">
      <div class="section-header">
        <h3 class="section-title">Shortcut packs</h3>
        <p class="tab-desc">One-click install curated shortcut collections. They'll appear as a group you can customize or remove.</p>
      </div>
      
      <div class="pack-grid">
        <div v-for="pack in ALL_PACKS" :key="pack.id" class="pack-card" :style="{ borderTopColor: pack.color, '--pack-color': pack.color }">
          <div class="pack-header">
            <div class="pack-icon">{{ pack.icon }}</div>
            <div class="pack-info">
              <div class="pack-name">{{ pack.name }}</div>
              <div class="pack-meta">{{ pack.shortcuts.length }} shortcuts</div>
            </div>
          </div>
          <div class="pack-desc">{{ pack.description }}</div>
          <div class="pack-actions">
            <button class="btn btn-secondary btn-sm" @click="previewPack = pack" type="button">Preview</button>
            <button class="btn btn-primary btn-sm" @click="previewPack = pack" type="button">
              <i class="mdi mdi-plus"></i> Add
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="import-divider"></div>

    <!-- JSON Import -->
    <div class="import-section json-section">
      <div class="section-header">
        <h3 class="section-title">Import JSON</h3>
        <p class="tab-desc">Paste a JSON array of shortcut objects to import them.</p>
      </div>
      
      <div class="json-import-card">
        <textarea class="field-textarea mono json-textarea" v-model="importJson" rows="8" placeholder='[
  {
    "key": "ctrl+shift+y",
    "action": "javascript",
    "label": "Extract page title",
    "code": "alert(document.title);"
  }
]'></textarea>
        <div class="action-bar json-action-bar">
          <span class="json-hint"><i class="mdi mdi-code-json"></i> Valid JSON required</span>
          <button class="btn btn-primary" @click="importKeys">
            <i class="mdi mdi-import"></i> Import JSON
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
