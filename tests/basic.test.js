// Simple test to verify the testing framework works
describe('Basic functionality', () => {
  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle string operations', () => {
    const testString = 'ctrl+b';
    expect(testString.includes('ctrl')).toBe(true);
    expect(testString.split('+')).toEqual(['ctrl', 'b']);
  });

  it('should handle array operations', () => {
    const keys = [];
    expect(keys.length).toBe(0);
    
    keys.push({ key: 'ctrl+b', action: 'newtab' });
    expect(keys.length).toBe(1);
    expect(keys[0].key).toBe('ctrl+b');
  });
});