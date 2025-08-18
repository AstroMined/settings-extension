/**
 * Performance Benchmarks and Stress Testing for Storage Operations
 * Tests high-load scenarios and validates Story 003 implementation performance
 */

const { performance } = require("perf_hooks");

// Mock globals for testing environment
global.StorageLogger = class MockStorageLogger {
  constructor() {
    this.logs = [];
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
    };
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
    return this.metrics;
  }

  clear() {
    this.logs = [];
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
    };
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
const StorageOperationManager = require("../../src/lib/storage-operation-manager.js");

describe("Storage Performance Benchmarks", () => {
  let mockBrowserAPI;
  let manager;

  beforeEach(() => {
    // Create mock browserAPI with performance tracking
    mockBrowserAPI = {
      storage: {
        local: {
          set: jest.fn().mockImplementation(async (_data) => {
            // Simulate realistic storage delay (1-10ms)
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 10),
            );
            return Promise.resolve();
          }),
          get: jest.fn().mockImplementation(async (_keys) => {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 5),
            );
            return Promise.resolve({});
          }),
          remove: jest.fn().mockImplementation(async (_keys) => {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 5),
            );
            return Promise.resolve();
          }),
          clear: jest.fn().mockImplementation(async () => {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 10),
            );
            return Promise.resolve();
          }),
          getBytesInUse: jest.fn().mockImplementation(async (_keys) => {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 3),
            );
            return Promise.resolve(Math.floor(Math.random() * 1000));
          }),
        },
      },
    };

    jest.useRealTimers(); // Use real timers for performance testing
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
  });

  describe("High-Volume Operation Benchmarks", () => {
    test("should handle 1000 concurrent operations efficiently", async () => {
      manager = new StorageOperationManager(mockBrowserAPI, {
        maxQueueSize: 2000, // Increase queue size for stress test
      });

      const startTime = performance.now();
      const operations = [];

      // Generate 1000 operations
      for (let i = 0; i < 1000; i++) {
        operations.push(
          manager.queueOperation({
            type: "set",
            data: { [`stress_test_${i}`]: `value_${i}` },
          }),
        );
      }

      // Wait for all operations to complete
      const results = await Promise.all(operations);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const operationsPerSecond = 1000 / (duration / 1000);

      // Performance assertions
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(operationsPerSecond).toBeGreaterThan(50); // At least 50 ops/sec
      expect(results.every((r) => r.success)).toBe(true);

      // Memory efficiency check
      const queueStatus = manager.getQueueStatus();
      expect(queueStatus.queueLength).toBe(0); // Queue should be empty

      console.log(`✅ 1000 operations completed in ${duration.toFixed(2)}ms`);
      console.log(
        `✅ Throughput: ${operationsPerSecond.toFixed(2)} operations/second`,
      );
    }, 60000); // 60 second timeout for stress test

    test("should maintain performance under mixed operation types", async () => {
      manager = new StorageOperationManager(mockBrowserAPI, {
        maxQueueSize: 1000, // Increase for mixed operations test
      });

      const operationTypes = ["set", "get", "remove", "getBytesInUse"];
      const operations = [];
      const startTime = performance.now();

      // Generate 500 mixed operations
      for (let i = 0; i < 500; i++) {
        const type = operationTypes[i % operationTypes.length];
        let operation;

        switch (type) {
          case "set":
            operation = { type, data: { [`mixed_${i}`]: `value_${i}` } };
            break;
          case "get":
            operation = { type, keys: [`mixed_${i}`] };
            break;
          case "remove":
            operation = { type, keys: [`mixed_${i}`] };
            break;
          case "getBytesInUse":
            operation = { type, keys: [`mixed_${i}`] };
            break;
        }

        operations.push(manager.queueOperation(operation));
      }

      const results = await Promise.all(operations);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
      expect(results.every((r) => r.success)).toBe(true);

      console.log(
        `✅ 500 mixed operations completed in ${duration.toFixed(2)}ms`,
      );
    }, 30000);

    test("should handle large data payloads efficiently", async () => {
      manager = new StorageOperationManager(mockBrowserAPI);

      const largeData = "x".repeat(10000); // 10KB string
      const operations = [];
      const startTime = performance.now();

      // Generate 100 operations with large data
      for (let i = 0; i < 100; i++) {
        operations.push(
          manager.queueOperation({
            type: "set",
            data: { [`large_data_${i}`]: largeData },
          }),
        );
      }

      const results = await Promise.all(operations);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const dataProcessed = 100 * 10000; // 100 operations * 10KB each

      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      expect(results.every((r) => r.success)).toBe(true);

      console.log(
        `✅ ${dataProcessed} bytes processed in ${duration.toFixed(2)}ms`,
      );
      console.log(
        `✅ Data throughput: ${((dataProcessed / duration) * 1000).toFixed(2)} bytes/second`,
      );
    }, 20000);
  });

  describe("Concurrency Stress Tests", () => {
    test("should prevent race conditions under extreme load", async () => {
      manager = new StorageOperationManager(mockBrowserAPI, {
        maxQueueSize: 300, // Increase for stress test
      });

      const executionOrder = [];
      mockBrowserAPI.storage.local.set = jest
        .fn()
        .mockImplementation(async (data) => {
          const key = Object.keys(data)[0];
          executionOrder.push(key);
          // Simulate variable processing time
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 20),
          );
          return Promise.resolve();
        });

      const operations = [];

      // Launch 200 operations simultaneously (stress test for race conditions)
      for (let i = 0; i < 200; i++) {
        operations.push(
          manager.queueOperation({
            type: "set",
            data: { [`concurrent_${i}`]: `value_${i}` },
          }),
        );
      }

      const results = await Promise.all(operations);

      // Verify all operations succeeded
      expect(results.every((r) => r.success)).toBe(true);
      expect(executionOrder.length).toBe(200);

      // Verify sequential execution (no race conditions)
      for (let i = 0; i < 200; i++) {
        expect(executionOrder[i]).toBe(`concurrent_${i}`);
      }

      console.log(
        "✅ 200 concurrent operations executed sequentially without race conditions",
      );
    }, 30000);

    test("should handle rapid queue additions and processing", async () => {
      manager = new StorageOperationManager(mockBrowserAPI);

      const results = [];
      const startTime = performance.now();

      // Rapidly add operations while processing is happening
      const addOperations = async () => {
        for (let i = 0; i < 100; i++) {
          const promise = manager.queueOperation({
            type: "set",
            data: { [`rapid_${i}`]: `value_${i}` },
          });
          results.push(promise);

          // Very small delay to simulate rapid UI interactions
          if (i % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1));
          }
        }
      };

      await addOperations();
      const allResults = await Promise.all(results);
      const endTime = performance.now();

      expect(allResults.every((r) => r.success)).toBe(true);
      expect(allResults.length).toBe(100);

      const duration = endTime - startTime;
      console.log(
        `✅ Rapid queue operations completed in ${duration.toFixed(2)}ms`,
      );
    }, 15000);
  });

  describe("Memory and Resource Management", () => {
    test("should not leak memory during extended operation", async () => {
      manager = new StorageOperationManager(mockBrowserAPI, {
        maxQueueSize: 1000,
      });

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform multiple rounds of operations
      for (let round = 0; round < 5; round++) {
        const operations = [];

        for (let i = 0; i < 100; i++) {
          operations.push(
            manager.queueOperation({
              type: "set",
              data: { [`memory_test_${round}_${i}`]: `data_${i}` },
            }),
          );
        }

        await Promise.all(operations);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (less than 50MB)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);

      console.log(
        `✅ Memory growth after 500 operations: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`,
      );
    }, 20000);

    test("should efficiently manage queue under sustained load", async () => {
      manager = new StorageOperationManager(mockBrowserAPI);

      const queueSizes = [];
      const startTime = performance.now();

      // Monitor queue size during sustained load
      const monitorQueue = setInterval(() => {
        queueSizes.push(manager.getQueueStatus().queueLength);
      }, 100);

      // Add operations continuously for 2 seconds
      const endTime = Date.now() + 2000;
      let operationCount = 0;

      while (Date.now() < endTime) {
        manager.queueOperation({
          type: "set",
          data: {
            [`sustained_${operationCount++}`]: `value_${operationCount}`,
          },
        });

        // Small delay to simulate realistic load
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Wait for queue to drain
      await new Promise((resolve) => {
        const checkQueue = () => {
          if (manager.getQueueStatus().queueLength === 0) {
            clearInterval(monitorQueue);
            resolve();
          } else {
            setTimeout(checkQueue, 100);
          }
        };
        checkQueue();
      });

      const finalTime = performance.now();
      const maxQueueSize = Math.max(...queueSizes);

      // Queue should not grow unbounded
      expect(maxQueueSize).toBeLessThan(manager.config.maxQueueSize);

      console.log(
        `✅ Sustained load test: ${operationCount} operations in ${(finalTime - startTime).toFixed(2)}ms`,
      );
      console.log(`✅ Maximum queue size: ${maxQueueSize}`);
    }, 10000);
  });

  describe("Error Handling Performance", () => {
    test("should handle high failure rates efficiently", async () => {
      manager = new StorageOperationManager(mockBrowserAPI, {
        maxRetries: 2,
      });

      let failureCount = 0;
      mockBrowserAPI.storage.local.set = jest
        .fn()
        .mockImplementation(async () => {
          failureCount++;
          // Fail 50% of operations
          if (failureCount % 2 === 0) {
            throw new Error("Simulated failure");
          }
          await new Promise((resolve) => setTimeout(resolve, 5));
          return Promise.resolve();
        });

      const operations = [];
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        operations.push(
          manager
            .queueOperation({
              type: "set",
              data: { [`failure_test_${i}`]: `value_${i}` },
            })
            .catch((error) => ({ error: error.message })),
        );
      }

      const results = await Promise.all(operations);
      const endTime = performance.now();

      const successCount = results.filter((r) => r.success).length;
      const failureResults = results.filter((r) => r.error).length;

      expect(successCount + failureResults).toBe(100);
      expect(endTime - startTime).toBeLessThan(12000); // Should handle failures reasonably quickly

      console.log(
        `✅ High failure rate handled: ${successCount} successes, ${failureResults} failures`,
      );
      console.log(
        `✅ Error handling time: ${(endTime - startTime).toFixed(2)}ms`,
      );
    }, 15000);
  });

  describe("Real-World Scenario Simulations", () => {
    test("should handle typical user interaction patterns", async () => {
      manager = new StorageOperationManager(mockBrowserAPI);

      const scenarios = [
        // Burst of rapid typing (settings changes)
        async () => {
          const operations = [];
          for (let i = 0; i < 20; i++) {
            operations.push(
              manager.queueOperation({
                type: "set",
                data: { api_key: `typing_${i}` },
              }),
            );
            await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms between keystrokes
          }
          return Promise.all(operations);
        },

        // Batch import operation
        async () => {
          const batchData = {};
          for (let i = 0; i < 50; i++) {
            batchData[`imported_setting_${i}`] = `imported_value_${i}`;
          }
          return manager.queueOperation({
            type: "set",
            data: batchData,
          });
        },

        // Settings validation (multiple reads)
        async () => {
          const operations = [];
          for (let i = 0; i < 10; i++) {
            operations.push(
              manager.queueOperation({
                type: "get",
                keys: [`setting_${i}`],
              }),
            );
          }
          return Promise.all(operations);
        },
      ];

      const startTime = performance.now();
      const results = await Promise.all(
        scenarios.map((scenario) => scenario()),
      );
      const endTime = performance.now();

      // Verify all scenarios completed successfully
      expect(
        results.every((result) =>
          Array.isArray(result)
            ? result.every((r) => r.success)
            : result.success,
        ),
      ).toBe(true);

      const duration = endTime - startTime;
      console.log(
        `✅ Real-world scenarios completed in ${duration.toFixed(2)}ms`,
      );
    }, 20000);

    test("should maintain performance during background processing", async () => {
      manager = new StorageOperationManager(mockBrowserAPI);

      // Simulate background sync operations
      const backgroundOperations = [];
      for (let i = 0; i < 30; i++) {
        backgroundOperations.push(
          manager.queueOperation(
            {
              type: "set",
              data: { [`bg_sync_${i}`]: `background_data_${i}` },
            },
            manager.PRIORITY.LOW,
          ),
        );
      }

      // Simulate foreground user interactions (higher priority)
      const foregroundOperations = [];
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50)); // User thinks and types
        foregroundOperations.push(
          manager.queueOperation(
            {
              type: "set",
              data: { user_setting: `user_value_${i}` },
            },
            manager.PRIORITY.HIGH,
          ),
        );
      }

      const startTime = performance.now();
      await Promise.all([...backgroundOperations, ...foregroundOperations]);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // Should prioritize efficiently

      console.log(
        `✅ Background processing with user interactions: ${duration.toFixed(2)}ms`,
      );
    }, 10000);
  });

  describe("Performance Regression Tests", () => {
    test("should meet baseline performance requirements", async () => {
      manager = new StorageOperationManager(mockBrowserAPI);

      // Baseline: 100 simple operations should complete quickly
      const operations = [];
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        operations.push(
          manager.queueOperation({
            type: "set",
            data: { [`baseline_${i}`]: `value_${i}` },
          }),
        );
      }

      await Promise.all(operations);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgLatency = duration / 100;

      // Performance requirements
      expect(duration).toBeLessThan(3000); // Total time < 3 seconds
      expect(avgLatency).toBeLessThan(30); // Average latency < 30ms per operation

      console.log(
        `✅ Baseline performance: ${duration.toFixed(2)}ms total, ${avgLatency.toFixed(2)}ms average`,
      );

      // Store baseline for comparison
      const metrics = manager.getMetrics();
      expect(metrics.queue).toBeDefined();
      if (metrics.queue.averageLatency !== undefined) {
        expect(metrics.queue.averageLatency).toBeGreaterThan(0);
      }
    }, 10000);

    test("should scale linearly with operation count", async () => {
      const testSizes = [10, 50, 100];
      const results = [];

      for (const size of testSizes) {
        manager = new StorageOperationManager(mockBrowserAPI);

        const operations = [];
        const startTime = performance.now();

        for (let i = 0; i < size; i++) {
          operations.push(
            manager.queueOperation({
              type: "set",
              data: { [`scale_${size}_${i}`]: `value_${i}` },
            }),
          );
        }

        await Promise.all(operations);
        const endTime = performance.now();

        const duration = endTime - startTime;
        const avgLatency = duration / size;

        results.push({ size, duration, avgLatency });
        manager.destroy();
      }

      // Verify roughly linear scaling
      const latencies = results.map((r) => r.avgLatency);
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);

      // Latency shouldn't increase dramatically with scale
      expect(maxLatency / minLatency).toBeLessThan(3); // Max 3x variation

      console.log("✅ Scaling performance:", results);
    }, 15000);
  });
});

