# Crosscutting Concepts

## Executive Summary

This document describes the crosscutting concerns and architectural patterns that span multiple components of the Settings Extension. These concepts provide consistency, maintainability, and quality across the entire system.

## Scope

- **Applies to**: All system components and architectural patterns
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Domain Concepts

### 8.1 Settings Model

The Settings Extension is built around a unified settings model that provides consistency across all components.

#### Setting Structure
```javascript
{
  "setting_key": {
    "type": "boolean|text|longtext|number|json",
    "value": /* actual value */,
    "description": "Human readable description",
    "category": "optional category",
    "metadata": {
      "version": "1.0.0",
      "created": "2025-01-01T00:00:00Z",
      "modified": "2025-01-01T00:00:00Z"
    },
    // Type-specific constraints
    "maxLength": 100,    // for text types
    "min": 1,            // for number types  
    "max": 3600,         // for number types
    "enum": [],          // for enumerated values
    "pattern": "",       // for regex validation
    "required": false    // whether setting is mandatory
  }
}
```

#### Data Types and Validation Rules

| Type | JavaScript Type | Validation Rules | UI Representation |
|------|----------------|------------------|-------------------|
| **boolean** | `boolean` | true/false only | Checkbox/Toggle |
| **text** | `string` | Length limits, pattern matching | Input field |
| **longtext** | `string` | Length limits, multi-line | Textarea |
| **number** | `number` | Range limits, integer/float | Number input |
| **json** | `object` | Valid JSON structure | Code editor |

#### Setting Categories
```javascript
const SETTING_CATEGORIES = {
  GENERAL: 'general',
  APPEARANCE: 'appearance', 
  BEHAVIOR: 'behavior',
  ADVANCED: 'advanced',
  SECURITY: 'security',
  PERFORMANCE: 'performance'
};
```

### 8.2 Configuration Management

Configuration management ensures consistent handling of settings across all environments and components.

#### Configuration Hierarchy
```
1. Hard-coded defaults (embedded in code)
2. JSON configuration files (config/defaults.json)
3. Stored user settings (browser storage)
4. Runtime overrides (temporary settings)
```

#### Configuration Loading Strategy
```javascript
class ConfigurationManager {
  async loadConfiguration() {
    // 1. Load hard-coded defaults
    const hardDefaults = this.getHardCodedDefaults();
    
    // 2. Load JSON configuration
    const jsonConfig = await this.loadJSONConfig();
    
    // 3. Load stored settings
    const storedSettings = await this.loadStoredSettings();
    
    // 4. Merge in priority order
    return this.mergeConfigurations(
      hardDefaults,
      jsonConfig, 
      storedSettings
    );
  }
}
```

## Error Handling and Logging

### 8.3 Error Handling Strategy

The Settings Extension implements a comprehensive error handling strategy that provides consistent error management across all components.

#### Error Classification
```javascript
class SettingsError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

class ValidationError extends SettingsError {
  constructor(message, field, value, constraints) {
    super(message, 'VALIDATION_ERROR', { field, value, constraints });
  }
}

class StorageError extends SettingsError {
  constructor(message, operation, key) {
    super(message, 'STORAGE_ERROR', { operation, key });
  }
}

class BrowserCompatibilityError extends SettingsError {
  constructor(message, browser, feature) {
    super(message, 'COMPATIBILITY_ERROR', { browser, feature });
  }
}
```

#### Error Handling Patterns

**1. Try-Catch with Specific Handling**
```javascript
async function handleSettingsOperation() {
  try {
    return await this.performOperation();
  } catch (error) {
    if (error instanceof ValidationError) {
      return this.handleValidationError(error);
    } else if (error instanceof StorageError) {
      return this.handleStorageError(error);
    } else {
      return this.handleUnknownError(error);
    }
  }
}
```

**2. Error Recovery with Fallbacks**
```javascript
async function getSettingWithFallback(key) {
  try {
    return await this.primaryStorage.get(key);
  } catch (primaryError) {
    this.logger.warn('Primary storage failed, trying fallback', primaryError);
    try {
      return await this.fallbackStorage.get(key);
    } catch (fallbackError) {
      this.logger.error('All storage methods failed', { primaryError, fallbackError });
      return this.getDefaultValue(key);
    }
  }
}
```

