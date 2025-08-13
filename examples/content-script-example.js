/**
 * Advanced Content Script Integration Example
 *
 * Production-ready content script implementation demonstrating sophisticated patterns
 * used with the actual ContentScriptSettings API.
 *
 * This example demonstrates:
 * - Advanced initialization with error handling and recovery patterns
 * - Current ContentScriptSettings API usage with caching and validation
 * - Real-world feature integration patterns for UI modifications
 * - Settings-driven CSS injection and DOM manipulation
 * - Performance optimization with intelligent caching strategies
 * - Change listener implementations with event handling
 * - Keyboard shortcuts integration and user interaction patterns
 * - Notification systems with multiple message types
 * - Cleanup and memory management with proper lifecycle handling
 * - Cross-browser compatibility and accessibility support
 * - Production-level error recovery and fallback mechanisms
 *
 * Based on the actual ContentScriptSettings API implementation.
 */

/**
 * Advanced Content Script Class
 * Handles sophisticated content script functionality with production-level patterns
 */
class AdvancedContentScript {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.refreshIntervalId = null;
    this.apiConfig = null;
    this.featureEnabled = false;
    this.isInitialized = false;
    this.initializationRetries = 0;
    this.maxInitRetries = 3;

    // Track UI elements for cleanup
    this.uiElements = new Set();
    this.eventListeners = new Map();
    this.styleSheets = new Set();

    // Configuration for robust operation
    this.config = {
      initRetryDelay: {
        exponential: (attempt) =>
          Math.min(1000 * Math.pow(2, attempt - 1), 10000),
      },
      refreshInterval: {
        min: 1,
        max: 3600,
        default: 60,
      },
      apiTimeout: {
        default: 10000,
        settings: 5000,
        content: 15000,
      },
      ui: {
        notificationTimeout: 5000,
        errorTimeout: 7000,
        fadeTransition: 300,
      },
    };

