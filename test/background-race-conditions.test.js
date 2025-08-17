/**
 * Background script race conditions and error handling tests
 * Tests for the improved background script message handling
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
  alarms: global.chrome.alarms,
};

// Load the background script
const backgroundPath = path.join(__dirname, "../background.js");
const backgroundCode = fs.readFileSync(backgroundPath, "utf8");

describe("Background Script Race Conditions", () => {
  let handleMessage;
  let processAsyncMessage;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset global state
    global.self.settingsManager = null;

    // Evaluate the background script to get functions
    eval(backgroundCode);

    // Get references to the functions we need to test
    handleMessage = global.self.handleMessage;
    processAsyncMessage = global.self.processAsyncMessage;
  });

  describe("Message Handler Race Conditions", () => {
    test("should handle re-initialization timeout gracefully", async () => {
      // Mock failed initialization
      const mockSendResponse = jest.fn();
      const mockSender = { tab: { id: 1 } };
      const mockMessage = { type: "GET_ALL_SETTINGS" };

      // Set settingsManager to null to trigger re-initialization
      global.self.settingsManager = null;

      // Mock initializeSettingsOnStartup to timeout
      global.self.initializeSettingsOnStartup = jest.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 15000); // Longer than timeout
          }),
      );

      // Call handleMessage
      const result = handleMessage(mockMessage, mockSender, mockSendResponse);

      // Should return true to keep channel open
      expect(result).toBe(true);

      // Wait for timeout to trigger
      await new Promise((resolve) => setTimeout(resolve, 11000));

      // Should have called sendResponse with timeout error
      expect(mockSendResponse).toHaveBeenCalledWith({
        error: "Settings manager initialization failed: Initialization timeout",
        fallback: true,
      });
    });

    test("should handle settings manager still unavailable after re-initialization", async () => {
      const mockSendResponse = jest.fn();
      const mockSender = { tab: { id: 1 } };
      const mockMessage = { type: "GET_ALL_SETTINGS" };

      // Set settingsManager to null
      global.self.settingsManager = null;

      // Mock successful initialization but settingsManager still null
      global.self.initializeSettingsOnStartup = jest.fn(() => {
        // Don't set settingsManager - simulate failed initialization
        return Promise.resolve();
      });

      // Call handleMessage
      const result = handleMessage(mockMessage, mockSender, mockSendResponse);
      expect(result).toBe(true);

      // Wait for initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have called sendResponse with error
      expect(mockSendResponse).toHaveBeenCalledWith({
        error:
          "Settings manager not available. Service worker may need to be restarted.",
        fallback: true,
      });
    });

    test("should handle initialization errors properly", async () => {
      const mockSendResponse = jest.fn();
      const mockSender = { tab: { id: 1 } };
      const mockMessage = { type: "GET_ALL_SETTINGS" };

      // Set settingsManager to null
      global.self.settingsManager = null;

      // Mock failed initialization
      const initError = new Error("Initialization failed");
      global.self.initializeSettingsOnStartup = jest.fn(() =>
        Promise.reject(initError),
      );

      // Call handleMessage
      const result = handleMessage(mockMessage, mockSender, mockSendResponse);
      expect(result).toBe(true);

      // Wait for initialization to fail
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have called sendResponse with specific error
      expect(mockSendResponse).toHaveBeenCalledWith({
        error: "Settings manager initialization failed: Initialization failed",
        fallback: true,
      });
    });
  });

  describe("Process Async Message Protection", () => {
    test("should guard against missing settings manager", async () => {
      const mockSendResponse = jest.fn();
      const mockSender = { tab: { id: 1 } };
      const mockMessage = { type: "GET_ALL_SETTINGS" };

      // Set settingsManager to null
      global.self.settingsManager = null;

      // Call processAsyncMessage directly
      await processAsyncMessage(mockMessage, mockSender, mockSendResponse);

      // Should have called sendResponse with error
      expect(mockSendResponse).toHaveBeenCalledWith({
        error: "Settings manager not available",
        fallback: true,
      });
    });

    test("should process messages when settings manager is available", async () => {
      const mockSendResponse = jest.fn();
      const mockSender = { tab: { id: 1 } };
      const mockMessage = { type: "GET_CURRENT_TAB_ID" };

      // Set up mock settings manager
      global.self.settingsManager = {
        getSetting: jest.fn(),
        getSettings: jest.fn(),
        getAllSettings: jest.fn(() => Promise.resolve({})),
      };

      // Call processAsyncMessage
      await processAsyncMessage(mockMessage, mockSender, mockSendResponse);

      // Should have processed the message (tab ID from sender)
      expect(mockSendResponse).toHaveBeenCalledWith({
        tabId: 1,
      });
    });

    test("should handle unknown message types", async () => {
      const mockSendResponse = jest.fn();
      const mockSender = { tab: { id: 1 } };
      const mockMessage = { type: "UNKNOWN_MESSAGE_TYPE" };

      // Set up mock settings manager
      global.self.settingsManager = {
        getSetting: jest.fn(),
      };

      // Call processAsyncMessage
      await processAsyncMessage(mockMessage, mockSender, mockSendResponse);

      // Should have called sendResponse with error
      expect(mockSendResponse).toHaveBeenCalledWith({
        error: "Unknown message type: UNKNOWN_MESSAGE_TYPE",
      });
    });
  });

  describe("GET_CURRENT_TAB_ID Handler", () => {
    test("should return sender tab ID when available", async () => {
      const mockSendResponse = jest.fn();
      const mockSender = { tab: { id: 123 } };
      const mockMessage = { type: "GET_CURRENT_TAB_ID" };

      // Set up mock settings manager
      global.self.settingsManager = { getAllSettings: jest.fn() };

      await processAsyncMessage(mockMessage, mockSender, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        tabId: 123,
      });
    });

    test("should query active tab when sender has no tab", async () => {
      const mockSendResponse = jest.fn();
      const mockSender = {}; // No tab info
      const mockMessage = { type: "GET_CURRENT_TAB_ID" };

      // Mock tabs.query to return active tab
      global.chrome.tabs.query.mockResolvedValue([{ id: 456 }]);

      // Set up mock settings manager
      global.self.settingsManager = { getAllSettings: jest.fn() };

      await processAsyncMessage(mockMessage, mockSender, mockSendResponse);

      expect(global.chrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true,
      });
      expect(mockSendResponse).toHaveBeenCalledWith({
        tabId: 456,
      });
    });

    test("should handle tabs.query errors", async () => {
      const mockSendResponse = jest.fn();
      const mockSender = {}; // No tab info
      const mockMessage = { type: "GET_CURRENT_TAB_ID" };

      // Mock tabs.query to throw error
      const queryError = new Error("Tabs query failed");
      global.chrome.tabs.query.mockRejectedValue(queryError);

      // Set up mock settings manager
      global.self.settingsManager = { getAllSettings: jest.fn() };

      await processAsyncMessage(mockMessage, mockSender, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        error: "Tabs query failed",
      });
    });
  });

  describe("Concurrent Message Handling", () => {
    test("should handle multiple simultaneous messages", async () => {
      const mockSendResponse1 = jest.fn();
      const mockSendResponse2 = jest.fn();
      const mockSendResponse3 = jest.fn();

      const mockSender = { tab: { id: 1 } };
      const message1 = { type: "PING" };
      const message2 = { type: "GET_CURRENT_TAB_ID" };
      const message3 = { type: "PING" };

      // Set up mock settings manager
      global.self.settingsManager = { getAllSettings: jest.fn() };

      // Process messages concurrently
      const results = await Promise.all([
        handleMessage(message1, mockSender, mockSendResponse1),
        handleMessage(message2, mockSender, mockSendResponse2),
        handleMessage(message3, mockSender, mockSendResponse3),
      ]);

      // PING messages should return false (sync), others true (async)
      expect(results[0]).toBe(false);
      expect(results[1]).toBe(true);
      expect(results[2]).toBe(false);

      // All responses should have been called
      expect(mockSendResponse1).toHaveBeenCalled();
      expect(mockSendResponse3).toHaveBeenCalled();

      // Wait for async message to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockSendResponse2).toHaveBeenCalledWith({ tabId: 1 });
    });
  });
});
