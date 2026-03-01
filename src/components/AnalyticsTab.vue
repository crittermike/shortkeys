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
  <div v-if="!loaded" class="analytics-loading">
    <i class="mdi mdi-loading mdi-spin"></i> Loading analytics...
  </div>

  <div v-else class="analytics-tab">
    <!-- Header -->
    <div class="analytics-header">
      <div class="analytics-summary">
        <div class="summary-stat">
          <span class="summary-number">{{ totalUsage }}</span>
          <span class="summary-label">total triggers</span>
        </div>
        <div class="summary-stat">
          <span class="summary-number">{{ mostUsed.length }}</span>
          <span class="summary-label">shortcuts used</span>
        </div>
        <div class="summary-stat">
          <span class="summary-number">{{ unusedShortcuts.length }}</span>
          <span class="summary-label">never used</span>
        </div>
      </div>
      <div class="analytics-actions">
        <label class="toggle-label">
          <input type="checkbox" :checked="trackingEnabled" @change="toggleTracking" />
          <span>Track usage</span>
        </label>
        <button class="btn-clear" @click="clearAnalytics" type="button">
          <i class="mdi mdi-delete-outline"></i> Clear data
        </button>
      </div>
    </div>

    <!-- Usage over time chart -->
    <div class="analytics-section" v-if="totalUsage > 0 || mostUsed.length > 0">
      <div class="section-header">
        <h3 class="section-title">Usage over time</h3>
        <div class="chart-period-toggle">
          <button
            :class="['period-btn', { active: chartPeriod === 7 }]"
            @click="chartPeriod = 7"
            type="button"
          >7 days</button>
          <button
            :class="['period-btn', { active: chartPeriod === 30 }]"
            @click="chartPeriod = 30"
            type="button"
          >30 days</button>
        </div>
      </div>
      <div class="chart-container">
        <svg class="usage-chart" viewBox="0 0 600 160" preserveAspectRatio="none">
          <!-- Grid lines -->
          <line x1="0" y1="40" x2="600" y2="40" class="chart-grid" />
          <line x1="0" y1="80" x2="600" y2="80" class="chart-grid" />
          <line x1="0" y1="120" x2="600" y2="120" class="chart-grid" />
          <!-- Bars -->
          <g v-for="(bar, i) in chartData" :key="bar.date">
            <rect
              :x="(i * (600 / chartData.length)) + 2"
              :y="140 - (bar.total / chartMax * 120)"
              :width="Math.max(2, (600 / chartData.length) - 4)"
              :height="Math.max(bar.total > 0 ? 2 : 0, bar.total / chartMax * 120)"
              class="chart-bar"
              rx="2"
            />
            <title>{{ bar.label }}: {{ bar.total }} trigger{{ bar.total === 1 ? '' : 's' }}</title>
          </g>
        </svg>
        <div class="chart-labels">
          <span v-for="(bar, i) in chartData" :key="bar.date"
            :style="{ left: ((i + 0.5) * (100 / chartData.length)) + '%' }"
            class="chart-label"
            v-show="chartPeriod === 7 || i % 5 === 0 || i === chartData.length - 1"
          >{{ bar.label }}</span>
        </div>
      </div>
    </div>

    <!-- Most used shortcuts -->
    <div class="analytics-section" v-if="mostUsed.length > 0">
      <h3 class="section-title">Most used shortcuts</h3>
      <div class="analytics-table">
        <div class="table-row table-header">
          <span class="col-rank">#</span>
          <span class="col-shortcut">Shortcut</span>
          <span class="col-key">Key</span>
          <span class="col-count">Uses</span>
          <span class="col-last">Last used</span>
        </div>
        <div v-for="(item, i) in mostUsed" :key="item.id" class="table-row">
          <span class="col-rank">{{ i + 1 }}</span>
          <span class="col-shortcut">{{ item.label }}</span>
          <span class="col-key">
            <kbd v-for="part in item.key.split('+')" :key="part" class="key-badge">{{ part }}</kbd>
          </span>
          <span class="col-count">
            <span class="count-badge">{{ item.count }}</span>
          </span>
          <span class="col-last">{{ timeAgo(item.lastUsed) }}</span>
        </div>
      </div>
    </div>

    <!-- Recently used -->
    <div class="analytics-section" v-if="recentlyUsed.length > 0">
      <h3 class="section-title">Recently used</h3>
      <div class="analytics-table">
        <div class="table-row table-header">
          <span class="col-shortcut">Shortcut</span>
          <span class="col-key">Key</span>
          <span class="col-last">When</span>
        </div>
        <div v-for="item in recentlyUsed" :key="item.id" class="table-row">
          <span class="col-shortcut">{{ item.label }}</span>
          <span class="col-key">
            <kbd v-for="part in item.key.split('+')" :key="part" class="key-badge">{{ part }}</kbd>
          </span>
          <span class="col-last">{{ timeAgo(item.lastUsed) }}</span>
        </div>
      </div>
    </div>

    <!-- Unused shortcuts -->
    <div class="analytics-section" v-if="unusedShortcuts.length > 0">
      <h3 class="section-title">Never used</h3>
      <p class="tab-desc">These shortcuts have never been triggered. Consider removing them or adjusting their key bindings.</p>
      <div class="unused-list">
        <div v-for="item in unusedShortcuts" :key="item.id" class="unused-item">
          <span class="unused-label">{{ item.label }}</span>
          <span class="unused-key">
            <kbd v-for="part in item.key.split('+')" :key="part" class="key-badge">{{ part }}</kbd>
          </span>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="totalUsage === 0 && unusedShortcuts.length === 0" class="analytics-empty">
      <i class="mdi mdi-chart-line" style="font-size: 48px; color: var(--text-muted)"></i>
      <p>No shortcuts configured yet.</p>
      <p class="tab-desc">Add some shortcuts in the Shortcuts tab, then use them to see analytics here.</p>
    </div>

    <p class="analytics-privacy">
      <i class="mdi mdi-shield-check-outline"></i>
      All analytics data is stored locally on this device and never sent anywhere.
    </p>
  </div>
