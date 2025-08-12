# Settings Types Reference

## Executive Summary

Complete reference documentation for all setting types supported by the Settings Extension. This document provides detailed information about each setting type, their validation rules, usage examples, and best practices for configuration.

## Scope

- **Applies to**: Settings Extension v1.0+ for all supported browsers
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Setting Type Overview

The Settings Extension supports five core setting types:

| Type       | Description       | Use Case                       | Value Examples           |
| ---------- | ----------------- | ------------------------------ | ------------------------ |
| `boolean`  | True/false toggle | Feature flags, on/off switches | `true`, `false`          |
| `text`     | Short text input  | API keys, URLs, names          | `"api.example.com"`      |
| `longtext` | Multi-line text   | CSS, scripts, large content    | `"/* CSS */\n.class {}"` |
| `number`   | Numeric input     | Intervals, counts, limits      | `60`, `3.14`, `-5`       |
| `json`     | Complex objects   | Advanced configurations        | `{"key": "value"}`       |

## Boolean Settings

### Description

Boolean settings represent simple true/false values, displayed as toggle switches in the interface.

### Setting Structure

```json
{
  "setting_name": {
    "type": "boolean",
    "value": true,
    "description": "Human readable description of the setting"
  }
}
```

### Properties

| Property      | Required | Type      | Description               |
| ------------- | -------- | --------- | ------------------------- |
| `type`        | Yes      | `string`  | Must be `"boolean"`       |
| `value`       | Yes      | `boolean` | `true` or `false`         |
| `description` | Yes      | `string`  | User-friendly description |

### Validation Rules

- **Type Validation**: Value must be exactly `true` or `false` (boolean type)
- **No Strings**: `"true"` or `"false"` strings are invalid
- **No Numbers**: `1` or `0` are invalid

### Examples

#### Feature Toggle

```json
{
  "feature_enabled": {
    "type": "boolean",
    "value": true,
    "description": "Enable main feature functionality"
  }
}
```

#### Debug Mode

```json
{
  "debug_mode": {
    "type": "boolean",
    "value": false,
    "description": "Enable debug logging and verbose output"
  }
}
```

#### Auto-sync

```json
{
  "auto_sync_enabled": {
    "type": "boolean",
    "value": true,
    "description": "Automatically synchronize settings across devices"
  }
}
```

### Best Practices

**Naming Conventions**

- Use descriptive names ending in `_enabled`, `_mode`, or `_active`
- Examples: `feature_enabled`, `debug_mode`, `sync_active`

**Default Values**

- Choose safe defaults (usually `false` for new features)
- Consider impact of `true` vs `false` on user experience
- Document the default behavior clearly

**Descriptions**

- Explain what happens when enabled/disabled
- Use action-oriented language
- Be specific about the impact

## Text Settings

### Description

Text settings store short strings of text, typically under 100-500 characters. Used for URLs, API keys, usernames, and other textual data.

### Setting Structure

```json
{
  "setting_name": {
    "type": "text",
    "value": "example value",
    "description": "Description of the text setting",
    "maxLength": 100
  }
}
```

### Properties

| Property      | Required | Type     | Description               |
| ------------- | -------- | -------- | ------------------------- |
| `type`        | Yes      | `string` | Must be `"text"`          |
| `value`       | Yes      | `string` | Text content              |
| `description` | Yes      | `string` | User-friendly description |
| `maxLength`   | No       | `number` | Maximum character limit   |

### Validation Rules

- **Type Validation**: Value must be a string
- **Length Validation**: If `maxLength` is set, string cannot exceed this limit
- **Character Encoding**: Supports UTF-8 characters
- **Empty Values**: Empty strings `""` are valid

### Examples

#### API Key

```json
{
  "api_key": {
    "type": "text",
    "value": "",
    "description": "API key for external service authentication",
    "maxLength": 64
  }
}
```

#### Server URL

```json
{
  "server_url": {
    "type": "text",
    "value": "https://api.example.com",
    "description": "Base URL for API requests",
    "maxLength": 200
  }
}
```

#### User Identifier

```json
{
  "user_id": {
    "type": "text",
    "value": "user123",
    "description": "Unique user identifier",
    "maxLength": 50
  }
}
```

### Best Practices

**Security Considerations**

- Never store passwords or sensitive tokens in text settings
- Consider if the setting value should be hidden in the UI
- Document security requirements for API keys

**Validation**

- Always set appropriate `maxLength` values
- Consider if empty values should be allowed
- Validate format (URLs, emails) when appropriate

**User Experience**

- Provide clear examples in descriptions
- Use placeholder text to guide input
- Show character count for limited fields

## Long Text Settings

### Description

