// Options page JavaScript for Settings Extension
class SettingsOptions {
  constructor() {
    this.currentSettings = new Map();
    this.pendingChanges = new Map();
    this.validationErrors = new Map();
    this.isInitialized = false;
    this.currentTab = "general";
    this.configLoader = null;
    this.categories = [];

    this.setupEventListeners();
    this.initialize();
  }

  async initialize() {
    try {
      console.log("Initializing options page...");

      // Initialize configuration loader first
      this.configLoader = new ConfigurationLoader();
      await this.configLoader.loadConfiguration();
      this.categories = this.configLoader.getCategories();
      console.log("Loaded categories:", this.categories);

      // First test if background script is responding at all
      await this.testBackgroundConnection();

      await this.loadSettings();
      this.renderAllSettings();
      this.showTab(this.currentTab);
      this.hideLoading();
      this.isInitialized = true;
      console.log("Options page initialized successfully");
    } catch (error) {
      // Standardized error handling for options page initialization
      if (typeof ErrorHandler !== "undefined") {
        ErrorHandler.handle(
          error,
          {
            isInitialized: this.isInitialized,
            categoriesLoaded: this.categories?.length || 0,
          },
          {
            component: "Options",
            operation: "Initialize",
            severity: "critical",
            showUser: true,
            rethrow: false,
            fallbackAction: () => {
              this.showError(
                "Failed to load settings. Please refresh the page.",
              );
              this.hideLoading();
            },
          },
        );
      } else {
        console.error("Failed to initialize options:", error);
        this.showError("Failed to load settings. Please refresh the page.");
        this.hideLoading();
      }
    }
  }

  async testBackgroundConnection() {
    try {
      console.log("Testing background script connection...");

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Background script ping timeout"));
        }, 5000);

        browserAPI.runtime
          .sendMessage({ type: "PING" })
          .then((response) => {
            clearTimeout(timeout);
            resolve(response);
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      });

