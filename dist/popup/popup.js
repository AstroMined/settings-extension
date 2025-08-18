// Popup JavaScript for Settings Extension

class SettingsPopup {
  constructor() {
    this.currentSettings = new Map();
    this.validationErrors = new Map();
    this.isInitialized = false;
    this.saveStatusIndicator = null;

    // Small delay to ensure DOM is fully ready (fixes race condition)
    setTimeout(() => {
      this.setupEventListeners();
      this.initializeSaveStatusIndicator();
      this.initialize();
    }, 0);
  }

  /**
   * Initialize save status indicator
   */
  initializeSaveStatusIndicator() {
    try {
      const container = document.getElementById("save-status-container");
      if (container && typeof SaveStatusIndicator !== "undefined") {
        this.saveStatusIndicator = new SaveStatusIndicator(container, {
          position: "top-right",
          autoHide: true,
          autoHideDelay: 3000,
          showRetry: true,
          enableToasts: false, // Disabled in popup due to space constraints
          onRetry: () => this.retrySave(),
          onDismiss: () => this.dismissSaveStatus(),
        });

        console.debug("Save status indicator initialized");
      } else {
        console.warn("Save status indicator not available");
      }
    } catch (error) {
      console.error("Failed to initialize save status indicator:", error);
    }
  }

