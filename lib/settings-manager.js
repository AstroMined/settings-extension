// lib/settings-manager.js
// Core settings management class with full CRUD operations

// Import browser compatibility layer
let browserAPI;

if (typeof importScripts !== 'undefined') {
  // Service worker context
  importScripts('./browser-compat.js');
  browserAPI = self.browserAPI;
} else if (typeof require !== 'undefined') {
  // Node.js context
  browserAPI = require('./browser-compat.js');
} else {
  // Browser context - assumes browser-compat.js is already loaded
  browserAPI = window.browserAPI;
}

class SettingsManager {
  constructor() {
    this.settings = new Map();
    this.listeners = new Set();
    this.initialized = false;
    this.defaultsCache = null;
    this.storageArea = 'local'; // Default to local storage
  }

  /**
   * Initialize settings manager with defaults
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Load defaults first
      const defaults = await this.loadDefaults();
      
      // Get stored settings
      const stored = await this.getStoredSettings();
      
      // Merge defaults with stored settings
      this.settings = new Map();
      
      // First, populate with defaults
      for (const [key, setting] of Object.entries(defaults)) {
        this.settings.set(key, { ...setting });
      }
      
      // Then override with stored values
      for (const [key, setting] of Object.entries(stored)) {
        if (this.settings.has(key)) {
          const existing = this.settings.get(key);
          this.settings.set(key, { ...existing, ...setting });
        }
      }
      
      this.initialized = true;
      this.notifyListeners('initialized', { settings: this.getAllSettingsSync() });
      
    } catch (error) {
      console.error('Failed to initialize settings:', error);
      
      // Fallback to embedded defaults
      await this.initializeWithEmbeddedDefaults();
    }
  }

  /**
   * Fallback initialization with embedded defaults
   * @returns {Promise<void>}
   */
  async initializeWithEmbeddedDefaults() {
    const embeddedDefaults = {
      "feature_enabled": {
        "type": "boolean",
        "value": true,
        "description": "Enable main feature functionality"
      },
      "api_key": {
        "type": "text",
        "value": "",
        "description": "API key for external service",
        "maxLength": 100
      },
      "custom_css": {
        "type": "longtext",
        "value": "/* Custom CSS styles */\n.example { color: blue; }",
        "description": "Custom CSS for content injection",
        "maxLength": 50000
      },
      "refresh_interval": {
        "type": "number",
        "value": 60,
        "description": "Auto-refresh interval in seconds",
        "min": 1,
        "max": 3600
      },
      "advanced_config": {
        "type": "json",
        "value": {
          "endpoint": "https://api.example.com",
          "timeout": 5000,
          "retries": 3
        },
        "description": "Advanced configuration object"
      }
    };

    this.settings = new Map();
    for (const [key, setting] of Object.entries(embeddedDefaults)) {
      this.settings.set(key, { ...setting });
    }
    
    this.initialized = true;
    this.notifyListeners('initialized', { settings: this.getAllSettingsSync() });
  }

  /**
   * Load default settings from JSON file
   * @returns {Promise<Object>}
   */
  async loadDefaults() {
    if (this.defaultsCache) {
      return this.defaultsCache;
    }

    try {
      // Try to load from web-accessible resource
      const response = await fetch(browserAPI.runtime.getURL('config/defaults.json'));
      
      if (!response.ok) {
        throw new Error(`Failed to load defaults: ${response.status}`);
      }
      
      const defaults = await response.json();
      this.defaultsCache = defaults;
      return defaults;
      
    } catch (error) {
      console.error('Failed to load defaults.json:', error);
      throw error;
    }
  }

