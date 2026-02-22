<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

interface Option {
  value: string
  label: string
  sublabel?: string
}

interface GroupedOptions {
  [group: string]: Option[]
}

const props = defineProps<{
  modelValue: string
  options: GroupedOptions
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const query = ref('')
const isOpen = ref(false)
const highlightIndex = ref(0)
const inputRef = ref<HTMLInputElement>()
const listRef = ref<HTMLDivElement>()

const allOptions = computed(() => {
  const result: { group: string; value: string; label: string }[] = []
  for (const [group, opts] of Object.entries(props.options)) {
    for (const opt of opts) {
      result.push({ group, ...opt })
    }
  }
  return result
})

const selectedLabel = computed(() => {
  const found = allOptions.value.find((o) => o.value === props.modelValue)
  return found?.label ?? ''
})

const filtered = computed(() => {
  if (!query.value) return allOptions.value
  const q = query.value.toLowerCase()
  return allOptions.value.filter(
    (o) => o.label.toLowerCase().includes(q) || o.group.toLowerCase().includes(q),
  )
})

const groupedFiltered = computed(() => {
  const groups: Record<string, typeof filtered.value> = {}
  for (const opt of filtered.value) {
    if (!groups[opt.group]) groups[opt.group] = []
    groups[opt.group].push(opt)
  }
  return groups
})

function open() {
  isOpen.value = true
  query.value = ''
  highlightIndex.value = 0
  nextTick(() => inputRef.value?.focus())
}

function close() {
  isOpen.value = false
  query.value = ''
}

function select(value: string) {
  emit('update:modelValue', value)
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightIndex.value = Math.min(highlightIndex.value + 1, filtered.value.length - 1)
    scrollToHighlighted()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightIndex.value = Math.max(highlightIndex.value - 1, 0)
    scrollToHighlighted()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (filtered.value[highlightIndex.value]) {
      select(filtered.value[highlightIndex.value].value)
    }
  } else if (e.key === 'Escape') {
    close()
  }
}

function scrollToHighlighted() {
  nextTick(() => {
    const el = listRef.value?.querySelector('.highlighted')
    el?.scrollIntoView({ block: 'nearest' })
  })
}

watch(query, () => { highlightIndex.value = 0 })

function onClickOutside(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('.search-select')) close()
}

watch(isOpen, (val) => {
  if (val) {
    setTimeout(() => document.addEventListener('click', onClickOutside), 0)
  } else {
    document.removeEventListener('click', onClickOutside)
  }
})
</script>

<template>
  <div class="search-select">
    <button v-if="!isOpen" class="ss-trigger" @click="open" type="button">
      <span :class="['ss-trigger-text', { placeholder: !modelValue }]">
        {{ selectedLabel || placeholder || 'Choose…' }}
      </span>
      <i class="mdi mdi-chevron-down ss-chevron"></i>
    </button>

    <div v-else class="ss-dropdown-wrap">
      <input
        ref="inputRef"
        class="ss-search"
        type="text"
        v-model="query"
        :placeholder="selectedLabel || 'Type to search…'"
        @keydown="onKeydown"
      />
      <div ref="listRef" class="ss-dropdown">
        <template v-if="filtered.length">
          <template v-for="(opts, group) in groupedFiltered" :key="group">
            <div class="ss-group-label">{{ group }}</div>
            <button
              v-for="opt in opts"
              :key="opt.value"
              :class="[
                'ss-option',
                {
                  selected: opt.value === modelValue,
                  highlighted: filtered.indexOf(opt) === highlightIndex,
                },
              ]"
              @mouseenter="highlightIndex = filtered.indexOf(opt)"
              @click="select(opt.value)"
              type="button"
            >
              <span class="ss-opt-label">{{ opt.label }}</span>
              <span v-if="opt.sublabel" class="ss-opt-sub">{{ opt.sublabel }}</span>
            </button>
          </template>
        </template>
        <div v-else class="ss-empty">No matching actions</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-select { position: relative; width: 100%; }

.ss-trigger {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  background: var(--bg-input, #fff);
  font-size: 14px;
  color: var(--text, #1a1a2e);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ss-trigger:hover { border-color: var(--text-placeholder, #cbd5e1); }
.ss-trigger:focus { outline: none; border-color: var(--blue, #4361ee); box-shadow: 0 0 0 3px var(--blue-bg, rgba(67,97,238,0.12)); }

.ss-trigger-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ss-trigger-text.placeholder { color: var(--text-muted, #94a3b8); }
.ss-chevron { color: var(--text-muted, #94a3b8); font-size: 16px; flex-shrink: 0; }

.ss-dropdown-wrap { position: relative; }

.ss-search {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--blue, #4361ee);
  border-radius: 6px 6px 0 0;
  font-size: 14px;
  color: var(--text, #1a1a2e);
  background: var(--bg-input, #fff);
  outline: none;
  box-shadow: 0 0 0 3px var(--blue-bg, rgba(67,97,238,0.12));
}

.ss-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 280px;
  overflow-y: auto;
  background: var(--bg-input, #fff);
  border: 1px solid var(--border, #e2e8f0);
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  z-index: 50;
}

.ss-group-label {
  padding: 6px 12px 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted, #94a3b8);
  background: var(--bg-elevated, #f8fafc);
  position: sticky;
  top: 0;
}

.ss-option {
  display: block;
  width: 100%;
  padding: 7px 12px 7px 20px;
  border: none;
  background: none;
  text-align: left;
  font-size: 13px;
  color: var(--text, #334155);
  cursor: pointer;
}
.ss-option.highlighted { background: var(--bg-hover, #f1f5f9); }
.ss-option.selected { color: var(--blue, #4361ee); font-weight: 600; }

.ss-opt-label { display: block; }
.ss-opt-sub {
  display: block;
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.ss-empty { padding: 16px; text-align: center; color: var(--text-muted, #94a3b8); font-size: 13px; }
</style>