  async initialize() {
    try {
      console.debug("Initializing popup...");

      // First test if background script is responding at all
      await this.testBackgroundConnection();

      await this.loadSettings();
      this.renderSettings();
      this.hideLoading();
      this.isInitialized = true;

      // Initialize save status as saved
      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.showSaved();
      }

      console.debug("Popup initialized successfully");
    } catch (error) {
      console.error("Failed to initialize popup:", error);
      this.showError(`Failed to initialize: ${error.message}`);
      this.hideLoading();

      // Show error in save status indicator
      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.showError(
          error,
          "Failed to initialize settings",
        );
      }
    }
  }

  async testBackgroundConnection() {
    const maxRetries = 2;
    const timeout = 5000; // 5 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await Promise.race([
          browserAPI.runtime.sendMessage({ type: "PING" }),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Timeout")), timeout);
          }),
        ]);

        if (response && response.pong) {
          return; // Success
        }
        throw new Error("Invalid ping response");
      } catch {
        if (attempt === maxRetries) {
          throw new Error(
            `Service worker not responding after ${maxRetries} attempts. Please reload the extension.`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  async loadSettings() {
    const maxRetries = 2;
    const timeout = 5000; // 5 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await Promise.race([
          browserAPI.runtime.sendMessage({ type: "GET_ALL_SETTINGS" }),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Timeout")), timeout);
          }),
        ]);

        if (!response) {
          throw new Error("No response from background script");
        }

        if (response.error) {
          throw new Error(`Backend error: ${response.error}`);
        }

        if (!response.settings) {
          throw new Error("Invalid response format - missing settings");
        }

        this.currentSettings = new Map(Object.entries(response.settings));
        return; // Success
      } catch (error) {
        console.error(`Error loading settings (attempt ${attempt}):`, error);

        // On final attempt, try storage fallback
        if (attempt === maxRetries) {
          try {
            const settings = await this.loadSettingsFromStorage();
            if (settings) {
              console.debug(
                "Successfully loaded settings from storage fallback",
              );
              this.currentSettings = settings;
              return;
            }
          } catch (storageError) {
            console.error("Storage fallback failed:", storageError);
          }
          throw error;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
  }

  async loadDefaultSettings() {
    try {
      const response = await fetch(
        browserAPI.runtime.getURL("config/defaults.json"),
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch defaults: ${response.status}`);
      }
      const defaults = await response.json();
      console.debug("Loaded default settings from config/defaults.json");
      return defaults;
    } catch (error) {
      console.error("Failed to load default settings:", error);
      // Return minimal fallback settings
      return {
        feature_enabled: {
          type: "boolean",
          value: true,
          description: "Enable main feature functionality",
        },
      };
    }
  }

  /**
   * Simple storage fallback - load settings directly from storage
   */
  async loadSettingsFromStorage() {
    try {
      const storageResult = await browserAPI.storage.local.get("settings");

      if (
        storageResult.settings &&
        this.validateStorageSettings(storageResult.settings)
      ) {
        return new Map(Object.entries(storageResult.settings));
      }

      // No valid settings found, initialize with defaults
      const defaultSettings = await this.loadDefaultSettings();
      await browserAPI.storage.local.set({ settings: defaultSettings });
      return new Map(Object.entries(defaultSettings));
    } catch (error) {
      console.error("Storage fallback failed:", error);
      return null;
    }
  }

  /**
   * Validate that settings object has the expected structure
   */
  validateStorageSettings(settings) {
    if (!settings || typeof settings !== "object") {
      return false;
    }

    const keys = Object.keys(settings);
    if (keys.length === 0) {
      return false;
    }

    // Validate at least one setting has proper structure
    for (const key of keys) {
      const setting = settings[key];
      if (
        setting &&
        typeof setting === "object" &&
        "type" in setting &&
        "value" in setting
      ) {
        return true; // At least one valid setting found
      }
    }

    return false;
  }

  renderSettings() {
    const container = document.getElementById("settings-container");
    container.innerHTML = "";

    // Group settings by type for better organization
    const settingGroups = {
      "Quick Settings": ["feature_enabled", "refresh_interval"],
      Configuration: ["api_key", "advanced_config"],
      Appearance: ["custom_css"],
    };

    for (const [groupName, settingKeys] of Object.entries(settingGroups)) {
      const groupElement = this.createSettingGroup(groupName, settingKeys);
      if (groupElement) {
        container.appendChild(groupElement);
      }
    }

    container.style.display = "block";
  }

  createSettingGroup(groupName, settingKeys) {
    const validSettings = settingKeys.filter((key) =>
      this.currentSettings.has(key),
    );

    if (validSettings.length === 0) {
      return null;
    }

    const groupElement = document.createElement("div");
    groupElement.className = "setting-group";

    const groupTitle = document.createElement("h3");
    groupTitle.textContent = groupName;
    groupTitle.className = "setting-group-title";
    groupElement.appendChild(groupTitle);

    validSettings.forEach((key) => {
      const setting = this.currentSettings.get(key);
      const settingElement = this.createSettingElement(key, setting);
      groupElement.appendChild(settingElement);
    });

    return groupElement;
  }

  createSettingElement(key, setting) {
    const wrapper = document.createElement("div");
    wrapper.className = "setting-item";
    wrapper.setAttribute("data-key", key);

    const label = document.createElement("label");
    label.textContent = setting.description;
    label.className = "setting-label";
    label.setAttribute("for", `setting-${key}`);

    const inputContainer = document.createElement("div");
    inputContainer.className = "input-container";

    const input = this.createInputElement(key, setting);
    input.id = `setting-${key}`;

    const errorMessage = document.createElement("div");
    errorMessage.className = "error-message";
    errorMessage.textContent = "";

    inputContainer.appendChild(input);
    inputContainer.appendChild(errorMessage);

    wrapper.appendChild(label);
    wrapper.appendChild(inputContainer);

    return wrapper;
  }

  createInputElement(key, setting) {
    let input;

    switch (setting.type) {
      case "boolean":
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = setting.value;
        input.addEventListener("change", () =>
          this.handleSettingChange(key, input),
        );
        break;

      case "text":
        input = document.createElement("input");
        input.type = "text";
        input.value = setting.value;
        input.maxLength = setting.maxLength || 1000;
        input.placeholder = `Enter ${setting.description.toLowerCase()}`;
        input.addEventListener("input", () =>
          this.handleSettingChange(key, input),
        );
        input.addEventListener("blur", () => this.validateSetting(key, input));
        break;

      case "longtext":
        input = document.createElement("textarea");
        input.value = setting.value;
        input.maxLength = setting.maxLength || 50000;
        input.rows = 3;
        input.placeholder = `Enter ${setting.description.toLowerCase()}`;
        input.addEventListener("input", () =>
          this.handleSettingChange(key, input),
        );
        input.addEventListener("blur", () => this.validateSetting(key, input));
        break;

      case "number":
        input = document.createElement("input");
        input.type = "number";
        input.value = setting.value;
        input.min = setting.min;
        input.max = setting.max;
        input.step = 1;
        input.addEventListener("input", () =>
          this.handleSettingChange(key, input),
        );
        input.addEventListener("blur", () => this.validateSetting(key, input));
        break;

      case "json":
        input = document.createElement("textarea");
        input.value = JSON.stringify(setting.value, null, 2);
        input.className = "json-input";
        input.rows = 4;
        input.addEventListener("input", () =>
          this.handleSettingChange(key, input),
        );
        input.addEventListener("blur", () => this.validateSetting(key, input));
        break;

      case "enum":
        input = document.createElement("select");
        input.className = "setting-select";
        // Add options from configuration
        if (setting.options && typeof setting.options === "object") {
          for (const [value, displayText] of Object.entries(setting.options)) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = displayText;
            option.selected = value === setting.value;
            input.appendChild(option);
          }
        }
        input.addEventListener("change", () =>
          this.handleSettingChange(key, input),
        );
        break;

      default:
        input = document.createElement("input");
        input.type = "text";
        input.value = setting.value;
        input.addEventListener("input", () =>
          this.handleSettingChange(key, input),
        );
        break;
    }

    input.className = "setting-input";
    return input;
  }

  async handleSettingChange(key, input) {
    try {
      const setting = this.currentSettings.get(key);
      let value = input.value;

      // Parse value based on type
      if (setting.type === "boolean") {
        value = input.checked;
      } else if (setting.type === "number") {
        value = parseFloat(value);
        if (isNaN(value)) {
          throw new Error("Invalid number");
        }
      } else if (setting.type === "json") {
        try {
          value = this.safeJsonParse(value);
        } catch {
          throw new Error("Invalid JSON format");
        }
      }

      // Validate the value
      this.validateValue(setting, value);

      // Show saving status
      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.showSaving();
      }

      // Update the setting
      await this.updateSetting(key, value);

      // Show saved status
      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.showSaved();
      }

      // Clear any validation errors
      this.clearValidationError(key);
    } catch (error) {
      this.setValidationError(key, error.message);

      // Show error in save status indicator
      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.showError(error, `Failed to save ${key}`);
      }
    }
  }

  validateSetting(key, input) {
    try {
      const setting = this.currentSettings.get(key);
      let value = input.value;

      if (setting.type === "number") {
        value = parseFloat(value);
        if (isNaN(value)) {
          throw new Error("Invalid number");
        }
      } else if (setting.type === "json") {
        try {
          value = this.safeJsonParse(value);
        } catch {
          throw new Error("Invalid JSON format");
        }
      }

      this.validateValue(setting, value);
      this.clearValidationError(key);
    } catch (error) {
      this.setValidationError(key, error.message);
    }
  }

  validateValue(setting, value) {
    switch (setting.type) {
      case "boolean":
        if (typeof value !== "boolean") {
          throw new Error("Must be a boolean");
        }
        break;

      case "text":
      case "longtext":
        if (typeof value !== "string") {
          throw new Error("Must be a string");
        }
        if (setting.maxLength && value.length > setting.maxLength) {
          throw new Error(`Exceeds maximum length of ${setting.maxLength}`);
        }
        break;

      case "number":
        if (typeof value !== "number") {
          throw new Error("Must be a number");
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
          throw new Error("Must be a valid object");
        }
        break;

      case "enum":
        if (!setting.options || typeof setting.options !== "object") {
          throw new Error("Enum setting is missing options");
        }
        if (!setting.options[value]) {
          const validOptions = Object.keys(setting.options).join(", ");
          throw new Error(`Must be one of: ${validOptions}`);
        }
        break;
    }
  }

  async updateSetting(key, value) {
    return new Promise((resolve, reject) => {
      browserAPI.runtime
        .sendMessage({
          type: "UPDATE_SETTING",
          key: key,
          value: value,
        })
        .then((response) => {
          if (!response) {
            reject(new Error("No response from background script"));
            return;
          }

          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          // Update local cache
          const setting = this.currentSettings.get(key);
          setting.value = value;
          this.currentSettings.set(key, setting);

          resolve();
        })
        .catch(reject);
    });
  }

  setValidationError(key, message) {
    this.validationErrors.set(key, message);

    const settingElement = document.querySelector(`[data-key="${key}"]`);
    if (settingElement) {
      settingElement.classList.add("error");
      const errorElement = settingElement.querySelector(".error-message");
      if (errorElement) {
        errorElement.textContent = message;
      }
    }
  }

  clearValidationError(key) {
    this.validationErrors.delete(key);

    const settingElement = document.querySelector(`[data-key="${key}"]`);
    if (settingElement) {
      settingElement.classList.remove("error");
      const errorElement = settingElement.querySelector(".error-message");
      if (errorElement) {
        errorElement.textContent = "";
      }
    }
  }

  async exportSettings() {
    try {
      // Show saving status during export
      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.updateStatus("saving", {
          message: "Exporting settings...",
        });
      }

      const response = await browserAPI.runtime.sendMessage({
        type: "EXPORT_SETTINGS",
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const blob = new Blob([response.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `settings-${new Date().toISOString().split("T")[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);

      // Show success
      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.updateStatus("saved", {
          message: "Settings exported successfully",
        });
      }
      this.showSuccess("Settings exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      this.showError(`Export failed: ${error.message}`);

      // Show error in save status indicator
      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.showError(error, "Export failed");
      }
    }
  }

  async importSettings() {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";

      input.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
          // Show saving status during import
          if (this.saveStatusIndicator) {
            this.saveStatusIndicator.updateStatus("saving", {
              message: "Importing settings...",
            });
          }

          const content = await file.text();
          const response = await browserAPI.runtime.sendMessage({
            type: "IMPORT_SETTINGS",
            data: content,
          });

          if (response.error) {
            throw new Error(response.error);
          }

          await this.loadSettings();
          this.renderSettings();

          // Show success
          if (this.saveStatusIndicator) {
            this.saveStatusIndicator.updateStatus("saved", {
              message: "Settings imported successfully",
            });
          }
          this.showSuccess("Settings imported successfully");
        } catch (error) {
          console.error("Import failed:", error);
          this.showError(`Import failed: ${error.message}`);

          // Show error in save status indicator
          if (this.saveStatusIndicator) {
            this.saveStatusIndicator.showError(error, "Import failed");
          }
        }
      });

      input.click();
    } catch (error) {
      console.error("Error in importSettings method:", error);
      this.showError(`Import setup failed: ${error.message}`);

      // Show error in save status indicator
      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.showError(error, "Import setup failed");
      }
    }
  }

  // Helper method to get current UI values for debugging
  getUIValues() {
    const values = {};
    const inputs = document.querySelectorAll(
      "#settings-container input, #settings-container textarea",
    );
    inputs.forEach((input) => {
      const key = input.id.replace("setting-", "");
      values[key] = input.type === "checkbox" ? input.checked : input.value;
    });
    return values;
  }

  async resetToDefaults() {
    if (
      !confirm(
        "Are you sure you want to reset all settings to defaults? This cannot be undone.",
      )
    ) {
      return;
    }

    try {
      // Show saving status during reset
      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.updateStatus("saving", {
          message: "Resetting settings...",
        });
      }

      const response = await new Promise((resolve, reject) => {
        browserAPI.runtime
          .sendMessage({
            type: "RESET_SETTINGS",
          })
          .then(resolve)
          .catch(reject);
      });

      if (response.error) {
        throw new Error(response.error);
      }

      await this.loadSettings();
      this.renderSettings();

      // Show success
      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.updateStatus("saved", {
          message: "Settings reset to defaults",
        });
      }
      this.showSuccess("Settings reset to defaults");
    } catch (error) {
      console.error("Reset failed:", error);
      this.showError(`Reset failed: ${error.message}`);

      // Show error in save status indicator
      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.showError(error, "Reset failed");
      }
    }
  }

  async checkContentScriptPresence() {
    try {
      const result = await browserAPI.storage.local.get(
        "contentScriptRegistry",
      );
      const registry = result.contentScriptRegistry || {};

      // Get current tab ID to check if content script is registered for this tab
      const [tab] = await browserAPI.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) return false;

      // Check if content script is registered for current tab and is recent (within last 30 seconds)
      const tabEntry = registry[tab.id];
      if (!tabEntry || !tabEntry.timestamp) return false;

      const now = Date.now();
      const isRecent = now - tabEntry.timestamp < 30000; // 30 second timeout

      return isRecent;
    } catch (error) {
      console.error("Error checking content script presence:", error);
      return false;
    }
  }

  /**
   * Parse JSON with basic error handling
   */
  safeJsonParse(jsonString) {
    if (typeof jsonString !== "string") {
      throw new Error("Input must be a string");
    }
    return JSON.parse(jsonString);
  }

  openAdvancedSettings() {
    try {
      if (browserAPI.runtime.openOptionsPage) {
        browserAPI.runtime.openOptionsPage();
      } else {
        browserAPI.tabs.create({
          url: browserAPI.runtime.getURL("options/options.html"),
        });
      }
    } catch (error) {
      console.error("Failed to open options page:", error);
      try {
        browserAPI.tabs.create({
          url: browserAPI.runtime.getURL("options/options.html"),
        });
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        this.showError(
          "Unable to open advanced settings. Please try right-clicking the extension icon and selecting 'Options'.",
        );
      }
    }
  }

  showSuccess(message) {
    this.showMessage(message, "success");
  }

  showError(message) {
    this.showMessage(message, "error");
  }

  showMessage(message, type) {
    const container = document.getElementById("message-container");
    const messageEl = document.createElement("div");
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;

    container.appendChild(messageEl);

    setTimeout(() => {
      if (container.contains(messageEl)) {
        container.removeChild(messageEl);
      }
    }, 5000);
  }

  hideLoading() {
    const loading = document.getElementById("loading");
    if (loading) {
      loading.style.display = "none";
    }
  }

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
  }

  /**
   * Retry failed save operation
   */
  async retrySave() {
    try {
      console.debug("Retrying save operation");

      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.showSaving();
      }

      // Force a settings reload and re-render to trigger save
      await this.loadSettings();
      this.renderSettings();

      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.showSaved();
      }

      this.showSuccess("Settings synchronized successfully");
    } catch (error) {
      console.error("Retry save failed:", error);

      if (this.saveStatusIndicator) {
        this.saveStatusIndicator.showError(error, "Retry failed");
      }

      this.showError(`Retry failed: ${error.message}`);
    }
  }

  /**
   * Dismiss save status indicator
   */
  dismissSaveStatus() {
    console.debug("Save status dismissed by user");
  }

  /**
   * Get save status indicator instance for external access
   * @returns {SaveStatusIndicator|null}
   */
  getSaveStatusIndicator() {
    return this.saveStatusIndicator;
  }

  /**
   * Update save status based on external events
   * @param {string} status - Status to set
   * @param {Object} options - Additional options
   */
  updateSaveStatus(status, options = {}) {
    if (this.saveStatusIndicator) {
      this.saveStatusIndicator.updateStatus(status, options);
    }
  }

  /**
   * Cleanup method for proper resource management
   */
  cleanup() {
    // Cleanup save status indicator
    if (this.saveStatusIndicator) {
      this.saveStatusIndicator.destroy();
      this.saveStatusIndicator = null;
    }

    if (this.currentSettings) {
      this.currentSettings.clear();
    }
  }
}

// Initialize the popup when the DOM is ready
(function () {
  "use strict";

  let settingsPopupInstance = null;

  function cleanup() {
    if (
      settingsPopupInstance &&
      typeof settingsPopupInstance.cleanup === "function"
    ) {
      settingsPopupInstance.cleanup();
    }
    settingsPopupInstance = null;
  }

  // Cleanup on page unload
  window.addEventListener("beforeunload", cleanup);

  document.addEventListener("DOMContentLoaded", () => {
    try {
      if (!settingsPopupInstance) {
        settingsPopupInstance = new SettingsPopup();
        // Expose for testing
        window.settingsPopupInstance = settingsPopupInstance;
      }
    } catch (error) {
      console.error("Error creating SettingsPopup instance:", error);
    }
  });
})();
