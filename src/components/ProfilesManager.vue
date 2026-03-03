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

const { groupNames } = useGroups()

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
  <div class="profiles-bar">
    <!-- Compact inline bar -->
    <div class="profiles-inline">
      <div class="profiles-label">
        <i class="mdi mdi-account-switch-outline"></i>
        <span>Profiles</span>
      </div>
      <div class="profiles-pills">
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
        <button class="profile-pill profile-pill-add" @click="managing ? startCreating() : (managing = true)" title="Manage profiles" type="button">
          <i :class="managing ? 'mdi mdi-plus' : 'mdi mdi-cog-outline'"></i>
        </button>
      </div>
      <button v-if="managing" class="profiles-close" @click="managing = false; cancelCreating(); cancelEditing()" title="Close" type="button">
        <i class="mdi mdi-close"></i>
      </button>
    </div>

    <!-- Expanded manage panel -->
    <Transition name="expand">
      <div v-if="managing" class="profiles-panel">
        <!-- Create form -->
        <div v-if="creating" class="profile-form">
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
            <button class="btn-sm btn-ghost" @click="cancelCreating" type="button">Cancel</button>
            <button class="btn-sm btn-primary-sm" @click="confirmCreate" :disabled="!newName.trim()" type="button">Create profile</button>
          </div>
        </div>

        <!-- Profile list -->
        <div v-if="!creating && profiles.length > 0" class="profile-list">
          <div v-for="profile in profiles" :key="profile.id" class="profile-item">
            <template v-if="editingId === profile.id">
              <!-- Editing mode -->
              <div class="profile-form profile-form-inline">
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
                    @keydown.enter="confirmEdit"
                    @keydown.escape="cancelEditing"
                    autofocus
                  />
                </div>
                <div class="profile-groups">
                  <span class="groups-label">Enabled groups:</span>
                  <div class="groups-chips">
                    <button
                      v-for="group in groupNames"
                      :key="group"
                      :class="['group-chip', { active: profile.enabledGroups.includes(group) }]"
                      @click="toggleProfileGroup(profile.id, group)"
                      type="button"
                    >{{ group }}</button>
                  </div>
                </div>
                <div class="form-actions">
                  <button class="btn-sm btn-ghost" @click="cancelEditing" type="button">Cancel</button>
                  <button class="btn-sm btn-ghost" @click="captureCurrentState(profile.id); cancelEditing()" type="button" title="Save the current group enabled/disabled state to this profile">
                    <i class="mdi mdi-camera-outline"></i> Capture current
                  </button>
                  <button class="btn-sm btn-primary-sm" @click="confirmEdit" :disabled="!newName.trim()" type="button">Save</button>
                </div>
              </div>
            </template>
            <template v-else>
              <!-- Display mode -->
              <div class="profile-item-row">
                <button
                  :class="['profile-switch-btn', { active: activeProfileId === profile.id }]"
                  @click="handleSwitch(profile.id)"
                  type="button"
                >
                  <span class="profile-icon">{{ profile.icon }}</span>
                  <span class="profile-name">{{ profile.name }}</span>
                  <span v-if="activeProfileId === profile.id" class="profile-active-badge">Active</span>
                </button>
                <span class="profile-group-count">{{ profile.enabledGroups.length }} group{{ profile.enabledGroups.length !== 1 ? 's' : '' }}</span>
                <div class="profile-item-actions">
                  <button class="btn-icon-xs" @click="startEditing(profile.id)" title="Edit profile" type="button">
                    <i class="mdi mdi-pencil-outline"></i>
                  </button>
                  <button class="btn-icon-xs btn-danger-icon" @click="handleDelete(profile.id)" title="Delete profile" type="button">
                    <i class="mdi mdi-delete-outline"></i>
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Empty state within panel -->
        <div v-if="!creating && profiles.length === 0" class="profiles-empty">
          <p>Profiles let you quickly switch between sets of enabled groups — e.g., "Work", "Media", "Browsing".</p>
          <button class="btn-sm btn-primary-sm" @click="startCreating" type="button">
            <i class="mdi mdi-plus"></i> Create your first profile
          </button>
        </div>

        <!-- Add button when profiles exist -->
        <div v-if="!creating && profiles.length > 0" class="profiles-panel-footer">
          <button class="btn-sm btn-ghost" @click="startCreating" type="button">
            <i class="mdi mdi-plus"></i> New profile
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.profiles-bar {
  margin-bottom: 16px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 10px;
}

.profiles-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
}

.profiles-label {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-muted, #9ca3af);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.profiles-label .mdi { font-size: 15px; }

.profiles-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}

