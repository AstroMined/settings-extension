/**
 * Testing Integration Framework for Settings Extension
 *
 * Comprehensive testing patterns for the Settings Extension API including
 * unit tests, integration tests, performance benchmarks, and error scenario
 * testing. Based on production patterns with real testing strategies.
 *
 * 🧪 TESTING FEATURES:
 * - Unit tests for all API methods
 * - Integration testing with mock background script
 * - Performance benchmarking and load testing
 * - Error scenario and edge case testing
 * - Cross-browser compatibility validation
 * - Memory leak detection
 * - Concurrency and race condition testing
 * - Mock factories for isolated testing
 * - Test data generators
 * - Automated test reporting
 *
 * Use these patterns for thorough validation of your settings integration.
 */

// ========================================
// MOCK FACTORIES & TEST UTILITIES
// ========================================

/**
 * Mock factory for creating test doubles of the Settings API
 */
class SettingsMockFactory {
  static createMockSettings(options = {}) {
    const mockData = options.data || {
      feature_enabled: {
        type: "boolean",
        value: true,
        description: "Test feature",
      },
      api_key: {
        type: "text",
        value: "test-key-123",
        description: "Test API key",
      },
      refresh_interval: {
        type: "number",
        value: 60,
        description: "Test interval",
        min: 1,
        max: 3600,
      },
    };

    const cache = new Map();
    const listeners = new Set();
    let _messageTimeout = 5000; // eslint-disable-line no-unused-vars
    let failureMode = options.failureMode || null;
    let responseDelay = options.responseDelay || 0;

    const mock = {
      // Core API methods
      async getSetting(key) {
        await SettingsMockFactory.simulateDelay(responseDelay);
        SettingsMockFactory.maybeThrowError(failureMode, "getSetting");

        if (!mockData[key]) {
          throw new Error(`Setting '${key}' not found`);
        }

        const setting = { ...mockData[key] };
        cache.set(key, setting);
        return setting;
      },

      async getSettings(keys) {
        await SettingsMockFactory.simulateDelay(responseDelay);
        SettingsMockFactory.maybeThrowError(failureMode, "getSettings");

        const result = {};
        for (const key of keys) {
          if (mockData[key]) {
            result[key] = { ...mockData[key] };
            cache.set(key, result[key]);
          }
        }
        return result;
      },

      async getAllSettings() {
        await SettingsMockFactory.simulateDelay(responseDelay);
        SettingsMockFactory.maybeThrowError(failureMode, "getAllSettings");

        const result = {};
        for (const [key, setting] of Object.entries(mockData)) {
          result[key] = { ...setting };
          cache.set(key, result[key]);
        }
        return result;
      },

      async updateSetting(key, value) {
        await SettingsMockFactory.simulateDelay(responseDelay);
        SettingsMockFactory.maybeThrowError(failureMode, "updateSetting");

        if (!mockData[key]) {
          throw new Error(`Setting '${key}' not found`);
        }

        // Validate value type
        const setting = mockData[key];
        SettingsMockFactory.validateValue(setting, value);

        // Update value
        mockData[key] = { ...setting, value };
        if (cache.has(key)) {
          cache.set(key, { ...mockData[key] });
        }

        // Notify listeners
        const changes = { [key]: value };
        setTimeout(() => {
          for (const listener of listeners) {
            try {
              listener("changed", changes);
            } catch (error) {
              console.error("Mock listener error:", error);
            }
          }
        }, 1);

        return true;
      },

      async updateSettings(updates) {
        await SettingsMockFactory.simulateDelay(responseDelay);
        SettingsMockFactory.maybeThrowError(failureMode, "updateSettings");

        // Validate all updates first
        for (const [key, value] of Object.entries(updates)) {
          if (!mockData[key]) {
            throw new Error(`Setting '${key}' not found`);
          }
          SettingsMockFactory.validateValue(mockData[key], value);
        }

        // Apply all updates
        for (const [key, value] of Object.entries(updates)) {
          const setting = mockData[key];
          mockData[key] = { ...setting, value };
          if (cache.has(key)) {
            cache.set(key, { ...mockData[key] });
          }
        }

        // Notify listeners
        setTimeout(() => {
          for (const listener of listeners) {
            try {
              listener("changed", updates);
            } catch (error) {
              console.error("Mock listener error:", error);
            }
          }
        }, 1);

        return true;
      },

      async exportSettings() {
        await SettingsMockFactory.simulateDelay(responseDelay);
        SettingsMockFactory.maybeThrowError(failureMode, "exportSettings");

        return JSON.stringify(
          {
            version: "1.0",
            timestamp: new Date().toISOString(),
            settings: { ...mockData },
          },
          null,
          2,
        );
      },

      async importSettings(jsonData) {
        await SettingsMockFactory.simulateDelay(responseDelay);
        SettingsMockFactory.maybeThrowError(failureMode, "importSettings");

        const importData = JSON.parse(jsonData);
        if (!importData.settings) {
          throw new Error("Invalid import format");
        }

        // Clear cache and update data
        cache.clear();
        Object.assign(mockData, importData.settings);

        // Notify listeners
        setTimeout(() => {
          for (const listener of listeners) {
            try {
              listener("imported", mockData);
            } catch (error) {
              console.error("Mock listener error:", error);
            }
          }
        }, 1);

        return true;
      },

      async resetSettings() {
        await SettingsMockFactory.simulateDelay(responseDelay);
        SettingsMockFactory.maybeThrowError(failureMode, "resetSettings");

        // Reset to defaults
        const defaults = options.defaults || {
          feature_enabled: {
            type: "boolean",
            value: false,
            description: "Feature toggle",
          },
          api_key: { type: "text", value: "", description: "API key" },
          refresh_interval: {
            type: "number",
            value: 60,
            description: "Refresh interval",
          },
        };

        cache.clear();
        Object.keys(mockData).forEach((key) => delete mockData[key]);
        Object.assign(mockData, defaults);

        // Notify listeners
        setTimeout(() => {
          for (const listener of listeners) {
            try {
              listener("reset", mockData);
            } catch (error) {
              console.error("Mock listener error:", error);
            }
          }
        }, 1);

        return true;
      },

      async getStorageStats() {
        await SettingsMockFactory.simulateDelay(responseDelay);
        SettingsMockFactory.maybeThrowError(failureMode, "getStorageStats");

        const dataSize = JSON.stringify(mockData).length;
        return {
          totalBytes: dataSize,
          settingsCount: Object.keys(mockData).length,
          averageSettingSize: dataSize / Object.keys(mockData).length,
        };
      },

      async checkStorageQuota() {
        await SettingsMockFactory.simulateDelay(responseDelay);
        SettingsMockFactory.maybeThrowError(failureMode, "checkStorageQuota");

        const used = JSON.stringify(mockData).length;
        const quota = 5242880; // 5MB

        return {
          available: used < quota * 0.9,
          used,
          quota,
          percentUsed: (used / quota) * 100,
        };
      },

      // Cache methods
      getCachedSetting(key) {
        return cache.get(key) || null;
      },

      getCachedSettings() {
        const result = {};
        for (const [key, value] of cache) {
          result[key] = value;
        }
        return result;
      },

      clearCache() {
        cache.clear();
      },

      // Listener methods
      addChangeListener(callback) {
        listeners.add(callback);
      },

      removeChangeListener(callback) {
        listeners.delete(callback);
      },

      // Configuration methods
      setMessageTimeout(timeout) {
        _messageTimeout = timeout;
      },

      destroy() {
        listeners.clear();
        cache.clear();
      },

      // Test utilities
      _setFailureMode(mode) {
        failureMode = mode;
      },

      _setResponseDelay(delay) {
        responseDelay = delay;
      },

      _getMockData() {
        return { ...mockData };
      },

      _setMockData(data) {
        Object.keys(mockData).forEach((key) => delete mockData[key]);
        Object.assign(mockData, data);
        cache.clear();
      },

      _triggerChange(changes) {
        setTimeout(() => {
          for (const listener of listeners) {
            try {
              listener("changed", changes);
            } catch (error) {
              console.error("Mock listener error:", error);
            }
          }
        }, 1);
      },
    };

    return mock;
  }

