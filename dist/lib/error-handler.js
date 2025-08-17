/**
 * Standardized error handling utilities
 * Provides consistent error logging, user feedback, and error recovery patterns
 */

class ErrorHandler {
  /**
   * Log error with context and optional user feedback
   * @param {Error} error - The error to handle
   * @param {Object} context - Context information
   * @param {Object} options - Handling options
   */
  static handle(error, context = {}, options = {}) {
    const {
      component = "Unknown",
      operation = "Unknown",
      severity = "error",
      showUser = false,
      rethrow = false,
      fallbackAction = null,
    } = options;

    // Create standardized error log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      component,
      operation,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      context,
      severity,
    };

    // Log based on severity
    switch (severity) {
      case "critical":
        console.error("🚨 CRITICAL ERROR:", logEntry);
        break;
      case "error":
        console.error("❌ ERROR:", logEntry);
        break;
      case "warning":
        console.warn("⚠️ WARNING:", logEntry);
        break;
      case "info":
        console.info("ℹ️ INFO:", logEntry);
        break;
      default:
        console.error("❌ ERROR:", logEntry);
    }

    // Show user feedback if requested
    if (showUser && typeof window !== "undefined") {
      this.showUserError(error, severity);
    }

    // Execute fallback action if provided
    if (fallbackAction && typeof fallbackAction === "function") {
      try {
        fallbackAction(error, context);
      } catch (fallbackError) {
        console.error("❌ Fallback action failed:", fallbackError);
      }
    }

    // Rethrow if requested
    if (rethrow) {
      throw error;
    }

    return logEntry;
  }

  /**
   * Handle storage operations with standard retry and fallback
   */
  static async handleStorageOperation(operation, context = {}, retries = 2) {
    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        this.handle(
          error,
          {
            ...context,
            attempt,
            maxRetries: retries,
          },
          {
            component: "Storage",
            operation: context.operation || "Storage Operation",
            severity: attempt === retries ? "error" : "warning",
            showUser: false,
            rethrow: false,
          },
        );

        if (attempt < retries) {
          // Short delay before retry
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
        }
      }
    }

    // All retries failed
    throw new Error(
      `Storage operation failed after ${retries} attempts: ${lastError.message}`,
    );
  }

  /**
   * Handle background script communication with standard timeout and retry
   */
  static async handleBackgroundOperation(
    operation,
    context = {},
    timeout = 3000,
  ) {
    try {
      return await Promise.race([
        operation(),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(`Background operation timeout after ${timeout}ms`),
            );
          }, timeout);
        }),
      ]);
    } catch (error) {
      this.handle(error, context, {
        component: "Background",
        operation: context.operation || "Background Operation",
        severity: "error",
        showUser: context.showUser || false,
        rethrow: true,
      });
    }
  }

  /**
   * Show user-friendly error message
   */
  static showUserError(error, severity = "error") {
    // This would integrate with the popup's message system
    if (
      window.settingsPopupInstance &&
      window.settingsPopupInstance.showError
    ) {
      const userMessage = this.getUserFriendlyMessage(error, severity);
      window.settingsPopupInstance.showError(userMessage);
    }
  }

  /**
   * Convert technical errors to user-friendly messages
   */
  static getUserFriendlyMessage(error, severity) {
    // Common error patterns and their user-friendly messages
    const errorPatterns = {
      timeout: "Operation timed out. Please try again.",
      storage: "Unable to save settings. Please check your browser storage.",
      network: "Network error. Please check your connection and try again.",
      permission: "Permission denied. Please check extension permissions.",
      background:
        "Extension background script not responding. Please reload the extension.",
      validation: "Invalid data format. Please check your input.",
      quota: "Storage quota exceeded. Please free up some space.",
    };

    const message = error.message.toLowerCase();

    for (const [pattern, userMessage] of Object.entries(errorPatterns)) {
      if (message.includes(pattern)) {
        return userMessage;
      }
    }

    // Default messages based on severity
    switch (severity) {
      case "critical":
        return "A critical error occurred. Please reload the extension.";
      case "warning":
        return "A minor issue occurred. Functionality may be limited.";
      default:
        return "An error occurred. Please try again.";
    }
  }

  /**
   * Create error recovery wrapper for async functions
   */
  static withRecovery(asyncFn, recovery = {}) {
    return async function (...args) {
      const {
        maxRetries = 2,
        fallback = null,
        component = "Unknown",
        operation = "Unknown",
      } = recovery;

      let lastError = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await asyncFn.apply(this, args);
        } catch (error) {
          lastError = error;

          ErrorHandler.handle(
            error,
            {
              attempt,
              maxRetries,
              args: args.map((arg) =>
                typeof arg === "object" ? "[Object]" : arg,
              ),
            },
            {
              component,
              operation,
              severity: attempt === maxRetries ? "error" : "warning",
              showUser: false,
              rethrow: false,
            },
          );

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
          }
        }
      }

      // All retries failed, try fallback
      if (fallback && typeof fallback === "function") {
        try {
          console.log(`🔄 Attempting fallback for ${operation}`);
          return await fallback.apply(this, args);
        } catch (fallbackError) {
          ErrorHandler.handle(
            fallbackError,
            { originalError: lastError },
            {
              component,
              operation: `${operation} (Fallback)`,
              severity: "critical",
              showUser: true,
              rethrow: true,
            },
          );
        }
      }

      // No fallback or fallback failed
      throw lastError;
    };
  }
}

// Export for both browser and Node.js environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = ErrorHandler;
} else if (typeof window !== "undefined") {
  window.ErrorHandler = ErrorHandler;
} else if (typeof self !== "undefined") {
  self.ErrorHandler = ErrorHandler;
}
