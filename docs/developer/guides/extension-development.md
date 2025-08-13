# Extension Development Guide

## Executive Summary

Practical guide for developing browser extensions with focus on Manifest V3, cross-browser compatibility, and modern web extension APIs. Covers architecture patterns, best practices, and common pitfalls specific to the Settings Extension project.

## Scope

- **Applies to**: Chrome, Firefox, and Edge browser extensions
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Extension Architecture Overview

### Core Components

```
Extension Architecture
├── Background Script (Service Worker)
│   ├── Event handling
│   ├── API coordination
│   ├── Storage management
│   └── Cross-component communication
├── Content Scripts
│   ├── DOM manipulation
│   ├── Page interaction
│   └── Data extraction
├── Popup UI
│   ├── Quick settings
│   ├── Status display
│   └── User interactions
└── Options Page
    ├── Advanced configuration
    ├── Import/export
    └── Profile management
```

### Communication Flow

```javascript
// Message flow diagram
Popup ←→ Background Script ←→ Content Script
  ↓           ↓                    ↓
Options    Storage             Web Page
```

## Manifest V3 Development

### Manifest Structure

```json
{
  "manifest_version": 3,
  "name": "Settings Extension",
  "version": "1.0.0",
  "description": "Comprehensive settings management",

  "background": {
    "service_worker": "background.js"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script.js"],
      "run_at": "document_idle"
    }
  ],

  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "Settings Extension",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },

  "options_page": "options/options.html",

  "permissions": ["storage", "activeTab", "contextMenus"],

  "host_permissions": ["https://*/*"]
}
```

### Service Worker Implementation

```javascript
// background.js
class BackgroundService {
  constructor() {
    this.init();
  }

  init() {
    // Service Worker lifecycle
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));
    chrome.runtime.onStartup.addListener(this.handleStartup.bind(this));

    // Message handling
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Context menu setup
    this.setupContextMenus();

    // Periodic tasks
    chrome.alarms.create("syncCheck", { periodInMinutes: 30 });
    chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
  }

  handleInstalled(details) {
    if (details.reason === "install") {
      // First-time setup
      this.initializeSettings();
      chrome.tabs.create({ url: "options/options.html" });
    } else if (details.reason === "update") {
      // Handle updates
      this.migrateSettings(details.previousVersion);
    }
  }

  handleMessage(message, sender, sendResponse) {
    const { type, data } = message;

    switch (type) {
      case "GET_SETTINGS":
        this.getSettings().then(sendResponse);
        return true; // Keep channel open for async response

      case "SAVE_SETTINGS":
        this.saveSettings(data).then(sendResponse);
        return true;

      case "SYNC_REQUEST":
        this.syncSettings().then(sendResponse);
        return true;

      default:
        console.warn("Unknown message type:", type);
        sendResponse({ error: "Unknown message type" });
    }
  }

  async getSettings() {
    try {
      const result = await chrome.storage.local.get(["settings"]);
      return { success: true, settings: result.settings || {} };
    } catch (error) {
      console.error("Failed to get settings:", error);
      return { success: false, error: error.message };
    }
  }

  async saveSettings(settings) {
    try {
      await chrome.storage.local.set({ settings });

      // Notify other components
      chrome.runtime.sendMessage({
        type: "SETTINGS_UPDATED",
        settings,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to save settings:", error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize service
new BackgroundService();
```

### Content Script Development

```javascript
// content-script.js
class ContentScriptManager {
  constructor() {
    this.settings = null;
    this.init();
  }

  async init() {
    // Wait for page to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setup());
    } else {
      this.setup();
    }
  }

  async setup() {
    try {
      // Get settings from background
      const response = await chrome.runtime.sendMessage({
        type: "GET_SETTINGS",
      });

      if (response.success) {
        this.settings = response.settings;
        this.applySettings();
      }

      // Listen for settings updates
      chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    } catch (error) {
      console.error("Content script setup failed:", error);
    }
  }

  handleMessage(message, sender, sendResponse) {
    if (message.type === "SETTINGS_UPDATED") {
      this.settings = message.settings;
      this.applySettings();
    }
  }

  applySettings() {
    if (!this.settings) return;

    // Apply theme settings
    if (this.settings.theme) {
      this.applyTheme(this.settings.theme);
    }

    // Auto-fill form fields
    if (this.settings.autoFill) {
      this.setupAutoFill();
    }

    // Custom CSS injections
    if (this.settings.customCSS) {
      this.injectCustomCSS(this.settings.customCSS);
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute("data-extension-theme", theme);
  }

  setupAutoFill() {
    const forms = document.querySelectorAll("form");
    forms.forEach((form) => {
      const inputs = form.querySelectorAll("input, select, textarea");
      inputs.forEach((input) => {
        const fieldName = input.name || input.id;
        if (fieldName && this.settings.formData[fieldName]) {
          input.value = this.settings.formData[fieldName];
        }
      });
    });
  }
}

// Avoid multiple injections
if (!window.settingsExtensionInjected) {
  window.settingsExtensionInjected = true;
  new ContentScriptManager();
}
```

