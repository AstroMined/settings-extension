# Coding Standards

## Executive Summary

Comprehensive coding standards for the Settings Extension project, covering JavaScript, HTML, CSS, and general development practices. These standards ensure consistency, maintainability, and quality across the codebase while following modern web development best practices.

## Scope

- **Applies to**: All source code files in the project
- **Last Updated**: 2025-08-11
- **Status**: Approved

## JavaScript Standards

### Code Style and Formatting

We use **ESLint** and **Prettier** for consistent code formatting:

```json
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  plugins: [
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'prettier/prettier': 'error',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### Variable Naming

```javascript
// ✅ Good: Use camelCase for variables and functions
const userSettings = {};
const apiResponse = {};
function getUserPreferences() {}
function handleButtonClick() {}

// ✅ Good: Use PascalCase for classes and constructors
class SettingsManager {}
class StorageService {}

// ✅ Good: Use SCREAMING_SNAKE_CASE for constants
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_THEME = 'light';
const API_ENDPOINTS = {
  SETTINGS: '/api/settings',
  SYNC: '/api/sync'
};

// ✅ Good: Use descriptive names
const isUserLoggedIn = checkLoginStatus();
const hasValidSettings = validateSettings(data);

// ❌ Bad: Vague or abbreviated names
const d = new Date(); // Use 'currentDate'
const btn = document.getElementById('save'); // Use 'saveButton'
const usr = getCurrentUser(); // Use 'currentUser'
```

### Function Standards

```javascript
// ✅ Good: Pure functions when possible
function calculateTotal(items, taxRate) {
  return items.reduce((sum, item) => sum + item.price, 0) * (1 + taxRate);
}

// ✅ Good: Single responsibility principle
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeInput(input) {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

// ✅ Good: Async/await over promises
async function loadSettings() {
  try {
    const response = await chrome.storage.local.get(['settings']);
    return response.settings || getDefaultSettings();
  } catch (error) {
    console.error('Failed to load settings:', error);
    return getDefaultSettings();
  }
}

// ❌ Bad: Nested promise chains
function loadSettingsBad() {
  return chrome.storage.local.get(['settings'])
    .then(response => {
      return response.settings || getDefaultSettings();
    })
    .catch(error => {
      console.error('Failed to load settings:', error);
      return getDefaultSettings();
    });
}

// ✅ Good: Function documentation
/**
 * Saves user settings to both local and sync storage
 * @param {Object} settings - The settings object to save
 * @param {Object} options - Save options
 * @param {boolean} options.syncEnabled - Whether to sync across devices
 * @returns {Promise<boolean>} True if saved successfully
 */
async function saveSettings(settings, options = {}) {
  const { syncEnabled = true } = options;
  
  try {
    await chrome.storage.local.set({ settings });
    
    if (syncEnabled) {
      await chrome.storage.sync.set({ settings });
    }
    
    return true;
  } catch (error) {
    console.error('Save failed:', error);
    return false;
  }
}
```

### Error Handling

```javascript
// ✅ Good: Comprehensive error handling
class SettingsManager {
  async saveSettings(settings) {
    // Validate input
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings must be a valid object');
    }

    try {
      // Attempt to save
      await chrome.storage.local.set({ settings });
      return { success: true };
    } catch (error) {
      // Handle specific error types
      if (error.message.includes('QUOTA_EXCEEDED')) {
        return { 
          success: false, 
          error: 'Storage quota exceeded',
          code: 'QUOTA_EXCEEDED'
        };
      }

      // Generic error handling
      console.error('Settings save failed:', error);
      return { 
        success: false, 
        error: error.message,
        code: 'SAVE_FAILED'
      };
    }
  }
}

// ✅ Good: Error boundaries for async operations
async function withErrorBoundary(operation, fallback = null) {
  try {
    return await operation();
  } catch (error) {
    console.error('Operation failed:', error);
    return fallback;
  }
}

