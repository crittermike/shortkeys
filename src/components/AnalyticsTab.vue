<script setup lang="ts">
import { onMounted } from 'vue'
import { useAnalytics } from '@/composables/useAnalytics'

const {
  loaded, trackingEnabled, mostUsed, unusedShortcuts, recentlyUsed,
  totalUsage, chartPeriod, chartData, chartMax,
  loadAnalytics, clearAnalytics, toggleTracking,
} = useAnalytics()

onMounted(() => {
  loadAnalytics()
})

function formatDate(ts: number): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(ts: number): string {
  if (!ts) return '—'
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
</script>

<template>
  <div v-if="!loaded" class="flex flex-col items-center justify-center py-12 px-6 text-center text-text-muted text-sm">
    <i class="mdi mdi-loading mdi-spin mr-1.5"></i> Loading analytics...
  </div>

  <div v-else>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div class="flex gap-6">
        <div class="flex flex-col gap-1 relative after:content-[''] after:absolute after:-right-3 after:top-[10%] after:h-[80%] after:w-px after:bg-border-default after:opacity-50 last:after:hidden">
          <span class="text-4xl font-bold text-text-primary leading-none tracking-tight">{{ totalUsage }}</span>
          <span class="text-[13px] text-text-muted font-medium">total triggers</span>
        </div>
        <div class="flex flex-col gap-1 relative after:content-[''] after:absolute after:-right-3 after:top-[10%] after:h-[80%] after:w-px after:bg-border-default after:opacity-50 last:after:hidden">
          <span class="text-4xl font-bold text-text-primary leading-none tracking-tight">{{ mostUsed.length }}</span>
          <span class="text-[13px] text-text-muted font-medium">shortcuts used</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-4xl font-bold text-text-primary leading-none tracking-tight">{{ unusedShortcuts.length }}</span>
          <span class="text-[13px] text-text-muted font-medium">never used</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer select-none">
          <input type="checkbox" class="w-4 h-4 accent-accent cursor-pointer" :checked="trackingEnabled" @change="toggleTracking" />
          <span>Track usage</span>
        </label>
        <button class="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-border-default rounded-lg bg-surface-elevated text-text-secondary text-[13px] cursor-pointer whitespace-nowrap transition-all duration-200 hover:bg-surface-hover hover:text-danger hover:border-danger" @click="clearAnalytics" type="button">
          <i class="mdi mdi-delete-outline text-[15px]"></i> Clear data
        </button>
      </div>
    </div>

    <!-- Usage over time chart -->
    <div class="mb-8" v-if="totalUsage > 0 || mostUsed.length > 0">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-base font-bold text-text-primary mb-0">Usage over time</h3>
        <div class="flex bg-surface-elevated rounded-lg p-0.5 gap-0.5 border border-border-light">
          <button
            :class="['px-3 py-1 border-none rounded-md bg-transparent text-text-secondary text-xs font-medium cursor-pointer transition-all duration-200 hover:text-text-primary', chartPeriod === 7 && '!bg-accent !text-white !shadow-sm !font-semibold']"
            @click="chartPeriod = 7"
            type="button"
          >7 days</button>
          <button
            :class="['px-3 py-1 border-none rounded-md bg-transparent text-text-secondary text-xs font-medium cursor-pointer transition-all duration-200 hover:text-text-primary', chartPeriod === 30 && '!bg-accent !text-white !shadow-sm !font-semibold']"
            @click="chartPeriod = 30"
            type="button"
          >30 days</button>
        </div>
      </div>
      <div class="relative bg-surface-elevated border border-border-light rounded-[14px] p-5 pb-6">
        <svg class="w-full h-40" viewBox="0 0 600 160" preserveAspectRatio="none">
          <!-- Grid lines -->
          <line x1="0" y1="40" x2="600" y2="40" class="stroke-border-light" stroke-width="1" stroke-dasharray="4 4" />
          <line x1="0" y1="80" x2="600" y2="80" class="stroke-border-light" stroke-width="1" stroke-dasharray="4 4" />
          <line x1="0" y1="120" x2="600" y2="120" class="stroke-border-light" stroke-width="1" stroke-dasharray="4 4" />
          <!-- Bars -->
          <g v-for="(bar, i) in chartData" :key="bar.date">
            <rect
              :x="(i * (600 / chartData.length)) + 2"
              :y="140 - (bar.total / chartMax * 120)"
              :width="Math.max(2, (600 / chartData.length) - 4)"
              :height="Math.max(bar.total > 0 ? 2 : 0, bar.total / chartMax * 120)"
              class="fill-accent opacity-85 transition-all duration-200 hover:opacity-100 hover:brightness-110"
              rx="2"
            />
            <title>{{ bar.label }}: {{ bar.total }} trigger{{ bar.total === 1 ? '' : 's' }}</title>
          </g>
        </svg>
        <div class="relative h-5 mt-1">
          <span v-for="(bar, i) in chartData" :key="bar.date"
            :style="{ left: ((i + 0.5) * (100 / chartData.length)) + '%' }"
            class="absolute -translate-x-1/2 text-[11px] text-text-secondary whitespace-nowrap"
            v-show="chartPeriod === 7 || i % 5 === 0 || i === chartData.length - 1"
          >{{ bar.label }}</span>
        </div>
      </div>
    </div>

    <!-- Most used shortcuts -->
    <div class="mb-8" v-if="mostUsed.length > 0">
      <h3 class="text-base font-bold text-text-primary mb-3">Most used shortcuts</h3>
      <div class="bg-surface-elevated border border-border-light rounded-[14px] overflow-hidden shadow-sm">
        <div class="flex items-center px-4 py-2 bg-surface-elevated text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          <span class="w-8 text-center">#</span>
          <span class="flex-1 min-w-0">Shortcut</span>
          <span class="w-[140px] shrink-0">Key</span>
          <span class="w-16 text-center shrink-0">Uses</span>
          <span class="w-[100px] shrink-0 text-right">Last used</span>
        </div>
        <div v-for="(item, i) in mostUsed" :key="item.id" class="flex items-center px-5 py-3 gap-3 border-t border-border-light transition-colors duration-150 hover:bg-surface-hover">
          <span class="w-8 text-center text-text-muted font-semibold text-[13px]">{{ i + 1 }}</span>
          <span class="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-text-primary">{{ item.label }}</span>
          <span class="w-[140px] shrink-0 flex gap-0.5 flex-wrap">
            <kbd v-for="part in item.key.split('+')" :key="part" class="inline-block px-2 py-0.5 bg-surface-hover border border-border-default rounded-md font-mono text-[11px] text-text-secondary capitalize">{{ part }}</kbd>
          </span>
          <span class="w-16 text-center shrink-0">
            <span class="inline-block px-3 py-0.5 bg-accent-bg text-accent rounded-full text-xs font-semibold">{{ item.count }}</span>
          </span>
          <span class="w-[100px] shrink-0 text-xs text-text-muted text-right">{{ timeAgo(item.lastUsed) }}</span>
        </div>
      </div>
    </div>

    <!-- Recently used -->
    <div class="mb-8" v-if="recentlyUsed.length > 0">
      <h3 class="text-base font-bold text-text-primary mb-3">Recently used</h3>
      <div class="bg-surface-elevated border border-border-light rounded-[14px] overflow-hidden shadow-sm">
        <div class="flex items-center px-4 py-2 bg-surface-elevated text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          <span class="flex-1 min-w-0">Shortcut</span>
          <span class="w-[140px] shrink-0">Key</span>
          <span class="w-[100px] shrink-0 text-right">When</span>
        </div>
        <div v-for="item in recentlyUsed" :key="item.id" class="flex items-center px-5 py-3 gap-3 border-t border-border-light transition-colors duration-150 hover:bg-surface-hover">
          <span class="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-text-primary">{{ item.label }}</span>
          <span class="w-[140px] shrink-0 flex gap-0.5 flex-wrap">
            <kbd v-for="part in item.key.split('+')" :key="part" class="inline-block px-2 py-0.5 bg-surface-hover border border-border-default rounded-md font-mono text-[11px] text-text-secondary capitalize">{{ part }}</kbd>
          </span>
          <span class="w-[100px] shrink-0 text-xs text-text-muted text-right">{{ timeAgo(item.lastUsed) }}</span>
        </div>
      </div>
    </div>

    <!-- Unused shortcuts -->
    <div class="mb-8" v-if="unusedShortcuts.length > 0">
      <h3 class="text-base font-bold text-text-primary mb-3">Never used</h3>
      <p class="text-text-secondary mb-3">These shortcuts have never been triggered. Consider removing them or adjusting their key bindings.</p>
      <div class="flex flex-col gap-1">
        <div v-for="item in unusedShortcuts" :key="item.id" class="flex justify-between items-center px-4 py-2 bg-surface-elevated border border-border-light rounded-xl gap-3">
          <span class="text-[13px] text-text-secondary overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">{{ item.label }}</span>
          <span class="flex gap-0.5 shrink-0">
            <kbd v-for="part in item.key.split('+')" :key="part" class="inline-block px-2 py-0.5 bg-surface-hover border border-border-default rounded-md font-mono text-[11px] text-text-secondary capitalize">{{ part }}</kbd>
          </span>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="totalUsage === 0 && unusedShortcuts.length === 0" class="text-center py-12 text-text-muted">
      <i class="mdi mdi-chart-line" style="font-size: 48px; color: var(--text-muted)"></i>
      <p class="mt-2 text-sm">No shortcuts configured yet.</p>
      <p class="text-text-secondary text-sm">Add some shortcuts in the Shortcuts tab, then use them to see analytics here.</p>
    </div>

    <p class="flex items-center gap-1.5 text-xs text-text-muted mt-4 px-4 py-3 bg-surface-elevated rounded-xl border border-border-light shadow-sm">
      <i class="mdi mdi-shield-check-outline text-base text-success"></i>
      All analytics data is stored locally on this device and never sent anywhere.
    </p>
  </div>
</template>
