# Configuration Reference

## Executive Summary

Complete reference documentation for all configuration options available in the Settings Extension. This document details every setting, its purpose, valid values, defaults, and configuration examples for different use cases.

## Scope

- **Applies to**: Settings Extension v1.0+ for all supported browsers
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Configuration Overview

The Settings Extension includes the following configurable settings:

| Setting            | Type      | Default      | Purpose                           |
| ------------------ | --------- | ------------ | --------------------------------- |
| `feature_enabled`  | Boolean   | `true`       | Main feature functionality toggle |
| `api_key`          | Text      | `""`         | External service authentication   |
| `custom_css`       | Long Text | CSS template | Custom styling injection          |
| `refresh_interval` | Number    | `60`         | Auto-refresh timing in seconds    |
| `advanced_config`  | JSON      | Object       | Complex configuration object      |

## Core Settings

### feature_enabled

**Purpose**: Controls whether the main extension functionality is active.

**Configuration**:

```json
{
  "feature_enabled": {
    "type": "boolean",
    "value": true,
    "description": "Enable main feature functionality"
  }
}
```

**Values**:

- `true`: Extension features are active and available
- `false`: Extension features are disabled

**Default**: `true`

**Use Cases**:

- Temporarily disable extension without uninstalling
- Testing scenarios where extension should be inactive
- Administrative control over feature availability
- Debugging issues by isolating extension functionality

**Impact When Disabled**:

- Content scripts may not inject or function
- API requests may be blocked
- Custom CSS will not be applied
- Background processes may be suspended

**Best Practices**:

- Use for testing and debugging scenarios
- Consider user workflow impact before disabling
- Provide clear indication when features are disabled
- Document any dependencies that break when disabled

### api_key

**Purpose**: Stores authentication credentials for external API services.

**Configuration**:

```json
{
  "api_key": {
    "type": "text",
    "value": "",
    "description": "API key for external service",
    "maxLength": 100
  }
}
```

**Values**:

- Empty string `""`: No API key configured (default)
- Valid API key: Alphanumeric string up to 100 characters
- Format varies by service provider

**Default**: `""` (empty)

**Validation Rules**:

- Maximum length: 100 characters
- No specific format validation (depends on service)
- Empty values are allowed
- Special characters supported

**Security Considerations**:

- API keys are stored in browser's extension storage
- Not encrypted at rest (relies on browser security)
- Should not be shared in exported settings
- Consider using environment-specific keys

**Configuration Examples**:

**Development Environment**:

```json
{
  "api_key": {
    "type": "text",
    "value": "dev_1234567890abcdef",
    "description": "Development API key for testing"
  }
}
```

**Production Environment**:

```json
{
  "api_key": {
    "type": "text",
    "value": "prod_abcdef1234567890",
    "description": "Production API key"
  }
}
```

**Best Practices**:

- Use different keys for development, staging, and production
- Rotate keys regularly according to security policy
- Remove from exported settings when sharing
- Monitor API key usage for suspicious activity
- Use least-privilege API keys when possible

### custom_css

**Purpose**: Allows injection of custom CSS styles into web pages.

**Configuration**:

```json
{
  "custom_css": {
    "type": "longtext",
    "value": "/* Custom CSS styles */\n.example { color: blue; }",
    "description": "Custom CSS for content injection",
    "maxLength": 50000
  }
}
```

**Default Value**:

```css
/* Custom CSS styles */
.example {
  color: blue;
}
```

**Validation Rules**:

- Maximum length: 50,000 characters
- No CSS syntax validation (browser handles parsing)
- Supports multi-line content with proper escaping
- All UTF-8 characters supported

**CSS Features Supported**:

- Standard CSS selectors and properties
- Media queries for responsive design
- CSS animations and transitions
- Custom properties (CSS variables)
- Pseudo-selectors and pseudo-elements

**Configuration Examples**:

**Basic Styling**:

```css
/* Hide annoying elements */
.advertisement,
.popup-overlay {
  display: none !important;
}

/* Improve readability */
body {
  font-size: 14px;
  line-height: 1.6;
}
```

