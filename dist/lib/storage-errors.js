// lib/storage-errors.js
// Specialized error types for storage operations

/**
 * Base class for all storage-related errors
 */
class StorageError extends Error {
  constructor(message, code, operation, retryable = false, metadata = {}) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.operation = operation;
    this.retryable = retryable;
    this.metadata = metadata;
    this.timestamp = Date.now();
  }

  /**
   * Get a user-friendly error message
   * @returns {string}
   */
  getUserMessage() {
    switch (this.code) {
      case "QUOTA_EXCEEDED":
        return "Storage quota exceeded. Please free up space or contact support.";
      case "NETWORK_ERROR":
        return "Network error occurred. Please check your connection and try again.";
      case "DATA_CORRUPTION":
        return "Data corruption detected. Settings will be reset to defaults.";
      case "SERVICE_WORKER_INVALID":
        return "Extension needs to be reloaded. Please refresh the page.";
      case "OPERATION_TIMEOUT":
        return "Operation timed out. Please try again.";
      case "CONCURRENT_MODIFICATION":
        return "Settings were modified by another instance. Please refresh.";
      default:
        return this.message;
    }
  }

  /**
   * Convert error to JSON for logging
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      operation: this.operation,
      retryable: this.retryable,
      metadata: this.metadata,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Storage quota exceeded error
 */
class StorageQuotaExceededError extends StorageError {
  constructor(operation, metadata = {}) {
    super(
      "Storage quota exceeded",
      "QUOTA_EXCEEDED",
      operation,
      false, // Not retryable - user needs to free space
      {
        ...metadata,
        quotaType: metadata.quotaType || "local",
        usedBytes: metadata.usedBytes || "unknown",
        quotaBytes: metadata.quotaBytes || "unknown",
      },
    );
  }
}

/**
 * Network-related storage error
 */
class StorageNetworkError extends StorageError {
  constructor(operation, originalError, metadata = {}) {
    super(
      `Storage network error: ${originalError?.message || "Unknown network error"}`,
      "NETWORK_ERROR",
      operation,
      true, // Retryable - network might recover
      {
        ...metadata,
        originalError: originalError?.message,
        browserInfo: metadata.browserInfo,
      },
    );
  }
}

/**
 * Data corruption detected error
 */
class StorageCorruptionError extends StorageError {
  constructor(operation, corruptedData, metadata = {}) {
    super(
      "Storage data corruption detected",
      "DATA_CORRUPTION",
      operation,
      false, // Not retryable - need to reset to defaults
      {
        ...metadata,
        corruptedKeys: corruptedData?.keys || [],
        corruptionType: metadata.corruptionType || "unknown",
      },
    );
  }
}

/**
 * Service worker context invalidation error
 */
class ServiceWorkerInvalidError extends StorageError {
  constructor(operation, metadata = {}) {
    super(
      "Service worker context invalidated",
      "SERVICE_WORKER_INVALID",
      operation,
      true, // Retryable after context refresh
      {
        ...metadata,
        contextAge: metadata.contextAge || "unknown",
        lastKeepAlive: metadata.lastKeepAlive || "unknown",
      },
    );
  }
}

/**
 * Operation timeout error
 */
class StorageOperationTimeoutError extends StorageError {
  constructor(operation, timeoutMs, metadata = {}) {
    super(
      `Storage operation timed out after ${timeoutMs}ms`,
      "OPERATION_TIMEOUT",
      operation,
      true, // Retryable - might succeed on retry
      {
        ...metadata,
        timeoutMs,
        operationStartTime: metadata.operationStartTime || Date.now(),
      },
    );
  }
}

/**
 * Concurrent modification error
 */
class ConcurrentModificationError extends StorageError {
  constructor(operation, metadata = {}) {
    super(
      "Settings were modified concurrently by another instance",
      "CONCURRENT_MODIFICATION",
      operation,
      true, // Retryable - can merge changes
      {
        ...metadata,
        conflictingKeys: metadata.conflictingKeys || [],
        lastModified: metadata.lastModified || Date.now(),
      },
    );
  }
}

/**
 * Permission denied error
 */
class StoragePermissionError extends StorageError {
  constructor(operation, metadata = {}) {
    super(
      "Storage access denied - insufficient permissions",
      "PERMISSION_DENIED",
      operation,
      false, // Not retryable - permissions issue
      {
        ...metadata,
        permissionType: metadata.permissionType || "storage",
      },
    );
  }
}