**3. Circuit Breaker Pattern**
```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureThreshold = threshold;
    this.resetTimeout = timeout;
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = 0;
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

### 8.4 Logging Framework

A structured logging framework provides consistent logging across all components.

#### Log Levels and Usage
```javascript
const LogLevel = {
  ERROR: 0,   // System errors, exceptions
  WARN: 1,    // Warnings, fallbacks used
  INFO: 2,    // General information, state changes
  DEBUG: 3,   // Detailed debugging information
  TRACE: 4    // Very detailed tracing (development only)
};

class Logger {
  constructor(component, level = LogLevel.INFO) {
    this.component = component;
    this.level = level;
  }

  error(message, context = {}) {
    if (this.level >= LogLevel.ERROR) {
      this.log('ERROR', message, context);
    }
  }

  warn(message, context = {}) {
    if (this.level >= LogLevel.WARN) {
      this.log('WARN', message, context);
    }
  }

  info(message, context = {}) {
    if (this.level >= LogLevel.INFO) {
      this.log('INFO', message, context);
    }
  }

  debug(message, context = {}) {
    if (this.level >= LogLevel.DEBUG) {
      this.log('DEBUG', message, context);
    }
  }

  log(level, message, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      context
    };
    
    console[level.toLowerCase()](
      `[${logEntry.timestamp}] ${level} ${this.component}: ${message}`,
      context
    );
  }
}
```

#### Contextual Logging
```javascript
// Component-specific loggers
const uiLogger = new Logger('UI', LogLevel.INFO);
const storageLogger = new Logger('Storage', LogLevel.DEBUG);
const apiLogger = new Logger('API', LogLevel.INFO);

// Usage examples
uiLogger.info('Popup opened', { trigger: 'user_click' });
storageLogger.debug('Setting retrieved from cache', { key: 'api_key', hit: true });
apiLogger.error('Content script communication failed', { error: error.message });
```

## Security Concepts

### 8.5 Security Architecture

The Settings Extension implements defense-in-depth security principles across all components.

#### Input Validation and Sanitization
```javascript
class InputValidator {
  static validateSettingKey(key) {
    if (typeof key !== 'string') {
      throw new ValidationError('Setting key must be a string', 'key', key, { type: 'string' });
    }
    
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
      throw new ValidationError('Invalid setting key format', 'key', key, { pattern: '^[a-zA-Z][a-zA-Z0-9_]*$' });
    }
    
    if (key.length > 64) {
      throw new ValidationError('Setting key too long', 'key', key, { maxLength: 64 });
    }
    
    return key;
  }

  static validateSettingValue(value, type, constraints = {}) {
    switch (type) {
      case 'text':
        return this.validateText(value, constraints);
      case 'number':
        return this.validateNumber(value, constraints);
      case 'json':
        return this.validateJSON(value, constraints);
      default:
        throw new ValidationError('Unknown setting type', 'type', type, { supportedTypes: ['text', 'number', 'json'] });
    }
  }

  static sanitizeHTML(input) {
    // Remove potentially dangerous HTML tags and attributes
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
  }
}
```

#### Content Security Policy (CSP)
The extension enforces strict CSP rules:
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none';"
  }
}
```

#### Permission Minimization
```javascript
// Only request necessary permissions
const REQUIRED_PERMISSIONS = [
  'storage',      // For settings persistence
  'activeTab'     // For content script injection when needed
];

// Avoid these broad permissions:
// - '<all_urls>' (too broad)
// - 'tabs' (more than needed)
// - 'webNavigation' (not required)
```

### 8.6 Data Privacy and Protection

