<script setup lang="ts">
import { useShortcuts } from '@/composables/useShortcuts'
import { useImportExport } from '@/composables/useImportExport'

const { keys } = useShortcuts()
const { shareLink, copyExport, generateShareLink } = useImportExport()
</script>

<template>
  <div class="flex justify-between items-center mb-3">
    <p class="text-text-secondary mb-0">Copy the JSON below to back up or share your shortcuts.</p>
    <div class="flex gap-2">
      <button class="px-4 py-2 border-none rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 bg-surface-card text-text-secondary border border-border-default hover:bg-surface-hover hover:text-text-primary !px-3 !py-1 !text-xs" @click="copyExport">
        <i class="mdi mdi-content-copy"></i> Copy JSON
      </button>
      <button class="px-4 py-2 border-none rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 bg-accent text-white shadow-[0_1px_3px_var(--blue-bg)] hover:bg-accent-hover !px-3 !py-1 !text-xs" @click="generateShareLink">
        <i class="mdi mdi-share-variant"></i> Share Link
      </button>
    </div>
  </div>
  <div v-if="shareLink" class="mb-3 p-3 px-4 bg-info-bg border border-info-border rounded-[10px]">
    <input class="w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)] font-mono" :value="shareLink" readonly @click="($event.target as HTMLInputElement).select()" />
    <p class="text-xs text-accent mt-2 mb-0">Anyone with Shortkeys can import your shortcuts from this link.</p>
  </div>
  <pre class="bg-surface-card border border-border-default rounded-[10px] p-4 font-mono text-xs overflow-auto max-h-[500px] text-text-primary">{{ JSON.stringify(keys, null, 2) }}</pre>
</template>