/**
 * Factory function to create appropriate error based on browser error
 * @param {Error} browserError - Original browser error
 * @param {string} operation - Operation that failed
 * @param {Object} metadata - Additional metadata
 * @returns {StorageError}
 */
function createStorageError(browserError, operation, metadata = {}) {
  const errorMessage = browserError?.message?.toLowerCase() || "";

  // Detect quota exceeded errors
  if (
    errorMessage.includes("quota") ||
    errorMessage.includes("exceeded") ||
    errorMessage.includes("storage_quota_exceeded")
  ) {
    return new StorageQuotaExceededError(operation, {
      ...metadata,
      originalError: browserError,
    });
  }

  // Detect network errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("offline") ||
    errorMessage.includes("connection") ||
    browserError?.name === "NetworkError"
  ) {
    return new StorageNetworkError(operation, browserError, metadata);
  }

  // Detect permission errors
  if (
    errorMessage.includes("permission") ||
    errorMessage.includes("denied") ||
    errorMessage.includes("unauthorized")
  ) {
    return new StoragePermissionError(operation, {
      ...metadata,
      originalError: browserError,
    });
  }

  // Detect timeout errors
  if (
    errorMessage.includes("timeout") ||
    errorMessage.includes("timed out") ||
    browserError?.name === "TimeoutError"
  ) {
    return new StorageOperationTimeoutError(operation, 5000, {
      ...metadata,
      originalError: browserError,
    });
  }

  // Detect service worker context errors
  if (
    errorMessage.includes("context") ||
    errorMessage.includes("invalidated") ||
    errorMessage.includes("extension context")
  ) {
    return new ServiceWorkerInvalidError(operation, {
      ...metadata,
      originalError: browserError,
    });
  }

  // Generic storage error for unclassified errors
  return new StorageError(
    browserError?.message || "Unknown storage error",
    "GENERIC_ERROR",
    operation,
    true, // Default to retryable for unknown errors
    {
      ...metadata,
      originalError: browserError,
      browserErrorName: browserError?.name,
    },
  );
}

/**
 * Check if an error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean}
 */
function isRetryableError(error) {
  if (error instanceof StorageError) {
    return error.retryable;
  }

  // For non-StorageError instances, create a temporary StorageError to classify
  const classified = createStorageError(error, "unknown");
  return classified.retryable;
}

/**
 * Get retry delay based on attempt number and error type
 * @param {number} attempt - Attempt number (0-based)
 * @param {StorageError} error - The error that occurred
 * @returns {number} Delay in milliseconds
 */
function getRetryDelay(attempt, error) {
  const baseDelay = 100; // 100ms base delay
  const maxDelay = 5000; // 5 second max delay

  let multiplier = 1;

  // Adjust delay based on error type
  if (error instanceof StorageNetworkError) {
    multiplier = 2; // Longer delays for network errors
  } else if (error instanceof ServiceWorkerInvalidError) {
    multiplier = 3; // Even longer for service worker issues
  } else if (error instanceof StorageOperationTimeoutError) {
    multiplier = 1.5; // Moderate delay for timeouts
  }

  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt) * multiplier;
  const jitter = Math.random() * 0.1 * exponentialDelay; // ±10% jitter
  const finalDelay = Math.min(exponentialDelay + jitter, maxDelay);

  return Math.round(finalDelay);
}

// Export for use in different contexts
if (typeof module !== "undefined" && module.exports) {
  // CommonJS (Node.js)
  module.exports = {
    StorageError,
    StorageQuotaExceededError,
    StorageNetworkError,
    StorageCorruptionError,
    ServiceWorkerInvalidError,
    StorageOperationTimeoutError,
    ConcurrentModificationError,
    StoragePermissionError,
    createStorageError,
    isRetryableError,
    getRetryDelay,
  };
} else if (typeof window !== "undefined") {
  // Browser environment
  window.StorageErrors = {
    StorageError,
    StorageQuotaExceededError,
    StorageNetworkError,
    StorageCorruptionError,
    ServiceWorkerInvalidError,
    StorageOperationTimeoutError,
    ConcurrentModificationError,
    StoragePermissionError,
    createStorageError,
    isRetryableError,
    getRetryDelay,
  };
} else {
  // Service worker context
  self.StorageErrors = {
    StorageError,
    StorageQuotaExceededError,
    StorageNetworkError,
    StorageCorruptionError,
    ServiceWorkerInvalidError,
    StorageOperationTimeoutError,
    ConcurrentModificationError,
    StoragePermissionError,
    createStorageError,
    isRetryableError,
    getRetryDelay,
  };
}