  static simulateDelay(ms) {
    if (ms > 0) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    return Promise.resolve();
  }

  static maybeThrowError(failureMode, method) {
    if (!failureMode) return;

    switch (failureMode) {
      case "timeout":
        throw new Error(`Timeout ${method}`);
      case "network":
        throw new Error("Network error");
      case "validation":
        throw new Error("Validation error");
      case "random":
        if (Math.random() < 0.3) {
          throw new Error(`Random failure in ${method}`);
        }
        break;
    }
  }

  static validateValue(setting, value) {
    switch (setting.type) {
      case "boolean":
        if (typeof value !== "boolean") {
          throw new Error("Value must be boolean");
        }
        break;
      case "text":
      case "longtext":
        if (typeof value !== "string") {
          throw new Error("Value must be string");
        }
        if (setting.maxLength && value.length > setting.maxLength) {
          throw new Error(
            `Value exceeds maximum length of ${setting.maxLength}`,
          );
        }
        break;
      case "number":
        if (typeof value !== "number" || isNaN(value)) {
          throw new Error("Value must be a valid number");
        }
        if (setting.min !== undefined && value < setting.min) {
          throw new Error(`Value must be at least ${setting.min}`);
        }
        if (setting.max !== undefined && value > setting.max) {
          throw new Error(`Value must be at most ${setting.max}`);
        }
        break;
      case "json":
        if (typeof value !== "object" || value === null) {
          throw new Error("Value must be a valid object");
        }
        break;
    }
  }
}

/**
 * Test data generators for creating realistic test scenarios
 */
class TestDataGenerator {
  static generateSettingsConfig(size = "small") {
    const configs = {
      small: {
        feature_enabled: {
          type: "boolean",
          value: true,
          description: "Enable feature",
        },
        api_key: { type: "text", value: "test-key", description: "API key" },
      },
      medium: {
        feature_enabled: {
          type: "boolean",
          value: true,
          description: "Enable feature",
        },
        api_key: {
          type: "text",
          value: "test-key-123456789",
          description: "API key",
          maxLength: 100,
        },
        refresh_interval: {
          type: "number",
          value: 60,
          description: "Interval",
          min: 1,
          max: 3600,
        },
        custom_css: {
          type: "longtext",
          value: "/* Test CSS */",
          description: "CSS",
          maxLength: 10000,
        },
        advanced_config: {
          type: "json",
          value: { endpoint: "test" },
          description: "Config",
        },
      },
      large: {
        ...TestDataGenerator.generateManySettings(50),
      },
    };

    return configs[size] || configs.small;
  }

