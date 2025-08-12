/**
 * Popup Settings UI Integration Example
 *
 * Complete working example showing how to create a simple settings UI
 * in a popup for your extension.
 *
 * This example demonstrates:
 * - Getting and updating settings through the background script
 * - Real-time UI updates and validation
 * - Based on actual popup.js patterns
 * - Simple, reusable popup settings interface
 *
 * Use this code in your popup.js to add settings management to your popup.
 */

/**
 * Simple Settings Popup Class
 * Handles basic settings display and modification
 */
class SimpleSettingsPopup {
  constructor() {
    this.settings = new Map();
    this.isInitialized = false;

    this.initialize();
  }

  /**
   * Initialize popup and load settings
   */
  async initialize() {
    try {
      await this.loadSettings();
      this.renderSettings();
      this.setupEventHandlers();
      this.isInitialized = true;
      console.log("Settings popup initialized");
    } catch (error) {
      console.error("Failed to initialize settings popup:", error);
      this.showError("Failed to load settings. Please try again.");
    }
  }

  /**
   * Load all settings from background script
   */
  async loadSettings() {
    try {
      const response = await browserAPI.runtime.sendMessage({
        type: "GET_ALL_SETTINGS",
      });

      if (!response) {
        throw new Error("No response from background script");
      }

      if (response.error) {
        throw new Error(response.error);
      }

      this.settings = new Map(Object.entries(response.settings));
      console.log("Loaded settings:", this.settings);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Render settings in the popup
   */
  renderSettings() {
    const container =
      document.getElementById("settings-list") ||
      this.createSettingsContainer();
    container.innerHTML = "";

    // Define which settings to show in popup (customize as needed)
    const displaySettings = [
      "feature_enabled",
      "refresh_interval",
      "api_endpoint",
      "user_preferences",
    ];

    displaySettings.forEach((key) => {
      if (this.settings.has(key)) {
        const setting = this.settings.get(key);
        const element = this.createSettingElement(key, setting);
        container.appendChild(element);
      }
    });
  }

  /**
   * Create settings container if it doesn't exist
   */
  createSettingsContainer() {
    let container = document.getElementById("settings-list");
    if (!container) {
      container = document.createElement("div");
      container.id = "settings-list";
      container.className = "settings-container";
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Create individual setting element
   */
  createSettingElement(key, setting) {
    const wrapper = document.createElement("div");
    wrapper.className = "setting-item";
    wrapper.setAttribute("data-key", key);

    const label = document.createElement("label");
    label.textContent = setting.description;
    label.className = "setting-label";

    const input = this.createInputElement(key, setting);
    const status = document.createElement("span");
    status.className = "setting-status";

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    wrapper.appendChild(status);

    return wrapper;
  }

  /**
   * Create appropriate input element based on setting type
   */
  createInputElement(key, setting) {
    let input;

    switch (setting.type) {
      case "boolean":
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = setting.value;
        input.addEventListener("change", () =>
          this.updateSetting(key, input.checked),
        );
        break;

      case "text":
        input = document.createElement("input");
        input.type = "text";
        input.value = setting.value;
        input.placeholder = `Enter ${setting.description.toLowerCase()}`;
        input.addEventListener("blur", () =>
          this.updateSetting(key, input.value),
        );
        break;

      case "number":
        input = document.createElement("input");
        input.type = "number";
        input.value = setting.value;
        input.min = setting.min;
        input.max = setting.max;
        input.addEventListener("blur", () => {
          const value = parseFloat(input.value);
          if (!isNaN(value)) {
            this.updateSetting(key, value);
          }
        });
        break;

      case "json":
        input = document.createElement("textarea");
        input.value = JSON.stringify(setting.value, null, 2);
        input.rows = 3;
        input.addEventListener("blur", () => {
          try {
            const value = JSON.parse(input.value);
            this.updateSetting(key, value);
          } catch (error) {
            this.showError("Invalid JSON format");
            input.focus();
          }
        });
        break;

      default:
        input = document.createElement("input");
        input.type = "text";
        input.value = setting.value;
        input.addEventListener("blur", () =>
          this.updateSetting(key, input.value),
        );
        break;
    }

    input.className = "setting-input";
    input.id = `setting-${key}`;
    return input;
  }

  /**
   * Update setting value
   */
  async updateSetting(key, value) {
    try {
      this.setSettingStatus(key, "updating");

      const response = await browserAPI.runtime.sendMessage({
        type: "UPDATE_SETTING",
        key: key,
        value: value,
      });

      if (!response) {
        throw new Error("No response from background script");
      }

      if (response.error) {
        throw new Error(response.error);
      }

      // Update local cache
      const setting = this.settings.get(key);
      setting.value = value;
      this.settings.set(key, setting);

      this.setSettingStatus(key, "success");
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
      this.setSettingStatus(key, "error");
      this.showError(`Failed to update ${key}: ${error.message}`);
    }
  }

  /**
   * Set visual status for setting update
   */
  setSettingStatus(key, status) {
    const element = document.querySelector(
      `[data-key="${key}"] .setting-status`,
    );
    if (element) {
      element.className = `setting-status ${status}`;
      element.textContent =
        status === "updating"
          ? "..."
          : status === "success"
            ? "✓"
            : status === "error"
              ? "✗"
              : "";

      if (status === "success") {
        setTimeout(() => {
          element.textContent = "";
          element.className = "setting-status";
        }, 2000);
      }
    }
  }

  /**
   * Export settings to JSON file
   */
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
      a.download = `settings-${new Date().toISOString().split("T")[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);
      this.showSuccess("Settings exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      this.showError(`Export failed: ${error.message}`);
    }
  }

  /**
   * Import settings from JSON file
   */
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
        this.renderSettings();
        this.showSuccess("Settings imported successfully");
      } catch (error) {
        console.error("Import failed:", error);
        this.showError(`Import failed: ${error.message}`);
      }
    });

    input.click();
  }

  /**
   * Reset all settings to defaults
   */
  async resetToDefaults() {
    if (!confirm("Reset all settings to defaults? This cannot be undone.")) {
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
      this.renderSettings();
      this.showSuccess("Settings reset to defaults");
    } catch (error) {
      console.error("Reset failed:", error);
      this.showError(`Reset failed: ${error.message}`);
    }
  }

  /**
   * Setup event handlers for action buttons
   */
  setupEventHandlers() {
    // Create action buttons if they don't exist
    this.createActionButtons();

    document
      .getElementById("export-settings")
      ?.addEventListener("click", () => this.exportSettings());
    document
      .getElementById("import-settings")
      ?.addEventListener("click", () => this.importSettings());
    document
      .getElementById("reset-settings")
      ?.addEventListener("click", () => this.resetToDefaults());
  }

  /**
   * Create action buttons if they don't exist
   */
  createActionButtons() {
    if (!document.getElementById("settings-actions")) {
      const actions = document.createElement("div");
      actions.id = "settings-actions";
      actions.className = "settings-actions";
      actions.innerHTML = `
        <button id="export-settings" class="action-button">Export</button>
        <button id="import-settings" class="action-button">Import</button>
        <button id="reset-settings" class="action-button">Reset</button>
      `;
      document.body.appendChild(actions);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showMessage(message, "success");
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showMessage(message, "error");
  }

  /**
   * Show message with styling
   */
  showMessage(message, type) {
    // Remove existing messages
    document.querySelectorAll(".popup-message").forEach((el) => el.remove());

    const messageEl = document.createElement("div");
    messageEl.className = `popup-message ${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      ${
        type === "success"
          ? "background: #4CAF50; color: white;"
          : "background: #f44336; color: white;"
      }
    `;

    document.body.appendChild(messageEl);

    setTimeout(() => {
      if (document.body.contains(messageEl)) {
        document.body.removeChild(messageEl);
      }
    }, 3000);
  }
}

/**
 * Minimal HTML Setup
 * Add this to your popup.html:
 */
const POPUP_HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 300px;
      padding: 10px;
      font-family: Arial, sans-serif;
      font-size: 14px;
    }
    .setting-item {
      margin-bottom: 15px;
      padding: 5px 0;
      border-bottom: 1px solid #eee;
    }
    .setting-label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .setting-input {
      width: 100%;
      padding: 4px;
      border: 1px solid #ccc;
      border-radius: 3px;
    }
    .setting-status {
      float: right;
      font-size: 12px;
    }
    .settings-actions {
      margin-top: 15px;
      text-align: center;
    }
    .action-button {
      margin: 0 5px;
      padding: 5px 10px;
      border: 1px solid #ccc;
      border-radius: 3px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h3>Extension Settings</h3>
  <div id="settings-list"></div>
  <div id="settings-actions"></div>
  
  <script src="../lib/browser-compat.js"></script>
  <script src="popup.js"></script>
</body>
</html>
`;

// Initialize popup when DOM is ready
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    new SimpleSettingsPopup();
  });
}

/**
 * USAGE INSTRUCTIONS:
 *
 * 1. Copy this code to your popup.js file
 * 2. Create popup.html using the template above or add elements to existing popup:
 *    - <div id="settings-list"></div>
 *    - <div id="settings-actions"></div>
 * 3. Include browser-compat.js: <script src="../lib/browser-compat.js"></script>
 * 4. Update manifest.json:
 *    {
 *      "action": {
 *        "default_popup": "popup/popup.html"
 *      }
 *    }
 * 5. Ensure background script is integrated (see background-integration.js)
 *
 * The popup will:
 * - Display settings with appropriate input types
 * - Update settings in real-time as users interact
 * - Provide export/import/reset functionality
 * - Handle validation and error display
 * - Work with any setting types defined in your defaults.json
 *
 * Customize the displaySettings array to show only relevant settings in popup.
 */
