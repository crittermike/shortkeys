import { describe, it, expect } from 'vitest'
import { globToRegex, isAllowedSite, isGroupAllowed, normalizeUrlPattern } from '../src/utils/url-matching'

describe('globToRegex', () => {
  it('converts a simple glob with wildcard', () => {
    const regex = globToRegex('*.example.com/*')
    expect(regex.test('https://www.example.com/page')).toBe(true)
    expect(regex.test('http://sub.example.com/other')).toBe(true)
  })

  it('matches exact URL without wildcards', () => {
    const regex = globToRegex('https://example.com/page')
    expect(regex.test('https://example.com/page')).toBe(true)
    expect(regex.test('https://example.com/other')).toBe(false)
  })

  it('uses * as .* wildcard', () => {
    const regex = globToRegex('*google*')
    expect(regex.test('https://www.google.com/search?q=test')).toBe(true)
    expect(regex.test('https://mail.google.com')).toBe(true)
    expect(regex.test('https://example.com')).toBe(false)
  })

  it('treats /pattern/ as raw regex', () => {
    const regex = globToRegex('/^https:\\/\\/example\\.com/')
    expect(regex.test('https://example.com')).toBe(true)
    expect(regex.test('https://example.com/page')).toBe(true)
    expect(regex.test('http://example.com')).toBe(false)
  })

  it('escapes special regex characters in non-wildcard globs', () => {
    const regex = globToRegex('https://example.com/path?q=1')
    expect(regex.test('https://example.com/path?q=1')).toBe(true)
    // The . and ? should be escaped, so this should not match
    expect(regex.test('https://exampleXcom/pathXq=1')).toBe(false)
  })

  it('handles empty string', () => {
    const regex = globToRegex('')
    expect(regex.test('')).toBe(true)
    expect(regex.test('anything')).toBe(false)
  })

  it('handles multiple wildcards', () => {
    const regex = globToRegex('*://*/path/*')
    expect(regex.test('https://example.com/path/to/page')).toBe(true)
    expect(regex.test('http://localhost/path/file')).toBe(true)
    expect(regex.test('https://example.com/other')).toBe(false)
  })

  it('handles parentheses and brackets in URLs', () => {
    const regex = globToRegex('https://example.com/page(1)')
    expect(regex.test('https://example.com/page(1)')).toBe(true)
  })

  it('handles pipe character', () => {
    const regex = globToRegex('https://example.com/a|b')
    expect(regex.test('https://example.com/a|b')).toBe(true)
  })

  it('raw regex with flags-like pattern', () => {
    const regex = globToRegex('/example\\.com/')
    expect(regex.test('https://example.com/page')).toBe(true)
    expect(regex.test('https://exampleXcom')).toBe(false)
  })
})