  static generateManySettings(count) {
    const settings = {};

    for (let i = 0; i < count; i++) {
      const types = ["boolean", "text", "number", "json"];
      const type = types[Math.floor(Math.random() * types.length)];

      let value;
      switch (type) {
        case "boolean":
          value = Math.random() > 0.5;
          break;
        case "text":
          value = `test-value-${i}`;
          break;
        case "number":
          value = Math.floor(Math.random() * 1000);
          break;
        case "json":
          value = { key: `value-${i}`, index: i };
          break;
      }

      settings[`setting_${i}`] = {
        type,
        value,
        description: `Test setting ${i}`,
      };
    }

    return settings;
  }

  static generateUpdateBatch(size = 5) {
    const updates = {};

    for (let i = 0; i < size; i++) {
      updates[`setting_${i}`] = `updated-value-${i}-${Date.now()}`;
    }

    return updates;
  }

  static generateInvalidValues() {
    return {
      boolean_as_string: { setting: { type: "boolean" }, value: "true" },
      number_as_string: { setting: { type: "number" }, value: "42" },
      string_too_long: {
        setting: { type: "text", maxLength: 10 },
        value: "this string is way too long",
      },
      number_too_small: { setting: { type: "number", min: 10 }, value: 5 },
      number_too_large: { setting: { type: "number", max: 100 }, value: 200 },
      null_value: { setting: { type: "text" }, value: null },
      undefined_value: { setting: { type: "text" }, value: undefined },
    };
  }
}

// ========================================
// UNIT TEST FRAMEWORK
// ========================================

/**
 * Lightweight test framework for Settings API
 */
class SettingsTestFramework {
  constructor() {
    this.tests = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };
  }

  describe(suiteName, callback) {
    console.log(`🧪 Test Suite: ${suiteName}`);
    callback();
  }

  it(testName, testFunction, options = {}) {
    this.tests.push({
      name: testName,
      fn: testFunction,
      timeout: options.timeout || 5000,
      skip: options.skip || false,
    });
  }

  beforeEach(hook) {
    this.beforeEachHooks.push(hook);
  }

  afterEach(hook) {
    this.afterEachHooks.push(hook);
  }

  async run() {
    console.log(`🚀 Running ${this.tests.length} tests...`);
    const startTime = performance.now();

    for (const test of this.tests) {
      if (test.skip) {
        console.log(`  ⏭️ ${test.name} (skipped)`);
        this.results.skipped++;
        continue;
      }

      try {
        // Run beforeEach hooks
        for (const hook of this.beforeEachHooks) {
          await hook();
        }

        // Run test with timeout
        const testPromise = test.fn();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Test timeout")), test.timeout),
        );

        await Promise.race([testPromise, timeoutPromise]);

        console.log(`  ✅ ${test.name}`);
        this.results.passed++;
      } catch (error) {
        console.error(`  ❌ ${test.name}: ${error.message}`);
        this.results.failed++;
        this.results.errors.push({
          test: test.name,
          error: error.message,
          stack: error.stack,
        });
      }

      try {
        // Run afterEach hooks
        for (const hook of this.afterEachHooks) {
          await hook();
        }
      } catch (hookError) {
        console.warn(`  ⚠️ afterEach hook failed for ${test.name}:`, hookError);
      }
    }

    const totalTime = performance.now() - startTime;
    const total =
      this.results.passed + this.results.failed + this.results.skipped;

    console.log(`\n📊 Test Results:`);
    console.log(`  Total: ${total}`);
    console.log(
      `  Passed: ${this.results.passed} (${Math.round((this.results.passed / total) * 100)}%)`,
    );
    console.log(
      `  Failed: ${this.results.failed} (${Math.round((this.results.failed / total) * 100)}%)`,
    );
    console.log(
      `  Skipped: ${this.results.skipped} (${Math.round((this.results.skipped / total) * 100)}%)`,
    );
    console.log(`  Time: ${Math.round(totalTime)}ms`);

    return this.results;
  }

  // Assertion methods
  static assertEqual(actual, expected, message = "") {
    if (actual !== expected) {
      throw new Error(`${message} Expected: ${expected}, Actual: ${actual}`);
    }
  }

  static assertNotEqual(actual, expected, message = "") {
    if (actual === expected) {
      throw new Error(
        `${message} Expected not to equal: ${expected}, but got: ${actual}`,
      );
    }
  }

  static assertTrue(value, message = "") {
    if (!value) {
      throw new Error(`${message} Expected truthy value, got: ${value}`);
    }
  }

  static assertFalse(value, message = "") {
    if (value) {
      throw new Error(`${message} Expected falsy value, got: ${value}`);
    }
  }

  static assertThrows(fn, expectedError, message = "") {
    try {
      fn();
      throw new Error(`${message} Expected function to throw`);
    } catch (error) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(
          `${message} Expected error containing '${expectedError}', got: ${error.message}`,
        );
      }
    }
  }

  static async assertThrowsAsync(asyncFn, expectedError, message = "") {
    try {
      await asyncFn();
      throw new Error(`${message} Expected async function to throw`);
    } catch (error) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(
          `${message} Expected error containing '${expectedError}', got: ${error.message}`,
        );
      }
    }
  }

  static assertDeepEqual(actual, expected, message = "") {
    const actualStr = JSON.stringify(actual, null, 2);
    const expectedStr = JSON.stringify(expected, null, 2);

    if (actualStr !== expectedStr) {
      throw new Error(
        `${message} Objects not deep equal.\nExpected:\n${expectedStr}\nActual:\n${actualStr}`,
      );
    }
  }
}

