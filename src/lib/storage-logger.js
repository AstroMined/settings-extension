// lib/storage-logger.js
// Comprehensive logging system for storage operations

/**
 * Storage operations logger with metrics and debugging capabilities
 */
class StorageLogger {
  constructor(options = {}) {
    this.logs = [];
    this.metrics = {
      operations: 0,
      successes: 0,
      failures: 0,
      retries: 0,
      totalLatency: 0,
      operationTypes: {},
      errorTypes: {},
    };

    // Configuration
    this.config = {
      maxLogs: options.maxLogs || 100,
      debugMode: options.debugMode || false,
      enableMetrics: options.enableMetrics !== false, // Default true
      enableConsoleOutput: options.enableConsoleOutput !== false, // Default true
      logLevels: options.logLevels || ["debug", "info", "warn", "error"],
    };

    // Performance tracking
    this.performanceMarks = new Map();
    this.operationTimings = new Map();
  }

  /**
   * Log a message with specified level
   * @param {string} level - Log level (debug, info, warn, error)
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   * @param {Object} options - Logging options
   */
  log(level, message, data = {}, options = {}) {
    if (!this.config.logLevels.includes(level)) {
      return;
    }

    const entry = {
      timestamp: Date.now(),
      level,
      message,
      data: this._sanitizeData(data),
      context: this._getContext(),
      stack:
        level === "error" && options.includeStack
          ? new Error().stack
          : undefined,
    };

    // Add to logs buffer
    this.logs.push(entry);

    // Trim logs if needed
    if (this.logs.length > this.config.maxLogs) {
      this.logs.shift();
    }

    // Console output
    if (
      this.config.enableConsoleOutput &&
      (this.config.debugMode || level !== "debug")
    ) {
      this._outputToConsole(entry);
    }

    // Update metrics
    if (this.config.enableMetrics) {
      this._updateMetrics(level, data);
    }
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {Object} data - Additional data
   */
  debug(message, data = {}) {
    this.log("debug", message, data);
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} data - Additional data
   */
  info(message, data = {}) {
    this.log("info", message, data);
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} data - Additional data
   */
  warn(message, data = {}) {
    this.log("warn", message, data);
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Object} data - Additional data
   */
  error(message, data = {}) {
    this.log("error", message, data, { includeStack: true });
  }

  /**
   * Start performance tracking for an operation
   * @param {string} operationId - Unique operation identifier
   * @param {Object} metadata - Operation metadata
   */
  startOperation(operationId, metadata = {}) {
    const startTime = performance.now();
    this.performanceMarks.set(operationId, {
      startTime,
      metadata,
      timestamp: Date.now(),
    });

    this.debug("Operation started", {
      operationId,
      metadata,
      startTime,
    });
  }

  /**
   * End performance tracking for an operation
   * @param {string} operationId - Operation identifier
   * @param {boolean} success - Whether operation succeeded
   * @param {Object} result - Operation result or error
   */
  endOperation(operationId, success, result = {}) {
    const mark = this.performanceMarks.get(operationId);
    if (!mark) {
      this.warn("Attempted to end unknown operation", { operationId });
      return;
    }

    const endTime = performance.now();
    const latency = endTime - mark.startTime;

    const operationLog = {
      operationId,
      success,
      latency,
      metadata: mark.metadata,
      result: this._sanitizeData(result),
      startTime: mark.startTime,
      endTime,
      timestamp: mark.timestamp,
    };

    // Store timing data
    this.operationTimings.set(operationId, operationLog);

    // Update metrics
    if (this.config.enableMetrics) {
      this.metrics.operations++;
      this.metrics.totalLatency += latency;

      if (success) {
        this.metrics.successes++;
      } else {
        this.metrics.failures++;
      }

      // Track operation types
      const operationType = mark.metadata.operationType || "unknown";
      this.metrics.operationTypes[operationType] =
        (this.metrics.operationTypes[operationType] || 0) + 1;

      // Track error types
      if (!success && result.error) {
        const errorType = result.error.code || result.error.name || "unknown";
        this.metrics.errorTypes[errorType] =
          (this.metrics.errorTypes[errorType] || 0) + 1;
      }
    }

    // Log completion
    const logLevel = success ? "debug" : "warn";
    this.log(
      logLevel,
      `Operation ${success ? "completed" : "failed"}`,
      operationLog,
    );

    // Clean up
    this.performanceMarks.delete(operationId);

    return operationLog;
  }

  /**
   * Log a retry attempt
   * @param {string} operationId - Operation identifier
   * @param {number} attempt - Attempt number (0-based)
   * @param {Error} error - Error that caused retry
   * @param {number} nextRetryDelay - Delay until next retry
   */
  logRetry(operationId, attempt, error, nextRetryDelay) {
    this.metrics.retries++;

    this.warn("Operation retry", {
      operationId,
      attempt,
      error: this._sanitizeData(error),
      nextRetryDelay,
      totalRetries: this.metrics.retries,
    });
  }

  /**
   * Log storage quota information
   * @param {Object} quotaInfo - Quota information
   */
  logQuotaInfo(quotaInfo) {
    this.info("Storage quota information", {
      quotaInfo: this._sanitizeData(quotaInfo),
      percentUsed:
        quotaInfo.used && quotaInfo.quota
          ? Math.round((quotaInfo.used / quotaInfo.quota) * 100)
          : "unknown",
    });
  }

  /**
   * Log operation queue status
   * @param {Object} queueStatus - Queue status information
   */
  logQueueStatus(queueStatus) {
    this.debug("Operation queue status", {
      queueStatus: this._sanitizeData(queueStatus),
    });
  }

  /**
   * Get logs filtered by criteria
   * @param {Object} criteria - Filter criteria
   * @returns {Array} Filtered logs
   */
  getLogs(criteria = {}) {
    let filtered = [...this.logs];

    if (criteria.level) {
      filtered = filtered.filter((log) => log.level === criteria.level);
    }

    if (criteria.since) {
      filtered = filtered.filter((log) => log.timestamp >= criteria.since);
    }

    if (criteria.messagePattern) {
      const pattern = new RegExp(criteria.messagePattern, "i");
      filtered = filtered.filter((log) => pattern.test(log.message));
    }

    if (criteria.limit) {
      filtered = filtered.slice(-criteria.limit);
    }

    return filtered;
  }

  /**
   * Get current metrics summary
   * @returns {Object} Metrics summary
   */
  getMetrics() {
    const avgLatency =
      this.metrics.operations > 0
        ? this.metrics.totalLatency / this.metrics.operations
        : 0;

    const successRate =
      this.metrics.operations > 0
        ? (this.metrics.successes / this.metrics.operations) * 100
        : 0;

    return {
      ...this.metrics,
      averageLatency: Math.round(avgLatency * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      activeOperations: this.performanceMarks.size,
    };
  }

  /**
   * Get recent operation timings
   * @param {number} count - Number of recent operations to return
   * @returns {Array} Recent operation timings
   */
  getRecentOperations(count = 10) {
    const operations = Array.from(this.operationTimings.values());
    return operations.sort((a, b) => b.timestamp - a.timestamp).slice(0, count);
  }

  /**
   * Export logs as JSON string
   * @param {Object} criteria - Filter criteria (optional)
   * @returns {string} JSON string of logs
   */
  exportLogs(criteria = {}) {
    const logs = this.getLogs(criteria);
    const exportData = {
      exportTimestamp: Date.now(),
      totalLogs: logs.length,
      metrics: this.getMetrics(),
      logs,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear all logs and reset metrics
   */
  clear() {
    this.logs = [];
    this.performanceMarks.clear();
    this.operationTimings.clear();
    this.metrics = {
      operations: 0,
      successes: 0,
      failures: 0,
      retries: 0,
      totalLatency: 0,
      operationTypes: {},
      errorTypes: {},
    };

    this.info("Storage logger cleared");
  }

  /**
   * Set debug mode
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebugMode(enabled) {
    this.config.debugMode = enabled;
    this.info("Debug mode changed", { enabled });
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   * @param {*} data - Data to sanitize
   * @returns {*} Sanitized data
   * @private
   */
  _sanitizeData(data) {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === "string") {
      // Remove potential API keys or sensitive data
      return data.replace(
        /([a-zA-Z]*[Kk]ey|[Tt]oken|[Pp]assword)\s*[:=]\s*["']?([^"'\s]+)["']?/g,
        (match, prefix) => `${prefix}: [REDACTED]`,
      );
    }

    if (typeof data === "object") {
      if (data instanceof Error) {
        return {
          name: data.name,
          message: data.message,
          code: data.code,
          stack: data.stack?.substring(0, 500), // Limit stack trace length
        };
      }

      if (Array.isArray(data)) {
        return data.map((item) => this._sanitizeData(item));
      }

      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip sensitive keys
        if (/api[_-]?key|token|password|secret/i.test(key)) {
          sanitized[key] = "[REDACTED]";
        } else {
          sanitized[key] = this._sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Get current execution context
   * @returns {Object} Context information
   * @private
   */
  _getContext() {
    let context = "unknown";
    let userAgent = "unknown";

    if (typeof window !== "undefined") {
      context = "browser";
      userAgent = window.navigator?.userAgent || "unknown";
    } else if (typeof self !== "undefined" && self.importScripts) {
      context = "service-worker";
      userAgent = self.navigator?.userAgent || "unknown";
    } else if (typeof global !== "undefined") {
      context = "node";
      userAgent = process?.version || "unknown";
    }

    return {
      context,
      userAgent: userAgent.substring(0, 100), // Limit length
      timestamp: Date.now(),
    };
  }

  /**
   * Output log entry to console
   * @param {Object} entry - Log entry
   * @private
   */
  _outputToConsole(entry) {
    const prefix = `[StorageLogger:${entry.level.toUpperCase()}]`;
    const timestamp = new Date(entry.timestamp).toISOString();
    const message = `${prefix} ${timestamp} ${entry.message}`;

    switch (entry.level) {
      case "debug":
        console.debug(message, entry.data);
        break;
      case "info":
        console.info(message, entry.data);
        break;
      case "warn":
        console.warn(message, entry.data);
        break;
      case "error":
        console.error(message, entry.data);
        break;
      default:
        console.log(message, entry.data);
    }
  }

  /**
   * Update metrics based on log entry
   * @param {string} _level - Log level (unused)
   * @param {Object} _data - Log data (unused)
   * @private
   */
  _updateMetrics(_level, _data) {
    // This is called from the main log method
    // Specific metrics updates are handled in endOperation and logRetry
  }
}

// Export for use in different contexts
if (typeof module !== "undefined" && module.exports) {
  // CommonJS (Node.js)
  module.exports = StorageLogger;
} else if (typeof window !== "undefined") {
  // Browser environment
  window.StorageLogger = StorageLogger;
} else {
  // Service worker context
  self.StorageLogger = StorageLogger;
}
