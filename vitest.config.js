import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      include: ['app/scripts/**/*.js'],
      exclude: ['app/scripts/actions/captureScreenshot.js'],
      reporter: ['text', 'lcov'],
    },
  },
})
