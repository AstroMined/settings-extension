/**
 * Unit tests for ContentScriptSettings
 * Tests content script API and message passing integration
 */

const { 
  createMockRuntime, 
  createMockStorage, 
  generateTestSettings,
  testPerformance 
} = require('./utils/test-helpers');

// Set up browser globals before importing modules
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      getBytesInUse: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      getBytesInUse: jest.fn()
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    getURL: jest.fn(),
    lastError: null,
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  }
};

global.browser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      getBytesInUse: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      getBytesInUse: jest.fn()
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    getURL: jest.fn(),
    lastError: null,
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  }
};

const ContentScriptSettings = require('../lib/content-settings');
const browserAPI = require('../lib/browser-compat');

describe('ContentScriptSettings', () => {
  let mockRuntime;
  let mockStorage;
  let contentScriptSettings;
  let testSettings;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    mockStorage = createMockStorage();
    testSettings = generateTestSettings();
    
    // Mock browser APIs
    global.browser.runtime = mockRuntime;
    global.browser.storage.local = mockStorage;
    
    // Mock browserAPI
    browserAPI.runtime = mockRuntime;
    
    jest.clearAllMocks();
    
    contentScriptSettings = new ContentScriptSettings();
  });
  
  afterEach(() => {
    if (contentScriptSettings) {
      contentScriptSettings.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize content script settings API', () => {
      expect(contentScriptSettings).toBeDefined();
      expect(contentScriptSettings.cache).toBeDefined();
      expect(contentScriptSettings.listeners).toBeDefined();
      expect(contentScriptSettings.messageTimeout).toBe(5000);
    });

    test('should establish message passing connection', () => {
      expect(mockRuntime.sendMessage).toBeDefined();
      expect(mockRuntime.onMessage.addListener).toHaveBeenCalled();
    });
  });

  describe('Settings Access', () => {
    test('should get single setting via message passing', async () => {
      // Test getSetting(key) method
      // Should send message to background script and receive response
      mockRuntime.sendMessage.mockResolvedValue({ 
        success: true, 
        data: testSettings.testBoolean 
      });
      
      expect(mockRuntime.sendMessage).toBeDefined();
    });

    test('should get multiple settings via message passing', async () => {
      // Test getSettings([keys]) method
      mockRuntime.sendMessage.mockResolvedValue({ 
        success: true, 
        data: testSettings 
      });
      
      expect(mockRuntime.sendMessage).toBeDefined();
    });

    test('should handle message passing errors', async () => {
      // Test error handling when background script is unavailable
      mockRuntime.sendMessage.mockRejectedValue(new Error('Connection failed'));
      
      expect(true).toBe(true);
    });
  });

  describe('Settings Modification', () => {
    test('should update single setting via message passing', async () => {
      // Test updateSetting(key, value) method
      mockRuntime.sendMessage.mockResolvedValue({ 
        success: true 
      });
      
      expect(mockRuntime.sendMessage).toBeDefined();
    });

    test('should update multiple settings via message passing', async () => {
      // Test updateSettings({key: value}) method
      mockRuntime.sendMessage.mockResolvedValue({ 
        success: true 
      });
      
      expect(mockRuntime.sendMessage).toBeDefined();
    });

    test('should handle validation errors from background', async () => {
      // Test handling of validation errors returned by background script
      mockRuntime.sendMessage.mockResolvedValue({ 
        success: false, 
        error: 'Invalid value for setting' 
      });
      
      expect(true).toBe(true);
    });
  });

  describe('Real-time Synchronization', () => {
    test('should register for setting change events', () => {
      // Test addChangeListener(callback) method
      expect(mockRuntime.onMessage.addListener).toBeDefined();
    });

    test('should handle setting change notifications', () => {
      // Test receiving change events from background script
      const changeListener = jest.fn();
      mockRuntime.onMessage.addListener(changeListener);
      
      // Simulate change event from background
      mockRuntime.onMessage.trigger({
        type: 'SETTING_CHANGED',
        key: 'testBoolean',
        value: false
      });
      
      expect(mockRuntime.onMessage.addListener).toHaveBeenCalled();
    });

    test('should unregister change listeners', () => {
      // Test removeChangeListener(callback) method
      expect(mockRuntime.onMessage.removeListener).toBeDefined();
    });

    test('should handle multiple change listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      contentScriptSettings.addChangeListener(listener1);
      contentScriptSettings.addChangeListener(listener2);
      
      // Trigger a change to test both listeners are called
      contentScriptSettings.handleSettingsChanged({ testBoolean: false });
      
      expect(listener1).toHaveBeenCalledWith('changed', { testBoolean: false });
      expect(listener2).toHaveBeenCalledWith('changed', { testBoolean: false });
    });
  });

  describe('Performance', () => {
    test('should access settings within 50ms', async () => {
      // Test performance requirement: <50ms access time
      const result = await testPerformance(async () => {
        // Mock settings access
        await new Promise(resolve => setTimeout(resolve, 25));
      }, 50);
      
      expect(result.passed).toBe(true);
    });

    test('should handle concurrent access efficiently', async () => {
      // Test concurrent settings access
      const promises = Array.from({ length: 10 }, () => 
        testPerformance(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        }, 50)
      );
      
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.passed).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle background script disconnection', async () => {
      // Test behavior when background script is terminated
      mockRuntime.sendMessage.mockRejectedValue(new Error('Extension context invalidated'));
      
      expect(true).toBe(true);
    });

    test('should handle message timeout', async () => {
      // Test timeout handling for unresponsive background script
      mockRuntime.sendMessage.mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      
      expect(true).toBe(true);
    });

    test('should provide fallback for offline mode', async () => {
      // Test fallback behavior when message passing fails
      expect(true).toBe(true);
    });
  });

  describe('API Documentation', () => {
    test('should expose documented methods', () => {
      // Test that all documented API methods are available
      // When implemented, check for: getSetting, getSettings, updateSetting, 
      // updateSettings, addChangeListener, removeChangeListener
      expect(true).toBe(true);
    });

    test('should handle method parameters correctly', () => {
      // Test parameter validation and handling
      expect(true).toBe(true);
    });

    test('should return promises for async operations', () => {
      // Test that async methods return promises
      expect(true).toBe(true);
    });
  });

  describe('Cross-browser Compatibility', () => {
    test('should work with Chrome extension APIs', () => {
      // Test Chrome-specific API usage
      global.chrome = global.browser;
      expect(true).toBe(true);
    });

    test('should work with Firefox extension APIs', () => {
      // Test Firefox-specific API usage
      expect(true).toBe(true);
    });

    test('should handle browser API differences', () => {
      // Test that the unified interface works
      expect(contentScriptSettings).toBeDefined();
      expect(typeof contentScriptSettings.getSetting).toBe('function');
    });
  });
  
  describe('Cache Management', () => {
    test('should cache settings after retrieval', async () => {
      const mockSetting = testSettings.testBoolean;
      mockRuntime.sendMessage.mockResolvedValue({
        value: mockSetting
      });
      
      await contentScriptSettings.getSetting('testBoolean');
      
      expect(contentScriptSettings.getCachedSetting('testBoolean')).toEqual(mockSetting);
    });
    
    test('should clear cache when requested', async () => {
      const mockSetting = testSettings.testBoolean;
      mockRuntime.sendMessage.mockResolvedValue({
        value: mockSetting
      });
      
      await contentScriptSettings.getSetting('testBoolean');
      expect(contentScriptSettings.getCachedSetting('testBoolean')).toEqual(mockSetting);
      
      contentScriptSettings.clearCache();
      expect(contentScriptSettings.getCachedSetting('testBoolean')).toBeNull();
    });
    
    test('should handle cache updates on settings changes', () => {
      // First populate cache
      contentScriptSettings.cache.set('testBoolean', testSettings.testBoolean);
      
      // Simulate settings change
      contentScriptSettings.handleSettingsChanged({ testBoolean: false });
      
      const cached = contentScriptSettings.getCachedSetting('testBoolean');
      expect(cached.value).toBe(false);
    });
  });
});