// Usage
const settings = await withErrorBoundary(
  () => loadSettings(),
  getDefaultSettings()
);
```

### Module Organization

```javascript
// ✅ Good: ES6 modules with clear exports
// lib/storage-manager.js
export class StorageManager {
  async get(key) {
    // Implementation
  }

  async set(key, value) {
    // Implementation
  }
}

export default new StorageManager();

// ✅ Good: Clear import statements
// background.js
import StorageManager, { StorageManager as StorageClass } from './lib/storage-manager.js';
import { validateSettings, sanitizeInput } from './lib/utils.js';

// ✅ Good: Barrel exports for cleaner imports
// lib/index.js
export { default as StorageManager } from './storage-manager.js';
export { default as SettingsValidator } from './settings-validator.js';
export { default as MessageHandler } from './message-handler.js';

// Usage
import { StorageManager, SettingsValidator } from './lib/index.js';
```

### Class Standards

```javascript
// ✅ Good: Class structure and patterns
class ExtensionComponent {
  constructor(dependencies = {}) {
    // Dependency injection for testability
    this.storage = dependencies.storage || chrome.storage.local;
    this.messaging = dependencies.messaging || chrome.runtime;
    
    // Initialize state
    this.isInitialized = false;
    this.listeners = new Set();
    
    // Bind methods to maintain context
    this.handleMessage = this.handleMessage.bind(this);
  }

  async init() {
    if (this.isInitialized) {
      console.warn('Component already initialized');
      return;
    }

    try {
      await this.setupEventListeners();
      await this.loadInitialData();
      this.isInitialized = true;
    } catch (error) {
      console.error('Initialization failed:', error);
      throw error;
    }
  }

  async setupEventListeners() {
    this.messaging.onMessage.addListener(this.handleMessage);
    this.listeners.add({ 
      target: this.messaging.onMessage, 
      handler: this.handleMessage 
    });
  }

  handleMessage(message, sender, sendResponse) {
    // Handle messages
  }

  async destroy() {
    // Clean up event listeners
    this.listeners.forEach(({ target, handler }) => {
      target.removeListener(handler);
    });
    this.listeners.clear();
    
    this.isInitialized = false;
  }

  // Private methods with underscore prefix
  _validateInput(input) {
    // Private validation logic
  }
}

// ✅ Good: Static methods for utilities
class SettingsUtils {
  static validateSettingsObject(settings) {
    return settings && typeof settings === 'object' && !Array.isArray(settings);
  }

  static mergeSettings(defaults, userSettings) {
    return { ...defaults, ...userSettings };
  }

  static sanitizeSettingsValue(value) {
    if (typeof value === 'string') {
      return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    return value;
  }
}
```

## HTML Standards

### Structure and Semantics

```html
<!-- ✅ Good: Semantic HTML structure -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settings Extension - Options</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <header class="options-header">
    <h1>Extension Settings</h1>
    <nav class="options-nav">
      <button class="nav-tab active" data-tab="general">General</button>
      <button class="nav-tab" data-tab="advanced">Advanced</button>
    </nav>
  </header>

  <main class="options-main">
    <section id="general-section" class="settings-section active">
      <h2>General Settings</h2>
      
      <fieldset class="setting-group">
        <legend>Appearance</legend>
        
        <div class="setting-item">
          <label for="theme-select">Theme:</label>
          <select id="theme-select" name="theme">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>

        <div class="setting-item">
          <label>
            <input type="checkbox" id="notifications" name="notifications">
            Enable notifications
          </label>
        </div>
      </fieldset>
    </section>
  </main>

