<script setup lang="ts">
import { computed } from 'vue'
import { useCommunityPacks } from '@/composables/useCommunityPacks'

const { 
  previewCommunityPack, 
  communityConflictMode, 
  communityExactDuplicateCount,
  getCommunityPackConflicts, 
  getCommunityPackConflictKeys,
  requestInstallCommunityPack 
} = useCommunityPacks()

const conflicts = computed(() => previewCommunityPack.value ? getCommunityPackConflicts(previewCommunityPack.value) : new Map())
const conflictKeys = computed(() => previewCommunityPack.value ? getCommunityPackConflictKeys(previewCommunityPack.value) : [])
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
            <div
              v-for="(s, si) in previewCommunityPack.shortcuts"
              :key="s.key"
              class="modal-shortcut-row"
              :class="{
                'modal-shortcut-conflict': conflicts.has(si) && conflicts.get(si)!.type === 'key',
                'modal-shortcut-exact': conflicts.has(si) && conflicts.get(si)!.type === 'exact',
              }"
            >
              <span class="modal-shortcut-label">
                {{ s.label || s.action }}
                <span v-if="conflicts.has(si) && conflicts.get(si)!.type === 'exact'" class="conflict-badge exact">duplicate</span>
                <span v-else-if="conflicts.has(si)" class="conflict-badge key">conflict</span>
              </span>
              <span class="modal-shortcut-keys">
                <kbd v-for="(part, pi) in s.key.split('+')" :key="pi">{{ part }}</kbd>
              </span>
            </div>
          </div>

          <div v-if="communityExactDuplicateCount > 0" class="modal-exact-notice">
            <i class="mdi mdi-information-outline"></i>
            {{ communityExactDuplicateCount }} exact duplicate{{ communityExactDuplicateCount > 1 ? 's' : '' }} will be skipped automatically (same key and action already exist)
          </div>

          <div v-if="conflictKeys.length > 0" class="modal-conflicts">
            <div class="modal-conflict-header">
              <i class="mdi mdi-alert-outline"></i>
              {{ conflictKeys.length }} shortcut{{ conflictKeys.length > 1 ? 's' : '' }} conflict with your existing shortcuts
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
            <i class="mdi mdi-plus"></i> Add {{ addCount }} shortcut{{ addCount !== 1 ? 's' : '' }}
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
.modal-shortcut-conflict {
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
  padding-left: 9px;
}
.modal-shortcut-exact {
  background: #f0f9ff;
  border-left: 3px solid #94a3b8;
  padding-left: 9px;
  opacity: 0.6;
}
.conflict-badge {
  display: inline-block;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  vertical-align: middle;
}
.conflict-badge.key {
  background: #fef3c7;
  color: #92400e;
}
.conflict-badge.exact {
  background: #e2e8f0;
  color: #475569;
}
.modal-exact-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  color: #0c4a6e;
  border-radius: 8px;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 500;
}
.modal-exact-notice .mdi {
  font-size: 16px;
}

[data-theme="dark"] .modal-shortcut-conflict {
  background: rgba(245, 158, 11, 0.1);
  border-left-color: #f59e0b;
}
[data-theme="dark"] .modal-shortcut-exact {
  background: rgba(148, 163, 184, 0.1);
  border-left-color: #64748b;
}
[data-theme="dark"] .conflict-badge.key {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}
[data-theme="dark"] .conflict-badge.exact {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}
[data-theme="dark"] .modal-exact-notice {
  background: rgba(14, 165, 233, 0.1);
  border-color: rgba(14, 165, 233, 0.3);
  color: #7dd3fc;
}
[data-theme="dark"] .modal-js-warning {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fbbf24;
}
</style>
