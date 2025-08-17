/**
 * Unit tests for background script message handlers
 * Tests the core message handling logic for popup decoupling
 */

const fs = require("fs");
const path = require("path");

// Mock globals and browser APIs
global.self = {};
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
    },
  },
  runtime: {
    getURL: jest.fn(),
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
    onStartup: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
  alarms: {
    create: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
    },
  },
};

// Mock fetch for defaults.json loading
global.fetch = jest.fn();

// Mock browser compatibility layer
global.self.browserAPI = {
  storage: global.chrome.storage,
  runtime: global.chrome.runtime,
  tabs: global.chrome.tabs,
};

// Mock settings manager
class MockSettingsManager {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
  }

  async getAllSettings() {
    return {
      feature_enabled: {
        type: "boolean",
        value: true,
        description: "Enable main feature functionality",
      },
      api_key: {
        type: "text",
        value: "",
        description: "API key for external service",
      },
    };
  }

  async updateSetting(_key, _value) {
    return { success: true };
  }

  async updateSettings(_updates) {
    return { success: true };
  }
}

global.SettingsManager = MockSettingsManager;

// Load the background script functions
let backgroundFunctions;

beforeAll(() => {
  // Load background script code
  const backgroundPath = path.join(__dirname, "../background.js");
  const backgroundCode = fs.readFileSync(backgroundPath, "utf8");

  // Extract just the function definitions we need for testing
  // This is a simplified approach - in a real scenario, you'd refactor background.js
  // to export these functions explicitly
  eval(backgroundCode);

  // Access the functions that were made global for testing
  backgroundFunctions = {
    initializeSettings: global.initializeSettings,
    initializeSettingsOnStartup: global.initializeSettingsOnStartup,
    handleMessage: global.handleMessage,
    handleInstalled: global.handleInstalled,
    broadcastSettingsChange: global.broadcastSettingsChange,
  };
});

beforeEach(() => {
  jest.clearAllMocks();

  // Reset default mock implementations
  global.chrome.storage.local.get.mockResolvedValue({});
  global.chrome.storage.local.set.mockResolvedValue();
  global.chrome.runtime.getURL.mockReturnValue(
    "chrome-extension://test/config/defaults.json",
  );
  global.fetch.mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        feature_enabled: {
          type: "boolean",
          value: true,
          description: "Enable main feature functionality",
        },
      }),
  });
});

