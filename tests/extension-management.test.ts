import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getExtensionManagementUrl, openExtensionManagementPage } from '../src/utils/extension-management'

const mockTabsCreate = vi.fn()

// @ts-ignore
globalThis.chrome = {
  runtime: { id: 'test-extension-id' },
  tabs: { create: mockTabsCreate },
}

describe('extension management helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the Chrome extension details URL by default', () => {
    expect(getExtensionManagementUrl({
      userAgent: 'Mozilla/5.0 Chrome/137.0.0.0 Safari/537.36',
    })).toBe('chrome://extensions/?id=test-extension-id')
  })

  it('returns the Edge extension details URL', () => {
    expect(getExtensionManagementUrl({
      userAgent: 'Mozilla/5.0 Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0',
    })).toBe('edge://extensions/?id=test-extension-id')
  })

  it('returns the Opera extension details URL', () => {
    expect(getExtensionManagementUrl({
      userAgent: 'Mozilla/5.0 Chrome/137.0.0.0 Safari/537.36 OPR/116.0.0.0',
    })).toBe('opera://extensions/?id=test-extension-id')
  })

  it('returns the Firefox add-ons page', () => {
    expect(getExtensionManagementUrl({
      userAgent: 'Mozilla/5.0 Firefox/137.0',
    })).toBe('about:addons')
  })

  it('falls back to the generic extensions page when no extension id is available', () => {
    expect(getExtensionManagementUrl({
      userAgent: 'Mozilla/5.0 Chrome/137.0.0.0 Safari/537.36',
      extensionId: '',
    })).toBe('chrome://extensions')
  })

  it('opens the extension management page in a new active tab', async () => {
    await openExtensionManagementPage({
      userAgent: 'Mozilla/5.0 Chrome/137.0.0.0 Safari/537.36',
    })

    expect(mockTabsCreate).toHaveBeenCalledWith({
      url: 'chrome://extensions/?id=test-extension-id',
      active: true,
    })
  })
})
