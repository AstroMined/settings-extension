// Basic Functionality Tests for Settings Extension
// Tests concurrent access patterns and storage operations

// Mock browserAPI for testing
const browserAPI = {
  storage: {
    local: {
      data: {},
      get: function (key) {
        if (Array.isArray(key)) {
          const result = {};
          key.forEach((k) => {
            if (Object.prototype.hasOwnProperty.call(this.data, k)) {
              result[k] = this.data[k];
            }
          });
          return Promise.resolve(result);
        }
        return Promise.resolve(key ? { [key]: this.data[key] } : this.data);
      },
      set: function (items) {
        Object.assign(this.data, items);
        return Promise.resolve();
      },
      remove: function (keys) {
        if (Array.isArray(keys)) {
          keys.forEach((key) => delete this.data[key]);
        } else {
          delete this.data[keys];
        }
        return Promise.resolve();
      },
      clear: function () {
        this.data = {};
        return Promise.resolve();
      },
    },
  },
  runtime: {
    getURL: (path) => `chrome-extension://test/${path}`,
  },
};

// Mock fetch for configuration loading
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        test_setting: {
          type: "boolean",
          value: true,
          description: "Test setting",
        },
      }),
  }),
);

// Simplified popup class for testing basic functionality
class TestPopup {
  constructor() {
    this.settings = new Map();
  }

  async loadSettingsFromStorage() {
    try {
      const storageResult = await browserAPI.storage.local.get("settings");

      if (
        storageResult.settings &&
        this.validateStorageSettings(storageResult.settings)
      ) {
        return new Map(Object.entries(storageResult.settings));
      }

      // No valid settings found, initialize with defaults
      const defaultSettings = {
        test_setting: {
          type: "boolean",
          value: true,
          description: "Test setting",
        },
      };
      await browserAPI.storage.local.set({ settings: defaultSettings });
      return new Map(Object.entries(defaultSettings));
    } catch (error) {
      console.error("Storage fallback failed:", error);
      return null;
    }
  }

  validateStorageSettings(settings) {
    if (!settings || typeof settings !== "object") {
      return false;
    }

    const keys = Object.keys(settings);
    if (keys.length === 0) {
      return false;
    }

    // Validate at least one setting has proper structure
    for (const key of keys) {
      const setting = settings[key];
      if (
        setting &&
        typeof setting === "object" &&
        "type" in setting &&
        "value" in setting
      ) {
        return true; // At least one valid setting found
      }
    }

    return false;
  }
}

describe("Basic Functionality Tests", () => {
  beforeEach(() => {
    browserAPI.storage.local.clear();
    jest.clearAllMocks();
  });

  describe("Storage Operations", () => {
    test("should load settings from storage successfully", async () => {
      const popup = new TestPopup();

      // Load settings (should initialize with defaults)
      const settings = await popup.loadSettingsFromStorage();

      expect(settings).toBeInstanceOf(Map);
      expect(settings.has("test_setting")).toBe(true);
      expect(settings.get("test_setting").value).toBe(true);
    });

    test("should handle multiple popup instances loading settings concurrently", async () => {
      // Create multiple popup instances
      const popups = Array.from({ length: 5 }, () => new TestPopup());

      // Load settings concurrently
      const promises = popups.map((popup) => popup.loadSettingsFromStorage());
      const results = await Promise.all(promises);

      // All should succeed and return valid settings
      results.forEach((settings) => {
        expect(settings).toBeInstanceOf(Map);
        expect(settings.has("test_setting")).toBe(true);
      });

      // Verify settings were properly initialized in storage
      const storageData = await browserAPI.storage.local.get("settings");
      expect(storageData.settings).toBeDefined();
      expect(storageData.settings.test_setting).toBeDefined();
    });

    test("should validate storage settings correctly", async () => {
      const popup = new TestPopup();

      // Test with valid settings
      const validSettings = {
        test_setting: { type: "boolean", value: true, description: "Test" },
      };
      expect(popup.validateStorageSettings(validSettings)).toBe(true);

      // Test with invalid settings
      expect(popup.validateStorageSettings(null)).toBe(false);
      expect(popup.validateStorageSettings({})).toBe(false);
      expect(popup.validateStorageSettings({ invalid: "data" })).toBe(false);
    });

    test("should handle storage errors gracefully", async () => {
      const popup = new TestPopup();

      // Mock storage to fail
      const originalGet = browserAPI.storage.local.get;
      browserAPI.storage.local.get = jest
        .fn()
        .mockRejectedValue(new Error("Storage error"));

      // Should handle error gracefully
      const settings = await popup.loadSettingsFromStorage();
      expect(settings).toBeNull();

      // Restore original implementation
      browserAPI.storage.local.get = originalGet;
    });
  });

  describe("Performance", () => {
    test("settings loading should complete within performance targets", async () => {
      const popup = new TestPopup();

      const startTime = Date.now();
      const settings = await popup.loadSettingsFromStorage();
      const endTime = Date.now();

      expect(settings).toBeInstanceOf(Map);
      expect(endTime - startTime).toBeLessThan(500); // Should meet 500ms target
    });

    test("should handle rapid successive settings loading attempts", async () => {
      const popup = new TestPopup();

      // Rapidly load settings multiple times
      const promises = Array.from({ length: 10 }, () =>
        popup.loadSettingsFromStorage(),
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(10);
      results.forEach((settings) => {
        expect(settings).toBeInstanceOf(Map);
      });
    });
  });
});