## Cross-Browser Compatibility

### Browser Compatibility Layer

Our custom browser compatibility layer (`lib/browser-compat.js`) provides a unified API across Chrome and Firefox without external dependencies:

```javascript
// lib/browser-compat.js
// Custom cross-browser compatibility layer
// Replaces WebExtension Polyfill to avoid minified code issues

// Detect browser environment
const isChrome = typeof chrome !== "undefined" && chrome.runtime;
const isFirefox = typeof browser !== "undefined" && browser.runtime;
const isEdge = isChrome && navigator.userAgent.includes("Edg");

// Promise wrapper for Chrome callback APIs
function promisify(fn, context) {
  if (!fn || typeof fn !== "function") {
    return () => Promise.resolve();
  }

  return function (...args) {
    return new Promise((resolve, reject) => {
      try {
        fn.call(context, ...args, (result) => {
          if (
            typeof chrome !== "undefined" &&
            chrome.runtime &&
            chrome.runtime.lastError
          ) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  };
}

// Unified browser API object with automatic detection
const browserAPI = {
  storage: {
    local: {
      get: isChrome
        ? promisify(chrome.storage.local.get, chrome.storage.local)
        : browser.storage.local.get.bind(browser.storage.local),
      set: isChrome
        ? promisify(chrome.storage.local.set, chrome.storage.local)
        : browser.storage.local.set.bind(browser.storage.local),
      // ... other methods
    },
  },

  runtime: {
    sendMessage: isChrome
      ? promisify(chrome.runtime.sendMessage, chrome.runtime)
      : browser.runtime.sendMessage.bind(browser.runtime),
    // ... other methods
  },

  // Browser environment detection
  environment: {
    isChrome,
    isFirefox,
    isEdge,
  },

  // Utility functions
  utils: {
    safeSendMessage: async (message, tabId = null) => {
      try {
        if (tabId) {
          return await browserAPI.tabs.sendMessage(tabId, message);
        } else {
          return await browserAPI.runtime.sendMessage(message);
        }
      } catch (error) {
        console.warn("Message sending failed:", error);
        return { error: error.message };
      }
    },

    checkStorageQuota: async (storageArea = "local") => {
      // Implementation for storage quota monitoring
    },
  },
};
```

### Browser-Specific Handling

```javascript
// lib/browser-compatibility.js
class BrowserCompat {
  static getManifestVersion() {
    const manifest = chrome.runtime.getManifest();
    return manifest.manifest_version;
  }

  static async requestPermission(permission) {
    if (this.isManifestV3()) {
      // Manifest V3 approach
      return await chrome.permissions.request({
        permissions: [permission],
      });
    } else {
      // Manifest V2 fallback
      return await chrome.permissions.request({
        permissions: [permission],
      });
    }
  }

  static isManifestV3() {
    return this.getManifestVersion() === 3;
  }

  static async storageQuotaCheck() {
    try {
      // Chrome-specific API
      if (chrome.storage.local.getBytesInUse) {
        const used = await chrome.storage.local.getBytesInUse();
        const quota = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB
        return { used, quota, available: quota - used };
      }

      // Firefox fallback (no quota API)
      return { used: 0, quota: Infinity, available: Infinity };
    } catch (error) {
      console.warn("Storage quota check failed:", error);
      return null;
    }
  }
}
```

## Storage Management

### Structured Storage Pattern

