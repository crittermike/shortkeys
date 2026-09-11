<script setup lang="ts">
import { computed } from 'vue'
import { useVimSettings } from '@/composables/useVimSettings'
import { VIM_LIMITS } from '@/utils/vim-settings'
import { normalizeHintChars } from '@/utils/link-hints'

const { vimSettings, persistVimSettings, resetVimSettings, isVimCustomized } = useVimSettings()

/** What the hint labels will actually be built from. */
const effectiveChars = computed(() => normalizeHintChars(vimSettings.value.hintChars).toLowerCase())

function update(): void {
  persistVimSettings()
}

function toggle(key: 'hintWaitForEnter' | 'hintShadowDom' | 'hintScrollables' | 'hintSkipCovered' | 'smoothScroll'): void {
  vimSettings.value[key] = !vimSettings.value[key]
  persistVimSettings(0)
}
</script>

<template>
  <p class="tab-desc">
    Settings for the Vim-style navigation actions — link hints and scrolling.
    They apply to every shortcut that uses those actions.
  </p>

  <!-- ── Link hints ── -->
  <section class="vim-card">
    <header class="vim-card-header">
      <i class="mdi mdi-cursor-default-click"></i>
      <div>
        <h3>Link hints</h3>
        <p>Shown by the "Click a link via keyboard" actions.</p>
      </div>
    </header>

    <div class="vim-row">
      <div class="vim-row-label">
        <span>How you pick a link</span>
        <small>Type the label shown on each link, or type the link's own text and pick a number.</small>
      </div>
      <div class="segmented">
        <button
          :class="['segmented-btn', { active: vimSettings.hintMode === 'chars' }]"
          @click="vimSettings.hintMode = 'chars'; persistVimSettings(0)"
          type="button"
        >Type the label</button>
        <button
          :class="['segmented-btn', { active: vimSettings.hintMode === 'filter' }]"
          @click="vimSettings.hintMode = 'filter'; persistVimSettings(0)"
          type="button"
        >Type the text</button>
      </div>
    </div>

    <div class="vim-row" v-if="vimSettings.hintMode === 'chars'">
      <div class="vim-row-label">
        <span>Hint keys</span>
        <small>
          Letters used to build the labels. Using <strong class="mono">{{ effectiveChars }}</strong> —
          letters and digits only, duplicates dropped.
        </small>
      </div>
      <input
        class="field-input mono vim-input"
        v-model="vimSettings.hintChars"
        @input="update"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
      />
    </div>

    <div class="vim-row" v-if="vimSettings.hintMode === 'filter'">
      <div class="vim-row-label">
        <span>Wait for Enter</span>
        <small>When one link is left, press Enter to open it instead of opening it right away.</small>
      </div>
      <button :class="['toggle', { on: vimSettings.hintWaitForEnter }]" @click="toggle('hintWaitForEnter')" type="button">
        <span class="toggle-knob"></span>
      </button>
    </div>

    <div class="vim-row">
      <div class="vim-row-label">
        <span>Detection</span>
        <small>
          Thorough also reads computed styles, so buttons built from plain
          <code>div</code>s get a hint. Standard is faster on very large pages.
        </small>
      </div>
      <div class="segmented">
        <button
          :class="['segmented-btn', { active: vimSettings.hintDetection === 'standard' }]"
          @click="vimSettings.hintDetection = 'standard'; persistVimSettings(0)"
          type="button"
        >Standard</button>
        <button
          :class="['segmented-btn', { active: vimSettings.hintDetection === 'thorough' }]"
          @click="vimSettings.hintDetection = 'thorough'; persistVimSettings(0)"
          type="button"
        >Thorough</button>
      </div>
    </div>

    <div class="vim-row">
      <div class="vim-row-label">
        <span>Look inside web components</span>
        <small>Finds links in shadow DOM, which many modern sites use.</small>
      </div>
      <button :class="['toggle', { on: vimSettings.hintShadowDom }]" @click="toggle('hintShadowDom')" type="button">
        <span class="toggle-knob"></span>
      </button>
    </div>

    <div class="vim-row">
      <div class="vim-row-label">
        <span>Hint scrollable areas</span>
        <small>Blue hints pick a panel to scroll — useful for sidebars and chat panes.</small>
      </div>
      <button :class="['toggle', { on: vimSettings.hintScrollables }]" @click="toggle('hintScrollables')" type="button">
        <span class="toggle-knob"></span>
      </button>
    </div>

    <div class="vim-row">
      <div class="vim-row-label">
        <span>Skip covered elements</span>
        <small>Hides hints for links behind a dialog or an overlay.</small>
      </div>
      <button :class="['toggle', { on: vimSettings.hintSkipCovered }]" @click="toggle('hintSkipCovered')" type="button">
        <span class="toggle-knob"></span>
      </button>
    </div>
  </section>

  <!-- ── Scrolling ── -->
  <section class="vim-card">
    <header class="vim-card-header">
      <i class="mdi mdi-arrow-up-down"></i>
      <div>
        <h3>Scrolling</h3>
        <p>Used by every scroll action. Scrolling runs in the page, so holding a key keeps moving smoothly.</p>
      </div>
    </header>

    <div class="vim-row">
      <div class="vim-row-label">
        <span>Smooth scrolling</span>
        <small>Animate the scroll. A shortcut with its own smooth-scrolling setting still wins.</small>
      </div>
      <button :class="['toggle', { on: vimSettings.smoothScroll }]" @click="toggle('smoothScroll')" type="button">
        <span class="toggle-knob"></span>
      </button>
    </div>

    <div class="vim-row">
      <div class="vim-row-label">
        <span>Scroll step</span>
        <small>Pixels moved by "Scroll up" and "Scroll down".</small>
      </div>
      <div class="vim-number">
        <input
          class="field-input"
          type="number"
          v-model.number="vimSettings.scrollStepSize"
          :min="VIM_LIMITS.scrollStepSize.min"
          :max="VIM_LIMITS.scrollStepSize.max"
          @input="update"
        />
        <span class="vim-unit">px</span>
      </div>
    </div>

    <div class="vim-row">
      <div class="vim-row-label">
        <span>Large scroll step</span>
        <small>Pixels moved by the "more" scroll actions.</small>
      </div>
      <div class="vim-number">
        <input
          class="field-input"
          type="number"
          v-model.number="vimSettings.scrollBigStepSize"
          :min="VIM_LIMITS.scrollBigStepSize.min"
          :max="VIM_LIMITS.scrollBigStepSize.max"
          @input="update"
        />
        <span class="vim-unit">px</span>
      </div>
    </div>

    <div class="vim-row" :class="{ disabled: !vimSettings.smoothScroll }">
      <div class="vim-row-label">
        <span>Animation duration</span>
        <small>Time to cover one step. Lower feels snappier; 0 is instant.</small>
      </div>
      <div class="vim-number">
        <input
          class="field-input"
          type="number"
          v-model.number="vimSettings.scrollDuration"
          :min="VIM_LIMITS.scrollDuration.min"
          :max="VIM_LIMITS.scrollDuration.max"
          :disabled="!vimSettings.smoothScroll"
          @input="update"
        />
        <span class="vim-unit">ms</span>
      </div>
    </div>
  </section>

  <div class="vim-footer">
    <span class="vim-footer-note">Changes save automatically and apply to open tabs right away.</span>
    <button class="btn btn-secondary btn-sm" @click="resetVimSettings" :disabled="!isVimCustomized()" type="button">
      <i class="mdi mdi-restore"></i> Reset to defaults
    </button>
  </div>
