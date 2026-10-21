import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Extensions require serial execution
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'html',
  timeout: 30_000,
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  updateSnapshots: 'none',
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.002 },
  },
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', testIgnore: ['firefox/**', 'upgrade.spec.ts', 'visual.spec.ts'] },
    { name: 'upgrade', testMatch: 'upgrade.spec.ts', timeout: 120_000 },
    { name: 'visual', testMatch: 'visual.spec.ts' },
    { name: 'firefox', testDir: 'e2e/firefox', timeout: 60_000 },
  ],
})
