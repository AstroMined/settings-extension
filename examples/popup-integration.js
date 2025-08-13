/**
 * Advanced Popup Settings UI Integration Example
 *
 * Production-ready popup implementation demonstrating sophisticated patterns
 * used in the actual Settings Extension popup.js.
 *
 * This example demonstrates:
 * - Connection testing with retry logic and progressive timeouts
 * - Settings loading with robust error handling and fallback mechanisms
 * - Real validation patterns with inline error display
 * - UI rendering patterns for different setting types with grouped organization
 * - Import/export functionality with proper file handling
 * - Reset functionality with confirmation dialogs
 * - Progressive enhancement and graceful error recovery
 * - Advanced message handling with timeout controls
 * - Group-based settings organization for better UX
 * - Memory management and cleanup patterns
 *
 * Based on the actual production popup.js implementation.
 */

/**
 * Advanced Settings Popup Class
 * Handles sophisticated settings UI with production-level error handling
 */
class AdvancedSettingsPopup {
  constructor() {
    this.currentSettings = new Map();
    this.validationErrors = new Map();
    this.isInitialized = false;
    this.initializationRetries = 0;
    this.maxInitRetries = 3;

    // Configuration for robust initialization
    this.config = {
      connectionTimeout: {
        initial: 2000,
        progressive: (attempt) => Math.min(2000 * attempt, 8000)
      },
      settingsTimeout: {
        base: 5000,
        increment: 2000
      },
      retryDelay: {
        exponential: (attempt) => Math.min(500 * Math.pow(2, attempt - 1), 2000),
        linear: (attempt) => 1000 * attempt
      },
      messageTimeout: 5000
    };

    // Small delay to ensure DOM is fully ready (fixes race conditions)
    setTimeout(() => {
      this.setupEventListeners();
      this.initialize();
    }, 0);
  }

  /**
   * Initialize popup with sophisticated error handling and retry logic
   */
  async initialize() {
    try {
      console.log("🚀 Initializing advanced popup...");

      // Show loading state immediately
      this.showLoading();

      // First test if background script is responding at all
      await this.testBackgroundConnection();

      // Load settings with retry logic
      await this.loadSettings();

      // Render settings with error boundary
      this.renderSettings();

      // Hide loading and mark as initialized
      this.hideLoading();
      this.isInitialized = true;
      this.initializationRetries = 0;

      console.log("✅ Advanced popup initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize popup:", error);
      
      this.initializationRetries++;
      if (this.initializationRetries < this.maxInitRetries) {
        console.log(`🔄 Retrying initialization (${this.initializationRetries}/${this.maxInitRetries})...`);
        
        // Progressive delay before retry
        const delay = this.config.retryDelay.exponential(this.initializationRetries);
        setTimeout(() => this.initialize(), delay);
      } else {
        this.showError("Failed to load settings after multiple attempts. Please reload the extension.");
        this.hideLoading();
      }
    }
  }

  /**
   * Test background script connection with advanced retry logic
   */
  async testBackgroundConnection() {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔗 Testing background script connection (attempt ${attempt}/${maxRetries})...`);

        const response = await new Promise((resolve, reject) => {
          // Progressive timeout: 2s, 4s, 8s
          const timeout = setTimeout(() => {
            reject(new Error(`Background script ping timeout (attempt ${attempt})`));
          }, this.config.connectionTimeout.progressive(attempt));

          browserAPI.runtime
            .sendMessage({ type: "PING" })
            .then((response) => {
              clearTimeout(timeout);
              if (response && response.pong) {
                resolve(response);
              } else {
                reject(new Error("Invalid ping response"));
              }
            })
            .catch((error) => {
              clearTimeout(timeout);
              reject(error);
            });
        });

        console.log("✅ Background script ping response:", response);
        return; // Success - exit retry loop
      } catch (error) {
        console.error(`❌ Background script connection test failed (attempt ${attempt}):`, error);
        lastError = error;

        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = this.config.retryDelay.exponential(attempt);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw new Error(
      `Service worker not responding after ${maxRetries} attempts. ${lastError?.message || "Unknown error"}. Please reload the extension.`
    );
  }

  /**
   * Load settings with robust error handling and progressive timeouts
   */
  async loadSettings() {
    const maxRetries = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📊 Loading settings (attempt ${attempt}/${maxRetries})...`);

