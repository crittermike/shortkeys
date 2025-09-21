import { formatShortcut, isValidShortcut } from '../../app/scripts/test-utils.js';

describe('Shortcut Utilities', () => {
  describe('formatShortcut', () => {
    it('should format a simple shortcut correctly', () => {
      expect(formatShortcut('ctrl+b')).toBe('Ctrl + B');
    });

    it('should format a multi-key shortcut correctly', () => {
      expect(formatShortcut('ctrl+shift+t')).toBe('Ctrl + Shift + T');
    });

    it('should handle single keys', () => {
      expect(formatShortcut('escape')).toBe('Escape');
    });

    it('should handle empty input', () => {
      expect(formatShortcut('')).toBe('');
      expect(formatShortcut(null)).toBe('');
      expect(formatShortcut(undefined)).toBe('');
    });

    it('should handle whitespace in shortcuts', () => {
      expect(formatShortcut(' ctrl + b ')).toBe('Ctrl + B');
    });

    it('should filter out empty keys', () => {
      expect(formatShortcut('ctrl++b')).toBe('Ctrl + B');
    });
  });

  describe('isValidShortcut', () => {
    it('should validate basic shortcuts', () => {
      expect(isValidShortcut('ctrl+b')).toBe(true);
      expect(isValidShortcut('alt+f4')).toBe(true);
      expect(isValidShortcut('shift+tab')).toBe(true);
    });

    it('should validate single keys', () => {
      expect(isValidShortcut('a')).toBe(true);
      expect(isValidShortcut('1')).toBe(true);
      expect(isValidShortcut('escape')).toBe(true);
    });

    it('should reject invalid input', () => {
      expect(isValidShortcut('')).toBe(false);
      expect(isValidShortcut('   ')).toBe(false);
      expect(isValidShortcut(null)).toBe(false);
      expect(isValidShortcut(undefined)).toBe(false);
    });

    it('should reject shortcuts with invalid characters', () => {
      expect(isValidShortcut('ctrl+@')).toBe(false);
      expect(isValidShortcut('alt+#')).toBe(false);
      expect(isValidShortcut('ctrl+$')).toBe(false);
    });

    it('should allow shortcuts with spaces and dashes', () => {
      expect(isValidShortcut('page-up')).toBe(true);
      expect(isValidShortcut('ctrl + b')).toBe(true);
    });
  });
});