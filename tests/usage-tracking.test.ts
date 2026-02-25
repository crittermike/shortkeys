import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLocalGet = vi.fn()
const mockLocalSet = vi.fn()
const mockLocalRemove = vi.fn()

// @ts-ignore
globalThis.chrome = {
  storage: {
    local: { get: mockLocalGet, set: mockLocalSet, remove: mockLocalRemove },
    sync: { get: vi.fn().mockResolvedValue({}), set: vi.fn() },
    onChanged: { addListener: vi.fn() },
  },
}

const {
  trackUsage,
  loadUsageData,
  loadDailyUsage,
  clearUsageData,
  cleanupOrphanedUsage,
  isTrackingEnabled,
  setTrackingEnabled,
} = await import('../src/utils/usage-tracking')

beforeEach(() => {
  vi.clearAllMocks()
  mockLocalGet.mockResolvedValue({})
  mockLocalSet.mockResolvedValue(undefined)
  mockLocalRemove.mockResolvedValue(undefined)
})

describe('isTrackingEnabled', () => {
  it('returns true by default when not set', async () => {
    mockLocalGet.mockResolvedValue({})
    expect(await isTrackingEnabled()).toBe(true)
  })

  it('returns true when explicitly enabled', async () => {
    mockLocalGet.mockResolvedValue({ usageEnabled: true })
    expect(await isTrackingEnabled()).toBe(true)
  })

  it('returns false when disabled', async () => {
    mockLocalGet.mockResolvedValue({ usageEnabled: false })
    expect(await isTrackingEnabled()).toBe(false)
  })
})

describe('setTrackingEnabled', () => {
  it('sets the tracking flag in local storage', async () => {
    await setTrackingEnabled(false)
    expect(mockLocalSet).toHaveBeenCalledWith({ usageEnabled: false })

    await setTrackingEnabled(true)
    expect(mockLocalSet).toHaveBeenCalledWith({ usageEnabled: true })
  })
})

describe('loadUsageData', () => {
  it('returns empty object when no data exists', async () => {
    mockLocalGet.mockResolvedValue({})
    expect(await loadUsageData()).toEqual({})
  })

  it('returns stored usage data', async () => {
    const data = { 'abc-123': { count: 5, firstUsed: 1000, lastUsed: 2000 } }
    mockLocalGet.mockResolvedValue({ usage: data })
    expect(await loadUsageData()).toEqual(data)
  })
})

describe('loadDailyUsage', () => {
  it('returns empty array when no data exists', async () => {
    mockLocalGet.mockResolvedValue({})
    expect(await loadDailyUsage()).toEqual([])
  })

  it('returns stored daily data', async () => {
    const data = [{ date: '2026-01-15', counts: { 'abc': 3 } }]
    mockLocalGet.mockResolvedValue({ usageDaily: data })
    expect(await loadDailyUsage()).toEqual(data)
  })
})

