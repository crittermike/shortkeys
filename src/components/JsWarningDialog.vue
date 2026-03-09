<script setup lang="ts">
import { computed } from 'vue'
import { useCommunityPacks } from '@/composables/useCommunityPacks'

const { jsWarningPack, confirmJsInstall, dismissJsWarning } = useCommunityPacks()

const jsShortcutCount = computed(() => {
  if (!jsWarningPack.value) return 0
  return jsWarningPack.value.fullShortcuts.filter(s => s.action === 'javascript').length
})
</script>

<template>
  <Transition name="modal">
    <div v-if="jsWarningPack" class="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[16px] flex items-center justify-center p-6" @click.self="dismissJsWarning">
      <div class="modal-panel bg-surface-card rounded-3xl w-full max-w-[580px] max-h-[85vh] flex flex-col overflow-hidden shadow-xl border border-border-light !max-w-[520px] !rounded-[14px]">
        <div class="flex items-center gap-4 px-8 py-6 text-white relative !bg-[#f59e0b] shadow-[0_4px_12px_rgba(245,158,11,0.25)]">
          <span class="text-4xl shrink-0"><i class="mdi mdi-alert"></i></span>
          <div>
            <h2 class="text-lg font-bold m-0">Security Warning</h2>
            <p class="text-[13px] opacity-85 mt-1 m-0">Custom JavaScript detected</p>
          </div>
          <button class="absolute top-3 right-3 bg-white/20 border-none text-white w-7 h-7 rounded-full flex items-center justify-center cursor-pointer text-base transition-colors duration-150 hover:bg-white/35" @click="dismissJsWarning" type="button">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
        <div class="px-8 py-6 overflow-y-auto flex-1">
          <p class="text-sm leading-relaxed mb-3 text-text-primary last:mb-0">
            This community pack (<strong>{{ jsWarningPack.name }}</strong> by {{ jsWarningPack.author }}) contains <strong>{{ jsShortcutCount }} custom JavaScript shortcut{{ jsShortcutCount !== 1 ? 's' : '' }}</strong> that will run on web pages you visit.
          </p>
          <p class="text-sm leading-relaxed mb-3 text-text-primary last:mb-0">
            Only install packs from authors you trust. Malicious code could potentially access your personal data on websites.
          </p>
        </div>
        <div class="flex justify-end gap-3 px-8 py-5 border-t border-border-default bg-surface-elevated">
          <button class="btn btn-secondary" @click="dismissJsWarning" type="button">Cancel</button>
          <button class="btn bg-danger text-white transition-all duration-200 font-semibold px-5 py-2.5 hover:bg-danger-hover hover:-translate-y-px hover:shadow-md" @click="confirmJsInstall" type="button">
            Install anyway
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
