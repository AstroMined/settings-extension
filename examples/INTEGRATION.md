# Settings Extension Integration Guide

This guide shows developers how to add robust settings management to their existing browser extensions using drop-in code components.

## Quick Start (5 Minutes)

Add powerful settings management to your extension in just 5 minutes:

### 1. Copy Required Files

Copy these files from this extension to your extension folder:

```
your-extension/
├── lib/
│   ├── browser-compat.js      # Cross-browser compatibility
│   ├── content-settings.js    # Content script API
│   ├── settings-manager.js    # Core settings manager
│   └── validation.js          # Settings validation
└── config/
    └── defaults.json          # Your default settings
```

### 2. Update Your Manifest

Add to your `manifest.json`:

```json
{
  "permissions": ["storage"],
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

### 3. Add Background Script Integration

Add to your `background.js`:

```javascript
// Import settings management
importScripts("lib/browser-compat.js", "lib/settings-manager.js");

let settingsManager;

async function initializeSettings() {
  settingsManager = new SettingsManager();
  await settingsManager.initialize();
}

// Handle settings messages
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (!settingsManager) await initializeSettings();

  switch (message.type) {
    case "GET_SETTING":
      const setting = await settingsManager.getSetting(message.key);
      sendResponse({ value: setting });
      break;
    // Add other message handlers as needed
  }
  return true;
});

// Initialize on startup
initializeSettings();
```

### 4. Use in Content Scripts

```javascript
// Initialize settings API
const settings = new ContentScriptSettings();

// Get settings
const feature = await settings.getSetting("feature_enabled");
if (feature.value) {
  // Enable your feature
}

// Update settings
await settings.updateSetting("user_preference", "dark_mode");

