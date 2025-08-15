# Configuration Migration Guide

## Executive Summary

Step-by-step guide for migrating from embedded defaults to the centralized configuration system in the Settings Extension framework. This guide ensures smooth transition from the previous hardcoded approach to the new schema-driven configuration management.

**Scope**: Migration from embedded defaults to centralized configuration  
**Target Audience**: Developers with existing Settings Extension integrations  
**Last Updated**: 2025-08-15  
**Status**: Approved

## Migration Overview

### What Changed

The Settings Extension has moved from embedded JavaScript defaults to a centralized JSON-based configuration system:

**Before (Embedded Defaults):**

```javascript
// Scattered across multiple files
const defaults = {
  feature_enabled: true,
  api_key: "",
};

const displayNames = {
  feature_enabled: "Enable Feature",
  api_key: "API Key",
};

const categories = {
  general: ["feature_enabled", "api_key"],
};
```

**After (Centralized Configuration):**

```json
{
  "feature_enabled": {
    "type": "boolean",
    "value": true,
    "description": "Enable main feature functionality",
    "displayName": "Enable Feature",
    "category": "general",
    "order": 1
  }
}
```

### Benefits of Migration

- **Single Source of Truth**: All configuration in `config/defaults.json`
- **Zero Code Changes**: Add new settings without touching JavaScript
- **Automatic UI Generation**: Forms generated from schema
- **Better Maintainability**: Clear separation of configuration and logic
- **Type Safety**: Comprehensive validation and error handling

## Pre-Migration Assessment

### Check Your Current Integration

Before starting migration, assess your current setup:

1. **Identify Embedded Defaults**: Look for hardcoded setting definitions
2. **Locate Display Names**: Find any UI label mappings
3. **Find Category Assignments**: Look for hardcoded category groupings
4. **Review Custom Settings**: Identify any custom or non-standard settings

### Common Integration Patterns

**Pattern 1: Direct Settings Manager Usage**

```javascript
const settingsManager = new SettingsManager();
await settingsManager.initialize(); // This should work without changes
```

**Pattern 2: Custom Default Definitions**

```javascript
// This pattern needs migration
const myDefaults = {
  custom_setting: { type: "boolean", value: true },
};
```

**Pattern 3: UI Integration**

```javascript
// This pattern needs updating
const displayName = getDisplayName(key); // May need ConfigurationLoader
```

## Step-by-Step Migration

### Step 1: Create Enhanced defaults.json

1. **Locate Your Current Defaults**: Find where settings are currently defined
2. **Create Enhanced Schema**: Convert to the new format
3. **Add Missing Metadata**: Include display names, categories, help text

**Example Conversion:**

```javascript
// OLD: Embedded in JavaScript
const embedded = {
  notifications_enabled: { type: "boolean", value: true },
  poll_interval: { type: "number", value: 300 },
};

const names = {
  notifications_enabled: "Enable Notifications",
  poll_interval: "Poll Interval",
};
```

```json
// NEW: config/defaults.json
{
  "notifications_enabled": {
    "type": "boolean",
    "value": true,
    "description": "Enable notification system",
    "displayName": "Enable Notifications",
    "category": "general",
    "helpText": "Toggle to enable/disable all notifications",
    "order": 1
  },
  "poll_interval": {
    "type": "number",
    "value": 300,
    "description": "Polling interval in seconds",
    "displayName": "Poll Interval",
    "category": "general",
    "min": 60,
    "max": 3600,
    "helpText": "How often to check for updates (seconds)",
    "order": 2
  }
}
```

### Step 2: Update manifest.json