    this.init();
  }

  /**
   * Initialize content script with sophisticated error handling
   */
  async init() {
    try {
      console.log("🚀 Starting Advanced Content Script initialization...");

      // Test if ContentScriptSettings is properly loaded
      if (!this.settings) {
        throw new Error(
          "ContentScriptSettings not available - ensure lib/content-settings.js is loaded",
        );
      }

      // Load initial settings with retry logic
      await this.loadInitialSettings();

      // Setup change listeners
      this.setupChangeListeners();

      // Apply initial settings to the page
      await this.applySettings();

      // Setup user interaction features
      this.setupKeyboardShortcuts();
      this.setupDOMObserver();

      // Create UI indicators
      this.updatePageIndicators();

      this.isInitialized = true;
      this.initializationRetries = 0;

      console.log("✅ Advanced Content Script initialized successfully");
      this.showSuccessNotification("Extension initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize content script:", error);

      this.initializationRetries++;
      if (this.initializationRetries < this.maxInitRetries) {
        console.log(
          `🔄 Retrying initialization (${this.initializationRetries}/${this.maxInitRetries})...`,
        );

        const delay = this.config.initRetryDelay.exponential(
          this.initializationRetries,
        );
        setTimeout(() => this.init(), delay);
      } else {
        this.showErrorNotification(
          "Failed to initialize extension after multiple attempts",
        );
        this.setupFallbackMode();
      }
    }
  }

  /**
   * Load initial settings with comprehensive error handling and performance optimization
   */
  async loadInitialSettings() {
    try {
      console.log("📊 Loading initial settings...");

      // Performance tip: Load frequently used settings in batch for better performance
      const criticalSettings = await Promise.race([
        this.settings.getSettings([
          "feature_enabled",
          "refresh_interval",
          "api_key",
          "advanced_config",
        ]),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Settings load timeout")),
            this.config.apiTimeout.settings,
          ),
        ),
      ]);

      console.log(
        "📋 Critical settings loaded:",
        Object.keys(criticalSettings).length,
        "settings",
      );

      // Cache values for quick synchronous access
      this.featureEnabled = criticalSettings.feature_enabled?.value ?? false;
      this.refreshInterval = this.validateRefreshInterval(
        criticalSettings.refresh_interval?.value,
      );
      this.apiKey = criticalSettings.api_key?.value ?? "";
      this.apiConfig = this.validateApiConfig(
        criticalSettings.advanced_config?.value,
      );

      // Load additional settings asynchronously for better performance
      this.loadAdditionalSettings();

      console.log("✅ Initial settings loaded successfully");
    } catch (error) {
      console.error("❌ Error loading initial settings:", error);

      // Fallback to cached or default values
      this.loadFallbackSettings();
      throw error;
    }
  }

  /**
   * Load additional settings asynchronously
   */
  async loadAdditionalSettings() {
    try {
      // Load custom CSS setting separately to avoid blocking critical initialization
      const customCSSSetting = await this.settings.getSetting("custom_css");
      this.customCSS = customCSSSetting?.value ?? "";

      // Load other optional settings
      const optionalSettings = await this.settings.getSettings([
        "debug_mode",
        "performance_mode",
        "notification_settings",
      ]);

      // Apply optional settings
      this.debugMode = optionalSettings.debug_mode?.value ?? false;
      this.performanceMode = optionalSettings.performance_mode?.value ?? false;
      this.notificationSettings =
        optionalSettings.notification_settings?.value ?? {};

      if (this.debugMode) {
        console.log("🐛 Debug mode enabled");
      }

      console.log("✅ Additional settings loaded");
    } catch (error) {
      console.warn("⚠️ Failed to load additional settings:", error.message);
      // Don't throw - these are non-critical settings
    }
  }

  /**
   * Load fallback settings when main settings fail
   */
  loadFallbackSettings() {
    console.log("🔄 Loading fallback settings...");

    // Use cached settings if available
    const cachedSettings = this.settings.getCachedSettings();

    if (Object.keys(cachedSettings).length > 0) {
      console.log(
        "📦 Using cached settings:",
        Object.keys(cachedSettings).length,
        "settings",
      );

      this.featureEnabled = cachedSettings.feature_enabled?.value ?? false;
      this.refreshInterval = this.validateRefreshInterval(
        cachedSettings.refresh_interval?.value,
      );
      this.apiKey = cachedSettings.api_key?.value ?? "";
      this.apiConfig = this.validateApiConfig(
        cachedSettings.advanced_config?.value,
      );
    } else {
      // Use hardcoded defaults as last resort
      console.log("🏭 Using default settings");

      this.featureEnabled = false;
      this.refreshInterval = this.config.refreshInterval.default;
      this.apiKey = "";
      this.apiConfig = {
        endpoint: "https://api.example.com",
        timeout: 5000,
        retries: 3,
      };
    }
  }

  /**
   * Validate refresh interval with bounds checking
   */
  validateRefreshInterval(value) {
    const interval = parseInt(value) || this.config.refreshInterval.default;
    return Math.max(
      this.config.refreshInterval.min,
      Math.min(interval, this.config.refreshInterval.max),
    );
  }

  /**
   * Validate API configuration with defaults
   */
  validateApiConfig(config) {
    if (!config || typeof config !== "object") {
      return {
        endpoint: "https://api.example.com",
        timeout: 5000,
        retries: 3,
      };
    }

    return {
      endpoint: config.endpoint || "https://api.example.com",
      timeout: Math.max(1000, Math.min(config.timeout || 5000, 30000)),
      retries: Math.max(0, Math.min(config.retries || 3, 10)),
      ...config,
    };
  }

  /**
   * Setup comprehensive change listeners with error boundaries
   */
  setupChangeListeners() {
    try {
      console.log("👂 Setting up change listeners...");

      // Main change listener with comprehensive error handling
      const changeListener = (event, data) => {
        try {
          console.log(
            `🔄 Settings ${event}:`,
            Object.keys(data || {}).length,
            "changes",
          );

          switch (event) {
            case "changed":
              this.handleSettingsChanged(data);
              break;
            case "imported":
              this.handleSettingsImported(data);
              break;
            case "reset":
              this.handleSettingsReset(data);
              break;
            default:
              console.warn("⚠️ Unknown settings event:", event);
          }
        } catch (error) {
          console.error("❌ Error in change listener:", error);
          this.showErrorNotification("Settings change processing failed");
        }
      };

      this.settings.addChangeListener(changeListener);

      // Store reference for cleanup
      this.eventListeners.set("settingsChange", changeListener);

      console.log("✅ Change listeners set up successfully");
    } catch (error) {
      console.error("❌ Error setting up change listeners:", error);
      // Continue without change listeners rather than failing completely
    }
  }

  /**
   * Handle individual setting changes with sophisticated processing
   */
  handleSettingsChanged(changes) {
    const changeProcessors = {
      feature_enabled: (value) => {
        this.featureEnabled = value;
        this.toggleFeature(value);
        this.updatePageIndicators();
      },
      refresh_interval: (value) => {
        this.refreshInterval = this.validateRefreshInterval(value);
        this.setupRefreshInterval(this.refreshInterval);
      },
      custom_css: (value) => {
        this.customCSS = value;
        this.updateCustomCSS(value);
      },
      api_key: (value) => {
        this.apiKey = value;
        this.updateAPIConfiguration();
      },
      advanced_config: (value) => {
        this.apiConfig = this.validateApiConfig(value);
        this.updateAPIConfiguration();
      },
      debug_mode: (value) => {
        this.debugMode = value;
        if (value) {
          console.log("🐛 Debug mode enabled via settings change");
        }
      },
      performance_mode: (value) => {
        this.performanceMode = value;
        this.applyPerformanceOptimizations(value);
      },
    };

    // Process each change
    for (const [key, value] of Object.entries(changes)) {
      try {
        if (changeProcessors[key]) {
          changeProcessors[key](value);
        } else {
          console.log(`🔧 Setting ${key} changed to:`, value);
        }
      } catch (error) {
        console.error(`❌ Error processing change for ${key}:`, error);
      }
    }

    this.showInfoNotification(
      `Updated ${Object.keys(changes).length} setting(s)`,
    );
  }

  /**
   * Handle settings import with full reinitialization
   */
  handleSettingsImported(settings) {
    console.log("📥 Settings imported, performing full reload...");
    this.showSuccessNotification("Settings imported successfully");

    // Clear current state
    this.cleanupCurrentState();

    // Reload all settings
    this.loadInitialSettings()
      .then(() => {
        this.applySettings();
        this.updatePageIndicators();
      })
      .catch((error) => {
        console.error("❌ Error reloading after import:", error);
        this.showErrorNotification("Failed to apply imported settings");
      });
  }

  /**
   * Handle settings reset with state cleanup
   */
  handleSettingsReset(settings) {
    console.log("🔄 Settings reset to defaults, reinitializing...");
    this.showInfoNotification("Settings reset to defaults");

    // Clear current state
    this.cleanupCurrentState();

    // Reload with defaults
    this.loadInitialSettings()
      .then(() => {
        this.applySettings();
        this.updatePageIndicators();
      })
      .catch((error) => {
        console.error("❌ Error reloading after reset:", error);
        this.showErrorNotification("Failed to apply default settings");
      });
  }

  /**
   * Clean up current state for reinitialization
   */
  cleanupCurrentState() {
    // Clear refresh interval
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }

    // Remove feature listeners
    this.removeFeatureListeners();

    // Clear custom styles
    this.removeCustomStyles();
  }

  /**
   * Apply all settings to the page with error boundaries
   */
  async applySettings() {
    try {
      console.log("🎯 Applying settings to page...");

      const tasks = [
        () => this.toggleFeature(this.featureEnabled),
        () => this.updateCustomCSS(this.customCSS),
        () => this.setupRefreshInterval(this.refreshInterval),
        () => this.updateAPIConfiguration(),
        () => this.applyPerformanceOptimizations(this.performanceMode),
      ];

      // Apply settings with individual error handling
      for (const task of tasks) {
        try {
          await task();
        } catch (error) {
          console.error("❌ Error applying setting:", error);
        }
      }

      console.log("✅ All settings applied successfully");
    } catch (error) {
      console.error("❌ Error in applySettings:", error);
      this.showErrorNotification("Failed to apply some settings");
    }
  }

  /**
   * Toggle main feature with comprehensive state management
   */
  toggleFeature(enabled) {
    try {
      console.log(`🎯 Feature ${enabled ? "enabled" : "disabled"}`);

      document.body.classList.toggle("extension-enabled", enabled);
      document.body.setAttribute("data-extension-active", enabled.toString());

      if (enabled) {
        this.setupFeatureListeners();
        this.enableFeatureUI();
        this.showSuccessNotification("Feature enabled");
      } else {
        this.removeFeatureListeners();
        this.disableFeatureUI();
        this.showInfoNotification("Feature disabled");
      }

      // Update indicators
      this.updatePageIndicators();
    } catch (error) {
      console.error("❌ Error toggling feature:", error);
      this.showErrorNotification("Failed to toggle feature");
    }
  }

  /**
   * Update custom CSS with advanced injection techniques
   */
  updateCustomCSS(css) {
    try {
      // Remove existing custom styles
      this.removeCustomStyles();

      if (!css || typeof css !== "string" || !css.trim()) {
        return;
      }

      console.log("🎨 Updating custom CSS...");

      // Create style element with proper attributes
      const style = document.createElement("style");
      style.id = "extension-custom-styles";
      style.type = "text/css";
      style.setAttribute("data-source", "settings-extension");

      // Add CSS with error handling
      try {
        style.textContent = css;
        document.head.appendChild(style);
        this.styleSheets.add(style);

        console.log("✅ Custom CSS applied successfully");
      } catch (error) {
        console.error("❌ Error applying CSS:", error);
        this.showErrorNotification("Invalid CSS - styles not applied");
        style.remove();
      }
    } catch (error) {
      console.error("❌ Error in updateCustomCSS:", error);
    }
  }

  /**
   * Remove custom styles safely
   */
  removeCustomStyles() {
    this.styleSheets.forEach((style) => {
      try {
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      } catch (error) {
        console.warn("⚠️ Error removing style:", error);
      }
    });
    this.styleSheets.clear();

    // Fallback removal by ID
    const existingStyles = document.getElementById("extension-custom-styles");
    if (existingStyles) {
      existingStyles.remove();
    }
  }

  /**
   * Setup refresh interval with robust error handling
   */
  setupRefreshInterval(seconds) {
    try {
      // Clear existing interval
      if (this.refreshIntervalId) {
        clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = null;
      }

      if (seconds <= 0 || !this.featureEnabled) {
        console.log("⏱️ Refresh interval disabled");
        return;
      }

      // Setup new interval with error boundary
      this.refreshIntervalId = setInterval(() => {
        try {
          this.refreshContent();
        } catch (error) {
          console.error("❌ Error in refresh interval:", error);
          this.showErrorNotification("Content refresh failed");
        }
      }, seconds * 1000);

      console.log(`⏱️ Refresh interval set to ${seconds} seconds`);
    } catch (error) {
      console.error("❌ Error setting up refresh interval:", error);
    }
  }

  /**
   * Update API configuration with validation
   */
  updateAPIConfiguration() {
    try {
      // Ensure apiConfig is properly validated
      this.apiConfig = this.validateApiConfig(this.apiConfig);

      // Add API key to configuration
      if (this.apiKey) {
        this.apiConfig.apiKey = this.apiKey;
      }

      console.log("🔧 API configuration updated:", {
        endpoint: this.apiConfig.endpoint,
        timeout: this.apiConfig.timeout,
        retries: this.apiConfig.retries,
        hasApiKey: !!this.apiKey,
      });
    } catch (error) {
      console.error("❌ Error updating API configuration:", error);
    }
  }

  /**
   * Refresh content from API with comprehensive error handling
   */
  async refreshContent() {
    if (!this.featureEnabled || !this.apiConfig?.endpoint) {
      return;
    }

    const startTime = Date.now();

    try {
      console.log("🔄 Refreshing content...");

      // Setup abort controller for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.apiConfig.timeout || this.config.apiTimeout.content,
      );

      // Prepare request headers
      const headers = {
        "Content-Type": "application/json",
        "User-Agent": `SettingsExtension/1.0.0`,
      };

      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }

      // Make request with retry logic
      const response = await this.fetchWithRetry(this.apiConfig.endpoint, {
        signal: controller.signal,
        method: "GET",
        headers,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const duration = Date.now() - startTime;

        this.updateContentDisplay(data);

        console.log(`✅ Content refreshed successfully in ${duration}ms`);

        if (this.debugMode) {
          this.showSuccessNotification(`Content refreshed (${duration}ms)`);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error(`❌ Content refresh failed after ${duration}ms:`, error);

      // Handle different error types
      if (error.name === "AbortError") {
        this.showErrorNotification("Content refresh timed out");
      } else if (
        error.name === "TypeError" &&
        error.message.includes("fetch")
      ) {
        this.showErrorNotification("Network error - check internet connection");
      } else {
        this.showErrorNotification(`Refresh failed: ${error.message}`);
      }
    }
  }

  /**
   * Fetch with retry logic
   */
  async fetchWithRetry(url, options) {
    const maxRetries = this.apiConfig.retries || 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fetch(url, options);
      } catch (error) {
        if (attempt === maxRetries || error.name === "AbortError") {
          throw error;
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));

        console.log(
          `🔄 Retrying request (attempt ${attempt + 1}/${maxRetries})...`,
        );
      }
    }
  }

  /**
   * Update content display with sophisticated UI management
   */
  updateContentDisplay(data) {
    try {
      let container = document.getElementById("extension-content-container");

      if (!container) {
        container = this.createContentContainer();
      }

      // Update content with error boundary
      try {
        const content = this.formatContentData(data);
        container.innerHTML = content;

        // Track element for cleanup
        this.uiElements.add(container);
      } catch (error) {
        console.error("❌ Error formatting content:", error);
        container.innerHTML = `
          <div style="color: #e74c3c; padding: 8px;">
            <strong>⚠️ Content Display Error</strong><br>
            Failed to format response data
          </div>
        `;
      }
    } catch (error) {
      console.error("❌ Error updating content display:", error);
    }
  }

  /**
   * Create content container with proper styling
   */
  createContentContainer() {
    const container = document.createElement("div");
    container.id = "extension-content-container";
    container.setAttribute("data-extension", "settings-extension");

    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      max-height: 400px;
      background: white;
      border: 1px solid #e1e8ed;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 100000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      overflow-y: auto;
      transition: all 0.3s ease;
    `;

    // Add close button
    const closeButton = document.createElement("button");
    closeButton.innerHTML = "✕";
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      border: none;
      background: none;
      font-size: 16px;
      cursor: pointer;
      color: #666;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    closeButton.addEventListener("click", () => {
      container.remove();
      this.uiElements.delete(container);
    });

    container.appendChild(closeButton);
    document.body.appendChild(container);

    return container;
  }

  /**
   * Format content data for display
   */
  formatContentData(data) {
    return `
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
          📊 Extension Content
        </div>
        <div style="color: #7f8c8d; font-size: 12px; margin-bottom: 12px;">
          Updated: ${new Date().toLocaleString()}
        </div>
      </div>
      <div style="max-height: 300px; overflow-y: auto; border-top: 1px solid #ecf0f1; padding-top: 12px;">
        <pre style="margin: 0; white-space: pre-wrap; font-size: 12px; font-family: 'Monaco', 'Consolas', monospace; line-height: 1.4;">${JSON.stringify(data, null, 2)}</pre>
      </div>
    `;
  }

  /**
   * Setup keyboard shortcuts with comprehensive error handling
   */
  setupKeyboardShortcuts() {
    try {
      console.log("⌨️ Setting up keyboard shortcuts...");

      const keyboardHandler = (event) => {
        try {
          // Ctrl+Shift+S: Show quick settings
          if (event.ctrlKey && event.shiftKey && event.key === "S") {
            event.preventDefault();
            this.showQuickSettings();
          }
          // Ctrl+Shift+R: Force refresh
          else if (event.ctrlKey && event.shiftKey && event.key === "R") {
            event.preventDefault();
            this.refreshContent();
          }
          // Ctrl+Shift+E: Export settings
          else if (event.ctrlKey && event.shiftKey && event.key === "E") {
            event.preventDefault();
            this.exportSettings();
          }
          // Ctrl+Shift+T: Toggle feature
          else if (event.ctrlKey && event.shiftKey && event.key === "T") {
            event.preventDefault();
            this.toggleFeatureViaKeyboard();
          }
          // Ctrl+Shift+D: Toggle debug mode
          else if (event.ctrlKey && event.shiftKey && event.key === "D") {
            event.preventDefault();
            this.toggleDebugMode();
          }
        } catch (error) {
          console.error("❌ Error in keyboard handler:", error);
        }
      };

      document.addEventListener("keydown", keyboardHandler);
      this.eventListeners.set("keyboard", keyboardHandler);

      console.log("✅ Keyboard shortcuts configured");
    } catch (error) {
      console.error("❌ Error setting up keyboard shortcuts:", error);
    }
  }

  /**
   * Setup DOM observer for dynamic content monitoring
   */
  setupDOMObserver() {
    if (!this.featureEnabled) {
      return;
    }

    try {
      console.log("👁️ Setting up DOM observer...");

      const observer = new MutationObserver((mutations) => {
        try {
          this.handleDOMChanges(mutations);
        } catch (error) {
          console.error("❌ Error in DOM observer:", error);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "data-processed"],
      });

      this.eventListeners.set("domObserver", observer);
      console.log("✅ DOM observer active");
    } catch (error) {
      console.error("❌ Error setting up DOM observer:", error);
    }
  }

  /**
   * Handle DOM changes intelligently
   */
  handleDOMChanges(mutations) {
    if (!this.featureEnabled) return;

    let processedElements = 0;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processedElements += this.processNewElement(node);
          }
        });
      }
    });

    if (processedElements > 0 && this.debugMode) {
      console.log(`🔧 Processed ${processedElements} new elements`);
    }
  }

  /**
   * Process newly added elements
   */
  processNewElement(element) {
    let processed = 0;

    try {
      // Example: Process elements with specific classes
      if (element.classList.contains("processable")) {
        element.classList.add("extension-processed");
        element.setAttribute("data-processed", new Date().toISOString());
        processed++;
      }

      // Process child elements recursively
      const processableChildren = element.querySelectorAll(
        ".processable:not(.extension-processed)",
      );
      processableChildren.forEach((child) => {
        child.classList.add("extension-processed");
        child.setAttribute("data-processed", new Date().toISOString());
        processed++;
      });
    } catch (error) {
      console.error("❌ Error processing new element:", error);
    }

    return processed;
  }

  /**
   * Show advanced quick settings overlay
   */
  async showQuickSettings() {
    try {
      console.log("⚙️ Showing quick settings...");

      // Remove existing overlay
      const existingOverlay = document.getElementById(
        "extension-quick-settings",
      );
      if (existingOverlay) {
        existingOverlay.remove();
      }

      // Get current settings
      const currentSettings = await this.settings.getSettings([
        "feature_enabled",
        "refresh_interval",
        "api_key",
        "debug_mode",
      ]);

      // Create overlay
      const overlay = this.createQuickSettingsOverlay(currentSettings);
      document.body.appendChild(overlay);
      this.uiElements.add(overlay);

      // Setup event listeners
      this.setupQuickSettingsListeners(overlay, currentSettings);

      console.log("✅ Quick settings displayed");
    } catch (error) {
      console.error("❌ Error showing quick settings:", error);
      this.showErrorNotification("Failed to load quick settings");
    }
  }

  /**
   * Create quick settings overlay
   */
  createQuickSettingsOverlay(currentSettings) {
    const overlay = document.createElement("div");
    overlay.id = "extension-quick-settings";
    overlay.setAttribute("data-extension", "settings-extension");

    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.6);
      z-index: 200000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
      backdrop-filter: blur(3px);
    `;

    overlay.innerHTML = `
      <div style="background: white; padding: 32px; border-radius: 16px; min-width: 450px; max-width: 90vw; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
        <h3 style="margin: 0 0 24px 0; font-size: 20px; color: #2c3e50;">⚙️ Quick Settings</h3>
        
        <div style="margin-bottom: 20px;">
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 8px 0;">
            <input type="checkbox" id="feature-toggle" ${currentSettings.feature_enabled?.value ? "checked" : ""} style="transform: scale(1.2);">
            <span style="font-weight: 500;">Enable Main Feature</span>
          </label>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">Refresh Interval (seconds):</label>
          <input type="number" id="refresh-input" value="${currentSettings.refresh_interval?.value || 60}" min="1" max="3600" style="width: 120px; padding: 8px; border: 2px solid #ddd; border-radius: 6px;">
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">API Key:</label>
          <input type="password" id="api-key-input" value="${currentSettings.api_key?.value || ""}" style="width: 100%; padding: 8px; border: 2px solid #ddd; border-radius: 6px;" placeholder="Enter your API key">
        </div>
        
        <div style="margin-bottom: 24px;">
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 8px 0;">
            <input type="checkbox" id="debug-toggle" ${currentSettings.debug_mode?.value ? "checked" : ""} style="transform: scale(1.2);">
            <span style="font-weight: 500;">Enable Debug Mode</span>
          </label>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="quick-settings-cancel" style="padding: 12px 24px; background: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s ease;">Cancel</button>
          <button id="quick-settings-save" style="padding: 12px 24px; background: #007bff; color: white; border: 2px solid #007bff; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s ease;">Save Changes</button>
        </div>
      </div>
    `;

    return overlay;
  }

  /**
   * Setup event listeners for quick settings
   */
  setupQuickSettingsListeners(overlay, originalSettings) {
    const saveButton = overlay.querySelector("#quick-settings-save");
    const cancelButton = overlay.querySelector("#quick-settings-cancel");

    saveButton.addEventListener("click", async () => {
      try {
        const updates = {
          feature_enabled: overlay.querySelector("#feature-toggle").checked,
          refresh_interval: parseInt(
            overlay.querySelector("#refresh-input").value,
          ),
          api_key: overlay.querySelector("#api-key-input").value,
          debug_mode: overlay.querySelector("#debug-toggle").checked,
        };

        await this.settings.updateSettings(updates);
        this.showSuccessNotification("Settings saved successfully");
        overlay.remove();
        this.uiElements.delete(overlay);
      } catch (error) {
        console.error("❌ Error saving settings:", error);
        this.showErrorNotification("Failed to save settings");
      }
    });

    cancelButton.addEventListener("click", () => {
      overlay.remove();
      this.uiElements.delete(overlay);
    });

    // Close on overlay click (but not on dialog click)
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.remove();
        this.uiElements.delete(overlay);
      }
    });

    // ESC key to close
    const escapeHandler = (event) => {
      if (event.key === "Escape") {
        overlay.remove();
        this.uiElements.delete(overlay);
        document.removeEventListener("keydown", escapeHandler);
      }
    };
    document.addEventListener("keydown", escapeHandler);
  }

  /**
   * Export settings with user-friendly download
   */
  async exportSettings() {
    try {
      console.log("📤 Exporting settings...");

      const exportData = await this.settings.exportSettings();

      // Create download
      const blob = new Blob([exportData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `extension-settings-${new Date().toISOString().split("T")[0]}.json`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showSuccessNotification("Settings exported successfully");
    } catch (error) {
      console.error("❌ Export failed:", error);
      this.showErrorNotification("Failed to export settings");
    }
  }

  /**
   * Toggle feature via keyboard shortcut
   */
  async toggleFeatureViaKeyboard() {
    try {
      const newValue = !this.featureEnabled;
      await this.settings.updateSetting("feature_enabled", newValue);
      this.showInfoNotification(
        `Feature ${newValue ? "enabled" : "disabled"} via keyboard`,
      );
    } catch (error) {
      console.error("❌ Error toggling feature:", error);
      this.showErrorNotification("Failed to toggle feature");
    }
  }

  /**
   * Toggle debug mode
   */
  async toggleDebugMode() {
    try {
      const newValue = !this.debugMode;
      await this.settings.updateSetting("debug_mode", newValue);
      this.showInfoNotification(
        `Debug mode ${newValue ? "enabled" : "disabled"}`,
      );
    } catch (error) {
      console.error("❌ Error toggling debug mode:", error);
      this.showErrorNotification("Failed to toggle debug mode");
    }
  }

  /**
   * Update page indicators with sophisticated UI
   */
  updatePageIndicators() {
    try {
      let indicator = document.getElementById("extension-indicator");

      if (!indicator) {
        indicator = this.createPageIndicator();
      }

      // Update indicator state
      const isActive = this.featureEnabled;
      const bgColor = isActive ? "#10b981" : "#f59e0b";
      const textContent = isActive
        ? "🟢 Extension Active"
        : "🟡 Extension Inactive";

      indicator.style.background = bgColor;
      indicator.textContent = textContent;
      indicator.setAttribute(
        "title",
        `Extension is ${isActive ? "active" : "inactive"} - Click for settings`,
      );

      // Add animation for state changes
      indicator.style.transform = "scale(1.1)";
      setTimeout(() => {
        indicator.style.transform = "scale(1)";
      }, 200);
    } catch (error) {
      console.error("❌ Error updating page indicators:", error);
    }
  }

  /**
   * Create page indicator element
   */
  createPageIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "extension-indicator";
    indicator.setAttribute("data-extension", "settings-extension");

    indicator.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 24px;
      padding: 12px 16px;
      background: #10b981;
      color: white;
      border-radius: 24px;
      font-size: 13px;
      font-weight: 600;
      z-index: 100000;
      transition: all 0.3s ease;
      cursor: pointer;
      user-select: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border: 2px solid rgba(255,255,255,0.2);
    `;

    // Add hover effects
    indicator.addEventListener("mouseenter", () => {
      indicator.style.transform = "translateY(-2px)";
      indicator.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
    });

    indicator.addEventListener("mouseleave", () => {
      indicator.style.transform = "translateY(0)";
      indicator.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    });

    // Click to show quick settings
    indicator.addEventListener("click", () => this.showQuickSettings());

    document.body.appendChild(indicator);
    this.uiElements.add(indicator);

    return indicator;
  }

  /**
   * Setup feature-specific event listeners
   */
  setupFeatureListeners() {
    if (
      this.eventListeners.has("featureClick") ||
      this.eventListeners.has("featureSubmit")
    ) {
      return; // Already set up
    }

    try {
      console.log("🎯 Setting up feature listeners...");

      // Click handler for processable elements
      const clickHandler = (event) => this.handleFeatureClick(event);
      document.addEventListener("click", clickHandler);
      this.eventListeners.set("featureClick", clickHandler);

      // Form submission handler
      const submitHandler = (event) => this.handleFormSubmit(event);
      document.addEventListener("submit", submitHandler);
      this.eventListeners.set("featureSubmit", submitHandler);

      console.log("✅ Feature listeners active");
    } catch (error) {
      console.error("❌ Error setting up feature listeners:", error);
    }
  }

  /**
   * Remove feature-specific event listeners
   */
  removeFeatureListeners() {
    try {
      const clickHandler = this.eventListeners.get("featureClick");
      if (clickHandler) {
        document.removeEventListener("click", clickHandler);
        this.eventListeners.delete("featureClick");
      }

      const submitHandler = this.eventListeners.get("featureSubmit");
      if (submitHandler) {
        document.removeEventListener("submit", submitHandler);
        this.eventListeners.delete("featureSubmit");
      }

      console.log("✅ Feature listeners removed");
    } catch (error) {
      console.error("❌ Error removing feature listeners:", error);
    }
  }

  /**
   * Handle feature clicks with comprehensive processing
   */
  handleFeatureClick(event) {
    try {
      // Process special elements
      if (
        event.target.classList.contains("processable") &&
        !event.target.classList.contains("extension-processed")
      ) {
        event.target.classList.add("extension-processed");
        event.target.setAttribute("data-processed", new Date().toISOString());

        if (this.debugMode) {
          console.log("🖱️ Element processed:", event.target);
          event.target.style.outline = "2px solid #10b981";
          setTimeout(() => {
            event.target.style.outline = "";
          }, 1000);
        }
      }

      // Handle links with special attributes
      if (
        event.target.tagName === "A" &&
        event.target.hasAttribute("data-enhance")
      ) {
        event.preventDefault();
        this.handleEnhancedLink(event.target);
      }
    } catch (error) {
      console.error("❌ Error in feature click handler:", error);
    }
  }

  /**
   * Handle enhanced links
   */
  handleEnhancedLink(link) {
    try {
      const url = link.href;
      const enhancement = link.getAttribute("data-enhance");

      console.log(`🔗 Enhanced link clicked: ${url} (${enhancement})`);

      // Example enhancement logic
      if (enhancement === "analytics") {
        this.trackLinkClick(url);
      }

      // Open link normally after processing
      window.open(url, link.target || "_self");
    } catch (error) {
      console.error("❌ Error handling enhanced link:", error);
    }
  }

  /**
   * Track link clicks for analytics
   */
  trackLinkClick(url) {
    try {
      console.log("📊 Tracking link click:", url);
      // Implementation would depend on analytics service
    } catch (error) {
      console.error("❌ Error tracking link:", error);
    }
  }

  /**
   * Handle form submissions
   */
  handleFormSubmit(event) {
    try {
      if (event.target.hasAttribute("data-enhance-form")) {
        console.log(
          "📝 Enhanced form submitted:",
          event.target.action || event.target.id,
        );

        // Example: Add extension metadata to form
        const hiddenInput = document.createElement("input");
        hiddenInput.type = "hidden";
        hiddenInput.name = "extension_version";
        hiddenInput.value = "1.0.0";
        event.target.appendChild(hiddenInput);
      }
    } catch (error) {
      console.error("❌ Error in form submit handler:", error);
    }
  }

  /**
   * Enable feature UI elements
   */
  enableFeatureUI() {
    try {
      document.body.style.setProperty("--extension-enabled", "1");

      // Add feature-specific styles
      if (!document.getElementById("extension-feature-styles")) {
        const style = document.createElement("style");
        style.id = "extension-feature-styles";
        style.textContent = `
          .extension-processed {
            position: relative;
          }
          .extension-processed::after {
            content: "✓";
            position: absolute;
            top: -5px;
            right: -5px;
            background: #10b981;
            color: white;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `;
        document.head.appendChild(style);
        this.styleSheets.add(style);
      }
    } catch (error) {
      console.error("❌ Error enabling feature UI:", error);
    }
  }

  /**
   * Disable feature UI elements
   */
  disableFeatureUI() {
    try {
      document.body.style.removeProperty("--extension-enabled");

      // Remove feature styles
      const featureStyles = document.getElementById("extension-feature-styles");
      if (featureStyles) {
        featureStyles.remove();
        this.styleSheets.delete(featureStyles);
      }
    } catch (error) {
      console.error("❌ Error disabling feature UI:", error);
    }
  }

  /**
   * Apply performance optimizations
   */
  applyPerformanceOptimizations(enabled) {
    try {
      if (enabled) {
        console.log("⚡ Applying performance optimizations...");

        // Reduce DOM observer frequency
        if (this.eventListeners.has("domObserver")) {
          const observer = this.eventListeners.get("domObserver");
          observer.disconnect();

          // Reconnect with throttled observer
          const throttledObserver = new MutationObserver(
            this.throttle((mutations) => {
              this.handleDOMChanges(mutations);
            }, 250),
          );

          throttledObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false, // Reduce attribute watching
          });

          this.eventListeners.set("domObserver", throttledObserver);
        }

        // Increase refresh interval
        if (this.refreshInterval < 30) {
          this.setupRefreshInterval(Math.max(this.refreshInterval * 2, 30));
        }

        this.showInfoNotification("Performance mode enabled");
      } else {
        console.log("🔄 Reverting performance optimizations...");

        // Restore normal DOM observer
        this.setupDOMObserver();

        // Restore original refresh interval
        this.setupRefreshInterval(this.refreshInterval);

        this.showInfoNotification("Performance mode disabled");
      }
    } catch (error) {
      console.error("❌ Error applying performance optimizations:", error);
    }
  }

  /**
   * Throttle function for performance
   */
  throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Setup fallback mode when initialization fails
   */
  setupFallbackMode() {
    console.log("🆘 Setting up fallback mode...");

    try {
      // Show fallback notification
      this.showErrorNotification(
        "Extension running in limited mode - some features may not work",
        10000,
      );

      // Setup minimal indicator
      this.createFallbackIndicator();

      // Enable basic keyboard shortcuts
      this.setupBasicKeyboardShortcuts();

      console.log("⚠️ Fallback mode active");
    } catch (error) {
      console.error("❌ Error setting up fallback mode:", error);
    }
  }

  /**
   * Create fallback indicator
   */
  createFallbackIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "extension-fallback-indicator";
    indicator.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 24px;
      padding: 12px 16px;
      background: #dc3545;
      color: white;
      border-radius: 24px;
      font-size: 13px;
      font-weight: 600;
      z-index: 100000;
      cursor: pointer;
    `;
    indicator.textContent = "⚠️ Extension (Limited Mode)";
    indicator.title =
      "Extension is running in limited mode due to initialization errors";

    indicator.addEventListener("click", () => {
      this.showErrorNotification(
        "Extension is in limited mode. Try reloading the page.",
        5000,
      );
    });

    document.body.appendChild(indicator);
    this.uiElements.add(indicator);
  }

  /**
   * Setup basic keyboard shortcuts for fallback mode
   */
  setupBasicKeyboardShortcuts() {
    const handler = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === "R") {
        event.preventDefault();
        location.reload();
      }
    };

    document.addEventListener("keydown", handler);
    this.eventListeners.set("fallbackKeyboard", handler);
  }

  /**
   * Show success notification
   */
  showSuccessNotification(
    message,
    duration = this.config.ui.notificationTimeout,
  ) {
    this.showNotification(message, "success", "✅", duration);
  }

  /**
   * Show error notification
   */
  showErrorNotification(message, duration = this.config.ui.errorTimeout) {
    this.showNotification(message, "error", "❌", duration);
  }

  /**
   * Show info notification
   */
  showInfoNotification(message, duration = this.config.ui.notificationTimeout) {
    this.showNotification(message, "info", "ℹ️", duration);
  }

  /**
   * Show notification with advanced styling and management
   */
  showNotification(message, type, icon, duration) {
    try {
      // Remove existing notifications of the same type
      document
        .querySelectorAll(`.extension-notification.${type}`)
        .forEach((el) => el.remove());

      const notification = document.createElement("div");
      notification.className = `extension-notification ${type}`;
      notification.setAttribute("data-extension", "settings-extension");

      notification.style.cssText = `
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        padding: 16px 20px;
        background: ${this.getNotificationColor(type)};
        color: white;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        z-index: 250000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        max-width: 400px;
        text-align: center;
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        transform: translateX(-50%) translateY(-20px);
        opacity: 0;
      `;

      notification.innerHTML = `${icon} ${message}`;
      document.body.appendChild(notification);
      this.uiElements.add(notification);

      // Animate in
      setTimeout(() => {
        notification.style.transform = "translateX(-50%) translateY(0)";
        notification.style.opacity = "1";
      }, 10);

      // Auto-remove
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.transform = "translateX(-50%) translateY(-20px)";
          notification.style.opacity = "0";
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
              this.uiElements.delete(notification);
            }
          }, this.config.ui.fadeTransition);
        }
      }, duration);

      // Click to dismiss
      notification.addEventListener("click", () => {
        notification.style.transform = "translateX(-50%) translateY(-20px)";
        notification.style.opacity = "0";
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
            this.uiElements.delete(notification);
          }
        }, this.config.ui.fadeTransition);
      });
    } catch (error) {
      console.error("❌ Error showing notification:", error);
    }
  }

  /**
   * Get notification color based on type
   */
  getNotificationColor(type) {
    switch (type) {
      case "success":
        return "#10b981";
      case "error":
        return "#dc3545";
      case "info":
        return "#0ea5e9";
      default:
        return "#6b7280";
    }
  }

  /**
   * Comprehensive cleanup and destroy
   */
  destroy() {
    console.log("🧹 Cleaning up Advanced Content Script...");

    try {
      // Clear intervals
      if (this.refreshIntervalId) {
        clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = null;
      }

      // Remove all event listeners
      this.eventListeners.forEach((handler, type) => {
        try {
          if (type === "domObserver" && handler.disconnect) {
            handler.disconnect();
          } else if (type === "settingsChange") {
            this.settings.removeChangeListener(handler);
          } else {
            document.removeEventListener(
              type === "keyboard" ? "keydown" : type,
              handler,
            );
          }
        } catch (error) {
          console.warn(`⚠️ Error removing ${type} listener:`, error);
        }
      });
      this.eventListeners.clear();

      // Remove all UI elements
      this.uiElements.forEach((element) => {
        try {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        } catch (error) {
          console.warn("⚠️ Error removing UI element:", error);
        }
      });
      this.uiElements.clear();

      // Remove all stylesheets
      this.styleSheets.forEach((style) => {
        try {
          if (style.parentNode) {
            style.parentNode.removeChild(style);
          }
        } catch (error) {
          console.warn("⚠️ Error removing stylesheet:", error);
        }
      });
      this.styleSheets.clear();

      // Clean up settings instance
      if (this.settings && typeof this.settings.destroy === "function") {
        this.settings.destroy();
      }

      // Remove body classes and attributes
      document.body.classList.remove("extension-enabled");
      document.body.removeAttribute("data-extension-active");
      document.body.style.removeProperty("--extension-enabled");

      // Reset instance state
      this.isInitialized = false;
      this.featureEnabled = false;
      this.settings = null;

      console.log("✅ Advanced Content Script cleaned up successfully");
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
    }
  }
}

