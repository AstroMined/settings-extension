// lib/settings-manager.js
// Core settings management class with full CRUD operations

// Browser compatibility layer should already be loaded globally
// This assumes browser-compat.js is loaded before this script in all contexts
// This also assumes config-loader.js is loaded before this script

class SettingsManager {
  constructor() {
    this.settings = new Map();
    this.listeners = new Set();
    this.initialized = false;
    this.defaultsCache = null;
    this.storageArea = "local"; // Default to local storage
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
   * Initialize settings manager with defaults
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Load defaults from centralized configuration
      const configLoader = new ConfigurationLoader();
      const defaults = await configLoader.loadConfiguration();

      // Get stored settings
      const stored = await this.getStoredSettings();

      // Merge defaults with stored settings
      this.settings = new Map();

      // First, populate with defaults
      for (const [key, setting] of Object.entries(defaults)) {
        this.settings.set(key, { ...setting });
      }

      // Then override with stored values (only the value field)
      for (const [key, storedSetting] of Object.entries(stored)) {
        if (this.settings.has(key)) {
          const existing = this.settings.get(key);
          // Only override the value, keep all metadata from defaults
          this.settings.set(key, {
            ...existing,
            value:
              storedSetting.value !== undefined
                ? storedSetting.value
                : existing.value,
          });
        }
      }

      this.initialized = true;
      this.notifyListeners("initialized", {
        settings: this.getAllSettingsSync(),
      });
    } catch (error) {
      console.error("Failed to initialize settings:", error);
      throw new Error(`Settings initialization failed: ${error.message}`);
    }
  }

  /**
   * Fallback initialization with embedded defaults
   * @deprecated This method is kept for compatibility but should not be used
   * @returns {Promise<void>}
   */
  async initializeWithEmbeddedDefaults() {
    console.warn(
      "Using deprecated initializeWithEmbeddedDefaults - configuration should load from ConfigurationLoader",
    );

    try {
      // Try to use ConfigurationLoader fallback instead
      const configLoader = new ConfigurationLoader();
      const fallbackConfig = configLoader.loadFallbackConfiguration();

      this.settings = new Map();
      for (const [key, setting] of Object.entries(fallbackConfig)) {
        this.settings.set(key, { ...setting });
      }

      this.initialized = true;
      this.notifyListeners("initialized", {
        settings: this.getAllSettingsSync(),
      });
    } catch (error) {
      console.error("Even fallback configuration loading failed:", error);
      throw error;
    }
  }

  /**
   * Load default settings from centralized configuration
   * @deprecated Use ConfigurationLoader directly instead
   * @returns {Promise<Object>}
   */
  async loadDefaults() {
    console.warn(
      "loadDefaults is deprecated - use ConfigurationLoader directly",
    );

    if (this.defaultsCache) {
      return this.defaultsCache;
    }

    try {
      const configLoader = new ConfigurationLoader();
      const defaults = await configLoader.loadConfiguration();
      this.defaultsCache = defaults;
      return defaults;
    } catch (error) {
      console.error("Failed to load defaults via ConfigurationLoader:", error);
      throw error;
    }
  }

  /**
   * Get settings from storage
   * @returns {Promise<Object>}
   */
  async getStoredSettings() {
    try {
      const storage = this.getBrowserAPI().storage[this.storageArea];

      if (!storage) {
        console.warn(`Storage area '${this.storageArea}' not available`);
        return {};
      }

      const result = await storage.get();
      return result || {};
    } catch (error) {
      console.error("Failed to get stored settings:", error);
      return {};
    }
  }

  /**
   * Get single setting by key
   * @param {string} key - Setting key
   * @returns {Promise<Object>}
   */
  async getSetting(key) {
    if (!this.initialized) {
      await this.initialize();
    }

    const setting = this.settings.get(key);
    if (!setting) {
      throw new Error(`Setting '${key}' not found`);
    }

    return { ...setting };
  }

  /**
   * Get multiple settings by keys
   * @param {Array<string>} keys - Array of setting keys
   * @returns {Promise<Object>}
   */
  async getSettings(keys) {
    if (!this.initialized) {
      await this.initialize();
    }

    const result = {};
    for (const key of keys) {
      const setting = this.settings.get(key);
      if (setting) {
        result[key] = { ...setting };
      }
    }

    return result;
  }

  /**
   * Get all settings
   * @returns {Promise<Object>}
   */
  async getAllSettings() {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.getAllSettingsSync();
  }

  /**
   * Get all settings synchronously (for internal use)
   * @returns {Object}
   */
  getAllSettingsSync() {
    const result = {};
    for (const [key, setting] of this.settings) {
      result[key] = { ...setting };
    }
    return result;
  }

  /**
   * Update single setting
   * @param {string} key - Setting key
   * @param {*} value - New value
   * @returns {Promise<void>}
   */
  async updateSetting(key, value) {
    if (!this.initialized) {
      await this.initialize();
    }

    const setting = this.settings.get(key);
    if (!setting) {
      throw new Error(`Setting '${key}' not found`);
    }

    // Validate value based on type
    this.validateSetting(setting, value);

    // Update in memory
    const updatedSetting = { ...setting, value };
    this.settings.set(key, updatedSetting);

    // Persist to storage
    await this.persistSetting(key, updatedSetting);

    // Notify listeners
    this.notifyListeners("updated", { key, value, setting: updatedSetting });
  }

  /**
   * Update multiple settings
   * @param {Object} updates - Object with key-value pairs
   * @returns {Promise<void>}
   */
  async updateSettings(updates) {
    if (!this.initialized) {
      await this.initialize();
    }

    const validatedUpdates = {};
    const updatedSettings = {};

    // Validate all updates first
    for (const [key, value] of Object.entries(updates)) {
      const setting = this.settings.get(key);
      if (!setting) {
        throw new Error(`Setting '${key}' not found`);
      }

      this.validateSetting(setting, value);

      const updatedSetting = { ...setting, value };
      validatedUpdates[key] = updatedSetting;
      updatedSettings[key] = value;
    }

    // Update in memory
    for (const [key, setting] of Object.entries(validatedUpdates)) {
      this.settings.set(key, setting);
    }

    // Persist to storage
    await this.persistSettings(validatedUpdates);

    // Notify listeners
    this.notifyListeners("updated", {
      updates: updatedSettings,
      settings: validatedUpdates,
    });
  }

  /**
   * Export settings to JSON
   * @returns {Promise<string>}
   */
  async exportSettings() {
    if (!this.initialized) {
      await this.initialize();
    }

    const exportData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      settings: this.getAllSettingsSync(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import settings from JSON
   * @param {string} jsonData - JSON string with settings
   * @returns {Promise<void>}
   */
  async importSettings(jsonData) {
    let importData;

    try {
      importData = JSON.parse(jsonData);
    } catch {
      throw new Error("Invalid JSON format");
    }

    if (!importData.settings) {
      throw new Error("Invalid settings format - missing settings object");
    }

    // Validate and merge settings
    const validSettings = {};
    const importedKeys = [];

    for (const [key, setting] of Object.entries(importData.settings)) {
      if (this.settings.has(key)) {
        try {
          // Validate the setting structure and value
          if (
            !setting.type ||
            !Object.prototype.hasOwnProperty.call(setting, "value")
          ) {
            console.warn(
              `Skipping invalid setting '${key}' - missing type or value`,
            );
            continue;
          }

          this.validateSetting(setting, setting.value);
          validSettings[key] = setting;
          importedKeys.push(key);
        } catch (error) {
          console.warn(`Skipping invalid setting '${key}':`, error.message);
        }
      } else {
        console.warn(`Skipping unknown setting '${key}'`);
      }
    }

    if (Object.keys(validSettings).length === 0) {
      throw new Error("No valid settings found in import data");
    }

    // Update in memory
    for (const [key, setting] of Object.entries(validSettings)) {
      this.settings.set(key, setting);
    }

    // Persist to storage
    await this.persistSettings(validSettings);

    // Notify listeners
    this.notifyListeners("imported", {
      importedKeys,
      settings: validSettings,
      totalImported: importedKeys.length,
    });
  }

  /**
   * Reset all settings to defaults
   * @returns {Promise<void>}
   */
  async resetToDefaults() {
    try {
      // Clear storage
      const storage = this.getBrowserAPI().storage[this.storageArea];
      if (storage) {
        await storage.clear();
      }

      // Reinitialize
      this.initialized = false;
      this.defaultsCache = null;
      await this.initialize();

      // Notify listeners
      this.notifyListeners("reset", { settings: this.getAllSettingsSync() });
    } catch (error) {
      console.error("Failed to reset to defaults:", error);
      throw error;
    }
  }

  /**
   * Validate setting value based on type
   * @param {Object} setting - Setting object
   * @param {*} value - Value to validate
   */
  validateSetting(setting, value) {
    switch (setting.type) {
      case "boolean":
        if (typeof value !== "boolean") {
          throw new Error(`${setting.description} must be a boolean`);
        }
        break;

      case "text":
        if (typeof value !== "string") {
          throw new Error(`${setting.description} must be a string`);
        }
        if (setting.maxLength && value.length > setting.maxLength) {
          throw new Error(
            `${setting.description} exceeds maximum length of ${setting.maxLength}`,
          );
        }
        break;

      case "longtext":
        if (typeof value !== "string") {
          throw new Error(`${setting.description} must be a string`);
        }
        if (setting.maxLength && value.length > setting.maxLength) {
          throw new Error(
            `${setting.description} exceeds maximum length of ${setting.maxLength}`,
          );
        }
        break;

      case "number":
        if (typeof value !== "number" || isNaN(value)) {
          throw new Error(`${setting.description} must be a valid number`);
        }
        if (setting.min !== undefined && value < setting.min) {
          throw new Error(
            `${setting.description} must be at least ${setting.min}`,
          );
        }
        if (setting.max !== undefined && value > setting.max) {
          throw new Error(
            `${setting.description} must be at most ${setting.max}`,
          );
        }
        break;

      case "json":
        if (typeof value !== "object" || value === null) {
          throw new Error(`${setting.description} must be a valid object`);
        }

        // Check for circular references
        try {
          JSON.stringify(value);
        } catch {
          throw new Error(
            `${setting.description} contains circular references or invalid JSON`,
          );
        }
        break;

      case "enum":
        if (!setting.options || typeof setting.options !== "object") {
          throw new Error(`${setting.description} is missing enum options`);
        }

        if (!setting.options[value]) {
          const validOptions = Object.keys(setting.options).join(", ");
          throw new Error(
            `${setting.description} must be one of: ${validOptions}`,
          );
        }
        break;

      default:
        throw new Error(`Unknown setting type: ${setting.type}`);
    }
  }

  /**
   * Persist single setting to storage
   * @param {string} key - Setting key
   * @param {Object} setting - Setting object
   * @returns {Promise<void>}
   */
  async persistSetting(key, setting) {
    try {
      const storage = this.getBrowserAPI().storage[this.storageArea];
      if (!storage) {
        throw new Error(`Storage area '${this.storageArea}' not available`);
      }

      await storage.set({ [key]: setting });
    } catch (error) {
      console.error("Failed to persist setting:", error);
      throw error;
    }
  }

  /**
   * Persist multiple settings to storage
   * @param {Object} settings - Settings object
   * @returns {Promise<void>}
   */
  async persistSettings(settings) {
    try {
      const storage = this.getBrowserAPI().storage[this.storageArea];
      if (!storage) {
        throw new Error(`Storage area '${this.storageArea}' not available`);
      }

      await storage.set(settings);
    } catch (error) {
      console.error("Failed to persist settings:", error);
      throw error;
    }
  }

  /**
   * Add change listener
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    this.listeners.add(callback);
  }

  /**
   * Remove change listener
   * @param {Function} callback - Callback function
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   * @param {string} event - Event type
   * @param {*} data - Event data
   */
  notifyListeners(event, data) {
    for (const callback of this.listeners) {
      try {
        callback(event, data);
      } catch (error) {
        console.error("Error in settings listener:", error);
      }
    }
  }

  /**
   * Set storage area preference
   * @param {string} area - 'local' or 'sync'
   */
  setStorageArea(area) {
    if (area !== "local" && area !== "sync") {
      throw new Error('Storage area must be "local" or "sync"');
    }

    const storage = this.getBrowserAPI().storage[area];
    if (!storage) {
      throw new Error(`Storage area '${area}' not available`);
    }

    this.storageArea = area;
  }

  /**
   * Check storage quota usage
   * @returns {Promise<Object>}
   */
  async checkStorageQuota() {
    return await this.getBrowserAPI().utils.checkStorageQuota(this.storageArea);
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>}
   */
  async getStorageStats() {
    try {
      const storage = this.getBrowserAPI().storage[this.storageArea];
      if (!storage || !storage.getBytesInUse) {
        return { error: "Storage statistics not available" };
      }

      const totalBytes = await storage.getBytesInUse();
      const settingsCount = this.settings.size;
      const quota = await this.checkStorageQuota();

      return {
        totalBytes,
        settingsCount,
        quota,
        averageSettingSize: settingsCount > 0 ? totalBytes / settingsCount : 0,
      };
    } catch (error) {
      console.error("Failed to get storage stats:", error);
      return { error: error.message };
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    this.listeners.clear();
    this.settings.clear();
    this.initialized = false;
    this.defaultsCache = null;
  }
}

// Export for use in different contexts
if (typeof module !== "undefined" && module.exports) {
  // CommonJS (Node.js)
  module.exports = SettingsManager;
} else if (typeof window !== "undefined") {
  // Browser environment
  window.SettingsManager = SettingsManager;
} else {
  // Service worker context
  self.SettingsManager = SettingsManager;
}
