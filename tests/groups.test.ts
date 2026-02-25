import { describe, it, expect } from 'vitest'
import { isAllowedSite, isGroupAllowed } from '../src/utils/url-matching'
import type { KeySetting, GroupSettings } from '../src/utils/url-matching'

/**
 * Tests for the shortcut groups feature.
 * Groups are determined by the optional `group` field on KeySetting.
 */

const DEFAULT_GROUP = 'My Shortcuts'

/** Helper: get unique group names from shortcuts (default group first) */
function getGroupNames(keys: KeySetting[]): string[] {
  const names = new Set<string>()
  for (const k of keys) names.add(k.group || DEFAULT_GROUP)
  const ordered = [DEFAULT_GROUP]
  for (const n of names) {
    if (n !== DEFAULT_GROUP) ordered.push(n)
  }
  return ordered
}

/** Helper: group indices by group name */
function groupIndices(keys: KeySetting[]): Map<string, number[]> {
  const map = new Map<string, number[]>()
  for (let i = 0; i < keys.length; i++) {
    const group = keys[i].group || DEFAULT_GROUP
    if (!map.has(group)) map.set(group, [])
    map.get(group)!.push(i)
  }
  return map
}

describe('group data model', () => {
  it('shortcuts without group field belong to default group', () => {
    const keys: KeySetting[] = [
      { key: 'a', action: 'newtab' },
      { key: 'b', action: 'closetab' },
    ]
    const groups = getGroupNames(keys)
    expect(groups).toEqual([DEFAULT_GROUP])
  })

  it('shortcuts with group field are categorized correctly', () => {
    const keys: KeySetting[] = [
      { key: 'a', action: 'newtab' },
      { key: 'j', action: 'scrolldown', group: 'Vim' },
      { key: 'k', action: 'scrollup', group: 'Vim' },
      { key: 'ctrl+m', action: 'copytitleurlmarkdown', group: 'Productivity' },
    ]
    const groups = getGroupNames(keys)
    expect(groups).toEqual([DEFAULT_GROUP, 'Vim', 'Productivity'])
  })

  it('default group always appears first', () => {
    const keys: KeySetting[] = [
      { key: 'j', action: 'scrolldown', group: 'Vim' },
      { key: 'a', action: 'newtab' },
    ]
    const groups = getGroupNames(keys)
    expect(groups[0]).toBe(DEFAULT_GROUP)
  })

  it('groups indices correctly', () => {
    const keys: KeySetting[] = [
      { key: 'a', action: 'newtab' },
      { key: 'j', action: 'scrolldown', group: 'Vim' },
      { key: 'b', action: 'closetab' },
      { key: 'k', action: 'scrollup', group: 'Vim' },
    ]
    const grouped = groupIndices(keys)
    expect(grouped.get(DEFAULT_GROUP)).toEqual([0, 2])
    expect(grouped.get('Vim')).toEqual([1, 3])
  })

  it('handles empty shortcuts array', () => {
    const groups = getGroupNames([])
    expect(groups).toEqual([DEFAULT_GROUP])
  })
})