</template>

<style scoped>
.analytics-loading {
  text-align: center;
  padding: var(--space-3xl) 0;
  color: var(--text-muted);
  font-size: 14px;
}

.analytics-loading .mdi { margin-right: 6px; }

.analytics-header {
display: flex;
justify-content: space-between;
align-items: center;
gap: var(--space-lg);
margin-bottom: var(--space-xl);
flex-wrap: wrap;
}

.analytics-summary {
display: flex;
gap: var(--space-2xl);
}

.summary-stat {
display: flex;
flex-direction: column;
  gap: 4px;
  position: relative;
}

.summary-stat:not(:last-child)::after {
  content: '';
  position: absolute;
  right: calc(var(--space-2xl) / -2);
  top: 10%;
  height: 80%;
  width: 1px;
  background: var(--border-light);
  opacity: 0.5;
}

.summary-number {
font-size: 32px;
font-weight: 700;
color: var(--text);
line-height: 1;
letter-spacing: -0.5px;
}

.summary-label {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}

.analytics-actions {
display: flex;
align-items: center;
gap: var(--space-lg);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.toggle-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--blue);
  cursor: pointer;
}

.btn-clear {
display: inline-flex;
align-items: center;
gap: 5px;
padding: 5px 12px;
border: 1px solid var(--border);
border-radius: var(--radius-md);
background: var(--bg-elevated);
color: var(--text-secondary);
font-size: 13px;
cursor: pointer;
white-space: nowrap;
transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.btn-clear:hover {
  background: var(--bg-hover);
  color: var(--danger, #ef4444);
  border-color: var(--danger, #ef4444);
}

.btn-clear .mdi {
  font-size: 15px;
}

.analytics-section {
margin-bottom: var(--space-xl);
}

.section-header {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: var(--space-md);
}

.section-header .section-title {
  margin-bottom: 0;
}

.section-title {
font-size: 15px;
font-weight: 700;
color: var(--text);
margin-bottom: var(--space-md);
}

.chart-period-toggle {
display: flex;
gap: 2px;
background: var(--bg-elevated);
border-radius: var(--radius-md);
padding: 2px;
border: 1px solid var(--border-light);
}

.period-btn {
padding: 4px 12px;
border: none;
border-radius: 5px;
background: transparent;
color: var(--text-secondary);
font-size: 12px;
font-weight: 500;
cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.period-btn:hover { color: var(--text); }

.period-btn.active {
  background: var(--blue);
  color: white;
}

.chart-container {
  position: relative;
  background: var(--bg-elevated);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  padding: 16px 16px var(--space-xl);
}

.usage-chart {
  width: 100%;
  height: 160px;
}

.chart-grid {
  stroke: var(--border-light);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.chart-bar {
fill: var(--blue);
opacity: 0.8;
transition: opacity 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.chart-bar:hover {
  opacity: 1;
}

.chart-labels {
  position: relative;
  height: 20px;
  margin-top: 4px;
}

.chart-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}


.analytics-table {
background: var(--bg-elevated);
border: 1px solid var(--border-light);
border-radius: var(--radius-xl);
overflow: hidden;
transition: box-shadow 0.15s ease;
}

.table-row {
display: flex;
align-items: center;
padding: 10px 16px;
gap: var(--space-md);
border-bottom: 1px solid var(--border-light);
transition: background 0.15s ease;
}

.table-row:last-child { border-bottom: none; }

.table-row:not(.table-header):hover {
  background: var(--bg-hover);
}

.table-header {
  background: var(--bg-card);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 16px;
}

.col-rank { width: 32px; text-align: center; color: var(--text-muted); font-weight: 600; font-size: 13px; }
.col-shortcut { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; color: var(--text); }
.col-key { width: 140px; flex-shrink: 0; display: flex; gap: 3px; flex-wrap: wrap; }
.col-count { width: 64px; text-align: center; flex-shrink: 0; }
.col-last { width: 100px; flex-shrink: 0; font-size: 12px; color: var(--text-muted); text-align: right; }

.key-badge {
  display: inline-block;
  padding: 1px 6px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11px;
  font-family: 'SF Mono', Menlo, monospace;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.count-badge {
  display: inline-block;
  padding: 2px 10px;
  background: var(--blue-bg);
  color: var(--blue);
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
}

.unused-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.unused-item {
display: flex;
justify-content: space-between;
align-items: center;
padding: 8px 16px;
background: var(--bg-elevated);
border: 1px solid var(--border-light);
border-radius: var(--radius-lg);
gap: var(--space-md);
}

.unused-label {
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.unused-key {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
}

.analytics-empty {
  text-align: center;
  padding: var(--space-3xl) 0;
  color: var(--text-muted);
}

.analytics-empty p {
  margin: 8px 0 0;
  font-size: 14px;
}

.analytics-privacy {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
}

.analytics-privacy .mdi {
font-size: 16px;
color: var(--success);
}
</style>
