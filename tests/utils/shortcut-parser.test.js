import { parseKeyCombo, isSystemShortcut } from '../../app/scripts/shortcut-parser.js';

describe('Shortcut Parser', () => {
  describe('parseKeyCombo', () => {
    it('should parse simple key combinations', () => {
      const result = parseKeyCombo('ctrl+b');
      expect(result.modifiers).toEqual(['ctrl']);
      expect(result.key).toBe('b');
    });

    it('should parse multiple modifiers', () => {
      const result = parseKeyCombo('ctrl+shift+alt+t');
      expect(result.modifiers).toEqual(['alt', 'ctrl', 'shift']); // sorted
      expect(result.key).toBe('t');
    });

    it('should handle single keys without modifiers', () => {
      const result = parseKeyCombo('escape');
      expect(result.modifiers).toEqual([]);
      expect(result.key).toBe('escape');
    });

    it('should handle empty or invalid input', () => {
      expect(parseKeyCombo('')).toEqual({ modifiers: [], key: null });
      expect(parseKeyCombo(null)).toEqual({ modifiers: [], key: null });
      expect(parseKeyCombo(undefined)).toEqual({ modifiers: [], key: null });
    });

    it('should handle whitespace in key combinations', () => {
      const result = parseKeyCombo(' ctrl + shift + a ');
      expect(result.modifiers).toEqual(['ctrl', 'shift']);
      expect(result.key).toBe('a');
    });

    it('should remove duplicate modifiers', () => {
      const result = parseKeyCombo('ctrl+ctrl+b');
      expect(result.modifiers).toEqual(['ctrl']);
      expect(result.key).toBe('b');
    });

    it('should handle case insensitive input', () => {
      const result = parseKeyCombo('CTRL+SHIFT+F1');
      expect(result.modifiers).toEqual(['ctrl', 'shift']);
      expect(result.key).toBe('f1');
    });
  });

  describe('isSystemShortcut', () => {
    it('should identify common system shortcuts', () => {
      expect(isSystemShortcut('ctrl+t')).toBe(true);
      expect(isSystemShortcut('ctrl+w')).toBe(true);
      expect(isSystemShortcut('alt+f4')).toBe(true);
      expect(isSystemShortcut('f5')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isSystemShortcut('CTRL+T')).toBe(true);
      expect(isSystemShortcut('Ctrl+W')).toBe(true);
    });

    it('should return false for non-system shortcuts', () => {
      expect(isSystemShortcut('ctrl+b')).toBe(false);
      expect(isSystemShortcut('alt+j')).toBe(false);
      expect(isSystemShortcut('shift+f7')).toBe(false);
    });

    it('should handle complex shortcuts', () => {
      expect(isSystemShortcut('ctrl+shift+n')).toBe(true);
      expect(isSystemShortcut('ctrl+shift+delete')).toBe(true);
      expect(isSystemShortcut('ctrl+shift+j')).toBe(false);
    });
  });
});