.profile-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: var(--bg-elevated, #f3f4f8);
  border: 1px solid var(--border-light, #f0f1f4);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, #4b5563);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.profile-pill:hover {
  background: var(--bg-hover, #eef0f5);
  border-color: var(--border, #e5e7eb);
}

.profile-pill.active {
  background: var(--blue-bg, rgba(79,70,229,0.1));
  border-color: var(--blue, #4f46e5);
  color: var(--blue, #4f46e5);
}

.pill-icon { font-size: 14px; }
.pill-name { line-height: 1; }

.profile-pill-add {
  padding: 5px 10px;
  gap: 0;
}

.profile-pill-add .mdi {
  font-size: 15px;
}

.profiles-close {
  background: none;
  border: none;
  color: var(--text-muted, #9ca3af);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.profiles-close:hover {
  color: var(--text, #111827);
  background: var(--bg-hover, #eef0f5);
}

/* Panel */
.profiles-panel {
  border-top: 1px solid var(--border-light, #f0f1f4);
  padding: 12px 14px;
}

/* Expand transition */
.expand-enter-active, .expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.expand-enter-to, .expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Form */
.profile-form {
  margin-bottom: 8px;
}

.profile-form-inline {
  padding: 10px;
  background: var(--bg-elevated, #f3f4f8);
  border-radius: 8px;
  margin-bottom: 0;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.icon-picker {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  max-width: 220px;
}

.icon-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, #f0f1f4);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.1s;
}

.icon-btn:hover {
  border-color: var(--border, #e5e7eb);
  transform: scale(1.1);
}

.icon-btn.active {
  border-color: var(--blue, #4f46e5);
  background: var(--blue-bg, rgba(79,70,229,0.1));
  box-shadow: 0 0 0 1px var(--blue, #4f46e5);
}

.profile-name-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text, #111827);
  background: var(--bg-input, #fff);
  outline: none;
  transition: border-color 0.15s;
}

.profile-name-input:focus {
  border-color: var(--blue, #4f46e5);
}

.profile-name-input::placeholder {
  color: var(--text-placeholder, #d1d5db);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

/* Groups in edit mode */
.profile-groups {
  margin-bottom: 8px;
}

.groups-label {
  display: block;
  font-size: 11px;
  color: var(--text-muted, #9ca3af);
  margin-bottom: 4px;
  font-weight: 500;
}

.groups-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.group-chip {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--border, #e5e7eb);
  background: var(--bg-card, #fff);
  color: var(--text-muted, #9ca3af);
  cursor: pointer;
  transition: all 0.15s;
}

.group-chip:hover {
  border-color: var(--text-muted, #9ca3af);
}

.group-chip.active {
  background: var(--blue-bg, rgba(79,70,229,0.1));
  border-color: var(--blue, #4f46e5);
  color: var(--blue, #4f46e5);
}

/* Buttons */
.btn-sm {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary, #4b5563);
}

.btn-ghost:hover {
  background: var(--bg-hover, #eef0f5);
}

.btn-primary-sm {
  background: var(--blue, #4f46e5);
  color: white;
}

.btn-primary-sm:hover:not(:disabled) {
  background: var(--blue-hover, #4338ca);
}

.btn-primary-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Profile list */
.profile-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.profile-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}

.profile-switch-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: var(--bg-elevated, #f3f4f8);
  border: 1px solid var(--border-light, #f0f1f4);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  flex: 1;
  min-width: 0;
}

.profile-switch-btn:hover {
  background: var(--bg-hover, #eef0f5);
  border-color: var(--border, #e5e7eb);
}

.profile-switch-btn.active {
  background: var(--blue-bg, rgba(79,70,229,0.1));
  border-color: var(--blue, #4f46e5);
}

.profile-icon { font-size: 16px; flex-shrink: 0; }

.profile-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text, #111827);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-active-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--blue, #4f46e5);
  background: var(--blue-bg, rgba(79,70,229,0.1));
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

.profile-group-count {
  font-size: 11px;
  color: var(--text-muted, #9ca3af);
  white-space: nowrap;
  flex-shrink: 0;
}

.profile-item-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.btn-icon-xs {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-muted, #9ca3af);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 15px;
}

.btn-icon-xs:hover {
  background: var(--bg-hover, #eef0f5);
  color: var(--text, #111827);
}

.btn-danger-icon:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

/* Empty state */
.profiles-empty {
  text-align: center;
  padding: 8px 0;
}

.profiles-empty p {
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
  margin-bottom: 10px;
  line-height: 1.5;
}

.profiles-panel-footer {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}
</style>
