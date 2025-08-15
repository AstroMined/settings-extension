# Configuration Schema API Reference

## Executive Summary

Complete reference for the Settings Extension configuration schema, defining how settings are structured in `config/defaults.json`. This document serves as the authoritative guide for developers integrating with or extending the Settings Extension framework.

**Scope**: Configuration schema definition, validation rules, and extension patterns  
**Last Updated**: 2025-08-15  
**Status**: Approved

## Overview

The Settings Extension uses a centralized configuration schema to define all settings in a single source of truth: `config/defaults.json`. This schema includes setting definitions, UI metadata, validation constraints, and display properties.

### Key Benefits

- **Single Source of Truth**: All configuration in one location
- **Rich Metadata**: Display names, categories, help text, and UI properties
- **Type Safety**: Comprehensive validation for all setting types
- **Extensibility**: Easy to add new settings without code changes
- **UI Generation**: Automatic form generation from schema

## Schema Structure

### Root Configuration Object

The root configuration is a JSON object where each key represents a setting identifier and each value is a setting configuration object.

```json
{
  "setting_key": {
    // Setting configuration object
  }
}
```

### Setting Configuration Object

Each setting must include these core properties:

#### Required Properties

| Property      | Type   | Description                                             |
| ------------- | ------ | ------------------------------------------------------- |
| `type`        | string | Setting data type (see [Setting Types](#setting-types)) |
| `value`       | any    | Default value matching the specified type               |
| `description` | string | Technical description for developers                    |

#### Optional Properties

| Property      | Type   | Description                       |
| ------------- | ------ | --------------------------------- |
| `displayName` | string | Human-readable label for UI       |
| `category`    | string | Logical grouping for organization |
| `helpText`    | string | User-friendly help text           |
| `order`       | number | Sort order within category        |
| `placeholder` | string | Input placeholder text            |
| `validation`  | string | Additional validation rules       |

#### Type-Specific Properties

Some setting types support additional validation and configuration properties (see [Setting Types](#setting-types) for details).

## Setting Types

### Boolean Type

Simple true/false toggles.

```json
{
  "feature_enabled": {
    "type": "boolean",
    "value": true,
    "description": "Enable main feature functionality",
    "displayName": "Enable Main Feature",
    "category": "general",
    "helpText": "Toggle this to enable/disable the main functionality",
    "order": 1
  }
}
```

**Properties:**

- `value`: Must be `true` or `false`
- No additional validation properties

### Text Type

Single-line text input with optional length constraints.

```json
{
  "api_key": {
    "type": "text",
    "value": "",
    "description": "API key for external service",
    "displayName": "API Key",
    "category": "general",
    "maxLength": 100,
    "placeholder": "Enter your API key...",
    "validation": "required",
    "helpText": "Required API key for connecting to external services",
    "order": 2
  }
}
```

**Additional Properties:**

- `maxLength` (number): Maximum character limit
- `placeholder` (string): Input placeholder text
- `validation` (string): Additional validation rules

### LongText Type

Multi-line text input for larger content.

```json
{
  "custom_css": {
    "type": "longtext",
    "value": "/* Custom CSS styles */\n.example { color: blue; }",
    "description": "Custom CSS for content injection",
    "displayName": "Custom CSS",
    "category": "appearance",
    "maxLength": 50000,
    "placeholder": "Enter custom CSS styles...",
    "helpText": "Custom CSS styles to inject into web pages",
    "order": 1
  }
}
```

**Additional Properties:**

- `maxLength` (number): Maximum character limit
- `placeholder` (string): Textarea placeholder text

### Number Type

Numeric input with optional range constraints.

```json
{
  "refresh_interval": {
    "type": "number",
    "value": 60,
    "description": "Auto-refresh interval in seconds",
    "displayName": "Refresh Interval",
    "category": "general",
    "min": 30,
    "max": 3600,
    "helpText": "How often to automatically refresh data (seconds)",
    "order": 3
  }
}
```

**Additional Properties:**

- `min` (number): Minimum allowed value
- `max` (number): Maximum allowed value

### Enum Type

Dropdown selection from predefined options.

```json
{
  "refresh_interval": {
    "type": "enum",
    "value": "60",
    "description": "Auto-refresh interval",
    "displayName": "Refresh Interval",
    "category": "general",
    "options": {
      "30": "30 seconds",
      "60": "1 minute",
      "300": "5 minutes",
      "900": "15 minutes",
      "1800": "30 minutes"
    },
    "helpText": "How often to automatically refresh data",
    "order": 3
  }
}
```

**Additional Properties:**

- `options` (object): Required. Key-value pairs where keys are stored values and values are display labels
- The `value` field must match one of the keys in `options`

### JSON Type

Complex object data stored as JSON.

```json
{
  "advanced_config": {
    "type": "json",
    "value": {
      "endpoint": "https://api.example.com",
      "timeout": 5000,
      "retries": 3
    },
    "description": "Advanced configuration object",
    "displayName": "Advanced Configuration",
    "category": "advanced",
    "helpText": "Advanced configuration options in JSON format",
    "order": 1
  }
}
```

**Properties:**

- `value`: Must be a valid JSON object (not string)
- Objects are automatically serialized/deserialized
- Circular references are not allowed

## Categories

Settings are organized into logical categories for UI grouping. Categories are defined implicitly by the `category` property on settings.

### Common Categories

- `general`: Basic functionality settings
- `appearance`: UI and visual customization
- `advanced`: Technical configuration options
- `security`: Privacy and security settings

### Category Properties

Categories support:

- **Automatic Discovery**: Categories are extracted from setting definitions
- **Alphabetical Sorting**: Categories are sorted alphabetically in UI
- **Display Names**: Generated from category keys (e.g., "advanced_settings" → "Advanced Settings")

### Adding New Categories

Simply assign a `category` value to any setting:

```json
{
  "new_setting": {
    "type": "boolean",
    "value": true,
    "description": "New setting",
    "category": "new_category"
  }
}
```

## Validation Rules

### Schema Validation

All settings undergo comprehensive validation:

1. **Required Fields**: `type`, `value`, `description` must be present
2. **Type Matching**: `value` must match the specified `type`
3. **Constraint Validation**: Type-specific constraints (min/max, maxLength, etc.)
4. **Enum Validation**: Default value must exist in options for enum types

### Runtime Validation

When settings are updated, values are validated against:

- Type requirements
- Range constraints (min/max for numbers)
- Length limits (maxLength for text)
- Option validity (enum types)

### Custom Validation

Additional validation can be specified using the `validation` property:

```json
{
  "email": {
    "type": "text",
    "value": "",
    "validation": "email",
    "description": "Email address"
  }
}
```

## UI Generation

The schema drives automatic UI generation:

### Form Controls

- **Boolean**: Checkbox input
- **Text**: Single-line text input
- **LongText**: Textarea (6 rows default)
- **Number**: Number input with min/max
- **Enum**: Select dropdown with options
- **JSON**: Textarea with syntax highlighting

### Labels and Help

- **Label**: Uses `displayName` or formatted key
- **Help Text**: Shows `helpText` below input
- **Placeholder**: Uses `placeholder` for inputs
- **Validation**: Real-time validation feedback

### Organization

- **Categories**: Settings grouped into tabs/sections
- **Ordering**: Settings sorted by `order` within categories
- **Responsive**: Adapts to different screen sizes

## Extension Patterns

### Adding New Settings

1. **Define in Schema**: Add to `config/defaults.json`
2. **No Code Changes**: Framework automatically picks up new settings
3. **UI Generation**: Form controls generated automatically

```json
{
  "new_feature_setting": {
    "type": "boolean",
    "value": false,
    "description": "Enable new experimental feature",
    "displayName": "New Feature",
    "category": "experimental",
    "helpText": "Toggle to enable experimental functionality",
    "order": 1
  }
}
```

### Custom Setting Types

For specialized needs, extend the validation logic:

1. **Add Type Definition**: Extend ConfigurationLoader validation
2. **Update UI**: Add form control handling
3. **Maintain Schema**: Document type in this reference

### Migration Support

When changing existing settings:

1. **Maintain Compatibility**: Keep existing keys when possible
2. **Default Values**: Provide sensible defaults for new properties
3. **Version Handling**: Consider schema versioning for major changes

## Examples

### Complete Setting Example

```json
{
  "notification_settings": {
    "type": "json",
    "value": {
      "enabled": true,
      "sound": "default",
      "frequency": "immediate"
    },
    "description": "Notification preferences configuration",
    "displayName": "Notification Settings",
    "category": "notifications",
    "helpText": "Configure how and when you receive notifications",
    "order": 1
  }
}
```

### Multi-Category Configuration

```json
{
  "ui_theme": {
    "type": "enum",
    "value": "auto",
    "options": {
      "light": "Light Mode",
      "dark": "Dark Mode",
      "auto": "Follow System"
    },
    "description": "Application theme preference",
    "displayName": "Theme",
    "category": "appearance",
    "order": 1
  },
  "debug_logging": {
    "type": "boolean",
    "value": false,
    "description": "Enable detailed logging for debugging",
    "displayName": "Debug Logging",
    "category": "advanced",
    "helpText": "Enable only when troubleshooting issues",
    "order": 1
  }
}
```

## Best Practices

### Setting Design

1. **Clear Names**: Use descriptive, unambiguous setting keys
2. **Logical Categories**: Group related settings together
3. **Helpful Descriptions**: Provide clear technical descriptions
4. **User-Friendly Labels**: Use `displayName` for better UX
5. **Informative Help**: Include `helpText` for complex settings

### Schema Organization

1. **Consistent Ordering**: Use `order` property systematically
2. **Logical Grouping**: Organize categories by user workflow
3. **Sensible Defaults**: Choose default values that work for most users
4. **Constraint Setting**: Set appropriate min/max and maxLength values

### Validation Strategy

1. **Type Safety**: Always specify correct types
2. **Range Limits**: Set realistic min/max values
3. **Length Constraints**: Prevent excessively long inputs
4. **Required Validation**: Mark essential settings appropriately

## Error Handling

### Configuration Loading Errors

- **Invalid JSON**: Syntax errors in defaults.json
- **Missing Required Fields**: Settings without type/value/description
- **Type Mismatches**: Value doesn't match specified type
- **Constraint Violations**: Values outside min/max ranges

### Fallback Behavior

When configuration loading fails:

1. **Fallback Configuration**: Minimal working settings loaded
2. **Error Logging**: Detailed error information in console
3. **User Notification**: Graceful degradation with user feedback

### Debugging

Common issues and solutions:

- **Setting Not Appearing**: Check category assignment and order
- **Validation Errors**: Verify type and constraint definitions
- **UI Issues**: Ensure all required properties are present

## API Reference

### ConfigurationLoader Class

The primary interface for working with configuration schema and settings metadata.

#### Constructor

```javascript
const configLoader = new ConfigurationLoader();
```

Creates a new configuration loader instance with null configuration state and 5-minute cache duration.

**Properties:**

- `config`: Current loaded configuration object (null until loaded)
- `configCache`: Cached configuration for performance
- `cacheTimestamp`: Timestamp of last cache update
- `CACHE_DURATION`: Cache validity period (5 minutes)

#### Core Methods

##### `loadConfiguration()` → `Promise<Object>`

Loads and validates configuration from `config/defaults.json` with caching and fallback support.

```javascript
const config = await configLoader.loadConfiguration();
// Returns: Complete configuration object with all settings
```

**Behavior:**

- Returns cached configuration if valid (within 5 minutes)
- Fetches from `chrome.runtime.getURL("config/defaults.json")`
- Validates schema using comprehensive validation rules
- Falls back to embedded configuration on any failure
- Caches result for subsequent calls

**Error Handling:**

- Network failures: Falls back to embedded configuration
- Invalid JSON: Falls back to embedded configuration
- Schema validation errors: Falls back to embedded configuration
- Logs detailed error information for debugging

##### `validateConfiguration(config)` → `void`

Validates configuration object against schema requirements.

```javascript
configLoader.validateConfiguration(configObject);
// Throws: Error if configuration is invalid
```

**Validation Rules:**

- Configuration must be valid object
- Each setting must have `type`, `value`, `description` fields
- Setting types must be: boolean, text, longtext, number, json, enum
- Enum settings must have `options` object with valid default value
- Number settings must have numeric default within min/max constraints

#### Data Access Methods

##### `getSetting(key)` → `Object|null`

Returns complete setting object for the specified key.

```javascript
const setting = configLoader.getSetting("api_key");
// Returns: { type: "text", value: "", description: "...", displayName: "...", ... }
```

##### `hasSetting(key)` → `boolean`

Checks if a setting exists in the configuration.

```javascript
const exists = configLoader.hasSetting("api_key");
// Returns: true if setting exists, false otherwise
```

##### `getSettingKeys()` → `Array<string>`

Returns array of all setting keys in the configuration.

```javascript
const keys = configLoader.getSettingKeys();
// Returns: ["feature_enabled", "api_key", "refresh_interval", ...]
```

#### Display and UI Methods

##### `getDisplayName(key)` → `string`

Returns human-readable display name for a setting.

```javascript
const displayName = configLoader.getDisplayName("api_key");
// Returns: "API Key" (from displayName) or "Api Key" (formatted key)
```

**Fallback Logic:**

- Uses `setting.displayName` if available
- Falls back to formatted key (underscores → spaces, title case)
- Works even when configuration is not loaded

##### `formatKey(key)` → `string`

Formats setting key into human-readable display name.

```javascript
const formatted = configLoader.formatKey("refresh_interval");
// Returns: "Refresh Interval"
```

#### Category Methods

##### `getCategories()` → `Array<string>`

Returns array of all category names, sorted alphabetically.

```javascript
const categories = configLoader.getCategories();
// Returns: ["advanced", "appearance", "general"]
```

##### `getCategorySettings(category)` → `Array<[string, Object]>`

Returns array of [key, setting] pairs for the specified category, sorted by order.

```javascript
const generalSettings = configLoader.getCategorySettings("general");
// Returns: [["feature_enabled", {...}], ["api_key", {...}], ...]
```

**Sorting:**

- Settings sorted by `order` property (ascending)
- Settings without `order` default to 0
- Consistent ordering for UI generation

##### `getCategoryDisplayName(category)` → `string`

Returns formatted display name for a category.

```javascript
const displayName = configLoader.getCategoryDisplayName("advanced_settings");
// Returns: "Advanced Settings"
```

#### Cache Management Methods

##### `isCacheValid()` → `boolean`

Checks if current cache is valid (within cache duration).

```javascript
const isValid = configLoader.isCacheValid();
// Returns: true if cache exists and is within 5-minute window
```

##### `clearCache()` → `void`

Clears all cached configuration data.

```javascript
configLoader.clearCache();
// Resets: config, configCache, cacheTimestamp to null
```

##### `getCacheInfo()` → `Object`

Returns detailed cache status information.

```javascript
const cacheInfo = configLoader.getCacheInfo();
// Returns: { cached: true, timestamp: 1692123456789, age: 30000, valid: true }
```

**Cache Info Properties:**

- `cached`: Boolean indicating if cache exists
- `timestamp`: Cache creation timestamp (null if no cache)
- `age`: Age in milliseconds (null if no cache)
- `valid`: Boolean indicating if cache is within duration

#### Usage Patterns

##### Basic Configuration Loading

```javascript
const configLoader = new ConfigurationLoader();
const config = await configLoader.loadConfiguration();

// Access specific setting
const apiKeySetting = configLoader.getSetting("api_key");
const defaultValue = apiKeySetting.value;
const displayName = apiKeySetting.displayName;
```

##### Dynamic UI Generation

```javascript
const configLoader = new ConfigurationLoader();
await configLoader.loadConfiguration();

// Generate category tabs
const categories = configLoader.getCategories();
for (const category of categories) {
  const categoryName = configLoader.getCategoryDisplayName(category);
  const settings = configLoader.getCategorySettings(category);

  // Create UI elements for category and settings
  renderCategoryTab(categoryName, settings);
}
```

##### Setting Display Names

```javascript
const configLoader = new ConfigurationLoader();
await configLoader.loadConfiguration();

// Get display names for form labels
const settings = configLoader.getSettingKeys();
for (const key of settings) {
  const displayName = configLoader.getDisplayName(key);
  const setting = configLoader.getSetting(key);

  // Create form input with proper label
  createFormInput(key, displayName, setting);
}
```

##### Error Handling and Fallbacks

```javascript
const configLoader = new ConfigurationLoader();

try {
  const config = await configLoader.loadConfiguration();
  console.log("Configuration loaded successfully");
} catch (error) {
  // ConfigurationLoader automatically falls back to embedded config
  // No additional error handling needed - fallback is transparent
  console.log("Using fallback configuration due to:", error.message);
}
```

#### Browser Context Support

ConfigurationLoader works across all browser extension contexts:

- **Background Script**: Service worker context with `self.browserAPI`
- **Popup**: Browser window context with `window.browserAPI`
- **Options Page**: Browser window context with `window.browserAPI`
- **Content Script**: Injected context with global `browserAPI`

#### Performance Characteristics

- **Cache Duration**: 5 minutes for optimal balance of freshness and performance
- **Loading Time**: Typically <50ms for cached configuration
- **Memory Usage**: Minimal overhead with single configuration object
- **Network Requests**: Only one request per cache period

## References

### Related Documentation

- [Settings Manager API](settings-manager-api.md) - Runtime settings management
- [UI Components Guide](../how-to/customize-ui.md) - Customizing the settings interface
- [Migration Guide](../../developer/guides/configuration-migration.md) - Migrating from embedded defaults

### External Standards

- [JSON Schema](https://json-schema.org/) - JSON validation standards
- [HTML Form Controls](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input) - Input element reference
- [Web Accessibility](https://www.w3.org/WAI/WCAG21/quickref/) - UI accessibility guidelines

## Revision History

| Date       | Author           | Changes                                                                  |
| ---------- | ---------------- | ------------------------------------------------------------------------ |
| 2025-08-15 | Development Team | Initial API reference created for Configuration Management Consolidation |

---

**Need help?** Check the [Configuration Migration Guide](../../developer/guides/configuration-migration.md) for step-by-step instructions on updating existing integrations.
