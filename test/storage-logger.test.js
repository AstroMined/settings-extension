/**
 * Unit tests for StorageLogger
 * Tests logging functionality, metrics tracking, and performance monitoring
 */

// Import the module under test
const fs = require("fs");
const path = require("path");

// Load the StorageLogger module
const storageLoggerPath = path.join(__dirname, "../src/lib/storage-logger.js");
const storageLoggerCode = fs.readFileSync(storageLoggerPath, "utf8");

// Execute the code to get the StorageLogger class
let StorageLogger;
eval(storageLoggerCode);

// Get the exported StorageLogger
if (typeof module !== "undefined" && module.exports) {
  StorageLogger = module.exports;
} else if (typeof global !== "undefined" && global.StorageLogger) {
  StorageLogger = global.StorageLogger;
} else if (typeof window !== "undefined" && window.StorageLogger) {
  StorageLogger = window.StorageLogger;
}

describe("StorageLogger", () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, "log").mockImplementation(),
      warn: jest.spyOn(console, "warn").mockImplementation(),
      error: jest.spyOn(console, "error").mockImplementation(),
      debug: jest.spyOn(console, "debug").mockImplementation(),
      info: jest.spyOn(console, "info").mockImplementation(),
    };

    // Mock performance.now()
    global.performance = {
      now: jest.fn().mockReturnValue(1000),
    };

    logger = new StorageLogger();
  });

  afterEach(() => {
    // Restore console methods
    Object.values(consoleSpy).forEach((spy) => spy.mockRestore());

    if (logger) {
      logger.clear();
    }
  });

  describe("Constructor and Configuration", () => {
    test("should initialize with default configuration", () => {
      expect(logger.config.maxLogs).toBe(1000);
      expect(logger.config.debugMode).toBe(false);
      expect(logger.config.enableMetrics).toBe(true);
      expect(logger.config.enableSanitization).toBe(true);
      expect(logger.logs).toEqual([]);
      expect(logger.metrics).toBeDefined();
    });

    test("should initialize with custom configuration", () => {
      const customLogger = new StorageLogger({
        maxLogs: 500,
        debugMode: true,
        enableMetrics: false,
        enableSanitization: false,
      });

      expect(customLogger.config.maxLogs).toBe(500);
      expect(customLogger.config.debugMode).toBe(true);
      expect(customLogger.config.enableMetrics).toBe(false);
      expect(customLogger.config.enableSanitization).toBe(false);
    });

    test("should detect service worker context", () => {
      // Mock service worker context
      global.self = { constructor: { name: "ServiceWorkerGlobalScope" } };
      global.window = undefined;

      const swLogger = new StorageLogger();
      expect(swLogger.context.isServiceWorker).toBe(true);

      // Cleanup
      delete global.self;
    });

    test("should detect extension context", () => {
      // Mock extension context
      global.chrome = { runtime: { id: "test-extension" } };

      const extLogger = new StorageLogger();
      expect(extLogger.context.isExtension).toBe(true);

      // Cleanup
      delete global.chrome;
    });
  });

  describe("Basic Logging Methods", () => {
    test("should log info messages", () => {
      logger.info("Test info message", { data: "test" });

      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].level).toBe("info");
      expect(logger.logs[0].message).toBe("Test info message");
      expect(logger.logs[0].data).toEqual({ data: "test" });
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    test("should log warning messages", () => {
      logger.warn("Test warning message", { warning: true });

      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].level).toBe("warn");
      expect(logger.logs[0].message).toBe("Test warning message");
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    test("should log error messages", () => {
      const error = new Error("Test error");
      logger.error("Test error message", error);

      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].level).toBe("error");
      expect(logger.logs[0].message).toBe("Test error message");
      expect(logger.logs[0].data).toBe(error);
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    test("should log debug messages only in debug mode", () => {
      logger.debug("Debug message");
      expect(logger.logs).toHaveLength(0); // Not in debug mode
      expect(consoleSpy.debug).not.toHaveBeenCalled();

      // Enable debug mode
      logger.config.debugMode = true;
      logger.debug("Debug message");
      expect(logger.logs).toHaveLength(1);
      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    test("should include timestamp in log entries", () => {
      const beforeTime = Date.now();
      logger.info("Test message");
      const afterTime = Date.now();

      const logEntry = logger.logs[0];
      expect(logEntry.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(logEntry.timestamp).toBeLessThanOrEqual(afterTime);
    });

    test("should include context information", () => {
      logger.info("Test message");

      const logEntry = logger.logs[0];
      expect(logEntry.context).toBeDefined();
      expect(logEntry.context.isServiceWorker).toBeDefined();
      expect(logEntry.context.isExtension).toBeDefined();
    });
  });

  describe("Operation Logging", () => {
    test("should log operation start", () => {
      const operationId = "test-op-123";
      const metadata = { type: "set", keys: ["testKey"] };

      logger.startOperation(operationId, metadata);

      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].level).toBe("operation_start");
      expect(logger.logs[0].operationId).toBe(operationId);
      expect(logger.logs[0].metadata).toEqual(metadata);
      expect(logger.activeOperations.has(operationId)).toBe(true);
    });

    test("should log operation end with success", () => {
      const operationId = "test-op-123";

      // Start operation
      logger.startOperation(operationId, { type: "set" });

      // Advance time
      performance.now.mockReturnValue(2000);

      // End operation
      logger.endOperation(operationId, true, { result: "success" });

      expect(logger.logs).toHaveLength(2);
      const endLog = logger.logs[1];
      expect(endLog.level).toBe("operation_end");
      expect(endLog.operationId).toBe(operationId);
      expect(endLog.success).toBe(true);
      expect(endLog.duration).toBe(1000); // 2000 - 1000
      expect(logger.activeOperations.has(operationId)).toBe(false);
    });

    test("should log operation end with failure", () => {
      const operationId = "test-op-123";
      const error = new Error("Operation failed");

      logger.startOperation(operationId, { type: "set" });
      logger.endOperation(operationId, false, { error });

      const endLog = logger.logs[1];
      expect(endLog.success).toBe(false);
      expect(endLog.error).toBe(error);
    });

    test("should handle orphaned operation end", () => {
      const operationId = "orphaned-op";

      logger.endOperation(operationId, true);

      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].level).toBe("operation_end");
      expect(logger.logs[0].duration).toBeNull();
    });

    test("should log retry attempts", () => {
      const operationId = "retry-op";
      const error = new Error("Transient failure");
      const delay = 500;

      logger.logRetry(operationId, 1, error, delay);

      expect(logger.logs).toHaveLength(1);
      const retryLog = logger.logs[0];
      expect(retryLog.level).toBe("retry");
      expect(retryLog.operationId).toBe(operationId);
      expect(retryLog.attempt).toBe(1);
      expect(retryLog.error).toBe(error);
      expect(retryLog.delay).toBe(delay);
    });
  });

  describe("Queue Status Logging", () => {
    test("should log queue status", () => {
      const queueStatus = {
        queueLength: 5,
        isProcessing: true,
        stats: { totalProcessed: 10 },
      };

      logger.logQueueStatus(queueStatus);

      expect(logger.logs).toHaveLength(1);
      const statusLog = logger.logs[0];
      expect(statusLog.level).toBe("queue_status");
      expect(statusLog.queueStatus).toEqual(queueStatus);
    });

    test("should track queue status changes", () => {
      logger.logQueueStatus({ queueLength: 0 });
      logger.logQueueStatus({ queueLength: 5 });
      logger.logQueueStatus({ queueLength: 0 });

      expect(logger.logs).toHaveLength(3);
      expect(logger.metrics.queueStatusChanges).toBe(3);
    });
  });

  describe("Metrics and Statistics", () => {
    test("should track operation metrics", () => {
      // Simulate multiple operations
      logger.startOperation("op1", { type: "set" });
      logger.endOperation("op1", true);

      logger.startOperation("op2", { type: "get" });
      logger.endOperation("op2", false, { error: new Error("Failed") });

      const metrics = logger.getMetrics();

      expect(metrics.totalOperations).toBe(2);
      expect(metrics.successfulOperations).toBe(1);
      expect(metrics.failedOperations).toBe(1);
      expect(metrics.operationTypes.set).toBe(1);
      expect(metrics.operationTypes.get).toBe(1);
    });

    test("should calculate average operation duration", () => {
      performance.now.mockReturnValueOnce(1000);
      logger.startOperation("op1", { type: "set" });

      performance.now.mockReturnValueOnce(1500);
      logger.endOperation("op1", true);

      performance.now.mockReturnValueOnce(2000);
      logger.startOperation("op2", { type: "set" });

      performance.now.mockReturnValueOnce(3000);
      logger.endOperation("op2", true);

      const metrics = logger.getMetrics();
      expect(metrics.averageDuration).toBe(750); // (500 + 1000) / 2
    });

    test("should track error types", () => {
      logger.error("Quota error", new Error("Quota exceeded"));
      logger.error("Permission error", new Error("Permission denied"));
      logger.error("Network error", new Error("Network failure"));

      const metrics = logger.getMetrics();
      expect(metrics.errorTypes).toBeDefined();
      expect(Object.keys(metrics.errorTypes).length).toBeGreaterThan(0);
    });

    test("should track retry statistics", () => {
      logger.logRetry("op1", 1, new Error("Error 1"), 100);
      logger.logRetry("op1", 2, new Error("Error 2"), 200);
      logger.logRetry("op2", 1, new Error("Error 3"), 100);

      const metrics = logger.getMetrics();
      expect(metrics.totalRetries).toBe(3);
      expect(metrics.retriedOperations).toBe(2); // op1 and op2
    });

    test("should provide memory usage information", () => {
      // Add many logs
      for (let i = 0; i < 100; i++) {
        logger.info(`Log message ${i}`);
      }

      const metrics = logger.getMetrics();
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage.totalLogs).toBe(100);
      expect(metrics.memoryUsage.estimatedBytes).toBeGreaterThan(0);
    });
  });

  describe("Data Sanitization", () => {
    test("should sanitize sensitive data by default", () => {
      const sensitiveData = {
        apiKey: "secret-api-key",
        password: "secret-password",
        token: "auth-token",
        normalData: "public-info",
      };

      logger.info("Test message", sensitiveData);

      const logEntry = logger.logs[0];
      expect(logEntry.data.apiKey).toBe("***REDACTED***");
      expect(logEntry.data.password).toBe("***REDACTED***");
      expect(logEntry.data.token).toBe("***REDACTED***");
      expect(logEntry.data.normalData).toBe("public-info");
    });

    test("should skip sanitization when disabled", () => {
      logger.config.enableSanitization = false;

      const sensitiveData = { apiKey: "secret-api-key" };
      logger.info("Test message", sensitiveData);

      const logEntry = logger.logs[0];
      expect(logEntry.data.apiKey).toBe("secret-api-key");
    });

    test("should handle nested objects in sanitization", () => {
      const nestedData = {
        user: {
          name: "John",
          password: "secret",
        },
        config: {
          apiKey: "secret-key",
        },
      };

      logger.info("Test message", nestedData);

      const logEntry = logger.logs[0];
      expect(logEntry.data.user.name).toBe("John");
      expect(logEntry.data.user.password).toBe("***REDACTED***");
      expect(logEntry.data.config.apiKey).toBe("***REDACTED***");
    });

    test("should handle arrays in sanitization", () => {
      const arrayData = {
        items: [
          { name: "item1", apiKey: "secret1" },
          { name: "item2", apiKey: "secret2" },
        ],
      };

      logger.info("Test message", arrayData);

      const logEntry = logger.logs[0];
      expect(logEntry.data.items[0].name).toBe("item1");
      expect(logEntry.data.items[0].apiKey).toBe("***REDACTED***");
      expect(logEntry.data.items[1].apiKey).toBe("***REDACTED***");
    });

    test("should handle circular references in sanitization", () => {
      const circularData = { name: "test" };
      circularData.self = circularData;

      expect(() => {
        logger.info("Test message", circularData);
      }).not.toThrow();

      expect(logger.logs).toHaveLength(1);
    });
  });

  describe("Log Management", () => {
    test("should limit log count based on maxLogs", () => {
      logger.config.maxLogs = 3;

      logger.info("Log 1");
      logger.info("Log 2");
      logger.info("Log 3");
      logger.info("Log 4"); // Should cause oldest log to be removed

      expect(logger.logs).toHaveLength(3);
      expect(logger.logs[0].message).toBe("Log 2");
      expect(logger.logs[2].message).toBe("Log 4");
    });

    test("should clear all logs", () => {
      logger.info("Log 1");
      logger.info("Log 2");
      logger.startOperation("op1", {});

      expect(logger.logs).toHaveLength(3);
      expect(logger.activeOperations.size).toBe(1);

      logger.clear();

      expect(logger.logs).toHaveLength(0);
      expect(logger.activeOperations.size).toBe(0);
      expect(logger.metrics.totalOperations).toBe(0);
    });

    test("should export logs in different formats", () => {
      logger.info("Test log 1");
      logger.warn("Test log 2");

      const jsonExport = logger.exportLogs("json");
      expect(typeof jsonExport).toBe("string");
      expect(() => JSON.parse(jsonExport)).not.toThrow();

      const csvExport = logger.exportLogs("csv");
      expect(typeof csvExport).toBe("string");
      expect(csvExport.includes(",")).toBe(true);

      const textExport = logger.exportLogs("text");
      expect(typeof textExport).toBe("string");
      expect(textExport.includes("Test log 1")).toBe(true);
    });

    test("should filter logs by level", () => {
      logger.info("Info message");
      logger.warn("Warning message");
      logger.error("Error message");

      const errorLogs = logger.getLogs({ level: "error" });
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe("Error message");

      const warningAndErrorLogs = logger.getLogs({ levels: ["warn", "error"] });
      expect(warningAndErrorLogs).toHaveLength(2);
    });

    test("should filter logs by time range", () => {
      const now = Date.now();

      logger.info("Old message");

      // Mock time advancement
      Date.now = jest.fn().mockReturnValue(now + 10000);

      logger.info("New message");

      const recentLogs = logger.getLogs({
        since: now + 5000,
      });

      expect(recentLogs).toHaveLength(1);
      expect(recentLogs[0].message).toBe("New message");

      // Restore Date.now
      Date.now = jest.fn().mockReturnValue(now);
    });

    test("should filter logs by operation ID", () => {
      logger.startOperation("op1", { type: "set" });
      logger.startOperation("op2", { type: "get" });
      logger.endOperation("op1", true);

      const op1Logs = logger.getLogs({ operationId: "op1" });
      expect(op1Logs).toHaveLength(2); // start + end

      const op2Logs = logger.getLogs({ operationId: "op2" });
      expect(op2Logs).toHaveLength(1); // only start
    });
  });

  describe("Performance", () => {
    test("should handle high-frequency logging efficiently", () => {
      const startTime = Date.now();

      // Log many messages rapidly
      for (let i = 0; i < 10000; i++) {
        logger.info(`High frequency log ${i}`, { iteration: i });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      expect(logger.logs.length).toBeLessThanOrEqual(logger.config.maxLogs);
    });

    test("should maintain performance with complex data", () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              array: Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                value: `item${i}`,
              })),
            },
          },
        },
      };

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        logger.info(`Complex data log ${i}`, complexData);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle complex data efficiently
      expect(duration).toBeLessThan(2000);
    });
  });

  describe("Error Handling", () => {
    test("should handle logging errors gracefully", () => {
      // Mock console.log to throw an error
      consoleSpy.log.mockImplementation(() => {
        throw new Error("Console error");
      });

      expect(() => {
        logger.info("This should not crash");
      }).not.toThrow();

      // Log should still be stored internally
      expect(logger.logs).toHaveLength(1);
    });

    test("should handle invalid data types", () => {
      const invalidData = {
        func: () => "test",
        symbol: Symbol("test"),
        bigint: BigInt(123),
      };

      expect(() => {
        logger.info("Invalid data test", invalidData);
      }).not.toThrow();

      expect(logger.logs).toHaveLength(1);
    });

    test("should handle memory pressure gracefully", () => {
      // Fill up logs to max capacity
      logger.config.maxLogs = 100;

      for (let i = 0; i < 200; i++) {
        logger.info(`Memory pressure log ${i}`);
      }

      expect(logger.logs).toHaveLength(100);
      expect(logger.logs[0].message).toBe("Memory pressure log 100");
      expect(logger.logs[99].message).toBe("Memory pressure log 199");
    });
  });

  describe("Integration with Storage Operations", () => {
    test("should provide operation correlation", () => {
      const operationId = "storage-op-123";

      // Start operation
      logger.startOperation(operationId, {
        type: "set",
        keys: ["testKey"],
        dataSize: 1024,
      });

      // Log related messages
      logger.info("Validating data", { operationId });
      logger.info("Writing to storage", { operationId });

      // End operation
      logger.endOperation(operationId, true, {
        duration: 150,
        bytesWritten: 1024,
      });

      // Get all logs for this operation
      const operationLogs = logger.getLogs({ operationId });
      expect(operationLogs).toHaveLength(4); // start + 2 info + end

      // Verify correlation
      operationLogs.forEach((log) => {
        expect(log.operationId || log.data?.operationId).toBe(operationId);
      });
    });

    test("should track storage operation patterns", () => {
      // Simulate various storage operations
      const operations = [
        { id: "op1", type: "set", success: true },
        { id: "op2", type: "get", success: true },
        { id: "op3", type: "set", success: false },
        { id: "op4", type: "remove", success: true },
      ];

      operations.forEach((op) => {
        logger.startOperation(op.id, { type: op.type });
        logger.endOperation(op.id, op.success);
      });

      const metrics = logger.getMetrics();
      expect(metrics.operationTypes.set).toBe(2);
      expect(metrics.operationTypes.get).toBe(1);
      expect(metrics.operationTypes.remove).toBe(1);
      expect(metrics.successfulOperations).toBe(3);
      expect(metrics.failedOperations).toBe(1);
    });
  });
});
