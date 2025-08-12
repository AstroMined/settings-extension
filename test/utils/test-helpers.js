/**
 * Test utility functions for Settings Extension tests
 */

/**
 * Creates a mock storage with initial data and realistic behavior
 * @param {Object} initialData - Initial data to populate storage with
 * @param {Object} options - Configuration options
 * @returns {Object} Mock storage object
 */
function createMockStorage(initialData = {}, options = {}) {
  const storage = { ...initialData };
  const config = {
    quotaLimit: options.quotaLimit || 5242880, // 5MB default (local storage)
    simulateLatency: options.simulateLatency || false,
    errorRate: options.errorRate || 0, // 0-1 probability of random errors
    ...options,
  };

  // Helper to simulate network latency
  const addLatency = async (result) => {
    if (config.simulateLatency) {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
    }
    return result;
  };

  // Helper to simulate random errors
  const maybeThrowError = () => {
    if (Math.random() < config.errorRate) {
      throw new Error("Simulated storage error");
    }
  };

  // Calculate storage size
  const getStorageSize = () => {
    return JSON.stringify(storage).length;
  };

  const mockStorage = {
    // Expose internal storage for testing
    storage,

    get: jest.fn(async (keys) => {
      maybeThrowError();

      let result;
      if (typeof keys === "string") {
        result = storage[keys] !== undefined ? { [keys]: storage[keys] } : {};
      } else if (Array.isArray(keys)) {
        result = {};
        keys.forEach((key) => {
          if (storage[key] !== undefined) {
            result[key] = storage[key];
          }
        });
      } else if (keys === null || keys === undefined) {
        result = { ...storage };
      } else {
        result = {};
      }

      return addLatency(result);
    }),

    set: jest.fn(async (data) => {
      maybeThrowError();

      // Calculate new size after adding data
      const testStorage = { ...storage, ...data };
      const newSize = JSON.stringify(testStorage).length;

      // Check quota limits
      if (newSize > config.quotaLimit) {
        const error = new Error(
          "QuotaExceededError: The quota has been exceeded.",
        );
        error.name = "QuotaExceededError";
        throw error;
      }

      // Simulate Chrome's behavior of validating JSON serializability
      try {
        JSON.stringify(data);
      } catch (e) {
        throw new Error(
          "Invalid data: contains circular references or non-serializable values",
        );
      }

      Object.assign(storage, data);
      return addLatency();
    }),

    remove: jest.fn(async (keys) => {
      maybeThrowError();

      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(storage, key)) {
          delete storage[key];
        }
      });
      return addLatency();
    }),

    clear: jest.fn(async () => {
      maybeThrowError();

      Object.keys(storage).forEach((key) => delete storage[key]);
      return addLatency();
    }),

    getBytesInUse: jest.fn(async (keys = null) => {
      maybeThrowError();

      let targetStorage;
      if (keys === null || keys === undefined) {
        targetStorage = storage;
      } else if (typeof keys === "string") {
        targetStorage =
          storage[keys] !== undefined ? { [keys]: storage[keys] } : {};
      } else if (Array.isArray(keys)) {
        targetStorage = {};
        keys.forEach((key) => {
          if (storage[key] !== undefined) {
            targetStorage[key] = storage[key];
          }
        });
      } else {
        targetStorage = {};
      }

      const size = JSON.stringify(targetStorage).length;
      return addLatency(size);
    }),

    // Test utilities
    _getStorageSize: getStorageSize,
    _setQuotaLimit: (limit) => {
      config.quotaLimit = limit;
    },
    _setErrorRate: (rate) => {
      config.errorRate = Math.max(0, Math.min(1, rate));
    },
    _simulateQuotaExceeded: () => {
      const originalSet = mockStorage.set;
      mockStorage.set.mockImplementation(() => {
        const error = new Error("QUOTA_EXCEEDED_ERR");
        error.name = "QuotaExceededError";
        return Promise.reject(error);
      });
      return () => {
        mockStorage.set = originalSet;
      }; // Return cleanup function
    },
  };

  return mockStorage;
}

/**
 * Creates a mock runtime for message passing tests with realistic behavior
 * @param {Object} options - Configuration options
 * @returns {Object} Mock runtime object
 */