      console.log("Background script ping response:", response);
    } catch (error) {
      // Standardized error handling for background connection test
      if (typeof ErrorHandler !== "undefined") {
        ErrorHandler.handle(
          error,
          {
            connectionTest: true,
          },
          {
            component: "Options",
            operation: "Background Connection Test",
            severity: "critical",
            showUser: false,
            rethrow: true,
          },
        );
      } else {
        console.error("Background script connection test failed:", error);
        throw new Error(
          "Background script is not responding. Please reload the extension.",
        );
      }
    }
  }

  async loadSettings() {
    try {
      console.log("Sending GET_ALL_SETTINGS message to background script...");

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Message timeout after 10 seconds"));
        }, 10000);

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

      console.log("Received response from background script:", response);

      if (!response) {
        throw new Error("No response from background script");
      }

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.settings) {
        throw new Error("Invalid response format - missing settings");
      }

      this.currentSettings = new Map(Object.entries(response.settings));
      console.log("Loaded settings:", this.currentSettings);
    } catch (error) {
      // Standardized error handling for settings loading
      if (typeof ErrorHandler !== "undefined") {
        ErrorHandler.handle(
          error,
          {}, // No specific context needed
          {
            component: "Options",
            operation: "Load Settings",
            severity: "error",
            showUser: false,
            rethrow: true,
          },
        );
      } else {
        console.error("Error in loadSettings:", error);
        throw error;
      }
    }
  }

  renderAllSettings() {
    if (!this.configLoader || this.categories.length === 0) {
      console.error(
        "ConfigurationLoader not initialized or no categories found",
      );
      return;
    }

    for (const category of this.categories) {
      const categorySettings = this.configLoader.getCategorySettings(category);
      this.renderCategorySettings(category, categorySettings);
    }
  }

  renderCategorySettings(category, categorySettings) {
    const container = document.getElementById(`${category}-settings`);
    if (!container) {
      console.warn(`Container not found for category: ${category}`);
      return;
    }

    container.innerHTML = "";

    categorySettings.forEach(([key, _configSetting]) => {
      if (this.currentSettings.has(key)) {
        const setting = this.currentSettings.get(key);
        const settingElement = this.createAdvancedSettingElement(key, setting);
        container.appendChild(settingElement);
      }
    });
  }

  createAdvancedSettingElement(key, setting) {
    const wrapper = document.createElement("div");
    wrapper.className = "setting-item";
    wrapper.setAttribute("data-key", key);

    const header = document.createElement("div");
    header.className = "setting-header";

    const info = document.createElement("div");
    info.className = "setting-info";

    const label = document.createElement("div");
    label.className = "setting-label";
    label.textContent = this.getSettingDisplayName(key);

    const description = document.createElement("div");
    description.className = "setting-description";
    description.textContent = setting.description;

    info.appendChild(label);
    info.appendChild(description);
    header.appendChild(info);

    const inputContainer = document.createElement("div");
    inputContainer.className = "setting-input-container";

    const input = this.createAdvancedInputElement(key, setting);
    const errorMessage = document.createElement("div");
    errorMessage.className = "error-message";

    inputContainer.appendChild(input);
    inputContainer.appendChild(errorMessage);

    wrapper.appendChild(header);
    wrapper.appendChild(inputContainer);

    return wrapper;
  }

  createAdvancedInputElement(key, setting) {
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
        input.rows = 6;
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
        input.addEventListener("blur", () => this.validateSetting(key, input));
        break;

      case "json":
        input = document.createElement("textarea");
        input.value = JSON.stringify(setting.value, null, 2);
        input.className = "json-input";
        input.rows = 8;
        input.addEventListener("input", () =>
          this.handleSettingChange(key, input),
        );
        input.addEventListener("blur", () => this.validateSetting(key, input));
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
    input.id = `setting-${key}`;
    return input;
  }

  getSettingDisplayName(key) {
    if (!this.configLoader) {
      console.error("ConfigurationLoader not available for getDisplayName");
      return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }

    return this.configLoader.getDisplayName(key);
  }

  handleSettingChange(key, input) {
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
          value = JSON.parse(value);
        } catch {
          throw new Error("Invalid JSON format");
        }
      }

      // Validate the value
      this.validateValue(setting, value);

      // Store as pending change
      this.pendingChanges.set(key, value);
      this.updateSaveButton();

      // Clear any validation errors
      this.clearValidationError(key);
    } catch (error) {
      this.setValidationError(key, error.message);
      this.pendingChanges.delete(key);
      this.updateSaveButton();
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
          value = JSON.parse(value);
        } catch {
          throw new Error("Invalid JSON format");
        }
      } else if (setting.type === "enum") {
        // Enum validation - ensure value exists in options
        if (setting.options && !setting.options[value]) {
          throw new Error("Invalid enum value");
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

  async saveAllChanges() {
    if (this.pendingChanges.size === 0) {
      this.showWarning("No changes to save");
      return;
    }

    try {
      const updates = Object.fromEntries(this.pendingChanges);

      const response = await browserAPI.runtime.sendMessage({
        type: "UPDATE_SETTINGS",
        updates: updates,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Update local cache
      for (const [key, value] of this.pendingChanges) {
        const setting = this.currentSettings.get(key);
        setting.value = value;
        this.currentSettings.set(key, setting);
      }

      this.pendingChanges.clear();
      this.updateSaveButton();
      this.showSuccess(
        `Successfully saved ${Object.keys(updates).length} setting(s)`,
      );
    } catch (error) {
      // Standardized error handling for settings save
      if (typeof ErrorHandler !== "undefined") {
        ErrorHandler.handle(
          error,
          {
            pendingChanges: this.pendingChanges.size,
          },
          {
            component: "Options",
            operation: "Save Settings",
            severity: "error",
            showUser: true,
            rethrow: false,
            fallbackAction: () => {
              this.showError(`Save failed: ${error.message}`);
            },
          },
        );
      } else {
        console.error("Save failed:", error);
        this.showError(`Save failed: ${error.message}`);
      }
    }
  }

  updateSaveButton() {
    const saveButton = document.getElementById("save-all-btn");
    const hasChanges =
      this.pendingChanges.size > 0 && this.validationErrors.size === 0;

    saveButton.disabled = !hasChanges;

    if (hasChanges) {
      saveButton.textContent = `Save ${this.pendingChanges.size} Change(s)`;
    } else {
      saveButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16">
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
                </svg>
                Save All Changes
            `;
    }
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

    this.updateSaveButton();
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

    this.updateSaveButton();
  }

  showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach((tab) => {
      tab.style.display = "none";
    });

    // Remove active class from all nav links
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });

    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
      selectedTab.style.display = "block";
    }

    // Add active class to selected nav link
    const selectedNavLink = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedNavLink) {
      selectedNavLink.classList.add("active");
    }

    this.currentTab = tabName;
  }

  async exportSettings() {
    try {
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
      a.download = `settings-extension-${new Date().toISOString().split("T")[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);
      this.showSuccess("Settings exported successfully");
    } catch (error) {
      // Standardized error handling for settings export
      if (typeof ErrorHandler !== "undefined") {
        ErrorHandler.handle(
          error,
          {
            operation: "export",
          },
          {
            component: "Options",
            operation: "Export Settings",
            severity: "error",
            showUser: true,
            rethrow: false,
            fallbackAction: () => {
              this.showError(`Export failed: ${error.message}`);
            },
          },
        );
      } else {
        console.error("Export failed:", error);
        this.showError(`Export failed: ${error.message}`);
      }
    }
  }

  async importSettings() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const content = await file.text();

        const response = await browserAPI.runtime.sendMessage({
          type: "IMPORT_SETTINGS",
          data: content,
        });

        if (response.error) {
          throw new Error(response.error);
        }

        await this.loadSettings();
        this.renderAllSettings();
        this.pendingChanges.clear();
        this.updateSaveButton();
        this.showSuccess("Settings imported successfully");
      } catch (error) {
        // Standardized error handling for settings import
        if (typeof ErrorHandler !== "undefined") {
          ErrorHandler.handle(
            error,
            {
              fileName: file?.name,
              fileSize: file?.size,
            },
            {
              component: "Options",
              operation: "Import Settings",
              severity: "error",
              showUser: true,
              rethrow: false,
              fallbackAction: () => {
                this.showError(`Import failed: ${error.message}`);
              },
            },
          );
        } else {
          console.error("Import failed:", error);
          this.showError(`Import failed: ${error.message}`);
        }
      }
    });

    input.click();
  }

  async resetToDefaults() {
    if (
      !confirm(
        "Are you sure you want to reset all settings to defaults? This will discard any unsaved changes and cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await browserAPI.runtime.sendMessage({
        type: "RESET_SETTINGS",
      });

      if (response.error) {
        throw new Error(response.error);
      }

      await this.loadSettings();
      this.renderAllSettings();
      this.pendingChanges.clear();
      this.updateSaveButton();
      this.showSuccess("Settings reset to defaults");
    } catch (error) {
      // Standardized error handling for settings reset
      if (typeof ErrorHandler !== "undefined") {
        ErrorHandler.handle(
          error,
          {
            operation: "reset",
            pendingChanges: this.pendingChanges.size,
          },
          {
            component: "Options",
            operation: "Reset Settings",
            severity: "error",
            showUser: true,
            rethrow: false,
            fallbackAction: () => {
              this.showError(`Reset failed: ${error.message}`);
            },
          },
        );
      } else {
        console.error("Reset failed:", error);
        this.showError(`Reset failed: ${error.message}`);
      }
    }
  }

  showSuccess(message) {
    this.showMessage(message, "success");
  }

  showError(message) {
    this.showMessage(message, "error");
  }

  showWarning(message) {
    this.showMessage(message, "warning");
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
    }, 7000);
  }

  hideLoading() {
    const loading = document.getElementById("loading");
    if (loading) {
      loading.style.display = "none";
    }
  }

  setupEventListeners() {
    // Navigation links
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const tabName = link.dataset.tab;
        if (tabName) {
          this.showTab(tabName);
        }
      });
    });

    // Action buttons
    document
      .getElementById("save-all-btn")
      .addEventListener("click", () => this.saveAllChanges());
    document
      .getElementById("export-btn")
      .addEventListener("click", () => this.exportSettings());
    document
      .getElementById("import-btn")
      .addEventListener("click", () => this.importSettings());
    document
      .getElementById("reset-btn")
      .addEventListener("click", () => this.resetToDefaults());

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault();
            this.saveAllChanges();
            break;
          case "e":
            e.preventDefault();
            this.exportSettings();
            break;
        }
      }
    });
  }
}

// Initialize the options page when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new SettingsOptions();
});