describe('trackUsage', () => {
  it('does nothing if shortcutId is empty', async () => {
    await trackUsage('')
    expect(mockLocalSet).not.toHaveBeenCalled()
  })

  it('does nothing if tracking is disabled', async () => {
    // First call: isTrackingEnabled checks usageEnabled
    mockLocalGet.mockResolvedValueOnce({ usageEnabled: false })
    await trackUsage('abc-123')
    expect(mockLocalSet).not.toHaveBeenCalled()
  })

  it('creates a new entry for first-time usage', async () => {
    const now = Date.now()
    vi.setSystemTime(now)

    // Call 1: isTrackingEnabled
    mockLocalGet.mockResolvedValueOnce({})
    // Call 2: loadUsageData
    mockLocalGet.mockResolvedValueOnce({})
    // Call 3: loadDailyUsage
    mockLocalGet.mockResolvedValueOnce({})

    await trackUsage('abc-123')

    expect(mockLocalSet).toHaveBeenCalledTimes(1)
    const setCall = mockLocalSet.mock.calls[0][0]
    expect(setCall.usage['abc-123']).toEqual({
      count: 1,
      firstUsed: now,
      lastUsed: now,
    })
    expect(setCall.usageDaily).toHaveLength(1)
    expect(setCall.usageDaily[0].counts['abc-123']).toBe(1)

    vi.useRealTimers()
  })

  it('increments count for existing entry', async () => {
    const firstUsed = 1000
    const existingUsage = {
      'abc-123': { count: 5, firstUsed, lastUsed: 2000 },
    }
    const now = Date.now()
    vi.setSystemTime(now)

    mockLocalGet.mockResolvedValueOnce({}) // isTrackingEnabled
    mockLocalGet.mockResolvedValueOnce({ usage: existingUsage }) // loadUsageData
    mockLocalGet.mockResolvedValueOnce({}) // loadDailyUsage

    await trackUsage('abc-123')

    const setCall = mockLocalSet.mock.calls[0][0]
    expect(setCall.usage['abc-123'].count).toBe(6)
    expect(setCall.usage['abc-123'].firstUsed).toBe(firstUsed)
    expect(setCall.usage['abc-123'].lastUsed).toBe(now)

    vi.useRealTimers()
  })

  it('increments daily count for same day', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const existingDaily = [
      { date: today, counts: { 'abc-123': 2 } },
    ]

    mockLocalGet.mockResolvedValueOnce({}) // isTrackingEnabled
    mockLocalGet.mockResolvedValueOnce({}) // loadUsageData
    mockLocalGet.mockResolvedValueOnce({ usageDaily: existingDaily }) // loadDailyUsage

    await trackUsage('abc-123')

    const setCall = mockLocalSet.mock.calls[0][0]
    const todayEntry = setCall.usageDaily.find((d: any) => d.date === today)
    expect(todayEntry.counts['abc-123']).toBe(3)
  })

  it('prunes daily entries beyond 90 days', async () => {
    // Create 95 daily entries
    const entries = Array.from({ length: 95 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (94 - i))
      return { date: d.toISOString().slice(0, 10), counts: { 'abc': 1 } }
    })

    mockLocalGet.mockResolvedValueOnce({}) // isTrackingEnabled
    mockLocalGet.mockResolvedValueOnce({}) // loadUsageData
    mockLocalGet.mockResolvedValueOnce({ usageDaily: entries }) // loadDailyUsage

    await trackUsage('abc-123')

    const setCall = mockLocalSet.mock.calls[0][0]
    // 95 existing + 1 today = 96, pruned to 90
    expect(setCall.usageDaily.length).toBeLessThanOrEqual(90)
  })
})

describe('cleanupOrphanedUsage', () => {
  it('removes usage entries for deleted shortcuts', async () => {
    const usage = {
      'active-1': { count: 5, firstUsed: 1000, lastUsed: 2000 },
      'deleted-1': { count: 3, firstUsed: 1000, lastUsed: 1500 },
    }
    const daily = [
      { date: '2026-01-15', counts: { 'active-1': 2, 'deleted-1': 1 } },
    ]

    mockLocalGet
      .mockResolvedValueOnce({ usage }) // loadUsageData
      .mockResolvedValueOnce({ usageDaily: daily }) // loadDailyUsage

    await cleanupOrphanedUsage(['active-1'])

    const setCall = mockLocalSet.mock.calls[0][0]
    expect(setCall.usage).toHaveProperty('active-1')
    expect(setCall.usage).not.toHaveProperty('deleted-1')
    expect(setCall.usageDaily[0].counts).not.toHaveProperty('deleted-1')
    expect(setCall.usageDaily[0].counts).toHaveProperty('active-1')
  })

  it('does nothing if all entries are active', async () => {
    const usage = {
      'active-1': { count: 5, firstUsed: 1000, lastUsed: 2000 },
    }
    const daily = [
      { date: '2026-01-15', counts: { 'active-1': 2 } },
    ]

    mockLocalGet
      .mockResolvedValueOnce({ usage })
      .mockResolvedValueOnce({ usageDaily: daily })

    await cleanupOrphanedUsage(['active-1'])

    expect(mockLocalSet).not.toHaveBeenCalled()
  })
})

describe('clearUsageData', () => {
  it('removes usage and usageDaily from storage', async () => {
    await clearUsageData()
    expect(mockLocalRemove).toHaveBeenCalledWith(['usage', 'usageDaily'])
  })
})