```javascript
// lib/storage-manager.js
class StorageManager {
  constructor() {
    this.cache = new Map();
    this.listeners = new Set();
  }

  async get(key, defaultValue = null) {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      const result = await chrome.storage.local.get([key]);
      const value = result[key] !== undefined ? result[key] : defaultValue;

      // Cache the result
      this.cache.set(key, value);
      return value;
    } catch (error) {
      console.error(`Storage get failed for key ${key}:`, error);
      return defaultValue;
    }
  }

  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });

      // Update cache
      this.cache.set(key, value);

      // Notify listeners
      this.notifyListeners(key, value);

      return true;
    } catch (error) {
      console.error(`Storage set failed for key ${key}:`, error);

      // Handle quota exceeded
      if (error.message.includes("QUOTA_EXCEEDED")) {
        await this.cleanupOldData();
        throw new Error("Storage quota exceeded. Please free up space.");
      }

      return false;
    }
  }

  async remove(key) {
    try {
      await chrome.storage.local.remove([key]);
      this.cache.delete(key);
      this.notifyListeners(key, null);
      return true;
    } catch (error) {
      console.error(`Storage remove failed for key ${key}:`, error);
      return false;
    }
  }

  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(key, value) {
    this.listeners.forEach((callback) => {
      try {
        callback(key, value);
      } catch (error) {
        console.error("Storage listener error:", error);
      }
    });
  }

  async cleanupOldData() {
    // Remove old cached data or compress existing data
    const allData = await chrome.storage.local.get();
    const keys = Object.keys(allData);

    // Remove items older than 30 days
    for (const key of keys) {
      if (key.startsWith("cache_")) {
        const item = allData[key];
        if (item.timestamp < Date.now() - 30 * 24 * 60 * 60 * 1000) {
          await this.remove(key);
        }
      }
    }
  }
}

export default new StorageManager();
```

### Settings Schema Validation

```javascript
// lib/settings-validator.js
class SettingsValidator {
  constructor() {
    this.schema = {
      theme: { type: "string", enum: ["light", "dark", "auto"] },
      notifications: { type: "boolean" },
      autoSave: { type: "boolean" },
      syncInterval: { type: "number", min: 5, max: 3600 },
      customCSS: { type: "string", maxLength: 10000 },
      formData: { type: "object" },
      profiles: { type: "array" },
    };
  }

  validate(settings) {
    const errors = [];

    for (const [key, value] of Object.entries(settings)) {
      const rule = this.schema[key];
      if (!rule) {
        errors.push(`Unknown setting: ${key}`);
        continue;
      }

      const error = this.validateValue(key, value, rule);
      if (error) {
        errors.push(error);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateValue(key, value, rule) {
    // Type checking
    if (rule.type === "string" && typeof value !== "string") {
      return `${key} must be a string`;
    }

    if (rule.type === "boolean" && typeof value !== "boolean") {
      return `${key} must be a boolean`;
    }

    if (rule.type === "number" && typeof value !== "number") {
      return `${key} must be a number`;
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      return `${key} must be one of: ${rule.enum.join(", ")}`;
    }

    // Range validation
    if (rule.type === "number") {
      if (rule.min !== undefined && value < rule.min) {
        return `${key} must be at least ${rule.min}`;
      }
      if (rule.max !== undefined && value > rule.max) {
        return `${key} must be at most ${rule.max}`;
      }
    }

    // String length validation
    if (
      rule.type === "string" &&
      rule.maxLength &&
      value.length > rule.maxLength
    ) {
      return `${key} must be no longer than ${rule.maxLength} characters`;
    }

    return null;
  }

  sanitize(settings) {
    const sanitized = {};

    for (const [key, value] of Object.entries(settings)) {
      if (this.schema[key]) {
        sanitized[key] = this.sanitizeValue(value, this.schema[key]);
      }
    }

    return sanitized;
  }

  sanitizeValue(value, rule) {
    if (rule.type === "string") {
      // Sanitize HTML and scripts
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<[^>]*>?/gm, "");
    }

    if (rule.type === "number") {
      const num = Number(value);
      if (rule.min !== undefined) return Math.max(num, rule.min);
      if (rule.max !== undefined) return Math.min(num, rule.max);
      return num;
    }

    return value;
  }
}

export default new SettingsValidator();
```

## UI Development Patterns

### Popup Implementation

