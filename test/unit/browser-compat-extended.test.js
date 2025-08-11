/**
 * Extended tests for browser compatibility utilities
 * Covers edge cases and cross-browser scenarios
 */

const { createMockStorage, createMockRuntime } = require('../utils/test-helpers');

describe('Browser Compatibility Extended Coverage', () => {
  let originalBrowser;
  let originalChrome;

  beforeEach(() => {
    // Save original global objects
    originalBrowser = global.browser;
    originalChrome = global.chrome;
    
    // Clear globals for clean test environment
    delete global.browser;
    delete global.chrome;
  });

  afterEach(() => {
    // Restore original globals
    if (originalBrowser) {
      global.browser = originalBrowser;
    } else {
      delete global.browser;
    }
    
    if (originalChrome) {
      global.chrome = originalChrome;
    } else {
      delete global.chrome;
    }
    
    jest.clearAllMocks();
  });

  describe('Browser Detection', () => {
    test('should detect Chrome environment', () => {
      global.chrome = {
        runtime: { id: 'test-extension' },
        storage: { local: createMockStorage() }
      };
      
      // Re-require the module to trigger detection
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      expect(global.getBrowserInfo).toBeDefined();
      const info = global.getBrowserInfo();
      expect(info.name).toBe('chrome');
    });

    test('should detect Firefox environment', () => {
      global.browser = {
        runtime: { id: 'test-extension' },
        storage: { local: createMockStorage() }
      };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      const info = global.getBrowserInfo();
      expect(info.name).toBe('firefox');
    });

    test('should detect Edge environment', () => {
      global.chrome = {
        runtime: { id: 'test-extension' },
        storage: { local: createMockStorage() }
      };
      
      // Mock Edge-specific properties
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
        writable: true
      });
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      const info = global.getBrowserInfo();
      expect(info.name).toBe('edge');
    });

    test('should handle unknown browser environment', () => {
      // No browser APIs available
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      const info = global.getBrowserInfo();
      expect(info.name).toBe('unknown');
      expect(info.version).toBe('unknown');
    });
  });

  describe('API Normalization', () => {
    test('should normalize Chrome API to browser standard', () => {
      const mockStorage = createMockStorage();
      const mockRuntime = createMockRuntime();
      
      global.chrome = {
        storage: { local: mockStorage },
        runtime: mockRuntime,
        tabs: { query: jest.fn(), sendMessage: jest.fn() }
      };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      expect(global.browser).toBeDefined();
      expect(global.browser.storage.local).toBe(mockStorage);
      expect(global.browser.runtime).toBe(mockRuntime);
      expect(global.browser.tabs).toBe(global.chrome.tabs);
    });

    test('should handle partial API availability', () => {
      global.chrome = {
        runtime: createMockRuntime()
        // Missing storage and tabs
      };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      expect(global.browser.runtime).toBeDefined();
      expect(global.browser.storage).toBeUndefined();
      expect(global.browser.tabs).toBeUndefined();
    });

    test('should preserve existing browser API', () => {
      const mockBrowser = {
        storage: { local: createMockStorage() },
        runtime: createMockRuntime(),
        tabs: { query: jest.fn() }
      };
      
      global.browser = mockBrowser;
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      expect(global.browser).toBe(mockBrowser);
    });
  });

  describe('Feature Detection', () => {
    test('should detect manifest V3 support', () => {
      global.chrome = {
        runtime: {
          getManifest: () => ({ manifest_version: 3 })
        }
      };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      expect(global.isManifestV3).toBeDefined();
      expect(global.isManifestV3()).toBe(true);
    });

    test('should detect manifest V2 support', () => {
      global.chrome = {
        runtime: {
          getManifest: () => ({ manifest_version: 2 })
        }
      };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      expect(global.isManifestV3()).toBe(false);
    });

    test('should handle missing getManifest', () => {
      global.chrome = {
        runtime: {}
      };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      expect(global.isManifestV3()).toBe(false);
    });

    test('should detect sync storage support', () => {
      global.chrome = {
        storage: {
          local: createMockStorage(),
          sync: createMockStorage()
        }
      };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      expect(global.supportsSyncStorage).toBeDefined();
      expect(global.supportsSyncStorage()).toBe(true);
    });

    test('should handle missing sync storage', () => {
      global.chrome = {
        storage: {
          local: createMockStorage()
          // No sync storage
        }
      };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      expect(global.supportsSyncStorage()).toBe(false);
    });
  });

  describe('Cross-Browser Storage Wrapper', () => {
    test('should create storage wrapper for Chrome', () => {
      const mockStorage = createMockStorage();
      global.chrome = { storage: { local: mockStorage } };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      expect(global.createStorageWrapper).toBeDefined();
      const wrapper = global.createStorageWrapper();
      
      expect(wrapper.get).toBeDefined();
      expect(wrapper.set).toBeDefined();
      expect(wrapper.remove).toBeDefined();
    });

    test('should handle storage operations with callbacks', async () => {
      const mockStorage = {
        get: jest.fn((keys, callback) => {
          callback({ key1: 'value1' });
        }),
        set: jest.fn((items, callback) => {
          callback();
        }),
        remove: jest.fn((keys, callback) => {
          callback();
        })
      };
      
      global.chrome = { storage: { local: mockStorage } };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      const wrapper = global.createStorageWrapper();
      
      const result = await wrapper.get(['key1']);
      expect(result).toEqual({ key1: 'value1' });
      
      await wrapper.set({ key2: 'value2' });
      expect(mockStorage.set).toHaveBeenCalled();
      
      await wrapper.remove(['key1']);
      expect(mockStorage.remove).toHaveBeenCalled();
    });

    test('should handle storage errors', async () => {
      const mockStorage = {
        get: jest.fn((keys, callback) => {
          global.chrome.runtime.lastError = { message: 'Storage error' };
          callback({});
        })
      };
      
      global.chrome = { 
        storage: { local: mockStorage },
        runtime: { lastError: null }
      };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      const wrapper = global.createStorageWrapper();
      
      await expect(wrapper.get(['key1'])).rejects.toThrow('Storage error');
    });
  });

  describe('Message Passing Wrapper', () => {
    test('should create message wrapper for Chrome', () => {
      const mockRuntime = createMockRuntime();
      global.chrome = { runtime: mockRuntime };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      expect(global.createMessageWrapper).toBeDefined();
      const wrapper = global.createMessageWrapper();
      
      expect(wrapper.sendMessage).toBeDefined();
      expect(wrapper.onMessage).toBeDefined();
    });

    test('should handle message sending with callbacks', async () => {
      const mockRuntime = {
        sendMessage: jest.fn((message, callback) => {
          callback({ success: true, data: 'response' });
        })
      };
      
      global.chrome = { runtime: mockRuntime };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      const wrapper = global.createMessageWrapper();
      const result = await wrapper.sendMessage({ type: 'test' });
      
      expect(result).toEqual({ success: true, data: 'response' });
    });

    test('should handle message listener registration', () => {
      const mockRuntime = {
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      };
      
      global.chrome = { runtime: mockRuntime };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      const wrapper = global.createMessageWrapper();
      const listener = jest.fn();
      
      wrapper.onMessage.addListener(listener);
      expect(mockRuntime.onMessage.addListener).toHaveBeenCalledWith(listener);
      
      wrapper.onMessage.removeListener(listener);
      expect(mockRuntime.onMessage.removeListener).toHaveBeenCalledWith(listener);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle null global objects gracefully', () => {
      global.chrome = null;
      global.browser = null;
      
      expect(() => {
        delete require.cache[require.resolve('../../lib/browser-compat.js')];
        require('../../lib/browser-compat.js');
      }).not.toThrow();
    });

    test('should handle undefined API methods', () => {
      global.chrome = {
        storage: {}, // Missing local property
        runtime: {} // Missing methods
      };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      const info = global.getBrowserInfo();
      expect(info.name).toBe('chrome');
    });

    test('should handle browser object without storage', () => {
      global.browser = {
        runtime: createMockRuntime()
        // Missing storage
      };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      const info = global.getBrowserInfo();
      expect(info.name).toBe('firefox');
    });
  });

  describe('Performance Optimization', () => {
    test('should cache browser detection results', () => {
      global.chrome = {
        runtime: { id: 'test' }
      };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      const info1 = global.getBrowserInfo();
      const info2 = global.getBrowserInfo();
      
      // Should return the same object reference (cached)
      expect(info1).toBe(info2);
    });

    test('should lazy-load feature detection', () => {
      global.chrome = {
        runtime: {
          getManifest: jest.fn(() => ({ manifest_version: 3 }))
        }
      };
      
      delete require.cache[require.resolve('../../lib/browser-compat.js')];
      require('../../lib/browser-compat.js');
      
      // First call should invoke getManifest
      const result1 = global.isManifestV3();
      expect(global.chrome.runtime.getManifest).toHaveBeenCalledTimes(1);
      
      // Second call should use cached result
      const result2 = global.isManifestV3();
      expect(global.chrome.runtime.getManifest).toHaveBeenCalledTimes(1);
      
      expect(result1).toBe(result2);
    });
  });
});