Long text settings store multi-line text content such as CSS, HTML, JavaScript, configuration files, or large text blocks.

### Setting Structure

```json
{
  "setting_name": {
    "type": "longtext",
    "value": "Multi-line\ntext content\nhere",
    "description": "Description of the long text setting",
    "maxLength": 10000
  }
}
```

### Properties

| Property      | Required | Type     | Description               |
| ------------- | -------- | -------- | ------------------------- |
| `type`        | Yes      | `string` | Must be `"longtext"`      |
| `value`       | Yes      | `string` | Multi-line text content   |
| `description` | Yes      | `string` | User-friendly description |
| `maxLength`   | No       | `number` | Maximum character limit   |

### Validation Rules

- **Type Validation**: Value must be a string
- **Length Validation**: If `maxLength` is set, content cannot exceed this limit
- **Line Breaks**: Supports `\n`, `\r\n`, and other line break formats
- **Special Characters**: Supports full UTF-8 character set
- **JSON Escaping**: Newlines and quotes are properly escaped in JSON

### Examples

#### Custom CSS

```json
{
  "custom_css": {
    "type": "longtext",
    "value": "/* Custom CSS styles */\n.example {\n  color: blue;\n  font-size: 14px;\n}\n\n.highlight {\n  background: yellow;\n}",
    "description": "Custom CSS for content injection",
    "maxLength": 50000
  }
}
```

#### JavaScript Code

```json
{
  "custom_script": {
    "type": "longtext",
    "value": "// Custom JavaScript\nfunction initialize() {\n  console.log('Extension loaded');\n  setupEventHandlers();\n}",
    "description": "Custom JavaScript code to execute",
    "maxLength": 25000
  }
}
```

#### Configuration Template

```json
{
  "config_template": {
    "type": "longtext",
    "value": "# Configuration Template\nserver_host: localhost\nserver_port: 8080\ndebug: true\nfeatures:\n  - feature1\n  - feature2",
    "description": "YAML configuration template",
    "maxLength": 10000
  }
}
```

### Best Practices

**Content Organization**

- Use clear indentation and formatting
- Include comments to explain complex sections
- Break long content into logical sections

**Performance Considerations**

- Set reasonable `maxLength` limits (typically 10,000-100,000 characters)
- Consider impact of large text blocks on storage and sync
- Monitor memory usage for very large content

**Editing Experience**

- Provide syntax highlighting when possible
- Support common keyboard shortcuts (Tab for indentation)
- Consider providing templates or examples

## Number Settings

### Description

Number settings store numeric values including integers, floating-point numbers, and negative numbers. Used for timeouts, intervals, limits, and measurements.

### Setting Structure

```json
{
  "setting_name": {
    "type": "number",
    "value": 60,
    "description": "Description of the number setting",
    "min": 1,
    "max": 3600
  }
}
```

### Properties

| Property      | Required | Type     | Description               |
| ------------- | -------- | -------- | ------------------------- |
| `type`        | Yes      | `string` | Must be `"number"`        |
| `value`       | Yes      | `number` | Numeric value             |
| `description` | Yes      | `string` | User-friendly description |
| `min`         | No       | `number` | Minimum allowed value     |
| `max`         | No       | `number` | Maximum allowed value     |

### Validation Rules

- **Type Validation**: Value must be a valid number (integer or float)
- **Range Validation**: Value must be within `min` and `max` bounds if specified
- **Special Values**: `NaN`, `Infinity`, and `-Infinity` are not allowed
- **Precision**: Floating-point precision is preserved

### Examples

#### Timeout Setting

```json
{
  "request_timeout": {
    "type": "number",
    "value": 5000,
    "description": "HTTP request timeout in milliseconds",
    "min": 1000,
    "max": 60000
  }
}
```

#### Refresh Interval

```json
{
  "refresh_interval": {
    "type": "number",
    "value": 60,
    "description": "Auto-refresh interval in seconds",
    "min": 1,
    "max": 3600
  }
}
```

#### Percentage Value

```json
{
  "opacity_level": {
    "type": "number",
    "value": 0.8,
    "description": "Interface opacity (0.0 to 1.0)",
    "min": 0.0,
    "max": 1.0
  }
}
```

#### Counter Setting

```json
{
  "max_retries": {
    "type": "number",
    "value": 3,
    "description": "Maximum number of retry attempts",
    "min": 0,
    "max": 10
  }
}
```

### Best Practices

**Range Definition**

- Always set appropriate `min` and `max` values
- Consider real-world usage constraints
- Document units clearly (seconds, milliseconds, pixels, etc.)

**Default Values**

- Choose safe, commonly used defaults
- Consider performance implications
- Test default values thoroughly

