// Jest setup file for mocking Chrome APIs and global objects

// Mock Chrome Storage API
const mockStorage = {
  local: {
    data: {},
    set: jest.fn((items) => {
      Object.assign(mockStorage.local.data, items);
      return Promise.resolve();
    }),
    get: jest.fn((keys) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockStorage.local.data[keys] });
      }
      if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          result[key] = mockStorage.local.data[key];
        });
        return Promise.resolve(result);
      }
      return Promise.resolve(mockStorage.local.data);
    }),
    clear: jest.fn(() => {
      mockStorage.local.data = {};
      return Promise.resolve();
    })
  }
};

// Mock Chrome Bookmarks API
const mockBookmarks = {
  getTree: jest.fn((callback) => {
    const mockBookmarkTree = [
      {
        id: '0',
        title: '',
        children: [
          {
            id: '1',
            title: 'Bookmarks Bar',
            children: [
              { id: '2', title: 'Example Bookmark', url: 'https://example.com' },
              { id: '3', title: 'Test Bookmark', url: 'https://test.com' }
            ]
          }
        ]
      }
    ];
    callback(mockBookmarkTree);
  })
};

// Mock Chrome userScripts API
const mockUserScripts = {
  get register() {
    throw new Error('chrome.userScripts.register is not available');
  }
};

// Set up global chrome object
global.chrome = {
  storage: mockStorage,
  bookmarks: mockBookmarks,
  userScripts: mockUserScripts
};

// Also set up browser object for compatibility
global.browser = global.chrome;

// Mock Vue $buefy for notifications and dialogs
const mockBuefy = {
  snackbar: {
    open: jest.fn()
  },
  dialog: {
    confirm: jest.fn((options) => {
      // Auto-confirm for testing
      if (options.onConfirm) {
        options.onConfirm();
      }
    })
  }
};

// Export utilities for test access using CommonJS
module.exports = { mockStorage, mockBookmarks, mockUserScripts, mockBuefy };