# Settings Extension - Examples

This directory contains comprehensive examples demonstrating how to use the Settings Extension API and integrate it into your own extensions as drop-in code.

## Drop-In Integration

**Get started in 5 minutes!** Copy the required files and integrate powerful settings management into any browser extension. See [INTEGRATION.md](INTEGRATION.md) for the complete step-by-step guide.

### Quick Integration Steps

1. **Copy files**: `lib/` folder and `config/defaults.json` to your extension
2. **Update manifest**: Add permissions and content script includes
3. **Integrate background**: Use [background-integration.js](background-integration.js)
4. **Use in content**: Use [minimal-integration.js](minimal-integration.js)
5. **Optional UI**: Use [popup-integration.js](popup-integration.js)

Your extension now has complete settings management with real-time sync, validation, export/import, and cross-browser compatibility!

## Files

### 🎯 Drop-In Integration Examples

### 📋 `INTEGRATION.md`

**Complete Integration Guide** - Step-by-step guide to add settings management to any extension:

- 5-minute quick start
- Files to copy and manifest changes
- Complete integration process
- Common patterns and troubleshooting

**Best for:** Complete integration from scratch.

### ⚡ `minimal-integration.js`

**Quick Start Example** - Complete working example in <50 lines:

- Essential operations with error handling
- Real-time change listeners
- Promise-based patterns
- Ready to copy and use

**Best for:** Getting started quickly with minimal code.

### 🔧 `background-integration.js`

**Background Script Integration** - Complete background script setup:

- Settings manager initialization
- Message handling for all API operations
- Real-time broadcast to content scripts
- Based on actual implementation

**Best for:** Integrating settings in your background script.

### 🎨 `popup-integration.js`

**Popup UI Integration** - Simple settings UI for popups:

- Getting and updating settings
- Real-time UI updates and validation
- Export/import/reset functionality
- Works with any setting types

**Best for:** Adding settings UI to your popup.

### 🔍 Advanced Usage Examples

### 📚 `content-script-example.js`

**Comprehensive Example** - A full-featured content script that demonstrates all API capabilities including:

- ✅ Loading settings (single, multiple, and all)
- ✅ Updating settings (single and batch)
- ✅ Real-time change listeners
- ✅ Error handling and retry logic
- ✅ Performance optimization with caching
- ✅ User interface integration
- ✅ Keyboard shortcuts
- ✅ Export/import functionality
- ✅ Visual indicators and notifications

**Best for:** Understanding the complete integration patterns and advanced features.

### 🚀 `simple-usage-example.js`

**Quick Reference** - Focused examples of common operations:

- Basic CRUD operations
- Change listeners
- Error handling patterns
- Performance optimization
- JSON settings handling
- Real-world integration example

**Best for:** Quick reference and copy-paste implementations.

## Getting Started

### 1. Basic Integration

```javascript
// Initialize the settings API
const settings = new ContentScriptSettings();

// Get a setting
const featureSetting = await settings.getSetting("feature_enabled");
console.log("Feature enabled:", featureSetting.value);

// Update a setting
await settings.updateSetting("feature_enabled", true);

// Listen for changes
settings.addChangeListener((event, data) => {
  console.log("Settings changed:", data);
});
```

### 2. Performance Best Practices

```javascript
// ✅ Good: Batch operations
const settings = await settings.getSettings([
  "setting1",
  "setting2",
  "setting3",
]);

// ✅ Good: Use caching for frequent access
if (settings.isCached("feature_enabled")) {
  const value = settings.getCachedSetting("feature_enabled").value;
}

// ✅ Good: Batch updates
await settings.updateSettings({
  setting1: "value1",
  setting2: "value2",
});

// ❌ Avoid: Individual calls in loops
for (const key of keys) {
  await settings.getSetting(key); // Inefficient
}
```

### 3. Error Handling

```javascript
async function safeOperation() {
  try {
    const result = await settings.getSetting("some_setting");
    return result?.value;
  } catch (error) {
    if (error.message.includes("timeout")) {
      // Handle timeout
      return null;
    } else if (error.message.includes("not found")) {
      // Handle missing setting
      return defaultValue;
    } else {
      // Handle other errors
      console.error("Settings error:", error);
      return null;
    }
  }
}
```

## API Reference

### ContentScriptSettings Class

