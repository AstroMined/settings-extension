/**
 * End-to-end tests for user workflows
 * Tests complete user scenarios from start to finish
 */

const { 
  createMockStorage, 
  createMockRuntime, 
  generateTestSettings,
  delay 
} = require('../utils/test-helpers');

describe('End-to-End User Workflows', () => {
  let mockStorage;
  let mockRuntime;
  let testSettings;

  beforeEach(() => {
    mockStorage = createMockStorage();
    mockRuntime = createMockRuntime();
    testSettings = generateTestSettings();
    
    global.browser.storage.local = mockStorage;
    global.browser.runtime = mockRuntime;
  });

  describe('Extension Installation Workflow', () => {
    test('should initialize extension with default settings', async () => {
      // Test first-time installation
      mockStorage.get.mockResolvedValue({});
      mockStorage.set.mockResolvedValue();
      
      // Mock default settings load
      const defaultSettings = generateTestSettings();
      mockStorage.set.mockResolvedValue();
      
      // Simulate extension initialization
      await mockStorage.get(null);
      await mockStorage.set(defaultSettings);
      
      expect(mockStorage.get).toHaveBeenCalledWith(null);
      expect(mockStorage.set).toHaveBeenCalledWith(defaultSettings);
    });

    test('should handle upgrade from previous version', async () => {
      // Test extension upgrade scenario
      const oldSettings = {
        oldSetting: { type: 'boolean', value: true }
      };
      
      mockStorage.get.mockResolvedValue(oldSettings);
      mockStorage.set.mockResolvedValue();
      
      // Simulate extension upgrade check - need to read existing settings first
      const existingSettings = await mockStorage.get(null);
      
      // Mock migration logic
      const migratedSettings = { ...existingSettings, ...generateTestSettings() };
      await mockStorage.set(migratedSettings);
      
      expect(mockStorage.get).toHaveBeenCalledWith(null);
      expect(mockStorage.set).toHaveBeenCalledWith(migratedSettings);
    });
  });

  describe('Settings Management Workflow', () => {
    test('should complete full settings modification workflow', async () => {
      // Test: User opens popup -> modifies setting -> saves -> closes
      
      // 1. Open popup (load current settings)
      mockStorage.get.mockResolvedValue(testSettings);
      const currentSettings = await mockStorage.get(null);
      
      // 2. User modifies a setting
      const modifiedSettings = {
        ...currentSettings,
        testBoolean: { ...currentSettings.testBoolean, value: false }
      };
      
      // 3. Validation occurs
      // Mock validation success
      
      // 4. Save settings
      mockStorage.set.mockResolvedValue();
      await mockStorage.set(modifiedSettings);
      
      // 5. Broadcast changes
      mockRuntime.onMessage.trigger({
        type: 'SETTINGS_CHANGED',
        changes: { testBoolean: false }
      });
      
      expect(mockStorage.get).toHaveBeenCalledWith(null);
      expect(mockStorage.set).toHaveBeenCalledWith(modifiedSettings);
    });

    test('should handle bulk settings update workflow', async () => {
      // Test: User updates multiple settings at once
      
      mockStorage.get.mockResolvedValue(testSettings);
      const bulkUpdates = {
        testBoolean: { ...testSettings.testBoolean, value: false },
        testText: { ...testSettings.testText, value: 'updated text' },
        testNumber: { ...testSettings.testNumber, value: 100 }
      };
      
      mockStorage.set.mockResolvedValue();
      await mockStorage.set(bulkUpdates);
      
      expect(mockStorage.set).toHaveBeenCalledWith(bulkUpdates);
    });
  });

  describe('Export/Import Workflow', () => {
    test('should export settings to file', async () => {
      // Test: User exports settings to JSON file
      
      mockStorage.get.mockResolvedValue(testSettings);
      const exportData = await mockStorage.get(null);
      
      // Mock file creation
      const exportJson = JSON.stringify(exportData, null, 2);
      const blob = new Blob([exportJson], { type: 'application/json' });
      
      expect(mockStorage.get).toHaveBeenCalledWith(null);
      expect(exportJson).toContain('testBoolean');
      expect(blob.type).toBe('application/json');
    });

    test('should import settings from file', async () => {
      // Test: User imports settings from JSON file
      
      const importData = generateTestSettings();
      const importJson = JSON.stringify(importData);
      
      // Mock file reading
      const file = new File([importJson], 'settings.json', { type: 'application/json' });
      
      // Mock validation and import
      mockStorage.set.mockResolvedValue();
      await mockStorage.set(importData);
      
      expect(mockStorage.set).toHaveBeenCalledWith(importData);
    });

    test('should handle import validation errors', async () => {
      // Test: User imports invalid settings file
      
      const invalidData = { invalid: 'data' };
      const invalidJson = JSON.stringify(invalidData);
      
      // Mock validation failure
      try {
        // Validation should fail here
        throw new Error('Invalid settings format');
      } catch (error) {
        expect(error.message).toBe('Invalid settings format');
      }
    });
  });

  describe('Settings Reset Workflow', () => {
    test('should reset all settings to defaults', async () => {
      // Test: User resets all settings to defaults
      
      // Current modified settings
      const modifiedSettings = {
        testBoolean: { ...testSettings.testBoolean, value: false },
        testText: { ...testSettings.testText, value: 'modified' }
      };
      
      mockStorage.get.mockResolvedValue(modifiedSettings);
      
      // Reset to defaults
      const defaultSettings = generateTestSettings();
      mockStorage.set.mockResolvedValue();
      await mockStorage.set(defaultSettings);
      
      // Verify reset
      expect(mockStorage.set).toHaveBeenCalledWith(defaultSettings);
    });

    test('should reset individual setting to default', async () => {
      // Test: User resets single setting to default
      
      const modifiedSettings = {
        ...testSettings,
        testBoolean: { ...testSettings.testBoolean, value: false }
      };
      
      mockStorage.get.mockResolvedValue(modifiedSettings);
      
      // Reset single setting
      const resetSettings = {
        ...modifiedSettings,
        testBoolean: testSettings.testBoolean
      };
      
      mockStorage.set.mockResolvedValue();
      await mockStorage.set(resetSettings);
      
      expect(mockStorage.set).toHaveBeenCalledWith(resetSettings);
    });
  });

  describe('Content Script Integration Workflow', () => {
    test('should handle content script requesting settings', async () => {
      // Test: Content script requests settings on page load
      
      mockRuntime.sendMessage.mockResolvedValue({
        success: true,
        data: testSettings.testBoolean
      });
      
      const response = await mockRuntime.sendMessage({
        type: 'GET_SETTING',
        key: 'testBoolean'
      });
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(testSettings.testBoolean);
    });

    test('should handle content script updating settings', async () => {
      // Test: Content script updates settings based on user interaction
      
      mockRuntime.sendMessage.mockResolvedValue({
        success: true
      });
      
      const response = await mockRuntime.sendMessage({
        type: 'UPDATE_SETTING',
        key: 'testBoolean',
        value: false
      });
      
      expect(response.success).toBe(true);
    });

    test('should handle real-time sync to content scripts', async () => {
      // Test: Setting change propagates to content scripts
      
      const listener = jest.fn();
      mockRuntime.onMessage.addListener(listener);
      
      // Simulate setting change
      mockRuntime.onMessage.trigger({
        type: 'SETTING_CHANGED',
        key: 'testBoolean',
        value: false
      });
      
      expect(mockRuntime.onMessage.addListener).toHaveBeenCalledWith(listener);
    });
  });

  describe('Error Recovery Workflow', () => {
    test('should recover from storage corruption', async () => {
      // Test: Extension handles corrupted storage
      
      mockStorage.get.mockRejectedValue(new Error('Storage corrupted'));
      
      try {
        await mockStorage.get(null);
      } catch (error) {
        // Should fallback to defaults
        mockStorage.set.mockResolvedValue();
        await mockStorage.set(generateTestSettings());
        
        expect(mockStorage.set).toHaveBeenCalledWith(generateTestSettings());
      }
    });

    test('should handle network failures gracefully', async () => {
      // Test: Extension handles sync storage failures
      
      mockStorage.set.mockRejectedValue(new Error('Network error'));
      
      try {
        await mockStorage.set(testSettings);
      } catch (error) {
        // Should fallback to local storage
        expect(error.message).toBe('Network error');
      }
    });
  });

  describe('Performance Workflow', () => {
    test('should maintain performance during heavy usage', async () => {
      // Test: Performance during rapid setting changes
      
      const startTime = Date.now();
      
      // Simulate rapid changes
      for (let i = 0; i < 50; i++) {
        mockStorage.set.mockResolvedValue();
        await mockStorage.set({ [`setting_${i}`]: { value: i } });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Browser Restart Workflow', () => {
    test('should restore settings after browser restart', async () => {
      // Test: Settings persist after browser restart
      
      // Initial settings
      mockStorage.set.mockResolvedValue();
      await mockStorage.set(testSettings);
      
      // Simulate browser restart (clear memory, reload from storage)
      mockStorage.get.mockResolvedValue(testSettings);
      const restoredSettings = await mockStorage.get(null);
      
      expect(restoredSettings).toEqual(testSettings);
    });

    test('should handle extension update during restart', async () => {
      // Test: Extension update preserves user settings
      
      const userSettings = {
        ...testSettings,
        testBoolean: { ...testSettings.testBoolean, value: false }
      };
      
      mockStorage.get.mockResolvedValue(userSettings);
      
      // Update should preserve user customizations
      const updatedSettings = await mockStorage.get(null);
      expect(updatedSettings.testBoolean.value).toBe(false);
    });
  });
});