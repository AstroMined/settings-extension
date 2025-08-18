// lib/storage-operation-manager.js
// Core storage operation manager with queuing and race condition prevention

// Import dependencies (assuming they're loaded globally)
// In browser environment: browser-compat.js, storage-errors.js, storage-logger.js should be loaded first

/**
 * Storage Operation Manager - Eliminates race conditions through operation queuing
 *
 * Key Features:
 * - Serialized operation processing to prevent race conditions
 * - Exponential backoff retry logic with error classification
 * - Service worker context invalidation detection and recovery
 * - Comprehensive logging and metrics
 * - Operation prioritization and timeout handling
 * - Quota monitoring and graceful degradation
 *
 * Note: browserAPI is injected via constructor to support dependency injection pattern.
 * This class does not directly import browser-compat.js - it receives browserAPI from caller.
 */
class StorageOperationManager {
  constructor(browserAPI, options = {}) {
    this.browserAPI = browserAPI;

    // Configuration
    this.config = {
      maxRetries: options.maxRetries || 3,
      baseRetryDelay: options.baseRetryDelay || 100, // milliseconds
      maxRetryDelay: options.maxRetryDelay || 5000, // milliseconds
      operationTimeout: options.operationTimeout || 10000, // milliseconds
      maxQueueSize: options.maxQueueSize || 100,
      enableMetrics: options.enableMetrics !== false,
      enableLogging: options.enableLogging !== false,
      debugMode: options.debugMode || false,
    };

    // Operation queue and processing state
    this.operationQueue = [];
    this.isProcessing = false;
    this.queueStats = {
      totalProcessed: 0,
      totalFailed: 0,
      averageLatency: 0,
      queueHighWaterMark: 0,
    };

    // Priority levels for operations
    this.PRIORITY = {
      CRITICAL: 0, // Critical operations (data corruption recovery)
      HIGH: 1, // Important operations (user-initiated saves)
      NORMAL: 2, // Standard operations (auto-saves)
      LOW: 3, // Background operations (metrics, cleanup)
    };

    // Service worker context monitoring
    this.contextInfo = {
      lastKeepAlive: Date.now(),
      contextAge: Date.now(),
      isValid: true,
    };

    // Initialize logger
    this.logger = null;
    if (this.config.enableLogging) {
      try {
        const LoggerClass =
          typeof StorageLogger !== "undefined"
            ? StorageLogger
            : (typeof window !== "undefined" && window.StorageLogger) ||
              (typeof self !== "undefined" && self.StorageLogger);

        if (LoggerClass) {
          this.logger = new LoggerClass({
            debugMode: this.config.debugMode,
            maxLogs: 200,
          });
        }
      } catch (error) {
        console.warn("Failed to initialize StorageLogger:", error);
      }
    }

    // Initialize error classes
    this.StorageErrors = this._getStorageErrors();

    // Start context monitoring
    this._startContextMonitoring();

    this._log("info", "StorageOperationManager initialized", {
      config: this.config,
      queueCapacity: this.config.maxQueueSize,
    });
  }

  /**
   * Queue a storage operation for execution
   * @param {Object} operation - Operation to queue
   * @param {number} priority - Operation priority (optional)
   * @returns {Promise} Promise that resolves when operation completes
   */
  async queueOperation(operation, priority = this.PRIORITY.NORMAL) {
    return new Promise((resolve, reject) => {
      // Check queue capacity
      if (this.operationQueue.length >= this.config.maxQueueSize) {
        const error = new Error("Operation queue is full");
        this._log("error", "Queue capacity exceeded", {
          queueLength: this.operationQueue.length,
          maxQueueSize: this.config.maxQueueSize,
          operation: operation.type,
        });
        reject(error);
        return;
      }

      const operationId = this._generateOperationId();
      const queueItem = {
        id: operationId,
        operation,
        priority,
        resolve,
        reject,
        attempts: 0,
        queuedAt: Date.now(),
        metadata: {
          operationType: operation.type,
          dataSize: this._estimateDataSize(operation.data),
          priority,
        },
      };

      // Insert operation based on priority
      this._insertByPriority(queueItem);

      // Update queue stats
      this.queueStats.queueHighWaterMark = Math.max(
        this.queueStats.queueHighWaterMark,
        this.operationQueue.length,
      );

      this._log("debug", "Operation queued", {
        operationId,
        operationType: operation.type,
        priority,
        queueLength: this.operationQueue.length,
      });

      // Start processing if not already running
      this._processQueue();
    });
  }

