// lib/config-loader.js
// Centralized configuration loader for settings management
// Provides single source of truth for all setting definitions

class ConfigurationLoader {
  constructor() {
    this.config = null;
    this.configCache = null;
    this.cacheTimestamp = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Get browserAPI from global context with error handling
   * @returns {Object} The global browserAPI object
   * @throws {Error} If browserAPI is not available
   */
  getBrowserAPI() {
    let browserAPI;

    if (typeof self !== "undefined" && self.browserAPI) {
      // Service worker context
      browserAPI = self.browserAPI;
    } else if (typeof window !== "undefined" && window.browserAPI) {
      // Browser context
      browserAPI = window.browserAPI;
    } else if (typeof global !== "undefined" && global.browserAPI) {
      // Node.js context
      browserAPI = global.browserAPI;
    }

    if (!browserAPI) {
      throw new Error(
        "browserAPI not available. Ensure browser-compat.js is loaded first.",
      );
    }

    return browserAPI;
  }

  /**
   * Load configuration from defaults.json
   * @returns {Promise<Object>} The configuration object
   */
  async loadConfiguration() {
    // Check cache validity
    if (this.isCacheValid()) {
      return this.configCache;
    }

    try {
      // Load from defaults.json via web_accessible_resources
      const browserAPI = this.getBrowserAPI();
      const configUrl = browserAPI.runtime.getURL("config/defaults.json");

      const response = await fetch(configUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch configuration: ${response.status} ${response.statusText}`,
        );
      }

      const config = await response.json();

      // Validate schema
      this.validateConfiguration(config);

      // Cache for performance
      this.configCache = config;
      this.config = config;
      this.cacheTimestamp = Date.now();

      console.log("Configuration loaded successfully:", Object.keys(config));
      return config;
    } catch (error) {
      console.error("Configuration loading failed:", error);

      // Attempt fallback to embedded configuration
      return this.loadFallbackConfiguration();
    }
  }

  /**
   * Load fallback configuration when primary loading fails
   * @returns {Object} Minimal fallback configuration
   */
  loadFallbackConfiguration() {
    console.warn("Using fallback configuration");

    const fallbackConfig = {
      feature_enabled: {
        type: "boolean",
        value: true,
        description: "Enable main feature functionality",
        displayName: "Enable Main Feature",
        category: "general",
        order: 1,
      },
      api_key: {
        type: "text",
        value: "",
        description: "API key for external service",
        displayName: "API Key",
        category: "general",
        maxLength: 100,
        order: 2,
      },
      refresh_interval: {
        type: "enum",
        value: "60",
        description: "Auto-refresh interval",
        displayName: "Refresh Interval",
        category: "general",
        options: {
          30: "30 seconds",
          60: "1 minute",
          300: "5 minutes",
          900: "15 minutes",
          1800: "30 minutes",
        },
        order: 3,
      },
      custom_css: {
        type: "longtext",
        value: "/* Custom CSS styles */\n.example { color: blue; }",
        description: "Custom CSS for content injection",
        displayName: "Custom CSS",
        category: "appearance",
        maxLength: 50000,
        order: 1,
      },
      advanced_config: {
        type: "json",
        value: {
          endpoint: "https://api.example.com",
          timeout: 5000,
          retries: 3,
        },
        description: "Advanced configuration object",
        displayName: "Advanced Configuration",
        category: "advanced",
        order: 1,
      },
    };

    this.configCache = fallbackConfig;
    this.config = fallbackConfig;
    this.cacheTimestamp = Date.now();

    return fallbackConfig;
  }

  /**
   * Check if cached configuration is still valid
   * @returns {boolean} True if cache is valid
   */
  isCacheValid() {
    return Boolean(
      this.configCache &&
        this.cacheTimestamp &&
        Date.now() - this.cacheTimestamp < this.CACHE_DURATION,
    );
  }

  /**
   * Validate configuration object structure
   * @param {Object} config - Configuration to validate
   * @throws {Error} If configuration is invalid
   */
  validateConfiguration(config) {
    if (!config || typeof config !== "object") {
      throw new Error("Configuration must be a valid object");
    }

    for (const [key, setting] of Object.entries(config)) {
      if (!setting || typeof setting !== "object") {
        throw new Error(
          `Invalid setting configuration for '${key}': must be an object`,
        );
      }

      // Required fields
      if (!setting.type) {
        throw new Error(
          `Invalid setting configuration for '${key}': missing 'type' field`,
        );
      }

      if (!Object.prototype.hasOwnProperty.call(setting, "value")) {
        throw new Error(
          `Invalid setting configuration for '${key}': missing 'value' field`,
        );
      }

      if (!setting.description) {
        throw new Error(
          `Invalid setting configuration for '${key}': missing 'description' field`,
        );
      }

      // Validate setting type
      const validTypes = [
        "boolean",
        "text",
        "longtext",
        "number",
        "json",
        "enum",
      ];
      if (!validTypes.includes(setting.type)) {
        throw new Error(
          `Invalid setting type for '${key}': ${setting.type}. Must be one of: ${validTypes.join(", ")}`,
        );
      }

      // Validate enum options
      if (setting.type === "enum") {
        if (!setting.options || typeof setting.options !== "object") {
          throw new Error(`Enum setting '${key}' must have 'options' object`);
        }

        // Check for empty options object
        if (Object.keys(setting.options).length === 0) {
          throw new Error(
            `Enum setting '${key}' must have at least one option`,
          );
        }

        // Validate all option values are strings
        for (const [optionKey, optionValue] of Object.entries(
          setting.options,
        )) {
          if (typeof optionValue !== "string") {
            throw new Error(
              `Enum setting '${key}' option '${optionKey}' must have string display value, got ${typeof optionValue}`,
            );
          }
        }

        // Validate default value exists in options
        if (
          !Object.prototype.hasOwnProperty.call(setting.options, setting.value)
        ) {
          throw new Error(
            `Default value '${setting.value}' for enum setting '${key}' must exist in options`,
          );
        }

        // Validate default value type
        if (typeof setting.value !== "string") {
          throw new Error(
            `Default value for enum setting '${key}' must be a string, got ${typeof setting.value}`,
          );
        }
      }

      // Validate number constraints
      if (setting.type === "number") {
        if (typeof setting.value !== "number") {
          throw new Error(
            `Number setting '${key}' must have numeric default value`,
          );
        }

        if (setting.min !== undefined && setting.value < setting.min) {
          throw new Error(
            `Default value for '${key}' is below minimum constraint`,
          );
        }

        if (setting.max !== undefined && setting.value > setting.max) {
          throw new Error(
            `Default value for '${key}' is above maximum constraint`,
          );
        }
      }
    }
  }

  /**
   * Get display name for a setting
   * @param {string} key - Setting key
   * @returns {string} Display name or formatted key
   */
  getDisplayName(key) {
    if (!this.config) {
      return this.formatKey(key);
    }

    const setting = this.config[key];
    return setting?.displayName || this.formatKey(key);
  }

  /**
   * Format setting key into human-readable name
   * @param {string} key - Setting key
   * @returns {string} Formatted display name
   */
  formatKey(key) {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  /**
   * Get all settings for a specific category
   * @param {string} category - Category name
   * @returns {Array<[string, Object]>} Array of [key, setting] pairs sorted by order
   */
  getCategorySettings(category) {
    if (!this.config) {
      return [];
    }

    return Object.entries(this.config)
      .filter(([_, setting]) => setting.category === category)
      .sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
  }

  /**
   * Get all available categories
   * @returns {Array<string>} Array of category names
   */
  getCategories() {
    if (!this.config) {
      return [];
    }

    const categories = new Set();
    for (const setting of Object.values(this.config)) {
      if (setting.category) {
        categories.add(setting.category);
      }
    }

    return Array.from(categories).sort();
  }

  /**
   * Get category display name
   * @param {string} category - Category key
   * @returns {string} Formatted category name
   */
  getCategoryDisplayName(category) {
    // For now, just format the category key
    // Could be extended to support category metadata in the future
    return this.formatKey(category);
  }

  /**
   * Get setting by key
   * @param {string} key - Setting key
   * @returns {Object|null} Setting object or null if not found
   */
  getSetting(key) {
    return this.config?.[key] || null;
  }

  /**
   * Check if setting exists
   * @param {string} key - Setting key
   * @returns {boolean} True if setting exists
   */
  hasSetting(key) {
    return Boolean(this.config?.[key]);
  }

  /**
   * Get all setting keys
   * @returns {Array<string>} Array of setting keys
   */
  getSettingKeys() {
    return this.config ? Object.keys(this.config) : [];
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.configCache = null;
    this.config = null;
    this.cacheTimestamp = null;
  }

  /**
   * Get cache information
   * @returns {Object} Cache status information
   */
  getCacheInfo() {
    return {
      cached: Boolean(this.configCache),
      timestamp: this.cacheTimestamp,
      age: this.cacheTimestamp ? Date.now() - this.cacheTimestamp : null,
      valid: this.isCacheValid(),
    };
  }
}

// Export for use in different contexts
if (typeof module !== "undefined" && module.exports) {
  // CommonJS (Node.js)
  module.exports = ConfigurationLoader;
} else if (typeof window !== "undefined") {
  // Browser environment
  window.ConfigurationLoader = ConfigurationLoader;
} else {
  // Service worker context
  self.ConfigurationLoader = ConfigurationLoader;
}
