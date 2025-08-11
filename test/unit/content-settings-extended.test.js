/**
 * Extended tests for ContentScriptSettings to improve coverage
 * Focuses on edge cases and error handling
 */

const { createMockRuntime, generateTestSettings } = require('../utils/test-helpers');
const ContentScriptSettings = require('../../lib/content-settings');

describe('ContentScriptSettings Extended Coverage', () => {
  let contentSettings;
  let mockRuntime;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    global.browser = { runtime: mockRuntime };
    contentSettings = new ContentScriptSettings();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization Edge Cases', () => {
    test('should handle missing browser.runtime', () => {
      delete global.browser.runtime;
      
      expect(() => {
        new ContentScriptSettings();
      }).toThrow('Browser runtime not available');
    });

    test('should initialize with default values', () => {
      expect(contentSettings.timeout).toBe(5000);
      expect(contentSettings.cache).toBeDefined();
      expect(contentSettings.changeListeners).toEqual([]);
    });

    test('should initialize with custom timeout', () => {
      const customSettings = new ContentScriptSettings({ timeout: 10000 });
      expect(customSettings.timeout).toBe(10000);
    });
  });

  describe('Cache Management Edge Cases', () => {
    test('should handle cache corruption gracefully', async () => {
      // Corrupt the cache by setting it to null
      contentSettings.cache = null;
      
      mockRuntime.sendMessage.mockResolvedValue({
        success: true,
        value: { type: 'boolean', value: true }
      });
      
      const result = await contentSettings.getSetting('testSetting');
      expect(result).toEqual({ type: 'boolean', value: true });
    });

    test('should handle cache with invalid data', async () => {
      contentSettings.cache.set('testSetting', 'invalid-data');
      
      mockRuntime.sendMessage.mockResolvedValue({
        success: true,
        value: { type: 'boolean', value: true }
      });
      
      // Should ignore corrupted cache and fetch fresh data
      const result = await contentSettings.getSetting('testSetting');
      expect(result).toEqual({ type: 'boolean', value: true });
    });
  });

  describe('Message Response Edge Cases', () => {
    test('should handle response without success field', async () => {
      mockRuntime.sendMessage.mockResolvedValue({
        value: { type: 'boolean', value: true }
      });
      
      const result = await contentSettings.getSetting('testSetting');
      expect(result).toEqual({ type: 'boolean', value: true });
    });

    test('should handle response with null value', async () => {
      mockRuntime.sendMessage.mockResolvedValue({
        success: true,
        value: null
      });
      
      await expect(contentSettings.getSetting('testSetting'))
        .rejects.toThrow("Invalid response for setting 'testSetting'");
    });

    test('should handle response with undefined value', async () => {
      mockRuntime.sendMessage.mockResolvedValue({
        success: true
      });
      
      await expect(contentSettings.getSetting('testSetting'))
        .rejects.toThrow("Invalid response for setting 'testSetting'");
    });

    test('should handle empty response object', async () => {
      mockRuntime.sendMessage.mockResolvedValue({});
      
      await expect(contentSettings.getSetting('testSetting'))
        .rejects.toThrow("Invalid response for setting 'testSetting'");
    });
  });

  describe('Batch Operations Edge Cases', () => {
    test('should handle getSettings with empty array', async () => {
      await expect(contentSettings.getSettings([]))
        .rejects.toThrow('Keys must be a non-empty array');
    });

    test('should handle getSettings with non-array input', async () => {
      await expect(contentSettings.getSettings('not-an-array'))
        .rejects.toThrow('Keys must be a non-empty array');
    });

    test('should handle getSettings with null input', async () => {
      await expect(contentSettings.getSettings(null))
        .rejects.toThrow('Keys must be a non-empty array');
    });

    test('should handle updateSettings with empty object', async () => {
      await expect(contentSettings.updateSettings({}))
        .rejects.toThrow('Updates must be a non-empty object');
    });

    test('should handle updateSettings with null input', async () => {
      await expect(contentSettings.updateSettings(null))
        .rejects.toThrow('Updates must be a non-empty object');
    });

    test('should handle updateSettings with array input', async () => {
      await expect(contentSettings.updateSettings([]))
        .rejects.toThrow('Updates must be a non-empty object');
    });
  });

  describe('Timeout and Error Handling', () => {
    test('should timeout on slow response', async () => {
      // Create a settings instance with very short timeout
      const quickTimeout = new ContentScriptSettings({ timeout: 10 });
      
      // Mock a slow response
      mockRuntime.sendMessage.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({ success: true, value: true }), 100);
        });
      });
      
      await expect(quickTimeout.getSetting('testSetting'))
        .rejects.toThrow('Request timeout');
    }, 10000);

    test('should handle runtime disconnection during message', async () => {
      mockRuntime.sendMessage.mockRejectedValue(new Error('Extension context invalidated'));
      
      await expect(contentSettings.getSetting('testSetting'))
        .rejects.toThrow('Extension context invalidated');
    });

    test('should handle sendMessage throwing synchronously', async () => {
      mockRuntime.sendMessage.mockImplementation(() => {
        throw new Error('Synchronous error');
      });
      
      await expect(contentSettings.getSetting('testSetting'))
        .rejects.toThrow('Synchronous error');
    });
  });

  describe('Change Listener Edge Cases', () => {
    test('should handle listener that throws errors', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      contentSettings.addChangeListener(errorListener);
      contentSettings.notifyListeners('SETTING_CHANGED', { key: 'test', value: true });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in settings change listener:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    test('should handle async listener errors', async () => {
      const asyncErrorListener = jest.fn(async () => {
        throw new Error('Async listener error');
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      contentSettings.addChangeListener(asyncErrorListener);
      contentSettings.notifyListeners('SETTING_CHANGED', { key: 'test', value: true });
      
      // Wait for async error to propagate
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    test('should remove non-existent listener gracefully', () => {
      const nonExistentListener = jest.fn();
      
      expect(() => {
        contentSettings.removeChangeListener(nonExistentListener);
      }).not.toThrow();
    });

    test('should handle multiple identical listeners', () => {
      const listener = jest.fn();
      
      contentSettings.addChangeListener(listener);
      contentSettings.addChangeListener(listener);
      
      contentSettings.notifyListeners('SETTING_CHANGED', { key: 'test', value: true });
      
      // Should be called twice since it was added twice
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('Browser API Compatibility', () => {
    test('should handle Chrome API format', async () => {
      // Mock Chrome-style API
      global.chrome = {
        runtime: {
          sendMessage: mockRuntime.sendMessage
        }
      };
      delete global.browser;
      
      const chromeSettings = new ContentScriptSettings();
      
      mockRuntime.sendMessage.mockResolvedValue({
        success: true,
        value: { type: 'boolean', value: true }
      });
      
      const result = await chromeSettings.getSetting('testSetting');
      expect(result).toEqual({ type: 'boolean', value: true });
      
      // Cleanup
      delete global.chrome;
      global.browser = { runtime: mockRuntime };
    });

    test('should handle missing both browser and chrome APIs', () => {
      delete global.browser;
      delete global.chrome;
      
      expect(() => {
        new ContentScriptSettings();
      }).toThrow('Browser runtime not available');
      
      // Restore
      global.browser = { runtime: mockRuntime };
    });
  });

  describe('Performance and Memory Management', () => {
    test('should limit cache size to prevent memory leaks', async () => {
      mockRuntime.sendMessage.mockImplementation((message) => {
        return Promise.resolve({
          success: true,
          value: { type: 'text', value: `value-${message.key}` }
        });
      });
      
      // Fill cache with many entries
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(contentSettings.getSetting(`setting-${i}`));
      }
      
      await Promise.all(promises);
      
      // Cache should not grow indefinitely
      expect(contentSettings.cache.size).toBeLessThan(1000);
    });

    test('should handle concurrent requests efficiently', async () => {
      mockRuntime.sendMessage.mockResolvedValue({
        success: true,
        value: { type: 'boolean', value: true }
      });
      
      // Make many concurrent requests for the same setting
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(contentSettings.getSetting('sameSetting'));
      }
      
      const results = await Promise.all(promises);
      
      // All should return the same result
      results.forEach(result => {
        expect(result).toEqual({ type: 'boolean', value: true });
      });
      
      // Should have made only one actual message call due to caching
      expect(mockRuntime.sendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message Format Validation', () => {
    test('should validate message format for getSetting', async () => {
      const getSetting = jest.spyOn(contentSettings, 'getSetting');
      await contentSettings.getSetting('testSetting');
      
      expect(mockRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_SETTING',
        key: 'testSetting'
      });
    });

    test('should validate message format for updateSetting', async () => {
      mockRuntime.sendMessage.mockResolvedValue({ success: true });
      
      await contentSettings.updateSetting('testSetting', false);
      
      expect(mockRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'UPDATE_SETTING',
        key: 'testSetting',
        value: false
      });
    });

    test('should validate message format for getSettings', async () => {
      mockRuntime.sendMessage.mockResolvedValue({
        success: true,
        data: { setting1: { value: true }, setting2: { value: 'test' } }
      });
      
      await contentSettings.getSettings(['setting1', 'setting2']);
      
      expect(mockRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_SETTINGS',
        keys: ['setting1', 'setting2']
      });
    });

    test('should validate message format for updateSettings', async () => {
      mockRuntime.sendMessage.mockResolvedValue({ success: true });
      
      const updates = { setting1: false, setting2: 'updated' };
      await contentSettings.updateSettings(updates);
      
      expect(mockRuntime.sendMessage).toHaveBeenCalledWith({
        type: 'UPDATE_SETTINGS',
        updates: updates
      });
    });
  });
});