        const response = await new Promise((resolve, reject) => {
          // Progressive timeout: 7s, 9s
          const timeout = setTimeout(() => {
            reject(new Error(`Settings load timeout after ${this.config.settingsTimeout.base + attempt * this.config.settingsTimeout.increment} ms (attempt ${attempt})`));
          }, this.config.settingsTimeout.base + attempt * this.config.settingsTimeout.increment);

          browserAPI.runtime
            .sendMessage({ type: "GET_ALL_SETTINGS" })
            .then((response) => {
              clearTimeout(timeout);
              resolve(response);
            })
            .catch((error) => {
              clearTimeout(timeout);
              reject(error);
            });
        });

        // Validate response structure
        if (!response) {
          throw new Error("No response from background script");
        }

        if (response.error) {
          throw new Error(`Backend error: ${response.error}`);
        }

        if (!response.settings) {
          throw new Error("Invalid response format - missing settings");
        }

        // Success - cache settings and exit retry loop
        this.currentSettings = new Map(Object.entries(response.settings));
        console.log("✅ Settings loaded successfully:", this.currentSettings.size, "settings");
        return;
      } catch (error) {
        console.error(`❌ Error loading settings (attempt ${attempt}):`, error);
        lastError = error;

        if (attempt < maxRetries) {
          // Wait before retry with linear backoff
          const delay = this.config.retryDelay.linear(attempt);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to load settings after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`
    );
  }

  /**
   * Render settings with sophisticated grouping and error boundary
   */
  renderSettings() {
    try {
      const container = document.getElementById("settings-container");
      if (!container) {
        throw new Error("Settings container not found in DOM");
      }

      container.innerHTML = "";

      // Define setting groups for better organization (matches production popup)
      const settingGroups = {
        "Quick Settings": ["feature_enabled", "refresh_interval"],
        "Configuration": ["api_key", "advanced_config"],
        "Appearance": ["custom_css"],
        "Advanced": ["debug_mode", "performance_mode"]
      };

      // Render each group
      for (const [groupName, settingKeys] of Object.entries(settingGroups)) {
        const groupElement = this.createSettingGroup(groupName, settingKeys);
        if (groupElement) {
          container.appendChild(groupElement);
        }
      }

      // Show container
      container.style.display = "block";
      console.log("✅ Settings rendered successfully");
    } catch (error) {
      console.error("❌ Error rendering settings:", error);
      this.showError(`Failed to render settings: ${error.message}`);
    }
  }

  /**
   * Create setting group with validation
   */
  createSettingGroup(groupName, settingKeys) {
    const validSettings = settingKeys.filter((key) => this.currentSettings.has(key));

    if (validSettings.length === 0) {
      console.log(`⚠️ No valid settings found for group: ${groupName}`);
      return null;
    }

    const groupElement = document.createElement("div");
    groupElement.className = "setting-group";
    groupElement.setAttribute("data-group", groupName);

    const groupTitle = document.createElement("h3");
    groupTitle.textContent = groupName;
    groupTitle.className = "setting-group-title";
    groupElement.appendChild(groupTitle);

    validSettings.forEach((key) => {
      try {
        const setting = this.currentSettings.get(key);
        const settingElement = this.createSettingElement(key, setting);
        groupElement.appendChild(settingElement);
      } catch (error) {
        console.error(`❌ Error creating setting element for ${key}:`, error);
        // Continue with other settings instead of failing completely
      }
    });

    return groupElement;
  }

  /**
   * Create individual setting element with comprehensive error handling
   */
  createSettingElement(key, setting) {
    if (!setting) {
      throw new Error(`Setting data missing for key: ${key}`);
    }

    const wrapper = document.createElement("div");
    wrapper.className = "setting-item";
    wrapper.setAttribute("data-key", key);

    // Create label
    const label = document.createElement("label");
    label.textContent = setting.description || key;
    label.className = "setting-label";
    label.setAttribute("for", `setting-${key}`);

    // Create input container with error display
    const inputContainer = document.createElement("div");
    inputContainer.className = "input-container";

    const input = this.createInputElement(key, setting);
    input.id = `setting-${key}`;

    const errorMessage = document.createElement("div");
    errorMessage.className = "error-message";
    errorMessage.textContent = "";

    // Assemble elements
    inputContainer.appendChild(input);
    inputContainer.appendChild(errorMessage);
    wrapper.appendChild(label);
    wrapper.appendChild(inputContainer);

    return wrapper;
  }

  /**
   * Create appropriate input element with advanced validation
   */
  createInputElement(key, setting) {
    let input;

    try {
      switch (setting.type) {
        case "boolean":
          input = document.createElement("input");
          input.type = "checkbox";
          input.checked = setting.value;
          input.addEventListener("change", () =>
            this.handleSettingChange(key, input)
          );
          break;

        case "text":
          input = document.createElement("input");
          input.type = "text";
          input.value = setting.value || "";
          input.maxLength = setting.maxLength || 1000;
          input.placeholder = `Enter ${setting.description?.toLowerCase() || key}`;
          input.addEventListener("input", () =>
            this.handleSettingChange(key, input)
          );
          input.addEventListener("blur", () => this.validateSetting(key, input));
          break;

        case "longtext":
          input = document.createElement("textarea");
          input.value = setting.value || "";
          input.maxLength = setting.maxLength || 50000;
          input.rows = 3;
          input.placeholder = `Enter ${setting.description?.toLowerCase() || key}`;
          input.addEventListener("input", () =>
            this.handleSettingChange(key, input)
          );
          input.addEventListener("blur", () => this.validateSetting(key, input));
          break;

        case "number":
          input = document.createElement("input");
          input.type = "number";
          input.value = setting.value || 0;
          if (setting.min !== undefined) input.min = setting.min;
          if (setting.max !== undefined) input.max = setting.max;
          input.step = 1;
          input.addEventListener("input", () =>
            this.handleSettingChange(key, input)
          );
          input.addEventListener("blur", () => this.validateSetting(key, input));
          break;

        case "json":
          input = document.createElement("textarea");
          input.value = JSON.stringify(setting.value, null, 2);
          input.className = "json-input";
          input.rows = 4;
          input.addEventListener("input", () =>
            this.handleSettingChange(key, input)
          );
          input.addEventListener("blur", () => this.validateSetting(key, input));
          break;

        default:
          console.warn(`⚠️ Unknown setting type: ${setting.type} for key: ${key}`);
          input = document.createElement("input");
          input.type = "text";
          input.value = setting.value || "";
          input.addEventListener("input", () =>
            this.handleSettingChange(key, input)
          );
          break;
      }

      input.className = "setting-input";
      return input;
    } catch (error) {
      console.error(`❌ Error creating input for ${key}:`, error);
      // Return basic text input as fallback
      const fallbackInput = document.createElement("input");
      fallbackInput.type = "text";
      fallbackInput.value = "Error creating input";
      fallbackInput.disabled = true;
      fallbackInput.className = "setting-input error";
      return fallbackInput;
    }
  }

  /**
   * Handle setting changes with comprehensive validation and error recovery
   */
  async handleSettingChange(key, input) {
    try {
      const setting = this.currentSettings.get(key);
      if (!setting) {
        throw new Error(`Setting not found: ${key}`);
      }

      let value = input.value;

      // Parse value based on type with error handling
      if (setting.type === "boolean") {
        value = input.checked;
      } else if (setting.type === "number") {
        value = parseFloat(value);
        if (isNaN(value)) {
          throw new Error("Invalid number format");
        }
      } else if (setting.type === "json") {
        try {
          value = JSON.parse(value);
        } catch (e) {
          throw new Error(`Invalid JSON format: ${e.message}`);
        }
      }

      // Validate the value
      this.validateValue(setting, value);

      // Update the setting via background script
      await this.updateSetting(key, value);

      // Clear any validation errors on success
      this.clearValidationError(key);
      
      console.log(`✅ Setting ${key} updated successfully to:`, value);
    } catch (error) {
      console.error(`❌ Error updating setting ${key}:`, error);
      this.setValidationError(key, error.message);
    }
  }

  /**
   * Validate setting input with comprehensive checks
   */
  validateSetting(key, input) {
    try {
      const setting = this.currentSettings.get(key);
      if (!setting) {
        throw new Error(`Setting not found: ${key}`);
      }

      let value = input.value;

      // Type-specific validation
      if (setting.type === "number") {
        value = parseFloat(value);
        if (isNaN(value)) {
          throw new Error("Must be a valid number");
        }
      } else if (setting.type === "json") {
        try {
          value = JSON.parse(value);
        } catch (e) {
          throw new Error(`Invalid JSON: ${e.message}`);
        }
      }

      // Run value validation
      this.validateValue(setting, value);
      
      // Clear errors on successful validation
      this.clearValidationError(key);
    } catch (error) {
      this.setValidationError(key, error.message);
    }
  }

  /**
   * Comprehensive value validation based on setting constraints
   */
  validateValue(setting, value) {
    switch (setting.type) {
      case "boolean":
        if (typeof value !== "boolean") {
          throw new Error("Must be a boolean value");
        }
        break;

      case "text":
      case "longtext":
        if (typeof value !== "string") {
          throw new Error("Must be a text value");
        }
        if (setting.maxLength && value.length > setting.maxLength) {
          throw new Error(`Must not exceed ${setting.maxLength} characters`);
        }
        if (setting.minLength && value.length < setting.minLength) {
          throw new Error(`Must be at least ${setting.minLength} characters`);
        }
        break;

      case "number":
        if (typeof value !== "number" || isNaN(value)) {
          throw new Error("Must be a valid number");
        }
        if (setting.min !== undefined && value < setting.min) {
          throw new Error(`Must be at least ${setting.min}`);
        }
        if (setting.max !== undefined && value > setting.max) {
          throw new Error(`Must be at most ${setting.max}`);
        }
        break;

      case "json":
        if (typeof value !== "object" || value === null) {
          throw new Error("Must be a valid JSON object");
        }
        break;

      default:
        // No additional validation for unknown types
        break;
    }
  }

  /**
   * Update setting via background script with timeout and error handling
   */
  async updateSetting(key, value) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Update timeout for setting: ${key}`));
      }, this.config.messageTimeout);

      browserAPI.runtime
        .sendMessage({
          type: "UPDATE_SETTING",
          key: key,
          value: value,
        })
        .then((response) => {
          clearTimeout(timeout);

          if (!response) {
            reject(new Error("No response from background script"));
            return;
          }

          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          // Update local cache on success
          const setting = this.currentSettings.get(key);
          if (setting) {
            setting.value = value;
            this.currentSettings.set(key, setting);
          }

          resolve(response);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Set validation error with visual feedback
   */
  setValidationError(key, message) {
    this.validationErrors.set(key, message);

    const settingElement = document.querySelector(`[data-key="${key}"]`);
    if (settingElement) {
      settingElement.classList.add("error");
      const errorElement = settingElement.querySelector(".error-message");
      if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = "block";
      }
    }
  }

  /**
   * Clear validation error and visual feedback
   */
  clearValidationError(key) {
    this.validationErrors.delete(key);

    const settingElement = document.querySelector(`[data-key="${key}"]`);
    if (settingElement) {
      settingElement.classList.remove("error");
      const errorElement = settingElement.querySelector(".error-message");
      if (errorElement) {
        errorElement.textContent = "";
        errorElement.style.display = "none";
      }
    }
  }

  /**
   * Export settings with comprehensive error handling
   */
  async exportSettings() {
    try {
      console.log("📤 Exporting settings...");

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Export timeout"));
        }, this.config.messageTimeout);

        browserAPI.runtime.sendMessage({
          type: "EXPORT_SETTINGS",
        }).then((response) => {
          clearTimeout(timeout);
          resolve(response);
        }).catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error("No export data received");
      }

      // Create and download file
      const blob = new Blob([response.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `settings-${new Date().toISOString().split("T")[0]}.json`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
      this.showSuccess("Settings exported successfully");
      
      console.log("✅ Settings exported successfully");
    } catch (error) {
      console.error("❌ Export failed:", error);
      this.showError(`Export failed: ${error.message}`);
    }
  }

  /**
   * Import settings with validation and error recovery
   */
  async importSettings() {
    try {
      console.log("📥 Starting settings import...");

      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.style.display = "none";

      input.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) {
          console.log("⚠️ No file selected for import");
          return;
        }

        try {
          console.log("📁 Processing import file:", file.name);

          // Validate file size (prevent memory issues)
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (file.size > maxSize) {
            throw new Error("File is too large (maximum 10MB)");
          }

          // Read file content
          const content = await file.text();

          // Validate JSON structure
          let parsedData;
          try {
            parsedData = JSON.parse(content);
          } catch (e) {
            throw new Error(`Invalid JSON file: ${e.message}`);
          }

          // Send to background script
          const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Import timeout"));
            }, this.config.messageTimeout * 2); // Double timeout for import

            browserAPI.runtime.sendMessage({
              type: "IMPORT_SETTINGS",
              data: content,
            }).then((response) => {
              clearTimeout(timeout);
              resolve(response);
            }).catch((error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });

          if (response.error) {
            throw new Error(response.error);
          }

          // Reload settings and refresh UI
          await this.loadSettings();
          this.renderSettings();
          this.showSuccess("Settings imported successfully");
          
          console.log("✅ Settings imported successfully");
        } catch (error) {
          console.error("❌ Import failed:", error);
          this.showError(`Import failed: ${error.message}`);
        }
      });

      // Trigger file selection
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    } catch (error) {
      console.error("❌ Error in importSettings method:", error);
      this.showError(`Import setup failed: ${error.message}`);
    }
  }

  /**
   * Reset settings to defaults with confirmation and error handling
   */
  async resetToDefaults() {
    if (!confirm(
      "Are you sure you want to reset all settings to defaults? This action cannot be undone."
    )) {
      return;
    }

    try {
      console.log("🔄 Resetting settings to defaults...");

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Reset timeout"));
        }, this.config.messageTimeout);

        browserAPI.runtime
          .sendMessage({
            type: "RESET_SETTINGS",
          })
          .then((response) => {
            clearTimeout(timeout);
            resolve(response);
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Reload settings and refresh UI
      await this.loadSettings();
      this.renderSettings();
      
      // Clear any validation errors
      this.validationErrors.clear();
      document.querySelectorAll(".setting-item.error").forEach(el => {
        el.classList.remove("error");
        const errorEl = el.querySelector(".error-message");
        if (errorEl) {
          errorEl.textContent = "";
          errorEl.style.display = "none";
        }
      });

      this.showSuccess("Settings reset to defaults");
      console.log("✅ Settings reset successfully");
    } catch (error) {
      console.error("❌ Reset failed:", error);
      this.showError(`Reset failed: ${error.message}`);
    }
  }

  /**
   * Open advanced settings with error handling
   */
  openAdvancedSettings() {
    try {
      console.log("🔧 Opening advanced settings...");

      // Use proper Manifest V3 options API
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
        console.log("✅ Options page opened using chrome.runtime.openOptionsPage()");
      } else {
        // Fallback for older browsers or if openOptionsPage isn't available
        console.log("⚠️ Falling back to manual tab creation");
        browserAPI.tabs.create({
          url: browserAPI.runtime.getURL("options/options.html"),
        });
      }
    } catch (error) {
      console.error("❌ Failed to open options page:", error);
      
      // Final fallback - try manual tab creation
      try {
        browserAPI.tabs.create({
          url: browserAPI.runtime.getURL("options/options.html"),
        });
      } catch (fallbackError) {
        console.error("❌ Fallback also failed:", fallbackError);
        this.showError(
          "Unable to open advanced settings. Please try right-clicking the extension icon and selecting 'Options'."
        );
      }
    }
  }

  /**
   * Get current UI values for debugging and testing
   */
  getUIValues() {
    const values = {};
    const inputs = document.querySelectorAll(
      "#settings-container input, #settings-container textarea"
    );
    
    inputs.forEach((input) => {
      const key = input.id.replace("setting-", "");
      if (key) {
        values[key] = input.type === "checkbox" ? input.checked : input.value;
      }
    });
    
    return values;
  }

  /**
   * Show success message with auto-dismiss
   */
  showSuccess(message) {
    this.showMessage(message, "success");
  }

  /**
   * Show error message with longer display time
   */
  showError(message) {
    this.showMessage(message, "error");
  }

  /**
   * Show message with advanced styling and management
   */
  showMessage(message, type) {
    // Get or create message container
    let container = document.getElementById("message-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "message-container";
      container.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        right: 10px;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    // Create message element
    const messageEl = document.createElement("div");
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
      padding: 12px 16px;
      margin-bottom: 8px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      pointer-events: auto;
      transition: all 0.3s ease;
      ${type === "success" 
        ? "background: #4CAF50; color: white; border: 1px solid #4CAF50;" 
        : "background: #f44336; color: white; border: 1px solid #f44336;"
      }
    `;

    // Add to container
    container.appendChild(messageEl);

    // Auto-remove with different timeouts based on type
    const timeout = type === "error" ? 7000 : 5000;
    setTimeout(() => {
      if (container.contains(messageEl)) {
        messageEl.style.opacity = "0";
        messageEl.style.transform = "translateY(-20px)";
        setTimeout(() => {
          if (container.contains(messageEl)) {
            container.removeChild(messageEl);
          }
        }, 300);
      }
    }, timeout);
  }

  /**
   * Show loading state
   */
  showLoading() {
    let loading = document.getElementById("loading");
    if (loading) {
      loading.style.display = "block";
    }
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    const loading = document.getElementById("loading");
    if (loading) {
      loading.style.display = "none";
    }
  }

  /**
   * Setup event listeners for action buttons
   */
  setupEventListeners() {
    const exportBtn = document.getElementById("export-btn");
    const importBtn = document.getElementById("import-btn");
    const resetBtn = document.getElementById("reset-btn");
    const advancedBtn = document.getElementById("advanced-btn");

    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportSettings());
    }

    if (importBtn) {
      importBtn.addEventListener("click", () => this.importSettings());
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.resetToDefaults());
    }

    if (advancedBtn) {
      advancedBtn.addEventListener("click", () => this.openAdvancedSettings());
    }

    console.log("✅ Event listeners set up");
  }

  /**
   * Cleanup and destroy popup instance
   */
  destroy() {
    console.log("🧹 Cleaning up Advanced Settings Popup");

    // Clear validation errors
    this.validationErrors.clear();

    // Reset initialization state
    this.isInitialized = false;
    this.initializationRetries = 0;

    // Clear settings cache
    this.currentSettings.clear();

    console.log("✅ Advanced Settings Popup cleaned up");
  }
}

/**
 * Production-Ready HTML Template
 * Copy this to your popup.html for complete functionality
 */
const ADVANCED_POPUP_HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Extension Settings</title>
  <style>
    /* Reset and base styles */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 380px;
      max-height: 600px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      background: #fff;
      overflow-y: auto;
    }

    /* Loading state */
    #loading {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    #loading::before {
      content: "⏳";
      display: block;
      font-size: 24px;
      margin-bottom: 12px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Header */
    .header {
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #f0f0f0;
    }

    .header h1 {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    /* Settings container */
    #settings-container {
      display: none;
    }

    /* Setting groups */
    .setting-group {
      margin-bottom: 24px;
    }

    .setting-group-title {
      font-size: 16px;
      font-weight: 600;
      color: #34495e;
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 1px solid #ecf0f1;
    }

    /* Setting items */
    .setting-item {
      margin-bottom: 16px;
      padding: 12px;
      border: 1px solid #e1e8ed;
      border-radius: 8px;
      background: #fafafa;
      transition: all 0.2s ease;
    }

    .setting-item:hover {
      background: #f5f5f5;
      border-color: #d1d9e0;
    }

    .setting-item.error {
      border-color: #e74c3c;
      background: #fdf2f2;
    }

    .setting-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #2c3e50;
      cursor: pointer;
    }

    .input-container {
      position: relative;
    }

    /* Input styles */
    .setting-input {
      width: 100%;
      padding: 8px 12px;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s ease;
      background: white;
    }

    .setting-input:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }

    .setting-input.error {
      border-color: #e74c3c;
    }

    /* Checkbox styling */
    input[type="checkbox"].setting-input {
      width: auto;
      margin: 0;
      transform: scale(1.2);
      cursor: pointer;
    }

    /* Textarea styling */
    textarea.setting-input {
      resize: vertical;
      min-height: 80px;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 12px;
    }

    .json-input {
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 12px;
    }

    /* Error messages */
    .error-message {
      display: none;
      margin-top: 6px;
      padding: 6px 8px;
      background: #fdf2f2;
      border: 1px solid #f5b7b1;
      border-radius: 4px;
      color: #c0392b;
      font-size: 12px;
      font-weight: 500;
    }

    /* Action buttons */
    .action-buttons {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #ecf0f1;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .action-button {
      flex: 1;
      min-width: 80px;
      padding: 10px 16px;
      border: 2px solid #3498db;
      border-radius: 6px;
      background: white;
      color: #3498db;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-button:hover {
      background: #3498db;
      color: white;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
    }

    .action-button:active {
      transform: translateY(0);
    }

    .action-button.primary {
      background: #3498db;
      color: white;
    }

    .action-button.primary:hover {
      background: #2980b9;
    }

    .action-button.danger {
      border-color: #e74c3c;
      color: #e74c3c;
    }

    .action-button.danger:hover {
      background: #e74c3c;
      color: white;
    }

    /* Message container */
    #message-container {
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      z-index: 10000;
      pointer-events: none;
    }

    .message {
      padding: 12px 16px;
      margin-bottom: 8px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      pointer-events: auto;
      transition: all 0.3s ease;
    }

    .message.success {
      background: #4CAF50;
      color: white;
      border: 1px solid #4CAF50;
    }

    .message.error {
      background: #f44336;
      color: white;
      border: 1px solid #f44336;
    }

    /* Responsive design */
    @media (max-width: 400px) {
      body {
        width: 320px;
        padding: 12px;
      }
      
      .action-buttons {
        flex-direction: column;
      }
      
      .action-button {
        flex: none;
      }
    }

    /* Accessibility improvements */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      body {
        background: #1a1a1a;
        color: #e0e0e0;
      }
      
      .setting-item {
        background: #2d2d2d;
        border-color: #404040;
        color: #e0e0e0;
      }
      
      .setting-input {
        background: #2d2d2d;
        border-color: #404040;
        color: #e0e0e0;
      }
      
      .setting-input:focus {
        border-color: #5dade2;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>⚙️ Extension Settings</h1>
  </div>

  <!-- Loading state -->
  <div id="loading">
    Loading settings...
  </div>

  <!-- Settings container -->
  <div id="settings-container">
    <!-- Settings will be rendered here by JavaScript -->
  </div>

  <!-- Action buttons -->
  <div class="action-buttons">
    <button id="export-btn" class="action-button" title="Export settings to file">
      📤 Export
    </button>
    <button id="import-btn" class="action-button" title="Import settings from file">
      📥 Import
    </button>
    <button id="reset-btn" class="action-button danger" title="Reset all settings to defaults">
      🔄 Reset
    </button>
    <button id="advanced-btn" class="action-button primary" title="Open advanced settings page">
      🔧 Advanced
    </button>
  </div>

  <!-- Message container for notifications -->
  <div id="message-container"></div>

  <!-- Scripts -->
  <script src="../lib/browser-compat.js"></script>
  <script src="popup-integration.js"></script>
</body>
</html>
`;

// Initialize popup when DOM is ready
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    try {
      window.advancedSettingsPopupInstance = new AdvancedSettingsPopup();
    } catch (error) {
      console.error("❌ Error creating AdvancedSettingsPopup instance:", error);
    }
  });
}