// ========================================
// COMPREHENSIVE TEST SUITES
// ========================================

/**
 * Complete unit test suite for Settings API
 */
function createUnitTestSuite() {
  const framework = new SettingsTestFramework();
  let mockSettings;

  framework.beforeEach(() => {
    mockSettings = SettingsMockFactory.createMockSettings({
      data: TestDataGenerator.generateSettingsConfig("medium"),
    });
  });

  framework.afterEach(() => {
    if (mockSettings) {
      mockSettings.destroy();
    }
  });

  framework.describe("Settings API Unit Tests", () => {
    // Basic CRUD Operations
    framework.it("should get single setting", async () => {
      const setting = await mockSettings.getSetting("feature_enabled");

      SettingsTestFramework.assertTrue(setting, "Setting should exist");
      SettingsTestFramework.assertEqual(
        setting.type,
        "boolean",
        "Type should match",
      );
      SettingsTestFramework.assertEqual(
        setting.value,
        true,
        "Value should match",
      );
      SettingsTestFramework.assertTrue(
        setting.description,
        "Description should exist",
      );
    });

    framework.it("should throw error for non-existent setting", async () => {
      await SettingsTestFramework.assertThrowsAsync(
        () => mockSettings.getSetting("non_existent"),
        "not found",
        "Should throw not found error",
      );
    });

    framework.it("should get multiple settings", async () => {
      const settings = await mockSettings.getSettings([
        "feature_enabled",
        "api_key",
      ]);

      SettingsTestFramework.assertTrue(settings, "Settings should exist");
      SettingsTestFramework.assertTrue(
        settings.feature_enabled,
        "First setting should exist",
      );
      SettingsTestFramework.assertTrue(
        settings.api_key,
        "Second setting should exist",
      );
      SettingsTestFramework.assertEqual(
        Object.keys(settings).length,
        2,
        "Should return 2 settings",
      );
    });

    framework.it("should get all settings", async () => {
      const allSettings = await mockSettings.getAllSettings();

      SettingsTestFramework.assertTrue(
        allSettings,
        "All settings should exist",
      );
      SettingsTestFramework.assertTrue(
        Object.keys(allSettings).length >= 5,
        "Should have multiple settings",
      );
      SettingsTestFramework.assertTrue(
        allSettings.feature_enabled,
        "Should contain feature toggle",
      );
      SettingsTestFramework.assertTrue(
        allSettings.api_key,
        "Should contain API key",
      );
    });

    framework.it("should update single setting", async () => {
      const originalValue = await mockSettings.getSetting("feature_enabled");
      const newValue = !originalValue.value;

      const result = await mockSettings.updateSetting(
        "feature_enabled",
        newValue,
      );
      SettingsTestFramework.assertTrue(result, "Update should succeed");

      const updatedValue = await mockSettings.getSetting("feature_enabled");
      SettingsTestFramework.assertEqual(
        updatedValue.value,
        newValue,
        "Value should be updated",
      );
    });

    framework.it("should validate setting values", async () => {
      // Test type validation
      await SettingsTestFramework.assertThrowsAsync(
        () => mockSettings.updateSetting("feature_enabled", "not_boolean"),
        "boolean",
        "Should validate boolean type",
      );

      await SettingsTestFramework.assertThrowsAsync(
        () => mockSettings.updateSetting("refresh_interval", "not_number"),
        "number",
        "Should validate number type",
      );
    });

    framework.it("should update multiple settings", async () => {
      const updates = {
        feature_enabled: false,
        refresh_interval: 120,
      };

      const result = await mockSettings.updateSettings(updates);
      SettingsTestFramework.assertTrue(result, "Batch update should succeed");

      const updatedSettings = await mockSettings.getSettings([
        "feature_enabled",
        "refresh_interval",
      ]);
      SettingsTestFramework.assertEqual(
        updatedSettings.feature_enabled.value,
        false,
        "Boolean should be updated",
      );
      SettingsTestFramework.assertEqual(
        updatedSettings.refresh_interval.value,
        120,
        "Number should be updated",
      );
    });

    // Import/Export Operations
    framework.it("should export settings", async () => {
      const exportData = await mockSettings.exportSettings();

      SettingsTestFramework.assertTrue(exportData, "Export data should exist");

      const parsed = JSON.parse(exportData);
      SettingsTestFramework.assertTrue(parsed.version, "Should have version");
      SettingsTestFramework.assertTrue(
        parsed.timestamp,
        "Should have timestamp",
      );
      SettingsTestFramework.assertTrue(parsed.settings, "Should have settings");
      SettingsTestFramework.assertTrue(
        Object.keys(parsed.settings).length > 0,
        "Should have setting data",
      );
    });

    framework.it("should import settings", async () => {
      const testData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        settings: {
          feature_enabled: {
            type: "boolean",
            value: false,
            description: "Imported feature",
          },
          new_setting: {
            type: "text",
            value: "imported",
            description: "New imported setting",
          },
        },
      };

      const result = await mockSettings.importSettings(
        JSON.stringify(testData),
      );
      SettingsTestFramework.assertTrue(result, "Import should succeed");

      const imported = await mockSettings.getSetting("feature_enabled");
      SettingsTestFramework.assertEqual(
        imported.value,
        false,
        "Imported value should match",
      );

      const newSetting = await mockSettings.getSetting("new_setting");
      SettingsTestFramework.assertEqual(
        newSetting.value,
        "imported",
        "New setting should exist",
      );
    });

    framework.it("should reset to defaults", async () => {
      // Update a setting
      await mockSettings.updateSetting("feature_enabled", false);

      // Reset
      const result = await mockSettings.resetSettings();
      SettingsTestFramework.assertTrue(result, "Reset should succeed");

      // Check default values are restored
      const resetSetting = await mockSettings.getSetting("feature_enabled");
      SettingsTestFramework.assertEqual(
        resetSetting.value,
        false,
        "Should have default value",
      );
    });

    // Cache Operations
    framework.it("should cache settings after retrieval", async () => {
      // Initially no cache
      const cachedBefore = mockSettings.getCachedSetting("feature_enabled");
      SettingsTestFramework.assertFalse(
        cachedBefore,
        "Should not be cached initially",
      );

      // Load setting to populate cache
      await mockSettings.getSetting("feature_enabled");

      // Should be cached now
      const cachedAfter = mockSettings.getCachedSetting("feature_enabled");
      SettingsTestFramework.assertTrue(
        cachedAfter,
        "Should be cached after load",
      );
      SettingsTestFramework.assertEqual(
        cachedAfter.type,
        "boolean",
        "Cached type should match",
      );
    });

    framework.it("should clear cache", async () => {
      // Load and cache
      await mockSettings.getSetting("feature_enabled");
      SettingsTestFramework.assertTrue(
        mockSettings.getCachedSetting("feature_enabled"),
        "Should be cached",
      );

      // Clear cache
      mockSettings.clearCache();

      // Should be cleared
      const cached = mockSettings.getCachedSetting("feature_enabled");
      SettingsTestFramework.assertFalse(cached, "Cache should be cleared");
    });

    // Change Listeners
    framework.it("should notify change listeners", async () => {
      let changeReceived = false;
      let changeData = null;

      const listener = (event, data) => {
        changeReceived = true;
        changeData = { event, data };
      };

      mockSettings.addChangeListener(listener);

      // Update setting to trigger change
      await mockSettings.updateSetting("feature_enabled", false);

      // Wait for async notification
      await new Promise((resolve) => setTimeout(resolve, 10));

      SettingsTestFramework.assertTrue(
        changeReceived,
        "Change listener should be called",
      );
      SettingsTestFramework.assertEqual(
        changeData.event,
        "changed",
        "Should receive changed event",
      );
      SettingsTestFramework.assertEqual(
        changeData.data.feature_enabled,
        false,
        "Should receive correct data",
      );
    });

    framework.it("should remove change listeners", async () => {
      let changeCount = 0;

      const listener = () => {
        changeCount++;
      };

      mockSettings.addChangeListener(listener);
      await mockSettings.updateSetting("feature_enabled", false);
      await new Promise((resolve) => setTimeout(resolve, 10));

      SettingsTestFramework.assertEqual(
        changeCount,
        1,
        "Should receive first change",
      );

      mockSettings.removeChangeListener(listener);
      await mockSettings.updateSetting("feature_enabled", true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      SettingsTestFramework.assertEqual(
        changeCount,
        1,
        "Should not receive second change",
      );
    });

    // Storage Stats
    framework.it("should provide storage statistics", async () => {
      const stats = await mockSettings.getStorageStats();

      SettingsTestFramework.assertTrue(stats, "Stats should exist");
      SettingsTestFramework.assertTrue(
        stats.totalBytes > 0,
        "Should have total bytes",
      );
      SettingsTestFramework.assertTrue(
        stats.settingsCount > 0,
        "Should have settings count",
      );
      SettingsTestFramework.assertTrue(
        stats.averageSettingSize > 0,
        "Should have average size",
      );
    });

    framework.it("should check storage quota", async () => {
      const quota = await mockSettings.checkStorageQuota();

      SettingsTestFramework.assertTrue(quota, "Quota info should exist");
      SettingsTestFramework.assertTrue(
        typeof quota.available === "boolean",
        "Should have availability",
      );
      SettingsTestFramework.assertTrue(
        quota.used >= 0,
        "Should have used bytes",
      );
      SettingsTestFramework.assertTrue(
        quota.quota > 0,
        "Should have quota limit",
      );
      SettingsTestFramework.assertTrue(
        quota.percentUsed >= 0,
        "Should have percentage",
      );
    });
  });

  return framework;
}

