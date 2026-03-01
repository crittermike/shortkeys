<script setup lang="ts">
import { computed } from 'vue'
import { usePacks } from '@/composables/usePacks'

const { previewPack, packConflictMode, getPackConflicts, exactDuplicateCount, installPack } = usePacks()

const conflicts = computed(() => previewPack.value ? getPackConflicts(previewPack.value) : new Map())
const addCount = computed(() => {
  if (!previewPack.value) return 0
  let count = previewPack.value.shortcuts.length - exactDuplicateCount.value
  if (packConflictMode.value === 'skip') {
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
    <div v-if="previewPack" class="modal-overlay" @click.self="previewPack = null">
      <div class="modal-panel">
        <div class="modal-header" :style="{ background: previewPack.color }">
          <span class="modal-icon">{{ previewPack.icon }}</span>
          <div>
            <h2 class="modal-title">{{ previewPack.name }}</h2>
            <p class="modal-subtitle">{{ previewPack.description }}</p>
          </div>
          <button class="modal-close" @click="previewPack = null" type="button">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="modal-shortcuts">
            <div
              v-for="(s, si) in previewPack.shortcuts"
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

          <div v-if="exactDuplicateCount > 0" class="modal-exact-notice">
            <i class="mdi mdi-information-outline"></i>
            {{ exactDuplicateCount }} exact duplicate{{ exactDuplicateCount > 1 ? 's' : '' }} will be skipped automatically (same key and action already exist)
          </div>

          <div v-if="keyConflictCount > 0" class="modal-conflicts">
            <div class="modal-conflict-header">
              <i class="mdi mdi-alert-outline"></i>
              {{ keyConflictCount }} shortcut{{ keyConflictCount > 1 ? 's' : '' }} conflict with your existing shortcuts
            </div>
            <div class="modal-conflict-options">
              <label class="radio-option">
                <input type="radio" v-model="packConflictMode" value="replace" />
                <span>Replace my shortcuts with pack versions</span>
              </label>
              <label class="radio-option">
                <input type="radio" v-model="packConflictMode" value="skip" />
                <span>Skip conflicting shortcuts</span>
              </label>
              <label class="radio-option">
                <input type="radio" v-model="packConflictMode" value="keep" />
                <span>Keep both (I'll sort it out later)</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="previewPack = null" type="button">Cancel</button>
          <button class="btn btn-primary" @click="installPack(previewPack)" type="button">
            <i class="mdi mdi-plus"></i> Add {{ addCount }} shortcut{{ addCount !== 1 ? 's' : '' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-shortcut-conflict {
  background: var(--warning-bg);
  border-left: 3px solid var(--warning-border);
  padding-left: 9px;
}
.modal-shortcut-exact {
  background: var(--info-bg);
  border-left: 3px solid var(--text-muted);
  padding-left: 9px;
  opacity: 0.6;
}
.conflict-badge {
  display: inline-block;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  margin-left: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  vertical-align: middle;
}
.conflict-badge.key {
  background: var(--warning-bg);
  color: var(--warning-text);
}
.conflict-badge.exact {
  background: var(--bg-hover);
  color: var(--text-secondary);
}
.modal-exact-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--info-bg);
  border: 1px solid var(--info-border);
  color: var(--info-text);
  border-radius: var(--radius-lg);
  margin-top: 12px;
  font-size: 13px;
  font-weight: 500;
}
</style>
