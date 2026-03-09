<script setup lang="ts">
import { computed } from 'vue'
import { useCommunityPacks } from '@/composables/useCommunityPacks'

const { 
  previewCommunityPack, 
  communityConflictMode, 
  communityExactDuplicateCount,
  getCommunityPackConflicts, 
  requestInstallCommunityPack 
} = useCommunityPacks()

const conflicts = computed(() => previewCommunityPack.value ? getCommunityPackConflicts(previewCommunityPack.value) : new Map())
const addCount = computed(() => {
  if (!previewCommunityPack.value) return 0
  let count = previewCommunityPack.value.shortcuts.length - communityExactDuplicateCount.value
  if (communityConflictMode.value === 'skip') {
    for (const c of conflicts.value.values()) {
      if (c.type === 'key') count--
    }
  }
  return count
})
const keyConflictCount = computed(() => {
  let count = 0
  for (const c of conflicts.value.values()) {
    if (c.type === 'key') count++
  }
  return count
})
</script>

<template>
  <Transition name="modal">
    <div v-if="previewCommunityPack" class="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[16px] flex items-center justify-center p-6" @click.self="previewCommunityPack = null">
      <div class="modal-panel bg-surface-card rounded-3xl w-full max-w-[580px] max-h-[85vh] flex flex-col overflow-hidden shadow-xl border border-border-light">
        <div class="flex items-center gap-4 px-8 py-6 text-white relative" :style="{ background: previewCommunityPack.color }">
          <span class="text-4xl shrink-0">{{ previewCommunityPack.icon }}</span>
          <div>
            <h2 class="text-lg font-bold m-0">{{ previewCommunityPack.name }}</h2>
            <p class="text-[13px] opacity-85 mt-1 m-0">{{ previewCommunityPack.description }}</p>
            <div class="flex items-center gap-2 mt-2 text-[13px] opacity-90">
              <i class="mdi mdi-account"></i> {{ previewCommunityPack.author }}
              <span class="bg-white/25 px-1.5 py-0.5 rounded-[5px] text-[10px] uppercase tracking-wider font-semibold">Community</span>
            </div>
          </div>
          <button class="absolute top-3 right-3 bg-white/20 border-none text-white w-7 h-7 rounded-full flex items-center justify-center cursor-pointer text-base transition-colors duration-150 hover:bg-white/35" @click="previewCommunityPack = null" type="button">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
        <div class="px-8 py-6 overflow-y-auto flex-1">
          <div v-if="previewCommunityPack.hasJavaScript" class="flex items-center gap-2 px-4.5 py-3 bg-warning-bg border border-warning-border text-warning-text rounded-[14px] mb-4 text-[13px] font-medium">
            <i class="mdi mdi-alert-outline text-lg"></i>
            This pack contains custom JavaScript. Only install if you trust the author.
          </div>

          <div class="flex flex-col gap-0.5">
            <div
              v-for="(s, si) in previewCommunityPack.shortcuts"
              :key="s.key"
              class="flex justify-between items-center px-4 py-3 rounded-[10px] gap-3 transition-colors duration-200 odd:bg-surface-elevated hover:bg-surface-hover"
              :class="{
                'bg-warning-bg border-l-[3px] border-l-warning-border pl-[9px] rounded-l-lg transition-all duration-400': conflicts.has(si) && conflicts.get(si)!.type === 'key',
                'bg-info-bg border-l-[3px] border-l-text-muted pl-[9px] opacity-60 rounded-l-lg transition-all duration-400': conflicts.has(si) && conflicts.get(si)!.type === 'exact',
              }"
            >
              <span class="text-[13px] text-text-primary">
                {{ s.label || s.action }}
                <span v-if="conflicts.has(si) && conflicts.get(si)!.type === 'exact'" class="inline-block text-[10px] px-[7px] py-[2px] rounded-lg ml-1.5 font-semibold uppercase tracking-wider align-middle transition-all duration-400 bg-surface-hover text-text-secondary">duplicate</span>
                <span v-else-if="conflicts.has(si)" class="inline-block text-[10px] px-[7px] py-[2px] rounded-lg ml-1.5 font-semibold uppercase tracking-wider align-middle transition-all duration-400 bg-warning-bg text-warning-text">conflict</span>
              </span>
              <span class="flex gap-[3px] shrink-0">
                <kbd v-for="(part, pi) in s.key.split('+')" :key="pi" class="inline-block px-[7px] py-[2px] bg-surface-hover border border-border-default rounded-[5px] font-mono text-[11px] text-text-secondary capitalize">{{ part }}</kbd>
              </span>
            </div>
          </div>

          <div v-if="communityExactDuplicateCount > 0" class="flex items-center gap-2 px-4 py-3 bg-info-bg border border-info-border text-info-text rounded-[14px] mt-3 text-[13px] font-medium shadow-sm transition-all duration-400">
            <i class="mdi mdi-information-outline"></i>
            {{ communityExactDuplicateCount }} exact duplicate{{ communityExactDuplicateCount > 1 ? 's' : '' }} will be skipped automatically (same key and action already exist)
          </div>

          <div v-if="keyConflictCount > 0" class="mt-4 px-4 py-3 bg-warning-bg border border-warning-border rounded-[10px]">
            <div class="text-[13px] font-semibold text-warning-text mb-2.5 flex items-center gap-1.5">
              <i class="mdi mdi-alert-outline"></i>
              {{ keyConflictCount }} shortcut{{ keyConflictCount > 1 ? 's' : '' }} conflict with your existing shortcuts
            </div>
            <div class="flex flex-col gap-2">
              <label class="flex items-center gap-2 text-[13px] text-text-secondary cursor-pointer">
                <input type="radio" v-model="communityConflictMode" value="replace" />
                <span>Replace my shortcuts with pack versions</span>
              </label>
              <label class="flex items-center gap-2 text-[13px] text-text-secondary cursor-pointer">
                <input type="radio" v-model="communityConflictMode" value="skip" />
                <span>Skip conflicting shortcuts</span>
              </label>
              <label class="flex items-center gap-2 text-[13px] text-text-secondary cursor-pointer">
                <input type="radio" v-model="communityConflictMode" value="keep" />
                <span>Keep both (I'll sort it out later)</span>
              </label>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 px-8 py-5 border-t border-border-default bg-surface-elevated">
          <button class="btn btn-secondary" @click="previewCommunityPack = null" type="button">Cancel</button>
          <button class="btn btn-primary" @click="requestInstallCommunityPack(previewCommunityPack)" type="button">
            <i class="mdi mdi-plus"></i> Add {{ addCount }} shortcut{{ addCount !== 1 ? 's' : '' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
