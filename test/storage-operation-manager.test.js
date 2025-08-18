/**
 * Unit tests for StorageOperationManager
 * Tests the core operation queuing and race condition prevention logic
 */

// Mock globals for testing environment
global.StorageLogger = class MockStorageLogger {
  constructor() {
    this.logs = [];
  }

  info(...args) {
    this.logs.push({ level: "info", args });
  }
  warn(...args) {
    this.logs.push({ level: "warn", args });
  }
  error(...args) {
    this.logs.push({ level: "error", args });
  }
  debug(...args) {
    this.logs.push({ level: "debug", args });
  }
  startOperation(...args) {
    this.logs.push({ level: "startOperation", args });
  }
  endOperation(...args) {
    this.logs.push({ level: "endOperation", args });
  }
  logRetry(...args) {
    this.logs.push({ level: "logRetry", args });
  }
  logQueueStatus(...args) {
    this.logs.push({ level: "logQueueStatus", args });
  }

  getMetrics() {
    return { totalLogs: this.logs.length };
  }

  clear() {
    this.logs = [];
  }
};

global.StorageErrors = {
  createStorageError: (error, operation, context) => {
    const storageError = new Error(error.message);
    storageError.retryable =
      !error.message.includes("quota") && !error.message.includes("permission");
    storageError.operation = operation;
    storageError.context = context;
    return storageError;
  },

  isRetryableError: (error) => {
    return error.retryable !== false;
  },

  getRetryDelay: (attempt, _error) => {
    return Math.min(100 * Math.pow(2, attempt), 5000);
  },
};

// Import the class under test
const StorageOperationManager = require("../src/lib/storage-operation-manager.js");