// Listen for changes
settings.addChangeListener((event, data) => {
  console.log("Settings changed:", data);
});
```

## Complete Integration Process

### Step 1: File Structure Setup

Create the following directory structure in your extension:

```
your-extension/
├── lib/                    # Settings library files
│   ├── browser-compat.js
│   ├── content-settings.js
│   ├── settings-manager.js
│   └── validation.js
├── config/                 # Configuration
│   └── defaults.json
├── background.js           # Your background script
├── content-script.js       # Your content script
├── popup/                  # Optional: Settings popup
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
└── manifest.json
```

### Step 2: Configure Default Settings

Create `config/defaults.json` with your extension's settings:

```json
{
  "feature_enabled": {
    "type": "boolean",
    "value": true,
    "description": "Enable main feature"
  },
  "api_endpoint": {
    "type": "text",
    "value": "https://api.example.com",
    "description": "API endpoint URL",
    "maxLength": 200
  },
  "refresh_interval": {
    "type": "number",
    "value": 30,
    "description": "Refresh interval (seconds)",
    "min": 5,
    "max": 3600
  },
  "user_preferences": {
    "type": "json",
    "value": {
      "theme": "light",
      "notifications": true
    },
    "description": "User preference settings"
  },
  "custom_css": {
    "type": "longtext",
    "value": "",
    "description": "Custom CSS rules",
    "maxLength": 50000
  }
}
```

### Step 3: Update Manifest.json

Complete manifest.json configuration:

```json
{
  "manifest_version": 3,
  "name": "Your Extension",
  "version": "1.0.0",
  "description": "Your extension description",

  "permissions": ["storage", "activeTab"],

  "background": {
    "service_worker": "background.js"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": [
        "lib/browser-compat.js",
        "lib/content-settings.js",
        "content-script.js"
      ]
    }
  ],

  "action": {
    "default_popup": "popup/popup.html"
  },

  "web_accessible_resources": [
    {
      "resources": ["config/defaults.json"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### Step 4: Background Script Integration

Complete background script with all message handlers:

```javascript
// background.js
importScripts("lib/browser-compat.js", "lib/settings-manager.js");

let settingsManager;

async function initializeSettings() {
  try {
    settingsManager = new SettingsManager();
    await settingsManager.initialize();
    console.log("Settings initialized");
  } catch (error) {
    console.error("Settings initialization failed:", error);
  }
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (!settingsManager) await initializeSettings();

  try {
    switch (message.type) {
      case "GET_SETTING":
        const setting = await settingsManager.getSetting(message.key);
        sendResponse({ value: setting });
        break;

      case "GET_SETTINGS":
        const settings = await settingsManager.getSettings(message.keys);
        sendResponse({ values: settings });
        break;

      case "GET_ALL_SETTINGS":
        const allSettings = await settingsManager.getAllSettings();
        sendResponse({ settings: allSettings });
        break;

      case "UPDATE_SETTING":
        await settingsManager.updateSetting(message.key, message.value);
        sendResponse({ success: true });
        await broadcastChange({ [message.key]: message.value }, sender);
        break;

      case "UPDATE_SETTINGS":
        await settingsManager.updateSettings(message.updates);
        sendResponse({ success: true });
        await broadcastChange(message.updates, sender);
        break;

      case "EXPORT_SETTINGS":
        const exportData = await settingsManager.exportSettings();
        sendResponse({ data: exportData });
        break;

      case "IMPORT_SETTINGS":
        await settingsManager.importSettings(message.data);
        sendResponse({ success: true });
        await broadcastImport(sender);
        break;

      case "RESET_SETTINGS":
        await settingsManager.resetToDefaults();
        sendResponse({ success: true });
        await broadcastReset(sender);
        break;
    }
  } catch (error) {
    sendResponse({ error: error.message });
  }

  return true;
});

async function broadcastChange(changes, sender) {
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => {
    if (sender.tab && sender.tab.id === tab.id) return;
    chrome.tabs
      .sendMessage(tab.id, {
        type: "SETTINGS_CHANGED",
        changes: changes,
      })
      .catch(() => {});
  });
}

async function broadcastImport(sender) {
  const allSettings = await settingsManager.getAllSettings();
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => {
    if (sender.tab && sender.tab.id === tab.id) return;
    chrome.tabs
      .sendMessage(tab.id, {
        type: "SETTINGS_IMPORTED",
        settings: allSettings,
      })
      .catch(() => {});
  });
}

async function broadcastReset(sender) {
  const allSettings = await settingsManager.getAllSettings();
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => {
    if (sender.tab && sender.tab.id === tab.id) return;
    chrome.tabs
      .sendMessage(tab.id, {
        type: "SETTINGS_RESET",
        settings: allSettings,
      })
      .catch(() => {});
  });
}

chrome.runtime.onInstalled.addListener(() => {
  initializeSettings();
});

chrome.runtime.onStartup.addListener(() => {
  initializeSettings();
});

initializeSettings();
```

### Step 5: Content Script Integration

Use settings in your content scripts:

```javascript
// content-script.js
// ContentScriptSettings is already available from the content script injection

async function initializeExtension() {
  const settings = new ContentScriptSettings();

  try {
    // Load initial configuration
    const config = await settings.getSettings([
      "feature_enabled",
      "api_endpoint",
      "refresh_interval",
      "user_preferences",
    ]);

    if (config.feature_enabled?.value) {
      await enableMainFeature(config);
    }

    // Listen for real-time updates
    settings.addChangeListener((event, changes) => {
      handleSettingsChange(event, changes);
    });
  } catch (error) {
    console.error("Failed to initialize extension:", error);
  }
}

function handleSettingsChange(event, changes) {
  switch (event) {
    case "changed":
      if (changes.feature_enabled !== undefined) {
        changes.feature_enabled ? enableMainFeature() : disableMainFeature();
      }
      if (changes.user_preferences !== undefined) {
        updateUserInterface(changes.user_preferences);
      }
      break;

    case "imported":
    case "reset":
      // Reload entire configuration
      location.reload();
      break;
  }
}

async function enableMainFeature(config) {
  // Your extension logic here
  console.log("Feature enabled with config:", config);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension);
} else {
  initializeExtension();
}
```

## Common Integration Patterns

### Pattern 1: Feature Toggle

```javascript
// Initialize feature based on setting
const settings = new ContentScriptSettings();
const enabled = await settings.getSetting("feature_enabled");

if (enabled.value) {
  initializeFeature();
}

// React to changes
settings.addChangeListener((event, data) => {
  if (data.feature_enabled !== undefined) {
    data.feature_enabled ? initializeFeature() : destroyFeature();
  }
});
```

### Pattern 2: Configuration Management

```javascript
async function loadConfiguration() {
  const settings = new ContentScriptSettings();
  const config = await settings.getSettings([
    "api_endpoint",
    "timeout",
    "retries",
    "api_key",
  ]);

  return {
    endpoint: config.api_endpoint?.value || "https://default.api.com",
    timeout: config.timeout?.value || 5000,
    retries: config.retries?.value || 3,
    apiKey: config.api_key?.value,
  };
}
```

### Pattern 3: User Interface Settings

```javascript
async function applyTheme() {
  const settings = new ContentScriptSettings();
  const prefs = await settings.getSetting("user_preferences");

  if (prefs.value.theme === "dark") {
    document.body.classList.add("dark-theme");
  }

  // Listen for theme changes
  settings.addChangeListener((event, data) => {
    if (data.user_preferences?.theme) {
      document.body.classList.toggle(
        "dark-theme",
        data.user_preferences.theme === "dark",
      );
    }
  });
}
```

### Pattern 4: Dynamic CSS Injection

```javascript
async function injectCustomCSS() {
  const settings = new ContentScriptSettings();
  const css = await settings.getSetting("custom_css");

  if (css.value) {
    const style = document.createElement("style");
    style.id = "extension-custom-css";
    style.textContent = css.value;
    document.head.appendChild(style);
  }

  // Update CSS when changed
  settings.addChangeListener((event, data) => {
    if (data.custom_css !== undefined) {
      let style = document.getElementById("extension-custom-css");
      if (!style) {
        style = document.createElement("style");
        style.id = "extension-custom-css";
        document.head.appendChild(style);
      }
      style.textContent = data.custom_css;
    }
  });
}
```

## Optional: Add Settings UI

### Simple Popup Integration

Create `popup/popup.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="popup.css" />
  </head>
  <body>
    <div class="container">
      <h1>Extension Settings</h1>
      <div id="settings-container"></div>
      <div class="actions">
        <button id="export-btn">Export</button>
        <button id="import-btn">Import</button>
        <button id="reset-btn">Reset</button>
      </div>
    </div>
    <script src="../lib/browser-compat.js"></script>
    <script src="popup.js"></script>
  </body>
</html>
```

Use the popup integration example from `popup-integration.js` for the JavaScript implementation.

## Common Pitfalls and Solutions

### Issue 1: Settings Not Loading

**Problem**: Settings API returns errors or timeouts.

**Solutions**:

- Ensure background script is running: Check `chrome://extensions` developer mode
- Verify manifest.json includes all required permissions and files
- Check browser console for initialization errors

```javascript
// Debug initialization
const settings = new ContentScriptSettings();
try {
  const test = await settings.getSetting("feature_enabled");
  console.log("Settings working:", test);
} catch (error) {
  console.error("Settings not working:", error);
}
```

### Issue 2: Changes Not Reflecting

**Problem**: Settings update but UI doesn't change.

**Solutions**:

- Ensure change listeners are set up before loading settings
- Check that message passing is working between background and content scripts
- Verify settings cache is being updated

```javascript
// Setup listeners first
settings.addChangeListener((event, data) => {
  console.log("Change detected:", event, data);
});

// Then load settings
await settings.getSetting("feature_enabled");
```

### Issue 3: Performance Issues

**Problem**: Extension is slow when accessing settings.

**Solutions**:

- Use batch operations (`getSettings()` vs multiple `getSetting()`)
- Cache frequently accessed settings
- Avoid calling `getAllSettings()` repeatedly

```javascript
// Good: Batch loading
const config = await settings.getSettings(["setting1", "setting2", "setting3"]);

// Good: Check cache first
if (settings.isCached("feature_enabled")) {
  const value = settings.getCachedSetting("feature_enabled").value;
}

// Avoid: Individual calls in loops
for (const key of keys) {
  await settings.getSetting(key); // Inefficient
}
```

### Issue 4: Validation Errors

**Problem**: Settings validation failing with custom values.

**Solutions**:

- Check default settings schema matches your data types
- Ensure min/max constraints are appropriate
- Validate JSON settings format

```javascript
// Validate before updating
try {
  await settings.updateSetting("number_setting", 42);
} catch (error) {
  if (error.message.includes("validation")) {
    console.error("Validation failed:", error.message);
    // Handle validation error
  }
}
```

## API Reference Summary

### ContentScriptSettings Methods

| Method                           | Description              | Returns            |
| -------------------------------- | ------------------------ | ------------------ | ----- |
| `getSetting(key)`                | Get single setting       | `Promise<Object>`  |
| `getSettings(keys)`              | Get multiple settings    | `Promise<Object>`  |
| `getAllSettings()`               | Get all settings         | `Promise<Object>`  |
| `updateSetting(key, value)`      | Update single setting    | `Promise<boolean>` |
| `updateSettings(updates)`        | Update multiple settings | `Promise<boolean>` |
| `addChangeListener(callback)`    | Listen for changes       | `void`             |
| `removeChangeListener(callback)` | Remove listener          | `void`             |
| `getCachedSetting(key)`          | Get cached setting       | `Object            | null` |
| `clearCache()`                   | Clear cache              | `void`             |
| `exportSettings()`               | Export settings          | `Promise<string>`  |
| `importSettings(data)`           | Import settings          | `Promise<boolean>` |
| `resetSettings()`                | Reset to defaults        | `Promise<boolean>` |

### Setting Schema

```javascript
{
  "setting_key": {
    "type": "boolean|text|longtext|number|json",
    "value": defaultValue,
    "description": "Human readable description",
    "maxLength": 100,  // for text/longtext
    "min": 1,          // for number
    "max": 3600        // for number
  }
}
```

### Browser Compatibility

The settings extension automatically handles browser compatibility:

- **Chrome/Edge**: Full Manifest V3 support
- **Firefox**: Manifest V2/V3 compatibility layer
- **Safari**: WebExtensions API support

No browser-specific code needed in your extension!

## Support and Troubleshooting

### Debug Mode

Enable debug logging:

```javascript
// In background.js
console.log("Settings manager state:", settingsManager);

// In content script
console.log("Settings cache:", settings.getCachedSettings());
```

### Testing Integration

Test your integration:

```javascript
async function testSettingsIntegration() {
  const settings = new ContentScriptSettings();

  try {
    // Test basic operations
    const setting = await settings.getSetting("feature_enabled");
    console.assert(setting !== null, "Should get setting");

    await settings.updateSetting("feature_enabled", !setting.value);
    const updated = await settings.getSetting("feature_enabled");
    console.assert(updated.value !== setting.value, "Should update");

    console.log("✅ Settings integration test passed");
  } catch (error) {
    console.error("❌ Settings integration test failed:", error);
  }
}

// Run test
testSettingsIntegration();
```

### Performance Monitoring

Monitor settings performance:

```javascript
async function monitorPerformance() {
  const start = performance.now();
  await settings.getSetting("feature_enabled");
  const duration = performance.now() - start;
  console.log(`Settings access took ${duration}ms`);
}
```

## Conclusion

This integration guide provides everything needed to add robust settings management to your browser extension. The drop-in nature of these components means you can have a fully functional settings system running in minutes, with advanced features like real-time synchronization, validation, and cross-browser compatibility built in.

For more examples and advanced usage patterns, see the other files in the `examples/` directory.