describe("Background Message Handlers", () => {
  describe("ensureSettingsSeeded", () => {
    test("seeds settings from defaults.json when storage is empty", async () => {
      // Mock empty storage
      global.chrome.storage.local.get.mockResolvedValue({});

      // Call the function (it's defined in the global scope)
      await global.ensureSettingsSeeded();

      // Verify it tried to load defaults
      expect(global.fetch).toHaveBeenCalledWith(
        "chrome-extension://test/config/defaults.json",
      );
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
        settings: {
          feature_enabled: {
            type: "boolean",
            value: true,
            description: "Enable main feature functionality",
          },
        },
      });
    });

    test("does not seed settings when storage already has settings", async () => {
      // Mock existing settings in storage
      global.chrome.storage.local.get.mockResolvedValue({
        settings: {
          feature_enabled: {
            type: "boolean",
            value: false,
            description: "Enable main feature functionality",
          },
        },
      });

      await global.ensureSettingsSeeded();

      // Should not fetch defaults or write to storage
      expect(global.fetch).not.toHaveBeenCalled();
      expect(global.chrome.storage.local.set).not.toHaveBeenCalled();
    });

    test("handles fetch errors gracefully", async () => {
      global.chrome.storage.local.get.mockResolvedValue({});
      global.fetch.mockRejectedValue(new Error("Network error"));

      // Should not throw
      await expect(global.ensureSettingsSeeded()).resolves.not.toThrow();

      // Should not crash the background script
      expect(global.chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe("handleMessage PING", () => {
    test("responds to PING synchronously", () => {
      const mockSendResponse = jest.fn();
      const message = { type: "PING" };
      const sender = {};

      const result = backgroundFunctions.handleMessage(
        message,
        sender,
        mockSendResponse,
      );

      expect(mockSendResponse).toHaveBeenCalledWith({
        pong: true,
        timestamp: expect.any(Number),
      });
      expect(result).toBe(false); // Sync response, don't keep channel open
    });
  });

  describe("handleMessage GET_ALL_SETTINGS", () => {
    test("returns settings from settings manager when available", async () => {
      // Mock settings manager being available
      global.settingsManager = new MockSettingsManager();
      await global.settingsManager.initialize();

      const mockSendResponse = jest.fn();
      const message = { type: "GET_ALL_SETTINGS" };
      const sender = {};

      const result = backgroundFunctions.handleMessage(
        message,
        sender,
        mockSendResponse,
      );
      expect(result).toBe(true); // Async response, keep channel open

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockSendResponse).toHaveBeenCalledWith({
        settings: expect.objectContaining({
          feature_enabled: expect.objectContaining({
            type: "boolean",
            value: true,
          }),
        }),
      });
    });

    test("falls back to storage when settings manager unavailable", async () => {
      // Mock settings manager not being available
      global.settingsManager = null;

      // Mock storage with settings
      global.chrome.storage.local.get.mockResolvedValue({
        settings: {
          api_key: {
            type: "text",
            value: "fallback-key",
            description: "API key",
          },
        },
      });

      const mockSendResponse = jest.fn();
      const message = { type: "GET_ALL_SETTINGS" };
      const sender = {};

      const result = backgroundFunctions.handleMessage(
        message,
        sender,
        mockSendResponse,
      );
      expect(result).toBe(true);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSendResponse).toHaveBeenCalledWith({
        settings: {
          api_key: {
            type: "text",
            value: "fallback-key",
            description: "API key",
          },
        },
      });
    });

    test("seeds defaults when no settings in storage", async () => {
      global.settingsManager = null;

      // First call returns empty, second call returns seeded settings
      global.chrome.storage.local.get
        .mockResolvedValueOnce({}) // Empty storage
        .mockResolvedValueOnce({
          // After seeding
          settings: {
            feature_enabled: {
              type: "boolean",
              value: true,
              description: "Enable main feature functionality",
            },
          },
        });

      const mockSendResponse = jest.fn();
      const message = { type: "GET_ALL_SETTINGS" };
      const sender = {};

      backgroundFunctions.handleMessage(message, sender, mockSendResponse);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have seeded from defaults
      expect(global.fetch).toHaveBeenCalled();
      expect(global.chrome.storage.local.set).toHaveBeenCalled();
      expect(mockSendResponse).toHaveBeenCalledWith({
        settings: expect.objectContaining({
          feature_enabled: expect.objectContaining({
            type: "boolean",
            value: true,
          }),
        }),
      });
    });
  });

  describe("handleMessage UPDATE_SETTING", () => {
    test("updates setting via settings manager", async () => {
      global.settingsManager = new MockSettingsManager();
      await global.settingsManager.initialize();

      // Mock updateSetting method
      global.settingsManager.updateSetting = jest
        .fn()
        .mockResolvedValue({ success: true });

      const mockSendResponse = jest.fn();
      const message = {
        type: "UPDATE_SETTING",
        key: "feature_enabled",
        value: false,
      };
      const sender = {};

      const result = backgroundFunctions.handleMessage(
        message,
        sender,
        mockSendResponse,
      );
      expect(result).toBe(true);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(global.settingsManager.updateSetting).toHaveBeenCalledWith(
        "feature_enabled",
        false,
      );
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe("broadcastSettingsChange", () => {
    test("broadcasts changes to valid tabs", async () => {
      // Mock tabs.query to return some tabs
      global.chrome.tabs.query.mockResolvedValue([
        { id: 1, url: "https://example.com" },
        { id: 2, url: "chrome://settings" }, // Should be filtered out
        { id: 3, url: "https://test.com" },
      ]);

      global.chrome.tabs.sendMessage.mockResolvedValue({});

      const changes = { feature_enabled: false };
      const sender = { tab: { id: 1 } }; // Exclude sender tab

      await backgroundFunctions.broadcastSettingsChange(changes, sender);

      // Should only send to tab 3 (tab 1 is sender, tab 2 is chrome://)
      expect(global.chrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
      expect(global.chrome.tabs.sendMessage).toHaveBeenCalledWith(3, {
        type: "SETTINGS_CHANGED",
        changes: { feature_enabled: false },
      });
    });

    test("handles sendMessage errors gracefully", async () => {
      global.chrome.tabs.query.mockResolvedValue([
        { id: 1, url: "https://example.com" },
      ]);

      // Mock sendMessage to fail
      global.chrome.tabs.sendMessage.mockRejectedValue(
        new Error("Could not establish connection"),
      );

      const changes = { feature_enabled: false };
      const sender = {};

      // Should not throw
      await expect(
        backgroundFunctions.broadcastSettingsChange(changes, sender),
      ).resolves.not.toThrow();
    });
  });

  describe("Error handling", () => {
    test("handles unknown message types", async () => {
      const mockSendResponse = jest.fn();
      const message = { type: "UNKNOWN_MESSAGE_TYPE" };
      const sender = {};

      const result = backgroundFunctions.handleMessage(
        message,
        sender,
        mockSendResponse,
      );
      expect(result).toBe(true);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockSendResponse).toHaveBeenCalledWith({
        error: "Unknown message type: UNKNOWN_MESSAGE_TYPE",
      });
    });
  });
});