  <script src="options.js" type="module"></script>
</body>
</html>
```

### Accessibility Standards

```html
<!-- ✅ Good: Accessible form elements -->
<div class="setting-item">
  <label for="sync-interval">Sync Interval (minutes):</label>
  <input 
    type="number" 
    id="sync-interval" 
    name="syncInterval"
    min="5" 
    max="1440"
    step="5"
    aria-describedby="sync-interval-help"
    required
  >
  <div id="sync-interval-help" class="help-text">
    How often settings should sync across devices (5-1440 minutes)
  </div>
</div>

<!-- ✅ Good: ARIA labels and roles -->
<div role="alert" class="error-message" id="error-display" aria-live="polite">
  <!-- Error messages appear here -->
</div>

<nav role="navigation" aria-label="Settings navigation">
  <ul class="settings-nav">
    <li><a href="#general" aria-current="page">General</a></li>
    <li><a href="#advanced">Advanced</a></li>
  </ul>
</nav>

<!-- ✅ Good: Keyboard navigation support -->
<button 
  class="tab-button"
  role="tab"
  aria-selected="true"
  aria-controls="general-panel"
  tabindex="0"
>
  General
</button>
```

## CSS Standards

### Organization and Structure

```css
/* ✅ Good: CSS organization using BEM methodology */

/* Variables and custom properties */
:root {
  --primary-color: #007acc;
  --secondary-color: #f5f5f5;
  --text-color: #333;
  --border-color: #ddd;
  --border-radius: 4px;
  --spacing-small: 8px;
  --spacing-medium: 16px;
  --spacing-large: 24px;
}

/* Reset and base styles */
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
               'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-color);
  margin: 0;
  padding: var(--spacing-medium);
}

/* Component styles using BEM */
.options-header {
  margin-bottom: var(--spacing-large);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: var(--spacing-medium);
}

.options-header__title {
  font-size: 1.5em;
  margin: 0 0 var(--spacing-medium) 0;
}

.options-nav {
  display: flex;
  gap: var(--spacing-small);
}

.options-nav__tab {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-small) var(--spacing-medium);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.options-nav__tab:hover {
  background-color: var(--secondary-color);
}

.options-nav__tab--active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* Settings form styles */
.setting-group {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-medium);
  margin-bottom: var(--spacing-medium);
}

.setting-group__legend {
  font-weight: bold;
  padding: 0 var(--spacing-small);
}

.setting-item {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-medium);
  gap: var(--spacing-small);
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item__label {
  min-width: 120px;
  font-weight: 500;
}

.setting-item__input {
  flex: 1;
  padding: var(--spacing-small);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
}

.setting-item__help {
  font-size: 0.875em;
  color: #666;
  font-style: italic;
}
```

### Responsive Design

```css
/* ✅ Good: Mobile-first responsive design */
.options-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

/* Tablet styles */
@media (min-width: 768px) {
  .setting-item {
    align-items: flex-start;
  }
  
  .setting-item__label {
    min-width: 150px;
  }
}

/* Desktop styles */
@media (min-width: 1024px) {
  .options-container {
    max-width: 800px;
  }
  
  .settings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-large);
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --border-color: #000;
    --text-color: #000;
  }
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #4a9eff;
    --secondary-color: #2a2a2a;
    --text-color: #fff;
    --border-color: #555;
  }
  
  body {
    background-color: #1a1a1a;
  }
}
```

## Testing Standards

### Unit Test Structure

```javascript
// ✅ Good: Function-style tests with descriptive names
import { SettingsManager } from '../lib/settings-manager.js';
import { createMockChrome } from './helpers/chrome-mock.js';

