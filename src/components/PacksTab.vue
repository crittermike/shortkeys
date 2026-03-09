<script setup lang="ts">
import { onMounted } from 'vue'
import { ALL_PACKS } from '@/packs'
import { usePacks } from '@/composables/usePacks'
import { useCommunityPacks } from '@/composables/useCommunityPacks'

const { previewPack } = usePacks()
const {
  communityLoading,
  communityError,
  communitySearchQuery,
  filteredCommunityPacks,
  previewCommunityPack,
  fetchCommunityPacks,
  requestInstallCommunityPack,
} = useCommunityPacks()

onMounted(() => {
  fetchCommunityPacks()
})
</script>

<template>
  <div class="import-tab-container">
    <!-- Pack Library -->
    <div class="import-section packs-section">
      <div class="section-header">
        <h3 class="section-title">Shortcut packs</h3>
        <p class="tab-desc">One-click install curated shortcut collections. They'll appear as a group you can customize or remove.</p>
      </div>
      
      <div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        <div v-for="pack in ALL_PACKS" :key="pack.id" class="bg-surface-card border border-border-default rounded-[14px] p-5 flex flex-col gap-3.5 transition-all duration-250 relative overflow-hidden hover:shadow-md hover:-translate-y-[3px] group">
          <div class="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-250" :style="{ background: pack.color || 'var(--blue)' }"></div>
          <div class="flex items-center gap-4 relative z-[1]">
            <div class="text-[32px] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-[5deg]">{{ pack.icon }}</div>
            <div class="flex-1 flex flex-col gap-0.5">
              <div class="text-base font-bold text-text-primary tracking-tight">{{ pack.name }}</div>
              <div class="text-xs font-semibold text-text-muted uppercase tracking-wider">{{ pack.shortcuts.length }} shortcuts</div>
            </div>
          </div>
          <div class="text-[13px] text-text-secondary leading-relaxed flex-1 relative z-[1]">{{ pack.description }}</div>
          <div class="flex gap-2 mt-auto relative z-[1]">
            <button class="btn btn-secondary btn-sm flex-1 justify-center" @click="previewPack = pack" type="button">Preview</button>
            <button class="btn btn-primary btn-sm flex-1 justify-center" @click="previewPack = pack" type="button">
              <i class="mdi mdi-plus"></i> Add
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="import-divider"></div>

    <!-- Community Packs -->
    <div class="import-section packs-section">
      <div class="section-header">
        <h3 class="section-title">Community packs</h3>
        <p class="tab-desc">Shortcut packs created by the community. <a href="https://github.com/crittermike/shortkeys/tree/master/packs/community" target="_blank">Submit your own on GitHub.</a></p>
      </div>

      <!-- Loading -->
      <div v-if="communityLoading" class="flex flex-col items-center justify-center py-12 px-6 text-center text-text-muted bg-surface-elevated rounded-[18px] border border-dashed border-border-default gap-3 transition-all duration-400">
        <i class="mdi mdi-loading mdi-spin text-[32px] opacity-50"></i>
        <span>Loading community packs…</span>
      </div>

      <!-- Error -->
      <div v-else-if="communityError" class="flex flex-col items-center justify-center py-12 px-6 text-center text-text-muted bg-surface-elevated rounded-[18px] border border-dashed border-border-default gap-3 transition-all duration-400 !text-danger !bg-danger-bg !border-danger-border">
        <i class="mdi mdi-alert-circle-outline text-[32px] opacity-50"></i>
        <span>{{ communityError }}</span>
        <button class="btn btn-secondary btn-sm" @click="fetchCommunityPacks" type="button">
          <i class="mdi mdi-refresh"></i> Retry
        </button>
      </div>

      <!-- Loaded -->
      <template v-else>
        <!-- Filters -->
        <div class="mb-6">
          <div class="search-wrap max-w-[400px]">
            <i class="mdi mdi-magnify search-icon"></i>
            <input
              class="search-input"
              type="text"
              placeholder="Search community packs…"
              v-model="communitySearchQuery"
            />
            <button v-if="communitySearchQuery" class="search-clear" @click="communitySearchQuery = ''" type="button">
              <i class="mdi mdi-close"></i>
            </button>
          </div>
        </div>

        <!-- Empty -->
        <div v-if="filteredCommunityPacks.length === 0" class="flex flex-col items-center justify-center py-12 px-6 text-center text-text-muted bg-surface-elevated rounded-[18px] border border-dashed border-border-default gap-3 transition-all duration-400">
          <i class="mdi mdi-package-variant-closed text-[32px] opacity-50"></i>
          <span>No community packs found{{ communitySearchQuery ? ' matching your search' : '' }}</span>
        </div>

        <!-- Pack grid -->
        <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          <div v-for="pack in filteredCommunityPacks" :key="pack.id" class="bg-surface-card border border-border-default rounded-[14px] p-5 flex flex-col gap-3.5 transition-all duration-250 relative overflow-hidden hover:shadow-md hover:-translate-y-[3px] group">
            <div class="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-250" :style="{ background: pack.color || 'var(--blue)' }"></div>
            <div class="flex items-center gap-4 relative z-[1]">
              <div class="text-[32px] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-[5deg]">{{ pack.icon }}</div>
              <div class="flex-1 flex flex-col gap-0.5">
                <div class="text-base font-bold text-text-primary tracking-tight">{{ pack.name }} <span class="bg-surface-hover px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider font-semibold text-text-muted transition-all duration-400">Community</span></div>
                <div class="text-xs font-semibold text-text-muted uppercase tracking-wider">{{ pack.shortcutCount }} shortcuts</div>
              </div>
            </div>
            <div class="flex items-center gap-1 text-[13px] text-text-secondary -mt-1.5"><i class="mdi mdi-account"></i> {{ pack.author }}</div>
            <div class="text-[13px] text-text-secondary leading-relaxed flex-1 relative z-[1]">{{ pack.description }}</div>
            <div class="flex gap-2 mt-auto relative z-[1]">
              <button class="btn btn-secondary btn-sm flex-1 justify-center" @click="previewCommunityPack = pack" type="button">Preview</button>
              <button class="btn btn-primary btn-sm flex-1 justify-center" @click="requestInstallCommunityPack(pack)" type="button">
                <i class="mdi mdi-plus"></i> Add
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
