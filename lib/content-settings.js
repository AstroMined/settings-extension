// lib/content-settings.js
// Content script settings API

// Import browser compatibility layer
let browserAPI;

if (typeof importScripts !== "undefined" && typeof window === "undefined") {
  // True service worker context (has importScripts but no window)
  importScripts("./browser-compat.js");
  browserAPI = self.browserAPI;
} else if (typeof require !== "undefined") {
  // Node.js context
  browserAPI = require("./browser-compat.js");
} else {
  // Browser/content script context - assumes browser-compat.js is already loaded
  browserAPI =
    typeof window !== "undefined" ? window.browserAPI : self.browserAPI;
}
class ContentScriptSettings {
  constructor() {
    this.cache = new Map();
    this.listeners = new Set();
    this.messageTimeout = 5000; // 5 second timeout for messages
    this.setupMessageListener();
  }

  /**
   * Request single setting from background
   * @param {string} key - Setting key
   * @returns {Promise<Object>}
   */
  async getSetting(key) {
    if (!key) {
      throw new Error("Setting key is required");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout getting setting '${key}'`));
      }, this.messageTimeout);

      try {
        const messagePromise = browserAPI.runtime.sendMessage({
          type: "GET_SETTING",
          key: key,
        });

        Promise.resolve(messagePromise)
          .then((response) => {
            clearTimeout(timeout);

            if (response && response.error) {
              reject(new Error(response.error));
            } else if (response && response.value) {
              // Cache the result
              this.cache.set(key, response.value);
              resolve(response.value);
            } else {
              reject(new Error(`Invalid response for setting '${key}'`));
            }
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Request multiple settings from background
   * @param {Array<string>} keys - Array of setting keys
   * @returns {Promise<Object>}
   */
  async getSettings(keys) {
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new Error("Keys must be a non-empty array");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout getting settings: ${keys.join(", ")}`));
      }, this.messageTimeout);

      try {
        const messagePromise = browserAPI.runtime.sendMessage({
          type: "GET_SETTINGS",
          keys: keys,
        });

        Promise.resolve(messagePromise)
          .then((response) => {
            clearTimeout(timeout);

            if (response && response.error) {
              reject(new Error(response.error));
            } else if (response && response.values) {
              // Cache the results
              for (const [key, value] of Object.entries(response.values)) {
                this.cache.set(key, value);
              }
              resolve(response.values);
            } else {
              reject(
                new Error(`Invalid response for settings: ${keys.join(", ")}`),
              );
            }
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Request all settings from background
   * @returns {Promise<Object>}
   */
  async getAllSettings() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout getting all settings"));
      }, this.messageTimeout);

      try {
        const messagePromise = browserAPI.runtime.sendMessage({
          type: "GET_ALL_SETTINGS",
        });

        Promise.resolve(messagePromise)
          .then((response) => {
            clearTimeout(timeout);

            if (response && response.error) {
              reject(new Error(response.error));
            } else if (response && response.settings) {
              // Update cache with all settings
              this.cache.clear();
              for (const [key, value] of Object.entries(response.settings)) {
                this.cache.set(key, value);
              }
              resolve(response.settings);
            } else {
              reject(new Error("Invalid response for all settings"));
            }
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Update single setting
   * @param {string} key - Setting key
   * @param {*} value - New value
   * @returns {Promise<boolean>}
   */
  async updateSetting(key, value) {
    if (!key) {
      throw new Error("Setting key is required");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout updating setting '${key}'`));
      }, this.messageTimeout);

      try {
        const messagePromise = browserAPI.runtime.sendMessage({
          type: "UPDATE_SETTING",
          key: key,
          value: value,
        });

        Promise.resolve(messagePromise)
          .then((response) => {
            clearTimeout(timeout);

            if (response && response.error) {
              reject(new Error(response.error));
            } else if (response && response.success) {
              // Update cache
              const cachedSetting = this.cache.get(key);
              if (cachedSetting) {
                cachedSetting.value = value;
                this.cache.set(key, cachedSetting);
              }
              resolve(true);
            } else {
              reject(
                new Error(`Invalid response for updating setting '${key}'`),
              );
            }
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Update multiple settings
   * @param {Object} updates - Object with key-value pairs
   * @returns {Promise<boolean>}
   */
  async updateSettings(updates) {
    if (!updates || typeof updates !== "object") {
      throw new Error("Updates must be an object");
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("Updates object cannot be empty");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Timeout updating settings: ${Object.keys(updates).join(", ")}`,
          ),
        );
      }, this.messageTimeout);

      try {
        const messagePromise = browserAPI.runtime.sendMessage({
          type: "UPDATE_SETTINGS",
          updates: updates,
        });

        Promise.resolve(messagePromise)
          .then((response) => {
            clearTimeout(timeout);

            if (response && response.error) {
              reject(new Error(response.error));
            } else if (response && response.success) {
              // Update cache
              for (const [key, value] of Object.entries(updates)) {
                const cachedSetting = this.cache.get(key);
                if (cachedSetting) {
                  cachedSetting.value = value;
                  this.cache.set(key, cachedSetting);
                }
              }
              resolve(true);
            } else {
              reject(
                new Error(
                  `Invalid response for updating settings: ${Object.keys(updates).join(", ")}`,
                ),
              );
            }
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Export settings
   * @returns {Promise<string>}
   */
  async exportSettings() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout exporting settings"));
      }, this.messageTimeout);

      try {
        const messagePromise = browserAPI.runtime.sendMessage({
          type: "EXPORT_SETTINGS",
        });

        Promise.resolve(messagePromise)
          .then((response) => {
            clearTimeout(timeout);

            if (response && response.error) {
              reject(new Error(response.error));
            } else if (response && response.data) {
              resolve(response.data);
            } else {
              reject(new Error("Invalid response for export settings"));
            }
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Import settings
   * @param {string} data - JSON data to import
   * @returns {Promise<boolean>}
   */
  async importSettings(data) {
    if (!data) {
      throw new Error("Import data is required");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout importing settings"));
      }, this.messageTimeout);

      try {
        const messagePromise = browserAPI.runtime.sendMessage({
          type: "IMPORT_SETTINGS",
          data: data,
        });

        Promise.resolve(messagePromise)
          .then((response) => {
            clearTimeout(timeout);

            if (response && response.error) {
              reject(new Error(response.error));
            } else if (response && response.success) {
              // Clear cache to force reload
              this.cache.clear();
              resolve(true);
            } else {
              reject(new Error("Invalid response for import settings"));
            }
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Reset settings to defaults
   * @returns {Promise<boolean>}
   */
  async resetSettings() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout resetting settings"));
      }, this.messageTimeout);

      try {
        const messagePromise = browserAPI.runtime.sendMessage({
          type: "RESET_SETTINGS",
        });

        Promise.resolve(messagePromise)
          .then((response) => {
            clearTimeout(timeout);

            if (response && response.error) {
              reject(new Error(response.error));
            } else if (response && response.success) {
              // Clear cache to force reload
              this.cache.clear();
              resolve(true);
            } else {
              reject(new Error("Invalid response for reset settings"));
            }
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>}
   */
  async getStorageStats() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout getting storage stats"));
      }, this.messageTimeout);

      try {
        const messagePromise = browserAPI.runtime.sendMessage({
          type: "GET_STORAGE_STATS",
        });

        Promise.resolve(messagePromise)
          .then((response) => {
            clearTimeout(timeout);

            if (response && response.error) {
              reject(new Error(response.error));
            } else if (response && response.stats) {
              resolve(response.stats);
            } else {
              reject(new Error("Invalid response for storage stats"));
            }
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Check storage quota
   * @returns {Promise<Object>}
   */
  async checkStorageQuota() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout checking storage quota"));
      }, this.messageTimeout);

      try {
        const messagePromise = browserAPI.runtime.sendMessage({
          type: "CHECK_STORAGE_QUOTA",
        });

        Promise.resolve(messagePromise)
          .then((response) => {
            clearTimeout(timeout);

            if (response && response.error) {
              reject(new Error(response.error));
            } else if (response && response.quota) {
              resolve(response.quota);
            } else {
              reject(new Error("Invalid response for storage quota"));
            }
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Get cached setting (synchronous, may be stale)
   * @param {string} key - Setting key
   * @returns {Object|null}
   */
  getCachedSetting(key) {
    return this.cache.get(key) || null;
  }

  /**
   * Get all cached settings (synchronous, may be stale)
   * @returns {Object}
   */
  getCachedSettings() {
    const result = {};
    for (const [key, value] of this.cache) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Add change listener
   * @param {Function} callback - Callback function
   */
  addChangeListener(callback) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    this.listeners.add(callback);
  }

  /**
   * Remove change listener
   * @param {Function} callback - Callback function
   */
  removeChangeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Setup message listener for settings changes from background
   */
  setupMessageListener() {
    if (!browserAPI.runtime || !browserAPI.runtime.onMessage) {
      console.warn("Runtime messaging not available");
      return;
    }

    browserAPI.runtime.onMessage.addListener(
      (message, _sender, _sendResponse) => {
        try {
          switch (message.type) {
            case "SETTINGS_CHANGED":
              this.handleSettingsChanged(message.changes);
              break;

            case "SETTINGS_IMPORTED":
              this.handleSettingsImported(message.settings);
              break;

            case "SETTINGS_RESET":
              this.handleSettingsReset(message.settings);
              break;

            default:
              // Ignore unknown messages
              break;
          }
        } catch (error) {
          console.error("Error handling message in content script:", error);
        }

        // Don't send response for broadcast messages
        return false;
      },
    );
  }

  /**
   * Handle settings changed message
   * @param {Object} changes - Changed settings
   */
  handleSettingsChanged(changes) {
    // Update cache
    for (const [key, value] of Object.entries(changes)) {
      const cachedSetting = this.cache.get(key);
      if (cachedSetting) {
        cachedSetting.value = value;
        this.cache.set(key, cachedSetting);
      }
    }

    // Notify listeners
    this.notifyListeners("changed", changes);
  }

  /**
   * Handle settings imported message
   * @param {Object} settings - All settings
   */
  handleSettingsImported(settings) {
    // Update cache with all settings
    this.cache.clear();
    for (const [key, value] of Object.entries(settings)) {
      this.cache.set(key, value);
    }

    // Notify listeners
    this.notifyListeners("imported", settings);
  }

  /**
   * Handle settings reset message
   * @param {Object} settings - Reset settings
   */
  handleSettingsReset(settings) {
    // Update cache with reset settings
    this.cache.clear();
    for (const [key, value] of Object.entries(settings)) {
      this.cache.set(key, value);
    }

    // Notify listeners
    this.notifyListeners("reset", settings);
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
        console.error("Error in settings change listener:", error);
      }
    }
  }

  /**
   * Set message timeout
   * @param {number} timeout - Timeout in milliseconds
   */
  setMessageTimeout(timeout) {
    if (typeof timeout !== "number" || timeout <= 0) {
      throw new Error("Timeout must be a positive number");
    }

    this.messageTimeout = timeout;
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    this.listeners.clear();
    this.cache.clear();
  }
}

// Export for use in different contexts
if (typeof module !== "undefined" && module.exports) {
  // CommonJS (Node.js)
  module.exports = ContentScriptSettings;
} else if (typeof window !== "undefined") {
  // Browser environment
  window.ContentScriptSettings = ContentScriptSettings;
} else {
  // Service worker context
  self.ContentScriptSettings = ContentScriptSettings;
}