describe("StorageOperationManager", () => {
  let mockBrowserAPI;
  let manager;

  beforeEach(() => {
    // Create mock browserAPI
    mockBrowserAPI = {
      storage: {
        local: {
          set: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue({}),
          remove: jest.fn().mockResolvedValue(undefined),
          clear: jest.fn().mockResolvedValue(undefined),
          getBytesInUse: jest.fn().mockResolvedValue(100),
        },
      },
    };

    // Clear any existing timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
    jest.useRealTimers();
  });

  describe("Constructor and Initialization", () => {
    test("should initialize with default configuration", () => {
      manager = new StorageOperationManager(mockBrowserAPI);

      expect(manager.config.maxRetries).toBe(3);
      expect(manager.config.baseRetryDelay).toBe(100);
      expect(manager.config.maxRetryDelay).toBe(5000);
      expect(manager.config.operationTimeout).toBe(10000);
      expect(manager.config.maxQueueSize).toBe(100);
      expect(manager.operationQueue).toEqual([]);
      expect(manager.isProcessing).toBe(false);
    });

    test("should initialize with custom configuration", () => {
      const customConfig = {
        maxRetries: 5,
        baseRetryDelay: 200,
        maxRetryDelay: 8000,
        operationTimeout: 15000,
        maxQueueSize: 50,
      };

      manager = new StorageOperationManager(mockBrowserAPI, customConfig);

      expect(manager.config.maxRetries).toBe(5);
      expect(manager.config.baseRetryDelay).toBe(200);
      expect(manager.config.maxRetryDelay).toBe(8000);
      expect(manager.config.operationTimeout).toBe(15000);
      expect(manager.config.maxQueueSize).toBe(50);
    });

    test("should initialize logger when available", () => {
      manager = new StorageOperationManager(mockBrowserAPI);

      expect(manager.logger).toBeDefined();
      expect(manager.logger.logs).toBeDefined();
    });

    test("should handle missing StorageErrors gracefully", () => {
      const originalStorageErrors = global.StorageErrors;
      global.StorageErrors = undefined;

      manager = new StorageOperationManager(mockBrowserAPI);

      expect(manager.StorageErrors).toBeNull();

      global.StorageErrors = originalStorageErrors;
    });
  });

  describe("Operation Queuing", () => {
    beforeEach(() => {
      manager = new StorageOperationManager(mockBrowserAPI);
    });

    test("should queue operation successfully", async () => {
      const operation = {
        type: "set",
        data: { key1: "value1" },
      };

      const promise = manager.queueOperation(operation);

      expect(manager.operationQueue.length).toBe(1);
      expect(manager.operationQueue[0].operation).toBe(operation);
      expect(manager.operationQueue[0].priority).toBe(manager.PRIORITY.NORMAL);

      // Process the queue
      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result.success).toBe(true);
      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalledWith({
        key1: "value1",
      });
    });

    test("should handle priority-based queuing", async () => {
      const operations = [
        { type: "set", data: { low: "priority" } },
        { type: "set", data: { high: "priority" } },
        { type: "set", data: { critical: "priority" } },
      ];

      // Queue with different priorities
      const promises = [
        manager.queueOperation(operations[0], manager.PRIORITY.LOW),
        manager.queueOperation(operations[1], manager.PRIORITY.HIGH),
        manager.queueOperation(operations[2], manager.PRIORITY.CRITICAL),
      ];

      // Check queue order (should be sorted by priority)
      expect(manager.operationQueue.length).toBe(3);
      expect(manager.operationQueue[0].priority).toBe(
        manager.PRIORITY.CRITICAL,
      );
      expect(manager.operationQueue[1].priority).toBe(manager.PRIORITY.HIGH);
      expect(manager.operationQueue[2].priority).toBe(manager.PRIORITY.LOW);

      await jest.runAllTimersAsync();
      await Promise.all(promises);
    });

    test("should reject operations when queue is full", async () => {
      manager = new StorageOperationManager(mockBrowserAPI, {
        maxQueueSize: 2,
      });

      const operations = [
        { type: "set", data: { key1: "value1" } },
        { type: "set", data: { key2: "value2" } },
        { type: "set", data: { key3: "value3" } }, // This should fail
      ];

      // Fill the queue
      manager.queueOperation(operations[0]);
      manager.queueOperation(operations[1]);

      // Third operation should be rejected
      await expect(manager.queueOperation(operations[2])).rejects.toThrow(
        "Operation queue is full",
      );
    });

    test("should process operations sequentially", async () => {
      const callOrder = [];

      mockBrowserAPI.storage.local.set = jest
        .fn()
        .mockImplementation((data) => {
          callOrder.push(Object.keys(data)[0]);
          return Promise.resolve();
        });

      const operations = [
        { type: "set", data: { first: "value1" } },
        { type: "set", data: { second: "value2" } },
        { type: "set", data: { third: "value3" } },
      ];

      const promises = operations.map((op) => manager.queueOperation(op));

      await jest.runAllTimersAsync();
      await Promise.all(promises);

      expect(callOrder).toEqual(["first", "second", "third"]);
      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalledTimes(3);
    });
  });

  describe("Storage Operations", () => {
    beforeEach(() => {
      manager = new StorageOperationManager(mockBrowserAPI);
    });

    test("should handle set operations", async () => {
      const operation = {
        type: "set",
        data: { testKey: "testValue" },
      };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.keys).toEqual(["testKey"]);
      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalledWith({
        testKey: "testValue",
      });
    });

    test("should handle get operations", async () => {
      mockBrowserAPI.storage.local.get.mockResolvedValue({
        testKey: "testValue",
      });

      const operation = {
        type: "get",
        keys: ["testKey"],
      };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ testKey: "testValue" });
      expect(mockBrowserAPI.storage.local.get).toHaveBeenCalledWith([
        "testKey",
      ]);
    });

    test("should handle remove operations", async () => {
      const operation = {
        type: "remove",
        keys: ["testKey"],
      };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.removedKeys).toEqual(["testKey"]);
      expect(mockBrowserAPI.storage.local.remove).toHaveBeenCalledWith([
        "testKey",
      ]);
    });

    test("should handle clear operations", async () => {
      const operation = { type: "clear" };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.operation).toBe("clear");
      expect(mockBrowserAPI.storage.local.clear).toHaveBeenCalled();
    });

    test("should handle getBytesInUse operations", async () => {
      const operation = {
        type: "getBytesInUse",
        keys: ["testKey"],
      };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.bytesInUse).toBe(100);
      expect(mockBrowserAPI.storage.local.getBytesInUse).toHaveBeenCalledWith([
        "testKey",
      ]);
    });

    test("should reject unknown operation types", async () => {
      const operation = { type: "unknown" };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();

      await expect(promise).rejects.toThrow(
        "Unknown storage operation type: unknown",
      );
    });

    test("should handle different storage areas", async () => {
      mockBrowserAPI.storage.sync = {
        set: jest.fn().mockResolvedValue(undefined),
      };

      const operation = {
        type: "set",
        data: { testKey: "testValue" },
        storageArea: "sync",
      };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();
      await promise;

      expect(mockBrowserAPI.storage.sync.set).toHaveBeenCalledWith({
        testKey: "testValue",
      });
    });
  });

  describe("Error Handling and Retry Logic", () => {
    beforeEach(() => {
      manager = new StorageOperationManager(mockBrowserAPI, { maxRetries: 2 });
    });

    test("should retry transient failures", async () => {
      let attempts = 0;
      mockBrowserAPI.storage.local.set = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts <= 2) {
          return Promise.reject(new Error("Transient failure"));
        }
        return Promise.resolve();
      });

      const operation = {
        type: "set",
        data: { testKey: "testValue" },
      };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalledTimes(3);
    });

    test("should not retry non-retryable errors", async () => {
      mockBrowserAPI.storage.local.set = jest
        .fn()
        .mockRejectedValue(new Error("Quota exceeded"));

      const operation = {
        type: "set",
        data: { testKey: "testValue" },
      };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();

      await expect(promise).rejects.toThrow("Quota exceeded");
      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalledTimes(1);
    });

    test("should fail after max retries", async () => {
      mockBrowserAPI.storage.local.set = jest
        .fn()
        .mockRejectedValue(new Error("Persistent failure"));

      const operation = {
        type: "set",
        data: { testKey: "testValue" },
      };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();

      await expect(promise).rejects.toThrow("Persistent failure");
      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test("should implement exponential backoff", async () => {
      const delays = [];
      let attempts = 0;

      // Mock setTimeout to capture delays
      const originalSetTimeout = setTimeout;
      global.setTimeout = jest.fn().mockImplementation((fn, delay) => {
        if (delay > 0) delays.push(delay);
        return originalSetTimeout(fn, 0);
      });

      mockBrowserAPI.storage.local.set = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts <= 2) {
          return Promise.reject(new Error("Transient failure"));
        }
        return Promise.resolve();
      });

      const operation = {
        type: "set",
        data: { testKey: "testValue" },
      };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();
      await promise;

      expect(delays.length).toBe(2); // Two retry delays
      expect(delays[0]).toBeLessThan(delays[1]); // Exponential backoff

      global.setTimeout = originalSetTimeout;
    });

    test("should handle operation timeout", async () => {
      manager = new StorageOperationManager(mockBrowserAPI, {
        operationTimeout: 100,
      });

      mockBrowserAPI.storage.local.set = jest.fn().mockImplementation(() => {
        return new Promise(() => {}); // Never resolves
      });

      const operation = {
        type: "set",
        data: { testKey: "testValue" },
      };

      const promise = manager.queueOperation(operation);

      // Advance time to trigger timeout
      jest.advanceTimersByTime(150);

      await expect(promise).rejects.toThrow("Operation timeout after 100ms");
    });
  });

  describe("Concurrency and Race Condition Prevention", () => {
    beforeEach(() => {
      manager = new StorageOperationManager(mockBrowserAPI);
    });

    test("should process multiple operations sequentially", async () => {
      const executionOrder = [];

      mockBrowserAPI.storage.local.set = jest
        .fn()
        .mockImplementation((data) => {
          const key = Object.keys(data)[0];
          executionOrder.push(key);
          // Simulate async delay
          return new Promise((resolve) => setTimeout(resolve, 10));
        });

      const operations = Array.from({ length: 10 }, (_, i) => ({
        type: "set",
        data: { [`key${i}`]: `value${i}` },
      }));

      const promises = operations.map((op) => manager.queueOperation(op));

      await jest.runAllTimersAsync();
      await Promise.all(promises);

      // Verify sequential execution
      expect(executionOrder).toEqual([
        "key0",
        "key1",
        "key2",
        "key3",
        "key4",
        "key5",
        "key6",
        "key7",
        "key8",
        "key9",
      ]);
    });

    test("should handle concurrent queueing without race conditions", async () => {
      const results = [];

      mockBrowserAPI.storage.local.set = jest
        .fn()
        .mockImplementation((data) => {
          const key = Object.keys(data)[0];
          results.push(key);
          return Promise.resolve();
        });

      // Simulate concurrent calls
      const promises = Array.from({ length: 50 }, (_, i) =>
        manager.queueOperation({
          type: "set",
          data: { [`concurrent${i}`]: `value${i}` },
        }),
      );

      await jest.runAllTimersAsync();
      await Promise.all(promises);

      expect(results.length).toBe(50);
      expect(new Set(results).size).toBe(50); // All unique
    });

    test("should maintain queue integrity under load", async () => {
      const operations = [];

      // Queue many operations rapidly
      for (let i = 0; i < 100; i++) {
        operations.push(
          manager.queueOperation({
            type: "set",
            data: { [`load${i}`]: `value${i}` },
          }),
        );
      }

      expect(manager.operationQueue.length).toBe(100);

      await jest.runAllTimersAsync();
      await Promise.all(operations);

      expect(manager.operationQueue.length).toBe(0);
      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalledTimes(100);
    });
  });

  describe("Service Worker Context Monitoring", () => {
    beforeEach(() => {
      manager = new StorageOperationManager(mockBrowserAPI);
    });

    test("should validate context before operations", async () => {
      const operation = {
        type: "set",
        data: { testKey: "testValue" },
      };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result.success).toBe(true);
      expect(manager.contextInfo.isValid).toBe(true);
    });

    test("should detect stale context", async () => {
      // Mock stale context
      manager.contextInfo.contextAge = Date.now() - 400000; // 6+ minutes old
      manager.contextInfo.lastKeepAlive = Date.now() - 60000; // 1 minute since keep-alive

      mockBrowserAPI.storage.local.get = jest
        .fn()
        .mockRejectedValue(new Error("Context invalidated"));

      const operation = {
        type: "set",
        data: { testKey: "testValue" },
      };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();

      await expect(promise).rejects.toThrow(
        "Service worker context invalidated",
      );
    });

    test("should update context on successful operations", async () => {
      const initialKeepAlive = manager.contextInfo.lastKeepAlive;

      const operation = {
        type: "get",
        keys: ["__context_test__"],
      };

      const promise = manager.queueOperation(operation);

      // Advance time slightly
      jest.advanceTimersByTime(1000);

      await jest.runAllTimersAsync();
      await promise;

      expect(manager.contextInfo.lastKeepAlive).toBeGreaterThan(
        initialKeepAlive,
      );
    });
  });

  describe("Performance and Statistics", () => {
    beforeEach(() => {
      manager = new StorageOperationManager(mockBrowserAPI);
    });

    test("should track queue statistics", async () => {
      const operations = Array.from({ length: 5 }, (_, i) => ({
        type: "set",
        data: { [`stat${i}`]: `value${i}` },
      }));

      const promises = operations.map((op) => manager.queueOperation(op));

      // Check high water mark
      expect(manager.queueStats.queueHighWaterMark).toBe(5);

      await jest.runAllTimersAsync();
      await Promise.all(promises);

      expect(manager.queueStats.totalProcessed).toBe(5);
      expect(manager.queueStats.totalFailed).toBe(0);
      expect(manager.queueStats.averageLatency).toBeGreaterThan(0);
    });

    test("should track failure statistics", async () => {
      mockBrowserAPI.storage.local.set = jest
        .fn()
        .mockRejectedValue(new Error("Test failure"));

      const operation = {
        type: "set",
        data: { testKey: "testValue" },
      };

      const promise = manager.queueOperation(operation);
      await jest.runAllTimersAsync();

      await expect(promise).rejects.toThrow("Test failure");
      expect(manager.queueStats.totalFailed).toBe(1);
    });

    test("should provide queue status", () => {
      const operation = {
        type: "set",
        data: { testKey: "testValue" },
      };

      manager.queueOperation(operation);

      const status = manager.getQueueStatus();

      expect(status.queueLength).toBe(1);
      expect(status.isProcessing).toBe(false);
      expect(status.stats).toBeDefined();
      expect(status.config).toBeDefined();
      expect(status.contextInfo).toBeDefined();
    });

    test("should provide metrics", () => {
      const metrics = manager.getMetrics();

      expect(metrics.queue).toBeDefined();
      expect(metrics.logger).toBeDefined();
    });
  });

  describe("Cleanup and Resource Management", () => {
    beforeEach(() => {
      manager = new StorageOperationManager(mockBrowserAPI);
    });

    test("should clear queue on destroy", () => {
      const operations = Array.from({ length: 3 }, (_, i) => ({
        type: "set",
        data: { [`cleanup${i}`]: `value${i}` },
      }));

      operations.forEach((op) => manager.queueOperation(op));
      expect(manager.operationQueue.length).toBe(3);

      manager.destroy();
      expect(manager.operationQueue.length).toBe(0);
      expect(manager.isProcessing).toBe(false);
    });

    test("should clear queue manually", () => {
      const operations = Array.from({ length: 3 }, (_, i) => ({
        type: "set",
        data: { [`manual${i}`]: `value${i}` },
      }));

      const promises = operations.map((op) => manager.queueOperation(op));
      expect(manager.operationQueue.length).toBe(3);

      manager.clearQueue(true);
      expect(manager.operationQueue.length).toBe(0);

      // All promises should be rejected
      promises.forEach((promise) => {
        expect(promise).rejects.toThrow("Operation queue cleared");
      });
    });

    test("should force process queue", async () => {
      const operation = {
        type: "set",
        data: { testKey: "testValue" },
      };

      manager.queueOperation(operation);
      expect(manager.operationQueue.length).toBe(1);

      await manager.forceProcessQueue();
      await jest.runAllTimersAsync();

      expect(manager.operationQueue.length).toBe(0);
      expect(mockBrowserAPI.storage.local.set).toHaveBeenCalled();
    });
  });
});
