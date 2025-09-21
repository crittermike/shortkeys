module.exports = {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'vue'],
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.vue$': 'vue-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1'
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'app/**/*.js',
    '!app/**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};