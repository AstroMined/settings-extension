# Settings Extension Integration Guide

This guide shows developers how to add robust, production-ready settings management to their existing browser extensions using the sophisticated Manifest V3 architecture.

## Executive Summary

This Settings Extension framework provides a **production-ready, drop-in solution** for browser extension settings management with advanced features like:

- ✅ **Manifest V3 Service Worker Architecture** - Proper async/sync message handling patterns
- ✅ **Advanced Error Handling** - Retry logic, fallback mechanisms, and graceful degradation
- ✅ **Cross-Browser Compatibility** - Custom compatibility layer (no WebExtension Polyfill needed)
- ✅ **Real-time Synchronization** - Broadcasting changes to all content scripts
- ✅ **Intelligent Caching** - Performance optimization with smart cache invalidation
- ✅ **Schema Validation** - Type-safe settings with comprehensive validation
- ✅ **Keep-Alive Management** - Prevents service worker termination issues

## Critical MV3 Implementation Notes

### ⚠️ NEVER Use `async function handleMessage()`

**This is the #1 cause of "message port closed" errors in MV3:**

```javascript
// ❌ WRONG - Causes "message port closed before response received"
async function handleMessage(message, sender, sendResponse) {
  const result = await someAsyncOperation();
  sendResponse(result);
  return true; // Actually returns Promise.resolve(true)
}
```

**✅ CORRECT - Separate sync and async handling:**

```javascript
// ✅ Split sync and async handling (from actual background.js)
function handleMessage(message, sender, sendResponse) {
  // Handle sync messages immediately
  if (message.type === "PING") {
    sendResponse({ pong: true, timestamp: Date.now() });
    return false; // Don't keep port open for sync
  }

  // Delegate async operations
  processAsyncMessage(message, sender, sendResponse);
  return true; // Keep port open for async response
}

async function processAsyncMessage(message, sender, sendResponse) {
  try {
    const result = await someAsyncOperation();
    sendResponse(result);
  } catch (error) {
    sendResponse({ error: error.message });
  }
}
```

## Quick Start (5 Minutes)

### 1. Copy Required Files

Copy these files from this extension to your extension folder:

```
your-extension/
├── lib/
│   ├── browser-compat.js      # Cross-browser compatibility (no polyfills)
│   ├── content-settings.js    # Content script API with caching & timeouts
│   └── settings-manager.js    # Core settings manager with validation
└── config/
    └── defaults.json          # Your default settings schema
```

### 2. Update Your Manifest