describe('isAllowedSite', () => {
  it('allows all sites when blacklist is not set', () => {
    const key = { key: 'ctrl+b', action: 'newtab' }
    expect(isAllowedSite(key, 'https://example.com')).toBe(true)
  })

  it('allows all sites when blacklist is false', () => {
    const key = { blacklist: false }
    expect(isAllowedSite(key, 'https://example.com')).toBe(true)
  })

  it('allows all sites when blacklist is string "false"', () => {
    const key = { blacklist: 'false' }
    expect(isAllowedSite(key, 'https://example.com')).toBe(true)
  })

  describe('blacklist mode (blacklist=true)', () => {
    it('allows sites not in the blacklist', () => {
      const key = {
        blacklist: true,
        sitesArray: ['*facebook.com*', '*twitter.com*'],
      }
      expect(isAllowedSite(key, 'https://example.com')).toBe(true)
    })

    it('blocks sites in the blacklist', () => {
      const key = {
        blacklist: true,
        sitesArray: ['*facebook.com*', '*twitter.com*'],
      }
      expect(isAllowedSite(key, 'https://facebook.com/page')).toBe(false)
      expect(isAllowedSite(key, 'https://twitter.com/home')).toBe(false)
    })

    it('handles string "true" blacklist value', () => {
      const key = {
        blacklist: 'true',
        sitesArray: ['*blocked.com*'],
      }
      expect(isAllowedSite(key, 'https://blocked.com')).toBe(false)
      expect(isAllowedSite(key, 'https://allowed.com')).toBe(true)
    })
  })

  describe('whitelist mode (blacklist="whitelist")', () => {
    it('blocks sites not in the whitelist', () => {
      const key = {
        blacklist: 'whitelist',
        sitesArray: ['*example.com*'],
      }
      expect(isAllowedSite(key, 'https://other.com')).toBe(false)
    })

    it('allows sites in the whitelist', () => {
      const key = {
        blacklist: 'whitelist',
        sitesArray: ['*example.com*'],
      }
      expect(isAllowedSite(key, 'https://example.com/page')).toBe(true)
    })
  })

  it('handles empty sitesArray', () => {
    const key = { blacklist: true, sitesArray: [] }
    expect(isAllowedSite(key, 'https://example.com')).toBe(true)
  })

  it('handles missing sitesArray', () => {
    const key = { blacklist: true }
    expect(isAllowedSite(key, 'https://example.com')).toBe(true)
  })

  it('handles sitesArray with empty strings', () => {
    const key = { blacklist: true, sitesArray: ['', ''] }
    // Empty strings should not match anything
    expect(isAllowedSite(key, 'https://example.com')).toBe(true)
  })

  it('handles regex patterns in sitesArray', () => {
    const key = {
      blacklist: true,
      sitesArray: ['/^https:\\/\\/example\\.com/'],
    }
    expect(isAllowedSite(key, 'https://example.com/page')).toBe(false)
    expect(isAllowedSite(key, 'http://example.com')).toBe(true)
  })

  it('multiple matching sites toggle correctly', () => {
    // If a URL matches multiple entries, each match toggles the allowed state
    const key = {
      blacklist: true,
      sitesArray: ['*example*', '*example.com*'],
    }
    // Starts allowed (blacklist=true), first match toggles to not allowed, second toggles back
    expect(isAllowedSite(key, 'https://example.com')).toBe(true)
  })
})

describe('isGroupAllowed', () => {
  it('allows all URLs when no group settings exist', () => {
    expect(isGroupAllowed('Vim', 'https://example.com', {})).toBe(true)
  })

  it('allows all URLs when group has no settings entry', () => {
    const settings = { 'Other Group': { activateOn: '*google.com*' } }
    expect(isGroupAllowed('Vim', 'https://example.com', settings)).toBe(true)
  })

  it('allows all URLs when settings are empty strings', () => {
    const settings = { 'Vim': { activateOn: '', deactivateOn: '' } }
    expect(isGroupAllowed('Vim', 'https://example.com', settings)).toBe(true)
  })

  it('uses default group name when groupName is undefined', () => {
    const settings = { 'My Shortcuts': { activateOn: '*google.com*' } }
    expect(isGroupAllowed(undefined, 'https://google.com/search', settings)).toBe(true)
    expect(isGroupAllowed(undefined, 'https://example.com', settings)).toBe(false)
  })

  describe('activateOn (whitelist)', () => {
    it('allows matching URLs', () => {
      const settings = { 'Vim': { activateOn: '*github.com*' } }
      expect(isGroupAllowed('Vim', 'https://github.com/repo', settings)).toBe(true)
    })

    it('blocks non-matching URLs', () => {
      const settings = { 'Vim': { activateOn: '*github.com*' } }
      expect(isGroupAllowed('Vim', 'https://example.com', settings)).toBe(false)
    })

    it('supports multiple patterns (newline-separated)', () => {
      const settings = { 'Dev': { activateOn: '*github.com*\n*gitlab.com*' } }
      expect(isGroupAllowed('Dev', 'https://github.com/repo', settings)).toBe(true)
      expect(isGroupAllowed('Dev', 'https://gitlab.com/repo', settings)).toBe(true)
      expect(isGroupAllowed('Dev', 'https://example.com', settings)).toBe(false)
    })

    it('ignores empty lines in patterns', () => {
      const settings = { 'Dev': { activateOn: '*github.com*\n\n*gitlab.com*\n' } }
      expect(isGroupAllowed('Dev', 'https://github.com/repo', settings)).toBe(true)
      expect(isGroupAllowed('Dev', 'https://example.com', settings)).toBe(false)
    })
  })

  describe('deactivateOn (blacklist)', () => {
    it('blocks matching URLs', () => {
      const settings = { 'Vim': { deactivateOn: '*facebook.com*' } }
      expect(isGroupAllowed('Vim', 'https://facebook.com/page', settings)).toBe(false)
    })

    it('allows non-matching URLs', () => {
      const settings = { 'Vim': { deactivateOn: '*facebook.com*' } }
      expect(isGroupAllowed('Vim', 'https://example.com', settings)).toBe(true)
    })

    it('supports multiple patterns', () => {
      const settings = { 'Nav': { deactivateOn: '*facebook.com*\n*twitter.com*' } }
      expect(isGroupAllowed('Nav', 'https://facebook.com', settings)).toBe(false)
      expect(isGroupAllowed('Nav', 'https://twitter.com', settings)).toBe(false)
      expect(isGroupAllowed('Nav', 'https://example.com', settings)).toBe(true)
    })
  })

  describe('combined activateOn + deactivateOn', () => {
    it('both must pass: URL must match activateOn AND not match deactivateOn', () => {
      const settings = {
        'Dev': {
          activateOn: '*github.com*',
          deactivateOn: '*github.com/settings*',
        },
      }
      expect(isGroupAllowed('Dev', 'https://github.com/repo', settings)).toBe(true)
      expect(isGroupAllowed('Dev', 'https://github.com/settings', settings)).toBe(false)
      expect(isGroupAllowed('Dev', 'https://example.com', settings)).toBe(false)
    })
  })

  it('handles regex patterns in activateOn', () => {
    const settings = { 'Dev': { activateOn: '/^https:\\/\\/github\\.com/' } }
    expect(isGroupAllowed('Dev', 'https://github.com/repo', settings)).toBe(true)
    expect(isGroupAllowed('Dev', 'http://github.com/repo', settings)).toBe(false)
  })

  it('handles invalid regex patterns gracefully', () => {
    const settings = { 'Dev': { activateOn: '/[invalid/' } }
    // Invalid regex should not crash, just not match
    expect(isGroupAllowed('Dev', 'https://example.com', settings)).toBe(false)
  })
})

