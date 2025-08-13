/**
 * Unit tests for SettingsManager
 * Tests CRUD operations, validation, and storage integration
 */

const {
  createMockStorage,
  generateTestSettings,
  testPerformance,
} = require("./utils/test-helpers");

// Set up browser globals before importing modules
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      getBytesInUse: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      getBytesInUse: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  runtime: {
    getURL: jest.fn(),
    lastError: null,
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
};

global.browser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      getBytesInUse: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      getBytesInUse: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  runtime: {
    getURL: jest.fn(),
    lastError: null,
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
};

// Mock fetch to prevent network requests in tests
global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

const SettingsManager = require("../lib/settings-manager"); // eslint-disable-line no-unused-vars

describe("SettingsManager", () => {
  let mockStorage;
  let settingsManager;
  let testSettings;
  let originalFetch;

  beforeEach(() => {
    mockStorage = createMockStorage();
    testSettings = generateTestSettings();

    // Replace browser storage with our mock
    Object.assign(global.chrome.storage.local, mockStorage);
    Object.assign(global.chrome.storage.sync, mockStorage);
    Object.assign(global.browser.storage.local, mockStorage);
    Object.assign(global.browser.storage.sync, mockStorage);

    // Mock fetch for loading defaults
    originalFetch = global.fetch;
    global.fetch = jest.fn();

    // Clear require cache to get fresh instances
    delete require.cache[require.resolve("../lib/browser-compat")];
    delete require.cache[require.resolve("../lib/settings-manager")];

    // Mock browserAPI after clearing cache
    const browserAPI = require("../lib/browser-compat");
    browserAPI.runtime = {
      getURL: jest.fn((path) => `chrome-extension://test/${path}`),
    };
    browserAPI.storage = {
      local: mockStorage,
      sync: mockStorage,
    };

    // Clear any previous mocks
    jest.clearAllMocks();

    const SettingsManager = require("../lib/settings-manager");
    settingsManager = new SettingsManager();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (settingsManager) {
      settingsManager.destroy();
    }
  });

  describe("Initialization", () => {
    test("should initialize with default settings", async () => {
      // Mock successful defaults loading
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(testSettings),
      });

      await settingsManager.initialize();

      expect(settingsManager.initialized).toBe(true);
      expect(settingsManager.settings.size).toBe(
        Object.keys(testSettings).length,
      );
      expect(settingsManager.settings.get("testBoolean")).toEqual(
        testSettings.testBoolean,
      );
    });

    test("should handle missing default settings file", async () => {
      // Mock fetch failure
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      await settingsManager.initialize();

      // Should fallback to embedded defaults
      expect(settingsManager.initialized).toBe(true);
      expect(settingsManager.settings.size).toBeGreaterThan(0);
      expect(settingsManager.settings.has("feature_enabled")).toBe(true);
    });
  });

  describe("CRUD Operations", () => {
    describe("Create/Set Settings", () => {
      beforeEach(async () => {
        // Initialize with test settings
        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(testSettings),
        });
        await settingsManager.initialize();
      });

      test("should update boolean setting", async () => {
        // Mock successful defaults loading
        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(testSettings),
        });
        await settingsManager.initialize();

        // Verify initial value
        let setting = await settingsManager.getSetting("testBoolean");
        expect(setting.value).toBe(true);

        // Update value
        await settingsManager.updateSetting("testBoolean", false);

        // Verify updated value
        setting = await settingsManager.getSetting("testBoolean");
        expect(setting.value).toBe(false);
      });

      test("should update text setting", async () => {
        const newValue = "new text value";
        await settingsManager.updateSetting("testText", newValue);

        const setting = await settingsManager.getSetting("testText");
        expect(setting.value).toBe(newValue);
      });

      test("should update longtext setting", async () => {
        const newValue = "This is a new longer text value for testing";
        await settingsManager.updateSetting("testLongText", newValue);

        const setting = await settingsManager.getSetting("testLongText");
        expect(setting.value).toBe(newValue);
      });

      test("should update number setting", async () => {
        const newValue = 75;
        await settingsManager.updateSetting("testNumber", newValue);

        const setting = await settingsManager.getSetting("testNumber");
        expect(setting.value).toBe(newValue);
      });

      test("should update json setting", async () => {
        const newValue = { updated: true, count: 5 };
        await settingsManager.updateSetting("testJson", newValue);

        const setting = await settingsManager.getSetting("testJson");
        expect(setting.value).toEqual(newValue);
      });

      test("should reject updates to non-existent settings", async () => {
        await expect(
          settingsManager.updateSetting("nonExistent", "value"),
        ).rejects.toThrow("Setting 'nonExistent' not found");
      });
    });

    describe("Read Settings", () => {
      beforeEach(async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(testSettings),
        });
        await settingsManager.initialize();
      });

      test("should retrieve single setting by key", async () => {
        const setting = await settingsManager.getSetting("testBoolean");

        expect(setting).toEqual(testSettings.testBoolean);
        expect(setting.type).toBe("boolean");
        expect(setting.value).toBe(true);
      });

      test("should retrieve multiple settings by keys", async () => {
        const keys = ["testBoolean", "testText", "testNumber"];
        const settings = await settingsManager.getSettings(keys);

        expect(Object.keys(settings)).toHaveLength(3);
        expect(settings.testBoolean).toEqual(testSettings.testBoolean);
        expect(settings.testText).toEqual(testSettings.testText);
        expect(settings.testNumber).toEqual(testSettings.testNumber);
      });

      test("should retrieve all settings", async () => {
        const allSettings = await settingsManager.getAllSettings();

        expect(Object.keys(allSettings)).toHaveLength(
          Object.keys(testSettings).length,
        );
        expect(allSettings.testBoolean).toEqual(testSettings.testBoolean);
        expect(allSettings.testJson).toEqual(testSettings.testJson);
      });

      test("should throw error for non-existent setting", async () => {
        await expect(settingsManager.getSetting("nonExistent")).rejects.toThrow(
          "Setting 'nonExistent' not found",
        );
      });
    });

    describe("Update Settings", () => {
      beforeEach(async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(testSettings),
        });
        await settingsManager.initialize();
      });

      test("should update existing setting value", async () => {
        // Mock successful defaults loading
        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(testSettings),
        });
        await settingsManager.initialize();

        const newValue = "updated text";
        await settingsManager.updateSetting("testText", newValue);

        const setting = await settingsManager.getSetting("testText");
        expect(setting.value).toBe(newValue);
      });

      test("should update multiple settings at once", async () => {
        const updates = {
          testBoolean: false,
          testNumber: 99,
          testText: "bulk update",
        };

        await settingsManager.updateSettings(updates);

        const booleanSetting = await settingsManager.getSetting("testBoolean");
        const numberSetting = await settingsManager.getSetting("testNumber");
        const textSetting = await settingsManager.getSetting("testText");

        expect(booleanSetting.value).toBe(false);
        expect(numberSetting.value).toBe(99);
        expect(textSetting.value).toBe("bulk update");
      });

      test("should validate before updating", async () => {
        // Test type validation
        await expect(
          settingsManager.updateSetting("testBoolean", "not a boolean"),
        ).rejects.toThrow("must be a boolean");

        await expect(
          settingsManager.updateSetting("testNumber", "not a number"),
        ).rejects.toThrow("must be a valid number");
      });

      test("should reject invalid updates", async () => {
        // Test constraint validation
        await expect(settingsManager.updateSetting("testNumber", 150)) // max is 100
          .rejects.toThrow("must be at most 100");

        await expect(settingsManager.updateSetting("testNumber", -5)) // min is 0
          .rejects.toThrow("must be at least 0");
      });
    });

    describe("Delete Settings", () => {
      beforeEach(async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(testSettings),
        });
        await settingsManager.initialize();
      });

      test("should reset all settings to defaults", async () => {
        // First update a setting
        await settingsManager.updateSetting("testBoolean", false);
        let setting = await settingsManager.getSetting("testBoolean");
        expect(setting.value).toBe(false);

        // Reset to defaults
        await settingsManager.resetToDefaults();

        // Should be back to default value
        setting = await settingsManager.getSetting("testBoolean");
        expect(setting.value).toBe(true); // original default
        expect(mockStorage.clear).toHaveBeenCalled();
      });

      test("should handle reset errors gracefully", async () => {
        // Mock storage clear failure
        mockStorage.clear.mockRejectedValue(new Error("Storage error"));

        await expect(settingsManager.resetToDefaults()).rejects.toThrow(
          "Storage error",
        );
      });
    });
  });

  describe("Validation", () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(testSettings),
      });
      await settingsManager.initialize();
    });

    test("should validate boolean settings", () => {
      const booleanSetting = { type: "boolean", description: "Test boolean" };

      expect(() =>
        settingsManager.validateSetting(booleanSetting, true),
      ).not.toThrow();
      expect(() =>
        settingsManager.validateSetting(booleanSetting, false),
      ).not.toThrow();
      expect(() =>
        settingsManager.validateSetting(booleanSetting, "true"),
      ).toThrow("must be a boolean");
      expect(() => settingsManager.validateSetting(booleanSetting, 1)).toThrow(
        "must be a boolean",
      );
    });

    test("should validate text settings with length constraints", () => {
      const textSetting = {
        type: "text",
        description: "Test text",
        maxLength: 10,
      };

      expect(() =>
        settingsManager.validateSetting(textSetting, "short"),
      ).not.toThrow();
      expect(() =>
        settingsManager.validateSetting(textSetting, ""),
      ).not.toThrow();
      expect(() =>
        settingsManager.validateSetting(textSetting, "this is too long"),
      ).toThrow("exceeds maximum length of 10");
      expect(() => settingsManager.validateSetting(textSetting, 123)).toThrow(
        "must be a string",
      );
    });

    test("should validate longtext settings with length constraints", () => {
      const longTextSetting = {
        type: "longtext",
        description: "Test longtext",
        maxLength: 50,
      };

      expect(() =>
        settingsManager.validateSetting(longTextSetting, "acceptable length"),
      ).not.toThrow();
      expect(() =>
        settingsManager.validateSetting(longTextSetting, "x".repeat(51)),
      ).toThrow("exceeds maximum length of 50");
    });

    test("should validate number settings with min/max constraints", () => {
      const numberSetting = {
        type: "number",
        description: "Test number",
        min: 0,
        max: 100,
      };

      expect(() =>
        settingsManager.validateSetting(numberSetting, 50),
      ).not.toThrow();
      expect(() =>
        settingsManager.validateSetting(numberSetting, 0),
      ).not.toThrow();
      expect(() =>
        settingsManager.validateSetting(numberSetting, 100),
      ).not.toThrow();
      expect(() => settingsManager.validateSetting(numberSetting, -1)).toThrow(
        "must be at least 0",
      );
      expect(() => settingsManager.validateSetting(numberSetting, 101)).toThrow(
        "must be at most 100",
      );
      expect(() =>
        settingsManager.validateSetting(numberSetting, "not a number"),
      ).toThrow("must be a valid number");
      expect(() => settingsManager.validateSetting(numberSetting, NaN)).toThrow(
        "must be a valid number",
      );
    });

    test("should validate JSON settings", () => {
      const jsonSetting = { type: "json", description: "Test JSON" };

      expect(() =>
        settingsManager.validateSetting(jsonSetting, { key: "value" }),
      ).not.toThrow();
      expect(() =>
        settingsManager.validateSetting(jsonSetting, []),
      ).not.toThrow();
      expect(() => settingsManager.validateSetting(jsonSetting, null)).toThrow(
        "must be a valid object",
      );
      expect(() =>
        settingsManager.validateSetting(jsonSetting, "string"),
      ).toThrow("must be a valid object");

      // Test circular reference detection
      const circular = { self: null };
      circular.self = circular;
      expect(() =>
        settingsManager.validateSetting(jsonSetting, circular),
      ).toThrow("circular references");
    });

    test("should reject invalid setting types", () => {
      const invalidSetting = { type: "invalid", description: "Invalid type" };

      expect(() =>
        settingsManager.validateSetting(invalidSetting, "value"),
      ).toThrow("Unknown setting type: invalid");
    });
  });

  describe("Storage Integration", () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(testSettings),
      });
    });

    test("should use local storage for persistence", async () => {
      expect(mockStorage.get).toBeDefined();
      expect(mockStorage.set).toBeDefined();

      await settingsManager.initialize();
      await settingsManager.updateSetting("testBoolean", false);

      expect(mockStorage.set).toHaveBeenCalled();
    });

    test("should use sync storage for synchronization", async () => {
      settingsManager.setStorageArea("sync");
      expect(settingsManager.storageArea).toBe("sync");

      await settingsManager.initialize();
      await settingsManager.updateSetting("testText", "sync test");

      expect(mockStorage.set).toHaveBeenCalled();
    });

    test("should handle storage errors gracefully", async () => {
      mockStorage.get.mockRejectedValue(new Error("Storage error"));

      // Should still initialize with embedded defaults
      await settingsManager.initialize();
      expect(settingsManager.initialized).toBe(true);
    });

    test("should validate storage area selection", () => {
      expect(() => settingsManager.setStorageArea("invalid")).toThrow(
        'Storage area must be "local" or "sync"',
      );

      expect(() => settingsManager.setStorageArea("local")).not.toThrow();
      expect(() => settingsManager.setStorageArea("sync")).not.toThrow();
    });
  });

  describe("Import/Export", () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(testSettings),
      });
      await settingsManager.initialize();
    });

    test("should export settings to JSON", async () => {
      const exportData = await settingsManager.exportSettings();
      const parsed = JSON.parse(exportData);

      expect(parsed.version).toBe("1.0");
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.settings).toBeDefined();
      expect(parsed.settings.testBoolean).toEqual(testSettings.testBoolean);
    });

    test("should import valid settings", async () => {
      const importData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        settings: {
          testBoolean: { ...testSettings.testBoolean, value: false },
          testText: { ...testSettings.testText, value: "imported value" },
        },
      };

      await settingsManager.importSettings(JSON.stringify(importData));

      const boolSetting = await settingsManager.getSetting("testBoolean");
      const textSetting = await settingsManager.getSetting("testText");

      expect(boolSetting.value).toBe(false);
      expect(textSetting.value).toBe("imported value");
    });

    test("should reject invalid JSON import", async () => {
      await expect(
        settingsManager.importSettings("invalid json"),
      ).rejects.toThrow("Invalid JSON format");
    });

    test("should reject import without settings object", async () => {
      const invalidData = { version: "1.0" };

      await expect(
        settingsManager.importSettings(JSON.stringify(invalidData)),
      ).rejects.toThrow("missing settings object");
    });
  });

  describe("Performance", () => {
    test("should load settings within 100ms", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(testSettings),
      });

      const result = await testPerformance(async () => {
        await settingsManager.initialize();
      }, 100);

      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(100);
    });

    test("should save settings within 100ms", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(testSettings),
      });

      await settingsManager.initialize();

      const result = await testPerformance(async () => {
        await settingsManager.updateSetting("testBoolean", false);
      }, 100);

      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(100);
    });
  });

  describe("Error Handling", () => {
    test("should handle storage access errors", async () => {
      mockStorage.set.mockRejectedValue(new Error("Permission denied"));

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(testSettings),
      });

      await settingsManager.initialize();

      await expect(
        settingsManager.updateSetting("testBoolean", false),
      ).rejects.toThrow("Permission denied");
    });

    test("should handle malformed settings data", async () => {
      const malformedSettings = {
        badSetting: {
          /* missing type and value */
        },
        incompleteSetting: { type: "boolean" /* missing value */ },
      };

      await expect(
        settingsManager.importSettings(
          JSON.stringify({ settings: malformedSettings }),
        ),
      ).rejects.toThrow("No valid settings found");
    });

    test("should provide meaningful error messages", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(testSettings),
      });

      await settingsManager.initialize();

      await expect(settingsManager.getSetting("nonExistent")).rejects.toThrow(
        "Setting 'nonExistent' not found",
      );

      await expect(
        settingsManager.updateSetting("testNumber", 150),
      ).rejects.toThrow("must be at most 100");
    });

    test("should implement fallback mechanisms", async () => {
      // Mock fetch failure
      global.fetch.mockRejectedValue(new Error("Network error"));

      // Should fallback to embedded defaults
      await settingsManager.initialize();

      expect(settingsManager.initialized).toBe(true);
      expect(settingsManager.settings.has("feature_enabled")).toBe(true);
    });
  });

  describe("Event System", () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(testSettings),
      });
      await settingsManager.initialize();
    });

    test("should emit events on setting changes", async () => {
      const listener = jest.fn();
      settingsManager.addListener(listener);

      await settingsManager.updateSetting("testBoolean", false);

      expect(listener).toHaveBeenCalledWith(
        "updated",
        expect.objectContaining({
          key: "testBoolean",
          value: false,
        }),
      );
    });

    test("should support event listeners", () => {
      const listener = jest.fn();

      expect(() => settingsManager.addListener(listener)).not.toThrow();
      expect(settingsManager.listeners.has(listener)).toBe(true);

      expect(() => settingsManager.addListener("not a function")).toThrow(
        "Callback must be a function",
      );
    });

    test("should clean up event listeners", () => {
      const listener = jest.fn();

      settingsManager.addListener(listener);
      expect(settingsManager.listeners.has(listener)).toBe(true);

      settingsManager.removeListener(listener);
      expect(settingsManager.listeners.has(listener)).toBe(false);

      // Test destroy cleanup
      settingsManager.addListener(listener);
      settingsManager.destroy();
      expect(settingsManager.listeners.size).toBe(0);
    });
  });
});
