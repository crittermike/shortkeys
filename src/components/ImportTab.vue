<script setup lang="ts">
import { onMounted } from 'vue'
import { ALL_PACKS } from '@/packs'
import { usePacks } from '@/composables/usePacks'
import { useImportExport } from '@/composables/useImportExport'
import { useCommunityPacks } from '@/composables/useCommunityPacks'

const { previewPack } = usePacks()
const { importJson, importKeys } = useImportExport()
const {
  communityLoading,
  communityError,
  communitySearchQuery,
  communityCategory,
  communityCategories,
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
        <p class="tab-desc">Shortcut packs created by the community. <a href="https://github.com/crittermike/shortkeys/tree/master/community-packs" target="_blank">Submit your own on GitHub.</a></p>
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
          <div v-if="communityCategories.length > 1" class="category-chips">
            <button
              :class="['category-chip', { active: communityCategory === 'all' }]"
              @click="communityCategory = 'all'"
              type="button"
            >All</button>
            <button
              v-for="cat in communityCategories"
              :key="cat"
              :class="['category-chip', { active: communityCategory === cat }]"
              @click="communityCategory = cat"
              type="button"
            >{{ cat }}</button>
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

<style scoped>
.community-filters {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}
.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.category-chip {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.category-chip:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.category-chip.active {
  background: var(--blue);
  color: #fff;
  border-color: var(--blue);
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
  border-radius: 12px;
  border: 1px dashed var(--border);
  gap: 12px;
}
.community-loading .mdi, .community-error .mdi, .community-empty .mdi {
  font-size: 32px;
  opacity: 0.5;
}
.community-error {
  color: #ef4444;
  background: #fef2f2;
  border-color: #fecaca;
}
.pack-author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: -6px;
}
.community-badge {
  background: var(--bg-hover);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  color: var(--text-muted);
}
.community-filters .search-wrap {
  max-width: 400px;
}
</style>
