import { describe, it, expect } from 'vitest'
import { getSiteShortcuts } from '../src/site-shortcuts'
import type { SiteShortcutData } from '../src/site-shortcuts'

// Import all site modules to test data integrity
import { github } from '../src/site-shortcuts/github'
import { gmail } from '../src/site-shortcuts/gmail'
import { reddit } from '../src/site-shortcuts/reddit'
import { youtube } from '../src/site-shortcuts/youtube'
import { slack } from '../src/site-shortcuts/slack'
import { notion } from '../src/site-shortcuts/notion'
import { twitter } from '../src/site-shortcuts/twitter'

const ALL_SITES: SiteShortcutData[] = [github, gmail, reddit, youtube, slack, notion, twitter]

describe('getSiteShortcuts URL matching', () => {
  it('matches github.com', () => {
    const result = getSiteShortcuts('https://github.com/crittermike/shortkeys')
    expect(result).toBeDefined()
    expect(result!.title).toBe('GitHub')
  })

  it('matches mail.google.com', () => {
    const result = getSiteShortcuts('https://mail.google.com/mail/u/0/#inbox')
    expect(result).toBeDefined()
    expect(result!.title).toBe('Gmail')
  })

  it('matches reddit.com', () => {
    const result = getSiteShortcuts('https://www.reddit.com/r/programming')
    expect(result).toBeDefined()
    expect(result!.title).toBe('Reddit')
  })

  it('matches old.reddit.com', () => {
    const result = getSiteShortcuts('https://old.reddit.com/r/programming')
    expect(result).toBeDefined()
    expect(result!.title).toBe('Reddit')
  })

  it('matches youtube.com', () => {
    const result = getSiteShortcuts('https://www.youtube.com/watch?v=abc123')
    expect(result).toBeDefined()
    expect(result!.title).toBe('YouTube')
  })

  it('matches slack.com subdomains', () => {
    const result = getSiteShortcuts('https://myteam.slack.com/messages')
    expect(result).toBeDefined()
    expect(result!.title).toBe('Slack')
  })

  it('matches app.slack.com', () => {
    const result = getSiteShortcuts('https://app.slack.com/client/T12345')
    expect(result).toBeDefined()
    expect(result!.title).toBe('Slack')
  })

  it('matches notion.so', () => {
    const result = getSiteShortcuts('https://www.notion.so/My-Page-abc123')
    expect(result).toBeDefined()
    expect(result!.title).toBe('Notion')
  })

  it('matches twitter.com', () => {
    const result = getSiteShortcuts('https://twitter.com/home')
    expect(result).toBeDefined()
    expect(result!.title).toBe('X (Twitter)')
  })

  it('matches x.com', () => {
    const result = getSiteShortcuts('https://x.com/home')
    expect(result).toBeDefined()
    expect(result!.title).toBe('X (Twitter)')
  })

  it('returns undefined for unrecognized sites', () => {
    expect(getSiteShortcuts('https://example.com')).toBeUndefined()
    expect(getSiteShortcuts('https://stackoverflow.com/questions')).toBeUndefined()
    expect(getSiteShortcuts('https://google.com')).toBeUndefined()
  })

  it('returns undefined for invalid URLs', () => {
    expect(getSiteShortcuts('')).toBeUndefined()
    expect(getSiteShortcuts('not-a-url')).toBeUndefined()
    expect(getSiteShortcuts('ftp://')).toBeUndefined()
  })

  it('does not match partial hostnames (e.g. fakegithub.com)', () => {
    expect(getSiteShortcuts('https://fakegithub.com')).toBeUndefined()
    expect(getSiteShortcuts('https://notreddit.com')).toBeUndefined()
    expect(getSiteShortcuts('https://notyoutube.com')).toBeUndefined()
  })

  it('matches subdomains correctly', () => {
    // github.com subdomain
    const ghSub = getSiteShortcuts('https://gist.github.com')
    expect(ghSub).toBeDefined()
    expect(ghSub!.title).toBe('GitHub')

    // youtube.com subdomain
    const ytSub = getSiteShortcuts('https://music.youtube.com')
    expect(ytSub).toBeDefined()
    expect(ytSub!.title).toBe('YouTube')
  })
})

describe('site shortcut data integrity', () => {
  it('all sites have required metadata', () => {
    for (const site of ALL_SITES) {
      expect(site.title, `site missing title`).toBeTruthy()
      expect(site.referenceUrl, `${site.title} missing referenceUrl`).toBeTruthy()
      expect(site.hostPatterns.length, `${site.title} has no host patterns`).toBeGreaterThan(0)
      expect(site.sections.length, `${site.title} has no sections`).toBeGreaterThan(0)
    }
  })

  it('all sites have valid reference URLs', () => {
    for (const site of ALL_SITES) {
      expect(() => new URL(site.referenceUrl), `${site.title} has invalid referenceUrl: ${site.referenceUrl}`).not.toThrow()
    }
  })

  it('all sections have at least one shortcut', () => {
    for (const site of ALL_SITES) {
      for (const section of site.sections) {
        expect(section.shortcuts.length, `${site.title} → ${section.name} has no shortcuts`).toBeGreaterThan(0)
      }
    }
  })

  it('all shortcuts have description and keys', () => {
    for (const site of ALL_SITES) {
      for (const section of site.sections) {
        for (const shortcut of section.shortcuts) {
          expect(shortcut.description, `${site.title} → ${section.name}: shortcut missing description`).toBeTruthy()
          expect(shortcut.keys.length, `${site.title} → ${section.name} → "${shortcut.description}": no keys`).toBeGreaterThan(0)
          for (const key of shortcut.keys) {
            expect(key, `${site.title} → "${shortcut.description}": has empty key part`).toBeTruthy()
          }
        }
      }
    }
  })

  it('all host patterns are valid lowercase hostnames', () => {
    for (const site of ALL_SITES) {
      for (const pattern of site.hostPatterns) {
        expect(pattern, `${site.title} has empty host pattern`).toBeTruthy()
        expect(pattern).toBe(pattern.toLowerCase())
        // Should not contain protocol or path
        expect(pattern).not.toContain('://')
        expect(pattern).not.toContain('/')
      }
    }
  })

  it('no duplicate host patterns across sites', () => {
    const allPatterns: string[] = []
    for (const site of ALL_SITES) {
      allPatterns.push(...site.hostPatterns)
    }
    expect(new Set(allPatterns).size).toBe(allPatterns.length)
  })

  it('section names are unique within each site', () => {
    for (const site of ALL_SITES) {
      const names = site.sections.map((s) => s.name)
      expect(new Set(names).size, `${site.title} has duplicate section names`).toBe(names.length)
    }
  })

  it('all site titles are unique', () => {
    const titles = ALL_SITES.map((s) => s.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})
