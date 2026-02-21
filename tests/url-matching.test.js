import { describe, it, expect } from 'vitest'
import { globToRegex, isAllowedSite } from '../src/utils/url-matching'

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