Ensure your manifest includes defaults.json in web_accessible_resources:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["config/defaults.json"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### Step 3: Remove Embedded Defaults

**Remove hardcoded configuration from JavaScript files:**

```javascript
// DELETE: Remove embedded defaults
const defaults = {
  feature_enabled: true,
  api_key: "",
};

// DELETE: Remove display name mappings
const displayNames = {
  feature_enabled: "Enable Feature",
};

// DELETE: Remove category mappings
const settingCategories = {
  general: ["feature_enabled", "api_key"],
};
```

### Step 4: Update Settings Manager Usage

**Before:**

```javascript
// Old initialization pattern
const manager = new SettingsManager();
await manager.initializeWithEmbeddedDefaults();
```

**After:**

```javascript
// New initialization pattern (should work automatically)
const manager = new SettingsManager();
await manager.initialize(); // Now uses ConfigurationLoader automatically
```

### Step 5: Update UI Integration

**Before:**

```javascript
// Old display name handling
function getDisplayName(key) {
  return displayNames[key] || formatKey(key);
}
```

**After:**

```javascript
// New display name handling
const configLoader = new ConfigurationLoader();
await configLoader.loadConfiguration();
const displayName = configLoader.getDisplayName(key);
```

### Step 6: Update Category Handling

**Before:**

```javascript
// Old category system
const categories = {
  general: ["setting1", "setting2"],
  advanced: ["setting3"],
};

for (const [category, settings] of Object.entries(categories)) {
  renderCategory(category, settings);
}
```

**After:**

```javascript
// New dynamic category system
const configLoader = new ConfigurationLoader();
await configLoader.loadConfiguration();
const categories = configLoader.getCategories();

for (const category of categories) {
  const settings = configLoader.getCategorySettings(category);
  renderCategory(category, settings);
}
```

## Migration Checklist

### Configuration File Setup

- [ ] Create or update `config/defaults.json` with enhanced schema
- [ ] Include all required properties: `type`, `value`, `description`
- [ ] Add optional metadata: `displayName`, `category`, `helpText`, `order`
- [ ] Validate JSON syntax and structure
- [ ] Ensure `manifest.json` includes defaults.json in web_accessible_resources

### Code Updates

- [ ] Remove embedded default definitions from JavaScript
- [ ] Remove hardcoded display name mappings
- [ ] Remove hardcoded category assignments
- [ ] Update Settings Manager initialization calls
- [ ] Replace direct display name lookups with ConfigurationLoader
- [ ] Update category rendering to use dynamic loading

### Testing

- [ ] Verify all settings load correctly
- [ ] Confirm display names appear in UI
- [ ] Check category organization works
- [ ] Test setting validation and constraints
- [ ] Verify fallback behavior works if config fails to load

## Common Migration Issues

### Issue 1: Settings Not Appearing

**Symptoms**: Settings disappear after migration
**Cause**: Missing or invalid configuration entries
**Solution**:

```javascript
// Debug configuration loading
const configLoader = new ConfigurationLoader();
try {
  const config = await configLoader.loadConfiguration();
  console.log("Loaded settings:", Object.keys(config));
} catch (error) {
  console.error("Configuration loading failed:", error);
}
```

### Issue 2: Display Names Missing

**Symptoms**: Settings show with raw keys instead of friendly names
**Cause**: ConfigurationLoader not properly integrated
**Solution**:

```javascript
// Ensure ConfigurationLoader is instantiated and used
const configLoader = new ConfigurationLoader();
await configLoader.loadConfiguration();
const displayName = configLoader.getDisplayName(key);
```

### Issue 3: Categories Empty

**Symptoms**: Settings don't appear in correct categories
**Cause**: Missing category assignments in configuration
**Solution**: Add category property to all settings in defaults.json

### Issue 4: Validation Errors

**Symptoms**: Settings fail to load with validation errors
**Cause**: Schema violations in defaults.json
**Solution**: Check common validation issues:

- Enum settings missing `options` property
- Number settings with non-numeric defaults
- Missing required properties (`type`, `value`, `description`)

### Issue 5: UI Not Updating

**Symptoms**: UI still shows old hardcoded values
**Cause**: Browser cache or build artifacts
**Solution**:

1. Clear browser cache
2. Rebuild extension: `npm run build`
3. Reload extension in browser

## Testing Your Migration

### Functional Testing

```javascript
// Test configuration loading
const configLoader = new ConfigurationLoader();
await configLoader.loadConfiguration();

// Verify all expected settings exist
const expectedSettings = ["feature_enabled", "api_key", "poll_interval"];
for (const key of expectedSettings) {
  console.assert(configLoader.hasSetting(key), `Missing setting: ${key}`);
}

// Test display names
for (const key of expectedSettings) {
  const displayName = configLoader.getDisplayName(key);
  console.assert(displayName !== key, `Missing display name for: ${key}`);
}

// Test categories
const categories = configLoader.getCategories();
console.assert(categories.length > 0, "No categories found");
```

### Integration Testing

1. **Settings Manager Integration**: Verify `SettingsManager.initialize()` works
2. **UI Rendering**: Check that settings appear correctly in options page
3. **Category Organization**: Confirm settings are grouped properly
4. **Validation**: Test that invalid values are rejected
5. **Fallback Behavior**: Simulate configuration loading failure

### Cross-Browser Testing

Test migration in all supported browsers:

- Chrome/Chromium
- Firefox
- Edge

## Performance Considerations

### Configuration Loading Performance

The new system introduces configuration loading overhead:

**Optimization Strategies:**

1. **Caching**: Configuration is automatically cached for 5 minutes
2. **Lazy Loading**: Load configuration only when needed
3. **Error Recovery**: Fallback configuration prevents total failure

**Performance Benchmarks:**

- Configuration loading: <50ms (target)
- Cache retrieval: <5ms
- Fallback loading: <10ms

### Memory Usage

Monitor memory usage after migration:

- Configuration cache: ~1-5KB depending on settings count
- Fallback configuration: ~500 bytes
- No memory leaks from repeated loading

## Advanced Migration Scenarios

### Scenario 1: Custom Setting Types

If you have custom setting types:

1. **Extend ConfigurationLoader validation**:

```javascript
// Add to validateConfiguration method
case "custom_type":
  // Add validation logic
  break;
```

2. **Update UI handling**:

```javascript
// Add to createAdvancedInputElement method
case "custom_type":
  // Create custom input element
  break;
```

### Scenario 2: Multiple Configuration Files

For complex extensions with multiple configuration sources:

1. **Merge configurations**: Combine multiple files into single defaults.json
2. **Use configuration composition**: Load base config and extend with additional settings
3. **Maintain separation**: Keep separate configs for different extension components

### Scenario 3: Dynamic Settings

For settings that change based on runtime conditions:

1. **Static Schema**: Define all possible settings in defaults.json
2. **Conditional Display**: Show/hide settings based on other setting values
3. **Runtime Validation**: Add additional validation beyond schema

## Rollback Plan

If migration causes issues, you can rollback:

### Immediate Rollback

1. **Restore Previous Version**: Revert to pre-migration code
2. **Disable New System**: Comment out ConfigurationLoader usage
3. **Re-enable Embedded Defaults**: Restore hardcoded configurations

### Gradual Rollback

1. **Hybrid Approach**: Use both systems temporarily
2. **Feature Flagging**: Toggle new configuration system on/off
3. **Progressive Migration**: Migrate settings incrementally

## Post-Migration Benefits

### Developer Experience

- **Faster Development**: Add settings without code changes
- **Better Organization**: Clear separation of configuration and logic
- **Easier Maintenance**: Single location for all setting definitions
- **Type Safety**: Comprehensive validation prevents errors

### User Experience

- **Consistent UI**: Automatic form generation ensures consistency
- **Better Help**: Rich metadata provides better user guidance
- **Improved Performance**: Efficient loading and caching
- **Error Recovery**: Graceful fallback prevents extension failure

### Maintainability

- **Centralized Configuration**: Easy to find and update settings
- **Schema Validation**: Prevents configuration errors
- **Automatic Documentation**: Schema serves as documentation
- **Version Control**: Configuration changes tracked in git

## Getting Help

### Common Resources

- [Configuration Schema Reference](../../user/reference/configuration-schema.md) - Complete schema documentation
- [Settings Manager API](../../user/reference/settings-manager-api.md) - Runtime settings management
- [Troubleshooting Guide](troubleshooting.md) - Common issues and solutions

### Support Channels

- **GitHub Issues**: Report bugs or migration problems
- **Documentation**: Check latest documentation updates
- **Examples**: Review example configurations in the repository

### Debugging Tools

```javascript
// Enable debug logging
console.log("Configuration debug info:");
console.log("Cache valid:", configLoader.isCacheValid());
console.log("Cache info:", configLoader.getCacheInfo());
console.log("Available settings:", configLoader.getSettingKeys());
console.log("Categories:", configLoader.getCategories());
```

## Conclusion

The configuration migration provides significant benefits in maintainability, extensibility, and user experience. While the migration requires careful planning and testing, the long-term benefits make it worthwhile for any serious Settings Extension integration.

Follow this guide systematically, test thoroughly, and don't hesitate to use the rollback plan if needed. The new configuration system will provide a solid foundation for your extension's settings management going forward.

## Revision History

| Date       | Author           | Changes                                                                    |
| ---------- | ---------------- | -------------------------------------------------------------------------- |
| 2025-08-15 | Development Team | Initial migration guide created for Configuration Management Consolidation |

---

**Next Steps**: After completing migration, consider reviewing the [UI Customization Guide](../how-to/customize-ui.md) to take advantage of the new automatic form generation capabilities.