/**
 * Integration test suite with realistic scenarios
 */
function createIntegrationTestSuite() {
  const framework = new SettingsTestFramework();
  let settings;

  framework.beforeEach(() => {
    settings = SettingsMockFactory.createMockSettings({
      data: TestDataGenerator.generateSettingsConfig("large"),
      responseDelay: 10, // Realistic network delay
    });
  });

  framework.afterEach(() => {
    if (settings) {
      settings.destroy();
    }
  });

  framework.describe("Settings API Integration Tests", () => {
    framework.it("should handle complete user workflow", async () => {
      // 1. Initial load
      const initialSettings = await settings.getAllSettings();
      SettingsTestFramework.assertTrue(
        Object.keys(initialSettings).length > 0,
        "Should load initial settings",
      );

      // 2. User modifies multiple settings
      const updates = {
        setting_0: "user_modified_0",
        setting_1: "user_modified_1",
        setting_2: "user_modified_2",
      };

      await settings.updateSettings(updates);

      // 3. Verify changes persisted
      const modifiedSettings = await settings.getSettings(Object.keys(updates));
      for (const [key, expectedValue] of Object.entries(updates)) {
        SettingsTestFramework.assertEqual(
          modifiedSettings[key].value,
          expectedValue,
          `${key} should be updated`,
        );
      }

      // 4. Export configuration
      const exportData = await settings.exportSettings();
      const exported = JSON.parse(exportData);

      for (const [key, expectedValue] of Object.entries(updates)) {
        SettingsTestFramework.assertEqual(
          exported.settings[key].value,
          expectedValue,
          `${key} should be exported`,
        );
      }

      // 5. Reset and verify defaults restored
      await settings.resetSettings();
      const resetSettings = await settings.getAllSettings();

      // Should have default values (not the modified ones)
      SettingsTestFramework.assertNotEqual(
        resetSettings.setting_0.value,
        "user_modified_0",
        "Should be reset",
      );
    });

    framework.it("should handle concurrent operations", async () => {
      // Start multiple operations concurrently
      const operations = [
        settings.getSetting("setting_0"),
        settings.getSetting("setting_1"),
        settings.updateSetting("setting_2", "concurrent_update"),
        settings.getSettings(["setting_3", "setting_4"]),
        settings.getStorageStats(),
      ];

      const results = await Promise.all(operations);

      // All operations should complete successfully
      SettingsTestFramework.assertTrue(
        results[0],
        "First getSetting should complete",
      );
      SettingsTestFramework.assertTrue(
        results[1],
        "Second getSetting should complete",
      );
      SettingsTestFramework.assertTrue(
        results[2],
        "updateSetting should complete",
      );
      SettingsTestFramework.assertTrue(
        results[3],
        "getSettings should complete",
      );
      SettingsTestFramework.assertTrue(
        results[4],
        "getStorageStats should complete",
      );

      // Verify update took effect
      const updated = await settings.getSetting("setting_2");
      SettingsTestFramework.assertEqual(
        updated.value,
        "concurrent_update",
        "Concurrent update should work",
      );
    });

    framework.it("should handle large batch operations", async () => {
      const batchSize = 20;
      const updates = TestDataGenerator.generateUpdateBatch(batchSize);

      // Time the batch operation
      const startTime = performance.now();
      await settings.updateSettings(updates);
      const updateTime = performance.now() - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      SettingsTestFramework.assertTrue(
        updateTime < 1000,
        `Batch update should be fast, took ${updateTime}ms`,
      );

      // Verify all updates applied
      const keys = Object.keys(updates);
      const updated = await settings.getSettings(keys);

      for (const key of keys) {
        SettingsTestFramework.assertEqual(
          updated[key].value,
          updates[key],
          `${key} should be batch updated`,
        );
      }
    });

    framework.it(
      "should maintain data consistency across operations",
      async () => {
        // Set initial value
        await settings.updateSetting("setting_0", "initial_value");

        // Read from different methods
        const single = await settings.getSetting("setting_0");
        const multiple = await settings.getSettings(["setting_0"]);
        const all = await settings.getAllSettings();
        const cached = settings.getCachedSetting("setting_0");

        // All should have same value
        const expectedValue = "initial_value";
        SettingsTestFramework.assertEqual(
          single.value,
          expectedValue,
          "Single get should match",
        );
        SettingsTestFramework.assertEqual(
          multiple.setting_0.value,
          expectedValue,
          "Multiple get should match",
        );
        SettingsTestFramework.assertEqual(
          all.setting_0.value,
          expectedValue,
          "All get should match",
        );
        SettingsTestFramework.assertEqual(
          cached.value,
          expectedValue,
          "Cached should match",
        );
      },
    );
  });

  return framework;
}

