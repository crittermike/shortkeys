<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProfiles } from '@/composables/useProfiles'
import { useGroups } from '@/composables/useGroups'

const {
  profiles,
  activeProfileId,
  activeProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  toggleProfileGroup,
  switchProfile,
  captureCurrentState,
} = useProfiles()

const { groupNames: allGroupNames, groupedIndices } = useGroups()

/** Only groups that actually have shortcuts (filters out phantom "My Shortcuts" when no ungrouped shortcuts exist) */
const groupNames = computed(() => allGroupNames.value.filter(g => (groupedIndices.value.get(g)?.length ?? 0) > 0))

const managing = ref(false)
const creating = ref(false)
const editingId = ref<string | null>(null)
const newName = ref('')
const newIcon = ref('🏠')

const ICONS = ['🏠', '💼', '🎬', '🎮', '📚', '🔧', '🎵', '🌙', '⚡', '🎯', '🧪', '🌍']

const editingProfile = computed(() => {
  if (!editingId.value) return null
  return profiles.value.find((p) => p.id === editingId.value) || null
})

function startCreating() {
  creating.value = true
  newName.value = ''
  newIcon.value = '🏠'
}

function cancelCreating() {
  creating.value = false
  newName.value = ''
  newIcon.value = '🏠'
}

function confirmCreate() {
  if (!newName.value.trim()) return
  const profile = createProfile(newName.value, newIcon.value, true)
  cancelCreating()
  // Immediately switch to the new profile
  switchProfile(profile.id)
}

function startEditing(id: string) {
  editingId.value = id
  const profile = profiles.value.find((p) => p.id === id)
  if (profile) {
    newName.value = profile.name
    newIcon.value = profile.icon
  }
}

function cancelEditing() {
  editingId.value = null
}

function confirmEdit() {
  if (!editingId.value || !newName.value.trim()) return
  updateProfile(editingId.value, { name: newName.value, icon: newIcon.value })
  editingId.value = null
}

function handleDelete(id: string) {
  deleteProfile(id)
  if (editingId.value === id) editingId.value = null
}

function handleSwitch(id: string) {
  if (activeProfileId.value === id) {
    switchProfile(null)
  } else {
    switchProfile(id)
  }
}
</script>

<template>
  <div class="profiles-manager">
    <!-- Layer 1: Empty state (no profiles exist) -->
    <div v-if="profiles.length === 0 && !managing" class="profiles-empty-inline">
      <span class="empty-text">✨ Create a profile to switch between group presets</span>
      <button class="empty-create-btn" @click="managing = true; startCreating()" type="button">
        + New profile
      </button>
    </div>

    <!-- Layer 2 & 3 wrapper -->
    <div v-if="profiles.length > 0 || managing" class="profiles-container">
      
      <!-- Layer 2: Pill switcher bar -->
      <div v-if="!managing || profiles.length > 0" class="profiles-pill-bar">
        <div class="profiles-label">
          <i class="mdi mdi-account-switch-outline"></i>
          <span>Profiles</span>
        </div>
        
        <div class="profiles-pills" v-if="profiles.length > 0">
          <button
            v-for="profile in profiles"
            :key="profile.id"
            :class="['profile-pill', { active: activeProfileId === profile.id }]"
            @click="handleSwitch(profile.id)"
            :title="activeProfileId === profile.id ? 'Click to deactivate' : `Switch to ${profile.name}`"
            type="button"
          >
            <span class="pill-icon">{{ profile.icon }}</span>
            <span class="pill-name">{{ profile.name }}</span>
          </button>
        </div>
        
        <button v-if="!managing && profiles.length > 0" class="manage-pill" @click="managing = true" title="Manage profiles" type="button">
          <i class="mdi mdi-cog-outline"></i>
        </button>
        
        <button v-if="managing" class="manage-close-btn" @click="managing = false; cancelCreating(); cancelEditing()" title="Close management" type="button">
          <span>Done</span>
          <i class="mdi mdi-check"></i>
        </button>
      </div>

      <!-- Layer 3: Manage panel -->
      <Transition name="expand">
        <div v-if="managing" class="manage-panel">
          
          <!-- Create form (top of panel) -->
          <div v-if="creating" class="create-form-card">
            <div class="form-header">Create New Profile</div>
            <div class="form-row">
              <div class="icon-picker">
                <button
                  v-for="icon in ICONS"
                  :key="icon"
                  :class="['icon-btn', { active: newIcon === icon }]"
                  @click="newIcon = icon"
                  type="button"
                >{{ icon }}</button>
              </div>
              <input
                class="profile-name-input"
                v-model="newName"
                placeholder="Profile name…"
                @keydown.enter="confirmCreate"
                @keydown.escape="cancelCreating"
                autofocus
              />
            </div>
            <div class="form-actions">
              <button class="btn-ghost" @click="cancelCreating" type="button">Cancel</button>
              <button class="btn-primary" @click="confirmCreate" :disabled="!newName.trim()" type="button">Create</button>
            </div>
          </div>

          <!-- Card grid -->
          <div class="profiles-grid">
            <div v-for="profile in profiles" :key="profile.id" class="profile-card">
              
              <template v-if="editingId === profile.id">
                <!-- Edit Mode -->
                <div class="card-edit-mode">
                  <div class="edit-row">
                    <div class="icon-picker mini-picker">
                      <button
                        v-for="icon in ICONS"
                        :key="icon"
                        :class="['icon-btn', { active: newIcon === icon }]"
                        @click="newIcon = icon"
                        type="button"
                      >{{ icon }}</button>
                    </div>
                    <input class="profile-name-input" v-model="newName" @keydown.enter="confirmEdit" @keydown.escape="cancelEditing" autofocus />
                  </div>
                  <div class="card-groups">
                    <button
                      v-for="group in groupNames"
                      :key="group"
                      :class="['group-chip', { active: profile.enabledGroups.includes(group) }]"
                      @click="toggleProfileGroup(profile.id, group)"
                      type="button"
                    >{{ group }}</button>
                  </div>
                  <div class="card-actions">
                    <button class="btn-ghost" @click="cancelEditing" type="button">Cancel</button>
                    <button class="btn-primary" @click="confirmEdit" :disabled="!newName.trim()" type="button">Save</button>
                  </div>
                </div>
              </template>

              <template v-else>
                <!-- View Mode -->
                <div class="card-header">
                  <div class="card-title">
                    <span class="card-icon">{{ profile.icon }}</span>
                    <span class="card-name">{{ profile.name }}</span>
                  </div>
                  <div class="card-controls">
                    <button class="icon-action" @click="startEditing(profile.id)" title="Edit profile" type="button"><i class="mdi mdi-pencil-outline"></i></button>
                    <button class="icon-action danger" @click="handleDelete(profile.id)" title="Delete profile" type="button"><i class="mdi mdi-delete-outline"></i></button>
                  </div>
                </div>
                
                <div class="card-groups">
                  <button
                    v-for="group in groupNames"
                    :key="group"
                    :class="['group-chip', { active: profile.enabledGroups.includes(group) }]"
                    @click="toggleProfileGroup(profile.id, group)"
                    title="Toggle group"
                    type="button"
                  >{{ group }}</button>
                </div>

                <div class="card-footer">
                  <button class="capture-link" @click="captureCurrentState(profile.id)" type="button">
                    <i class="mdi mdi-camera-outline"></i> Capture current state
                  </button>
                </div>
              </template>
            </div>

            <!-- Add new profile card -->
            <button v-if="!creating" class="add-profile-card" @click="startCreating" type="button">
              <i class="mdi mdi-plus"></i>
              <span>New Profile</span>
            </button>
          </div>

        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* Expand transition */
