// lib/settings-manager.js
// Core settings management class with full CRUD operations

// Browser compatibility layer should already be loaded globally
// This assumes browser-compat.js is loaded before this script in all contexts
// This also assumes config-loader.js is loaded before this script
// This also assumes storage-operation-manager.js, storage-errors.js, and storage-logger.js are loaded

class SettingsManager {
  constructor() {
    this.settings = new Map();
    this.listeners = new Set();
    this.initialized = false;
    this.defaultsCache = null;
    this.storageArea = "local"; // Default to local storage

    // Storage operation manager for race condition prevention
    this.storageManager = null;

    // Auto-save configuration
    this.autoSaveDebounceTime = 500; // 500ms debounce
    this.autoSaveTimer = null;
    this.pendingChanges = new Map();
    this.lastSaveTime = 0;

    // Save status tracking
    this.saveStatus = {
      state: "saved", // "saving", "saved", "pending", "error"
      lastError: null,
      pendingCount: 0,
    };
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
      // Initialize storage operation manager
      const browserAPI = this.getBrowserAPI();
      this.storageManager = new StorageOperationManager(browserAPI, {
        debugMode: false,
        enableLogging: true,
        enableMetrics: true,
      });

      // Load defaults from centralized configuration
      const configLoader = new ConfigurationLoader();
      const defaults = await configLoader.loadConfiguration();

      // Get stored settings using queued operation
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
      this.saveStatus.state = "saved";
      this.notifyListeners("initialized", {
        settings: this.getAllSettingsSync(),
      });
    } catch (error) {
      console.error("Failed to initialize settings:", error);
      throw new Error(`Settings initialization failed: ${error.message}`);
    }
  }

  /**
   * Get settings from storage using storage operation manager
   * @returns {Promise<Object>}
   */
  async getStoredSettings() {
    try {
      if (this.storageManager) {
        const result = await this.storageManager.queueOperation({
          type: "get",
          storageArea: this.storageArea,
        });
        return result.data || {};
      } else {
        // Fallback to direct storage access if storageManager not available
        const storage = this.getBrowserAPI().storage[this.storageArea];
        if (!storage) {
          console.warn(`Storage area '${this.storageArea}' not available`);
          return {};
        }
        const result = await storage.get();
        return result || {};
      }
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
   * Update single setting with auto-save debouncing
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

    // Add to pending changes for auto-save
    this.pendingChanges.set(key, updatedSetting);
    this.scheduleAutoSave();

    // Update save status
    this.updateSaveStatus("pending", null, this.pendingChanges.size);

    // Notify listeners immediately for UI responsiveness
    this.notifyListeners("updated", { key, value, setting: updatedSetting });
  }

  /**
   * Update multiple settings with auto-save debouncing
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

    // Add all to pending changes for auto-save
    for (const [key, setting] of Object.entries(validatedUpdates)) {
      this.pendingChanges.set(key, setting);
    }
    this.scheduleAutoSave();

    // Update save status
    this.updateSaveStatus("pending", null, this.pendingChanges.size);

    // Notify listeners immediately for UI responsiveness
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
   * Import settings from JSON with auto-save
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

    // Force immediate save for imports (high priority)
    await this.forceSave(validSettings);

    // Notify listeners
    this.notifyListeners("imported", {
      importedKeys,
      settings: validSettings,
      totalImported: importedKeys.length,
    });
  }

  /**
   * Reset all settings to defaults using storage operation manager
   * @returns {Promise<void>}
   */
  async resetToDefaults() {
    try {
      // Clear storage using storage operation manager
      if (this.storageManager) {
        await this.storageManager.queueOperation({
          type: "clear",
          storageArea: this.storageArea,
        });
      } else {
        // Fallback to direct storage access
        const storage = this.getBrowserAPI().storage[this.storageArea];
        if (storage) {
          await storage.clear();
        }
      }

      // Clear pending changes
      this.pendingChanges.clear();
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = null;
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

        if (!Object.prototype.hasOwnProperty.call(setting.options, value)) {
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
   * Schedule auto-save with debouncing
   * @private
   */
  scheduleAutoSave() {
    // Clear existing timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    // Schedule new save
    this.autoSaveTimer = setTimeout(async () => {
      await this.flushPendingChanges();
    }, this.autoSaveDebounceTime);
  }

  /**
   * Flush all pending changes to storage
   * @returns {Promise<void>}
   */
  async flushPendingChanges() {
    if (this.pendingChanges.size === 0) {
      return;
    }

    const changes = {};
    const changedKeys = [];

    // Convert Map to object for storage
    for (const [key, setting] of this.pendingChanges) {
      changes[key] = setting;
      changedKeys.push(key);
    }

    this.pendingChanges.clear();
    this.updateSaveStatus("saving", null, 0);

    try {
      // Use storage operation manager for queued persistence
      if (this.storageManager) {
        await this.storageManager.queueOperation({
          type: "set",
          data: changes,
          storageArea: this.storageArea,
        });
      } else {
        // Fallback to direct storage access
        const storage = this.getBrowserAPI().storage[this.storageArea];
        if (!storage) {
          throw new Error(`Storage area '${this.storageArea}' not available`);
        }
        await storage.set(changes);
      }

      this.lastSaveTime = Date.now();
      this.updateSaveStatus("saved", null, 0);

      console.debug("Auto-save completed for keys:", changedKeys);
      this.notifyListeners("saved", {
        keys: changedKeys,
        timestamp: this.lastSaveTime,
      });
    } catch (error) {
      console.error("Auto-save failed:", error);

      // Re-queue failed changes
      for (const [key, setting] of Object.entries(changes)) {
        this.pendingChanges.set(key, setting);
      }

      this.updateSaveStatus("error", error, this.pendingChanges.size);

      // Notify listeners of save failure
      this.notifyListeners("save-failed", {
        error: error.message,
        keys: changedKeys,
        timestamp: Date.now(),
      });

      // Retry after delay
      setTimeout(() => {
        this.scheduleAutoSave();
      }, 2000);

      throw error;
    }
  }

  /**
   * Force immediate save of pending changes or specific settings
   * @param {Object} specificSettings - Optional specific settings to save
   * @returns {Promise<void>}
   */
  async forceSave(specificSettings = null) {
    // Clear debounce timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    if (specificSettings) {
      // Save specific settings immediately
      try {
        if (this.storageManager) {
          await this.storageManager.queueOperation(
            {
              type: "set",
              data: specificSettings,
              storageArea: this.storageArea,
            },
            this.storageManager.PRIORITY?.HIGH || 1,
          ); // High priority for force save
        } else {
          // Fallback to direct storage access
          const storage = this.getBrowserAPI().storage[this.storageArea];
          if (!storage) {
            throw new Error(`Storage area '${this.storageArea}' not available`);
          }
          await storage.set(specificSettings);
        }

        this.lastSaveTime = Date.now();
        this.updateSaveStatus("saved", null, this.pendingChanges.size);

        console.debug(
          "Force save completed for keys:",
          Object.keys(specificSettings),
        );
        this.notifyListeners("saved", {
          keys: Object.keys(specificSettings),
          timestamp: this.lastSaveTime,
          forced: true,
        });
      } catch (error) {
        this.updateSaveStatus("error", error, this.pendingChanges.size);
        throw error;
      }
    } else {
      // Save all pending changes
      await this.flushPendingChanges();
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
   * Update save status and notify listeners
   * @param {string} state - Save state ("saving", "saved", "pending", "error")
   * @param {Error} error - Error object if state is "error"
   * @param {number} pendingCount - Number of pending changes
   */
  updateSaveStatus(state, error = null, pendingCount = 0) {
    const previousState = this.saveStatus.state;

    this.saveStatus = {
      state,
      lastError: error,
      pendingCount,
      timestamp: Date.now(),
    };

    // Notify listeners of save status change
    if (previousState !== state) {
      this.notifyListeners("save-status-changed", { ...this.saveStatus });
    }
  }

  /**
   * Check if there are pending changes
   * @returns {boolean}
   */
  hasPendingChanges() {
    return this.pendingChanges.size > 0;
  }

  /**
   * Get list of keys with pending changes
   * @returns {Array<string>}
   */
  getPendingChanges() {
    return Array.from(this.pendingChanges.keys());
  }

  /**
   * Get current save status
   * @returns {Object}
   */
  getSaveStatus() {
    return { ...this.saveStatus };
  }

  /**
   * Check storage quota usage using storage operation manager
   * @returns {Promise<Object>}
   */
  async checkStorageQuota() {
    try {
      if (this.storageManager) {
        const result = await this.storageManager.queueOperation({
          type: "getBytesInUse",
          storageArea: this.storageArea,
        });

        const quota = this.storageArea === "local" ? 5242880 : 102400; // 5MB local, 100KB sync
        const used = result.bytesInUse || 0;

        return {
          available: used < quota * 0.9,
          used,
          quota,
          percentUsed: (used / quota) * 100,
        };
      } else {
        return await this.getBrowserAPI().utils.checkStorageQuota(
          this.storageArea,
        );
      }
    } catch (error) {
      console.warn("Storage quota check failed:", error);
      return {
        available: true,
        used: 0,
        quota: "unknown",
        error: error.message,
      };
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>}
   */
  async getStorageStats() {
    try {
      const quota = await this.checkStorageQuota();
      const settingsCount = this.settings.size;
      const storageMetrics = this.storageManager?.getMetrics?.() || null;

      return {
        totalBytes: quota.used || 0,
        settingsCount,
        quota,
        averageSettingSize:
          settingsCount > 0 && quota.used ? quota.used / settingsCount : 0,
        pendingChanges: this.pendingChanges.size,
        saveStatus: this.getSaveStatus(),
        storageMetrics,
      };
    } catch (error) {
      console.error("Failed to get storage stats:", error);
      return { error: error.message };
    }
  }

  /**
   * Cleanup and destroy with proper resource management
   */
  destroy() {
    // Clear auto-save timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    // Force save any pending changes before cleanup
    if (this.pendingChanges.size > 0) {
      console.warn(
        "Destroying SettingsManager with pending changes. Attempting force save...",
      );
      this.flushPendingChanges().catch((error) => {
        console.error("Failed to save pending changes during destroy:", error);
      });
    }

    // Cleanup storage operation manager
    if (
      this.storageManager &&
      typeof this.storageManager.destroy === "function"
    ) {
      this.storageManager.destroy();
    }

    // Clear all data structures
    this.listeners.clear();
    this.settings.clear();
    this.pendingChanges.clear();

    // Reset state
    this.initialized = false;
    this.defaultsCache = null;
    this.storageManager = null;
    this.saveStatus = {
      state: "saved",
      lastError: null,
      pendingCount: 0,
    };
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
