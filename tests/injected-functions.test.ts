import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * @vitest-environment jsdom
 *
 * Behavioral tests for injected page functions.
 * These test the actual functions passed to executeScript by simulating DOM elements.
 */

describe('inserttext injected function', () => {
  // Extract the function logic from action-handlers.ts inserttext handler
  function insertTextFn(text: string) {
    const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
    if (el && ('value' in el)) {
      const start = el.selectionStart ?? el.value.length
      const end = el.selectionEnd ?? el.value.length
      el.value = el.value.slice(0, start) + text + el.value.slice(end)
      el.selectionStart = el.selectionEnd = start + text.length
      el.dispatchEvent(new Event('input', { bubbles: true }))
    } else if (document.activeElement?.isContentEditable) {
      document.execCommand('insertText', false, text)
    }
  }

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('inserts text into an empty input at cursor position', () => {
    const input = document.createElement('input')
    input.value = ''
    document.body.appendChild(input)
    input.focus()
    input.selectionStart = 0
    input.selectionEnd = 0

    insertTextFn('hello')

    expect(input.value).toBe('hello')
    expect(input.selectionStart).toBe(5)
  })

  it('inserts text at cursor position in the middle of existing text', () => {
    const input = document.createElement('input')
    input.value = 'world'
    document.body.appendChild(input)
    input.focus()
    input.selectionStart = 0
    input.selectionEnd = 0

    insertTextFn('hello ')

    expect(input.value).toBe('hello world')
    expect(input.selectionStart).toBe(6)
  })

  it('replaces selected text in an input', () => {
    const input = document.createElement('input')
    input.value = 'hello world'
    document.body.appendChild(input)
    input.focus()
    input.selectionStart = 6
    input.selectionEnd = 11

    insertTextFn('everyone')

    expect(input.value).toBe('hello everyone')
  })

  it('works with textarea elements', () => {
    const textarea = document.createElement('textarea')
    textarea.value = 'line1\nline2'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.selectionStart = 5
    textarea.selectionEnd = 5

    insertTextFn('\ninserted')

    expect(textarea.value).toBe('line1\ninserted\nline2')
  })

  it('appends text when no selection info is available', () => {
    const input = document.createElement('input')
    input.value = 'existing'
    document.body.appendChild(input)
    input.focus()
    // Simulate no selectionStart by setting it to end
    input.selectionStart = input.value.length
    input.selectionEnd = input.value.length

    insertTextFn(' more')

    expect(input.value).toBe('existing more')
  })

  it('dispatches input event for reactivity', () => {
    const input = document.createElement('input')
    input.value = ''
    document.body.appendChild(input)
    input.focus()
    input.selectionStart = 0
    input.selectionEnd = 0

    const handler = vi.fn()
    input.addEventListener('input', handler)

    insertTextFn('test')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('uses execCommand for contentEditable elements', () => {
    const div = document.createElement('div')
    div.contentEditable = 'true'
    div.tabIndex = 0
    // jsdom doesn't support isContentEditable, so define it
    Object.defineProperty(div, 'isContentEditable', { value: true })
    document.body.appendChild(div)
    div.focus()

    document.execCommand = vi.fn()
    insertTextFn('editable text')

    expect(document.execCommand).toHaveBeenCalledWith('insertText', false, 'editable text')
  })

  it('does nothing when focused element is not an input', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    div.focus()

    // Should not throw
    insertTextFn('text')
  })
})

describe('video control injected functions', () => {
  let video: HTMLVideoElement

  beforeEach(() => {
    document.body.innerHTML = ''
    video = document.createElement('video')
    video.src = 'test.mp4'
    document.body.appendChild(video)
    // Mock play to return a promise (JSDOM doesn't support it)
    video.play = vi.fn().mockResolvedValue(undefined)
    video.pause = vi.fn()
    video.requestFullscreen = vi.fn().mockResolvedValue(undefined)
  })

  it('play/pause toggles playback', () => {
    const fn = () => { const v = document.querySelector('video'); if (v) v.paused ? v.play() : v.pause() }

    // Video starts paused
    Object.defineProperty(video, 'paused', { value: true, writable: true })
    fn()
    expect(video.play).toHaveBeenCalled()
  })

  it('mute toggles muted state', () => {
    const fn = () => { const v = document.querySelector('video'); if (v) v.muted = !v.muted }

    video.muted = false
    fn()
    expect(video.muted).toBe(true)
    fn()
    expect(video.muted).toBe(false)
  })

  it('speed up increases playback rate by 0.25', () => {
    const fn = () => { const v = document.querySelector('video'); if (v) { v.playbackRate = Math.min(v.playbackRate + 0.25, 16) } }

    video.playbackRate = 1
    fn()
    expect(video.playbackRate).toBe(1.25)
    fn()
    expect(video.playbackRate).toBe(1.5)
  })

  it('speed down decreases playback rate by 0.25', () => {
    const fn = () => { const v = document.querySelector('video'); if (v) { v.playbackRate = Math.max(v.playbackRate - 0.25, 0.25) } }

    video.playbackRate = 1
    fn()
    expect(video.playbackRate).toBe(0.75)
  })

  it('speed down does not go below 0.25', () => {
    const fn = () => { const v = document.querySelector('video'); if (v) { v.playbackRate = Math.max(v.playbackRate - 0.25, 0.25) } }

    video.playbackRate = 0.25
    fn()
    expect(video.playbackRate).toBe(0.25)
  })

  it('speed up does not go above 16', () => {
    const fn = () => { const v = document.querySelector('video'); if (v) { v.playbackRate = Math.min(v.playbackRate + 0.25, 16) } }

    video.playbackRate = 16
    fn()
    expect(video.playbackRate).toBe(16)
  })

  it('speed reset sets to 1x', () => {
    const fn = () => { const v = document.querySelector('video'); if (v) v.playbackRate = 1 }

    video.playbackRate = 2.5
    fn()
    expect(video.playbackRate).toBe(1)
  })

  it('skip forward adds 10 seconds', () => {
    const fn = () => { const v = document.querySelector('video'); if (v) v.currentTime += 10 }

    Object.defineProperty(video, 'currentTime', { value: 30, writable: true })
    fn()
    expect(video.currentTime).toBe(40)
  })

  it('skip back subtracts 10 seconds', () => {
    const fn = () => { const v = document.querySelector('video'); if (v) v.currentTime -= 10 }

    Object.defineProperty(video, 'currentTime', { value: 30, writable: true })
    fn()
    expect(video.currentTime).toBe(20)
  })

  it('handles no video element gracefully', () => {
    document.body.innerHTML = '' // remove video
    const fn = () => { const v = document.querySelector('video'); if (v) v.play() }
    expect(() => fn()).not.toThrow()
  })
})

describe('scroll focused element logic (#300)', () => {
  it('scrolls focused scrollable element instead of window', () => {
    const div = document.createElement('div')
    div.tabIndex = 0
    Object.defineProperty(div, 'scrollHeight', { value: 1000, configurable: true })
    Object.defineProperty(div, 'clientHeight', { value: 200, configurable: true })
    div.scrollBy = vi.fn()
    document.body.appendChild(div)
    div.focus()

    expect(document.activeElement).toBe(div)

    const el = document.activeElement
    const t = el && el !== document.body && el.scrollHeight > el.clientHeight ? el : window
    t.scrollBy({ left: 0, top: 50, behavior: 'auto' as ScrollBehavior })

    expect(div.scrollBy).toHaveBeenCalledWith({ left: 0, top: 50, behavior: 'auto' })
  })

  it('falls back to window when focused element is not scrollable', () => {
    const div = document.createElement('div')
    div.tabIndex = 0
    Object.defineProperty(div, 'scrollHeight', { value: 100, configurable: true })
    Object.defineProperty(div, 'clientHeight', { value: 100, configurable: true })
    document.body.appendChild(div)
    div.focus()

    const windowSpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})

    const el = document.activeElement
    const t = el && el !== document.body && el.scrollHeight > el.clientHeight ? el : window
    t.scrollBy({ left: 0, top: 50, behavior: 'auto' as ScrollBehavior })

    expect(windowSpy).toHaveBeenCalledWith({ left: 0, top: 50, behavior: 'auto' })
    windowSpy.mockRestore()
  })

  it('falls back to window when body is focused', () => {
    document.body.focus()

    const windowSpy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})

    const el = document.activeElement
    const t = el && el !== document.body && el.scrollHeight > el.clientHeight ? el : window
    t.scrollBy({ left: 0, top: 50, behavior: 'auto' as ScrollBehavior })

    expect(windowSpy).toHaveBeenCalled()
    windowSpy.mockRestore()
  })

  it('handles horizontal scrolling in focused element', () => {
    const div = document.createElement('div')
    div.tabIndex = 0
    Object.defineProperty(div, 'scrollWidth', { value: 2000, configurable: true })
    Object.defineProperty(div, 'clientWidth', { value: 300, configurable: true })
    div.scrollBy = vi.fn()
    document.body.appendChild(div)
    div.focus()

    const el = document.activeElement
    const t = el && el !== document.body && el.scrollWidth > el.clientWidth ? el : window
    t.scrollBy({ left: 50, top: 0, behavior: 'auto' as ScrollBehavior })

    expect(div.scrollBy).toHaveBeenCalledWith({ left: 50, top: 0, behavior: 'auto' })
  })
})