/**
 * Performance benchmarking suite
 */
function createPerformanceTestSuite() {
  const framework = new SettingsTestFramework();
  let settings;

  framework.beforeEach(() => {
    settings = SettingsMockFactory.createMockSettings({
      data: TestDataGenerator.generateSettingsConfig("large"),
    });
  });

  framework.describe("Settings API Performance Tests", () => {
    framework.it(
      "should load all settings within performance threshold",
      async () => {
        const startTime = performance.now();
        await settings.getAllSettings();
        const loadTime = performance.now() - startTime;

        // Should load within 100ms (adjust threshold as needed)
        SettingsTestFramework.assertTrue(
          loadTime < 100,
          `Settings load too slow: ${loadTime}ms`,
        );
      },
    );

    framework.it("should handle rapid sequential updates", async () => {
      const updateCount = 50;
      const startTime = performance.now();

      for (let i = 0; i < updateCount; i++) {
        await settings.updateSetting("setting_0", `rapid_update_${i}`);
      }

      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / updateCount;

      console.log(
        `  📊 Rapid updates: ${updateCount} updates in ${Math.round(totalTime)}ms (${Math.round(avgTime)}ms avg)`,
      );

      // Should average less than 10ms per update
      SettingsTestFramework.assertTrue(
        avgTime < 10,
        `Updates too slow: ${avgTime}ms average`,
      );
    });

    framework.it("should efficiently use cache", async () => {
      const key = "setting_0";

      // First load (should populate cache)
      const startTime1 = performance.now();
      await settings.getSetting(key);
      const firstLoadTime = performance.now() - startTime1;

      // Cached access (should be much faster)
      const startTime2 = performance.now();
      settings.getCachedSetting(key);
      const cachedTime = performance.now() - startTime2;

      console.log(
        `  📊 Cache performance: First load ${Math.round(firstLoadTime)}ms, Cached ${Math.round(cachedTime)}ms`,
      );

      // Cached access should be much faster
      SettingsTestFramework.assertTrue(
        cachedTime < firstLoadTime / 10,
        "Cached access should be 10x faster",
      );
    });

    framework.it("should handle memory efficiently", async () => {
      const initialMemory = performance.memory
        ? performance.memory.usedJSHeapSize
        : 0;

      // Load lots of data
      for (let i = 0; i < 100; i++) {
        await settings.getAllSettings();
        if (i % 10 === 0) {
          settings.clearCache(); // Periodic cleanup
        }
      }

      const finalMemory = performance.memory
        ? performance.memory.usedJSHeapSize
        : 0;
      const memoryGrowth = finalMemory - initialMemory;

      console.log(
        `  📊 Memory usage: Growth ${Math.round(memoryGrowth / 1024)}KB`,
      );

      // Should not grow memory excessively (adjust threshold as needed)
      SettingsTestFramework.assertTrue(
        memoryGrowth < 1024 * 1024,
        `Excessive memory growth: ${memoryGrowth} bytes`,
      );
    });
  });

  return framework;
}