**Dark Theme**:

```css
/* Dark theme for websites */
body {
  background-color: #1e1e1e !important;
  color: #ffffff !important;
}

a {
  color: #4a9eff !important;
}

input,
textarea {
  background-color: #2d2d2d !important;
  color: #ffffff !important;
  border: 1px solid #555 !important;
}
```

**Performance Optimizations**:

```css
/* Disable expensive animations */
* {
  animation-duration: 0.01ms !important;
  animation-delay: -1ms !important;
  transition-duration: 0.01ms !important;
  transition-delay: -1ms !important;
}
```

**Best Practices**:

- Use `!important` judiciously to override site styles
- Test CSS on multiple websites for compatibility
- Keep CSS organized with comments
- Use specific selectors to avoid unintended effects
- Consider performance impact of complex selectors

### refresh_interval

**Purpose**: Controls the automatic refresh timing for dynamic content updates.

**Configuration**:

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

**Values**:

- Minimum: `1` second
- Maximum: `3600` seconds (1 hour)
- Default: `60` seconds

**Validation Rules**:

- Must be a positive integer
- Range: 1-3600 seconds
- No decimal values allowed
- Zero and negative values rejected

**Performance Impact**:

| Interval       | Impact           | Use Case             |
| -------------- | ---------------- | -------------------- |
| 1-5 seconds    | High CPU/Network | Real-time monitoring |
| 10-30 seconds  | Moderate         | Active development   |
| 60-300 seconds | Low              | Regular updates      |
| 600+ seconds   | Minimal          | Periodic checks      |

**Configuration Examples**:

**Real-time Monitoring**:

```json
{
  "refresh_interval": {
    "type": "number",
    "value": 5,
    "description": "Fast refresh for real-time data monitoring"
  }
}
```

**Battery Optimization**:

```json
{
  "refresh_interval": {
    "type": "number",
    "value": 300,
    "description": "Slower refresh to conserve battery"
  }
}
```

**Best Practices**:

- Balance functionality needs with performance
- Use longer intervals on battery-powered devices
- Consider network usage implications
- Test different intervals for optimal user experience
- Document the rationale for chosen intervals

### advanced_config

**Purpose**: Stores complex configuration objects for advanced features and integrations.

**Configuration**:

```json
{
  "advanced_config": {
    "type": "json",
    "value": {
      "endpoint": "https://api.example.com",
      "timeout": 5000,
      "retries": 3
    },
    "description": "Advanced configuration object"
  }
}
```

**Default Object Structure**:

```json
{
  "endpoint": "https://api.example.com",
  "timeout": 5000,
  "retries": 3
}
```

**Validation Rules**:

- Must be valid JSON object
- No circular references allowed
- Serializable with JSON.stringify()
- Supports nested objects and arrays

**Standard Properties**:

#### endpoint

- **Type**: String (URL)
- **Purpose**: Base URL for API requests
- **Example**: `"https://api.example.com/v1"`
- **Validation**: Should be valid HTTP/HTTPS URL

#### timeout

- **Type**: Number (milliseconds)
- **Purpose**: Request timeout duration
- **Range**: 1000-60000 ms (1-60 seconds)
- **Default**: 5000 ms (5 seconds)

#### retries

- **Type**: Number (integer)
- **Purpose**: Number of retry attempts for failed requests
- **Range**: 0-10 retries
- **Default**: 3 retries

**Configuration Examples**:

**Development Configuration**:

```json
{
  "advanced_config": {
    "type": "json",
    "value": {
      "endpoint": "https://dev-api.example.com/v1",
      "timeout": 10000,
      "retries": 5,
      "debug": true,
      "logging": {
        "level": "verbose",
        "console": true,
        "file": false
      },
      "features": {
        "experimental": true,
        "beta": true,
        "cache": false
      }
    }
  }
}
```

**Production Configuration**:

```json
{
  "advanced_config": {
    "type": "json",
    "value": {
      "endpoint": "https://api.example.com/v1",
      "timeout": 5000,
      "retries": 3,
      "debug": false,
      "logging": {
        "level": "error",
        "console": false,
        "file": true
      },
      "features": {
        "experimental": false,
        "beta": false,
        "cache": true
      },
      "performance": {
        "compression": true,
        "keepAlive": true,
        "pooling": true
      }
    }
  }
}
```

**High-Performance Configuration**:

```json
{
  "advanced_config": {
    "type": "json",
    "value": {
      "endpoint": "https://api.example.com/v1",
      "timeout": 3000,
      "retries": 1,
      "concurrent_requests": 10,
      "caching": {
        "enabled": true,
        "ttl": 300000,
        "maxSize": 100
      },
      "optimization": {
        "compression": "gzip",
        "keepAlive": true,
        "pipelining": true
      }
    }
  }
}
```

## Environment-Specific Configurations

### Development Environment

Optimized for development workflow:

```json
{
  "feature_enabled": {
    "type": "boolean",
    "value": true,
    "description": "Enable all features for development"
  },
  "api_key": {
    "type": "text",
    "value": "dev_api_key_12345",
    "description": "Development API key"
  },
  "custom_css": {
    "type": "longtext",
    "value": "/* Development CSS */\n.debug-info { display: block !important; }\n.error { border: 2px solid red !important; }",
    "description": "Development debugging styles"
  },
  "refresh_interval": {
    "type": "number",
    "value": 10,
    "description": "Fast refresh for development"
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
```

### Testing Environment

Optimized for testing and QA:

```json
{
  "feature_enabled": {
    "type": "boolean",
    "value": true,
    "description": "Enable features for testing"
  },
  "api_key": {
    "type": "text",
    "value": "test_api_key_67890",
    "description": "Testing environment API key"
  },
  "custom_css": {
    "type": "longtext",
    "value": "/* Testing CSS */\n.test-marker { background: yellow !important; }\n.automated-test { outline: 3px dashed green !important; }",
    "description": "Testing visibility enhancements"
  },
  "refresh_interval": {
    "type": "number",
    "value": 30,
    "description": "Moderate refresh for testing"
  },
  "advanced_config": {
    "type": "json",
    "value": {
      "endpoint": "https://test-api.example.com/v1",
      "timeout": 10000,
      "retries": 3,
      "test_mode": true,
      "mock_responses": false
    },
    "description": "Testing environment configuration"
  }
}
```

### Production Environment

Optimized for performance and reliability:

```json
{
  "feature_enabled": {
    "type": "boolean",
    "value": true,
    "description": "Enable production features"
  },
  "api_key": {
    "type": "text",
    "value": "",
    "description": "Production API key (set separately)"
  },
  "custom_css": {
    "type": "longtext",
    "value": "/* Production CSS - optimized for performance */\n.enhanced-ui { transition: opacity 0.2s ease; }",
    "description": "Production-optimized styles"
  },
  "refresh_interval": {
    "type": "number",
    "value": 120,
    "description": "Conservative refresh for production"
  },
  "advanced_config": {
    "type": "json",
    "value": {
      "endpoint": "https://api.example.com/v1",
      "timeout": 5000,
      "retries": 3,
      "debug": false,
      "caching": true,
      "compression": true
    },
    "description": "Production configuration optimized for performance"
  }
}
```

## Use Case Configurations

### Content Creator Setup

For users who create content and need visual customizations:

```json
{
  "feature_enabled": {
    "type": "boolean",
    "value": true
  },
  "custom_css": {
    "type": "longtext",
    "value": "/* Content creator enhancements */\n/* Hide distractions */\n.sidebar-ads, .recommendations { display: none !important; }\n\n/* Focus on content area */\n.content-area {\n  max-width: 100% !important;\n  margin: 0 !important;\n}\n\n/* Better typography */\nbody {\n  font-family: 'Georgia', serif !important;\n  line-height: 1.8 !important;\n}\n\n/* Highlight important elements */\nh1, h2, h3 {\n  color: #2c3e50 !important;\n  border-bottom: 2px solid #3498db !important;\n}",
    "description": "Styling optimized for content creation"
  },
  "refresh_interval": {
    "type": "number",
    "value": 300,
    "description": "Moderate refresh to avoid interrupting workflow"
  }
}
```