describe('SettingsManager', () => {
  let settingsManager;
  let mockChrome;

  beforeEach(() => {
    // Setup real objects, not mocks when possible
    mockChrome = createMockChrome();
    global.chrome = mockChrome;
    
    settingsManager = new SettingsManager();
  });

  afterEach(() => {
    // Clean up without resetting mocks
    mockChrome.storage.local.clear();
    delete global.chrome;
  });

  describe('saveSettings', () => {
    test('should save valid settings to local storage', async () => {
      const testSettings = {
        theme: 'dark',
        notifications: true,
        syncInterval: 30
      };

      const result = await settingsManager.saveSettings(testSettings);
      
      expect(result.success).toBe(true);
      
      // Verify with actual storage call
      const stored = await mockChrome.storage.local.get(['settings']);
      expect(stored.settings).toEqual(testSettings);
    });

    test('should reject invalid settings input', async () => {
      const invalidInputs = [null, undefined, 'string', 123, []];

      for (const input of invalidInputs) {
        await expect(settingsManager.saveSettings(input))
          .rejects
          .toThrow('Settings must be a valid object');
      }
    });

    test('should handle storage quota exceeded error', async () => {
      // Create realistic error condition
      mockChrome.storage.local.simulateError('QUOTA_EXCEEDED');
      
      const largeSettings = {
        data: 'x'.repeat(10000000) // Large data
      };

      const result = await settingsManager.saveSettings(largeSettings);
      
      expect(result.success).toBe(false);
      expect(result.code).toBe('QUOTA_EXCEEDED');
    });
  });

  describe('loadSettings', () => {
    test('should return default settings when none exist', async () => {
      const settings = await settingsManager.loadSettings();
      
      expect(settings).toMatchObject({
        theme: 'light',
        notifications: false,
        syncInterval: 60
      });
    });

    test('should merge user settings with defaults', async () => {
      const userSettings = { theme: 'dark' };
      await mockChrome.storage.local.set({ settings: userSettings });

      const settings = await settingsManager.loadSettings();
      
      expect(settings).toMatchObject({
        theme: 'dark', // User preference
        notifications: false, // Default value
        syncInterval: 60 // Default value
      });
    });
  });
});
```

### Integration Test Patterns

```javascript
// ✅ Good: Integration tests with real component interaction
describe('Settings Sync Integration', () => {
  let backgroundScript;
  let contentScript;
  let mockChrome;

  beforeEach(async () => {
    mockChrome = createMockChrome();
    global.chrome = mockChrome;

    // Initialize real components
    backgroundScript = new BackgroundScript();
    contentScript = new ContentScript();
    
    await backgroundScript.init();
    await contentScript.init();
  });

  test('should sync settings between background and content script', async () => {
    const newSettings = { theme: 'dark', autoFill: true };

    // Update settings in background
    await backgroundScript.updateSettings(newSettings);

    // Allow message propagation
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify content script received update
    const contentSettings = contentScript.getCurrentSettings();
    expect(contentSettings).toMatchObject(newSettings);
  });
});
```

## Documentation Standards

### Code Comments

```javascript
// ✅ Good: Meaningful comments that explain why, not what
class StorageManager {
  constructor() {
    // Use Map for better performance with frequent key lookups
    this.cache = new Map();
    
    // WeakSet allows garbage collection of removed listeners
    this.listeners = new WeakSet();
  }

  async get(key, defaultValue = null) {
    // Check cache first to avoid unnecessary storage calls
    // This optimization reduces background script wake-ups
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      const result = await chrome.storage.local.get([key]);
      const value = result[key] !== undefined ? result[key] : defaultValue;
      
      // Cache successful reads to improve performance
      this.cache.set(key, value);
      return value;
    } catch (error) {
      // Log error but don't throw - return default to maintain functionality
      console.error(`Storage read failed for key ${key}:`, error);
      return defaultValue;
    }
  }

  // TODO: Implement compression for large data objects
  // See issue #123 for implementation details
  async setLarge(key, value) {
    // Implementation pending
  }
}

// ✅ Good: JSDoc for public APIs
/**
 * Validates and sanitizes user settings before storage
 * 
 * @param {Object} settings - Raw settings object from user input
 * @param {Object} schema - Validation schema with type and constraint info
 * @returns {Object} Validated and sanitized settings object
 * 
 * @throws {ValidationError} When settings don't match schema requirements
 * 
 * @example
 * const validated = validateSettings(
 *   { theme: 'dark', interval: '30' },
 *   { theme: { type: 'string', enum: ['light', 'dark'] } }
 * );
 */
function validateSettings(settings, schema) {
  // Implementation
}
```

### README Standards

Each module should have clear documentation:

```markdown
# StorageManager

## Overview
Manages persistent storage for extension settings with caching and error handling.

## Usage

