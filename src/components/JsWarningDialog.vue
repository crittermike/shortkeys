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
    <div v-if="jsWarningPack" class="modal-overlay" @click.self="dismissJsWarning">
      <div class="modal-panel warning-panel">
        <div class="modal-header warning-header">
          <span class="modal-icon"><i class="mdi mdi-alert"></i></span>
          <div>
            <h2 class="modal-title">Security Warning</h2>
            <p class="modal-subtitle">Custom JavaScript detected</p>
          </div>
          <button class="modal-close" @click="dismissJsWarning" type="button">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
        <div class="modal-body">
          <p class="warning-text">
            This community pack (<strong>{{ jsWarningPack.name }}</strong> by {{ jsWarningPack.author }}) contains <strong>{{ jsShortcutCount }} custom JavaScript shortcut{{ jsShortcutCount !== 1 ? 's' : '' }}</strong> that will run on web pages you visit.
          </p>
          <p class="warning-text">
            Only install packs from authors you trust. Malicious code could potentially access your personal data on websites.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="dismissJsWarning" type="button">Cancel</button>
          <button class="btn btn-warning" @click="confirmJsInstall" type="button">
            Install anyway
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.warning-panel {
  max-width: 520px;
  border-radius: var(--radius-xl);
}
.warning-header {
  background: #f59e0b;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
}
.warning-text {
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 12px;
  color: var(--text);
}
.warning-text:last-child {
  margin-bottom: 0;
}
.btn-warning {
  background: var(--danger);
  color: #fff;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  font-weight: 600;
  padding: 10px 20px;
}
.btn-warning:hover {
  background: var(--danger-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
</style>