describe('group operations', () => {
  it('toggle group enabled/disabled', () => {
    const keys: KeySetting[] = [
      { key: 'j', action: 'scrolldown', group: 'Vim', enabled: true },
      { key: 'k', action: 'scrollup', group: 'Vim', enabled: true },
      { key: 'a', action: 'newtab', enabled: true },
    ]
    const grouped = groupIndices(keys)
    const vimIndices = grouped.get('Vim')!

    // Disable all in Vim group
    const allEnabled = vimIndices.every((i) => keys[i].enabled !== false)
    expect(allEnabled).toBe(true)
    for (const i of vimIndices) keys[i].enabled = false

    expect(keys[0].enabled).toBe(false)
    expect(keys[1].enabled).toBe(false)
    expect(keys[2].enabled).toBe(true) // ungrouped not affected
  })

  it('delete group removes only that group', () => {
    const keys: KeySetting[] = [
      { key: 'a', action: 'newtab' },
      { key: 'j', action: 'scrolldown', group: 'Vim' },
      { key: 'k', action: 'scrollup', group: 'Vim' },
      { key: 'ctrl+m', action: 'copytitleurlmarkdown', group: 'Productivity' },
    ]

    const filtered = keys.filter((k) => (k.group || DEFAULT_GROUP) !== 'Vim')
    expect(filtered).toHaveLength(2)
    expect(filtered[0].key).toBe('a')
    expect(filtered[1].group).toBe('Productivity')
  })

  it('rename group updates all shortcuts in that group', () => {
    const keys: KeySetting[] = [
      { key: 'j', action: 'scrolldown', group: 'Vim' },
      { key: 'k', action: 'scrollup', group: 'Vim' },
      { key: 'a', action: 'newtab' },
    ]

    const oldName = 'Vim'
    const newName = 'Vim Navigation'
    for (const k of keys) {
      if ((k.group || DEFAULT_GROUP) === oldName) {
        k.group = newName
      }
    }

    expect(keys[0].group).toBe('Vim Navigation')
    expect(keys[1].group).toBe('Vim Navigation')
    expect(keys[2].group).toBeUndefined() // ungrouped not affected
  })

  it('rename to default group name removes group field', () => {
    const keys: KeySetting[] = [
      { key: 'j', action: 'scrolldown', group: 'Vim' },
    ]

    for (const k of keys) {
      if (k.group === 'Vim') {
        k.group = undefined // renaming to default = remove group
      }
    }

    expect(keys[0].group).toBeUndefined()
  })

  it('add shortcut to specific group', () => {
    const keys: KeySetting[] = [
      { key: 'j', action: 'scrolldown', group: 'Vim' },
    ]

    keys.push({ key: '', action: '', group: 'Vim' } as KeySetting)
    const grouped = groupIndices(keys)
    expect(grouped.get('Vim')).toEqual([0, 1])
  })
})

describe('group backward compatibility', () => {
  it('v4 data without group field works correctly', () => {
    const v4Data: KeySetting[] = [
      { key: 'ctrl+b', action: 'newtab', label: 'New tab' },
      { key: 'j', action: 'scrolldown' },
    ]

    // All should be in default group
    const groups = getGroupNames(v4Data)
    expect(groups).toEqual([DEFAULT_GROUP])

    const grouped = groupIndices(v4Data)
    expect(grouped.get(DEFAULT_GROUP)).toEqual([0, 1])
  })

  it('mixed v4 and v5 data coexists', () => {
    const mixedData: KeySetting[] = [
      { key: 'ctrl+b', action: 'newtab' }, // v4 style (no group)
      { key: 'j', action: 'scrolldown', group: 'Vim' }, // v5 style
    ]

    const groups = getGroupNames(mixedData)
    expect(groups).toEqual([DEFAULT_GROUP, 'Vim'])
  })

  it('group field does not affect shortcut filtering', () => {
    const keys: KeySetting[] = [
      { key: 'j', action: 'scrolldown', group: 'Vim', blacklist: 'whitelist', sitesArray: ['*youtube.com*'] },
    ]

    expect(isAllowedSite(keys[0], 'https://youtube.com')).toBe(true)
    expect(isAllowedSite(keys[0], 'https://github.com')).toBe(false)
  })

  it('group field does not affect enabled filtering', () => {
    const keys: KeySetting[] = [
      { key: 'j', action: 'scrolldown', group: 'Vim', enabled: false },
      { key: 'k', action: 'scrollup', group: 'Vim', enabled: true },
    ]

    const active = keys.filter((k) => k.enabled !== false)
    expect(active).toHaveLength(1)
    expect(active[0].key).toBe('k')
  })
})

describe('group search/filter interaction', () => {
  it('search filters across all groups', () => {
    const keys: KeySetting[] = [
      { key: 'j', action: 'scrolldown', label: 'Scroll down', group: 'Vim' },
      { key: 'k', action: 'scrollup', label: 'Scroll up', group: 'Vim' },
      { key: 'ctrl+t', action: 'newtab', label: 'New tab' },
    ]

    const q = 'scroll'
    const filtered = keys
      .map((row, i) => {
        const label = (row.label || '').toLowerCase()
        if (label.includes(q)) return i
        return -1
      })
      .filter((i) => i >= 0)

    expect(filtered).toEqual([0, 1])

    // Group the filtered indices
    const grouped = new Map<string, number[]>()
    for (const i of filtered) {
      const group = keys[i].group || DEFAULT_GROUP
      if (!grouped.has(group)) grouped.set(group, [])
      grouped.get(group)!.push(i)
    }

    expect(grouped.has('Vim')).toBe(true)
    expect(grouped.has(DEFAULT_GROUP)).toBe(false) // "New tab" not in results
  })
})