  /**
   * Get settings from storage
   * @returns {Promise<Object>}
   */
  async getStoredSettings() {
    try {
      const storage = browserAPI.storage[this.storageArea];
      
      if (!storage) {
        console.warn(`Storage area '${this.storageArea}' not available`);
        return {};
      }
      
      const result = await storage.get();
      return result || {};
      
    } catch (error) {
      console.error('Failed to get stored settings:', error);
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
    this.notifyListeners('updated', { key, value, setting: updatedSetting });
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
    this.notifyListeners('updated', { updates: updatedSettings, settings: validatedUpdates });
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
      settings: this.getAllSettingsSync()
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
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
    
    if (!importData.settings) {
      throw new Error('Invalid settings format - missing settings object');
    }
    
    // Validate and merge settings
    const validSettings = {};
    const importedKeys = [];
    
    for (const [key, setting] of Object.entries(importData.settings)) {
      if (this.settings.has(key)) {
        try {
          // Validate the setting structure and value
          if (!setting.type || !setting.hasOwnProperty('value')) {
            console.warn(`Skipping invalid setting '${key}' - missing type or value`);
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
      throw new Error('No valid settings found in import data');
    }
    
    // Update in memory
    for (const [key, setting] of Object.entries(validSettings)) {
      this.settings.set(key, setting);
    }
    
    // Persist to storage
    await this.persistSettings(validSettings);
    
    // Notify listeners
    this.notifyListeners('imported', { 
      importedKeys, 
      settings: validSettings,
      totalImported: importedKeys.length 
    });
  }

  /**
   * Reset all settings to defaults
   * @returns {Promise<void>}
   */
  async resetToDefaults() {
    try {
      // Clear storage
      const storage = browserAPI.storage[this.storageArea];
      if (storage) {
        await storage.clear();
      }
      
      // Reinitialize
      this.initialized = false;
      this.defaultsCache = null;
      await this.initialize();
      
      // Notify listeners
      this.notifyListeners('reset', { settings: this.getAllSettingsSync() });
      
    } catch (error) {
      console.error('Failed to reset to defaults:', error);
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
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`${setting.description} must be a boolean`);
        }
        break;
        
      case 'text':
        if (typeof value !== 'string') {
          throw new Error(`${setting.description} must be a string`);
        }
        if (setting.maxLength && value.length > setting.maxLength) {
          throw new Error(`${setting.description} exceeds maximum length of ${setting.maxLength}`);
        }
        break;
        
      case 'longtext':
        if (typeof value !== 'string') {
          throw new Error(`${setting.description} must be a string`);
        }
        if (setting.maxLength && value.length > setting.maxLength) {
          throw new Error(`${setting.description} exceeds maximum length of ${setting.maxLength}`);
        }
        break;
        
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          throw new Error(`${setting.description} must be a valid number`);
        }
        if (setting.min !== undefined && value < setting.min) {
          throw new Error(`${setting.description} must be at least ${setting.min}`);
        }
        if (setting.max !== undefined && value > setting.max) {
          throw new Error(`${setting.description} must be at most ${setting.max}`);
        }
        break;
        
      case 'json':
        if (typeof value !== 'object' || value === null) {
          throw new Error(`${setting.description} must be a valid object`);
        }
        
        // Check for circular references
        try {
          JSON.stringify(value);
        } catch (error) {
          throw new Error(`${setting.description} contains circular references or invalid JSON`);
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
      const storage = browserAPI.storage[this.storageArea];
      if (!storage) {
        throw new Error(`Storage area '${this.storageArea}' not available`);
      }
      
      await storage.set({ [key]: setting });
      
    } catch (error) {
      console.error('Failed to persist setting:', error);
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
      const storage = browserAPI.storage[this.storageArea];
      if (!storage) {
        throw new Error(`Storage area '${this.storageArea}' not available`);
      }
      
      await storage.set(settings);
      
    } catch (error) {
      console.error('Failed to persist settings:', error);
      throw error;
    }
  }

  /**
   * Add change listener
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
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
        console.error('Error in settings listener:', error);
      }
    }
  }

  /**
   * Set storage area preference
   * @param {string} area - 'local' or 'sync'
   */
  setStorageArea(area) {
    if (area !== 'local' && area !== 'sync') {
      throw new Error('Storage area must be "local" or "sync"');
    }
    
    const storage = browserAPI.storage[area];
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
    return await browserAPI.utils.checkStorageQuota(this.storageArea);
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>}
   */
  async getStorageStats() {
    try {
      const storage = browserAPI.storage[this.storageArea];
      if (!storage || !storage.getBytesInUse) {
        return { error: 'Storage statistics not available' };
      }
      
      const totalBytes = await storage.getBytesInUse();
      const settingsCount = this.settings.size;
      const quota = await this.checkStorageQuota();
      
      return {
        totalBytes,
        settingsCount,
        quota,
        averageSettingSize: settingsCount > 0 ? totalBytes / settingsCount : 0
      };
      
    } catch (error) {
      console.error('Failed to get storage stats:', error);
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
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS (Node.js)
  module.exports = SettingsManager;
} else if (typeof window !== 'undefined') {
  // Browser environment
  window.SettingsManager = SettingsManager;
} else {
  // Service worker context
  self.SettingsManager = SettingsManager;
}