function createMockRuntime(options = {}) {
  const listeners = [];
  const config = {
    simulateLatency: options.simulateLatency || false,
    errorRate: options.errorRate || 0,
    browserType: options.browserType || "chrome", // 'chrome' or 'firefox'
    ...options,
  };

  let lastError = null;

  const addLatency = async (result) => {
    if (config.simulateLatency) {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 20));
    }
    return result;
  };

  const maybeThrowError = () => {
    if (Math.random() < config.errorRate) {
      const error = new Error("Runtime error: Could not establish connection.");
      error.name = "RuntimeError";
      throw error;
    }
  };

  const mockRuntime = {
    sendMessage: jest.fn(async (message, responseCallback) => {
      maybeThrowError();

      // Simulate Chrome callback pattern vs Firefox promise pattern
      if (config.browserType === "chrome" && responseCallback) {
        // Chrome callback pattern
        setTimeout(
          () => {
            if (Math.random() < 0.1) {
              // 10% chance of error
              lastError = { message: "Extension context invalidated." };
              responseCallback(undefined);
            } else {
              responseCallback({ success: true, echo: message });
            }
          },
          config.simulateLatency ? Math.random() * 10 : 0,
        );
        return;
      } else {
        // Firefox promise pattern
        const result = { success: true, echo: message };
        return addLatency(result);
      }
    }),

    onMessage: {
      addListener: jest.fn((listener) => {
        if (typeof listener !== "function") {
          throw new Error("Listener must be a function");
        }
        listeners.push(listener);
      }),

      removeListener: jest.fn((listener) => {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }),

      hasListener: jest.fn((listener) => {
        return listeners.includes(listener);
      }),

      // Test utility to trigger message events
      trigger: (message, sender = {}, sendResponse) => {
        const mockSender = {
          tab: { id: 1, url: "https://example.com" },
          frameId: 0,
          id: "test-extension-id",
          ...sender,
        };

        listeners.forEach((listener) => {
          try {
            const result = listener(message, mockSender, sendResponse);
            // Handle async listeners that return promises
            if (result instanceof Promise) {
              result
                .then((response) => {
                  if (sendResponse) sendResponse(response);
                })
                .catch((error) => {
                  console.error("Message listener error:", error);
                });
            }
          } catch (error) {
            console.error("Message listener error:", error);
          }
        });
      },
    },

    get lastError() {
      return lastError;
    },

    set lastError(error) {
      lastError = error;
    },

    id: "mock-extension-id",

    getURL: jest.fn((path) => {
      return `chrome-extension://mock-extension-id/${path}`;
    }),

    getManifest: jest.fn(() => ({
      name: "Test Extension",
      version: "1.0.0",
      manifest_version: 3,
    })),

    // Test utilities
    _getListeners: () => [...listeners],
    _clearListeners: () => {
      listeners.length = 0;
    },
    _setBrowserType: (type) => {
      config.browserType = type;
    },
    _simulateError: (errorMessage) => {
      lastError = { message: errorMessage };
    },
    _clearError: () => {
      lastError = null;
    },
  };

  return mockRuntime;
}

/**
 * Generates test settings data with various types
 * @returns {Object} Test settings object
 */
function generateTestSettings() {
  return {
    testBoolean: {
      type: "boolean",
      value: true,
      description: "Test boolean setting",
    },
    testText: {
      type: "text",
      value: "test value",
      description: "Test text setting",
      maxLength: 100,
    },
    testLongText: {
      type: "longtext",
      value: "This is a longer test value for testing longtext settings",
      description: "Test longtext setting",
      maxLength: 1000,
    },
    testNumber: {
      type: "number",
      value: 42,
      description: "Test number setting",
      min: 0,
      max: 100,
    },
    testJson: {
      type: "json",
      value: { key: "value", nested: { prop: 123 } },
      description: "Test JSON setting",
    },
  };
}

/**
 * Creates a settings validation test suite
 * @param {Function} validateFunction - Function to test validation
 * @returns {Object} Test suite functions
 */
function createValidationTestSuite(validateFunction) {
  return {
    testValidBoolean: () => {
      expect(validateFunction("boolean", true)).toBe(true);
      expect(validateFunction("boolean", false)).toBe(true);
      expect(validateFunction("boolean", "string")).toBe(false);
      expect(validateFunction("boolean", 123)).toBe(false);
    },

    testValidText: () => {
      expect(validateFunction("text", "valid text")).toBe(true);
      expect(validateFunction("text", "")).toBe(true);
      expect(validateFunction("text", 123)).toBe(false);
      expect(validateFunction("text", null)).toBe(false);
    },

    testValidNumber: () => {
      expect(validateFunction("number", 42)).toBe(true);
      expect(validateFunction("number", 0)).toBe(true);
      expect(validateFunction("number", -1)).toBe(true);
      expect(validateFunction("number", "string")).toBe(false);
      expect(validateFunction("number", null)).toBe(false);
    },

    testValidJson: () => {
      expect(validateFunction("json", { key: "value" })).toBe(true);
      expect(validateFunction("json", [])).toBe(true);
      expect(validateFunction("json", null)).toBe(true);
      expect(validateFunction("json", "string")).toBe(false);
    },
  };
}