describe('normalizeUrlPattern', () => {
  it('wraps bare domains with wildcards', () => {
    expect(normalizeUrlPattern('gmail.com')).toBe('*gmail.com*')
    expect(normalizeUrlPattern('github.com/myorg')).toBe('*github.com/myorg*')
  })

  it('leaves patterns with wildcards unchanged', () => {
    expect(normalizeUrlPattern('*gmail.com*')).toBe('*gmail.com*')
    expect(normalizeUrlPattern('*.github.com/*')).toBe('*.github.com/*')
  })

  it('leaves regex patterns unchanged', () => {
    expect(normalizeUrlPattern('/^https:\\/\\/github\\.com/')).toBe('/^https:\\/\\/github\\.com/')
  })

  it('handles single word patterns', () => {
    expect(normalizeUrlPattern('localhost')).toBe('*localhost*')
  })
})

describe('isGroupAllowed with bare domains', () => {
  it('matches bare domain in activateOn against full URL', () => {
    const settings = { 'Work': { activateOn: 'gmail.com' } }
    expect(isGroupAllowed('Work', 'https://mail.google.com', settings)).toBe(false)
    expect(isGroupAllowed('Work', 'https://gmail.com/inbox', settings)).toBe(true)
    expect(isGroupAllowed('Work', 'https://gmail.com', settings)).toBe(true)
  })

  it('matches bare domain in deactivateOn against full URL', () => {
    const settings = { 'Work': { deactivateOn: 'settings' } }
    expect(isGroupAllowed('Work', 'https://gmail.com/inbox', settings)).toBe(true)
    expect(isGroupAllowed('Work', 'https://gmail.com/settings', settings)).toBe(false)
  })

  it('works with bare domain in both fields', () => {
    const settings = { 'Work': { activateOn: 'github.com', deactivateOn: 'settings' } }
    expect(isGroupAllowed('Work', 'https://github.com/repo', settings)).toBe(true)
    expect(isGroupAllowed('Work', 'https://github.com/settings', settings)).toBe(false)
    expect(isGroupAllowed('Work', 'https://example.com', settings)).toBe(false)
  })
})