describe("Storage Component Integration Performance", () => {
  let mockBrowserAPI;
  let manager;

  beforeEach(() => {
    mockBrowserAPI = {
      storage: {
        local: {
          set: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue({}),
          remove: jest.fn().mockResolvedValue(undefined),
        },
      },
    };

    jest.useRealTimers();
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
  });

  test("should integrate efficiently with error handling and logging", async () => {
    manager = new StorageOperationManager(mockBrowserAPI);

    let errorCount = 0;
    mockBrowserAPI.storage.local.set = jest
      .fn()
      .mockImplementation(async () => {
        errorCount++;
        if (errorCount <= 50) {
          // First 50 operations fail
          throw new Error("Integration test error");
        }
        return Promise.resolve();
      });

    const operations = [];
    const startTime = performance.now();

    // 100 operations, first 50 will fail and retry
    for (let i = 0; i < 100; i++) {
      operations.push(
        manager
          .queueOperation({
            type: "set",
            data: { [`integration_${i}`]: `value_${i}` },
          })
          .catch((error) => ({ error: error.message })),
      );
    }

    const results = await Promise.all(operations);
    const endTime = performance.now();

    const duration = endTime - startTime;
    const successCount = results.filter((r) => r.success).length;

    expect(duration).toBeLessThan(10000); // Integration overhead should be reasonable
    expect(successCount).toBeGreaterThanOrEqual(50); // At least 50 should succeed (retry logic may cause more successes)

    // Check that logger captured the activity
    const metrics = manager.logger.getMetrics();
    expect(metrics).toBeDefined();
    if (metrics.totalLogs !== undefined) {
      expect(metrics.totalLogs).toBeGreaterThan(0);
    } else if (manager.logger.logs) {
      expect(manager.logger.logs.length).toBeGreaterThan(0);
    }

    console.log(
      `✅ Integration test: ${duration.toFixed(2)}ms, ${successCount} successes`,
    );
  }, 15000);
});
