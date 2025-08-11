# File Formats Reference

## Executive Summary

Complete reference for all file formats used by the Settings Extension, including export/import files, configuration templates, and backup formats. This document provides detailed specifications, examples, and validation guidelines for working with Settings Extension files.

## Scope

- **Applies to**: Settings Extension v1.0+ file formats across all browsers
- **Last Updated**: 2025-08-11
- **Status**: Approved

## File Format Overview

The Settings Extension uses JSON-based file formats for all data interchange:

| Format Type | Extension | Purpose | Version |
|-------------|-----------|---------|---------|
| Settings Export | `.json` | Complete settings backup/restore | 1.0 |
| Selective Export | `.json` | Partial settings export | 1.0 |
| Configuration Template | `.json` | Reusable settings template | 1.0 |
| Profile Export | `.json` | Named settings profile | 1.0 |

## Standard Export Format

### Basic Structure

All Settings Extension export files follow this structure:

```json
{
  "version": "1.0",
  "timestamp": "2025-08-11T10:30:00.123Z",
  "settings": {
    "setting_name": {
      "type": "setting_type",
      "value": "setting_value",
      "description": "Setting description",
      // type-specific properties
    }
  }
}
```

### Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | String | Yes | Format version identifier |
| `timestamp` | String | Yes | Export creation time (ISO 8601) |
| `settings` | Object | Yes | Container for all settings |

### Optional Metadata

Additional metadata may be included:

```json
{
  "version": "1.0",
  "timestamp": "2025-08-11T10:30:00.123Z",
  "export_type": "complete",
  "exported_by": "Settings Extension v1.0",
  "user_agent": "Chrome/91.0.4472.124",
  "settings_count": 5,
  "file_size": 1024,
  "settings": {
    // ... settings data
  }
}
```

## Complete Export Format

### Full Settings Export

A complete export contains all extension settings:

```json
{
  "version": "1.0",
  "timestamp": "2025-08-11T10:30:00.123Z",
  "export_type": "complete",
  "exported_by": "Settings Extension v1.0",
  "settings": {
    "feature_enabled": {
      "type": "boolean",
      "value": true,
      "description": "Enable main feature functionality"
    },
    "api_key": {
      "type": "text",
      "value": "api_key_1234567890abcdef",
      "description": "API key for external service",
      "maxLength": 100
    },
    "custom_css": {
      "type": "longtext",
      "value": "/* Custom CSS styles */\n.example {\n  color: blue;\n  font-size: 14px;\n}\n\n.highlight {\n  background: yellow;\n}",
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
        "endpoint": "https://api.example.com/v1",
        "timeout": 5000,
        "retries": 3,
        "headers": {
          "User-Agent": "SettingsExtension/1.0",
          "Accept": "application/json"
        },
        "features": {
          "caching": true,
          "compression": true,
          "keepAlive": false
        }
      },
      "description": "Advanced configuration object"
    }
  }
}
```

### File Naming Convention

Complete exports use this naming pattern:
```
settings-extension-backup-YYYY-MM-DD-HH-MM-SS.json
```

Example:
```
settings-extension-backup-2025-08-11-10-30-00.json
```

## Selective Export Format

### Partial Settings Export

Selective exports contain only specified settings:

```json
{
  "version": "1.0",
  "timestamp": "2025-08-11T10:30:00.123Z",
  "export_type": "selective",
  "selection_criteria": "team_shared",
  "included_settings": ["feature_enabled", "refresh_interval", "custom_css"],
  "excluded_settings": ["api_key", "advanced_config"],
  "settings": {
    "feature_enabled": {
      "type": "boolean",
      "value": true,
      "description": "Enable main feature functionality"
    },
    "refresh_interval": {
      "type": "number",
      "value": 60,
      "description": "Auto-refresh interval in seconds",
      "min": 1,
      "max": 3600
    },
    "custom_css": {
      "type": "longtext",
      "value": "/* Team standard CSS */\n.shared-style { color: #333; }",
      "description": "Team-standard CSS styles",
      "maxLength": 50000
    }
  }
}
```

### Selective Export Metadata

| Field | Type | Description |
|-------|------|-------------|
| `export_type` | String | Always "selective" |
| `selection_criteria` | String | Reason for selection (optional) |
| `included_settings` | Array | List of included setting keys |
| `excluded_settings` | Array | List of excluded setting keys |

## Profile Export Format

### Named Profile Export

Profile exports include profile-specific metadata:

```json
{
  "version": "1.0",
  "timestamp": "2025-08-11T10:30:00.123Z",
  "export_type": "profile",
  "profile_name": "development_environment",
  "profile_description": "Development environment configuration for Project Alpha",
  "profile_version": "2.1",
  "created_by": "john.smith@company.com",
  "last_modified": "2025-08-11T10:30:00.123Z",
  "usage_instructions": "Import on development machines only. Update API key after import.",
  "settings": {
    "feature_enabled": {
      "type": "boolean",
      "value": true,
      "description": "Enable all features for development"
    },
    "api_key": {
      "type": "text",
      "value": "DEV_API_KEY_PLACEHOLDER",
      "description": "Development API key - REPLACE AFTER IMPORT",
      "maxLength": 100
    },
    "refresh_interval": {
      "type": "number",
      "value": 10,
      "description": "Fast refresh for development",
      "min": 1,
      "max": 3600
    },
    "advanced_config": {
      "type": "json",
      "value": {
        "endpoint": "https://dev-api.example.com/v1",
        "timeout": 15000,
        "retries": 5,
        "debug": true,
        "verbose_logging": true
      },
      "description": "Development configuration with debug features"
    }
  }
}
```

### Profile Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `profile_name` | String | Yes | Unique profile identifier |
| `profile_description` | String | No | Human-readable profile purpose |
| `profile_version` | String | No | Profile version (semantic versioning) |
| `created_by` | String | No | Profile creator identification |
| `last_modified` | String | No | Last modification timestamp |
| `usage_instructions` | String | No | Instructions for using this profile |

## Template Format

### Configuration Template

Templates provide reusable configuration patterns:

```json
{
  "version": "1.0",
  "timestamp": "2025-08-11T10:30:00.123Z",
  "format_type": "template",
  "template_name": "api_integration_template",
  "template_description": "Standard template for API integration setups",
  "template_version": "1.0",
  "template_category": "integration",
  "placeholders": {
    "API_ENDPOINT_URL": {
      "description": "Replace with actual API endpoint",
      "example": "https://api.yourservice.com/v1"
    },
    "API_KEY_PLACEHOLDER": {
      "description": "Replace with actual API key",
      "security": "sensitive"
    },
    "REFRESH_RATE": {
      "description": "Replace with desired refresh rate in seconds",
      "type": "number",
      "range": "1-3600"
    }
  },
  "settings": {
    "feature_enabled": {
      "type": "boolean",
      "value": true,
      "description": "Enable API integration features"
    },
    "api_key": {
      "type": "text",
      "value": "{{API_KEY_PLACEHOLDER}}",
      "description": "API key for service authentication",
      "maxLength": 100
    },
    "refresh_interval": {
      "type": "number",
      "value": "{{REFRESH_RATE}}",
      "description": "API polling interval in seconds",
      "min": 1,
      "max": 3600
    },
    "advanced_config": {
      "type": "json",
      "value": {
        "endpoint": "{{API_ENDPOINT_URL}}",
        "timeout": 5000,
        "retries": 3,
        "headers": {
          "User-Agent": "SettingsExtension/1.0"
        }
      },
      "description": "API integration configuration"
    }
  }
}
```

### Template Processing

Templates use mustache-style placeholders:
- `{{PLACEHOLDER_NAME}}` for simple replacements
- Placeholders documented in `placeholders` section
- Processing replaces placeholders with actual values

## Validation Schema

