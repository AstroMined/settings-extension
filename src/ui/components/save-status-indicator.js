// ui/components/save-status-indicator.js
// Save status indicator component for user feedback

/**
 * Save Status Indicator Component
 * Provides visual feedback about settings save status
 *
 * States:
 * - saved: All changes saved successfully
 * - saving: Currently saving changes
 * - pending: Changes pending save
 * - error: Save operation failed
 */
class SaveStatusIndicator {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      position: options.position || "top-right", // top-right, top-left, bottom-right, bottom-left
      autoHide: options.autoHide !== false, // Auto-hide when saved (default true)
      autoHideDelay: options.autoHideDelay || 3000, // Auto-hide delay in ms
      showRetry: options.showRetry !== false, // Show retry button on error
      enableToasts: options.enableToasts || false, // Show toast notifications
      className: options.className || "", // Additional CSS classes
    };

    // Component state
    this.state = {
      status: "saved",
      message: "All changes saved",
      pendingCount: 0,
      lastError: null,
      visible: false,
    };

    // Timers
    this.autoHideTimer = null;
    this.toastTimer = null;

    // Callbacks
    this.onRetry = options.onRetry || (() => {});
    this.onDismiss = options.onDismiss || (() => {});

    // Create the component
    this.indicator = this.createIndicator();
    this.container.appendChild(this.indicator);

    // Initialize as hidden
    this.hide();
  }

  /**
   * Create the indicator DOM element
   * @returns {HTMLElement} Indicator element
   */
  createIndicator() {
    const indicator = document.createElement("div");
    indicator.className = `save-status-indicator ${this.options.position} ${this.options.className}`;
    indicator.setAttribute("role", "status");
    indicator.setAttribute("aria-live", "polite");

    indicator.innerHTML = `
      <div class="save-status-content">
        <div class="save-status-icon-container">
          <span class="save-status-icon" aria-hidden="true"></span>
          <div class="save-status-spinner" aria-hidden="true">
            <div class="save-status-spinner-dot"></div>
            <div class="save-status-spinner-dot"></div>
            <div class="save-status-spinner-dot"></div>
          </div>
        </div>
        <span class="save-status-text">All changes saved</span>
        <div class="save-status-actions">
          <button class="save-status-retry-btn" type="button" title="Retry save operation">
            <span aria-hidden="true">↻</span>
            <span class="sr-only">Retry</span>
          </button>
          <button class="save-status-dismiss-btn" type="button" title="Dismiss notification">
            <span aria-hidden="true">×</span>
            <span class="sr-only">Dismiss</span>
          </button>
        </div>
      </div>
      <div class="save-status-progress">
        <div class="save-status-progress-bar"></div>
      </div>
    `;

    // Add event listeners
    this.setupEventListeners(indicator);

    return indicator;
  }

  /**
   * Setup event listeners for the indicator
   * @param {HTMLElement} indicator - Indicator element
   */
  setupEventListeners(indicator) {
    const retryBtn = indicator.querySelector(".save-status-retry-btn");
    const dismissBtn = indicator.querySelector(".save-status-dismiss-btn");

    if (retryBtn) {
      retryBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onRetry();
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
        this.onDismiss();
      });
    }

    // Auto-hide on click for saved status
    indicator.addEventListener("click", () => {
      if (this.state.status === "saved" && this.options.autoHide) {
        this.hide();
      }
    });
  }

  /**
   * Update the indicator status
   * @param {string} status - New status (saved, saving, pending, error)
   * @param {Object} options - Additional options
   */
  updateStatus(status, options = {}) {
    const {
      message = this.getDefaultMessage(status),
      pendingCount = 0,
      error = null,
      autoShow = true,
    } = options;

    // Update state
    this.state = {
      status,
      message,
      pendingCount,
      lastError: error,
      visible: this.state.visible,
    };

    // Update DOM
    this.updateDOM();

    // Show/hide logic
    if (autoShow && this.shouldShow(status)) {
      this.show();
    } else if (this.shouldAutoHide(status)) {
      this.scheduleAutoHide();
    }

    // Toast notification
    if (this.options.enableToasts && this.shouldShowToast(status)) {
      this.showToast(message);
    }
  }

  /**
   * Update the DOM based on current state
   */
  updateDOM() {
    const { status, message, pendingCount, lastError } = this.state;

    // Update main container class
    this.indicator.className = `save-status-indicator ${this.options.position} ${this.options.className} ${status}`;

    // Update icon visibility
    const icon = this.indicator.querySelector(".save-status-icon");
    const spinner = this.indicator.querySelector(".save-status-spinner");

    if (status === "saving") {
      icon.style.display = "none";
      spinner.style.display = "block";
    } else {
      icon.style.display = "block";
      spinner.style.display = "none";
    }

    // Update text content
    const textElement = this.indicator.querySelector(".save-status-text");
    let displayMessage = message;

    if (status === "pending" && pendingCount > 0) {
      displayMessage = `${pendingCount} change${pendingCount === 1 ? "" : "s"} pending`;
    }

    textElement.textContent = displayMessage;

    // Update retry button visibility
    const retryBtn = this.indicator.querySelector(".save-status-retry-btn");
    if (retryBtn) {
      retryBtn.style.display =
        status === "error" && this.options.showRetry ? "inline-flex" : "none";
    }

    // Update dismiss button visibility
    const dismissBtn = this.indicator.querySelector(".save-status-dismiss-btn");
    if (dismissBtn) {
      dismissBtn.style.display =
        status === "error" || status === "pending" ? "inline-flex" : "none";
    }

    // Update progress bar (for saving state)
    const progressBar = this.indicator.querySelector(
      ".save-status-progress-bar",
    );
    if (progressBar) {
      if (status === "saving") {
        progressBar.style.animation = "save-status-progress 2s linear infinite";
      } else {
        progressBar.style.animation = "none";
      }
    }

    // Update ARIA attributes
    this.indicator.setAttribute("aria-label", `Save status: ${displayMessage}`);

    if (lastError) {
      this.indicator.setAttribute(
        "aria-describedby",
        "save-status-error-details",
      );
      // Could add error details element for screen readers
    } else {
      this.indicator.removeAttribute("aria-describedby");
    }
  }

  /**
   * Get default message for a status
   * @param {string} status - Status to get message for
   * @returns {string} Default message
   */
  getDefaultMessage(status) {
    const messages = {
      saved: "All changes saved",
      saving: "Saving changes...",
      pending: "Changes pending",
      error: "Save failed",
    };
    return messages[status] || "Unknown status";
  }

  /**
   * Check if indicator should be shown for a status
   * @param {string} status - Status to check
   * @returns {boolean} Whether to show
   */
  shouldShow(status) {
    return status !== "saved" || !this.options.autoHide;
  }

  /**
   * Check if indicator should auto-hide for a status
   * @param {string} status - Status to check
   * @returns {boolean} Whether to auto-hide
   */
  shouldAutoHide(status) {
    return status === "saved" && this.options.autoHide;
  }

  /**
   * Check if toast should be shown for a status
   * @param {string} status - Status to check
   * @returns {boolean} Whether to show toast
   */
  shouldShowToast(status) {
    return status === "error" || (status === "saved" && this.state.visible);
  }

  /**
   * Show the indicator
   */
  show() {
    this.state.visible = true;
    this.indicator.classList.add("visible");
    this.indicator.style.display = "block";

    // Clear any pending auto-hide
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  /**
   * Hide the indicator
   */
  hide() {
    this.state.visible = false;
    this.indicator.classList.remove("visible");

    // Use transition end to actually hide
    const onTransitionEnd = () => {
      if (!this.state.visible) {
        this.indicator.style.display = "none";
      }
      this.indicator.removeEventListener("transitionend", onTransitionEnd);
    };

    this.indicator.addEventListener("transitionend", onTransitionEnd);

    // Fallback timeout in case transition doesn't fire
    setTimeout(() => {
      if (!this.state.visible) {
        this.indicator.style.display = "none";
      }
    }, 500);
  }

  /**
   * Schedule auto-hide after delay
   */
  scheduleAutoHide() {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
    }

    this.autoHideTimer = setTimeout(() => {
      this.hide();
    }, this.options.autoHideDelay);
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   */
  showToast(message) {
    if (!this.options.enableToasts) return;

    // Create toast element
    const toast = document.createElement("div");
    toast.className = "save-status-toast";
    toast.textContent = message;
    toast.setAttribute("role", "alert");

    // Add to container
    this.container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.add("visible");
    }, 10);

    // Auto-remove
    this.toastTimer = setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }

  /**
   * Convenience methods for common status updates
   */

  showSaving() {
    this.updateStatus("saving");
  }

  showSaved() {
    this.updateStatus("saved");
  }

  showPending(count) {
    this.updateStatus("pending", { pendingCount: count });
  }

  showError(error, message = null) {
    this.updateStatus("error", {
      error,
      message: message || `Save failed: ${error?.message || "Unknown error"}`,
    });
  }

  /**
   * Get current status
   * @returns {Object} Current state
   */
  getStatus() {
    return { ...this.state };
  }

  /**
   * Check if indicator is currently visible
   * @returns {boolean} Visibility state
   */
  isVisible() {
    return this.state.visible;
  }

  /**
   * Update options
   * @param {Object} newOptions - New options to merge
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };

    // Update DOM if position changed
    if (newOptions.position) {
      this.indicator.className = `save-status-indicator ${this.options.position} ${this.options.className}`;
    }
  }

  /**
   * Destroy the component and clean up resources
   */
  destroy() {
    // Clear timers
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
    }
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    // Remove from DOM
    if (this.indicator && this.indicator.parentNode) {
      this.indicator.parentNode.removeChild(this.indicator);
    }

    // Clear references
    this.indicator = null;
    this.container = null;
    this.onRetry = null;
    this.onDismiss = null;
  }
}

// Export for use in different contexts
if (typeof module !== "undefined" && module.exports) {
  // CommonJS (Node.js)
  module.exports = SaveStatusIndicator;
} else if (typeof window !== "undefined") {
  // Browser environment
  window.SaveStatusIndicator = SaveStatusIndicator;
} else {
  // Service worker context
  self.SaveStatusIndicator = SaveStatusIndicator;
}