.expand-enter-active, .expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-4px);
}
.expand-enter-to, .expand-leave-from {
  opacity: 1;
  max-height: 800px;
  transform: translateY(0);
}

.profiles-manager {
  margin-bottom: var(--space-lg, 16px);
}

/* Layer 1: Empty state */
.profiles-empty-inline {
  display: inline-flex;
  align-items: center;
  gap: var(--space-md, 12px);
  padding: var(--space-xs, 4px) var(--space-md, 12px);
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, #f0f1f4);
  border-radius: var(--radius-full, 9999px);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
}

.empty-text {
  font-size: 13px;
  color: var(--text-secondary, #4b5563);
}

.empty-create-btn {
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--blue, #4f46e5);
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.empty-create-btn:hover {
  color: var(--blue-hover, #4338ca);
  text-decoration: underline;
}

/* Layer 2: Container */
.profiles-container {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: var(--radius-xl, 14px);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
  overflow: visible; /* Prevent dropdown clipping if any */
}

/* Layer 2: Pill switcher bar */
.profiles-pill-bar {
  display: flex;
  align-items: center;
  gap: var(--space-md, 12px);
  padding: 10px 14px;
}

.profiles-label {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 4px);
  color: var(--text-muted, #9ca3af);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.profiles-label .mdi {
  font-size: 16px;
}

.profiles-pills {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 8px);
  flex-wrap: wrap;
  flex: 1;
}

.profile-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--bg-elevated, #f3f4f8);
  border: 1px solid var(--border-light, #f0f1f4);
  border-radius: var(--radius-full, 9999px);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #4b5563);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.profile-pill:hover {
  background: var(--bg-hover, #eef0f5);
  border-color: var(--border, #e5e7eb);
  transform: translateY(-1px);
}

.profile-pill.active {
  background: var(--blue-bg, rgba(79,70,229,0.1));
  border-color: var(--blue, #4f46e5);
  color: var(--blue, #4f46e5);
  box-shadow: 0 2px 4px var(--blue-bg, rgba(79,70,229,0.1));
}

.pill-icon { font-size: 15px; }

.manage-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full, 9999px);
  background: var(--bg-elevated, #f3f4f8);
  border: 1px solid var(--border-light, #f0f1f4);
  color: var(--text-secondary, #4b5563);
  cursor: pointer;
  transition: all 0.2s;
}

.manage-pill:hover {
  background: var(--bg-hover, #eef0f5);
  color: var(--text, #111827);
  border-color: var(--border, #e5e7eb);
}

.manage-pill .mdi { font-size: 18px; }

.manage-close-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: var(--blue, #4f46e5);
  color: #fff;
  border: none;
  border-radius: var(--radius-full, 9999px);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.manage-close-btn:hover {
  background: var(--blue-hover, #4338ca);
}

/* Layer 3: Manage panel */
.manage-panel {
  border-top: 1px solid var(--border-light, #f0f1f4);
  padding: var(--space-lg, 16px);
  background: var(--bg-elevated, #f3f4f8);
  border-radius: 0 0 var(--radius-xl, 14px) var(--radius-xl, 14px);
}

/* Card Grid */
.profiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-md, 12px);
}

/* Cards */
.profile-card {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, #f0f1f4);
  border-radius: var(--radius-lg, 10px);
  padding: var(--space-md, 12px);
  display: flex;
  flex-direction: column;
  gap: var(--space-md, 12px);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
  transition: transform 0.2s, box-shadow 0.2s;
}

.profile-card:hover {
  box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1));
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 8px);
  font-weight: 600;
  color: var(--text, #111827);
  font-size: 15px;
}

.card-icon { font-size: 18px; }

.card-controls {
  display: flex;
  gap: 4px;
}

.icon-action {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md, 8px);
  border: none;
  background: transparent;
  color: var(--text-muted, #9ca3af);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.icon-action:hover {
  background: var(--bg-hover, #eef0f5);
  color: var(--text, #111827);
}

.icon-action.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.card-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.group-chip {
  padding: 4px 10px;
  border-radius: var(--radius-full, 9999px);
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--border, #e5e7eb);
  background: var(--bg-elevated, #f3f4f8);
  color: var(--text-muted, #9ca3af);
  cursor: pointer;
  transition: all 0.2s;
}

.group-chip:hover {
  border-color: var(--text-secondary, #4b5563);
}

.group-chip.active {
  background: var(--blue-bg, rgba(79,70,229,0.1));
  border-color: var(--blue, #4f46e5);
  color: var(--blue, #4f46e5);
}

.card-footer {
  margin-top: auto;
  padding-top: var(--space-sm, 8px);
  border-top: 1px dashed var(--border-light, #f0f1f4);
}

.capture-link {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted, #9ca3af);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.2s;
}

.capture-link:hover {
  color: var(--blue, #4f46e5);
}

.capture-link .mdi {
  font-size: 14px;
}

.add-profile-card {
  background: transparent;
  border: 2px dashed var(--border, #e5e7eb);
  border-radius: var(--radius-lg, 10px);
  padding: var(--space-lg, 16px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm, 8px);
  color: var(--text-muted, #9ca3af);
  font-weight: 600;
  cursor: pointer;
  min-height: 140px;
  transition: all 0.2s;
}

.add-profile-card:hover {
  border-color: var(--blue, #4f46e5);
  color: var(--blue, #4f46e5);
  background: var(--blue-bg, rgba(79,70,229,0.1));
}

.add-profile-card .mdi {
  font-size: 24px;
}

/* Forms */
.create-form-card {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, #f0f1f4);
  border-radius: var(--radius-lg, 10px);
  padding: var(--space-md, 12px) var(--space-lg, 16px);
  margin-bottom: var(--space-lg, 16px);
  box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1));
}

.form-header {
  font-weight: 600;
  font-size: 14px;
  color: var(--text, #111827);
  margin-bottom: var(--space-md, 12px);
}

.form-row, .edit-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md, 12px);
  margin-bottom: var(--space-md, 12px);
  flex-wrap: wrap;
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 260px;
}

.icon-picker.mini-picker {
  max-width: 100%;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border-light, #f0f1f4);
  background: var(--bg-elevated, #f3f4f8);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  transform: scale(1.1);
  border-color: var(--border, #e5e7eb);
}

.icon-btn.active {
  border-color: var(--blue, #4f46e5);
  background: var(--blue-bg, rgba(79,70,229,0.1));
  box-shadow: 0 0 0 1px var(--blue, #4f46e5);
}

.profile-name-input {
  flex: 1;
  min-width: 150px;
  padding: 8px 12px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  color: var(--text, #111827);
  background: var(--bg-input, #fff);
  outline: none;
  transition: border-color 0.2s;
}

.profile-name-input:focus {
  border-color: var(--blue, #4f46e5);
}

.profile-name-input::placeholder {
  color: var(--text-placeholder, #d1d5db);
}

.form-actions, .card-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm, 8px);
}

.card-actions {
  margin-top: var(--space-sm, 8px);
  border-top: 1px dashed var(--border-light, #f0f1f4);
  padding-top: var(--space-md, 12px);
}

.btn-ghost {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--radius-md, 8px);
  background: transparent;
  color: var(--text-secondary, #4b5563);
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-ghost:hover {
  background: var(--bg-hover, #eef0f5);
  color: var(--text, #111827);
}

.btn-primary {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--radius-md, 8px);
  background: var(--blue, #4f46e5);
  color: #fff;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--blue-hover, #4338ca);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
