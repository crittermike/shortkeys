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

    <!-- Community Packs -->
    <div class="import-section packs-section">
      <div class="section-header">
        <h3 class="section-title">Community packs</h3>
        <p class="tab-desc">Shortcut packs created by the community. <a href="https://github.com/crittermike/shortkeys/tree/master/packs/community" target="_blank">Submit your own on GitHub.</a></p>
      </div>

      <!-- Loading -->
      <div v-if="communityLoading" class="community-loading">
        <i class="mdi mdi-loading mdi-spin"></i>
        <span>Loading community packs…</span>
      </div>

      <!-- Error -->
      <div v-else-if="communityError" class="community-error">
        <i class="mdi mdi-alert-circle-outline"></i>
        <span>{{ communityError }}</span>
        <button class="btn btn-secondary btn-sm" @click="fetchCommunityPacks" type="button">
          <i class="mdi mdi-refresh"></i> Retry
        </button>
      </div>

      <!-- Loaded -->
      <template v-else>
        <!-- Filters -->
        <div class="community-filters">
          <div class="search-wrap">
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
        <div v-if="filteredCommunityPacks.length === 0" class="community-empty">
          <i class="mdi mdi-package-variant-closed"></i>
          <span>No community packs found{{ communitySearchQuery ? ' matching your search' : '' }}</span>
        </div>

        <!-- Pack grid -->
        <div v-else class="pack-grid">
          <div v-for="pack in filteredCommunityPacks" :key="pack.id" class="pack-card" :style="{ borderTopColor: pack.color, '--pack-color': pack.color }">
            <div class="pack-header">
              <div class="pack-icon">{{ pack.icon }}</div>
              <div class="pack-info">
                <div class="pack-name">{{ pack.name }} <span class="community-badge">Community</span></div>
                <div class="pack-meta">{{ pack.shortcutCount }} shortcuts</div>
              </div>
            </div>
            <div class="pack-author"><i class="mdi mdi-account"></i> {{ pack.author }}</div>
            <div class="pack-desc">{{ pack.description }}</div>
            <div class="pack-actions">
              <button class="btn btn-secondary btn-sm" @click="previewCommunityPack = pack" type="button">Preview</button>
              <button class="btn btn-primary btn-sm" @click="requestInstallCommunityPack(pack)" type="button">
                <i class="mdi mdi-plus"></i> Add
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.community-filters {
  margin-bottom: 24px;
}
.community-filters .search-wrap {
  max-width: 400px;
}
.community-loading, .community-error, .community-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-muted);
  background: var(--bg-elevated);
  border-radius: var(--radius-2xl);
  border: 1px dashed var(--border);
  gap: 12px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.community-loading .mdi, .community-error .mdi, .community-empty .mdi {
  font-size: 32px;
  opacity: 0.5;
}
.community-error {
  color: var(--danger);
  background: var(--danger-bg);
  border-color: var(--danger-border);
}
.pack-author {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: -6px;
}
.community-badge {
  background: var(--bg-hover);
  padding: 2px 8px;
  border-radius: var(--radius-md);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