#### Methods

| Method                           | Description               | Performance                 |
| -------------------------------- | ------------------------- | --------------------------- |
| `getSetting(key)`                | Get single setting        | Cached after first load     |
| `getSettings(keys)`              | Get multiple settings     | Most efficient for multiple |
| `getAllSettings()`               | Get all settings          | Use sparingly               |
| `updateSetting(key, value)`      | Update single setting     | Instant cache update        |
| `updateSettings(updates)`        | Update multiple settings  | Most efficient for multiple |
| `addChangeListener(callback)`    | Listen for changes        | Real-time updates           |
| `removeChangeListener(callback)` | Remove listener           | -                           |
| `getCachedSetting(key)`          | Get cached setting        | Fastest access              |
| `getCachedSettings()`            | Get all cached settings   | Synchronous access          |
| `clearCache()`                   | Clear cached settings     | Force reload                |
| `exportSettings()`               | Export settings to JSON   | Promise-based               |
| `importSettings(data)`           | Import settings from JSON | Promise-based               |
| `resetSettings()`                | Reset to defaults         | Promise-based               |
| `getStorageStats()`              | Get storage statistics    | Promise-based               |
| `checkStorageQuota()`            | Check storage quota       | Promise-based               |

#### Events

| Event      | Description       | Data                    |
| ---------- | ----------------- | ----------------------- |
| `changed`  | Settings updated  | `{ key: value, ... }`   |
| `imported` | Settings imported | `{ key: setting, ... }` |
| `reset`    | Settings reset    | `{ key: setting, ... }` |

## Common Patterns

### 1. Feature Toggle

```javascript
async function setupFeatureToggle() {
  const enabled = await settings.getSetting("feature_enabled");

  if (enabled?.value) {
    enableFeature();
  }

  settings.addChangeListener((event, data) => {
    if (data.feature_enabled !== undefined) {
      data.feature_enabled ? enableFeature() : disableFeature();
    }
  });
}
```

### 2. Configuration Management

```javascript
async function loadConfiguration() {
  const config = await settings.getSettings([
    "api_endpoint",
    "timeout",
    "retries",
    "api_key",
  ]);

  return {
    endpoint: config.api_endpoint?.value || "https://api.example.com",
    timeout: config.timeout?.value || 5000,
    retries: config.retries?.value || 3,
    apiKey: config.api_key?.value || "",
  };
}
```

### 3. Custom CSS Injection

```javascript
async function injectCustomCSS() {
  const css = await settings.getSetting("custom_css");

  if (css?.value) {
    const style = document.createElement("style");
    style.textContent = css.value;
    document.head.appendChild(style);
  }

  settings.addChangeListener((event, data) => {
    if (data.custom_css !== undefined) {
      updateCSS(data.custom_css);
    }
  });
}
```

## Testing

### Manual Testing

1. Load the extension in developer mode
2. Open the browser console
3. Run example code snippets
4. Test the examples with the extension popup

### Integration Testing

```javascript
// Test basic functionality
async function testBasicOperations() {
  console.log("Testing basic operations...");

  // Test get
  const setting = await settings.getSetting("feature_enabled");
  console.assert(setting !== null, "Should get setting");

  // Test update
  await settings.updateSetting("feature_enabled", !setting.value);
  const updated = await settings.getSetting("feature_enabled");
  console.assert(updated.value !== setting.value, "Should update setting");

  console.log("✅ Basic operations test passed");
}
```

## Troubleshooting

### Common Issues

1. **Settings not loading**
   - Check if the background script is running
   - Verify manifest.json includes content script
   - Check browser console for errors

2. **Changes not reflecting**
   - Ensure change listeners are set up correctly
   - Check if settings are being updated from another source
   - Verify caching isn't causing stale data

3. **Performance issues**
   - Use batch operations instead of individual calls
   - Implement caching for frequently accessed settings
   - Avoid calling getAllSettings() repeatedly

### Debug Information

```javascript
// Get debug information
console.log("Cache stats:", settings.getCacheStats());
console.log("Browser environment:", browserAPI.environment);
```

## Support

For issues or questions:

1. Check the browser console for error messages
2. Verify the extension is properly loaded
3. Test with the simple examples first
4. Review the comprehensive example for advanced usage

## License

This extension is for internal company use only.