describe('group site activation filtering', () => {
  /** Simulate the background.ts filtering logic */
  function filterKeys(
    keys: KeySetting[],
    url: string,
    groupSettingsData: Record<string, GroupSettings>,
  ): KeySetting[] {
    return keys.filter((key) =>
      key.enabled !== false &&
      isGroupAllowed(key.group, url, groupSettingsData) &&
      isAllowedSite(key, url)
    )
  }

  it('filters shortcuts by group activateOn pattern', () => {
    const keys: KeySetting[] = [
      { key: 'j', action: 'scrolldown', group: 'GitHub' },
      { key: 'k', action: 'scrollup', group: 'GitHub' },
      { key: 'a', action: 'newtab' },
    ]
    const groupSettings = { 'GitHub': { activateOn: '*github.com*' } }

    const onGitHub = filterKeys(keys, 'https://github.com/repo', groupSettings)
    expect(onGitHub).toHaveLength(3)

    const onOther = filterKeys(keys, 'https://example.com', groupSettings)
    expect(onOther).toHaveLength(1)
    expect(onOther[0].key).toBe('a')
  })

  it('filters shortcuts by group deactivateOn pattern', () => {
    const keys: KeySetting[] = [
      { key: 'j', action: 'scrolldown', group: 'Nav' },
      { key: 'a', action: 'newtab' },
    ]
    const groupSettings = { 'Nav': { deactivateOn: '*facebook.com*' } }

    const onFacebook = filterKeys(keys, 'https://facebook.com', groupSettings)
    expect(onFacebook).toHaveLength(1)
    expect(onFacebook[0].key).toBe('a')

    const onOther = filterKeys(keys, 'https://example.com', groupSettings)
    expect(onOther).toHaveLength(2)
  })

  it('group filtering works alongside per-shortcut site filtering', () => {
    const keys: KeySetting[] = [
      {
        key: 'j', action: 'scrolldown', group: 'Dev',
        blacklist: 'whitelist', sitesArray: ['*github.com*'],
      },
      { key: 'a', action: 'newtab' },
    ]
    const groupSettings = { 'Dev': { activateOn: '*github.com*\n*gitlab.com*' } }

    // On GitHub: group allows it, per-shortcut whitelist allows it
    const onGitHub = filterKeys(keys, 'https://github.com/repo', groupSettings)
    expect(onGitHub).toHaveLength(2)

    // On GitLab: group allows it, but per-shortcut whitelist blocks it (only github.com)
    const onGitLab = filterKeys(keys, 'https://gitlab.com/repo', groupSettings)
    expect(onGitLab).toHaveLength(1)
    expect(onGitLab[0].key).toBe('a')
  })

  it('disabled shortcuts are excluded regardless of group settings', () => {
    const keys: KeySetting[] = [
      { key: 'j', action: 'scrolldown', group: 'Vim', enabled: false },
      { key: 'k', action: 'scrollup', group: 'Vim', enabled: true },
    ]
    const groupSettings = {}

    const result = filterKeys(keys, 'https://example.com', groupSettings)
    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('k')
  })

  it('ungrouped shortcuts use default group for filtering', () => {
    const keys: KeySetting[] = [
      { key: 'a', action: 'newtab' }, // no group = My Shortcuts
      { key: 'b', action: 'closetab' },
    ]
    const groupSettings = { 'My Shortcuts': { activateOn: '*youtube.com*' } }

    const onYouTube = filterKeys(keys, 'https://youtube.com/watch', groupSettings)
    expect(onYouTube).toHaveLength(2)

    const onOther = filterKeys(keys, 'https://example.com', groupSettings)
    expect(onOther).toHaveLength(0)
  })
})