### Developer Tools Setup

For developers who need debugging and development features:

```json
{
  "feature_enabled": {
    "type": "boolean",
    "value": true
  },
  "custom_css": {
    "type": "longtext",
    "value": "/* Developer debugging styles */\n/* Highlight interactive elements */\na:hover, button:hover, [onclick]:hover {\n  outline: 2px solid #ff6b6b !important;\n  outline-offset: 2px !important;\n}\n\n/* Show hidden elements for debugging */\n[style*=\"display: none\"], [style*=\"visibility: hidden\"] {\n  opacity: 0.3 !important;\n  display: block !important;\n  visibility: visible !important;\n}\n\n/* Form debugging */\ninput:invalid {\n  border: 2px solid red !important;\n}\n\n/* Grid overlay for layout debugging */\nbody.debug-grid {\n  background-image: \n    linear-gradient(rgba(0,0,255,0.1) 1px, transparent 1px),\n    linear-gradient(90deg, rgba(0,0,255,0.1) 1px, transparent 1px);\n  background-size: 20px 20px;\n}",
    "description": "Development and debugging enhancements"
  },
  "refresh_interval": {
    "type": "number",
    "value": 15,
    "description": "Fast refresh for active development"
  },
  "advanced_config": {
    "type": "json",
    "value": {
      "endpoint": "https://dev-api.example.com/v1",
      "timeout": 30000,
      "retries": 1,
      "debug": true,
      "console_logging": true,
      "performance_monitoring": true,
      "error_reporting": {
        "enabled": true,
        "verbose": true,
        "stack_traces": true
      }
    }
  }
}
```

### Accessibility Setup

For users who need accessibility enhancements:

```json
{
  "feature_enabled": {
    "type": "boolean",
    "value": true
  },
  "custom_css": {
    "type": "longtext",
    "value": "/* Accessibility enhancements */\n/* High contrast mode */\nbody {\n  background: #000000 !important;\n  color: #ffffff !important;\n}\n\na {\n  color: #ffff00 !important;\n  text-decoration: underline !important;\n}\n\na:visited {\n  color: #ff00ff !important;\n}\n\n/* Focus indicators */\n*:focus {\n  outline: 3px solid #ffff00 !important;\n  outline-offset: 2px !important;\n}\n\n/* Larger text */\nbody, p, div, span {\n  font-size: 18px !important;\n  line-height: 1.8 !important;\n}\n\nh1 { font-size: 32px !important; }\nh2 { font-size: 28px !important; }\nh3 { font-size: 24px !important; }\n\n/* Button enhancements */\nbutton, input[type=\"button\"], input[type=\"submit\"] {\n  min-height: 44px !important;\n  min-width: 44px !important;\n  font-size: 16px !important;\n  border: 2px solid #ffffff !important;\n}",
    "description": "Accessibility enhancements for better usability"
  },
  "refresh_interval": {
    "type": "number",
    "value": 180,
    "description": "Gentle refresh to avoid disruption"
  }
}
```

## Migration and Compatibility

### Version 1.0 Default Configuration

Complete default configuration for reference:

```json
{
  "version": "1.0",
  "timestamp": "2025-08-11T10:30:00.123Z",
  "settings": {
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
        "retries": 3
      },
      "description": "Advanced configuration object"
    }
  }
}
```

### Configuration Validation

Before applying any configuration, validate using these rules:

```javascript
function validateConfiguration(config) {
  const errors = [];

  // Check required fields
  if (!config.settings) {
    errors.push("Missing 'settings' object");
  }

  // Validate each setting
  for (const [key, setting] of Object.entries(config.settings)) {
    // Type validation
    if (!setting.type) {
      errors.push(`Setting '${key}' missing type`);
    }

    // Value validation based on type
    switch (setting.type) {
      case "boolean":
        if (typeof setting.value !== "boolean") {
          errors.push(`Setting '${key}' value must be boolean`);
        }
        break;

      case "text":
      case "longtext":
        if (typeof setting.value !== "string") {
          errors.push(`Setting '${key}' value must be string`);
        }
        if (setting.maxLength && setting.value.length > setting.maxLength) {
          errors.push(`Setting '${key}' exceeds maxLength`);
        }
        break;

      case "number":
        if (typeof setting.value !== "number" || isNaN(setting.value)) {
          errors.push(`Setting '${key}' value must be valid number`);
        }
        if (setting.min !== undefined && setting.value < setting.min) {
          errors.push(`Setting '${key}' below minimum value`);
        }
        if (setting.max !== undefined && setting.value > setting.max) {
          errors.push(`Setting '${key}' above maximum value`);
        }
        break;

      case "json":
        if (typeof setting.value !== "object" || setting.value === null) {
          errors.push(`Setting '${key}' value must be valid object`);
        }
        try {
          JSON.stringify(setting.value);
        } catch (e) {
          errors.push(`Setting '${key}' contains invalid JSON`);
        }
        break;
    }
  }

  return errors;
}
```

## Troubleshooting Configuration Issues

### Common Configuration Problems

**Settings Not Saving**

- Check that values meet validation requirements
- Verify JSON syntax is correct for advanced_config
- Ensure browser has sufficient storage space
- Check for browser security restrictions

**CSS Not Applied**

- Verify custom_css syntax is valid
- Check that website doesn't override styles
- Confirm extension has permission to inject styles
- Test with `!important` declarations

**API Requests Failing**

- Verify api_key is correct and not expired
- Check advanced_config endpoint URL is accessible
- Confirm timeout values are reasonable
- Test with reduced retry counts

**Performance Issues**

- Increase refresh_interval for better performance
- Reduce custom_css complexity and size
- Optimize advanced_config timeout values
- Monitor browser memory usage

### Configuration Recovery

If configuration becomes corrupted:

1. **Export Current Settings** (if possible)
2. **Reset to Defaults** using the reset button
3. **Restore from Backup** if available
4. **Manually Reconfigure** critical settings
5. **Test Functionality** after restoration

## Best Practices Summary

### General Guidelines

- Start with default values and customize gradually
- Test configuration changes in safe environment
- Keep backups of working configurations
- Document custom configurations for team sharing
- Validate configuration before applying

### Security Best Practices

- Never share API keys in configuration exports
- Use environment-specific API keys
- Keep sensitive configurations private
- Regularly rotate authentication credentials
- Monitor for unauthorized configuration changes

### Performance Optimization

- Use appropriate refresh intervals for your use case
- Keep custom CSS efficient and minimal
- Set reasonable timeout values
- Monitor resource usage with different configurations
- Test configurations across different devices

## Quick Reference

### Default Values

- `feature_enabled`: `true`
- `api_key`: `""` (empty)
- `custom_css`: Basic CSS template
- `refresh_interval`: `60` seconds
- `advanced_config`: Basic API configuration

### Validation Limits

- `api_key`: Max 100 characters
- `custom_css`: Max 50,000 characters
- `refresh_interval`: 1-3600 seconds
- `advanced_config`: Valid JSON object

### Configuration Files

- Export format: JSON with metadata
- Import compatibility: v1.0+ format
- Backup recommendation: Before major changes
- Sharing guideline: Remove sensitive data

## References

- [Settings Types Reference](settings-types.md) - Detailed setting type documentation
- [Getting Started Tutorial](../tutorials/getting-started.md) - Basic configuration walkthrough
- [Export/Import Guide](../how-to/export-import.md) - Managing configuration files
- [File Formats Reference](file-formats.md) - Understanding configuration file structure

## Revision History

| Date       | Author             | Changes                         |
| ---------- | ------------------ | ------------------------------- |
| 2025-08-11 | Documentation Team | Initial configuration reference |