```javascript
// popup/popup.js
class PopupManager {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    try {
      await this.loadSettings();
      this.renderUI();
      this.setupEventListeners();
    } catch (error) {
      console.error("Popup initialization failed:", error);
      this.showError("Failed to load extension");
    }
  }

  async loadSettings() {
    const response = await chrome.runtime.sendMessage({
      type: "GET_SETTINGS",
    });

    if (response.success) {
      this.settings = response.settings;
    } else {
      throw new Error(response.error);
    }
  }

  renderUI() {
    const container = document.getElementById("popup-container");

    container.innerHTML = `
      <div class="popup-header">
        <h2>Settings Extension</h2>
        <button id="options-btn" class="icon-button">⚙️</button>
      </div>
      
      <div class="quick-settings">
        ${this.renderQuickSettings()}
      </div>
      
      <div class="popup-actions">
        <button id="sync-btn" class="primary-btn">Sync Now</button>
      </div>
    `;
  }

  renderQuickSettings() {
    return `
      <div class="setting-item">
        <label>
          <input type="checkbox" id="notifications" 
                 ${this.settings.notifications ? "checked" : ""}>
          Enable Notifications
        </label>
      </div>
      
      <div class="setting-item">
        <label>Theme:</label>
        <select id="theme">
          <option value="light" ${this.settings.theme === "light" ? "selected" : ""}>Light</option>
          <option value="dark" ${this.settings.theme === "dark" ? "selected" : ""}>Dark</option>
          <option value="auto" ${this.settings.theme === "auto" ? "selected" : ""}>Auto</option>
        </select>
      </div>
      
      <div class="setting-item">
        <label>
          <input type="checkbox" id="autoSave" 
                 ${this.settings.autoSave ? "checked" : ""}>
          Auto-save Settings
        </label>
      </div>
    `;
  }

  setupEventListeners() {
    // Options button
    document.getElementById("options-btn").addEventListener("click", () => {
      chrome.tabs.create({ url: "options/options.html" });
      window.close();
    });

    // Sync button
    document
      .getElementById("sync-btn")
      .addEventListener("click", this.handleSync.bind(this));

    // Quick settings
    this.setupQuickSettingListeners();
  }

  setupQuickSettingListeners() {
    const inputs = document.querySelectorAll("input, select");

    inputs.forEach((input) => {
      input.addEventListener("change", async (e) => {
        const { id, type, checked, value } = e.target;
        const settingValue = type === "checkbox" ? checked : value;

        // Update local settings
        this.settings[id] = settingValue;

        // Save to background
        const response = await chrome.runtime.sendMessage({
          type: "SAVE_SETTINGS",
          data: this.settings,
        });

        if (!response.success) {
          console.error("Failed to save setting:", response.error);
          // Revert UI change
          if (type === "checkbox") {
            e.target.checked = !checked;
          } else {
            e.target.value = this.settings[id];
          }
        }
      });
    });
  }

  async handleSync() {
    const syncBtn = document.getElementById("sync-btn");
    syncBtn.disabled = true;
    syncBtn.textContent = "Syncing...";

    try {
      const response = await chrome.runtime.sendMessage({
        type: "SYNC_REQUEST",
      });

      if (response.success) {
        this.showMessage("Sync completed", "success");
        await this.loadSettings();
        this.renderUI();
        this.setupEventListeners();
      } else {
        this.showMessage("Sync failed: " + response.error, "error");
      }
    } catch (error) {
      this.showMessage("Sync error: " + error.message, "error");
    } finally {
      syncBtn.disabled = false;
      syncBtn.textContent = "Sync Now";
    }
  }

  showMessage(text, type = "info") {
    const message = document.createElement("div");
    message.className = `popup-message ${type}`;
    message.textContent = text;

    document.body.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 3000);
  }

  showError(error) {
    document.getElementById("popup-container").innerHTML = `
      <div class="error-state">
        <h3>Error</h3>
        <p>${error}</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new PopupManager();
});
```

### Options Page Structure

```javascript
// options/options.js
class OptionsManager {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.renderTabs();
    this.setupNavigation();
    this.setupEventListeners();
  }

  renderTabs() {
    const container = document.getElementById("options-container");

    container.innerHTML = `
      <nav class="options-nav">
        <button class="nav-tab active" data-tab="general">General</button>
        <button class="nav-tab" data-tab="appearance">Appearance</button>
        <button class="nav-tab" data-tab="sync">Sync & Backup</button>
        <button class="nav-tab" data-tab="advanced">Advanced</button>
      </nav>
      
      <main class="options-content">
        <div id="general-tab" class="tab-content active">
          ${this.renderGeneralTab()}
        </div>
        
        <div id="appearance-tab" class="tab-content">
          ${this.renderAppearanceTab()}
        </div>
        
        <div id="sync-tab" class="tab-content">
          ${this.renderSyncTab()}
        </div>
        
        <div id="advanced-tab" class="tab-content">
          ${this.renderAdvancedTab()}
        </div>
      </main>
    `;
  }

  setupNavigation() {
    const tabs = document.querySelectorAll(".nav-tab");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabId = tab.dataset.tab;

        // Update active states
        tabs.forEach((t) => t.classList.remove("active"));
        contents.forEach((c) => c.classList.remove("active"));

        tab.classList.add("active");
        document.getElementById(`${tabId}-tab`).classList.add("active");
      });
    });
  }
}
```

## Performance Optimization

### Lazy Loading

```javascript
// lib/lazy-loader.js
class LazyLoader {
  static async loadModule(modulePath) {
    try {
      const module = await import(modulePath);
      return module.default || module;
    } catch (error) {
      console.error(`Failed to load module ${modulePath}:`, error);
      throw error;
    }
  }

