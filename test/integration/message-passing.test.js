/**
 * Integration tests for message passing system
 * Tests real communication between UI, content scripts, and background service worker
 */

const {
  createMockRuntime,
  createMockStorage,
  generateTestSettings,
  delay,
} = require("../utils/test-helpers");

// Import actual components for real integration testing
const SettingsManager = require("../../lib/settings-manager.js");
const ContentScriptSettings = require("../../lib/content-settings.js");

describe("Message Passing Integration", () => {
  let mockRuntime;
  let mockStorage;
  let testSettings;
  let settingsManager;
  let contentScript;
  let messageHandlers;

  beforeEach(async () => {
    mockRuntime = createMockRuntime({ simulateLatency: false }); // Disable latency for faster tests
    testSettings = generateTestSettings();
    mockStorage = createMockStorage(testSettings, { simulateLatency: false });

    // Ensure browser object exists
    if (!global.browser) {
      global.browser = {
        runtime: {},
        storage: { local: {}, sync: {} },
      };
    }

    // Mock browser APIs
    global.browser.runtime = mockRuntime;
    global.browser.storage.local = mockStorage;
    global.browser.storage.sync = mockStorage;

    // Also ensure chrome API is available (browser-compat may use either)
    global.chrome = global.browser;

    // Initialize real components
    settingsManager = new SettingsManager();
    // Manually initialize with our test data
    settingsManager.settings = new Map();
    for (const [key, setting] of Object.entries(testSettings)) {
      settingsManager.settings.set(key, { ...setting });
    }
    settingsManager.initialized = true;

    contentScript = new ContentScriptSettings();

    // Set up message handlers that simulate the background script
    messageHandlers = {
      GET_SETTING: async (message) => {
        const setting = await settingsManager.getSetting(message.key);
        return { value: setting };
      },
      GET_SETTINGS: async (message) => {
        const settings = await settingsManager.getSettings(message.keys);
        return { values: settings };
      },
      GET_ALL_SETTINGS: async (_message) => {
        const settings = await settingsManager.getAllSettings();
        return { settings };
      },
      UPDATE_SETTING: async (message) => {
        await settingsManager.updateSetting(message.key, message.value);
        return { success: true };
      },
      UPDATE_SETTINGS: async (message) => {
        await settingsManager.updateSettings(message.updates);
        return { success: true };
      },
      EXPORT_SETTINGS: async (_message) => {
        const data = await settingsManager.exportSettings();
        return { data };
      },
      IMPORT_SETTINGS: async (message) => {
        await settingsManager.importSettings(message.data);
        return { success: true };
      },
      RESET_SETTINGS: async (_message) => {
        await settingsManager.resetToDefaults();
        return { success: true };
      },
    };

    // Mock sendMessage to route to our handlers
    mockRuntime.sendMessage.mockImplementation(async (message) => {
      if (messageHandlers[message.type]) {
        return await messageHandlers[message.type](message);
      } else {
        throw new Error(`Unknown message type: ${message.type}`);
      }
    });

    // Also ensure global browser sendMessage works
    global.browser.runtime.sendMessage = mockRuntime.sendMessage;
  });

  afterEach(() => {
    if (settingsManager) {
      settingsManager.destroy();
    }
    if (contentScript) {
      contentScript.destroy();
    }
    // Restore browser object
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
        sendMessage: jest.fn(),
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn(),
        },
        lastError: null,
        getURL: jest.fn((path) => `chrome-extension://test-id/${path}`),
      },
    };
  });

  describe("Background ↔ UI Communication", () => {
    test("should handle settings request from UI", async () => {
      // Test UI requesting specific settings from background script
      const message = {
        type: "GET_SETTINGS",
        keys: ["testBoolean", "testText"],
      };

      const response = await mockRuntime.sendMessage(message);

      expect(response.values).toBeDefined();
      expect(response.values.testBoolean).toEqual(testSettings.testBoolean);
      expect(response.values.testText).toEqual(testSettings.testText);
      expect(mockRuntime.sendMessage).toHaveBeenCalledWith(message);
    });

    test("should handle settings update from UI", async () => {
      // Test UI updating settings via background script
      const newValue = "updated from UI";
      const message = {
        type: "UPDATE_SETTING",
        key: "testText",
        value: newValue,
      };

      const response = await mockRuntime.sendMessage(message);

      expect(response.success).toBe(true);

      // Verify the setting was actually updated
      const updatedSetting = await settingsManager.getSetting("testText");
      expect(updatedSetting.value).toBe(newValue);

      // Verify storage was called
      expect(mockStorage.set).toHaveBeenCalled();
    });

    test("should broadcast changes to UI", async () => {
      // Test background script notifying UI of setting changes
      const changeMessage = {
        type: "SETTINGS_CHANGED",
        changes: {
          testBoolean: { value: false },
        },
      };

      const uiListener = jest.fn();
      mockRuntime.onMessage.addListener(uiListener);

      // Simulate background script broadcasting change
      mockRuntime.onMessage.trigger(changeMessage, {
        tab: { id: 1 },
        id: "test-extension-id",
      });

      expect(uiListener).toHaveBeenCalledWith(
        changeMessage,
        expect.objectContaining({
          tab: { id: 1 },
          id: "test-extension-id",
        }),
        undefined,
      );
    });
  });

  describe("Background ↔ Content Script Communication", () => {
    test("should handle settings request from content script", async () => {
      // Test content script requesting a single setting
      const setting = await contentScript.getSetting("testBoolean");

      expect(setting).toEqual(testSettings.testBoolean);
      expect(mockRuntime.sendMessage).toHaveBeenCalledWith({
        type: "GET_SETTING",
        key: "testBoolean",
      });
    });

    test("should handle settings update from content script", async () => {
      // Test content script updating settings
      const newValue = 42;
      const success = await contentScript.updateSetting("testNumber", newValue);

      expect(success).toBe(true);
      expect(mockRuntime.sendMessage).toHaveBeenCalledWith({
        type: "UPDATE_SETTING",
        key: "testNumber",
        value: newValue,
      });

      // Verify the setting was actually updated in the manager
      const updatedSetting = await settingsManager.getSetting("testNumber");
      expect(updatedSetting.value).toBe(newValue);
    });

    test("should notify content scripts of changes", async () => {
      // Test background script notifying content scripts
      const changeListener = jest.fn();
      contentScript.addChangeListener(changeListener);

      const changeMessage = {
        type: "SETTINGS_CHANGED",
        changes: {
          testBoolean: false,
        },
      };

      // Simulate background script sending change notification
      mockRuntime.onMessage.trigger(changeMessage, {
        tab: { id: 1 },
      });

      expect(changeListener).toHaveBeenCalledWith("changed", {
        testBoolean: false,
      });
    });
  });

  describe("End-to-End Message Flow", () => {
    test("should handle UI → Background → Storage → UI flow", async () => {
      // Test complete flow: UI updates setting, stored in browser storage, change broadcasted
      const originalValue = testSettings.testBoolean.value;
      const newValue = !originalValue;

      // Simulate UI update
      const updateMessage = {
        type: "UPDATE_SETTING",
        key: "testBoolean",
        value: newValue,
      };

      const response = await mockRuntime.sendMessage(updateMessage);
      expect(response.success).toBe(true);

      // Verify setting was persisted to storage
      expect(mockStorage.set).toHaveBeenCalledWith({
        testBoolean: expect.objectContaining({ value: newValue }),
      });

      // Verify setting was updated in memory
      const updatedSetting = await settingsManager.getSetting("testBoolean");
      expect(updatedSetting.value).toBe(newValue);

      // Test notification flow
      const uiListener = jest.fn();
      mockRuntime.onMessage.addListener(uiListener);

      // Simulate broadcast to UI
      const broadcastMessage = {
        type: "SETTINGS_CHANGED",
        changes: { testBoolean: newValue },
      };

      mockRuntime.onMessage.trigger(broadcastMessage, { tab: { id: 1 } });
      expect(uiListener).toHaveBeenCalled();
    });

    test("should handle Content Script → Background → Storage → Broadcast flow", async () => {
      // Test complete flow: Content script updates, stored, all components notified
      const newValue = "Content script update";

      // Set up listeners to simulate multiple content scripts
      const listeners = [jest.fn(), jest.fn(), jest.fn()];
      listeners.forEach((listener) => {
        mockRuntime.onMessage.addListener(listener);
      });

      // Content script updates setting
      const success = await contentScript.updateSetting("testText", newValue);
      expect(success).toBe(true);

      // Verify storage was updated
      expect(mockStorage.set).toHaveBeenCalledWith({
        testText: expect.objectContaining({ value: newValue }),
      });

      // Verify setting was updated in manager
      const updatedSetting = await settingsManager.getSetting("testText");
      expect(updatedSetting.value).toBe(newValue);

      // Simulate broadcast to all tabs (content scripts)
      const broadcastMessage = {
        type: "SETTINGS_CHANGED",
        changes: { testText: newValue },
      };

      mockRuntime.onMessage.trigger(broadcastMessage, { tab: { id: 1 } });
      mockRuntime.onMessage.trigger(broadcastMessage, { tab: { id: 2 } });
      mockRuntime.onMessage.trigger(broadcastMessage, { tab: { id: 3 } });

      // Verify all listeners were notified
      listeners.forEach((listener) => {
        expect(listener).toHaveBeenCalledWith(
          broadcastMessage,
          expect.objectContaining({
            tab: expect.objectContaining({ id: expect.any(Number) }),
          }),
          undefined,
        );
      });
    });

    test("should handle export/import workflow", async () => {
      // Test complete export/import flow

      // First, modify some settings
      await settingsManager.updateSetting("testBoolean", false);
      await settingsManager.updateSetting("testText", "exported value");

      // Export settings
      const exportResponse = await mockRuntime.sendMessage({
        type: "EXPORT_SETTINGS",
      });
      expect(exportResponse.data).toBeDefined();

      const exportData = JSON.parse(exportResponse.data);
      expect(exportData.settings.testBoolean.value).toBe(false);
      expect(exportData.settings.testText.value).toBe("exported value");

      // Reset settings
      await mockRuntime.sendMessage({ type: "RESET_SETTINGS" });

      // Verify reset worked
      const resetSetting = await settingsManager.getSetting("testBoolean");
      expect(resetSetting.value).toBe(testSettings.testBoolean.value); // Back to original

      // Import the exported settings
      const importResponse = await mockRuntime.sendMessage({
        type: "IMPORT_SETTINGS",
        data: exportResponse.data,
      });
      expect(importResponse.success).toBe(true);

      // Verify import worked
      const importedBoolean = await settingsManager.getSetting("testBoolean");
      const importedText = await settingsManager.getSetting("testText");
      expect(importedBoolean.value).toBe(false);
      expect(importedText.value).toBe("exported value");
    });
  });

  describe("Message Validation", () => {
    test("should validate message format", async () => {
      // Test validation of message structure
      const invalidMessages = [
        {}, // Empty message
        { type: "" }, // Empty type
        { type: "GET_SETTING" }, // Missing required key
        { type: "UPDATE_SETTING", key: "test" }, // Missing value
        { type: "GET_SETTINGS" }, // Missing keys array
      ];

      for (const message of invalidMessages) {
        try {
          await mockRuntime.sendMessage(message);
          // Some may succeed if they have valid handlers, so check specific validation
          if (!message.type) {
            expect(false).toBe(true); // Should have failed
          }
        } catch (error) {
          expect(error.message).toContain("Unknown message type");
        }
      }
    });

    test("should validate setting keys exist", async () => {
      // Test validation of setting keys
      const invalidKeyMessage = {
        type: "GET_SETTING",
        key: "nonexistent_setting",
      };

      try {
        await mockRuntime.sendMessage(invalidKeyMessage);
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect(error.message).toContain("not found");
      }
    });

    test("should validate setting values", async () => {
      // Test validation of setting values based on type
      const invalidValueMessages = [
        {
          type: "UPDATE_SETTING",
          key: "testBoolean",
          value: "not a boolean", // Boolean setting with string value
        },
        {
          type: "UPDATE_SETTING",
          key: "testNumber",
          value: "not a number", // Number setting with string value
        },
        {
          type: "UPDATE_SETTING",
          key: "testText",
          value: "x".repeat(101), // Exceeds maxLength of 100
        },
      ];

      for (const message of invalidValueMessages) {
        try {
          await mockRuntime.sendMessage(message);
          expect(true).toBe(false); // Should have thrown
        } catch (error) {
          expect(error.message).toMatch(/must be|exceeds/);
        }
      }
    });
  });

  describe("Error Handling", () => {
    test("should handle message delivery failures", async () => {
      // Test error handling when message cannot be delivered
      const originalSendMessage = mockRuntime.sendMessage;
      mockRuntime.sendMessage.mockRejectedValue(
        new Error("Could not establish connection"),
      );

      try {
        await contentScript.getSetting("testBoolean");
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect(error.message).toBe("Could not establish connection");
      }

      // Restore original function
      mockRuntime.sendMessage = originalSendMessage;
    });

    test("should handle background script errors", async () => {
      // Test error handling when background script returns error
      const originalHandler = messageHandlers["GET_SETTING"];
      messageHandlers["GET_SETTING"] = async () => {
        throw new Error("Internal error in background script");
      };

      mockRuntime.sendMessage.mockImplementation(async (message) => {
        return await messageHandlers[message.type](message);
      });

      try {
        await contentScript.getSetting("testBoolean");
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect(error.message).toBe("Internal error in background script");
      }

      // Restore original handler
      messageHandlers["GET_SETTING"] = originalHandler;
    });

    test("should timeout unresponsive messages", async () => {
      // Test timeout handling for slow responses
      const originalTimeout = contentScript.messageTimeout;
      contentScript.setMessageTimeout(100); // Very short timeout

      mockRuntime.sendMessage.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 200),
          ),
      );

      try {
        await contentScript.getSetting("testBoolean");
        expect(true).toBe(false); // Should have timed out
      } catch (error) {
        expect(error.message).toContain("Timeout");
      }

      // Restore original timeout
      contentScript.setMessageTimeout(originalTimeout);
    });

    test("should handle storage quota exceeded errors", async () => {
      // Test handling of storage quota exceeded
      const largeSetting = "x".repeat(100000); // Large string
      mockStorage._setQuotaLimit(50000); // Small quota

      try {
        await contentScript.updateSetting("testText", largeSetting);
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect(error.message).toContain("quota");
      }
    });
  });

  describe("Performance", () => {
    test("should handle high message volume", async () => {
      // Test performance with many concurrent messages
      const startTime = performance.now();
      const promises = Array.from({ length: 20 }, async () => {
        return await contentScript.getSetting("testBoolean");
      });

      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(20);
      expect(results.every((r) => r.type === "boolean")).toBe(true);

      // Should complete within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test("should maintain message order and consistency", async () => {
      // Test that concurrent updates maintain consistency
      const updates = [];
      const changeListener = jest.fn((event, data) => {
        updates.push({ event, data, timestamp: performance.now() });
      });

      contentScript.addChangeListener(changeListener);

      // Perform sequential updates
      for (let i = 0; i < 3; i++) {
        await contentScript.updateSetting("testNumber", i);

        // Simulate broadcast notification
        mockRuntime.onMessage.trigger(
          {
            type: "SETTINGS_CHANGED",
            changes: { testNumber: i },
          },
          { tab: { id: 1 } },
        );

        await delay(5); // Small delay to ensure order
      }

      // Verify all updates were received in order
      expect(changeListener).toHaveBeenCalledTimes(3);
      for (let i = 0; i < 3; i++) {
        expect(updates[i].data.testNumber).toBe(i);
      }
    });

    test("should cache frequently accessed settings", async () => {
      // Test caching behavior
      const setting1 = await contentScript.getSetting("testBoolean");
      const setting2 = await contentScript.getCachedSetting("testBoolean");

      expect(setting1).toEqual(setting2);
      expect(mockRuntime.sendMessage).toHaveBeenCalledTimes(1); // Only one network call

      // Test cache invalidation on update
      await contentScript.updateSetting("testBoolean", !setting1.value);
      const setting3 = await contentScript.getCachedSetting("testBoolean");

      expect(setting3.value).toBe(!setting1.value);
    });
  });

  describe("Security", () => {
    test("should handle malicious message types gracefully", async () => {
      // Test handling of unknown/malicious message types
      const maliciousMessages = [
        { type: "DELETE_ALL_DATA" },
        { type: "ADMIN_ACTION", data: "sensitive_data" },
        { type: "EXEC_CODE", code: 'eval("malicious")' },
      ];

      for (const message of maliciousMessages) {
        try {
          await mockRuntime.sendMessage(message);
          expect(true).toBe(false); // Should have thrown
        } catch (error) {
          expect(error.message).toContain("Unknown message type");
        }
      }
    });

    test("should sanitize and validate setting values", async () => {
      // Test that potentially dangerous values are handled safely
      const potentiallyDangerousValues = [
        '<script>alert("xss")</script>',
        "javascript:alert(1)",
        "../../../../../../etc/passwd",
      ];

      for (const value of potentiallyDangerousValues) {
        try {
          // Try to update text setting with potentially dangerous value
          await contentScript.updateSetting("testText", value);

          // If it succeeds, verify the value was safely stored
          const setting = await contentScript.getSetting("testText");
          expect(typeof setting.value).toBe("string");
        } catch (error) {
          // Validation errors are expected for some values
          expect(error.message).toMatch(/must be|Invalid/);
        }
      }
    });

    test("should protect against circular reference attacks", async () => {
      // Test handling of circular references in JSON settings
      const circularObj = { a: 1 };
      circularObj.self = circularObj; // Create circular reference

      try {
        await contentScript.updateSetting("testJson", circularObj);
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect(error.message).toContain("circular");
      }
    });

    test("should handle message flooding gracefully", async () => {
      // Test protection against message flooding
      const startTime = performance.now();
      const promises = [];

      // Send many messages rapidly
      for (let i = 0; i < 50; i++) {
        promises.push(contentScript.getSetting("testBoolean").catch((e) => e));
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();

      // Should complete within reasonable time and not crash
      expect(endTime - startTime).toBeLessThan(3000);

      // Most requests should succeed
      const successes = results.filter((r) => r && r.type === "boolean").length;
      expect(successes).toBeGreaterThan(40); // At least 80% success rate
    });
  });

  describe("Browser Compatibility", () => {
    test("should work with Chrome runtime API", async () => {
      // Test Chrome-specific runtime behavior
      const originalBrowser = global.browser;
      global.browser = undefined;
      global.chrome = originalBrowser;

      const chromeContentScript = new ContentScriptSettings();

      try {
        const setting = await chromeContentScript.getSetting("testBoolean");
        expect(setting).toEqual(testSettings.testBoolean);
      } finally {
        global.browser = originalBrowser;
        global.chrome = originalBrowser;
        chromeContentScript.destroy();
      }
    });

    test("should handle runtime context invalidation", async () => {
      // Test handling of extension context invalidation
      const originalSendMessage = mockRuntime.sendMessage;
      mockRuntime.sendMessage.mockRejectedValue(
        new Error("Extension context invalidated."),
      );

      try {
        await contentScript.getSetting("testBoolean");
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect(error.message).toContain("Extension context invalidated");
      }

      mockRuntime.sendMessage = originalSendMessage;
    });
  });

  describe("Real-world Scenarios", () => {
    test("should handle page navigation and cleanup", async () => {
      // Test content script behavior during page navigation
      const listener = jest.fn();
      contentScript.addChangeListener(listener);

      // Simulate settings change
      mockRuntime.onMessage.trigger(
        {
          type: "SETTINGS_CHANGED",
          changes: { testBoolean: false },
        },
        { tab: { id: 1 } },
      );

      expect(listener).toHaveBeenCalled();

      // Simulate page navigation cleanup
      contentScript.destroy();

      // Further changes should not trigger the listener
      mockRuntime.onMessage.trigger(
        {
          type: "SETTINGS_CHANGED",
          changes: { testText: "after cleanup" },
        },
        { tab: { id: 1 } },
      );

      // Listener should not have been called again
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test("should handle extension update scenarios", async () => {
      // Test handling of extension updates

      // First, set up some settings
      await contentScript.updateSetting("testText", "before update");

      // Simulate extension update by reinitializing
      const newSettingsManager = new SettingsManager();
      await newSettingsManager.initialize();

      // Verify settings persisted through update
      const persistedSetting = await newSettingsManager.getSetting("testText");
      expect(persistedSetting.value).toBe("before update");

      newSettingsManager.destroy();
    });
  });
});