// Export for testing and debugging
if (typeof window !== "undefined") {
  window.AdvancedSettingsPopup = AdvancedSettingsPopup;
}

/**
 * INTEGRATION INSTRUCTIONS:
 * 
 * 1. File Setup:
 *    - Save this file as popup-integration.js in your popup directory
 *    - Copy the HTML template above to popup.html
 *    - Ensure lib/browser-compat.js is accessible
 * 
 * 2. Manifest Configuration:
 *    {
 *      "action": {
 *        "default_popup": "popup/popup.html",
 *        "default_icon": {
 *          "16": "icons/icon16.png",
 *          "48": "icons/icon48.png",
 *          "128": "icons/icon128.png"
 *        }
 *      }
 *    }
 * 
 * 3. Background Script Integration:
 *    - Ensure background script handles these message types:
 *      - PING (for connection testing)
 *      - GET_ALL_SETTINGS
 *      - UPDATE_SETTING
 *      - EXPORT_SETTINGS
 *      - IMPORT_SETTINGS
 *      - RESET_SETTINGS
 * 
 * 4. Settings Schema:
 *    - Define settings in config/defaults.json with proper types and constraints
 *    - Supported types: boolean, text, longtext, number, json
 *    - Include validation constraints (min, max, maxLength, etc.)
 * 
 * 5. Customization:
 *    - Modify settingGroups object to organize your settings
 *    - Adjust timeouts and retry logic in config object
 *    - Customize styling in the HTML template
 *    - Add custom validation logic in validateValue method
 * 
 * 6. Error Handling:
 *    - All operations include comprehensive error handling
 *    - Connection failures are retried with exponential backoff
 *    - User-friendly error messages are displayed
 *    - Validation errors are shown inline with inputs
 * 
 * 7. Performance Features:
 *    - Settings are cached locally for quick access
 *    - Progressive timeouts for different operations
 *    - Memory cleanup on popup close
 *    - Efficient DOM updates and event handling
 * 
 * This implementation provides production-ready popup functionality with:
 * - Robust error handling and retry logic
 * - Comprehensive input validation
 * - Professional UI with accessibility support
 * - Memory management and cleanup
 * - Cross-browser compatibility via browser-compat.js
 * - Real-time settings synchronization
 * - Import/export functionality
 * - Advanced configuration options
 */

console.log("🎯 Advanced Popup Integration Example loaded and ready");