  static async loadComponent(componentId, loader) {
    const element = document.getElementById(componentId);
    if (!element || element.dataset.loaded) return;

    try {
      element.innerHTML = '<div class="loading">Loading...</div>';

      const component = await loader();
      element.innerHTML = "";

      if (typeof component.render === "function") {
        component.render(element);
      } else {
        element.appendChild(component);
      }

      element.dataset.loaded = "true";
    } catch (error) {
      element.innerHTML = `<div class="error">Failed to load: ${error.message}</div>`;
    }
  }
}
```

### Memory Management

```javascript
// lib/memory-manager.js
class MemoryManager {
  constructor() {
    this.listeners = new WeakMap();
    this.timers = new Set();
  }

  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);

    // Track for cleanup
    if (!this.listeners.has(element)) {
      this.listeners.set(element, []);
    }
    this.listeners.get(element).push({ event, handler });
  }

  addTimer(callback, interval) {
    const timerId = setInterval(callback, interval);
    this.timers.add(timerId);
    return timerId;
  }

  cleanup() {
    // Clear all timers
    this.timers.forEach((timerId) => clearInterval(timerId));
    this.timers.clear();

    // Event listeners are automatically cleaned up via WeakMap
    // when elements are garbage collected
  }

  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
      };
    }
    return null;
  }
}

export default new MemoryManager();
```

## Error Handling

### Global Error Handler

```javascript
// lib/error-handler.js
class ErrorHandler {
  constructor() {
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // Unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.handleError("Promise rejection", event.reason);
      event.preventDefault(); // Prevent console logging
    });

    // JavaScript errors
    window.addEventListener("error", (event) => {
      this.handleError("JavaScript error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });
  }

  handleError(type, error) {
    const errorData = {
      type,
      message: error.message || error.toString(),
      stack: error.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log locally
    console.error(`[${type}]`, errorData);

    // Store for analysis
    this.storeError(errorData);

    // Show user-friendly message if critical
    if (this.isCriticalError(error)) {
      this.showUserError(
        "Something went wrong. Please try refreshing the page.",
      );
    }
  }

  async storeError(errorData) {
    try {
      const existing = await chrome.storage.local.get(["errorLogs"]);
      const logs = existing.errorLogs || [];

      logs.push(errorData);

      // Keep only last 50 errors
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }

      await chrome.storage.local.set({ errorLogs: logs });
    } catch (storageError) {
      console.error("Failed to store error log:", storageError);
    }
  }

  isCriticalError(error) {
    const criticalMessages = [
      "Extension context invalidated",
      "Storage quota exceeded",
      "Network request failed",
    ];

    const message = error.message || error.toString();
    return criticalMessages.some((critical) => message.includes(critical));
  }

  showUserError(message) {
    // Create error notification
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-notification";
    errorDiv.innerHTML = `
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message">${message}</span>
        <button class="error-close">&times;</button>
      </div>
    `;

    document.body.appendChild(errorDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);

    // Manual close
    errorDiv.querySelector(".error-close").addEventListener("click", () => {
      errorDiv.remove();
    });
  }
}

// Initialize global error handling
new ErrorHandler();
```

## Best Practices

### 1. Code Organization

```javascript
// Use modules and clear separation of concerns
src/
├── background/
│   ├── service-worker.js      # Main service worker
│   ├── message-handler.js     # Message routing
│   └── storage-sync.js        # Storage operations
├── content/
│   ├── content-script.js      # Main content script
│   ├── dom-manager.js         # DOM manipulation
│   └── form-handler.js        # Form interactions
├── popup/
│   ├── popup.js               # Popup controller
│   ├── ui-components.js       # Reusable UI components
│   └── popup.css              # Styles
└── lib/
    ├── extension-api.js       # Cross-browser API wrapper
    ├── storage-manager.js     # Storage abstraction
    └── utils.js               # Utility functions
```

### 2. Security Best Practices

```javascript
// Validate all inputs
function sanitizeInput(input) {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/[<>]/g, '');
}