</template>

<style scoped>
.vim-card {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: var(--radius-lg, 12px);
  margin-bottom: 16px;
}

.vim-card-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.vim-card-header i {
  font-size: 20px;
  color: var(--blue, #4361ee);
  line-height: 1.2;
}

.vim-card-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--text, #111827);
}

.vim-card-header p {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--text-secondary, #4b5563);
}

.vim-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 14px 18px;
  border-top: 1px solid var(--border-light, var(--border, #f1f2f6));
}

.vim-row:first-of-type { border-top: none; }
.vim-row.disabled { opacity: 0.55; }

.vim-row-label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.vim-row-label > span {
  font-size: 13.5px;
  font-weight: 550;
  color: var(--text, #111827);
}

.vim-row-label small {
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-muted, #9ca3af);
}

.vim-row-label code {
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11.5px;
  padding: 0 3px;
  border-radius: 3px;
  background: var(--bg-elevated, #f3f4f8);
}

.vim-input { width: 220px; flex-shrink: 0; }

.vim-number {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.vim-number .field-input { width: 96px; }

.vim-unit {
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
}

.segmented {
  display: flex;
  flex-shrink: 0;
  border: 1.5px solid var(--border, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
}

.segmented-btn {
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 500;
  border: none;
  background: var(--bg-input, #fff);
  color: var(--text-secondary, #4b5563);
  cursor: pointer;
  white-space: nowrap;
}

.segmented-btn + .segmented-btn { border-left: 1.5px solid var(--border, #e5e7eb); }
.segmented-btn:hover { background: var(--bg-hover, #eef0f5); }

.segmented-btn.active {
  background: var(--blue, #4361ee);
  color: #fff;
}

.vim-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 2px 0;
}

.vim-footer-note {
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
}
</style>