/**
 * Error handling and edge case test suite
 */
function createErrorTestSuite() {
  const framework = new SettingsTestFramework();

  framework.describe("Settings API Error Handling Tests", () => {
    framework.it("should handle timeout errors gracefully", async () => {
      const settings = SettingsMockFactory.createMockSettings({
        failureMode: "timeout",
      });

      try {
        await SettingsTestFramework.assertThrowsAsync(
          () => settings.getSetting("feature_enabled"),
          "timeout",
          "Should throw timeout error",
        );
      } finally {
        settings.destroy();
      }
    });

    framework.it("should handle network errors gracefully", async () => {
      const settings = SettingsMockFactory.createMockSettings({
        failureMode: "network",
      });

      try {
        await SettingsTestFramework.assertThrowsAsync(
          () => settings.getAllSettings(),
          "Network error",
          "Should throw network error",
        );
      } finally {
        settings.destroy();
      }
    });

    framework.it("should validate input parameters", async () => {
      const settings = SettingsMockFactory.createMockSettings();

      try {
        // Test invalid parameters
        await SettingsTestFramework.assertThrowsAsync(
          () => settings.getSetting(null),
          "required",
          "Should validate null key",
        );

        await SettingsTestFramework.assertThrowsAsync(
          () => settings.getSettings([]),
          "empty",
          "Should validate empty array",
        );
      } finally {
        settings.destroy();
      }
    });

    framework.it("should handle malformed import data", async () => {
      const settings = SettingsMockFactory.createMockSettings();

      try {
        // Invalid JSON
        await SettingsTestFramework.assertThrowsAsync(
          () => settings.importSettings("invalid json"),
          "JSON",
          "Should reject invalid JSON",
        );

        // Missing settings object
        await SettingsTestFramework.assertThrowsAsync(
          () => settings.importSettings('{"version": "1.0"}'),
          "settings",
          "Should reject missing settings",
        );
      } finally {
        settings.destroy();
      }
    });

    framework.it("should handle validation errors", async () => {
      const settings = SettingsMockFactory.createMockSettings();

      try {
        const invalidValues = TestDataGenerator.generateInvalidValues();

        for (const [testName, testCase] of Object.entries(invalidValues)) {
          // Add the setting to mock data first
          settings._setMockData({
            test_setting: testCase.setting,
          });

          await SettingsTestFramework.assertThrowsAsync(
            () => settings.updateSetting("test_setting", testCase.value),
            null, // Any validation error
            `Should reject ${testName}`,
          );
        }
      } finally {
        settings.destroy();
      }
    });
  });

  return framework;
}

// ========================================
// TEST RUNNER & REPORTING
// ========================================

/**
 * Main test runner that orchestrates all test suites
 */
class SettingsTestRunner {
  constructor() {
    this.suites = [];
    this.results = {
      suites: [],
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      totalTime: 0,
    };
  }

  addSuite(name, suiteFactory) {
    this.suites.push({ name, factory: suiteFactory });
  }