  /**
   * Process the operation queue
   * @private
   */
  async _processQueue() {
    if (this.isProcessing || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this._log("debug", "Starting queue processing", {
      queueLength: this.operationQueue.length,
    });

    while (this.operationQueue.length > 0) {
      const item = this.operationQueue.shift();

      try {
        await this._executeOperationWithRetry(item);
      } catch (error) {
        this._log("error", "Operation failed after all retries", {
          operationId: item.id,
          operationType: item.operation.type,
          attempts: item.attempts,
          error: error,
        });

        this.queueStats.totalFailed++;
        item.reject(error);
      }
    }

    this.isProcessing = false;
    this._log("debug", "Queue processing completed");
  }

  /**
   * Execute operation with retry logic
   * @param {Object} item - Queue item to execute
   * @private
   */
  async _executeOperationWithRetry(item) {
    const operationId = item.id;
    const maxRetries = this.config.maxRetries;

    this._log("startOperation", operationId, item.metadata);

    while (item.attempts <= maxRetries) {
      try {
        // Check service worker context before operation
        await this._validateContext();

        // Execute the operation with timeout
        const result = await this._executeOperationWithTimeout(item.operation);

        // Success - update stats and resolve
        this.queueStats.totalProcessed++;
        this._updateAverageLatency(Date.now() - item.queuedAt);

        this._log("endOperation", operationId, true, { result });
        item.resolve(result);
        return;
      } catch (error) {
        item.attempts++;

        // Classify the error
        const storageError =
          this.StorageErrors?.createStorageError?.(error, item.operation.type, {
            attempt: item.attempts,
            operationId,
          }) || error;

        this._log("warn", "Operation attempt failed", {
          operationId,
          attempt: item.attempts,
          error: storageError,
          retryable: storageError.retryable,
        });

        // Check if we should retry
        if (item.attempts > maxRetries || !this._shouldRetry(storageError)) {
          this._log("endOperation", operationId, false, {
            error: storageError,
          });
          throw storageError;
        }

        // Calculate retry delay
        const retryDelay = this._calculateRetryDelay(
          item.attempts - 1,
          storageError,
        );

        this._log(
          "logRetry",
          operationId,
          item.attempts - 1,
          storageError,
          retryDelay,
        );

        // Wait before retry
        await this._delay(retryDelay);
      }
    }
  }

  /**
   * Execute operation with timeout protection
   * @param {Object} operation - Operation to execute
   * @returns {Promise} Operation result
   * @private
   */
  async _executeOperationWithTimeout(operation) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Operation timeout after ${this.config.operationTimeout}ms`,
          ),
        );
      }, this.config.operationTimeout);
    });

    const operationPromise = this._executeStorageOperation(operation);

    return Promise.race([operationPromise, timeoutPromise]);
  }

  /**
   * Execute the actual storage operation
   * @param {Object} operation - Operation to execute
   * @returns {Promise} Operation result
   * @private
   */
  async _executeStorageOperation(operation) {
    const storage = this.browserAPI.storage[operation.storageArea || "local"];

    if (!storage) {
      throw new Error(
        `Storage area '${operation.storageArea || "local"}' not available`,
      );
    }

    switch (operation.type) {
      case "set":
        await storage.set(operation.data);
        return { success: true, keys: Object.keys(operation.data) };

      case "get": {
        const getResult = await storage.get(operation.keys);
        return { success: true, data: getResult };
      }

      case "remove":
        await storage.remove(operation.keys);
        return { success: true, removedKeys: operation.keys };

      case "clear":
        await storage.clear();
        return { success: true, operation: "clear" };

      case "getBytesInUse":
        if (storage.getBytesInUse) {
          const bytes = await storage.getBytesInUse(operation.keys);
          return { success: true, bytesInUse: bytes };
        }
        throw new Error("getBytesInUse not supported");

      default:
        throw new Error(`Unknown storage operation type: ${operation.type}`);
    }
  }

  /**
   * Check if error should trigger a retry
   * @param {Error} error - Error to check
   * @returns {boolean} Whether to retry
   * @private
   */
  _shouldRetry(error) {
    // Use StorageErrors classification if available
    if (this.StorageErrors?.isRetryableError) {
      return this.StorageErrors.isRetryableError(error);
    }

    // Fallback classification
    const message = error.message?.toLowerCase() || "";

    // Don't retry quota exceeded errors
    if (message.includes("quota") || message.includes("exceeded")) {
      return false;
    }

    // Don't retry permission errors
    if (message.includes("permission") || message.includes("denied")) {
      return false;
    }

    // Default to retryable for transient errors
    return true;
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attempt - Attempt number (0-based)
   * @param {Error} error - Error that occurred
   * @returns {number} Delay in milliseconds
   * @private
   */
  _calculateRetryDelay(attempt, error) {
    // Use StorageErrors calculation if available
    if (this.StorageErrors?.getRetryDelay) {
      return this.StorageErrors.getRetryDelay(attempt, error);
    }

    // Fallback calculation
    const baseDelay = this.config.baseRetryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay;

    return Math.min(exponentialDelay + jitter, this.config.maxRetryDelay);
  }

  /**
   * Validate service worker context
   * @private
   */
  async _validateContext() {
    const now = Date.now();
    const contextAge = now - this.contextInfo.contextAge;
    const timeSinceKeepAlive = now - this.contextInfo.lastKeepAlive;

    // Context might be stale if it's old and no recent keep-alive
    if (contextAge > 300000 && timeSinceKeepAlive > 30000) {
      // 5 minutes and 30 seconds
      this._log("warn", "Service worker context may be stale", {
        contextAge,
        timeSinceKeepAlive,
      });

      // Try a simple operation to test context
      try {
        await this.browserAPI.storage.local.get(["__context_test__"]);
        this.contextInfo.lastKeepAlive = now;
        this.contextInfo.isValid = true;
      } catch {
        this.contextInfo.isValid = false;
        throw new Error("Service worker context invalidated");
      }
    }
  }

  /**
   * Start monitoring service worker context
   * @private
   */
  _startContextMonitoring() {
    // Update context info every 30 seconds
    setInterval(() => {
      this.contextInfo.lastKeepAlive = Date.now();

      // Log queue status periodically
      if (this.operationQueue.length > 0) {
        this._log("logQueueStatus", {
          queueLength: this.operationQueue.length,
          isProcessing: this.isProcessing,
          stats: this.queueStats,
        });
      }
    }, 30000);
  }

  /**
   * Insert operation in queue based on priority
   * @param {Object} item - Queue item to insert
   * @private
   */
  _insertByPriority(item) {
    // Find insertion point based on priority
    let insertIndex = this.operationQueue.length;

    for (let i = 0; i < this.operationQueue.length; i++) {
      if (this.operationQueue[i].priority > item.priority) {
        insertIndex = i;
        break;
      }
    }

    this.operationQueue.splice(insertIndex, 0, item);
  }

  /**
   * Generate unique operation ID
   * @returns {string} Unique operation ID
   * @private
   */
  _generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Estimate data size for an operation
   * @param {*} data - Data to estimate
   * @returns {number} Estimated size in bytes
   * @private
   */
  _estimateDataSize(data) {
    if (!data) return 0;

    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Update average latency statistic
   * @param {number} latency - Latency to add
   * @private
   */
  _updateAverageLatency(latency) {
    const count = this.queueStats.totalProcessed;
    this.queueStats.averageLatency =
      (this.queueStats.averageLatency * (count - 1) + latency) / count;
  }

  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   * @private
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get storage error classes
   * @returns {Object} Storage error classes
   * @private
   */
  _getStorageErrors() {
    if (typeof StorageErrors !== "undefined") {
      return StorageErrors;
    }

    if (typeof window !== "undefined" && window.StorageErrors) {
      return window.StorageErrors;
    }

    if (typeof self !== "undefined" && self.StorageErrors) {
      return self.StorageErrors;
    }

    return null;
  }

  /**
   * Log message using storage logger or console
   * @param {string} method - Logger method or level
   * @param {...any} args - Arguments to pass to logger
   * @private
   */
  _log(method, ...args) {
    if (this.logger && typeof this.logger[method] === "function") {
      this.logger[method](...args);
    } else if (this.config.debugMode || method === "error") {
      console[method === "logRetry" ? "warn" : method] ||
        console.log(`[StorageOperationManager] ${method}:`, ...args);
    }
  }

  /**
   * Get current queue status
   * @returns {Object} Queue status information
   */
  getQueueStatus() {
    return {
      queueLength: this.operationQueue.length,
      isProcessing: this.isProcessing,
      stats: { ...this.queueStats },
      config: { ...this.config },
      contextInfo: { ...this.contextInfo },
    };
  }

  /**
   * Get operation metrics
   * @returns {Object} Operation metrics
   */
  getMetrics() {
    const metrics = {
      queue: this.getQueueStatus(),
      logger: this.logger?.getMetrics?.() || null,
    };

    return metrics;
  }

  /**
   * Force process queue (for testing/emergency scenarios)
   */
  async forceProcessQueue() {
    if (!this.isProcessing) {
      await this._processQueue();
    }
  }

  /**
   * Clear the operation queue (emergency cleanup)
   * @param {boolean} rejectPending - Whether to reject pending operations
   */
  clearQueue(rejectPending = true) {
    const clearedCount = this.operationQueue.length;

    if (rejectPending) {
      this.operationQueue.forEach((item) => {
        item.reject(new Error("Operation queue cleared"));
      });
    }

    this.operationQueue = [];

    this._log("warn", "Operation queue cleared", {
      clearedOperations: clearedCount,
      rejectPending,
    });
  }

  /**
   * Destroy the operation manager and clean up resources
   */
  destroy() {
    this.clearQueue(true);
    this.isProcessing = false;

    if (this.logger?.clear) {
      this.logger.clear();
    }

    this._log("info", "StorageOperationManager destroyed");
  }
}

// Export for use in different contexts
if (typeof module !== "undefined" && module.exports) {
  // CommonJS (Node.js)
  module.exports = StorageOperationManager;
} else if (typeof window !== "undefined") {
  // Browser environment
  window.StorageOperationManager = StorageOperationManager;
} else {
  // Service worker context
  self.StorageOperationManager = StorageOperationManager;
}