Add to your `manifest.json`:

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "alarms", "tabs"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": [
        "lib/browser-compat.js",
        "lib/content-settings.js",
        "your-content-script.js"
      ]
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["config/defaults.json"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### 3. Production-Ready Background Script

**Critical**: Use the actual patterns from the production `background.js`:

```javascript
// background.js - Production MV3 Service Worker Pattern

// STEP 1: Register event listeners at TOP LEVEL (MV3 requirement)
chrome.runtime.onMessage.addListener(handleMessage);
chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleStartup);
chrome.storage.onChanged.addListener(handleStorageChange);

// STEP 2: Keep-alive alarm to prevent service worker termination
chrome.alarms.create("keep-alive", { periodInMinutes: 0.42 }); // 25 seconds
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keep-alive") {
    chrome.runtime.getPlatformInfo(() => {
      console.debug("Service worker keep-alive ping");
    });
  }
});

// STEP 3: Import dependencies AFTER event listeners
importScripts("lib/browser-compat.js", "lib/settings-manager.js");

let settingsManager;

// STEP 4: Initialize immediately (no lazy loading)
initializeSettingsOnStartup();

async function initializeSettingsOnStartup() {
  try {
    console.log("Initializing settings manager on startup...");
    settingsManager = new SettingsManager();
    await settingsManager.initialize();
    console.log("Settings manager initialized successfully");
  } catch (error) {
    console.error("Failed to initialize settings manager:", error);
    // Fallback initialization
    try {
      settingsManager = new SettingsManager();
      await settingsManager.initializeWithEmbeddedDefaults();
      console.log("Settings manager initialized with fallback defaults");
    } catch (fallbackError) {
      console.error("Even fallback initialization failed:", fallbackError);
      settingsManager = null;
    }
  }
}

// STEP 5: Message handler with proper async/sync separation
function handleMessage(message, sender, sendResponse) {
  console.log("📨 RECEIVED MESSAGE:", {
    type: message?.type,
    sender: sender?.tab?.id || "popup/options",
    timestamp: new Date().toISOString(),
  });

  // Handle PING immediately (synchronous)
  if (message.type === "PING") {
    sendResponse({ pong: true, timestamp: Date.now() });
    return false; // Don't keep channel open for sync response
  }

  // Handle settings manager not available
  if (!settingsManager) {
    console.warn(
      "Settings manager not available, attempting re-initialization...",
    );
    initializeSettingsOnStartup()
      .then(() => {
        if (!settingsManager) {
          sendResponse({
            error:
              "Settings manager not available. Service worker may need restart.",
            fallback: true,
          });
          return;
        }
        processAsyncMessage(message, sender, sendResponse);
      })
      .catch((error) => {
        console.error("Failed to re-initialize settings manager:", error);
        sendResponse({
          error:
            "Settings manager not available. Service worker may need restart.",
          fallback: true,
        });
      });
    return true; // Keep channel open for async response
  }

  // Process message with initialized settings manager
  processAsyncMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async response
}

// STEP 6: Async message processing (separate function)
async function processAsyncMessage(message, sender, sendResponse) {
  try {
    console.log("🔄 Processing async message:", message.type);

    switch (message.type) {
      case "GET_SETTING":
        const setting = await settingsManager.getSetting(message.key);
        sendResponse({ value: setting });
        break;

      case "GET_ALL_SETTINGS":
        const allSettings = await settingsManager.getAllSettings();
        sendResponse({ settings: allSettings });
        break;

      case "UPDATE_SETTING":
        await settingsManager.updateSetting(message.key, message.value);
        sendResponse({ success: true });
        // Broadcast change to all content scripts
        await broadcastSettingsChange({ [message.key]: message.value }, sender);
        break;

      case "UPDATE_SETTINGS":
        await settingsManager.updateSettings(message.updates);
        sendResponse({ success: true });
        await broadcastSettingsChange(message.updates, sender);
        break;

      case "EXPORT_SETTINGS":
        const exportData = await settingsManager.exportSettings();
        sendResponse({ data: exportData });
        break;

      case "IMPORT_SETTINGS":
        await settingsManager.importSettings(message.data);
        sendResponse({ success: true });
        await broadcastSettingsImport(sender);
        break;

      case "RESET_SETTINGS":
        await settingsManager.resetToDefaults();
        sendResponse({ success: true });
        await broadcastSettingsReset(sender);
        break;

      default:
        sendResponse({ error: `Unknown message type: ${message.type}` });
    }
  } catch (error) {
    console.error("❌ Error processing async message:", error);
    sendResponse({ error: error.message });
  }
}

// STEP 7: Broadcasting changes to all content scripts
async function broadcastSettingsChange(changes, sender) {
  try {
    const tabs = await self.browserAPI.tabs.query({ status: "complete" });

    const validTabs = tabs.filter((tab) => {
      // Skip extension pages and invalid URLs
      if (
        !tab.url ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("chrome://")
      ) {
        return false;
      }
      // Skip the sender tab to avoid double updates
      if (sender && sender.tab && sender.tab.id === tab.id) {
        return false;
      }
      return true;
    });

    const broadcastPromises = validTabs.map(async (tab) => {
      try {
        await self.browserAPI.tabs.sendMessage(tab.id, {
          type: "SETTINGS_CHANGED",
          changes: changes,
        });
      } catch (error) {
        // Tab might not have content script injected - this is expected
        if (error.message.includes("Could not establish connection")) {
          return;
        }
        console.debug(
          `Failed to send message to tab ${tab.id}:`,
          error.message,
        );
      }
    });

    await Promise.allSettled(broadcastPromises);
  } catch (error) {
    console.error("Failed to broadcast settings change:", error);
  }
}

// Additional handlers
function handleInstalled(details) {
  console.log("Extension installed:", details.reason);
  if (details.reason === "install" || details.reason === "update") {
    initializeSettingsOnStartup();
  }
}

function handleStartup() {
  console.log("Extension starting up");
  initializeSettingsOnStartup();
}

function handleStorageChange(changes, areaName) {
  console.log("Storage changed:", areaName, changes);
  // Debounced reinitializations to prevent thrashing
  if (areaName === "local" || areaName === "sync") {
    if (handleStorageChange.timeout) {
      clearTimeout(handleStorageChange.timeout);
    }
    handleStorageChange.timeout = setTimeout(async () => {
      try {
        if (settingsManager) {
          await settingsManager.initialize();
          console.log("Settings reloaded due to storage change");
        }
      } catch (error) {
        console.error("Failed to reload settings after storage change:", error);
      }
    }, 1000);
  }
}
```

### 4. Production Content Script Usage

Use the sophisticated API with proper error handling:

```javascript
// content-script.js - Production Content Script Pattern
class ExtensionContentScript {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.settings.setMessageTimeout(8000); // Increased timeout for reliability
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Test connection first (with retry logic built into API)
      await this.testConnection();

      // Load initial configuration
      const config = await this.settings.getSettings([
        "feature_enabled",
        "api_endpoint",
        "refresh_interval",
        "advanced_config",
      ]);

      if (config.feature_enabled?.value) {
        await this.enableMainFeature(config);
      }

      // Setup real-time change listeners
      this.settings.addChangeListener((event, data) => {
        this.handleSettingsChange(event, data);
      });

      this.isInitialized = true;
      console.log("✅ Extension content script initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize extension:", error);
      // Implement fallback behavior
      this.initializeFallbackMode();
    }
  }

  async testConnection() {
    // The ContentScriptSettings class handles connection testing internally
    const test = await this.settings.getSetting("feature_enabled");
    if (!test) {
      throw new Error("Settings connection test failed");
    }
  }

  handleSettingsChange(event, data) {
    console.log(`🔄 Settings ${event}:`, data);

    switch (event) {
      case "changed":
        // Handle individual setting changes
        if (data.feature_enabled !== undefined) {
          data.feature_enabled
            ? this.enableMainFeature()
            : this.disableMainFeature();
        }
        if (data.advanced_config !== undefined) {
          this.updateConfiguration(data.advanced_config);
        }
        break;

      case "imported":
      case "reset":
        // Full reload for bulk changes
        this.reinitialize();
        break;
    }
  }

  async enableMainFeature(config = null) {
    if (!config) {
      config = await this.settings.getSettings([
        "api_endpoint",
        "advanced_config",
      ]);
    }

    console.log("🚀 Enabling main feature with config:", config);
    // Your extension logic here
  }

  // Use cached settings for performance-critical operations
  getFeatureState() {
    const cached = this.settings.getCachedSetting("feature_enabled");
    return cached?.value ?? false; // Fallback if not cached
  }

  // Batch updates for efficiency
  async updateMultipleSettings(updates) {
    try {
      await this.settings.updateSettings(updates);
      console.log("✅ Settings updated successfully");
    } catch (error) {
      console.error("❌ Failed to update settings:", error);
    }
  }
}

// Initialize when DOM is ready
async function initializeExtension() {
  const extension = new ExtensionContentScript();
  await extension.initialize();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension);
} else {
  initializeExtension();
}
```

## Advanced Integration Patterns

### Pattern 1: Resilient Feature Toggle with Fallbacks

```javascript
class ResilientFeatureManager {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.featureState = null;
    this.fallbackTimeout = null;
  }

  async initializeFeature() {
    try {
      // Try to get current setting
      const enabled = await this.settings.getSetting("feature_enabled");
      this.featureState = enabled.value;

      if (this.featureState) {
        this.enableFeature();
      }

      // Setup change listener
      this.settings.addChangeListener((event, data) => {
        if (data.feature_enabled !== undefined) {
          this.featureState = data.feature_enabled;
          data.feature_enabled ? this.enableFeature() : this.disableFeature();
        }
      });
    } catch (error) {
      console.error("Settings unavailable, using fallback:", error);
      this.initializeFallbackMode();
    }
  }

  initializeFallbackMode() {
    // Use default state when settings unavailable
    this.featureState = true; // Default enabled
    this.enableFeature();

    // Retry connection periodically
    this.fallbackTimeout = setInterval(() => {
      this.retrySettingsConnection();
    }, 30000); // 30 second intervals
  }

  async retrySettingsConnection() {
    try {
      await this.settings.getSetting("feature_enabled");
      // Success - reinitialize normally
      clearInterval(this.fallbackTimeout);
      this.initializeFeature();
    } catch (error) {
      // Still failing - continue in fallback mode
      console.debug("Settings still unavailable, continuing in fallback mode");
    }
  }
}
```

### Pattern 2: Smart Configuration Loading with Caching

```javascript
class SmartConfigLoader {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.configCache = new Map();
    this.lastUpdate = 0;
    this.cacheLifetime = 60000; // 1 minute cache
  }

  async getConfiguration(forceRefresh = false) {
    const now = Date.now();

    // Return cached config if fresh
    if (
      !forceRefresh &&
      now - this.lastUpdate < this.cacheLifetime &&
      this.configCache.size > 0
    ) {
      return this.getCachedConfig();
    }

    try {
      // Load fresh configuration
      const config = await this.settings.getSettings([
        "api_endpoint",
        "timeout",
        "retries",
        "api_key",
        "advanced_config",
      ]);

      // Update cache
      this.configCache.clear();
      for (const [key, setting] of Object.entries(config)) {
        this.configCache.set(key, setting.value);
      }
      this.lastUpdate = now;

      return this.getCachedConfig();
    } catch (error) {
      console.error("Failed to load configuration:", error);

      // Return cached config if available, otherwise defaults
      if (this.configCache.size > 0) {
        console.warn("Using cached configuration due to error");
        return this.getCachedConfig();
      } else {
        return this.getDefaultConfig();
      }
    }
  }

  getCachedConfig() {
    return {
      endpoint:
        this.configCache.get("api_endpoint") || "https://api.example.com",
      timeout: this.configCache.get("timeout") || 5000,
      retries: this.configCache.get("retries") || 3,
      apiKey: this.configCache.get("api_key") || "",
      advanced: this.configCache.get("advanced_config") || {},
    };
  }

  getDefaultConfig() {
    return {
      endpoint: "https://api.example.com",
      timeout: 5000,
      retries: 3,
      apiKey: "",
      advanced: {},
    };
  }
}
```

### Pattern 3: Dynamic UI Updates with Validation

```javascript
class DynamicUIManager {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.uiElements = new Map();
  }

  async initializeUI() {
    try {
      // Load UI-related settings
      const uiSettings = await this.settings.getSettings([
        "theme_preference",
        "custom_css",
        "ui_scale",
        "animations_enabled",
      ]);

      this.applyUISettings(uiSettings);

      // Listen for UI changes
      this.settings.addChangeListener((event, data) => {
        if (this.isUIRelatedChange(data)) {
          this.handleUIChange(data);
        }
      });
    } catch (error) {
      console.error("Failed to initialize UI settings:", error);
      this.applyDefaultUI();
    }
  }

  applyUISettings(settings) {
    // Apply theme
    if (settings.theme_preference?.value) {
      this.applyTheme(settings.theme_preference.value);
    }

    // Apply custom CSS
    if (settings.custom_css?.value) {
      this.injectCustomCSS(settings.custom_css.value);
    }

    // Apply UI scale
    if (settings.ui_scale?.value) {
      this.setUIScale(settings.ui_scale.value);
    }

    // Toggle animations
    if (settings.animations_enabled?.value !== undefined) {
      this.toggleAnimations(settings.animations_enabled.value);
    }
  }

  handleUIChange(data) {
    if (data.theme_preference !== undefined) {
      this.applyTheme(data.theme_preference);
    }
    if (data.custom_css !== undefined) {
      this.updateCustomCSS(data.custom_css);
    }
    if (data.ui_scale !== undefined) {
      this.setUIScale(data.ui_scale);
    }
    if (data.animations_enabled !== undefined) {
      this.toggleAnimations(data.animations_enabled);
    }
  }

  injectCustomCSS(css) {
    let style = document.getElementById("extension-custom-styles");
    if (!style) {
      style = document.createElement("style");
      style.id = "extension-custom-styles";
      document.head.appendChild(style);
    }
    style.textContent = css;
  }

  isUIRelatedChange(data) {
    return !!(
      data.theme_preference !== undefined ||
      data.custom_css !== undefined ||
      data.ui_scale !== undefined ||
      data.animations_enabled !== undefined
    );
  }
}
```

## Critical Production Considerations

### 1. Service Worker Keep-Alive Management

The framework includes keep-alive management to prevent service worker termination:

```javascript
// Keep-alive alarm (from production background.js)
chrome.alarms.create("keep-alive", { periodInMinutes: 0.42 }); // 25 seconds
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keep-alive") {
    chrome.runtime.getPlatformInfo(() => {
      console.debug("Service worker keep-alive ping");
    });
  }
});
```

### 2. Error Recovery and Fallback Mechanisms

The settings manager includes comprehensive fallback mechanisms:

```javascript
async function initializeWithFallbacks() {
  try {
    // Primary initialization
    settingsManager = new SettingsManager();
    await settingsManager.initialize();
  } catch (error) {
    console.error("Primary initialization failed:", error);

    try {
      // Fallback to embedded defaults
      settingsManager = new SettingsManager();
      await settingsManager.initializeWithEmbeddedDefaults();
      console.log("Using embedded defaults fallback");
    } catch (fallbackError) {
      console.error("Even fallback initialization failed:", fallbackError);
      settingsManager = null;
    }
  }
}
```

### 3. Message Port Management

Proper message port handling prevents "port closed" errors:

```javascript
function handleMessage(message, sender, sendResponse) {
  // Sync messages - respond immediately
  if (message.type === "PING") {
    sendResponse({ pong: true });
    return false; // Don't keep port open
  }

  // Async messages - delegate and keep port open
  processAsyncMessage(message, sender, sendResponse);
  return true; // Keep port open for async response
}
```

### 4. Storage Quota Management

The framework monitors storage usage:

```javascript
async function checkStorageHealth() {
  try {
    const stats = await settingsManager.getStorageStats();
    const quota = await settingsManager.checkStorageQuota();

    if (quota.percentUsed > 80) {
      console.warn("Storage quota usage high:", quota);
      // Implement cleanup or warning logic
    }
  } catch (error) {
    console.error("Storage health check failed:", error);
  }
}
```

## Settings Schema Configuration

### Complete Schema Example

```json
{
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
      "retries": 3,
      "features": {
        "auto_sync": true,
        "batch_size": 100
      }
    },
    "description": "Advanced configuration object"
  },
  "user_preferences": {
    "type": "json",
    "value": {
      "theme": "light",
      "language": "en",
      "notifications": true,
      "ui_scale": 1.0
    },
    "description": "User interface preferences"
  }
}
```

### Schema Validation

All settings are automatically validated based on their schema:

- **boolean**: Must be true/false
- **text**: String with optional maxLength
- **longtext**: String with optional maxLength (for large text)
- **number**: Numeric with optional min/max constraints
- **json**: Valid JSON object (checked for circular references)

## Performance Optimization Guidelines

### 1. Batch Operations

```javascript
// ✅ Good: Batch operations
const settings = await settingsAPI.getSettings([
  "setting1",
  "setting2",
  "setting3",
]);

await settingsAPI.updateSettings({
  setting1: "value1",
  setting2: "value2",
});

// ❌ Avoid: Individual operations in loops
for (const key of keys) {
  await settingsAPI.getSetting(key); // Inefficient
}
```

### 2. Smart Caching

```javascript
// ✅ Good: Check cache first for frequently accessed settings
const settings = new ContentScriptSettings();

function getFeatureEnabled() {
  const cached = settings.getCachedSetting("feature_enabled");
  return cached?.value ?? false;
}

// ✅ Good: Use cached data for synchronous operations
const allCachedSettings = settings.getCachedSettings();
```

### 3. Timeout Management

```javascript
// Configure timeouts based on your needs
const settings = new ContentScriptSettings();
settings.setMessageTimeout(10000); // 10 second timeout for slow networks
```

## Testing Your Integration

### Basic Functionality Test

```javascript
async function testBasicIntegration() {
  const settings = new ContentScriptSettings();

  try {
    // Test connection
    console.log("Testing connection...");
    const ping = await chrome.runtime.sendMessage({ type: "PING" });
    console.assert(ping.pong === true, "Ping test failed");

    // Test get setting
    console.log("Testing get setting...");
    const setting = await settings.getSetting("feature_enabled");
    console.assert(setting !== null, "Get setting failed");

    // Test update setting
    console.log("Testing update setting...");
    const originalValue = setting.value;
    await settings.updateSetting("feature_enabled", !originalValue);
    const updated = await settings.getSetting("feature_enabled");
    console.assert(updated.value === !originalValue, "Update setting failed");

    // Restore original value
    await settings.updateSetting("feature_enabled", originalValue);

    console.log("✅ All integration tests passed!");
  } catch (error) {
    console.error("❌ Integration test failed:", error);
  }
}

// Run test
testBasicIntegration();
```

## Migration from Other Settings Systems

### From Chrome Storage Direct Usage

```javascript
// Old approach
chrome.storage.local.get(["setting1"], (result) => {
  const value = result.setting1;
  // Use value
});

// New approach
const settings = new ContentScriptSettings();
const setting = await settings.getSetting("setting1");
const value = setting.value; // Includes validation, caching, change notifications
```

### From Simple Message Passing

```javascript
// Old approach
chrome.runtime.sendMessage(
  { action: "getSetting", key: "setting1" },
  (response) => {
    // Handle response
  },
);

// New approach
const settings = new ContentScriptSettings();
const setting = await settings.getSetting("setting1"); // Includes retry logic, timeouts, error handling
```

## Troubleshooting Quick Reference

| Issue                        | Cause                                  | Solution                                |
| ---------------------------- | -------------------------------------- | --------------------------------------- |
| "Message port closed" errors | Using `async function handleMessage()` | Use sync/async separation pattern       |
| Settings not loading         | Service worker not running             | Check background script initialization  |
| Changes not reflecting       | Missing change listeners               | Setup listeners before loading settings |
| Performance issues           | Individual API calls in loops          | Use batch operations                    |
| Validation errors            | Schema mismatch                        | Verify setting types and constraints    |

For comprehensive troubleshooting, see `troubleshooting-guide.md`.

## Next Steps

1. **Copy the files** and update your manifest
2. **Implement the background script** using the production patterns
3. **Integrate content scripts** with proper error handling
4. **Test thoroughly** using the provided test functions
5. **Review troubleshooting guide** for common issues

This integration provides enterprise-grade settings management with minimal code changes to your existing extension.