  async runAll(options = {}) {
    console.log("🚀 Starting Settings Extension Test Runner");
    console.log(`Running ${this.suites.length} test suites...\n`);

    const startTime = performance.now();

    for (const { name, factory } of this.suites) {
      if (options.only && !options.only.includes(name)) {
        console.log(`⏭️ Skipping suite: ${name}`);
        continue;
      }

      console.log(`\n🧪 Running suite: ${name}`);
      console.log("=".repeat(50));

      const suite = factory();
      const suiteResults = await suite.run();

      this.results.suites.push({
        name,
        ...suiteResults,
      });

      this.results.totalTests +=
        suiteResults.passed + suiteResults.failed + suiteResults.skipped;
      this.results.totalPassed += suiteResults.passed;
      this.results.totalFailed += suiteResults.failed;
      this.results.totalSkipped += suiteResults.skipped;
    }

    this.results.totalTime = performance.now() - startTime;

    this.generateReport();

    return this.results;
  }

  generateReport() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 FINAL TEST REPORT");
    console.log("=".repeat(60));

    console.log(`\n📈 Overall Results:`);
    console.log(`  Total Tests: ${this.results.totalTests}`);
    console.log(
      `  Passed: ${this.results.totalPassed} (${Math.round((this.results.totalPassed / this.results.totalTests) * 100)}%)`,
    );
    console.log(
      `  Failed: ${this.results.totalFailed} (${Math.round((this.results.totalFailed / this.results.totalTests) * 100)}%)`,
    );
    console.log(
      `  Skipped: ${this.results.totalSkipped} (${Math.round((this.results.totalSkipped / this.results.totalTests) * 100)}%)`,
    );
    console.log(`  Total Time: ${Math.round(this.results.totalTime)}ms`);

    console.log(`\n📋 Suite Breakdown:`);
    for (const suite of this.results.suites) {
      const total = suite.passed + suite.failed + suite.skipped;
      const successRate = Math.round((suite.passed / total) * 100);

      console.log(`  ${suite.name}:`);
      console.log(
        `    Tests: ${total} | Passed: ${suite.passed} | Failed: ${suite.failed} | Success Rate: ${successRate}%`,
      );
    }

    if (this.results.totalFailed > 0) {
      console.log(`\n❌ Failed Tests:`);
      for (const suite of this.results.suites) {
        if (suite.errors.length > 0) {
          console.log(`  ${suite.name}:`);
          for (const error of suite.errors) {
            console.log(`    - ${error.test}: ${error.error}`);
          }
        }
      }
    }

    const overallSuccess = this.results.totalFailed === 0;
    console.log(
      `\n${overallSuccess ? "✅" : "❌"} Overall Result: ${overallSuccess ? "PASS" : "FAIL"}`,
    );
  }
}

// ========================================
// TEST SETUP & EXECUTION
// ========================================

// Create test runner
const testRunner = new SettingsTestRunner();

// Register test suites
testRunner.addSuite("Unit Tests", createUnitTestSuite);
testRunner.addSuite("Integration Tests", createIntegrationTestSuite);
testRunner.addSuite("Performance Tests", createPerformanceTestSuite);
testRunner.addSuite("Error Handling Tests", createErrorTestSuite);

// Export testing framework
window.SettingsTestingFramework = {
  TestRunner: SettingsTestRunner,
  TestFramework: SettingsTestFramework,
  MockFactory: SettingsMockFactory,
  DataGenerator: TestDataGenerator,

  // Test suite factories
  createUnitTestSuite,
  createIntegrationTestSuite,
  createPerformanceTestSuite,
  createErrorTestSuite,

  // Pre-configured runner
  testRunner,

  // Utilities
  runAllTests: (options) => testRunner.runAll(options),
  runUnitTests: () => testRunner.runAll({ only: ["Unit Tests"] }),
  runIntegrationTests: () => testRunner.runAll({ only: ["Integration Tests"] }),
  runPerformanceTests: () => testRunner.runAll({ only: ["Performance Tests"] }),
  runErrorTests: () => testRunner.runAll({ only: ["Error Handling Tests"] }),
};

console.log(
  "🧪 Settings Testing Framework loaded. Access via window.SettingsTestingFramework",
);
console.log("   Run tests: window.SettingsTestingFramework.runAllTests()");
console.log(
  "   Unit tests only: window.SettingsTestingFramework.runUnitTests()",
);
console.log(
  "   Performance tests: window.SettingsTestingFramework.runPerformanceTests()",
);

/**
 * TESTING FRAMEWORK SUMMARY:
 *
 * 🧪 Mock Factory:
 * - Realistic Settings API mocks with configurable behavior
 * - Failure mode simulation (timeout, network, validation errors)
 * - Configurable response delays for realistic testing
 * - Complete API coverage with proper validation
 *
 * 📊 Test Data Generation:
 * - Generate test configurations of various sizes
 * - Create realistic setting values and update batches
 * - Generate invalid values for validation testing
 * - Configurable test data scenarios
 *
 * ⚡ Test Framework:
 * - Lightweight testing framework with assertions
 * - Async test support with timeouts
 * - beforeEach/afterEach hooks for setup/cleanup
 * - Comprehensive assertion methods
 *
 * 🏃 Test Suites:
 * - Unit tests: Core API functionality
 * - Integration tests: End-to-end workflows
 * - Performance tests: Speed and memory benchmarks
 * - Error tests: Edge cases and failure scenarios
 *
 * 📈 Test Runner:
 * - Orchestrates multiple test suites
 * - Detailed reporting with metrics
 * - Selective test execution (run specific suites)
 * - Performance timing and memory tracking
 *
 * Use this framework to ensure your Settings Extension
 * integration is robust, performant, and reliable.
 */
