// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useViewDensity } from '../src/composables/useViewDensity'

describe('useViewDensity', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-density')
  })

  describe('initDensity', () => {
    it('defaults to comfortable when nothing stored', () => {
      const { density, initDensity } = useViewDensity()
      initDensity()
      expect(density.value).toBe('comfortable')
      expect(document.documentElement.getAttribute('data-density')).toBe('comfortable')
    })

    it('restores condensed from localStorage', () => {
      localStorage.setItem('shortkeys-view-density', 'condensed')
      const { density, initDensity } = useViewDensity()
      initDensity()
      expect(density.value).toBe('condensed')
      expect(document.documentElement.getAttribute('data-density')).toBe('condensed')
    })

    it('restores comfortable from localStorage', () => {
      localStorage.setItem('shortkeys-view-density', 'comfortable')
      const { density, initDensity } = useViewDensity()
      initDensity()
      expect(density.value).toBe('comfortable')
      expect(document.documentElement.getAttribute('data-density')).toBe('comfortable')
    })

    it('ignores invalid stored value and defaults to comfortable', () => {
      localStorage.setItem('shortkeys-view-density', 'invalid')
      const { density, initDensity } = useViewDensity()
      initDensity()
      expect(density.value).toBe('comfortable')
    })
  })

  describe('toggleDensity', () => {
    it('toggles from comfortable to condensed', () => {
      const { density, initDensity, toggleDensity } = useViewDensity()
      initDensity()
      expect(density.value).toBe('comfortable')

      toggleDensity()
      expect(density.value).toBe('condensed')
      expect(localStorage.getItem('shortkeys-view-density')).toBe('condensed')
      expect(document.documentElement.getAttribute('data-density')).toBe('condensed')
    })

    it('toggles from condensed back to comfortable', () => {
      localStorage.setItem('shortkeys-view-density', 'condensed')
      const { density, initDensity, toggleDensity } = useViewDensity()
      initDensity()
      expect(density.value).toBe('condensed')

      toggleDensity()
      expect(density.value).toBe('comfortable')
      expect(localStorage.getItem('shortkeys-view-density')).toBe('comfortable')
      expect(document.documentElement.getAttribute('data-density')).toBe('comfortable')
    })

    it('round-trips through multiple toggles', () => {
      const { density, initDensity, toggleDensity } = useViewDensity()
      initDensity()

      toggleDensity() // → condensed
      toggleDensity() // → comfortable
      toggleDensity() // → condensed
      expect(density.value).toBe('condensed')
      expect(localStorage.getItem('shortkeys-view-density')).toBe('condensed')
    })
  })

  describe('setDensity', () => {
    it('sets to condensed explicitly', () => {
      const { density, initDensity, setDensity } = useViewDensity()
      initDensity()

      setDensity('condensed')
      expect(density.value).toBe('condensed')
      expect(localStorage.getItem('shortkeys-view-density')).toBe('condensed')
      expect(document.documentElement.getAttribute('data-density')).toBe('condensed')
    })

    it('sets to comfortable explicitly', () => {
      const { density, initDensity, setDensity } = useViewDensity()
      initDensity()
      setDensity('condensed')

      setDensity('comfortable')
      expect(density.value).toBe('comfortable')
      expect(localStorage.getItem('shortkeys-view-density')).toBe('comfortable')
      expect(document.documentElement.getAttribute('data-density')).toBe('comfortable')
    })
  })
})
