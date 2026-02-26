<script setup lang="ts">
import { useCommunityPacks } from '@/composables/useCommunityPacks'

const { 
  previewCommunityPack, 
  communityConflictMode, 
  getCommunityPackConflicts, 
  requestInstallCommunityPack 
} = useCommunityPacks()
</script>

<template>
  <Transition name="modal">
    <div v-if="previewCommunityPack" class="modal-overlay" @click.self="previewCommunityPack = null">
      <div class="modal-panel">
        <div class="modal-header" :style="{ background: previewCommunityPack.color }">
          <span class="modal-icon">{{ previewCommunityPack.icon }}</span>
          <div>
            <h2 class="modal-title">{{ previewCommunityPack.name }}</h2>
            <p class="modal-subtitle">{{ previewCommunityPack.description }}</p>
            <div class="modal-author-badge">
              <i class="mdi mdi-account"></i> {{ previewCommunityPack.author }}
              <span class="community-badge">Community</span>
            </div>
          </div>
          <button class="modal-close" @click="previewCommunityPack = null" type="button">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
        <div class="modal-body">
          <div v-if="previewCommunityPack.hasJavaScript" class="modal-js-warning">
            <i class="mdi mdi-alert-outline"></i>
            This pack contains custom JavaScript. Only install if you trust the author.
          </div>

          <div class="modal-shortcuts">
            <div v-for="s in previewCommunityPack.shortcuts" :key="s.key" class="modal-shortcut-row">
              <span class="modal-shortcut-label">{{ s.label || s.action }}</span>
              <span class="modal-shortcut-keys">
                <kbd v-for="(part, pi) in s.key.split('+')" :key="pi">{{ part }}</kbd>
              </span>
            </div>
          </div>

          <div v-if="getCommunityPackConflicts(previewCommunityPack).length > 0" class="modal-conflicts">
            <div class="modal-conflict-header">
              <i class="mdi mdi-alert-outline"></i>
              {{ getCommunityPackConflicts(previewCommunityPack).length }} shortcut{{ getCommunityPackConflicts(previewCommunityPack).length > 1 ? 's' : '' }} conflict with your existing shortcuts
            </div>
            <div class="modal-conflict-options">
              <label class="radio-option">
                <input type="radio" v-model="communityConflictMode" value="replace" />
                <span>Replace my shortcuts with pack versions</span>
              </label>
              <label class="radio-option">
                <input type="radio" v-model="communityConflictMode" value="skip" />
                <span>Skip conflicting shortcuts</span>
              </label>
              <label class="radio-option">
                <input type="radio" v-model="communityConflictMode" value="keep" />
                <span>Keep both (I'll sort it out later)</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="previewCommunityPack = null" type="button">Cancel</button>
          <button class="btn btn-primary" @click="requestInstallCommunityPack(previewCommunityPack)" type="button">
            <i class="mdi mdi-plus"></i> Add {{ previewCommunityPack.shortcuts.length }} shortcuts
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-author-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.9;
}
.community-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}
.modal-js-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  font-weight: 500;
}
.modal-js-warning .mdi {
  font-size: 16px;
}
</style>