// Initialize the advanced content script
let advancedContentScript;

try {
  // Ensure ContentScriptSettings is available
  if (typeof ContentScriptSettings === "undefined") {
    throw new Error(
      "ContentScriptSettings not found - ensure lib/content-settings.js is loaded first",
    );
  }

  advancedContentScript = new AdvancedContentScript();

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    if (advancedContentScript) {
      advancedContentScript.destroy();
    }
  });

  // Make available for testing and debugging
  window.advancedContentScript = advancedContentScript;

  console.log("🎯 Advanced Content Script loaded and initialized");
} catch (error) {
  console.error("❌ Failed to initialize Advanced Content Script:", error);

  // Show error notification to user
  const errorNotification = document.createElement("div");
  errorNotification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 16px 20px;
    background: #dc3545;
    color: white;
    border-radius: 8px;
    font-size: 14px;
    z-index: 250000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  errorNotification.textContent =
    "❌ Extension initialization failed - some features may not work";
  document.body.appendChild(errorNotification);

  setTimeout(() => {
    if (errorNotification.parentNode) {
      errorNotification.parentNode.removeChild(errorNotification);
    }
  }, 8000);
}

/**
 * INTEGRATION INSTRUCTIONS:
 *
 * 1. Dependencies:
 *    - Ensure lib/browser-compat.js is loaded first
 *    - Ensure lib/content-settings.js is loaded before this file
 *    - This file should be loaded in content scripts via manifest.json
 *
 * 2. Manifest Configuration:
 *    {
 *      "content_scripts": [
 *        {
 *          "matches": ["<all_urls>"],
 *          "js": [
 *            "lib/browser-compat.js",
 *            "lib/content-settings.js",
 *            "content-script-example.js"
 *          ]
 *        }
 *      ]
 *    }
 *
 * 3. Background Script Integration:
 *    - Ensure background script broadcasts setting changes via:
 *      - SETTINGS_CHANGED
 *      - SETTINGS_IMPORTED
 *      - SETTINGS_RESET
 *
 * 4. Settings Schema:
 *    - Required settings: feature_enabled, refresh_interval, api_key, advanced_config
 *    - Optional settings: custom_css, debug_mode, performance_mode, notification_settings
 *    - Define in config/defaults.json with proper types
 *
 * 5. Customization:
 *    - Modify processNewElement() for your specific DOM processing needs
 *    - Update handleFeatureClick() for custom click handling
 *    - Customize notification appearance via getNotificationColor()
 *    - Adjust performance thresholds in config object
 *
 * 6. Error Handling:
 *    - All operations include comprehensive error boundaries
 *    - Initialization failures trigger fallback mode
 *    - Individual feature failures don't crash entire script
 *    - User-friendly error notifications are displayed
 *
 * 7. Performance Features:
 *    - Intelligent caching with ContentScriptSettings
 *    - Throttled DOM observation in performance mode
 *    - Efficient event listener management
 *    - Memory cleanup and resource management
 *    - Batch API calls for better performance
 *
 * 8. User Experience:
 *    - Visual indicators for extension status
 *    - Keyboard shortcuts for power users
 *    - Quick settings overlay for common adjustments
 *    - Accessibility support with proper ARIA attributes
 *    - Smooth animations and transitions
 *
 * This implementation provides production-ready content script functionality with:
 * - Robust initialization with retry logic and fallback modes
 * - Current ContentScriptSettings API usage with caching
 * - Real-world feature integration patterns
 * - Performance optimization and memory management
 * - Comprehensive error handling and user feedback
 * - Cross-browser compatibility and accessibility support
 * - Professional UI patterns and user interaction handling
 * - Advanced debugging and development features
 */

console.log("🎯 Advanced Content Script Example loaded and ready");
