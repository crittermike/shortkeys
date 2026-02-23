import { describe, it, expect } from 'vitest'
import { JS_SNIPPETS, SNIPPET_CATEGORIES } from '../src/utils/js-snippets'

describe('JS snippets library', () => {
  it('has snippets in every category', () => {
    for (const cat of SNIPPET_CATEGORIES) {
      const inCategory = JS_SNIPPETS.filter((s) => s.category === cat)
      expect(inCategory.length, `Category "${cat}" has no snippets`).toBeGreaterThan(0)
    }
  })

  it('all snippets have required fields', () => {
    for (const s of JS_SNIPPETS) {
      expect(s.id, 'Missing id').toBeTruthy()
      expect(s.name, `${s.id}: missing name`).toBeTruthy()
      expect(s.description, `${s.id}: missing description`).toBeTruthy()
      expect(s.category, `${s.id}: missing category`).toBeTruthy()
      expect(s.code, `${s.id}: missing code`).toBeTruthy()
    }
  })

  it('all snippet IDs are unique', () => {
    const ids = JS_SNIPPETS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all snippet categories are valid', () => {
    const validCats = new Set<string>(SNIPPET_CATEGORIES)
    for (const s of JS_SNIPPETS) {
      expect(validCats.has(s.category), `Snippet "${s.id}" has invalid category "${s.category}"`).toBe(true)
    }
  })

  it('all snippet code is valid JavaScript syntax', () => {
    for (const s of JS_SNIPPETS) {
      expect(() => new Function(s.code), `Snippet "${s.id}" has syntax error`).not.toThrow()
    }
  })

  it('has a reasonable number of snippets', () => {
    expect(JS_SNIPPETS.length).toBeGreaterThanOrEqual(20)
  })

  it('snippets can be filtered by search query', () => {
    const q = 'dark'
    const filtered = JS_SNIPPETS.filter((s) =>
      s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    )
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.some((s) => s.id === 'dark-mode')).toBe(true)
  })

  it('search with no matches returns empty', () => {
    const filtered = JS_SNIPPETS.filter((s) =>
      s.name.toLowerCase().includes('zzzznotreal')
    )
    expect(filtered).toHaveLength(0)
  })
})