// Use Content Security Policy
// In manifest.json:
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}

// Validate origins for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.origin !== 'https://trusted-domain.com') {
    sendResponse({ error: 'Unauthorized origin' });
    return;
  }
  // Process message
});
```

### 3. Performance Guidelines

- **Minimize background script activity**
- **Use event pages instead of persistent background**
- **Implement lazy loading for UI components**
- **Cache frequently accessed data**
- **Optimize content script injection**

### 4. Testing Integration

```javascript
// Make components testable
class TestableComponent {
  constructor(dependencies = {}) {
    this.storage = dependencies.storage || chrome.storage.local;
    this.messaging = dependencies.messaging || chrome.runtime;
  }

  // Methods use injected dependencies
  async saveData(data) {
    return await this.storage.set({ data });
  }
}

// Easy to test with mocks
const component = new TestableComponent({
  storage: mockStorage,
  messaging: mockMessaging,
});
```

## Common Pitfalls

### 1. Service Worker Lifecycle

```javascript
// ❌ Bad: Assuming background script runs continuously
let globalState = {};

// ✅ Good: Store state persistently
async function getState() {
  const result = await chrome.storage.local.get(["state"]);
  return result.state || {};
}
```

### 2. Content Script Context

```javascript
// ❌ Bad: Conflicting with page scripts
window.myExtensionData = data;

// ✅ Good: Use isolated scope
(function () {
  const extensionData = data;
  // Extension logic here
})();
```

### 3. Message Passing Errors

```javascript
// ❌ Bad: Not handling async responses
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  asyncOperation().then(sendResponse);
  // Missing return true
});

// ✅ Good: Return true for async responses
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  asyncOperation().then(sendResponse);
  return true; // Keep channel open
});
```

## Related Documentation

### Architecture Implementation

Understanding the system design enhances development:

- **[Building Blocks View](../../architecture/05-building-blocks.md)** - Component structure this guide implements
- **[Architecture Decisions](../../architecture/09-architecture-decisions/)** - Technical decisions behind these patterns
- **[Quality Requirements](../../architecture/10-quality-requirements.md)** - Performance and reliability targets to meet
- **[Crosscutting Concepts](../../architecture/08-crosscutting-concepts.md)** - System-wide patterns and concepts

### Development Workflows

Essential processes for extension development:

- **[Local Setup Guide](../workflows/local-setup.md)** - Development environment setup
- **[Testing Guide](../workflows/testing-guide.md)** - Testing procedures and requirements
- **[Debugging Guide](../workflows/debugging-guide.md)** - Debugging techniques for extensions
- **[Performance Profiling](performance-profiling.md)** - Extension performance optimization

### User Context

Understanding user needs improves development decisions:

- **[Settings Types Reference](../../user/reference/settings-types.md)** - User-facing API this guide implements
- **[Core Concepts](../../user/explanation/concepts.md)** - User mental models for the system
- **[Security & Privacy](../../user/explanation/security.md)** - User security expectations and requirements

### Team Standards

- **[Coding Standards](../conventions/coding-standards.md)** - Code quality requirements for extension development
- **[Code Review Guide](code-review.md)** - Review criteria for extension code
- **[Git Workflow](../conventions/git-workflow.md)** - Version control practices

### External Resources

- **[Chrome Extension Development Guide](https://developer.chrome.com/docs/extensions/)** - Official Chrome documentation
- **[Firefox WebExtension API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)** - Mozilla WebExtensions reference
- **[Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/migrating/)** - Migration from Manifest V2
- **[Chrome Extension Architecture](https://developer.chrome.com/docs/extensions/mv3/architecture-overview/)** - Architecture overview

## References

- [Chrome Extension Development Guide](https://developer.chrome.com/docs/extensions/)
- [Firefox WebExtension API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/migrating/)
- [Chrome Extension Architecture](https://developer.chrome.com/docs/extensions/mv3/architecture-overview/)
- [WebExtensions API Compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Browser_support_for_JavaScript_APIs)

## Revision History

| Date       | Author         | Changes                             |
| ---------- | -------------- | ----------------------------------- |
| 2025-08-11 | Developer Team | Initial extension development guide |