**User Interface**

- Show units in the description or interface
- Provide step increments for common values
- Consider using sliders for ranges

## JSON Settings

### Description

JSON settings store complex objects, arrays, and nested data structures. Used for advanced configurations, API responses, and structured data.

### Setting Structure

```json
{
  "setting_name": {
    "type": "json",
    "value": {
      "key1": "value1",
      "key2": 123,
      "nested": {
        "array": [1, 2, 3]
      }
    },
    "description": "Description of the JSON setting"
  }
}
```

### Properties

| Property      | Required | Type     | Description                 |
| ------------- | -------- | -------- | --------------------------- |
| `type`        | Yes      | `string` | Must be `"json"`            |
| `value`       | Yes      | `object` | JSON object/array/primitive |
| `description` | Yes      | `string` | User-friendly description   |

### Validation Rules

- **JSON Validity**: Value must be valid JSON (object, array, or primitive)
- **Circular References**: Objects cannot contain circular references
- **Serialization**: Must be serializable with `JSON.stringify()`
- **Type Support**: Supports objects, arrays, strings, numbers, booleans, null

### Examples

#### API Configuration

```json
{
  "api_config": {
    "type": "json",
    "value": {
      "endpoint": "https://api.example.com/v1",
      "timeout": 5000,
      "retries": 3,
      "headers": {
        "User-Agent": "SettingsExtension/1.0",
        "Accept": "application/json"
      },
      "auth": {
        "type": "bearer",
        "required": true
      }
    },
    "description": "API client configuration object"
  }
}
```

#### Feature Flags

```json
{
  "feature_flags": {
    "type": "json",
    "value": {
      "experimental_ui": false,
      "beta_features": true,
      "debug_panel": false,
      "advanced_sync": true,
      "version": "1.2.0"
    },
    "description": "Feature flag configuration"
  }
}
```

#### Array Configuration

```json
{
  "allowed_domains": {
    "type": "json",
    "value": [
      "example.com",
      "api.example.com",
      "cdn.example.com",
      "*.example.org"
    ],
    "description": "List of allowed domains for API requests"
  }
}
```

#### Nested Configuration

```json
{
  "theme_config": {
    "type": "json",
    "value": {
      "colors": {
        "primary": "#3498db",
        "secondary": "#2ecc71",
        "danger": "#e74c3c"
      },
      "typography": {
        "fonts": ["Helvetica", "Arial", "sans-serif"],
        "sizes": {
          "small": 12,
          "medium": 14,
          "large": 16
        }
      },
      "layout": {
        "sidebar_width": 250,
        "header_height": 60,
        "responsive_breakpoints": [768, 1024, 1440]
      }
    },
    "description": "Complete theme configuration object"
  }
}
```

### Best Practices

**Structure Design**

- Use consistent naming conventions for object keys
- Group related properties together
- Keep nesting levels reasonable (avoid deep nesting)
- Use arrays for lists and collections

**Validation and Safety**

- Validate JSON structure before saving
- Provide schema documentation for complex objects
- Handle invalid JSON gracefully
- Consider default fallback values

**Documentation**

- Document expected object structure
- Provide examples of valid configurations
- Explain the purpose of each property
- Include type information for complex objects

## Setting Metadata

### Common Metadata Properties

All settings support these optional metadata properties:

#### Internal Metadata

```json
{
  "setting_name": {
    "type": "text",
    "value": "example",
    "description": "User-visible description",
    "_internal_id": "unique_setting_identifier",
    "_created": "2025-08-11T10:30:00Z",
    "_modified": "2025-08-11T14:20:00Z",
    "_version": "1.0"
  }
}
```

#### Validation Metadata

```json
{
  "setting_name": {
    "type": "number",
    "value": 60,
    "description": "Refresh interval",
    "_validation": {
      "required": true,
      "format": "integer",
      "unit": "seconds"
    },
    "_constraints": {
      "performance_impact": "medium",
      "network_dependent": true
    }
  }
}
```

#### UI Metadata

```json
{
  "setting_name": {
    "type": "text",
    "value": "api.example.com",
    "description": "API endpoint URL",
    "_ui": {
      "category": "API Configuration",
      "order": 10,
      "advanced": false,
      "placeholder": "Enter API endpoint URL"
    }
  }
}
```

### Reserved Property Names

Avoid these reserved names for custom properties:

- `type` - Setting type identifier
- `value` - Setting value
- `description` - User description
- `min`, `max` - Number constraints
- `maxLength` - String length constraint
- Properties starting with `_` - Internal use

## Validation Error Messages

### Common Validation Errors

**Boolean Type Errors**

