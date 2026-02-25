<script setup lang="ts">
import { useShortcuts } from '@/composables/useShortcuts'
import { useImportExport } from '@/composables/useImportExport'

const { keys } = useShortcuts()
const { shareLink, copyExport, generateShareLink } = useImportExport()
</script>

<template>
  <div class="export-header">
    <p class="tab-desc">Copy the JSON below to back up or share your shortcuts.</p>
    <div class="export-actions">
      <button class="btn btn-secondary" @click="copyExport">
        <i class="mdi mdi-content-copy"></i> Copy JSON
      </button>
      <button class="btn btn-primary" @click="generateShareLink">
        <i class="mdi mdi-share-variant"></i> Share Link
      </button>
    </div>
  </div>
  <div v-if="shareLink" class="share-link-box">
    <input class="field-input mono" :value="shareLink" readonly @click="($event.target as HTMLInputElement).select()" />
    <p class="share-hint">Anyone with Shortkeys can import your shortcuts from this link.</p>
  </div>
  <pre class="export-pre">{{ JSON.stringify(keys, null, 2) }}</pre>
</template>
