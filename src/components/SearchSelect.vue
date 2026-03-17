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
  const result: { group: string; value: string; label: string; sublabel?: string }[] = []
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
    (o) => o.label.toLowerCase().includes(q) || o.group.toLowerCase().includes(q) || (o.sublabel && o.sublabel.toLowerCase().includes(q)),
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
  <div class="search-select relative w-full">
    <button v-if="!isOpen" class="w-full px-3 py-[9px] border border-border-default rounded-xl bg-surface text-sm text-text-primary cursor-pointer flex items-center justify-between text-left transition-[border-color,box-shadow] duration-150 hover:border-border-default focus:outline-none focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]" @click="open" type="button">
      <span :class="['flex-1 overflow-hidden text-ellipsis whitespace-nowrap', { 'text-text-muted': !modelValue }]">
        {{ selectedLabel || placeholder || 'Choose…' }}
      </span>
      <i class="mdi mdi-chevron-down text-text-muted text-base shrink-0"></i>
    </button>

    <div v-else class="relative">
      <input
        ref="inputRef"
        class="w-full px-3 py-[9px] border border-blue-500/50 rounded-t-xl text-sm text-text-primary bg-surface outline-none shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
        type="text"
        v-model="query"
        :placeholder="selectedLabel || 'Type to search…'"
        @keydown="onKeydown"
      />
      <div ref="listRef" class="absolute top-full left-0 right-0 max-h-[280px] overflow-y-auto bg-surface border border-border-default border-t-0 rounded-b-xl shadow-2xl z-[100] p-1.5 backdrop-blur-sm">
        <template v-if="filtered.length">
          <template v-for="(opts, group) in groupedFiltered" :key="group">
            <div class="px-3 pt-2 pb-1.5 text-xs font-bold uppercase tracking-wider text-text-muted bg-surface-card sticky top-0 rounded-md">{{ group }}</div>
            <button
              v-for="opt in opts"
              :key="opt.value"
              :class="[
                'block w-full px-3 py-[9px] pl-3 my-[3px] border-none rounded-lg bg-none text-left text-sm text-text-primary cursor-pointer transition-all duration-150',
                {
                  'text-accent font-semibold': opt.value === modelValue,
                  'highlighted bg-surface-elevated pl-4 text-accent': filtered.indexOf(opt) === highlightIndex,
                },
              ]"
              @mouseenter="highlightIndex = filtered.indexOf(opt)"
              @click="select(opt.value)"
              type="button"
            >
              <span class="block">{{ opt.label }}</span>
              <span v-if="opt.sublabel" class="block text-xs text-text-muted whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{{ opt.sublabel }}</span>
            </button>
          </template>
        </template>
        <div v-else class="p-4 text-center text-text-muted text-[13px] italic">No matching actions</div>
      </div>
    </div>
  </div>
</template>
