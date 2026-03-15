<script setup lang="ts">
import { useImportExport } from '@/composables/useImportExport'

const { importJson, importKeys } = useImportExport()
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- JSON Import -->
    <div>
      <div class="mb-4">
        <h3 class="text-base font-bold text-text-primary mb-1">Import JSON</h3>
        <p class="text-text-secondary mb-3">Paste a JSON array of shortcut objects to import them.</p>
      </div>
      
      <div class="bg-surface-card border border-border-default rounded-[14px] p-5 shadow-sm">
        <textarea class="w-full px-3 py-[9px] border-[1.5px] border-border-default rounded-lg text-sm text-text-primary bg-surface-input transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)] resize-y font-mono min-h-40 text-[13px] leading-relaxed" v-model="importJson" rows="8" placeholder='[
  {
    "key": "ctrl+shift+y",
    "action": "javascript",
    "label": "Extract page title",
    "code": "alert(document.title);"
  }
]'></textarea>
        <div class="mt-4 pt-4 border-t border-dashed border-border-light flex justify-between items-center">
          <span class="text-[13px] text-text-muted flex items-center gap-1.5"><i class="mdi mdi-code-json"></i> Valid JSON required</span>
          <button class="px-4 py-2 border-none rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-200 inline-flex items-center gap-1.5 bg-accent text-white shadow-[0_1px_3px_var(--blue-bg)] hover:bg-accent-hover" @click="importKeys">
            <i class="mdi mdi-import"></i> Import JSON
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