#### Data Classification
```javascript
const DataClassification = {
  PUBLIC: 'public',           // No privacy concerns
  INTERNAL: 'internal',       // Extension internal data
  CONFIDENTIAL: 'confidential', // User settings data
  RESTRICTED: 'restricted'    // Sensitive configuration
};

const PRIVACY_RULES = {
  [DataClassification.PUBLIC]: {
    encryption: false,
    logging: true,
    transmission: true
  },
  [DataClassification.CONFIDENTIAL]: {
    encryption: true,
    logging: false,
    transmission: false
  }
};
```

#### Data Encryption
```javascript
class DataProtection {
  static async encryptSensitiveData(data, key) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Use Web Crypto API for encryption
      const encoded = new TextEncoder().encode(JSON.stringify(data));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
        key,
        encoded
      );
      return encrypted;
    }
    // Fallback: Base64 encoding (not secure, but better than plain text)
    return btoa(JSON.stringify(data));
  }
}
```

## Performance Concepts

### 8.7 Performance Patterns

The Settings Extension implements several performance optimization patterns consistently across components.

#### Lazy Loading Pattern
```javascript
class LazyComponent {
  constructor() {
    this._component = null;
    this._loading = false;
  }

  async getComponent() {
    if (this._component) {
      return this._component;
    }

    if (this._loading) {
      // Wait for existing load to complete
      return new Promise(resolve => {
        const checkLoaded = () => {
          if (this._component) {
            resolve(this._component);
          } else {
            setTimeout(checkLoaded, 10);
          }
        };
        checkLoaded();
      });
    }

    this._loading = true;
    try {
      this._component = await this.loadComponent();
      return this._component;
    } finally {
      this._loading = false;
    }
  }
}
```

#### Caching Strategy
```javascript
class CacheManager {
  constructor(maxSize = 100, ttl = 300000) { // 5 minutes default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value) {
    // Implement LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.value;
  }
}
```

#### Debouncing and Throttling
```javascript
class PerformanceUtils {
  static debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(this, args);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Usage examples
const debouncedSave = PerformanceUtils.debounce(saveSettings, 300);
const throttledSearch = PerformanceUtils.throttle(performSearch, 100);
```

### 8.8 Memory Management

#### Weak References for Event Listeners
```javascript
class EventManager {
  constructor() {
    this.listeners = new WeakMap();
  }

  addEventListener(target, event, callback) {
    if (!this.listeners.has(target)) {
      this.listeners.set(target, new Map());
    }
    
    const targetListeners = this.listeners.get(target);
    if (!targetListeners.has(event)) {
      targetListeners.set(event, new Set());
    }
    
    targetListeners.get(event).add(callback);
    target.addEventListener(event, callback);
  }

  removeEventListener(target, event, callback) {
    const targetListeners = this.listeners.get(target);
    if (targetListeners && targetListeners.has(event)) {
      targetListeners.get(event).delete(callback);
      target.removeEventListener(event, callback);
    }
  }

  cleanup(target) {
    // Remove all listeners for a target when it's no longer needed
    const targetListeners = this.listeners.get(target);
    if (targetListeners) {
      for (const [event, callbacks] of targetListeners) {
        for (const callback of callbacks) {
          target.removeEventListener(event, callback);
        }
      }
      this.listeners.delete(target);
    }
  }
}
```

## UI/UX Patterns

### 8.9 User Interface Consistency

The Settings Extension maintains consistent UI patterns across all interface components.

#### Design System
```css
/* CSS Custom Properties for consistent styling */
:root {
  --primary-color: #4285f4;
  --secondary-color: #34a853;
  --error-color: #ea4335;
  --warning-color: #fbbc04;
  --success-color: #34a853;
  
  --text-primary: #202124;
  --text-secondary: #5f6368;
  --background: #ffffff;
  --surface: #f8f9fa;
  
  --border-radius: 8px;
  --spacing-unit: 8px;
  --animation-duration: 0.2s;
}

/* Component base classes */
.settings-input {
  border: 1px solid #dadce0;
  border-radius: var(--border-radius);
  padding: calc(var(--spacing-unit) * 1.5);
  transition: border-color var(--animation-duration);
}

.settings-input:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
}

.settings-button {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  padding: calc(var(--spacing-unit) * 1.5) calc(var(--spacing-unit) * 3);
  cursor: pointer;
  transition: background-color var(--animation-duration);
}

.settings-button:hover {
  background: #3367d6;
}
```

