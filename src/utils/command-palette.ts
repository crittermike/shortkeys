import { ACTION_CATEGORIES, getActionLabel } from './actions-registry'
import { needsActionSettings } from './action-parameters'
import { isShortcutAvailable, type GroupSettings, type KeySetting } from './url-matching'

export interface PaletteItem {
  id: string
  action: string
  label: string
  category?: string
  description?: string
  key?: string
  shortcut?: KeySetting
}

export function isPaletteAction(action: string): boolean {
  return action !== 'disable' && !needsActionSettings(action) && !!getActionLabel(action)
}

export function getPaletteItems(keys: KeySetting[], url: string, groups: Record<string, GroupSettings>, query = ''): PaletteItem[] {
  const items: PaletteItem[] = keys
    .filter(key => key.action && key.key && isShortcutAvailable(key, url, groups))
    .map((key, index) => ({
      id: key.id || `shortcut:${index}`,
      action: key.action,
      label: key.label || getActionLabel(key.action) || key.action,
      description: getActionLabel(key.action),
      key: key.key,
      shortcut: key,
    }))

  // Suppress even disabled or restricted assignments, so built-ins cannot bypass their rules.
  const assigned = new Set(keys.map(key => key.action))
  for (const [category, actions] of Object.entries(ACTION_CATEGORIES)) {
    for (const action of actions) {
      if (!isPaletteAction(action.value) || assigned.has(action.value)) continue
      items.push({ id: `action:${action.value}`, action: action.value, label: action.label, category, description: action.description })
    }
  }
  const search = query.trim().toLowerCase()
  return items.filter(item => [item.label, item.key, item.action, item.category, item.description].join(' ').toLowerCase().includes(search))
}