/**
 * Simulates asynchronous delay for testing
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a performance test helper with detailed metrics
 * @param {Function} testFunction - Function to test performance
 * @param {number} maxTime - Maximum allowed time in ms
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Performance test results
 */
async function testPerformance(testFunction, maxTime = 100, options = {}) {
  const config = {
    iterations: options.iterations || 1,
    warmup: options.warmup || false,
    collectMemory: options.collectMemory || false,
    ...options,
  };

  const results = {
    passed: false,
    duration: 0,
    maxTime,
    iterations: config.iterations,
    measurements: [],
  };

  // Warmup run
  if (config.warmup && config.iterations > 1) {
    try {
      await testFunction();
    } catch (e) {
      // Ignore warmup errors
    }
  }

  // Main test runs
  for (let i = 0; i < config.iterations; i++) {
    const memoryBefore =
      config.collectMemory && performance.memory
        ? performance.memory.usedJSHeapSize
        : 0;

    const startTime = performance.now();

    try {
      await testFunction();

      const endTime = performance.now();
      const duration = endTime - startTime;

      const measurement = {
        iteration: i + 1,
        duration,
        success: true,
      };

      if (config.collectMemory && performance.memory) {
        const memoryAfter = performance.memory.usedJSHeapSize;
        measurement.memoryDelta = memoryAfter - memoryBefore;
      }

      results.measurements.push(measurement);
    } catch (error) {
      const endTime = performance.now();
      results.measurements.push({
        iteration: i + 1,
        duration: endTime - startTime,
        success: false,
        error: error.message,
      });
    }
  }

  // Calculate statistics
  const successfulRuns = results.measurements.filter((m) => m.success);
  if (successfulRuns.length > 0) {
    const durations = successfulRuns.map((m) => m.duration);
    results.duration = durations.reduce((a, b) => a + b, 0) / durations.length;
    results.minDuration = Math.min(...durations);
    results.maxDuration = Math.max(...durations);
    results.passed = results.duration < maxTime;

    if (config.collectMemory) {
      const memoryDeltas = successfulRuns
        .filter((m) => m.memoryDelta !== undefined)
        .map((m) => m.memoryDelta);
      if (memoryDeltas.length > 0) {
        results.avgMemoryDelta =
          memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length;
      }
    }
  } else {
    results.passed = false;
    results.error = "All iterations failed";
  }

  return results;
}

/**
 * Creates a mock browser environment for cross-browser testing
 * @param {string} browserType - 'chrome', 'firefox', or 'edge'
 * @returns {Object} Mock browser globals
 */
function createMockBrowserEnvironment(browserType = "chrome") {
  const mockStorage = createMockStorage(
    {},
    {
      quotaLimit: browserType === "chrome" ? 5242880 : 5242880, // Same for now
      simulateLatency: true,
    },
  );

  const mockSyncStorage = createMockStorage(
    {},
    {
      quotaLimit: 102400, // 100KB for sync
      simulateLatency: true,
      errorRate: browserType === "firefox" ? 0.05 : 0.02, // Firefox has slightly more sync errors
    },
  );

  const mockRuntime = createMockRuntime({
    browserType,
    simulateLatency: true,
  });

  const mockEnvironment = {
    // Browser-specific globals
    chrome:
      browserType === "chrome" || browserType === "edge"
        ? {
            storage: {
              local: mockStorage,
              sync: mockSyncStorage,
              onChanged: {
                addListener: jest.fn(),
                removeListener: jest.fn(),
                hasListener: jest.fn(),
              },
            },
            runtime: mockRuntime,
          }
        : undefined,

    browser:
      browserType === "firefox" || browserType === "edge"
        ? {
            storage: {
              local: mockStorage,
              sync: mockSyncStorage,
              onChanged: {
                addListener: jest.fn(),
                removeListener: jest.fn(),
                hasListener: jest.fn(),
              },
            },
            runtime: mockRuntime,
          }
        : undefined,

    navigator: {
      userAgent: {
        chrome:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124",
        firefox:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
        edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59",
      }[browserType],
    },

    // Cleanup function
    cleanup: () => {
      mockRuntime._clearListeners();
      mockRuntime._clearError();
    },
  };

  return mockEnvironment;
}

module.exports = {
  createMockStorage,
  createMockRuntime,
  generateTestSettings,
  createValidationTestSuite,
  delay,
  testPerformance,
  createMockBrowserEnvironment,
};