#### Component Templates
```javascript
class UIComponentTemplate {
  static createFormField(type, label, value, options = {}) {
    const container = document.createElement('div');
    container.className = 'settings-field';
    
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.className = 'settings-label';
    
    const input = this.createInput(type, value, options);
    
    if (options.description) {
      const description = document.createElement('div');
      description.textContent = options.description;
      description.className = 'settings-description';
      container.appendChild(description);
    }
    
    container.appendChild(labelElement);
    container.appendChild(input);
    
    return container;
  }

  static createInput(type, value, options) {
    let input;
    
    switch (type) {
      case 'boolean':
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = value;
        break;
      case 'longtext':
        input = document.createElement('textarea');
        input.value = value;
        input.rows = options.rows || 4;
        break;
      default:
        input = document.createElement('input');
        input.type = type === 'number' ? 'number' : 'text';
        input.value = value;
    }
    
    input.className = 'settings-input';
    return input;
  }
}
```

#### Accessibility Patterns
```javascript
class AccessibilityHelper {
  static addAriaLabels(element, labels) {
    Object.entries(labels).forEach(([key, value]) => {
      element.setAttribute(`aria-${key}`, value);
    });
  }

  static createScreenReaderText(text) {
    const span = document.createElement('span');
    span.textContent = text;
    span.className = 'sr-only';
    span.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
    `;
    return span;
  }

  static announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }
}
```

### 8.10 Internationalization (i18n)

Although not initially implemented, the extension is designed with internationalization support in mind.

#### i18n Framework Structure
```javascript
class I18nManager {
  constructor(defaultLocale = 'en') {
    this.currentLocale = defaultLocale;
    this.messages = new Map();
  }

  async loadMessages(locale) {
    try {
      // In a real implementation, this would load from JSON files
      const messages = await this.fetchMessages(locale);
      this.messages.set(locale, messages);
    } catch (error) {
      console.warn(`Failed to load messages for locale ${locale}`, error);
    }
  }

  getMessage(key, substitutions = {}) {
    const messages = this.messages.get(this.currentLocale) || {};
    let message = messages[key] || key;
    
    // Handle substitutions
    Object.entries(substitutions).forEach(([placeholder, value]) => {
      message = message.replace(new RegExp(`\\$${placeholder}\\$`, 'g'), value);
    });
    
    return message;
  }
}

// Usage
const i18n = new I18nManager();
const welcomeMessage = i18n.getMessage('welcome_user', { username: 'John' });
```

## Testing Patterns

### 8.11 Testing Strategy

Consistent testing patterns ensure reliability across all components.

#### Test Structure
```javascript
// Standard test structure
describe('Component Name', () => {
  let component;
  let mockDependency;
  
  beforeEach(() => {
    mockDependency = createMockDependency();
    component = new Component(mockDependency);
  });
  
  afterEach(() => {
    component.cleanup();
  });
  
  describe('method name', () => {
    it('should perform expected behavior', async () => {
      // Arrange
      const input = 'test data';
      const expectedOutput = 'expected result';
      
      // Act
      const result = await component.method(input);
      
      // Assert
      expect(result).toBe(expectedOutput);
    });
    
    it('should handle error conditions', async () => {
      // Arrange
      mockDependency.method.mockRejectedValue(new Error('Test error'));
      
      // Act & Assert
      await expect(component.method('input')).rejects.toThrow('Test error');
    });
  });
});
```

#### Mock Patterns
```javascript
// Browser API mocks
const createBrowserMock = () => ({
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    }
  },
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({}),
    onMessage: {
      addListener: jest.fn()
    }
  }
});
```

## References

- [Chrome Extension Best Practices](https://developer.chrome.com/docs/extensions/mv3/devguide/)
- [Web API Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [JavaScript Performance Patterns](https://developers.google.com/web/fundamentals/performance)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-08-11 | Architecture Team | Initial crosscutting concepts and patterns |