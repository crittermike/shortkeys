# Testing Setup for Shortkeys

This document explains the automated testing setup for the Shortkeys browser extension.

## Overview

The project uses **Jest** as the testing framework with the following features:
- Unit tests for utility functions
- Code coverage reporting
- GitHub Actions integration for CI/CD
- Automated testing on pull requests

## Running Tests

### Local Development

```bash
# Run all tests once
npm test

# Run tests in watch mode (reruns on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Available Test Scripts

- `npm test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage reporting

## Test Structure

Tests are organized in the `tests/` directory:

```
tests/
├── utils/
│   ├── shortcut-utils.test.js     # Tests for shortcut formatting
│   └── shortcut-parser.test.js    # Tests for shortcut parsing
└── (future test directories)
```

## What's Being Tested

Currently, the test suite covers:

### Shortcut Utilities (`app/scripts/test-utils.js`)
- `formatShortcut()` - Formats keyboard shortcuts for display
- `isValidShortcut()` - Validates shortcut strings

### Shortcut Parser (`app/scripts/shortcut-parser.js`)
- `parseKeyCombo()` - Parses key combinations into components
- `isSystemShortcut()` - Identifies conflicts with browser shortcuts

## CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/ci.yml` workflow:
- Runs on pushes to `master` and all pull requests
- Tests on Node.js versions 18.x and 20.x
- Includes build verification
- Basic syntax checking

### Branch Protection

Tests must pass before PRs can be merged to the master branch.

## Adding New Tests

1. Create test files in the `tests/` directory
2. Follow the naming convention: `*.test.js`
3. Use Jest testing patterns:

```javascript
import { myFunction } from '../../app/scripts/my-module.js';

describe('My Module', () => {
  it('should do something', () => {
    expect(myFunction('input')).toBe('expected output');
  });
});
```

## Configuration

### Jest Configuration (`jest.config.js`)
- Test environment: Node.js
- Coverage reporting enabled
- Module name mapping for clean imports

### Babel Configuration (`.babelrc`)
- ES6+ support for modern JavaScript features
- Compatible with Node.js testing environment

## Future Enhancements

Potential areas for expanding the test suite:
- Vue component testing (requires additional setup)
- Browser extension API mocking
- Integration tests for extension features
- E2E testing with browser automation

## Troubleshooting

### Common Issues

1. **Tests not running**: Check that dependencies are installed (`npm install`)
2. **Import errors**: Verify file paths in test imports
3. **Coverage issues**: Some files may be excluded from coverage (see `jest.config.js`)

### Getting Help

- Check Jest documentation: https://jestjs.io/docs/getting-started
- Review existing test examples in the `tests/` directory
- Check GitHub Actions logs for CI failures