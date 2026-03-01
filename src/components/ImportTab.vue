<script setup lang="ts">
import { useImportExport } from '@/composables/useImportExport'

const { importJson, importKeys } = useImportExport()
</script>

<template>
  <div class="import-tab-container">
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