### JSON Schema for Export Format

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "timestamp", "settings"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^[0-9]+\\.[0-9]+$"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "export_type": {
      "type": "string",
      "enum": ["complete", "selective", "profile", "template"]
    },
    "settings": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z_][a-zA-Z0-9_]*$": {
          "type": "object",
          "required": ["type", "value", "description"],
          "properties": {
            "type": {
              "type": "string",
              "enum": ["boolean", "text", "longtext", "number", "json"]
            },
            "value": true,
            "description": {
              "type": "string"
            }
          }
        }
      }
    }
  }
}
```

### Setting Type Schemas

#### Boolean Setting Schema

```json
{
  "type": "object",
  "required": ["type", "value", "description"],
  "properties": {
    "type": {
      "type": "string",
      "const": "boolean"
    },
    "value": {
      "type": "boolean"
    },
    "description": {
      "type": "string"
    }
  },
  "additionalProperties": false
}
```

#### Text Setting Schema

```json
{
  "type": "object",
  "required": ["type", "value", "description"],
  "properties": {
    "type": {
      "type": "string",
      "const": "text"
    },
    "value": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "maxLength": {
      "type": "integer",
      "minimum": 1
    }
  },
  "additionalProperties": false
}
```

#### Number Setting Schema

```json
{
  "type": "object",
  "required": ["type", "value", "description"],
  "properties": {
    "type": {
      "type": "string",
      "const": "number"
    },
    "value": {
      "type": "number"
    },
    "description": {
      "type": "string"
    },
    "min": {
      "type": "number"
    },
    "max": {
      "type": "number"
    }
  },
  "additionalProperties": false
}
```

## File Size Considerations

### Typical File Sizes

| Content Type | Size Range | Example |
|--------------|------------|---------|
| Minimal configuration | 500B - 2KB | Basic settings only |
| Standard configuration | 2KB - 10KB | All settings with moderate CSS |
| Large CSS configuration | 10KB - 100KB | Extensive custom CSS |
| Complex JSON configuration | 5KB - 50KB | Large advanced_config objects |

### Size Optimization

**Reduce File Size**:
- Remove unnecessary metadata
- Minify CSS in custom_css settings
- Compress JSON objects
- Remove comments and extra whitespace

**Example Minimized Export**:
```json
{"version":"1.0","timestamp":"2025-08-11T10:30:00.123Z","settings":{"feature_enabled":{"type":"boolean","value":true,"description":"Enable main feature functionality"},"api_key":{"type":"text","value":"","description":"API key for external service","maxLength":100}}}
```

## Character Encoding and Special Characters

### UTF-8 Support

All files use UTF-8 encoding and support:
- International characters
- Emojis and symbols
- Mathematical notation
- Special punctuation

### JSON Escaping

Special characters require proper escaping in JSON:

```json
{
  "custom_css": {
    "type": "longtext",
    "value": "/* CSS with special characters */\n.quote::before {\n  content: \"\\\"Hello World\\\"\";\n}\n.path {\n  background: url('data:image/svg+xml;utf8,<svg>...</svg>');\n}",
    "description": "CSS with quotes and special characters"
  }
}
```

### Common Escaping Rules

| Character | JSON Escaped | Usage |
|-----------|--------------|-------|
| `"` | `\"` | Within strings |
| `\` | `\\` | Backslash |
| `/` | `\/` | Forward slash (optional) |
| Newline | `\n` | Line breaks |
| Tab | `\t` | Indentation |
| Return | `\r` | Carriage return |

## Compatibility and Migration

### Version Compatibility

| File Version | Extension Version | Compatibility |
|--------------|-------------------|---------------|
| 1.0 | 1.0.x | Full |
| 1.0 | Future versions | Backward compatible |

### Migration Considerations

When updating file formats:

**Backward Compatibility**:
- New optional fields don't break old parsers
- Required fields remain consistent
- Type definitions remain stable

**Forward Compatibility**:
- Ignore unknown fields
- Validate known fields only
- Provide meaningful error messages

### Format Migration Example

```javascript
function migrateFileFormat(fileContent) {
  const data = JSON.parse(fileContent);
  
  // Check version
  if (!data.version) {
    // Assume version 0.9, migrate to 1.0
    data.version = "1.0";
    data.timestamp = new Date().toISOString();
  }
  
  // Migrate settings structure if needed
  if (data.version === "1.0") {
    // Already current format
    return data;
  }
  
  // Handle future versions
  if (parseFloat(data.version) > 1.0) {
    console.warn("File format newer than supported version");
  }
  
  return data;
}
```

## File Validation

### Validation Functions

#### Basic File Validation

```javascript
function validateSettingsFile(fileContent) {
  try {
    const data = JSON.parse(fileContent);
    
    // Check required fields
    if (!data.version) throw new Error("Missing version field");
    if (!data.timestamp) throw new Error("Missing timestamp field");
    if (!data.settings) throw new Error("Missing settings object");
    
    // Validate version format
    if (!/^[0-9]+\.[0-9]+$/.test(data.version)) {
      throw new Error("Invalid version format");
    }
    
    // Validate timestamp
    if (isNaN(Date.parse(data.timestamp))) {
      throw new Error("Invalid timestamp format");
    }
    
    // Validate settings
    for (const [key, setting] of Object.entries(data.settings)) {
      validateSetting(key, setting);
    }
    
    return { valid: true, data: data };
    
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function validateSetting(key, setting) {
  if (!setting.type) throw new Error(`Setting '${key}' missing type`);
  if (!setting.hasOwnProperty('value')) throw new Error(`Setting '${key}' missing value`);
  if (!setting.description) throw new Error(`Setting '${key}' missing description`);
  
  // Type-specific validation
  switch (setting.type) {
    case 'boolean':
      if (typeof setting.value !== 'boolean') {
        throw new Error(`Setting '${key}' value must be boolean`);
      }
      break;
    case 'text':
    case 'longtext':
      if (typeof setting.value !== 'string') {
        throw new Error(`Setting '${key}' value must be string`);
      }
      if (setting.maxLength && setting.value.length > setting.maxLength) {
        throw new Error(`Setting '${key}' exceeds maxLength`);
      }
      break;
    case 'number':
      if (typeof setting.value !== 'number' || isNaN(setting.value)) {
        throw new Error(`Setting '${key}' value must be valid number`);
      }
      break;
    case 'json':
      if (typeof setting.value !== 'object' || setting.value === null) {
        throw new Error(`Setting '${key}' value must be object`);
      }
      break;
    default:
      throw new Error(`Setting '${key}' has unknown type: ${setting.type}`);
  }
}
```

#### File Integrity Check

```javascript
function checkFileIntegrity(fileContent) {
  const checks = {
    json_valid: false,
    size_reasonable: false,
    required_fields: false,
    settings_valid: false
  };
  
  try {
    // Parse JSON
    const data = JSON.parse(fileContent);
    checks.json_valid = true;
    
    // Check file size (should be under 10MB)
    const fileSize = new Blob([fileContent]).size;
    checks.size_reasonable = fileSize < 10 * 1024 * 1024;
    
    // Check required fields
    checks.required_fields = 
      data.version && 
      data.timestamp && 
      data.settings &&
      typeof data.settings === 'object';
    
    // Validate settings
    if (checks.required_fields) {
      let validSettings = 0;
      for (const [key, setting] of Object.entries(data.settings)) {
        try {
          validateSetting(key, setting);
          validSettings++;
        } catch (e) {
          // Invalid setting found
        }
      }
      checks.settings_valid = validSettings > 0;
    }
    
  } catch (error) {
    // JSON parsing failed
  }
  
  return checks;
}
```

## Error Handling

### Common File Errors

**Syntax Errors**:
```json
// Invalid JSON - missing quotes
{
  version: "1.0",
  settings: {}
}

// Valid JSON - properly quoted
{
  "version": "1.0",
  "settings": {}
}
```

**Structure Errors**:
```json
// Invalid - missing required fields
{
  "version": "1.0"
}

// Valid - all required fields present
{
  "version": "1.0",
  "timestamp": "2025-08-11T10:30:00.123Z",
  "settings": {}
}
```

**Type Errors**:
```json
// Invalid - wrong type for boolean
{
  "feature_enabled": {
    "type": "boolean",
    "value": "true"  // Should be boolean true
  }
}

// Valid - correct boolean type
{
  "feature_enabled": {
    "type": "boolean", 
    "value": true
  }
}
```

### Error Recovery Strategies

1. **Partial Import**: Import valid settings, skip invalid ones
2. **Schema Migration**: Convert old formats to current format
3. **Validation Repair**: Fix common validation issues automatically
4. **User Correction**: Prompt user to fix specific issues

## Best Practices

### File Creation
- Always use UTF-8 encoding
- Include proper timestamps
- Validate before saving
- Use descriptive filenames
- Add metadata for context

### File Sharing
- Remove sensitive information (API keys)
- Include usage instructions
- Document any placeholders
- Version your shared files
- Test imports before sharing

### File Storage
- Keep backups in multiple locations
- Use version control for important configurations
- Organize files in logical folder structures
- Clean up old/unused files regularly
- Monitor file sizes for bloat

## Quick Reference

### File Extensions
- `.json` - All Settings Extension files use JSON format

### Required Fields
- `version` - Format version string
- `timestamp` - ISO 8601 datetime
- `settings` - Settings object container

### Validation Tools
- JSON validators (jsonlint.com, jq command line)
- Schema validation (ajv library)
- Custom validation functions (provided above)

### Size Limits
- Practical limit: ~10MB per file
- Recommended: Under 1MB for performance
- Browser storage may impose additional limits

## References

- [Settings Types Reference](settings-types.md) - Detailed setting type specifications
- [Configuration Reference](configuration.md) - Complete configuration options
- [Export/Import Guide](../how-to/export-import.md) - Working with settings files
- [JSON Schema](https://json-schema.org/) - JSON Schema specification

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-08-11 | Documentation Team | Initial file formats reference |