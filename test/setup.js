/**
 * Jest test setup configuration
 * Sets up test environment for Settings Extension
 */

// Load browser compatibility layer first
require("../lib/browser-compat.js");

// Mock browser APIs for testing
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

// Mock chrome APIs for compatibility
global.chrome = global.browser;

// Ensure browserAPI is available globally
global.browserAPI = global.browser;

// Mock fetch for settings manager
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        feature_enabled: {
          type: "boolean",
          value: true,
          description: "Enable main feature functionality",
        },
        api_key: {
          type: "text",
          value: "",
          description: "API key for external service",
          maxLength: 100,
        },
      }),
  }),
);

// Mock performance.now if not available
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 10000000,
    },
  };
}

// Jest's jsdom environment should provide DOM globals automatically
// Add any additional global mocks here if needed

// Mock importScripts function for service worker tests
global.importScripts = jest.fn();

// Mock SettingsManager and ContentScriptSettings classes
global.SettingsManager = jest.fn();
global.ContentScriptSettings = jest.fn();

// Note: afterEach is not available in setupFiles, only in setupFilesAfterEnv
// Individual tests should handle cleanup with jest.clearAllMocks() as needed