```javascript
import StorageManager from './storage-manager.js';

// Get a setting with default fallback
const theme = await StorageManager.get('theme', 'light');

// Save a setting
await StorageManager.set('theme', 'dark');

// Listen for changes
const unsubscribe = StorageManager.onChange((key, value) => {
  console.log(`Setting ${key} changed to:`, value);
});
```

## API Reference

### Methods

#### `get(key, defaultValue)`
Retrieves a value from storage with optional default.

- **key** (string): Storage key to retrieve
- **defaultValue** (any): Value to return if key doesn't exist
- **Returns**: Promise<any> - The stored value or default

#### `set(key, value)`
Stores a value in storage with automatic caching.

- **key** (string): Storage key to set
- **value** (any): Value to store (must be JSON serializable)
- **Returns**: Promise<boolean> - Success status
```

## Performance Standards

### Optimization Guidelines

```javascript
// ✅ Good: Batch DOM operations
function updateMultipleElements(updates) {
  const fragment = document.createDocumentFragment();
  
  updates.forEach(({ element, content }) => {
    const newElement = document.createElement(element.tagName);
    newElement.textContent = content;
    fragment.appendChild(newElement);
  });
  
  // Single DOM write operation
  document.getElementById('container').appendChild(fragment);
}

// ✅ Good: Debounce expensive operations
function createDebouncedSave(saveFunction, delay = 1000) {
  let timeoutId;
  
  return function debouncedSave(...args) {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      saveFunction.apply(this, args);
    }, delay);
  };
}

// ✅ Good: Lazy loading for heavy components
async function loadHeavyComponent() {
  const { HeavyComponent } = await import('./heavy-component.js');
  return new HeavyComponent();
}

// ✅ Good: Memory management
class ComponentWithCleanup {
  constructor() {
    this.eventListeners = [];
    this.timers = [];
  }

  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }

  setTimeout(callback, delay) {
    const timerId = setTimeout(callback, delay);
    this.timers.push(timerId);
    return timerId;
  }

  destroy() {
    // Clean up event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });

    // Clear timers
    this.timers.forEach(timerId => clearTimeout(timerId));

    // Clear references
    this.eventListeners.length = 0;
    this.timers.length = 0;
  }
}
```

## Security Standards

### Input Validation and Sanitization

```javascript
// ✅ Good: Input validation
class SecurityUtils {
  static validateSettingsInput(input) {
    if (typeof input !== 'object' || input === null) {
      throw new Error('Settings must be an object');
    }

    // Check for prototype pollution
    if ('__proto__' in input || 'constructor' in input || 'prototype' in input) {
      throw new Error('Invalid property names detected');
    }

    return true;
  }

  static sanitizeString(str) {
    if (typeof str !== 'string') return str;
    
    // Remove potentially harmful content
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  static validateOrigin(origin, allowedOrigins) {
    return allowedOrigins.includes(origin);
  }
}

// ✅ Good: Secure message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate message structure
  if (!message || typeof message.type !== 'string') {
    sendResponse({ error: 'Invalid message format' });
    return;
  }

  // Validate sender (if needed)
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ error: 'Unauthorized sender' });
    return;
  }

  // Process message safely
  try {
    const result = handleSecureMessage(message);
    sendResponse({ success: true, result });
  } catch (error) {
    console.error('Message processing error:', error);
    sendResponse({ error: 'Processing failed' });
  }
});
```

## Enforcement

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss}": [
      "stylelint --fix",
      "prettier --write"
    ],
    "*.{md,json}": [
      "prettier --write"
    ]
  }
}
```

### CI/CD Integration

```yaml
# .github/workflows/code-quality.yml
name: Code Quality

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Check Prettier formatting
        run: npm run format:check
      
      - name: Run tests
        run: npm test
```

## References

- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- [BEM Methodology](http://getbem.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [JavaScript Clean Code](https://github.com/ryanmcdermott/clean-code-javascript)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-08-11 | Developer Team | Initial coding standards |