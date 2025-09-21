// Direct testing of Options page methods and functionality
const { mockStorage, mockBookmarks, mockBuefy } = require('./setup.js');

// Mock UUID generation
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

describe('Options Page Core Functionality', () => {
  let optionsComponent;

  beforeEach(() => {
    // Clear mocks before each test
    mockStorage.local.data = {};
    jest.clearAllMocks();

    // Create a mock of the options component with the essential methods
    optionsComponent = {
      keys: [{}],
      importJson: '',
      $buefy: mockBuefy,

      // Copy the actual methods from the Vue component
      saveShortcuts: async function() {
        const { v4: uuid } = require('uuid');
        this.keys.forEach((key) => {
          if (!key.id) {
            key.id = uuid();
          }

          key.sites = key.sites || "";
          key.sitesArray = key.sites.split('\n');
          delete key.sidebarOpen;
        });
        await chrome.storage.local.set({
          keys: JSON.stringify(this.keys),
          random: Math.random(), // make sure onChanged event will be triggered
        });
        this.$buefy.snackbar.open(`Shortcuts have been saved!`);
      },

      importKeys: function() {
        this.keys = this.keys.concat(JSON.parse(this.importJson));
        this.$buefy.snackbar.open(`Imported successfully!`);
      },

      deleteShortcut: function (key) {
        this.$buefy.dialog.confirm({
          message: 'Delete this shortcut?',
          onConfirm: () => this.keys = this.keys.filter(curKey => key.key !== curKey.key)
        });
      },

      needsUserScripts: function() {
        const hasJsKeys = this.keys.some(key => key.action === 'javascript');
        if (!hasJsKeys) {
          return false;
        }

        try {
          chrome.userScripts.register;
          return false;
        } catch {
          return true;
        }
      },

      isBuiltIn: function (action) {
        let builtIn = false;
        for (const category in this.actions) {
          this.actions[category].forEach(actionType => {
            if (actionType.value === action) {
              builtIn = actionType.builtin;
            }
          });
        }
        return builtIn;
      },

      // Mock actions data structure
      actions: {
        'Tabs': [
          {value: 'newtab', label: 'New tab', builtin: true},
          {value: 'closetab', label: 'Close tab', builtin: true},
          {value: 'gototab', label: 'Jump to tab by URL', builtin: false}
        ],
        'Miscellaneous': [
          {value: 'javascript', label: 'Run JavaScript', builtin: false}
        ]
      }
    };
  });

  describe('Adding New Shortcuts', () => {
    it('should add a new empty shortcut when keys.push({}) is called', () => {
      const initialLength = optionsComponent.keys.length;
      
      // Simulate clicking "Add shortcut"
      optionsComponent.keys.push({});
      
      // Verify a new shortcut was added
      expect(optionsComponent.keys.length).toBe(initialLength + 1);
      expect(optionsComponent.keys[optionsComponent.keys.length - 1]).toEqual({});
    });

    it('should allow multiple shortcuts to be added', () => {
      const initialLength = optionsComponent.keys.length;
      
      // Add 3 shortcuts
      optionsComponent.keys.push({});
      optionsComponent.keys.push({});
      optionsComponent.keys.push({});
      
      expect(optionsComponent.keys.length).toBe(initialLength + 3);
    });

    it('should allow shortcuts with different configurations', () => {
      optionsComponent.keys.push({ key: 'ctrl+a', action: 'newtab', label: 'New Tab' });
      optionsComponent.keys.push({ key: 'ctrl+b', action: 'closetab', label: 'Close Tab' });
      
      expect(optionsComponent.keys).toContainEqual(
        expect.objectContaining({ key: 'ctrl+a', action: 'newtab' })
      );
      expect(optionsComponent.keys).toContainEqual(
        expect.objectContaining({ key: 'ctrl+b', action: 'closetab' })
      );
    });
  });

  describe('Saving Shortcuts', () => {
    it('should save shortcuts to chrome storage', async () => {
      // Add some test shortcuts
      optionsComponent.keys = [
        { key: 'ctrl+a', action: 'newtab', label: 'New Tab' },
        { key: 'ctrl+b', action: 'closetab', label: 'Close Tab' }
      ];
      
      await optionsComponent.saveShortcuts();
      
      // Verify chrome.storage.local.set was called
      expect(mockStorage.local.set).toHaveBeenCalled();
      
      const setCall = mockStorage.local.set.mock.calls[0][0];
      expect(setCall).toHaveProperty('keys');
      expect(setCall).toHaveProperty('random');
      
      // Verify the saved data contains our shortcuts
      const savedKeys = JSON.parse(setCall.keys);
      expect(savedKeys).toHaveLength(2);
      expect(savedKeys[0]).toMatchObject({
        key: 'ctrl+a',
        action: 'newtab',
        label: 'New Tab'
      });
    });

    it('should generate UUIDs for shortcuts without IDs when saving', async () => {
      optionsComponent.keys = [
        { key: 'ctrl+a', action: 'newtab' }, // No ID
        { key: 'ctrl+b', action: 'closetab', id: 'existing-id' } // Has ID
      ];
      
      await optionsComponent.saveShortcuts();
      
      // Check that IDs were assigned
      expect(optionsComponent.keys[0]).toHaveProperty('id');
      expect(optionsComponent.keys[0].id).toBe('mock-uuid-123');
      expect(optionsComponent.keys[1].id).toBe('existing-id');
    });

    it('should show success notification after saving', async () => {
      optionsComponent.keys = [{ key: 'ctrl+a', action: 'newtab' }];
      
      await optionsComponent.saveShortcuts();
      
      expect(mockBuefy.snackbar.open).toHaveBeenCalledWith('Shortcuts have been saved!');
    });

    it('should process sites string into sitesArray when saving', async () => {
      optionsComponent.keys = [
        { 
          key: 'ctrl+a', 
          action: 'newtab',
          sites: 'example.com\ntest.com\ngoogle.com'
        }
      ];
      
      await optionsComponent.saveShortcuts();
      
      // Verify sitesArray was created
      expect(optionsComponent.keys[0].sitesArray).toEqual(['example.com', 'test.com', 'google.com']);
    });

    it('should handle empty sites string correctly', async () => {
      optionsComponent.keys = [
        { 
          key: 'ctrl+a', 
          action: 'newtab',
          sites: ''
        }
      ];
      
      await optionsComponent.saveShortcuts();
      
      expect(optionsComponent.keys[0].sites).toBe('');
      expect(optionsComponent.keys[0].sitesArray).toEqual(['']);
    });

    it('should remove sidebarOpen property when saving', async () => {
      optionsComponent.keys = [
        { 
          key: 'ctrl+a', 
          action: 'newtab',
          sidebarOpen: true
        }
      ];
      
      await optionsComponent.saveShortcuts();
      
      expect(optionsComponent.keys[0]).not.toHaveProperty('sidebarOpen');
    });
  });

  describe('Editing Shortcuts', () => {
    beforeEach(() => {
      // Set up some initial shortcuts for editing tests
      optionsComponent.keys = [
        { 
          id: 'test-1',
          key: 'ctrl+a', 
          action: 'newtab', 
          label: 'New Tab',
          sites: ''
        },
        { 
          id: 'test-2',
          key: 'ctrl+b', 
          action: 'closetab', 
          label: 'Close Tab',
          sites: ''
        }
      ];
    });

    it('should allow editing shortcut properties directly', () => {
      // Edit a shortcut directly
      optionsComponent.keys[0].key = 'ctrl+shift+a';
      optionsComponent.keys[0].label = 'Modified Label';
      optionsComponent.keys[0].action = 'reload';
      
      expect(optionsComponent.keys[0]).toMatchObject({
        key: 'ctrl+shift+a',
        label: 'Modified Label',
        action: 'reload'
      });
    });

    it('should preserve edits after saving', async () => {
      // Edit a shortcut
      optionsComponent.keys[0].key = 'ctrl+shift+z';
      optionsComponent.keys[0].label = 'Modified Shortcut';
      optionsComponent.keys[0].action = 'reload';
      
      // Save shortcuts
      await optionsComponent.saveShortcuts();
      
      // Verify the edited data was saved
      const setCall = mockStorage.local.set.mock.calls[0][0];
      const savedKeys = JSON.parse(setCall.keys);
      
      expect(savedKeys[0]).toMatchObject({
        key: 'ctrl+shift+z',
        label: 'Modified Shortcut',
        action: 'reload'
      });
    });

    it('should handle updating sites for blacklist/whitelist functionality', async () => {
      optionsComponent.keys[0].sites = 'github.com\nstackoverflow.com';
      optionsComponent.keys[0].blacklist = true;
      
      await optionsComponent.saveShortcuts();
      
      expect(optionsComponent.keys[0].sitesArray).toEqual(['github.com', 'stackoverflow.com']);
    });

    it('should allow updating action-specific settings', () => {
      // Test JavaScript action specific settings
      optionsComponent.keys[0].action = 'javascript';
      optionsComponent.keys[0].code = 'console.log("Hello World");';
      
      expect(optionsComponent.keys[0].code).toBe('console.log("Hello World");');
      
      // Test tab navigation settings
      optionsComponent.keys[1].action = 'gototab';
      optionsComponent.keys[1].matchurl = '*://example.com/*';
      optionsComponent.keys[1].openurl = 'https://example.com';
      
      expect(optionsComponent.keys[1].matchurl).toBe('*://example.com/*');
      expect(optionsComponent.keys[1].openurl).toBe('https://example.com');
    });
  });

  describe('Deleting Shortcuts', () => {
    beforeEach(() => {
      optionsComponent.keys = [
        { id: 'test-1', key: 'ctrl+a', action: 'newtab', label: 'New Tab' },
        { id: 'test-2', key: 'ctrl+b', action: 'closetab', label: 'Close Tab' },
        { id: 'test-3', key: 'ctrl+c', action: 'reload', label: 'Reload' }
      ];
    });

    it('should remove shortcut when deleteShortcut is called', () => {
      const initialLength = optionsComponent.keys.length;
      const shortcutToDelete = optionsComponent.keys[1];
      
      // Call deleteShortcut method (this will auto-confirm due to mock setup)
      optionsComponent.deleteShortcut(shortcutToDelete);
      
      // Verify the dialog was shown
      expect(mockBuefy.dialog.confirm).toHaveBeenCalledWith({
        message: 'Delete this shortcut?',
        onConfirm: expect.any(Function)
      });
      
      // Verify the shortcut was removed
      expect(optionsComponent.keys.length).toBe(initialLength - 1);
      expect(optionsComponent.keys.find(k => k.key === shortcutToDelete.key)).toBeUndefined();
    });

    it('should not affect other shortcuts when deleting one', () => {
      const shortcutToKeep1 = optionsComponent.keys[0];
      const shortcutToKeep2 = optionsComponent.keys[2];
      const shortcutToDelete = optionsComponent.keys[1];
      
      optionsComponent.deleteShortcut(shortcutToDelete);
      
      // Verify the other shortcuts are still there
      expect(optionsComponent.keys).toContainEqual(shortcutToKeep1);
      expect(optionsComponent.keys).toContainEqual(shortcutToKeep2);
      expect(optionsComponent.keys.length).toBe(2);
    });

    it('should delete shortcuts by key property as implemented', () => {
      const keysBeforeDeletion = [...optionsComponent.keys];
      const targetKey = 'ctrl+b';
      
      // Find the shortcut with the target key
      const shortcutToDelete = optionsComponent.keys.find(k => k.key === targetKey);
      expect(shortcutToDelete).toBeDefined();
      
      optionsComponent.deleteShortcut(shortcutToDelete);
      
      // Verify it was removed
      expect(optionsComponent.keys.find(k => k.key === targetKey)).toBeUndefined();
      expect(optionsComponent.keys.length).toBe(keysBeforeDeletion.length - 1);
    });

    it('should handle deleting shortcuts with same keys correctly', () => {
      // Add shortcuts with duplicate keys to test the filtering logic
      optionsComponent.keys = [
        { id: 'test-1', key: 'ctrl+a', action: 'newtab' },
        { id: 'test-2', key: 'ctrl+a', action: 'closetab' }, // Same key
        { id: 'test-3', key: 'ctrl+b', action: 'reload' }
      ];
      
      const shortcutToDelete = optionsComponent.keys[0];
      optionsComponent.deleteShortcut(shortcutToDelete);
      
      // Should remove all shortcuts with the same key
      expect(optionsComponent.keys.filter(k => k.key === 'ctrl+a').length).toBe(0);
      expect(optionsComponent.keys.length).toBe(1);
    });
  });

  describe('Import Functionality', () => {
    it('should import shortcuts from JSON and show success message', () => {
      const importData = [
        { key: 'ctrl+i', action: 'newtab', label: 'Imported Tab' },
        { key: 'ctrl+j', action: 'closetab', label: 'Imported Close' }
      ];
      
      // Set import JSON
      optionsComponent.importJson = JSON.stringify(importData);
      
      const initialLength = optionsComponent.keys.length;
      
      // Trigger import
      optionsComponent.importKeys();
      
      // Verify shortcuts were imported
      expect(optionsComponent.keys.length).toBe(initialLength + 2);
      expect(optionsComponent.keys.slice(-2)).toEqual(importData);
      
      // Verify success message
      expect(mockBuefy.snackbar.open).toHaveBeenCalledWith('Imported successfully!');
    });

    it('should append imported shortcuts to existing ones', () => {
      const existingShortcuts = [...optionsComponent.keys];
      const importData = [{ key: 'ctrl+x', action: 'newtab', label: 'Imported' }];
      
      optionsComponent.importJson = JSON.stringify(importData);
      optionsComponent.importKeys();
      
      // Should have existing + imported shortcuts
      expect(optionsComponent.keys.length).toBe(existingShortcuts.length + 1);
      expect(optionsComponent.keys.slice(0, existingShortcuts.length)).toEqual(existingShortcuts);
    });

    it('should handle importing complex shortcut configurations', () => {
      const complexShortcut = {
        key: 'ctrl+shift+j',
        action: 'javascript',
        label: 'Complex JavaScript',
        code: 'document.title = "Test";',
        sites: 'example.com\ntest.com',
        blacklist: true,
        activeInInputs: false
      };
      
      optionsComponent.importJson = JSON.stringify([complexShortcut]);
      optionsComponent.importKeys();
      
      const importedShortcut = optionsComponent.keys[optionsComponent.keys.length - 1];
      expect(importedShortcut).toEqual(complexShortcut);
    });

    it('should handle malformed JSON gracefully', () => {
      optionsComponent.importJson = 'invalid json';
      
      // This should throw an error when parsing
      expect(() => optionsComponent.importKeys()).toThrow();
    });

    it('should handle empty import JSON', () => {
      optionsComponent.importJson = JSON.stringify([]);
      const initialLength = optionsComponent.keys.length;
      
      optionsComponent.importKeys();
      
      expect(optionsComponent.keys.length).toBe(initialLength);
      expect(mockBuefy.snackbar.open).toHaveBeenCalledWith('Imported successfully!');
    });
  });

  describe('Helper Methods', () => {
    it('should detect if user scripts are needed', () => {
      // Test with no JavaScript actions
      optionsComponent.keys = [
        { action: 'newtab' },
        { action: 'closetab' }
      ];
      expect(optionsComponent.needsUserScripts()).toBe(false);
      
      // Test with JavaScript action
      optionsComponent.keys = [
        { action: 'newtab' },
        { action: 'javascript' }
      ];
      // This will return true because chrome.userScripts.register throws in our mock
      expect(optionsComponent.needsUserScripts()).toBe(true);
    });

    it('should correctly identify built-in actions', () => {
      expect(optionsComponent.isBuiltIn('newtab')).toBe(true);
      expect(optionsComponent.isBuiltIn('closetab')).toBe(true);
      expect(optionsComponent.isBuiltIn('javascript')).toBe(false);
      expect(optionsComponent.isBuiltIn('gototab')).toBe(false);
    });

    it('should handle unknown actions in isBuiltIn', () => {
      expect(optionsComponent.isBuiltIn('nonexistent-action')).toBe(false);
    });

    it('should return false for needsUserScripts when chrome.userScripts.register exists', () => {
      // Temporarily replace the chrome.userScripts with one that doesn't throw
      const originalUserScripts = chrome.userScripts;
      chrome.userScripts = { register: jest.fn() };
      
      optionsComponent.keys = [{ action: 'javascript' }];
      expect(optionsComponent.needsUserScripts()).toBe(false);
      
      // Restore original behavior
      chrome.userScripts = originalUserScripts;
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow: add, edit, save, delete', async () => {
      // Add a new shortcut
      optionsComponent.keys.push({ key: 'ctrl+t', action: 'newtab', label: 'Test Shortcut' });
      
      const addedShortcut = optionsComponent.keys[optionsComponent.keys.length - 1];
      expect(addedShortcut.key).toBe('ctrl+t');
      
      // Edit the shortcut
      addedShortcut.key = 'ctrl+shift+t';
      addedShortcut.label = 'Modified Test Shortcut';
      
      // Save shortcuts
      await optionsComponent.saveShortcuts();
      expect(mockStorage.local.set).toHaveBeenCalled();
      expect(mockBuefy.snackbar.open).toHaveBeenCalledWith('Shortcuts have been saved!');
      
      // Delete the shortcut
      const lengthBeforeDelete = optionsComponent.keys.length;
      optionsComponent.deleteShortcut(addedShortcut);
      expect(optionsComponent.keys.length).toBe(lengthBeforeDelete - 1);
      expect(mockBuefy.dialog.confirm).toHaveBeenCalled();
    });

    it('should preserve shortcut configurations through save/load cycle', async () => {
      const testShortcut = {
        key: 'ctrl+test',
        action: 'javascript',
        label: 'Test JavaScript',
        code: 'console.log("test");',
        sites: 'example.com\ntest.com',
        blacklist: true,
        activeInInputs: false
      };
      
      optionsComponent.keys = [testShortcut];
      
      // Save the shortcut
      await optionsComponent.saveShortcuts();
      
      // Verify the shortcut was saved with all properties
      const setCall = mockStorage.local.set.mock.calls[0][0];
      const savedKeys = JSON.parse(setCall.keys);
      
      expect(savedKeys[0]).toMatchObject({
        key: 'ctrl+test',
        action: 'javascript',
        label: 'Test JavaScript',
        code: 'console.log("test");',
        blacklist: true,
        activeInInputs: false
      });
      expect(savedKeys[0].sitesArray).toEqual(['example.com', 'test.com']);
    });

    it('should handle importing and then saving shortcuts', async () => {
      const importData = [
        { key: 'ctrl+import', action: 'newtab', label: 'Imported Shortcut' }
      ];
      
      optionsComponent.importJson = JSON.stringify(importData);
      optionsComponent.importKeys();
      
      // Now save the imported shortcuts
      await optionsComponent.saveShortcuts();
      
      const setCall = mockStorage.local.set.mock.calls[0][0];
      const savedKeys = JSON.parse(setCall.keys);
      
      expect(savedKeys).toContainEqual(
        expect.objectContaining({
          key: 'ctrl+import',
          action: 'newtab',
          label: 'Imported Shortcut'
        })
      );
    });

    it('should handle multiple operations in sequence', async () => {
      // Start with initial shortcuts
      optionsComponent.keys = [
        { key: 'ctrl+1', action: 'newtab', label: 'First' }
      ];
      
      // Add a shortcut
      optionsComponent.keys.push({ key: 'ctrl+2', action: 'closetab', label: 'Second' });
      
      // Import additional shortcuts
      optionsComponent.importJson = JSON.stringify([
        { key: 'ctrl+3', action: 'reload', label: 'Third' }
      ]);
      optionsComponent.importKeys();
      
      // Edit an existing shortcut
      optionsComponent.keys[0].label = 'Modified First';
      
      // Save everything
      await optionsComponent.saveShortcuts();
      
      // Verify all operations were successful
      expect(optionsComponent.keys.length).toBe(3);
      expect(optionsComponent.keys[0].label).toBe('Modified First');
      expect(mockStorage.local.set).toHaveBeenCalled();
      expect(mockBuefy.snackbar.open).toHaveBeenCalledWith('Shortcuts have been saved!');
      expect(mockBuefy.snackbar.open).toHaveBeenCalledWith('Imported successfully!');
      
      // Delete a shortcut
      const shortcutToDelete = optionsComponent.keys.find(k => k.key === 'ctrl+2');
      optionsComponent.deleteShortcut(shortcutToDelete);
      
      expect(optionsComponent.keys.length).toBe(2);
      expect(optionsComponent.keys.find(k => k.key === 'ctrl+2')).toBeUndefined();
    });
  });
});