```
Error: "Feature enabled must be a boolean"
Cause: Value is not true/false
Fix: Use boolean true or false, not strings or numbers
```

**Text Length Errors**

```
Error: "API key exceeds maximum length of 100"
Cause: Text string is too long
Fix: Shorten text or increase maxLength limit
```

**Number Range Errors**

```
Error: "Refresh interval must be at least 1"
Cause: Number is below minimum value
Fix: Use value within specified min/max range
```

**JSON Format Errors**

```
Error: "Advanced config contains circular references"
Cause: Object references itself
Fix: Remove circular references from JSON object
```

### Validation Best Practices

**Error Messages**

- Include setting description in error messages
- Explain what values are valid
- Provide examples of correct values
- Reference documentation when helpful

**Error Handling**

- Validate before saving settings
- Provide immediate feedback to users
- Allow correction without losing other changes
- Log validation errors for debugging

## Migration and Compatibility

### Setting Type Changes

When changing setting types, consider compatibility:

**Safe Changes** (Usually compatible)

- Adding optional metadata properties
- Increasing maxLength limits
- Expanding min/max ranges for numbers
- Adding new optional properties to JSON objects

**Breaking Changes** (Require migration)

- Changing from one type to another
- Reducing maxLength, min, or max constraints
- Removing required properties from JSON objects
- Changing JSON object structure significantly

### Migration Strategies

#### Type Conversion

```javascript
// Example: Converting text to number
function migrateTextToNumber(oldValue, newConstraints) {
  const numValue = parseFloat(oldValue);
  if (isNaN(numValue)) {
    return newConstraints.default || 0;
  }
  return Math.min(Math.max(numValue, newConstraints.min), newConstraints.max);
}
```

#### JSON Structure Migration

```javascript
// Example: Migrating JSON object structure
function migrateApiConfig(oldConfig) {
  return {
    endpoint: oldConfig.url || oldConfig.endpoint,
    timeout: oldConfig.timeout || 5000,
    retries: oldConfig.retry_count || 3,
    headers: oldConfig.headers || {},
  };
}
```

## Quick Reference

### Setting Type Summary

| Type       | Value Type     | Constraints  | Best For                         |
| ---------- | -------------- | ------------ | -------------------------------- |
| `boolean`  | `boolean`      | None         | Feature toggles, on/off switches |
| `text`     | `string`       | `maxLength`  | Short text, URLs, identifiers    |
| `longtext` | `string`       | `maxLength`  | CSS, scripts, large content      |
| `number`   | `number`       | `min`, `max` | Counts, intervals, measurements  |
| `json`     | `object/array` | Valid JSON   | Complex configurations, objects  |

### Validation Checklist

**Before Adding New Settings:**

- [ ] Choose appropriate setting type
- [ ] Set reasonable constraints (min/max/maxLength)
- [ ] Write clear, descriptive descriptions
- [ ] Choose safe default values
- [ ] Test with edge cases
- [ ] Document expected formats/examples

**Before Changing Existing Settings:**

- [ ] Assess compatibility impact
- [ ] Plan migration strategy if needed
- [ ] Test with existing user data
- [ ] Update documentation
- [ ] Communicate changes to users

## Examples and Templates

### Complete Setting Examples

```json
{
  "complete_examples": {
    "feature_toggle": {
      "type": "boolean",
      "value": true,
      "description": "Enable experimental features"
    },
    "api_endpoint": {
      "type": "text",
      "value": "https://api.example.com/v1",
      "description": "Base URL for API requests",
      "maxLength": 200
    },
    "custom_stylesheet": {
      "type": "longtext",
      "value": "/* Custom styles */\n.container { padding: 10px; }",
      "description": "Custom CSS to inject into pages",
      "maxLength": 25000
    },
    "polling_interval": {
      "type": "number",
      "value": 30,
      "description": "Data polling interval in seconds",
      "min": 5,
      "max": 300
    },
    "service_config": {
      "type": "json",
      "value": {
        "enabled": true,
        "endpoints": ["api.service.com", "backup.service.com"],
        "auth": {
          "method": "oauth",
          "scopes": ["read", "write"]
        }
      },
      "description": "External service configuration"
    }
  }
}
```

## References

- [Configuration Reference](configuration.md) - Complete settings configuration options
- [File Formats Reference](file-formats.md) - Settings file structure and format
- [Getting Started Tutorial](../tutorials/getting-started.md) - Basic settings usage
- [Export/Import Guide](../how-to/export-import.md) - Working with settings files

## Revision History

| Date       | Author             | Changes                          |
| ---------- | ------------------ | -------------------------------- |
| 2025-08-11 | Documentation Team | Initial settings types reference |
