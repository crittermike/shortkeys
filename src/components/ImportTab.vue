<script setup lang="ts">
import { ALL_PACKS } from '@/packs'
import { usePacks } from '@/composables/usePacks'
import { useImportExport } from '@/composables/useImportExport'

const { previewPack } = usePacks()
const { importJson, importKeys } = useImportExport()
</script>

<template>
  <!-- Pack Library -->
  <h3 class="section-title">Shortcut Packs</h3>
  <p class="tab-desc">One-click install curated shortcut collections. They'll appear as a group you can customize or remove.</p>
  <div class="pack-grid">
    <div v-for="pack in ALL_PACKS" :key="pack.id" class="pack-card" :style="{ borderTopColor: pack.color }">
      <div class="pack-icon">{{ pack.icon }}</div>
      <div class="pack-info">
        <div class="pack-name">{{ pack.name }}</div>
        <div class="pack-desc">{{ pack.description }}</div>
        <div class="pack-meta">{{ pack.shortcuts.length }} shortcuts</div>
      </div>
      <div class="pack-actions">
        <button class="btn btn-secondary btn-sm" @click="previewPack = pack" type="button">Preview</button>
        <button class="btn btn-primary btn-sm" @click="previewPack = pack" type="button">
          <i class="mdi mdi-plus"></i> Add
        </button>
      </div>
    </div>
  </div>

  <!-- JSON Import -->
  <h3 class="section-title" style="margin-top: 32px">Import JSON</h3>
  <p class="tab-desc">Paste a JSON array of shortcut objects to import them.</p>
  <textarea class="field-textarea mono" v-model="importJson" rows="8" placeholder='[{"key":"ctrl+b","action":"newtab"}]'></textarea>
  <div class="action-bar">
    <span></span>
    <button class="btn btn-primary" @click="importKeys">
      <i class="mdi mdi-import"></i> Import JSON
    </button>
  </div>
</template>
