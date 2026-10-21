import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/utils/execute-script', () => ({
  executeScript: vi.fn().mockResolvedValue([]), showPageToast: vi.fn(),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function loadConsent(browserName: string) {
  vi.stubEnv('BROWSER', browserName)
  vi.resetModules()
  return import('../src/utils/firefox-consent')
}

describe('Firefox transmission consent', () => {
  it('does not access Firefox permissions on Chrome', async () => {
    const { hasFirefoxDataConsent } = await loadConsent('chrome')
    expect(await hasFirefoxDataConsent(['browsingActivity'])).toBe(true)
  })

  it('requires the correct optional data categories and rechecks revocation', async () => {
    const getAll = vi.fn()
      .mockResolvedValueOnce({ data_collection: [] })
      .mockResolvedValueOnce({ data_collection: ['browsingActivity'] })
      .mockResolvedValueOnce({ data_collection: [] })
    vi.stubGlobal('browser', { permissions: { getAll } })
    const { hasFirefoxDataConsent, getActionDataTypes } = await loadConsent('firefox')
    expect(await hasFirefoxDataConsent(getActionDataTypes('script-qr-code'))).toBe(false)
    expect(await hasFirefoxDataConsent(getActionDataTypes('script-qr-code'))).toBe(true)
    expect(await hasFirefoxDataConsent(getActionDataTypes('script-qr-code'))).toBe(false)
    expect(getActionDataTypes('searchgoogle')).toEqual(['websiteContent', 'searchTerms'])
    expect(getActionDataTypes('scrolldown')).toEqual([])
  })

  it('fails closed when native data consent is unavailable', async () => {
    vi.stubGlobal('browser', { permissions: { getAll: vi.fn().mockResolvedValue({ permissions: [] }) } })
    const { hasFirefoxDataConsent } = await loadConsent('firefox')
    expect(await hasFirefoxDataConsent(['browsingActivity'])).toBe(false)
  })

  it('requests native optional consent without awaiting other work first', async () => {
    const request = vi.fn().mockResolvedValue(false)
    vi.stubGlobal('browser', { permissions: { request } })
    const { requestFirefoxDataConsent, FIREFOX_DATA_TYPES } = await loadConsent('firefox')
    const result = requestFirefoxDataConsent()
    expect(request).toHaveBeenCalledWith({ data_collection: [...FIREFOX_DATA_TYPES] })
    expect(await result).toBe(false)
  })

  it('does not swallow permission API failures', async () => {
    vi.stubGlobal('browser', { permissions: { getAll: vi.fn().mockRejectedValue(new Error('Permission lookup failed')) } })
    const { hasFirefoxDataConsent } = await loadConsent('firefox')
    await expect(hasFirefoxDataConsent(['browsingActivity'])).rejects.toThrow('Permission lookup failed')
  })

  it('gates real dispatch, including macros, while leaving local actions available', async () => {
    const create = vi.fn().mockResolvedValue({})
    const getAll = vi.fn().mockResolvedValue({ data_collection: [] })
    const browser = { permissions: { getAll }, tabs: { create } }
    vi.stubGlobal('browser', browser)
    vi.stubGlobal('chrome', browser)
    await loadConsent('firefox')
    const { handleAction } = await import('../src/actions/action-handlers')
    const { executeScript } = await import('../src/utils/execute-script')
    vi.mocked(executeScript).mockClear()
    await handleAction('newtab')
    expect(create).toHaveBeenCalledTimes(1)
    await expect(handleAction('script-qr-code')).rejects.toThrow('Allow data transmission')
    await expect(handleAction('macro', {
      key: 'alt+m', action: 'macro', macroSteps: [{ action: 'searchgoogle' }, { action: 'newtab' }],
    })).rejects.toThrow('Allow data transmission')
    expect(executeScript).not.toHaveBeenCalled()
    expect(create).toHaveBeenCalledTimes(1)
    getAll.mockResolvedValue({ data_collection: ['browsingActivity'] })
    await handleAction('script-qr-code')
    expect(executeScript).toHaveBeenCalledTimes(1)
    expect(typeof vi.mocked(executeScript).mock.calls[0][0]).toBe('function')
    getAll.mockResolvedValue({ data_collection: [] })
    await expect(handleAction('script-qr-code')).rejects.toThrow('Allow data transmission')
    expect(executeScript).toHaveBeenCalledTimes(1)
  })
})

describe('Remote executable pack detection', () => {
  it('checks code rather than trusting remote hasJavaScript metadata', async () => {
    const { containsRemoteCode } = await loadConsent('firefox')
    expect(containsRemoteCode([{ action: 'javascript' }])).toBe(true)
    expect(containsRemoteCode([{ action: 'macro', macroSteps: [{ action: 'javascript', code: 'alert(1)' }] }])).toBe(true)
    expect(containsRemoteCode([{ action: 'openurl', openurl: ' javascript:alert(1)' }])).toBe(true)
    expect(containsRemoteCode([{ action: 'scrolldown', code: 'alert(1)' }])).toBe(true)
    expect(containsRemoteCode([{ action: 'script-dark-mode' }, { action: 'scrolldown' }])).toBe(false)
  })
})
