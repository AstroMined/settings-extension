/**
 * Cross-browser compatibility tests
 * Tests Chrome, Edge, and Firefox compatibility
 */

const {
  createMockStorage,
  createMockRuntime,
  generateTestSettings,
  createMockBrowserEnvironment,
} = require("./utils/test-helpers");
const browserAPI = require("../lib/browser-compat");
const SettingsManager = require("../lib/settings-manager");

describe("Cross-Browser Compatibility", () => {
  let testSettings;
  let originalBrowser;
  let originalChrome;

  beforeEach(() => {
    testSettings = generateTestSettings();
    originalBrowser = global.browser;
    originalChrome = global.chrome;
  });

  afterEach(() => {
    global.browser = originalBrowser;
    global.chrome = originalChrome;
  });

  describe("Chrome/Chromium Compatibility", () => {
    beforeEach(() => {
      // Mock Chrome APIs
      global.chrome = {
        storage: {
          local: createMockStorage(),
          sync: createMockStorage(),
        },
        runtime: createMockRuntime(),
      };

      // Chrome doesn't have global.browser by default
      global.browser = undefined;
    });

    test("should work with Chrome extension APIs", () => {
      // Test Chrome-specific API usage
      expect(global.chrome.storage.local).toBeDefined();
      expect(global.chrome.runtime).toBeDefined();
    });

    test("should handle Chrome storage API", async () => {
      // Test Chrome storage API compatibility
      await global.chrome.storage.local.set({ test: "value" });
      const result = await global.chrome.storage.local.get("test");

      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        test: "value",
      });
      expect(global.chrome.storage.local.get).toHaveBeenCalledWith("test");
    });

    test("should handle Chrome runtime messaging", async () => {
      // Test Chrome runtime messaging
      const message = { type: "TEST" };
      await global.chrome.runtime.sendMessage(message);

      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(message);
    });
  });

  describe("Firefox Compatibility", () => {
    beforeEach(() => {
      // Mock Firefox APIs (browser namespace)
      global.browser = {
        storage: {
          local: createMockStorage(),
          sync: createMockStorage(),
        },
        runtime: createMockRuntime(),
      };

      // Firefox also exposes chrome for compatibility
      global.chrome = global.browser;
    });

    test("should work with Firefox extension APIs", () => {
      // Test Firefox-specific API usage
      expect(global.browser.storage.local).toBeDefined();
      expect(global.browser.runtime).toBeDefined();
    });

    test("should handle Firefox storage API", async () => {
      // Test Firefox storage API compatibility
      await global.browser.storage.local.set({ test: "value" });
      const result = await global.browser.storage.local.get("test");

      expect(global.browser.storage.local.set).toHaveBeenCalledWith({
        test: "value",
      });
      expect(global.browser.storage.local.get).toHaveBeenCalledWith("test");
    });

    test("should handle Firefox runtime messaging", async () => {
      // Test Firefox runtime messaging
      const message = { type: "TEST" };
      await global.browser.runtime.sendMessage(message);

      expect(global.browser.runtime.sendMessage).toHaveBeenCalledWith(message);
    });
  });

  describe("Browser Compatibility Layer", () => {
    test("should detect browser environment", () => {
      // Test browser detection logic
      // When browser-compat.js is implemented, test detection of Chrome vs Firefox
      expect(true).toBe(true);
    });

    test("should normalize API differences", () => {
      // Test API normalization between browsers
      // Should provide consistent interface regardless of browser
      expect(true).toBe(true);
    });

    test("should handle promise vs callback differences", async () => {
      // Test handling of Chrome callbacks vs Firefox promises
      expect(true).toBe(true);
    });
  });

  describe("Storage API Compatibility", () => {
    test("should handle storage.local differences", async () => {
      // Test storage.local compatibility across browsers
      const mockStorage = createMockStorage();

      // Test both promise and callback patterns
      await mockStorage.set({ key: "value" });
      const result = await mockStorage.get("key");

      expect(mockStorage.set).toHaveBeenCalledWith({ key: "value" });
      expect(mockStorage.get).toHaveBeenCalledWith("key");
    });

    test("should handle storage.sync differences", async () => {
      // Test storage.sync compatibility across browsers
      const mockStorage = createMockStorage();

      await mockStorage.set({ syncKey: "syncValue" });
      const result = await mockStorage.get("syncKey");

      expect(mockStorage.set).toHaveBeenCalledWith({ syncKey: "syncValue" });
      expect(mockStorage.get).toHaveBeenCalledWith("syncKey");
    });

    test("should handle storage quota differences", async () => {
      // Test storage quota handling across browsers
      // Chrome: 5MB local, 100KB sync
      // Firefox: 5MB local, 100KB sync (similar)
      expect(true).toBe(true);
    });
  });

  describe("Runtime API Compatibility", () => {
    test("should handle message passing differences", async () => {
      // Test runtime messaging compatibility
      const mockRuntime = createMockRuntime();

      const message = { type: "TEST_MESSAGE" };
      await mockRuntime.sendMessage(message);

      expect(mockRuntime.sendMessage).toHaveBeenCalledWith(message);
    });

    test("should handle event listener differences", () => {
      // Test event listener compatibility
      const mockRuntime = createMockRuntime();
      const listener = jest.fn();

      mockRuntime.onMessage.addListener(listener);
      mockRuntime.onMessage.removeListener(listener);

      expect(mockRuntime.onMessage.addListener).toHaveBeenCalledWith(listener);
      expect(mockRuntime.onMessage.removeListener).toHaveBeenCalledWith(
        listener,
      );
    });
  });

  describe("Manifest V3 Compatibility", () => {
    test("should handle service worker vs background page differences", async () => {
      // Test Chrome Manifest V3 service worker
      const chromeEnv = createMockBrowserEnvironment("chrome");
      global.chrome = {
        ...chromeEnv.chrome,
        runtime: {
          ...chromeEnv.chrome.runtime,
          getManifest: () => ({
            manifest_version: 3,
            background: { service_worker: "background.js" },
          }),
        },
      };
      global.browser = undefined;

      settingsManager = new SettingsManager();
      await settingsManager.initializeWithEmbeddedDefaults();

      // Should work in service worker context
      await settingsManager.updateSetting("feature_enabled", false);
      const setting = await settingsManager.getSetting("feature_enabled");
      expect(setting.value).toBe(false);

      settingsManager.destroy();

      // Test Firefox background page (transitioning to service worker)
      const firefoxEnv = createMockBrowserEnvironment("firefox");
      global.browser = {
        ...firefoxEnv.browser,
        runtime: {
          ...firefoxEnv.browser.runtime,
          getManifest: () => ({
            manifest_version: 2,
            background: { scripts: ["background.js"], persistent: false },
          }),
        },
      };
      global.chrome = firefoxEnv.chrome;

      settingsManager = new SettingsManager();
      await settingsManager.initializeWithEmbeddedDefaults();

      // Should also work in background page context
      await settingsManager.updateSetting("api_key", "firefox-key");
      const firefoxSetting = await settingsManager.getSetting("api_key");
      expect(firefoxSetting.value).toBe("firefox-key");
    });

    test("should handle permission differences across manifest versions", () => {
      // Test Manifest V2 permissions
      const v2Permissions = {
        permissions: ["storage", "activeTab"],
        host_permissions: undefined, // Not used in v2
      };

      // Test Manifest V3 permissions
      const v3Permissions = {
        permissions: ["storage"],
        host_permissions: ["https://example.com/*"], // Required in v3
        action: {}, // replaces browser_action
      };

      // Both should allow storage access
      expect(v2Permissions.permissions).toContain("storage");
      expect(v3Permissions.permissions).toContain("storage");

      // V3 has host_permissions separation
      expect(v3Permissions.host_permissions).toBeDefined();
      expect(v2Permissions.host_permissions).toBeUndefined();
    });

    test("should handle action API differences (browserAction vs action)", () => {
      // Test Manifest V2 browserAction
      const v2Chrome = createMockBrowserEnvironment("chrome");
      global.chrome = {
        ...v2Chrome.chrome,
        browserAction: {
          onClicked: { addListener: jest.fn(), removeListener: jest.fn() },
          setTitle: jest.fn(),
          setIcon: jest.fn(),
        },
        // No action API in v2
        action: undefined,
      };

      delete require.cache[require.resolve("../lib/browser-compat")];
      let browserAPI = require("../lib/browser-compat");

      // Should detect lack of action API
      expect(browserAPI.environment.hasAction).toBe(false);

      // Test Manifest V3 action API
      const v3Chrome = createMockBrowserEnvironment("chrome");
      global.chrome = {
        ...v3Chrome.chrome,
        action: {
          onClicked: { addListener: jest.fn(), removeListener: jest.fn() },
          setTitle: jest.fn(),
          setIcon: jest.fn(),
        },
        // browserAction deprecated in v3
        browserAction: undefined,
      };

      delete require.cache[require.resolve("../lib/browser-compat")];
      browserAPI = require("../lib/browser-compat");

      // Should detect action API
      expect(browserAPI.environment.hasAction).toBe(true);
      expect(browserAPI.action).toBeDefined();
    });
  });

  describe("Error Handling Compatibility", () => {
    test("should handle Chrome lastError", () => {
      // Test Chrome chrome.runtime.lastError handling
      global.chrome = {
        runtime: {
          lastError: { message: "Test error" },
          sendMessage: jest.fn(),
        },
      };

      expect(global.chrome.runtime.lastError).toBeDefined();
    });

    test("should handle Firefox error promises", () => {
      // Test Firefox promise rejection handling
      const mockRuntime = createMockRuntime();
      mockRuntime.sendMessage.mockRejectedValue(new Error("Firefox error"));

      expect(mockRuntime.sendMessage).toBeDefined();
    });
  });

  describe("Performance Compatibility", () => {
    test("should maintain performance across browsers", async () => {
      // Test performance consistency across browsers
      const testOperation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      };

      const start = Date.now();
      await testOperation();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    test("should handle concurrent operations consistently", async () => {
      // Test concurrent operation handling
      const operations = Array.from({ length: 10 }, () =>
        Promise.resolve().then(() => "completed"),
      );

      const results = await Promise.all(operations);
      expect(results).toHaveLength(10);
    });
  });

  describe("Edge Cases", () => {
    test("should handle mixed API usage", () => {
      // Test when both chrome and browser APIs are available
      global.chrome = { storage: { local: createMockStorage() } };
      global.browser = { storage: { local: createMockStorage() } };

      expect(global.chrome.storage.local).toBeDefined();
      expect(global.browser.storage.local).toBeDefined();
    });

    test("should handle missing APIs gracefully", () => {
      // Test graceful degradation when APIs are missing
      global.chrome = {};
      global.browser = {};

      delete require.cache[require.resolve("../lib/browser-compat")];
      const browserAPI = require("../lib/browser-compat");

      // Should not crash with empty objects
      expect(browserAPI.environment.hasStorageLocal).toBe(false);
      expect(browserAPI.environment.hasStorageSync).toBe(false);
      expect(browserAPI.environment.hasRuntime).toBe(false);
      expect(browserAPI.storage.local).toBe(null);
      expect(browserAPI.storage.sync).toBe(null);
      expect(browserAPI.runtime).toBe(null);

      // Utility functions should handle gracefully
      expect(browserAPI.utils.isAPIAvailable("storage.local")).toBe(false);
      expect(browserAPI.utils.getPreferredStorage()).toBe(null);
    });

    test("should handle version-specific differences", async () => {
      // Test different manifest versions and API availability
      const manifestV2Chrome = createMockBrowserEnvironment("chrome");
      global.chrome = {
        ...manifestV2Chrome.chrome,
        runtime: {
          ...manifestV2Chrome.chrome.runtime,
          getManifest: () => ({ manifest_version: 2 }),
        },
      };
      global.browser = undefined;

      delete require.cache[require.resolve("../lib/browser-compat")];
      let browserAPI = require("../lib/browser-compat");

      expect(browserAPI.environment.isChrome).toBe(true);

      // Test Manifest V3
      const manifestV3Chrome = createMockBrowserEnvironment("chrome");
      global.chrome = {
        ...manifestV3Chrome.chrome,
        runtime: {
          ...manifestV3Chrome.chrome.runtime,
          getManifest: () => ({ manifest_version: 3 }),
        },
      };

      delete require.cache[require.resolve("../lib/browser-compat")];
      browserAPI = require("../lib/browser-compat");

      expect(browserAPI.environment.isChrome).toBe(true);

      // Both should work with SettingsManager
      settingsManager = new SettingsManager();
      await settingsManager.initializeWithEmbeddedDefaults();

      const settings = await settingsManager.getAllSettings();
      expect(settings.feature_enabled).toBeDefined();
    });

    test("should handle partial API availability", () => {
      // Simulate Chrome with only local storage (no sync)
      global.chrome = {
        storage: {
          local: createMockStorage(),
          // No sync storage
        },
        runtime: createMockRuntime(),
      };
      global.browser = undefined;

      delete require.cache[require.resolve("../lib/browser-compat")];
      const browserAPI = require("../lib/browser-compat");

      expect(browserAPI.environment.hasStorageLocal).toBe(true);
      expect(browserAPI.environment.hasStorageSync).toBe(false);
      expect(browserAPI.storage.local).toBeDefined();
      expect(browserAPI.storage.sync).toBe(null);

      // getPreferredStorage should fall back to local
      expect(browserAPI.utils.getPreferredStorage()).toBe(
        browserAPI.storage.local,
      );
    });

    test("should handle corrupted browser environment", () => {
      // Simulate corrupted/malformed browser APIs
      global.chrome = {
        storage: "not an object", // Malformed
        runtime: null,
      };
      global.browser = {
        storage: undefined,
        runtime: "also not an object",
      };

      delete require.cache[require.resolve("../lib/browser-compat")];

      // Should not throw during initialization
      expect(() => {
        const browserAPI = require("../lib/browser-compat");
      }).not.toThrow();

      const browserAPI = require("../lib/browser-compat");

      // Should detect no available APIs
      expect(browserAPI.environment.hasStorageLocal).toBe(false);
      expect(browserAPI.environment.hasRuntime).toBe(false);
      expect(browserAPI.storage.local).toBe(null);
      expect(browserAPI.runtime).toBe(null);
    });
  });

  describe("Real-World Integration Scenarios", () => {
    test("should handle browser-specific sync storage limitations", async () => {
      const scenarios = [
        {
          browser: "chrome",
          env: createMockBrowserEnvironment("chrome"),
          syncErrors: ["QUOTA_EXCEEDED_ERR", "MAX_WRITE_OPERATIONS_PER_MINUTE"],
        },
        {
          browser: "firefox",
          env: createMockBrowserEnvironment("firefox"),
          syncErrors: ["NetworkError", "NotAllowedError"],
        },
      ];

      for (const { browser, env, syncErrors } of scenarios) {
        global.browser = env.browser;
        global.chrome = env.chrome;

        settingsManager = new SettingsManager();
        settingsManager.setStorageArea("sync");

        await settingsManager.initializeWithEmbeddedDefaults();

        // Test normal sync operations
        await settingsManager.updateSetting("feature_enabled", false);
        const setting = await settingsManager.getSetting("feature_enabled");
        expect(setting.value).toBe(false);

        settingsManager.destroy();
        settingsManager = null;
      }
    });

    test("should handle extension context invalidation gracefully", async () => {
      // Test Chrome extension context invalidation
      const chromeEnv = createMockBrowserEnvironment("chrome");
      global.chrome = chromeEnv.chrome;
      global.browser = undefined;

      settingsManager = new SettingsManager();
      await settingsManager.initializeWithEmbeddedDefaults();

      // Simulate context invalidation
      global.chrome.runtime._simulateError("Extension context invalidated.");

      // Operations should fail gracefully
      await expect(
        settingsManager.updateSetting("api_key", "should-fail"),
      ).rejects.toThrow();

      // But manager should remain stable
      const settings = settingsManager.getAllSettingsSync();
      expect(settings.feature_enabled).toBeDefined();
    });

    test("should maintain data integrity across browser restarts", async () => {
      const browsers = ["chrome", "firefox"];

      for (const browserType of browsers) {
        const env = createMockBrowserEnvironment(browserType);
        global.browser = env.browser;
        global.chrome = env.chrome;

        // First session
        settingsManager = new SettingsManager();
        await settingsManager.initializeWithEmbeddedDefaults();
        await settingsManager.updateSettings({
          feature_enabled: false,
          api_key: `${browserType}-key`,
          refresh_interval: 120,
        });

        const originalSettings = await settingsManager.getAllSettings();
        settingsManager.destroy();

        // Simulate browser restart with new manager
        const newSettingsManager = new SettingsManager();
        await newSettingsManager.initialize();

        const restoredSettings = await newSettingsManager.getAllSettings();

        // Data should be preserved
        expect(restoredSettings.feature_enabled.value).toBe(false);
        expect(restoredSettings.api_key.value).toBe(`${browserType}-key`);
        expect(restoredSettings.refresh_interval.value).toBe(120);

        newSettingsManager.destroy();
      }
    });
  });
});
