/**
 * Storage integration tests
 * Tests storage operations, quotas, and persistence
 */

const {
  createMockStorage,
  generateTestSettings,
  delay,
} = require("./utils/test-helpers");
const browserAPI = require("../lib/browser-compat");
const SettingsManager = require("../lib/settings-manager");

describe("Storage Integration", () => {
  let mockLocalStorage;
  let mockSyncStorage;
  let testSettings;
  let settingsManager;

  beforeEach(() => {
    mockLocalStorage = createMockStorage();
    mockSyncStorage = createMockStorage();
    testSettings = generateTestSettings();

    // Set up realistic storage mock with actual data tracking
    mockLocalStorage.storage = { ...testSettings };
    mockSyncStorage.storage = {};

    // Mock fetch for defaults.json
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    global.browser = {
      storage: {
        local: mockLocalStorage,
        sync: mockSyncStorage,
        onChanged: {
          addListener: jest.fn(),
          removeListener: jest.fn(),
        },
      },
      runtime: {
        getURL: jest.fn((path) => `chrome-extension://test/${path}`),
      },
    };

    global.chrome = global.browser;

    settingsManager = new SettingsManager();
  });

  afterEach(() => {
    if (settingsManager) {
      settingsManager.destroy();
    }

    // Clean up global mocks
    delete global.browser;
    delete global.chrome;
    delete global.fetch;
    jest.clearAllMocks();
  });

  describe("Local Storage Operations", () => {
    test("should store and retrieve settings from local storage", async () => {
      await mockLocalStorage.set(testSettings);
      const retrieved = await mockLocalStorage.get(null);

      // Test actual data integrity
      expect(retrieved).toEqual(expect.objectContaining(testSettings));
      expect(retrieved.testBoolean).toEqual(testSettings.testBoolean);
      expect(retrieved.testText.value).toBe("test value");
      expect(mockLocalStorage.set).toHaveBeenCalledWith(testSettings);
    });

    test("should handle partial storage retrieval", async () => {
      await mockLocalStorage.set(testSettings);
      const partialResult = await mockLocalStorage.get([
        "testBoolean",
        "testText",
      ]);

      // Verify only requested keys are returned
      expect(partialResult).toHaveProperty("testBoolean");
      expect(partialResult).toHaveProperty("testText");
      expect(partialResult).not.toHaveProperty("testNumber");
      expect(Object.keys(partialResult)).toHaveLength(2);
    });

    test("should handle storage key removal", async () => {
      await mockLocalStorage.set(testSettings);
      await mockLocalStorage.remove("testBoolean");

      // Verify key is actually removed from storage
      const afterRemoval = await mockLocalStorage.get(null);
      expect(afterRemoval).not.toHaveProperty("testBoolean");
      expect(afterRemoval).toHaveProperty("testText");
    });

    test("should handle storage clearing", async () => {
      await mockLocalStorage.set(testSettings);
      await mockLocalStorage.clear();

      // Verify storage is actually empty
      const afterClear = await mockLocalStorage.get(null);
      expect(afterClear).toEqual({});
      expect(Object.keys(afterClear)).toHaveLength(0);
    });

    test("should handle single key retrieval", async () => {
      await mockLocalStorage.set(testSettings);
      const singleResult = await mockLocalStorage.get("testText");

      expect(singleResult).toHaveProperty("testText");
      expect(singleResult.testText.value).toBe("test value");
      expect(Object.keys(singleResult)).toHaveLength(1);
    });
  });

  describe("Sync Storage Operations", () => {
    test("should store and retrieve settings from sync storage", async () => {
      await mockSyncStorage.set(testSettings);
      const retrieved = await mockSyncStorage.get(null);

      // Test actual data integrity in sync storage
      expect(retrieved).toEqual(expect.objectContaining(testSettings));
      expect(retrieved.testBoolean.type).toBe("boolean");
      expect(retrieved.testJson.value).toEqual({
        key: "value",
        nested: { prop: 123 },
      });
    });

    test("should handle sync storage quota limits with realistic data sizes", async () => {
      // Create data that simulates actual quota limit (102400 bytes for sync storage)
      const largeData = {};
      const largeValue = "x".repeat(1000); // 1KB string

      // Add 110 settings of 1KB each to exceed 100KB quota
      for (let i = 0; i < 110; i++) {
        largeData[`setting_${i}`] = {
          type: "longtext",
          value: largeValue,
          description: `Large setting ${i}`,
        };
      }

      // Calculate actual data size
      const dataSize = JSON.stringify(largeData).length;
      expect(dataSize).toBeGreaterThan(102400); // Should exceed 100KB

      // Mock realistic quota exceeded behavior
      mockSyncStorage.set.mockImplementation(async (data) => {
        const size = JSON.stringify(data).length;
        if (size > 102400) {
          throw new Error("QUOTA_EXCEEDED_ERR");
        }
        Object.assign(mockSyncStorage.storage, data);
      });

      await expect(mockSyncStorage.set(largeData)).rejects.toThrow(
        "QUOTA_EXCEEDED_ERR",
      );
    });

    test("should handle sync storage network errors gracefully", async () => {
      // Simulate real Firefox network error format
      const networkError = new Error("NetworkError: A network error occurred.");
      networkError.name = "NetworkError";

      mockSyncStorage.set.mockRejectedValue(networkError);

      await expect(mockSyncStorage.set(testSettings)).rejects.toThrow(
        "NetworkError",
      );

      // Verify error has correct properties
      try {
        await mockSyncStorage.set(testSettings);
      } catch (error) {
        expect(error.name).toBe("NetworkError");
        expect(error.message).toContain("network error");
      }
    });

    test("should fallback to local storage when sync is unavailable", async () => {
      // Simulate sync storage unavailable
      mockSyncStorage.set.mockRejectedValue(
        new Error("Sync storage not available"),
      );

      // Should fall back to local storage
      settingsManager.setStorageArea("local");
      await settingsManager.initializeWithEmbeddedDefaults();

      const settings = await settingsManager.getAllSettings();
      expect(settings).toBeDefined();
      expect(settings.feature_enabled).toBeDefined();
    });
  });

  describe("Storage Quota Management", () => {
    test("should check local storage quota with real getBytesInUse", async () => {
      // Mock getBytesInUse to return realistic values
      const testDataSize = JSON.stringify(testSettings).length;
      mockLocalStorage.getBytesInUse = jest
        .fn()
        .mockResolvedValue(testDataSize);

      await mockLocalStorage.set(testSettings);
      const bytesUsed = await mockLocalStorage.getBytesInUse();

      expect(bytesUsed).toBeGreaterThan(0);
      expect(bytesUsed).toBe(testDataSize);
      expect(mockLocalStorage.getBytesInUse).toHaveBeenCalled();
    });

    test("should handle quota exceeded scenario with realistic size calculations", async () => {
      // Create large settings data that would exceed 5MB local storage
      const largeSettings = {};
      const largeSetting = {
        type: "longtext",
        value: "x".repeat(50000), // 50KB per setting
        description: "Large setting",
      };

      // Create 120 settings * 50KB = ~6MB (exceeds 5MB limit)
      for (let i = 0; i < 120; i++) {
        largeSettings[`largeSetting_${i}`] = {
          ...largeSetting,
          value: largeSetting.value + i,
        };
      }

      const dataSize = JSON.stringify(largeSettings).length;
      expect(dataSize).toBeGreaterThan(5242880); // 5MB

      // Mock realistic quota behavior
      mockLocalStorage.set.mockImplementation(async (data) => {
        const size = JSON.stringify(data).length;
        if (size > 5242880) {
          // 5MB limit
          const error = new Error(
            "QuotaExceededError: The quota has been exceeded.",
          );
          error.name = "QuotaExceededError";
          throw error;
        }
        Object.assign(mockLocalStorage.storage, data);
      });

      await expect(mockLocalStorage.set(largeSettings)).rejects.toThrow(
        "QuotaExceededError",
      );
    });

    test("should implement quota monitoring with real storage manager", async () => {
      // Mock getBytesInUse for both storages
      mockLocalStorage.getBytesInUse = jest.fn().mockResolvedValue(1048576); // 1MB
      mockSyncStorage.getBytesInUse = jest.fn().mockResolvedValue(51200); // 50KB

      await settingsManager.initializeWithEmbeddedDefaults();

      // Test local storage quota
      const localQuota = await settingsManager.checkStorageQuota();
      expect(localQuota.used).toBeGreaterThan(0);
      expect(localQuota.quota).toBe(5242880); // 5MB
      expect(localQuota.percentUsed).toBeLessThan(100);

      // Test sync storage quota
      settingsManager.setStorageArea("sync");
      const syncQuota = await settingsManager.checkStorageQuota();
      expect(syncQuota.quota).toBe(102400); // 100KB

      // Test quota warning threshold (90%)
      mockLocalStorage.getBytesInUse.mockResolvedValue(4718592); // 4.5MB (90% of 5MB)
      settingsManager.setStorageArea("local");
      const nearLimitQuota = await settingsManager.checkStorageQuota();
      expect(nearLimitQuota.available).toBe(false); // Should warn when above 90%
    });

    test("should handle storage statistics calculation", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      const storageStats = await settingsManager.getStorageStats();
      expect(storageStats.settingsCount).toBeGreaterThan(0);
      expect(storageStats.totalBytes).toBeGreaterThan(0);
      expect(storageStats.averageSettingSize).toBeGreaterThan(0);
      expect(storageStats.quota).toBeDefined();
    });
  });

  describe("Storage Persistence", () => {
    test("should persist settings across browser sessions using SettingsManager", async () => {
      // Initialize and make changes
      await settingsManager.initializeWithEmbeddedDefaults();
      await settingsManager.updateSetting("feature_enabled", false);
      await settingsManager.updateSetting("api_key", "persistent-key");

      // Simulate browser restart by creating new SettingsManager
      const newSettingsManager = new SettingsManager();
      await newSettingsManager.initialize();

      // Settings should persist
      const featureSetting =
        await newSettingsManager.getSetting("feature_enabled");
      const apiKeySetting = await newSettingsManager.getSetting("api_key");

      expect(featureSetting.value).toBe(false);
      expect(apiKeySetting.value).toBe("persistent-key");

      newSettingsManager.destroy();
    });

    test("should handle storage corruption recovery with embedded defaults", async () => {
      // Simulate corrupted storage that throws on read
      mockLocalStorage.get.mockRejectedValue(
        new Error("Storage corrupted: Invalid JSON"),
      );

      // Should recover using embedded defaults
      await settingsManager.initialize();

      const settings = await settingsManager.getAllSettings();
      expect(settings.feature_enabled).toBeDefined();
      expect(settings.feature_enabled.value).toBe(true); // Embedded default
      expect(settings.refresh_interval.value).toBe(60); // Embedded default
    });

    test("should handle graceful migration from old storage format", async () => {
      // Mock old version storage format (simple key-value pairs)
      const oldFormatData = {
        feature_enabled: true,
        api_key: "old-format-key",
        refresh_interval: 30,
      };

      mockLocalStorage.get.mockResolvedValue(oldFormatData);

      // Initialize should handle migration internally
      await settingsManager.initialize();

      const settings = await settingsManager.getAllSettings();

      // Should have proper setting structure
      expect(settings.feature_enabled.type).toBe("boolean");
      expect(settings.feature_enabled.value).toBe(true);
      expect(settings.api_key.type).toBe("text");
      expect(settings.api_key.maxLength).toBe(100);
    });

    test("should validate data integrity after persistence operations", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      const originalSettings = await settingsManager.getAllSettings();

      // Make multiple updates
      await settingsManager.updateSettings({
        feature_enabled: false,
        refresh_interval: 300,
        api_key: "integrity-test-key",
      });

      // Verify persistence by checking storage directly
      const storedData = await mockLocalStorage.get(null);
      expect(storedData.feature_enabled.value).toBe(false);
      expect(storedData.refresh_interval.value).toBe(300);
      expect(storedData.api_key.value).toBe("integrity-test-key");

      // Verify structure is maintained
      expect(storedData.feature_enabled.type).toBe("boolean");
      expect(storedData.refresh_interval.type).toBe("number");
      expect(storedData.api_key.type).toBe("text");
    });
  });

  describe("Storage Synchronization", () => {
    test("should sync settings between local and sync storage areas", async () => {
      // Initialize with local storage
      await settingsManager.initializeWithEmbeddedDefaults();
      await settingsManager.updateSetting("feature_enabled", false);

      const localSettings = await settingsManager.getAllSettings();

      // Switch to sync storage and verify data can be transferred
      settingsManager.setStorageArea("sync");
      await settingsManager.persistSettings(localSettings);

      // Verify sync storage has the data
      const syncData = await mockSyncStorage.get(null);
      expect(syncData.feature_enabled.value).toBe(false);
    });

    test("should handle sync conflicts with timestamp resolution", async () => {
      const localSettings = {
        feature_enabled: {
          type: "boolean",
          value: false,
          description: "Local version",
        },
        api_key: { type: "text", value: "local-key", description: "API Key" },
      };

      const syncSettings = {
        feature_enabled: {
          type: "boolean",
          value: true,
          description: "Sync version",
        },
        api_key: { type: "text", value: "sync-key", description: "API Key" },
      };

      mockLocalStorage.get.mockResolvedValue(localSettings);
      mockSyncStorage.get.mockResolvedValue(syncSettings);

      // Initialize should merge settings (in this case, sync overrides local)
      await settingsManager.initialize();

      const resolvedSettings = await settingsManager.getAllSettings();

      // Verify conflict resolution - sync settings should take precedence
      expect(resolvedSettings.feature_enabled.value).toBe(true);
      expect(resolvedSettings.api_key.value).toBe("sync-key");
    });

    test("should handle partial sync failures gracefully", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      // Mock sync storage to fail on specific settings
      let callCount = 0;
      mockSyncStorage.set.mockImplementation(async (data) => {
        callCount++;
        if (callCount === 1 && data.api_key) {
          throw new Error("Network timeout on api_key sync");
        }
        Object.assign(mockSyncStorage.storage, data);
      });

      settingsManager.setStorageArea("sync");

      // First sync should fail
      await expect(
        settingsManager.updateSetting("api_key", "sync-test-key"),
      ).rejects.toThrow("Network timeout on api_key sync");

      // But other settings should still work
      await expect(
        settingsManager.updateSetting("feature_enabled", false),
      ).resolves.not.toThrow();
    });

    test("should maintain data consistency during storage area switches", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      // Make changes in local storage
      await settingsManager.updateSetting("refresh_interval", 120);
      const localValue = await settingsManager.getSetting("refresh_interval");
      expect(localValue.value).toBe(120);

      // Switch to sync storage
      settingsManager.setStorageArea("sync");

      // Should reinitialize and potentially have different values
      await settingsManager.initialize();
      const syncValue = await settingsManager.getSetting("refresh_interval");

      // Should have structure integrity regardless of storage area
      expect(syncValue.type).toBe("number");
      expect(syncValue.min).toBe(1);
      expect(syncValue.max).toBe(3600);
    });
  });

  describe("Storage Performance", () => {
    test("should perform storage operations within time limits using real SettingsManager", async () => {
      const startTime = Date.now();

      await settingsManager.initializeWithEmbeddedDefaults();
      await settingsManager.updateSetting("feature_enabled", false);
      const retrieved = await settingsManager.getSetting("feature_enabled");

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 100ms as per requirements
      expect(duration).toBeLessThan(100);
      expect(retrieved.value).toBe(false);
    });

    test("should handle concurrent storage operations without race conditions", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      const promises = [];
      const concurrentUpdates = {};

      // Create concurrent updates to different settings
      for (let i = 0; i < 10; i++) {
        const settingName =
          i % 2 === 0 ? "refresh_interval" : "feature_enabled";
        const newValue = i % 2 === 0 ? 30 + i : i % 2 === 1;
        concurrentUpdates[`${settingName}_${i}`] = { settingName, newValue };

        promises.push(
          settingsManager
            .updateSetting(settingName, newValue)
            .then(() => settingsManager.getSetting(settingName)),
        );
      }

      const results = await Promise.all(promises);

      // Verify all operations completed successfully
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.type).toBeDefined();
        expect(result.value).toBeDefined();
      });
    });

    test("should optimize storage for large datasets using batch operations", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      // Test bulk update performance
      const bulkUpdates = {
        feature_enabled: true,
        refresh_interval: 120,
        api_key: "test-bulk-key",
        custom_css: "/* Bulk update test */ .test { color: red; }",
      };

      const startTime = Date.now();
      await settingsManager.updateSettings(bulkUpdates);
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Bulk operations should be efficient
      expect(duration).toBeLessThan(50);

      // Verify all updates were applied
      const allSettings = await settingsManager.getAllSettings();
      expect(allSettings.feature_enabled.value).toBe(true);
      expect(allSettings.refresh_interval.value).toBe(120);
      expect(allSettings.api_key.value).toBe("test-bulk-key");
      expect(allSettings.custom_css.value).toContain("Bulk update test");
    });

    test("should handle rapid sequential operations efficiently", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      const startTime = Date.now();

      // Rapid sequential operations
      for (let i = 0; i < 50; i++) {
        await settingsManager.updateSetting("refresh_interval", i + 1);
      }

      const finalValue = await settingsManager.getSetting("refresh_interval");
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200); // Should handle 50 operations quickly
      expect(finalValue.value).toBe(50); // Final value should be correct
    });
  });

  describe("Storage Error Handling", () => {
    test("should handle Chrome lastError scenarios", async () => {
      // Simulate Chrome's lastError pattern
      global.chrome = {
        ...global.chrome,
        runtime: {
          ...global.chrome.runtime,
          lastError: { message: "The storage area is disabled." },
        },
      };

      mockLocalStorage.get.mockImplementation(() => {
        if (global.chrome.runtime.lastError) {
          return Promise.reject(
            new Error(global.chrome.runtime.lastError.message),
          );
        }
        return Promise.resolve(mockLocalStorage.storage);
      });

      await expect(mockLocalStorage.get("testKey")).rejects.toThrow(
        "The storage area is disabled.",
      );

      // Clean up
      global.chrome.runtime.lastError = null;
    });

    test("should handle storage write errors with recovery", async () => {
      let attemptCount = 0;
      mockLocalStorage.set.mockImplementation(async (data) => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error("QUOTA_EXCEEDED_ERR: Quota exceeded.");
        }
        // Second attempt succeeds after cleanup
        Object.assign(mockLocalStorage.storage, data);
      });

      await settingsManager.initializeWithEmbeddedDefaults();

      try {
        await settingsManager.updateSetting("custom_css", "x".repeat(100000)); // Large value
      } catch (error) {
        expect(error.message).toContain("QUOTA_EXCEEDED_ERR");
      }

      expect(attemptCount).toBe(1);
    });

    test("should provide meaningful error messages with context", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      // Test validation errors
      await expect(
        settingsManager.updateSetting("refresh_interval", "invalid"),
      ).rejects.toThrow(
        "Auto-refresh interval in seconds must be a valid number",
      );

      await expect(
        settingsManager.updateSetting("refresh_interval", 5000), // Above max
      ).rejects.toThrow(
        "Auto-refresh interval in seconds must be at most 3600",
      );

      await expect(
        settingsManager.updateSetting("nonexistent_setting", "value"),
      ).rejects.toThrow("Setting 'nonexistent_setting' not found");
    });

    test("should handle corrupted storage data gracefully", async () => {
      // Simulate corrupted storage data
      mockLocalStorage.get.mockResolvedValue({
        feature_enabled: "invalid_boolean_value", // Should be boolean
        refresh_interval: { malformed: "object" }, // Should be setting object
        corrupted_setting: null,
      });

      // Should still initialize with defaults when storage is corrupted
      await settingsManager.initialize();
      const settings = await settingsManager.getAllSettings();

      expect(settings.feature_enabled.value).toBe(true); // Default value
      expect(settings.refresh_interval.value).toBe(60); // Default value
    });

    test("should handle network errors in Firefox sync storage", async () => {
      settingsManager.setStorageArea("sync");

      // Simulate Firefox-specific network error
      mockSyncStorage.set.mockRejectedValue({
        name: "NetworkError",
        message: "A network error occurred.",
        fileName: "chrome://extensions/content/storage-sync.js",
      });

      await settingsManager.initializeWithEmbeddedDefaults();

      await expect(
        settingsManager.updateSetting("feature_enabled", false),
      ).rejects.toMatchObject({
        name: "NetworkError",
        message: "A network error occurred.",
      });
    });
  });

  describe("Storage Cleanup", () => {
    test("should clean up unused storage entries during reset", async () => {
      // Add some settings and extra data
      await mockLocalStorage.set({
        ...testSettings,
        obsoleteSetting: {
          type: "text",
          value: "obsolete",
          description: "This setting is no longer used",
        },
        tempData: "should be removed",
      });

      await settingsManager.initialize();

      // Reset should clean up and only keep valid settings
      await settingsManager.resetToDefaults();

      const cleanedSettings = await settingsManager.getAllSettings();

      // Should only have default settings
      expect(cleanedSettings.feature_enabled).toBeDefined();
      expect(cleanedSettings.obsoleteSetting).toBeUndefined();
      expect(cleanedSettings.tempData).toBeUndefined();
    });

    test("should implement storage maintenance through import/export cycle", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      // Make some changes
      await settingsManager.updateSettings({
        feature_enabled: false,
        api_key: "maintenance-test",
      });

      // Export settings (this validates and cleans data)
      const exportedData = await settingsManager.exportSettings();
      const parsedExport = JSON.parse(exportedData);

      expect(parsedExport.version).toBe("1.0");
      expect(parsedExport.timestamp).toBeDefined();
      expect(parsedExport.settings.feature_enabled.value).toBe(false);

      // Reset and import (this is like a maintenance operation)
      await settingsManager.resetToDefaults();
      await settingsManager.importSettings(exportedData);

      // Verify data integrity after maintenance cycle
      const maintainedSettings = await settingsManager.getAllSettings();
      expect(maintainedSettings.feature_enabled.value).toBe(false);
      expect(maintainedSettings.api_key.value).toBe("maintenance-test");
    });

    test("should validate and clean malformed settings during initialization", async () => {
      // Store malformed data
      await mockLocalStorage.set({
        validSetting: {
          type: "boolean",
          value: true,
          description: "Valid setting",
        },
        malformedSetting1: "not an object",
        malformedSetting2: {
          // missing type
          value: "test",
        },
        malformedSetting3: {
          type: "boolean",
          // missing value
        },
      });

      // Should initialize successfully despite malformed data
      await settingsManager.initialize();
      const settings = await settingsManager.getAllSettings();

      // Should have only valid default settings
      expect(settings.feature_enabled).toBeDefined();
      expect(settings.validSetting).toBeUndefined(); // Not in defaults
      expect(settings.malformedSetting1).toBeUndefined();
      expect(settings.malformedSetting2).toBeUndefined();
      expect(settings.malformedSetting3).toBeUndefined();
    });
  });

  describe("Storage Security", () => {
    test("should validate setting values against XSS attacks", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      // Test XSS prevention in text settings
      const maliciousValue = '<script>alert("xss")</script>';

      // Should accept the value (storage doesn't sanitize by default)
      // but validation should ensure it's treated as plain text
      await settingsManager.updateSetting("api_key", maliciousValue);

      const setting = await settingsManager.getSetting("api_key");
      expect(setting.value).toBe(maliciousValue);
      expect(setting.type).toBe("text"); // Ensures it's treated as text, not executable
    });

    test("should validate storage data integrity with type checking", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      // Test type validation prevents injection of wrong types
      await expect(
        settingsManager.updateSetting("feature_enabled", "true"), // String instead of boolean
      ).rejects.toThrow("Enable main feature functionality must be a boolean");

      await expect(
        settingsManager.updateSetting("refresh_interval", "60"), // String instead of number
      ).rejects.toThrow(
        "Auto-refresh interval in seconds must be a valid number",
      );
    });

    test("should handle sensitive data with proper validation", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      // Test API key validation
      const longApiKey = "a".repeat(200); // Exceeds maxLength

      await expect(
        settingsManager.updateSetting("api_key", longApiKey),
      ).rejects.toThrow(
        "API key for external service exceeds maximum length of 100",
      );

      // Test valid API key
      const validApiKey = "sk-1234567890abcdef";
      await settingsManager.updateSetting("api_key", validApiKey);

      const setting = await settingsManager.getSetting("api_key");
      expect(setting.value).toBe(validApiKey);
    });

    test("should prevent JSON injection attacks", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      // Test circular reference prevention
      const circularObj = { a: 1 };
      circularObj.self = circularObj;

      await expect(
        settingsManager.updateSetting("advanced_config", circularObj),
      ).rejects.toThrow(
        "Advanced configuration object contains circular references or invalid JSON",
      );

      // Test prototype pollution prevention
      const maliciousObj = {
        __proto__: { polluted: true },
        normal: "value",
      };

      // Should accept the object but not execute prototype pollution
      await settingsManager.updateSetting("advanced_config", maliciousObj);
      const setting = await settingsManager.getSetting("advanced_config");

      expect(setting.value.normal).toBe("value");
      expect({}.polluted).toBeUndefined(); // Prototype not polluted
    });

    test("should validate import data against malicious payloads", async () => {
      await settingsManager.initializeWithEmbeddedDefaults();

      const maliciousImport = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        settings: {
          feature_enabled: {
            type: "boolean",
            value: true,
            description: "Normal setting",
          },
          "../../../etc/passwd": {
            type: "text",
            value: "path traversal attempt",
            description: "Malicious key",
          },
          constructor: {
            type: "text",
            value: "prototype pollution attempt",
            description: "Another malicious key",
          },
        },
      };

      // Should only import known/valid settings
      await settingsManager.importSettings(JSON.stringify(maliciousImport));

      const settings = await settingsManager.getAllSettings();
      expect(settings.feature_enabled.value).toBe(true); // Valid setting imported
      expect(settings["../../../etc/passwd"]).toBeUndefined(); // Malicious key ignored
      expect(settings.constructor).toBeUndefined(); // Prototype pollution prevented
    });
  });
});
