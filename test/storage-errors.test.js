/**
 * Unit tests for StorageErrors
 * Tests error classification, retry logic, and error handling utilities
 */

// Import the module under test
const fs = require("fs");
const path = require("path");

// Load the StorageErrors module
const storageErrorsPath = path.join(__dirname, "../src/lib/storage-errors.js");
const storageErrorsCode = fs.readFileSync(storageErrorsPath, "utf8");

// Execute the code to get the StorageErrors object
let StorageErrors;
eval(storageErrorsCode);

// Get the exported StorageErrors
if (typeof module !== "undefined" && module.exports) {
  StorageErrors = module.exports;
} else if (typeof global !== "undefined" && global.StorageErrors) {
  StorageErrors = global.StorageErrors;
} else if (typeof window !== "undefined" && window.StorageErrors) {
  StorageErrors = window.StorageErrors;
}

describe("StorageErrors", () => {
  describe("Error Classification", () => {
    test("should classify quota exceeded errors as non-retryable", () => {
      const quotaError = new Error("Quota exceeded");
      expect(StorageErrors.isRetryableError(quotaError)).toBe(false);
    });

    test("should classify permission errors as non-retryable", () => {
      const permissionError = new Error("Permission denied");
      expect(StorageErrors.isRetryableError(permissionError)).toBe(false);
    });

    test("should classify network errors as retryable", () => {
      const networkError = new Error("Network connection lost");
      expect(StorageErrors.isRetryableError(networkError)).toBe(true);
    });

    test("should classify timeout errors as retryable", () => {
      const timeoutError = new Error("Request timeout");
      expect(StorageErrors.isRetryableError(timeoutError)).toBe(true);
    });

    test("should classify unknown errors as retryable by default", () => {
      const unknownError = new Error("Unknown error");
      expect(StorageErrors.isRetryableError(unknownError)).toBe(true);
    });

    test("should handle null/undefined errors", () => {
      expect(StorageErrors.isRetryableError(null)).toBe(false);
      expect(StorageErrors.isRetryableError(undefined)).toBe(false);
    });

    test("should handle errors without message", () => {
      const errorWithoutMessage = new Error();
      expect(StorageErrors.isRetryableError(errorWithoutMessage)).toBe(true);
    });
  });

  describe("Error Creation", () => {
    test("should create StorageError with correct properties", () => {
      const originalError = new Error("Test error");
      const storageError = StorageErrors.createStorageError(
        originalError,
        "set",
        { key: "test" },
      );

      expect(storageError).toBeInstanceOf(StorageErrors.StorageError);
      expect(storageError.message).toBe("Test error");
      expect(storageError.operation).toBe("set");
      expect(storageError.context).toEqual({ key: "test" });
      expect(storageError.retryable).toBe(true);
      expect(storageError.timestamp).toBeDefined();
    });

    test("should create QuotaExceededError for quota issues", () => {
      const quotaError = new Error("Storage quota exceeded");
      const storageError = StorageErrors.createStorageError(quotaError, "set");

      expect(storageError).toBeInstanceOf(StorageErrors.QuotaExceededError);
      expect(storageError.retryable).toBe(false);
      expect(storageError.errorType).toBe("QUOTA_EXCEEDED");
    });

    test("should create PermissionError for permission issues", () => {
      const permissionError = new Error("Access denied");
      const storageError = StorageErrors.createStorageError(
        permissionError,
        "set",
      );

      expect(storageError).toBeInstanceOf(StorageErrors.PermissionError);
      expect(storageError.retryable).toBe(false);
      expect(storageError.errorType).toBe("PERMISSION_DENIED");
    });

    test("should create TimeoutError for timeout issues", () => {
      const timeoutError = new Error("Operation timed out");
      const storageError = StorageErrors.createStorageError(
        timeoutError,
        "set",
      );

      expect(storageError).toBeInstanceOf(StorageErrors.TimeoutError);
      expect(storageError.retryable).toBe(true);
      expect(storageError.errorType).toBe("TIMEOUT");
    });

    test("should create CorruptionError for corruption issues", () => {
      const corruptionError = new Error("Data corruption detected");
      const storageError = StorageErrors.createStorageError(
        corruptionError,
        "get",
      );

      expect(storageError).toBeInstanceOf(StorageErrors.CorruptionError);
      expect(storageError.retryable).toBe(false);
      expect(storageError.errorType).toBe("DATA_CORRUPTION");
    });

    test("should create ServiceWorkerError for context issues", () => {
      const contextError = new Error("Service worker context lost");
      const storageError = StorageErrors.createStorageError(
        contextError,
        "set",
      );

      expect(storageError).toBeInstanceOf(StorageErrors.ServiceWorkerError);
      expect(storageError.retryable).toBe(true);
      expect(storageError.errorType).toBe("SERVICE_WORKER_CONTEXT");
    });

    test("should handle errors without context", () => {
      const originalError = new Error("Test error");
      const storageError = StorageErrors.createStorageError(
        originalError,
        "set",
      );

      expect(storageError.context).toEqual({});
    });

    test("should preserve original error stack trace", () => {
      const originalError = new Error("Test error");
      const originalStack = originalError.stack;

      const storageError = StorageErrors.createStorageError(
        originalError,
        "set",
      );

      expect(storageError.originalStack).toBe(originalStack);
    });
  });

  describe("Retry Delay Calculation", () => {
    test("should calculate exponential backoff delay", () => {
      const delay0 = StorageErrors.getRetryDelay(0);
      const delay1 = StorageErrors.getRetryDelay(1);
      const delay2 = StorageErrors.getRetryDelay(2);

      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay0).toBeGreaterThanOrEqual(100); // Base delay
    });

    test("should cap maximum delay", () => {
      const delay = StorageErrors.getRetryDelay(10); // Very high attempt
      expect(delay).toBeLessThanOrEqual(5000); // Max delay
    });

    test("should include jitter in delay calculation", () => {
      const delays = Array.from({ length: 10 }, () =>
        StorageErrors.getRetryDelay(1),
      );
      const uniqueDelays = new Set(delays);

      // Should have some variation due to jitter
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });

    test("should handle error-specific delay adjustments", () => {
      const networkError = new Error("Network error");
      const quotaError = new Error("Quota exceeded");

      const networkDelay = StorageErrors.getRetryDelay(1, networkError);
      const quotaDelay = StorageErrors.getRetryDelay(1, quotaError);

      // Both should return valid delays
      expect(networkDelay).toBeGreaterThan(0);
      expect(quotaDelay).toBeGreaterThan(0);
    });

    test("should handle negative attempt numbers", () => {
      const delay = StorageErrors.getRetryDelay(-1);
      expect(delay).toBeGreaterThanOrEqual(100); // Should default to base delay
    });
  });

  describe("Error Type Detection", () => {
    test("should detect quota errors from various messages", () => {
      const quotaMessages = [
        "Quota exceeded",
        "Storage quota exceeded",
        "QUOTA_EXCEEDED_ERR",
        "Not enough storage space",
      ];

      quotaMessages.forEach((message) => {
        const error = new Error(message);
        const storageError = StorageErrors.createStorageError(error, "set");
        expect(storageError).toBeInstanceOf(StorageErrors.QuotaExceededError);
      });
    });

    test("should detect permission errors from various messages", () => {
      const permissionMessages = [
        "Permission denied",
        "Access denied",
        "Unauthorized access",
        "Insufficient permissions",
      ];

      permissionMessages.forEach((message) => {
        const error = new Error(message);
        const storageError = StorageErrors.createStorageError(error, "set");
        expect(storageError).toBeInstanceOf(StorageErrors.PermissionError);
      });
    });

    test("should detect timeout errors from various messages", () => {
      const timeoutMessages = [
        "Timeout",
        "Operation timed out",
        "Request timeout",
        "Connection timeout",
      ];

      timeoutMessages.forEach((message) => {
        const error = new Error(message);
        const storageError = StorageErrors.createStorageError(error, "set");
        expect(storageError).toBeInstanceOf(StorageErrors.TimeoutError);
      });
    });

    test("should detect corruption errors from various messages", () => {
      const corruptionMessages = [
        "Data corruption",
        "Corrupt data detected",
        "Invalid data format",
        "Checksum mismatch",
      ];

      corruptionMessages.forEach((message) => {
        const error = new Error(message);
        const storageError = StorageErrors.createStorageError(error, "get");
        expect(storageError).toBeInstanceOf(StorageErrors.CorruptionError);
      });
    });

    test("should detect service worker errors from various messages", () => {
      const contextMessages = [
        "Service worker context lost",
        "Context invalidated",
        "Worker context expired",
        "Invalid context",
      ];

      contextMessages.forEach((message) => {
        const error = new Error(message);
        const storageError = StorageErrors.createStorageError(error, "set");
        expect(storageError).toBeInstanceOf(StorageErrors.ServiceWorkerError);
      });
    });
  });

  describe("Error Serialization", () => {
    test("should serialize storage errors to JSON", () => {
      const originalError = new Error("Test error");
      const storageError = StorageErrors.createStorageError(
        originalError,
        "set",
        { key: "test" },
      );

      const serialized = storageError.toJSON();

      expect(serialized.message).toBe("Test error");
      expect(serialized.operation).toBe("set");
      expect(serialized.context).toEqual({ key: "test" });
      expect(serialized.retryable).toBe(true);
      expect(serialized.errorType).toBe("STORAGE_ERROR");
      expect(serialized.timestamp).toBeDefined();
    });

    test("should serialize specialized error types", () => {
      const quotaError = new Error("Quota exceeded");
      const storageError = StorageErrors.createStorageError(quotaError, "set");

      const serialized = storageError.toJSON();

      expect(serialized.errorType).toBe("QUOTA_EXCEEDED");
      expect(serialized.retryable).toBe(false);
    });

    test("should handle circular references in context", () => {
      const circularContext = { key: "test" };
      circularContext.self = circularContext;

      const originalError = new Error("Test error");
      const storageError = StorageErrors.createStorageError(
        originalError,
        "set",
        circularContext,
      );

      const serialized = storageError.toJSON();
      expect(serialized.context).toBeDefined();
      // Should not throw due to circular reference
    });
  });

  describe("Error Utilities", () => {
    test("should format error for display", () => {
      const originalError = new Error("Test error");
      const storageError = StorageErrors.createStorageError(
        originalError,
        "set",
        { key: "test" },
      );

      const formatted = storageError.toString();

      expect(formatted).toContain("StorageError");
      expect(formatted).toContain("Test error");
      expect(formatted).toContain("set");
    });

    test("should check if error is specific type", () => {
      const quotaError = new Error("Quota exceeded");
      const storageError = StorageErrors.createStorageError(quotaError, "set");

      expect(StorageErrors.isQuotaError(storageError)).toBe(true);
      expect(StorageErrors.isPermissionError(storageError)).toBe(false);
      expect(StorageErrors.isTimeoutError(storageError)).toBe(false);
    });

    test("should get error category", () => {
      const networkError = new Error("Network error");
      const storageError = StorageErrors.createStorageError(
        networkError,
        "set",
      );

      const category = StorageErrors.getErrorCategory(storageError);
      expect(["transient", "permanent", "user"]).toContain(category);
    });

    test("should get user-friendly error message", () => {
      const quotaError = new Error("Quota exceeded");
      const storageError = StorageErrors.createStorageError(quotaError, "set");

      const userMessage = StorageErrors.getUserFriendlyMessage(storageError);
      expect(userMessage).toBeDefined();
      expect(userMessage.length).toBeGreaterThan(0);
      expect(userMessage).not.toContain("Quota exceeded"); // Should be more user-friendly
    });

    test("should suggest recovery actions", () => {
      const quotaError = new Error("Quota exceeded");
      const storageError = StorageErrors.createStorageError(quotaError, "set");

      const suggestions = StorageErrors.getRecoverySuggestions(storageError);
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("Error Aggregation", () => {
    test("should create error summary from multiple errors", () => {
      const errors = [
        StorageErrors.createStorageError(new Error("Error 1"), "set"),
        StorageErrors.createStorageError(new Error("Error 2"), "get"),
        StorageErrors.createStorageError(new Error("Quota exceeded"), "set"),
      ];

      const summary = StorageErrors.createErrorSummary(errors);

      expect(summary.totalErrors).toBe(3);
      expect(summary.errorTypes).toBeDefined();
      expect(summary.retryableCount).toBe(2);
      expect(summary.nonRetryableCount).toBe(1);
    });

    test("should handle empty error list", () => {
      const summary = StorageErrors.createErrorSummary([]);

      expect(summary.totalErrors).toBe(0);
      expect(summary.retryableCount).toBe(0);
      expect(summary.nonRetryableCount).toBe(0);
    });

    test("should group errors by type", () => {
      const errors = [
        StorageErrors.createStorageError(new Error("Quota exceeded"), "set"),
        StorageErrors.createStorageError(
          new Error("Storage quota exceeded"),
          "set",
        ),
        StorageErrors.createStorageError(new Error("Permission denied"), "get"),
      ];

      const summary = StorageErrors.createErrorSummary(errors);

      expect(summary.errorTypes["QUOTA_EXCEEDED"]).toBe(2);
      expect(summary.errorTypes["PERMISSION_DENIED"]).toBe(1);
    });
  });

  describe("Performance and Memory", () => {
    test("should not leak memory in error creation", () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create many errors
      for (let i = 0; i < 1000; i++) {
        const error = new Error(`Test error ${i}`);
        StorageErrors.createStorageError(error, "set", { iteration: i });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (less than 10MB for 1000 errors)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });

    test("should handle high-frequency error creation", () => {
      const startTime = Date.now();

      // Create many errors rapidly
      for (let i = 0; i < 10000; i++) {
        const error = new Error(`High frequency error ${i}`);
        StorageErrors.createStorageError(error, "set");
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe("Edge Cases", () => {
    test("should handle non-Error objects", () => {
      const stringError = "String error";
      const storageError = StorageErrors.createStorageError(stringError, "set");

      expect(storageError).toBeInstanceOf(StorageErrors.StorageError);
      expect(storageError.message).toBe("String error");
    });

    test("should handle Error objects without message", () => {
      const errorWithoutMessage = new Error();
      const storageError = StorageErrors.createStorageError(
        errorWithoutMessage,
        "set",
      );

      expect(storageError).toBeInstanceOf(StorageErrors.StorageError);
      expect(storageError.message).toBe("Unknown error");
    });

    test("should handle null operation", () => {
      const error = new Error("Test error");
      const storageError = StorageErrors.createStorageError(error, null);

      expect(storageError.operation).toBe("unknown");
    });

    test("should handle very long error messages", () => {
      const longMessage = "x".repeat(10000);
      const error = new Error(longMessage);
      const storageError = StorageErrors.createStorageError(error, "set");

      expect(storageError.message.length).toBeLessThanOrEqual(1000); // Should be truncated
    });

    test("should handle complex context objects", () => {
      const complexContext = {
        nested: {
          object: {
            with: ["arrays", "and", { deep: "nesting" }],
          },
        },
        timestamp: new Date(),
        regex: /test/g,
        func: () => "test",
      };

      const error = new Error("Complex context error");
      const storageError = StorageErrors.createStorageError(
        error,
        "set",
        complexContext,
      );

      expect(storageError.context).toBeDefined();
      // Should handle non-serializable properties gracefully
    });
  });
});