describe('dark mode toggle', () => {
  const STYLE_ID = '__shortkeys-darkmode'

  function toggleDarkMode() {
    const existing = document.getElementById(STYLE_ID)
    if (existing) { existing.remove(); return }
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      html { filter: invert(1) hue-rotate(180deg) !important; }
      img, video, picture, canvas, svg, [style*="background-image"] {
        filter: invert(1) hue-rotate(180deg) !important;
      }
    `
    document.documentElement.appendChild(style)
  }

  beforeEach(() => {
    const existing = document.getElementById(STYLE_ID)
    if (existing) existing.remove()
  })

  it('injects dark mode style on first call', () => {
    toggleDarkMode()
    const style = document.getElementById(STYLE_ID)
    expect(style).toBeTruthy()
    expect(style!.textContent).toContain('invert(1)')
    expect(style!.textContent).toContain('hue-rotate(180deg)')
  })

  it('removes dark mode style on second call (toggle off)', () => {
    toggleDarkMode() // on
    expect(document.getElementById(STYLE_ID)).toBeTruthy()
    toggleDarkMode() // off
    expect(document.getElementById(STYLE_ID)).toBeNull()
  })

  it('toggles back on after being toggled off', () => {
    toggleDarkMode() // on
    toggleDarkMode() // off
    toggleDarkMode() // on again
    expect(document.getElementById(STYLE_ID)).toBeTruthy()
  })

  it('preserves images by double-inverting them', () => {
    toggleDarkMode()
    const style = document.getElementById(STYLE_ID)
    expect(style!.textContent).toContain('img, video, picture, canvas, svg')
  })
})

describe('cheat sheet overlay', () => {
  const OVERLAY_ID = '__shortkeys-cheatsheet'

  function createCheatSheet(keys: Array<{ key: string; action: string; label?: string; enabled?: boolean }>) {
    const existing = document.getElementById(OVERLAY_ID)
    if (existing) { existing.remove(); return }
    const overlay = document.createElement('div')
    overlay.id = OVERLAY_ID
    const activeKeys = keys.filter((k) => k.key && k.action && k.enabled !== false)
    for (const k of activeKeys) {
      const row = document.createElement('div')
      row.className = 'cheatsheet-row'
      row.setAttribute('data-key', k.key)
      row.setAttribute('data-label', k.label || k.action)
      overlay.appendChild(row)
    }
    document.body.appendChild(overlay)
  }

  beforeEach(() => {
    const existing = document.getElementById(OVERLAY_ID)
    if (existing) existing.remove()
  })

  it('creates overlay with active shortcuts', () => {
    createCheatSheet([
      { key: 'ctrl+b', action: 'newtab', label: 'New tab' },
      { key: 'j', action: 'scrolldown', label: 'Scroll down' },
    ])
    const overlay = document.getElementById(OVERLAY_ID)
    expect(overlay).toBeTruthy()
    const rows = overlay!.querySelectorAll('.cheatsheet-row')
    expect(rows).toHaveLength(2)
    expect(rows[0].getAttribute('data-key')).toBe('ctrl+b')
    expect(rows[0].getAttribute('data-label')).toBe('New tab')
  })

  it('excludes disabled shortcuts', () => {
    createCheatSheet([
      { key: 'ctrl+b', action: 'newtab', enabled: true },
      { key: 'ctrl+c', action: 'closetab', enabled: false },
    ])
    const rows = document.querySelectorAll('.cheatsheet-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].getAttribute('data-key')).toBe('ctrl+b')
  })

  it('excludes shortcuts with no key', () => {
    createCheatSheet([
      { key: '', action: 'newtab' },
      { key: 'j', action: 'scrolldown' },
    ])
    const rows = document.querySelectorAll('.cheatsheet-row')
    expect(rows).toHaveLength(1)
  })

  it('toggles off when called again', () => {
    createCheatSheet([{ key: 'j', action: 'scrolldown' }])
    expect(document.getElementById(OVERLAY_ID)).toBeTruthy()
    createCheatSheet([{ key: 'j', action: 'scrolldown' }])
    expect(document.getElementById(OVERLAY_ID)).toBeNull()
  })

  it('uses action name when no label is set', () => {
    createCheatSheet([{ key: 'j', action: 'scrolldown' }])
    const row = document.querySelector('.cheatsheet-row')
    expect(row!.getAttribute('data-label')).toBe('scrolldown')
  })
})
