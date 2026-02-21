import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockTabsGet = vi.fn()
const mockTabsUpdate = vi.fn()
const mockWindowsUpdate = vi.fn()
const mockDebuggerAttach = vi.fn()
const mockDebuggerDetach = vi.fn()
const mockDebuggerSendCommand = vi.fn()

// @ts-ignore
globalThis.chrome = {
  tabs: { get: mockTabsGet, update: mockTabsUpdate },
  windows: { update: mockWindowsUpdate },
  debugger: {
    attach: mockDebuggerAttach,
    detach: mockDebuggerDetach,
    sendCommand: mockDebuggerSendCommand,
  },
}

const { executeJavascriptOnTab } = await import('../src/utils/test-javascript')

const defaultTab = { id: 42, url: 'https://example.com/page', windowId: 1 }

beforeEach(() => {
  vi.clearAllMocks()
  mockTabsGet.mockResolvedValue(defaultTab)
  mockTabsUpdate.mockResolvedValue(undefined)
  mockWindowsUpdate.mockResolvedValue(undefined)
  mockDebuggerAttach.mockResolvedValue(undefined)
  mockDebuggerDetach.mockResolvedValue(undefined)
  mockDebuggerSendCommand.mockResolvedValue({})
})

describe('executeJavascriptOnTab', () => {
  it('passes the user code to Runtime.evaluate', async () => {
    const code = 'document.title = "Hello from Shortkeys"'
    await executeJavascriptOnTab(42, code)

    expect(mockDebuggerSendCommand).toHaveBeenCalledWith(
      { tabId: 42 },
      'Runtime.evaluate',
      { expression: code, userGesture: true, awaitPromise: true },
    )
  })

  it('passes multi-line code correctly', async () => {
    const code = `const el = document.querySelector('#main');
el.style.background = 'red';
console.log('done');`
    await executeJavascriptOnTab(42, code)

    expect(mockDebuggerSendCommand).toHaveBeenCalledWith(
      { tabId: 42 },
      'Runtime.evaluate',
      expect.objectContaining({ expression: code }),
    )
  })

  it('attaches debugger before evaluating and detaches after', async () => {
    const callOrder: string[] = []
    mockDebuggerAttach.mockImplementation(async () => { callOrder.push('attach') })
    mockDebuggerSendCommand.mockImplementation(async () => { callOrder.push('evaluate'); return {} })
    mockDebuggerDetach.mockImplementation(async () => { callOrder.push('detach') })

    await executeJavascriptOnTab(42, 'alert(1)')

    expect(callOrder).toEqual(['attach', 'evaluate', 'detach'])
  })

  it('detaches debugger even when evaluation throws', async () => {
    mockDebuggerSendCommand.mockRejectedValue(new Error('eval failed'))

    await executeJavascriptOnTab(42, 'bad code')

    expect(mockDebuggerDetach).toHaveBeenCalledWith({ tabId: 42 })
  })

  it('switches to the target tab and focuses its window', async () => {
    await executeJavascriptOnTab(42, 'void 0')

    expect(mockTabsUpdate).toHaveBeenCalledWith(42, { active: true })
    expect(mockWindowsUpdate).toHaveBeenCalledWith(1, { focused: true })
  })

  it('returns success with hostname on successful execution', async () => {
    mockDebuggerSendCommand.mockResolvedValue({ result: { value: 42 } })

    const result = await executeJavascriptOnTab(42, '21 + 21')

    expect(result).toEqual({ success: true, hostname: 'example.com' })
  })

  it('returns error when code throws an exception', async () => {
    mockDebuggerSendCommand.mockResolvedValue({
      exceptionDetails: {
        exception: { description: 'ReferenceError: foo is not defined' },
        text: 'Uncaught',
      },
    })

    const result = await executeJavascriptOnTab(42, 'foo()')

    expect(result).toEqual({
      success: false,
      error: 'ReferenceError: foo is not defined',
    })
  })

  it('returns error text when exception has no description', async () => {
    mockDebuggerSendCommand.mockResolvedValue({
      exceptionDetails: { text: 'Script evaluation failed' },
    })

    const result = await executeJavascriptOnTab(42, 'bad')

    expect(result).toEqual({ success: false, error: 'Script evaluation failed' })
  })

  it('returns error when debugger attach fails (e.g. chrome:// page)', async () => {
    mockDebuggerAttach.mockRejectedValue(new Error('Cannot attach to this target'))

    const result = await executeJavascriptOnTab(42, 'void 0')

    expect(result).toEqual({ success: false, error: 'Cannot attach to this target' })
  })

  it('handles empty code string', async () => {
    await executeJavascriptOnTab(42, '')

    expect(mockDebuggerSendCommand).toHaveBeenCalledWith(
      { tabId: 42 },
      'Runtime.evaluate',
      expect.objectContaining({ expression: '' }),
    )
  })

  it('handles tab with no URL gracefully', async () => {
    mockTabsGet.mockResolvedValue({ id: 42, windowId: 1 })

    const result = await executeJavascriptOnTab(42, 'void 0')

    expect(result).toEqual({ success: true, hostname: 'tab' })
  })
})
