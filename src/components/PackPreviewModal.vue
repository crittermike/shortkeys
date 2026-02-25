<script setup lang="ts">
import { usePacks } from '@/composables/usePacks'

const { previewPack, packConflictMode, getPackConflicts, installPack } = usePacks()
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
            <div v-for="s in previewPack.shortcuts" :key="s.key" class="modal-shortcut-row">
              <span class="modal-shortcut-label">{{ s.label || s.action }}</span>
              <span class="modal-shortcut-keys">
                <kbd v-for="(part, pi) in s.key.split('+')" :key="pi">{{ part }}</kbd>
              </span>
            </div>
          </div>

          <div v-if="getPackConflicts(previewPack).length > 0" class="modal-conflicts">
            <div class="modal-conflict-header">
              <i class="mdi mdi-alert-outline"></i>
              {{ getPackConflicts(previewPack).length }} shortcut{{ getPackConflicts(previewPack).length > 1 ? 's' : '' }} conflict with your existing shortcuts
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
            <i class="mdi mdi-plus"></i> Add {{ previewPack.shortcuts.length }} shortcuts
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
