# Settings Extension MCD (Main Context Document)

## 🎯 Overview & Goals

**Project Vision**: Build a robust Manifest V3 browser extension with comprehensive settings management that works seamlessly across Chrome and Firefox browsers. The extension provides a complete settings framework with persistent storage, user-friendly management interface, and powerful API for content scripts.

**Target Users**:

- Extension developers who need a settings management foundation
- End users who want granular control over extension behavior
- Power users requiring settings export/import capabilities
- Teams needing consistent settings across multiple browser instances

**Core Features**:

1. **Cross-browser compatibility** - Works on Chrome and Firefox with Manifest V3
2. **Persistent settings storage** - Uses browser.storage.local with sync capabilities
3. **JSON-based defaults** - Configurable default settings loaded from JSON file
4. **Settings manager UI** - Accessible via browser action with real-time updates
5. **Export/import functionality** - JSON-based settings backup and restore
6. **Content script API** - Comprehensive settings access and modification interface
7. **Multi-type support** - Boolean, text, long text, numbers, and JSON data types
8. **Real-time synchronization** - Instant updates across all extension contexts

**Success Criteria**:

- Settings save/load operations complete in <100ms
- Settings UI loads in <500ms after clicking browser action
- Cross-browser compatibility achieved with single codebase
- Support for settings files up to 1MB in size
- Zero data loss during export/import operations
- Content scripts can access settings in <50ms

**Business Context**: This extension serves as a foundation for other extensions requiring robust settings management, solving the common problem of inconsistent, unreliable settings systems in browser extensions.

## 🏗️ Technical Architecture

**Frontend**:

- Vanilla JavaScript with ES6+ modules for maximum compatibility
- HTML5 for settings UI with CSS3 for styling
- No external frameworks to minimize bundle size
- WebExtension Polyfill for cross-browser compatibility

**Backend**:

- Manifest V3 service worker for background processing
- Browser storage API (storage.local and storage.sync)
- Chrome/Firefox WebExtension APIs
- Message passing system for component communication

**APIs**:

- browser.storage.local for persistent local settings
- browser.storage.sync for cross-device synchronization
- browser.runtime messaging for inter-component communication
- browser.action API for browser action integration

**Infrastructure**:

- Chrome Web Store for Chrome distribution
- Firefox Add-ons for Firefox distribution
- GitHub Actions for automated testing and packaging
- ESLint and Prettier for code quality

**Technology Justification**:

- Vanilla JS for maximum browser compatibility and minimal overhead
- WebExtension Polyfill for unified API access across browsers
- Storage API for reliable, persistent data management
- Service worker architecture for Manifest V3 compliance

## 📋 Detailed Implementation Specs

### Settings Data Schema

```javascript
// Default settings structure
const DEFAULT_SETTINGS = {
  // Boolean settings
  "feature_enabled": {
    "type": "boolean",
    "value": true,
    "description": "Enable main feature functionality"
  },
  
  // Text settings
  "api_key": {
    "type": "text",
    "value": "",
    "description": "API key for external service",
    "maxLength": 100
  },
  
  // Long text settings
  "custom_css": {
    "type": "longtext",
    "value": "/* Custom CSS styles */\n.example { color: blue; }",
    "description": "Custom CSS for content injection",
    "maxLength": 50000
  },
  
  // Number settings
  "refresh_interval": {
    "type": "number",
    "value": 60,
    "description": "Auto-refresh interval in seconds",
    "min": 1,
    "max": 3600
  },
  
  // JSON settings
  "advanced_config": {
    "type": "json",
    "value": {
      "endpoint": "https://api.example.com",
      "timeout": 5000,
      "retries": 3
    },
    "description": "Advanced configuration object"
  }
};
```

### Settings Manager API

```javascript
class SettingsManager {
  constructor() {
    this.settings = new Map();
    this.listeners = new Set();
    this.initialized = false;
  }

  // Initialize settings with defaults
  async initialize() {
    const stored = await browser.storage.local.get();
    const defaults = await this.loadDefaults();
    
    this.settings = new Map(Object.entries({
      ...defaults,
      ...stored
    }));
    
    this.initialized = true;
    this.notifyListeners('initialized');
  }

  // Load default settings from JSON
  async loadDefaults() {
    const response = await fetch('/config/defaults.json');
    return await response.json();
  }

  // Get single setting by key
  async getSetting(key) {
    if (!this.initialized) await this.initialize();
    return this.settings.get(key);
  }

  // Get multiple settings by keys
  async getSettings(keys) {
    if (!this.initialized) await this.initialize();
    const result = {};
    for (const key of keys) {
      result[key] = this.settings.get(key);
    }
    return result;
  }

  // Get all settings
  async getAllSettings() {
    if (!this.initialized) await this.initialize();
    return Object.fromEntries(this.settings);
  }

  // Update single setting
  async updateSetting(key, value) {
    if (!this.initialized) await this.initialize();
    
    const setting = this.settings.get(key);
    if (!setting) throw new Error(`Setting ${key} not found`);
    
    // Validate value based on type
    this.validateSetting(setting, value);
    
    setting.value = value;
    this.settings.set(key, setting);
    
    await browser.storage.local.set({ [key]: setting });
    this.notifyListeners('updated', { key, value });
  }

  // Update multiple settings
  async updateSettings(updates) {
    if (!this.initialized) await this.initialize();
    
    const storageUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      const setting = this.settings.get(key);
      if (!setting) throw new Error(`Setting ${key} not found`);
      
      this.validateSetting(setting, value);
      setting.value = value;
      this.settings.set(key, setting);
      storageUpdates[key] = setting;
    }
    
    await browser.storage.local.set(storageUpdates);
    this.notifyListeners('updated', updates);
  }

  // Export settings to JSON
  async exportSettings() {
    if (!this.initialized) await this.initialize();
    
    const exportData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      settings: Object.fromEntries(this.settings)
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Import settings from JSON
  async importSettings(jsonData) {
    const importData = JSON.parse(jsonData);
    
    if (!importData.settings) {
      throw new Error('Invalid settings format');
    }
    
    // Validate and merge settings
    const validSettings = {};
    for (const [key, setting] of Object.entries(importData.settings)) {
      if (this.settings.has(key)) {
        this.validateSetting(setting, setting.value);
        validSettings[key] = setting;
      }
    }
    
    await browser.storage.local.set(validSettings);
    await this.initialize(); // Reload settings
    
    this.notifyListeners('imported', validSettings);
  }

  // Reset to defaults
  async resetToDefaults() {
    await browser.storage.local.clear();
    await this.initialize();
    this.notifyListeners('reset');
  }

  // Validate setting value
  validateSetting(setting, value) {
    switch (setting.type) {
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`${setting.description} must be a boolean`);
        }
        break;
      case 'text':
        if (typeof value !== 'string') {
          throw new Error(`${setting.description} must be a string`);
        }
        if (setting.maxLength && value.length > setting.maxLength) {
          throw new Error(`${setting.description} exceeds maximum length`);
        }
        break;
      case 'longtext':
        if (typeof value !== 'string') {
          throw new Error(`${setting.description} must be a string`);
        }
        if (setting.maxLength && value.length > setting.maxLength) {
          throw new Error(`${setting.description} exceeds maximum length`);
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          throw new Error(`${setting.description} must be a number`);
        }
        if (setting.min !== undefined && value < setting.min) {
          throw new Error(`${setting.description} below minimum value`);
        }
        if (setting.max !== undefined && value > setting.max) {
          throw new Error(`${setting.description} above maximum value`);
        }
        break;
      case 'json':
        if (typeof value !== 'object' || value === null) {
          throw new Error(`${setting.description} must be a valid object`);
        }
        break;
    }
  }

  // Add change listener
  addListener(callback) {
    this.listeners.add(callback);
  }

  // Remove change listener
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners(event, data) {
    for (const callback of this.listeners) {
      callback(event, data);
    }
  }
}
```

### Content Script Communication API

```javascript
// Content script settings API
class ContentScriptSettings {
  constructor() {
    this.cache = new Map();
    this.listeners = new Set();
    this.setupMessageListener();
  }

  // Request single setting
  async getSetting(key) {
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage({
        type: 'GET_SETTING',
        key: key
      }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.value);
        }
      });
    });
  }

  // Request multiple settings
  async getSettings(keys) {
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage({
        type: 'GET_SETTINGS',
        keys: keys
      }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.values);
        }
      });
    });
  }

  // Request all settings
  async getAllSettings() {
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage({
        type: 'GET_ALL_SETTINGS'
      }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.settings);
        }
      });
    });
  }

  // Update single setting
  async updateSetting(key, value) {
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage({
        type: 'UPDATE_SETTING',
        key: key,
        value: value
      }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.success);
        }
      });
    });
  }

  // Update multiple settings
  async updateSettings(updates) {
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        updates: updates
      }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.success);
        }
      });
    });
  }

  // Listen for settings changes
  addChangeListener(callback) {
    this.listeners.add(callback);
  }

  // Remove change listener
  removeChangeListener(callback) {
    this.listeners.delete(callback);
  }

  // Setup message listener for settings changes
  setupMessageListener() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SETTINGS_CHANGED') {
        for (const callback of this.listeners) {
          callback(message.changes);
        }
      }
    });
  }
}
```

### Settings UI Components

```javascript
// Settings UI Manager
class SettingsUI {
  constructor() {
    this.settingsManager = new SettingsManager();
    this.currentTab = 'general';
    this.unsavedChanges = false;
  }

  // Initialize UI
  async initialize() {
    await this.settingsManager.initialize();
    this.setupEventListeners();
    this.renderSettings();
    this.setupAutoSave();
  }

  // Render settings based on type
  renderSettings() {
    const container = document.getElementById('settings-container');
    container.innerHTML = '';

    const settings = this.settingsManager.getAllSettings();
    
    for (const [key, setting] of Object.entries(settings)) {
      const element = this.createSettingElement(key, setting);
      container.appendChild(element);
    }
  }

  // Create setting element based on type
  createSettingElement(key, setting) {
    const wrapper = document.createElement('div');
    wrapper.className = 'setting-item';
    wrapper.setAttribute('data-key', key);

    const label = document.createElement('label');
    label.textContent = setting.description;
    label.className = 'setting-label';

    let input;
    switch (setting.type) {
      case 'boolean':
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = setting.value;
        break;
      case 'text':
        input = document.createElement('input');
        input.type = 'text';
        input.value = setting.value;
        input.maxLength = setting.maxLength || 1000;
        break;
      case 'longtext':
        input = document.createElement('textarea');
        input.value = setting.value;
        input.maxLength = setting.maxLength || 50000;
        input.rows = 5;
        break;
      case 'number':
        input = document.createElement('input');
        input.type = 'number';
        input.value = setting.value;
        input.min = setting.min;
        input.max = setting.max;
        break;
      case 'json':
        input = document.createElement('textarea');
        input.value = JSON.stringify(setting.value, null, 2);
        input.className = 'json-input';
        input.rows = 10;
        break;
    }

    input.className = 'setting-input';
    input.addEventListener('change', () => this.onSettingChange(key, input));

    wrapper.appendChild(label);
    wrapper.appendChild(input);

    return wrapper;
  }

  // Handle setting change
  async onSettingChange(key, input) {
    try {
      let value = input.value;
      
      // Parse value based on type
      const setting = await this.settingsManager.getSetting(key);
      
      if (setting.type === 'boolean') {
        value = input.checked;
      } else if (setting.type === 'number') {
        value = parseFloat(value);
      } else if (setting.type === 'json') {
        value = JSON.parse(value);
      }

      await this.settingsManager.updateSetting(key, value);
      this.showSuccess(`${setting.description} updated successfully`);
      
    } catch (error) {
      this.showError(`Error updating setting: ${error.message}`);
      // Revert input value
      const setting = await this.settingsManager.getSetting(key);
      if (setting.type === 'boolean') {
        input.checked = setting.value;
      } else if (setting.type === 'json') {
        input.value = JSON.stringify(setting.value, null, 2);
      } else {
        input.value = setting.value;
      }
    }
  }

  // Export settings
  async exportSettings() {
    try {
      const settingsJson = await this.settingsManager.exportSettings();
      
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `extension-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showSuccess('Settings exported successfully');
      
    } catch (error) {
      this.showError(`Export failed: ${error.message}`);
    }
  }

  // Import settings
  async importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        const content = await file.text();
        await this.settingsManager.importSettings(content);
        this.renderSettings();
        this.showSuccess('Settings imported successfully');
        
      } catch (error) {
        this.showError(`Import failed: ${error.message}`);
      }
    });
    
    input.click();
  }

  // Reset to defaults
  async resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      try {
        await this.settingsManager.resetToDefaults();
        this.renderSettings();
        this.showSuccess('Settings reset to defaults');
        
      } catch (error) {
        this.showError(`Reset failed: ${error.message}`);
      }
    }
  }

  // Show success message
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  // Show error message
  showError(message) {
    this.showMessage(message, 'error');
  }

  // Show message
  showMessage(message, type) {
    const container = document.getElementById('message-container');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    container.appendChild(messageEl);
    
    setTimeout(() => {
      container.removeChild(messageEl);
    }, 5000);
  }

  // Setup event listeners
  setupEventListeners() {
    document.getElementById('export-btn').addEventListener('click', () => this.exportSettings());
    document.getElementById('import-btn').addEventListener('click', () => this.importSettings());
    document.getElementById('reset-btn').addEventListener('click', () => this.resetToDefaults());
  }

  // Setup auto-save
  setupAutoSave() {
    // Auto-save is handled by individual setting changes
    // This could be extended for draft saving
  }
}
```

## 📁 File Structure & Organization

### Project Layout

```
settings-extension/
├── manifest.json                 # Extension manifest
├── background.js                 # Service worker
├── content-script.js            # Content script with settings API
├── popup/                       # Settings UI popup
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/                     # Options page (alternative UI)
│   ├── options.html
│   ├── options.js
│   └── options.css
├── lib/                         # Core library files
│   ├── settings-manager.js      # Settings management core
│   ├── content-settings.js      # Content script settings API
│   └── webext-polyfill.js       # Cross-browser compatibility
├── config/                      # Configuration files
│   └── defaults.json           # Default settings
├── icons/                      # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── examples/                   # Example implementations
│   ├── content-script-example.js
│   └── settings-usage-example.js
└── docs/                       # Documentation
    ├── MCD.md                  # This file
    ├── API.md                  # API documentation
    └── CHANGELOG.md            # Version history
```

### Key Files Content

**manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Settings Extension",
  "version": "1.0.0",
  "description": "Comprehensive settings management for browser extensions",
  
  "permissions": [
    "storage",
    "activeTab"
  ],
  
  "background": {
    "service_worker": "background.js"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["lib/webext-polyfill.js", "lib/content-settings.js", "content-script.js"]
    }
  ],
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  },
  
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  
  "web_accessible_resources": [
    {
      "resources": ["config/defaults.json"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

**background.js**

```javascript
// Service worker for settings management
importScripts('lib/webext-polyfill.js', 'lib/settings-manager.js');

let settingsManager;

// Initialize settings manager
async function initializeSettings() {
  settingsManager = new SettingsManager();
  await settingsManager.initialize();
}

// Handle messages from content scripts and popup
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (!settingsManager) {
    await initializeSettings();
  }

  try {
    switch (message.type) {
      case 'GET_SETTING':
        const setting = await settingsManager.getSetting(message.key);
        sendResponse({ value: setting });
        break;
        
      case 'GET_SETTINGS':
        const settings = await settingsManager.getSettings(message.keys);
        sendResponse({ values: settings });
        break;
        
      case 'GET_ALL_SETTINGS':
        const allSettings = await settingsManager.getAllSettings();
        sendResponse({ settings: allSettings });
        break;
        
      case 'UPDATE_SETTING':
        await settingsManager.updateSetting(message.key, message.value);
        sendResponse({ success: true });
        
        // Notify all content scripts of change
        browser.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            browser.tabs.sendMessage(tab.id, {
              type: 'SETTINGS_CHANGED',
              changes: { [message.key]: message.value }
            });
          });
        });
        break;
        
      case 'UPDATE_SETTINGS':
        await settingsManager.updateSettings(message.updates);
        sendResponse({ success: true });
        
        // Notify all content scripts of changes
        browser.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            browser.tabs.sendMessage(tab.id, {
              type: 'SETTINGS_CHANGED',
              changes: message.updates
            });
          });
        });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    sendResponse({ error: error.message });
  }
  
  return true; // Keep message channel open for async response
});

// Initialize on startup
initializeSettings();
```

**config/defaults.json**

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
      "retries": 3
    },
    "description": "Advanced configuration object"
  }
}
```

### Naming Conventions

- **Files**: kebab-case (`settings-manager.js`, `content-settings.js`)
- **Classes**: PascalCase (`SettingsManager`, `ContentScriptSettings`)
- **Functions**: camelCase (`getSetting`, `updateSettings`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_SETTINGS`, `MAX_RETRIES`)
- **CSS Classes**: kebab-case (`setting-item`, `json-input`)

### Environment Configuration

**Development Setup**

```bash
# Install dependencies
npm install --save-dev eslint prettier web-ext

# Development commands
npm run lint          # Run ESLint
npm run format        # Format with Prettier
npm run build         # Build extension
npm run test          # Run tests
```

**Package.json**

```json
{
  "name": "settings-extension",
  "version": "1.0.0",
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "build": "web-ext build",
    "test": "jest",
    "dev:chrome": "web-ext run --target=chromium",
    "dev:firefox": "web-ext run --target=firefox-desktop"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "prettier": "^2.0.0",
    "web-ext": "^7.0.0",
    "jest": "^29.0.0"
  }
}
```

## ✅ Task Breakdown & Implementation Plan

### Phase 1: Foundation Setup (Week 1)

**1.1 Project Structure Creation**

- Create directory structure with all required folders
- Setup manifest.json with proper permissions and configuration
- Create placeholder files for all components
- **Dependencies**: None
- **Deliverable**: Complete project structure
- **Acceptance**: Project builds without errors

**1.2 Core Settings Manager**

- Implement SettingsManager class with full CRUD operations
- Add settings validation system
- Create JSON default loading system
- Setup browser storage integration
- **Dependencies**: 1.1
- **Deliverable**: Functional settings manager
- **Acceptance**: Settings can be saved, loaded, and validated

**1.3 Cross-Browser Compatibility**

- Integrate WebExtension Polyfill
- Test storage API across Chrome and Firefox
- Implement browser-specific workarounds
- **Dependencies**: 1.2
- **Deliverable**: Cross-browser compatible storage
- **Acceptance**: Extension works in both Chrome and Firefox

### Phase 2: UI Development (Week 2)

**2.1 Settings Popup Interface**

- Create popup.html with responsive design
- Implement dynamic form generation based on setting types
- Add real-time validation and error handling
- **Dependencies**: 1.3
- **Deliverable**: Functional popup interface
- **Acceptance**: All setting types can be modified via popup

**2.2 Advanced Settings Page**

- Create options.html for detailed settings management
- Implement tabbed interface for better organization
- Add search and filter functionality
- **Dependencies**: 2.1
- **Deliverable**: Comprehensive options page
- **Acceptance**: Users can find and modify any setting quickly

**2.3 Export/Import Functionality**

- Implement JSON export with metadata
- Create secure import validation
- Add backup/restore capabilities
- **Dependencies**: 2.1
- **Deliverable**: Data portability features
- **Acceptance**: Settings can be exported and imported without data loss

### Phase 3: Content Script Integration (Week 3)

**3.1 Content Script API**


- Implement ContentScriptSettings class
- Create message passing system with background
- Add change event listeners
- **Dependencies**: 1.3
- **Deliverable**: Content script settings API
- **Acceptance**: Content scripts can access and modify settings

**3.2 Example Content Script**


- Create comprehensive example showing all API features
- Add performance monitoring and error handling
- Include real-world usage patterns
- **Dependencies**: 3.1
- **Deliverable**: Example content script
- **Acceptance**: Developers can understand API usage from examples

**3.3 Real-time Synchronization**

- Implement instant updates across all contexts
- Add conflict resolution for concurrent modifications
- Setup performance optimization for large settings
- **Dependencies**: 3.1
- **Deliverable**: Real-time sync system
- **Acceptance**: Settings changes appear instantly across all components

### Phase 4: Testing & Quality Assurance (Week 4)

**4.1 Unit Testing**

- Create test suite for SettingsManager
- Add validation testing for all data types
- Test error handling and edge cases
- **Dependencies**: 3.3
- **Deliverable**: Comprehensive test suite
- **Acceptance**: 90%+ code coverage with passing tests

**4.2 Cross-Browser Testing**

- Test all functionality in Chrome and Firefox
- Verify performance across different versions
- Test storage limits and error conditions
- **Dependencies**: 4.1
- **Deliverable**: Cross-browser compatibility report
- **Acceptance**: All features work identically across browsers

**4.3 Performance Optimization**

- Optimize storage operations for large settings
- Implement caching for frequently accessed settings
- Minimize memory usage in content scripts
- **Dependencies**: 4.2
- **Deliverable**: Performance-optimized extension
- **Acceptance**: All operations complete within success criteria timing

### Phase 5: Documentation & Deployment (Week 5)

**5.1 API Documentation**

- Create comprehensive API reference
- Add code examples for all functions
- Document error codes and troubleshooting
- **Dependencies**: 4.3
- **Deliverable**: Complete API documentation
- **Acceptance**: Developers can implement without additional support

**5.2 User Documentation**

- Create user guide for settings management
- Add troubleshooting section
- Create video tutorials for complex features
- **Dependencies**: 5.1
- **Deliverable**: User documentation
- **Acceptance**: Users can use all features without support

**5.3 Store Deployment**

- Package extension for Chrome Web Store
- Submit to Firefox Add-ons
- Setup automated deployment pipeline
- **Dependencies**: 5.2
- **Deliverable**: Published extension
- **Acceptance**: Extension available in both stores

## 🔗 Integration & Dependencies

### Internal Dependencies

**Settings Manager → Storage API**

- Direct dependency on browser.storage.local for persistence
- Fallback to browser.storage.sync for cross-device sync
- Error handling for storage quota exceeded

**UI Components → Settings Manager**

- Popup and options pages communicate through message passing
- Real-time updates via event listeners
- Shared validation logic

**Content Scripts → Background Service**

- All settings requests routed through background service worker
- Message passing for CRUD operations
- Event broadcasting for real-time updates

### External Service Integration

**Browser Storage API**

- Primary: storage.local (5MB limit, local persistence)
- Secondary: storage.sync (100KB limit, cross-device sync)
- Managed: storage.managed (read-only, enterprise policies)

**WebExtension APIs**

- runtime.onMessage for inter-component communication
- action API for browser toolbar integration
- tabs API for broadcasting changes to content scripts

### Data Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Content       │    │   Background    │    │   Browser       │
│   Script        │◄──►│   Service       │◄──►│   Storage       │
│                 │    │   Worker        │    │   API           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Settings      │    │   Settings      │    │   Default       │
│   UI (Popup)    │    │   Manager       │    │   Config        │
│                 │    │   Core          │    │   (JSON)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Error Handling Strategy

**Storage Errors**

- Quota exceeded: Implement data compression and cleanup
- Access denied: Fallback to session storage
- Corruption: Automatic recovery from defaults

**Network Errors**

- Default config loading: Embedded fallback defaults
- Cross-browser sync: Graceful degradation to local-only

**Validation Errors**

- User input: Real-time validation with helpful messages
- Import data: Comprehensive validation with detailed error reports
- Type mismatches: Automatic type conversion where safe

## 🧪 Testing & Validation Strategy

### Unit Testing

**Settings Manager Tests**

```javascript
describe('SettingsManager', () => {
  test('should initialize with defaults', async () => {
    const manager = new SettingsManager();
    await manager.initialize();
    expect(manager.getSetting('feature_enabled')).toBe(true);
  });
  
  test('should validate boolean settings', async () => {
    const manager = new SettingsManager();
    await manager.initialize();
    
    await expect(manager.updateSetting('feature_enabled', 'invalid'))
      .rejects.toThrow('must be a boolean');
  });
  
  test('should handle large longtext settings', async () => {
    const manager = new SettingsManager();
    await manager.initialize();
    
    const largeText = 'x'.repeat(10000);
    await manager.updateSetting('custom_css', largeText);
    
    const retrieved = await manager.getSetting('custom_css');
    expect(retrieved.value).toBe(largeText);
  });
});
```

**Content Script API Tests**

```javascript
describe('ContentScriptSettings', () => {
  test('should get settings from background', async () => {
    const settings = new ContentScriptSettings();
    const value = await settings.getSetting('feature_enabled');
    expect(typeof value).toBe('boolean');
  });
  
  test('should handle message passing errors', async () => {
    const settings = new ContentScriptSettings();
    await expect(settings.getSetting('nonexistent'))
      .rejects.toThrow('Setting nonexistent not found');
  });
});
```

### Integration Testing

**Cross-Component Communication**

- Test message passing between all components
- Verify real-time updates across contexts
- Test error propagation and handling

**Storage Integration**

- Test storage quota limits
- Verify data persistence across browser restarts
- Test concurrent access scenarios

**Browser Compatibility**

- Automated testing in Chrome and Firefox
- Test extension installation and updates
- Verify API compatibility across versions

### End-to-End Testing

**User Workflows**

1. Install extension → Settings load correctly
2. Modify settings → Changes persist after restart
3. Export settings → File downloads successfully
4. Import settings → Settings update correctly
5. Reset settings → Defaults restored

**Performance Testing**

- Measure settings load time (target: <100ms)
- Test with maximum data size (1MB settings)
- Monitor memory usage in content scripts
- Verify UI responsiveness with large datasets

### Acceptance Criteria

**Functional Requirements**

- ✅ All setting types (boolean, text, longtext, number, JSON) supported
- ✅ Cross-browser compatibility (Chrome, Firefox)
- ✅ Real-time synchronization across components
- ✅ Export/import functionality with validation
- ✅ Content script API with all CRUD operations

**Performance Requirements**

- ✅ Settings load in <100ms
- ✅ UI responds in <500ms
- ✅ Content script access in <50ms
- ✅ Support for 1MB+ settings files
- ✅ Memory usage <10MB per tab

**Quality Requirements**

- ✅ 90%+ unit test coverage
- ✅ Zero critical security vulnerabilities
- ✅ Comprehensive error handling
- ✅ Accessible UI (WCAG 2.1 AA)
- ✅ Detailed API documentation

## 🚀 Deployment & Operations

### Environment Configuration

**Development Environment**

```json
{
  "manifest_version": 3,
  "name": "Settings Extension (Dev)",
  "version": "1.0.0-dev",
  "permissions": ["storage", "activeTab", "tabs"],
  "host_permissions": ["*://localhost/*"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

**Production Environment**

```json
{
  "manifest_version": 3,
  "name": "Settings Extension",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Deployment Process

**Chrome Web Store Deployment**

1. Build production package with `web-ext build`
2. Create store listing with screenshots and descriptions
3. Upload extension package through Chrome Web Store Developer Dashboard
4. Submit for review (typically 2-3 days)
5. Monitor review status and address feedback

**Firefox Add-ons Deployment**

1. Build production package with `web-ext build`
2. Create listing on Firefox Add-ons Developer Hub
3. Upload extension package and metadata
4. Submit for review (typically 1-2 days for initial review)
5. Monitor review status and address feedback

**Automated Deployment Pipeline**

```yaml
# GitHub Actions workflow
name: Deploy Extension
on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build extension
        run: npm run build
      - name: Deploy to Chrome Web Store
        uses: PlasmoHQ/bpp@v2
        with:
          keys: ${{ secrets.CHROME_STORE_KEYS }}
      - name: Deploy to Firefox Add-ons
        uses: PlasmoHQ/bpp@v2
        with:
          keys: ${{ secrets.FIREFOX_ADDON_KEYS }}
```

### Monitoring & Analytics

**Performance Monitoring**

- Track settings load times across user base
- Monitor extension memory usage
- Alert on storage quota issues
- Track user adoption of features

**Error Tracking**

- Implement error reporting for unhandled exceptions
- Track validation errors and user pain points
- Monitor cross-browser compatibility issues
- Set up alerts for critical errors

**Usage Analytics**

- Track most commonly used settings
- Monitor export/import feature usage
- Analyze user workflow patterns
- Measure user retention and engagement

### Scaling Considerations

**Storage Scaling**

- Implement data compression for large settings
- Add pagination for settings with many values
- Consider cloud storage integration for enterprise users
- Implement cache eviction strategies

**Performance Scaling**

- Lazy load settings in UI
- Implement virtualization for large lists
- Add background sync for heavy operations
- Optimize bundle size with tree shaking

**Feature Scaling**

- Design plugin architecture for custom setting types
- Add theming support for UI customization
- Implement settings categories and grouping
- Add advanced filtering and search capabilities

### Maintenance Tasks

**Regular Updates**

- Update WebExtension Polyfill for new browser features
- Review and update storage limits as browsers evolve
- Maintain compatibility with browser API changes
- Update dependencies and security patches

**User Support**

- Monitor user feedback and reviews
- Provide troubleshooting guides
- Create video tutorials for complex features
- Maintain FAQ and common issues documentation

**Security Maintenance**

- Regular security audits of storage handling
- Update Content Security Policy as needed
- Monitor for new browser security features
- Implement additional validation as threats evolve

---

## Example Content Script Implementation

```javascript
// examples/content-script-example.js
// Example content script demonstrating complete settings usage

class ExampleContentScript {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.init();
  }

  async init() {
    // Load initial settings
    await this.loadSettings();
    
    // Setup change listeners
    this.setupChangeListeners();
    
    // Apply settings to page
    this.applySettings();
  }

  async loadSettings() {
    try {
      // Get individual setting
      const featureEnabled = await this.settings.getSetting('feature_enabled');
      console.log('Feature enabled:', featureEnabled.value);
      
      // Get multiple settings
      const basicSettings = await this.settings.getSettings([
        'feature_enabled',
        'refresh_interval',
        'api_key'
      ]);
      console.log('Basic settings:', basicSettings);
      
      // Get all settings
      const allSettings = await this.settings.getAllSettings();
      console.log('All settings:', allSettings);
      
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  setupChangeListeners() {
    // Listen for settings changes
    this.settings.addChangeListener((changes) => {
      console.log('Settings changed:', changes);
      
      // React to specific setting changes
      if (changes.custom_css) {
        this.updateCustomCSS(changes.custom_css);
      }
      
      if (changes.feature_enabled) {
        this.toggleFeature(changes.feature_enabled);
      }
    });
  }

  async applySettings() {
    const settings = await this.settings.getAllSettings();
    
    // Apply custom CSS
    if (settings.custom_css && settings.custom_css.value) {
      this.updateCustomCSS(settings.custom_css.value);
    }
    
    // Setup refresh interval
    if (settings.refresh_interval) {
      this.setupRefreshInterval(settings.refresh_interval.value);
    }
    
    // Configure API endpoint
    if (settings.advanced_config) {
      this.configureAPI(settings.advanced_config.value);
    }
  }

  updateCustomCSS(css) {
    // Remove existing custom styles
    const existingStyles = document.getElementById('extension-custom-styles');
    if (existingStyles) {
      existingStyles.remove();
    }
    
    // Add new custom styles
    if (css && css.trim()) {
      const style = document.createElement('style');
      style.id = 'extension-custom-styles';
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  toggleFeature(enabled) {
    if (enabled) {
      this.enableFeature();
    } else {
      this.disableFeature();
    }
  }

  enableFeature() {
    // Enable main feature functionality
    document.body.classList.add('extension-enabled');
    this.setupFeatureListeners();
  }

  disableFeature() {
    // Disable main feature functionality
    document.body.classList.remove('extension-enabled');
    this.removeFeatureListeners();
  }

  setupRefreshInterval(seconds) {
    // Clear existing interval
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
    
    // Setup new interval
    this.refreshIntervalId = setInterval(() => {
      this.refreshContent();
    }, seconds * 1000);
  }

  configureAPI(config) {
    // Configure API settings
    this.apiConfig = {
      endpoint: config.endpoint || 'https://api.example.com',
      timeout: config.timeout || 5000,
      retries: config.retries || 3
    };
  }

  async refreshContent() {
    // Refresh page content based on settings
    try {
      const response = await fetch(this.apiConfig.endpoint, {
        timeout: this.apiConfig.timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateContent(data);
      }
    } catch (error) {
      console.error('Content refresh failed:', error);
    }
  }

  updateContent(data) {
    // Update page content with new data
    const container = document.getElementById('content-container');
    if (container) {
      container.innerHTML = `
        <div class="updated-content">
          <h3>Updated: ${new Date().toLocaleString()}</h3>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
      `;
    }
  }

  setupFeatureListeners() {
    // Setup feature-specific event listeners
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  removeFeatureListeners() {
    // Remove feature-specific event listeners
    document.removeEventListener('click', this.handleClick.bind(this));
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }

  handleClick(event) {
    // Handle click events when feature is enabled
    if (event.target.classList.contains('special-element')) {
      this.processSpecialElement(event.target);
    }
  }

  handleKeydown(event) {
    // Handle keyboard shortcuts
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      this.showQuickSettings();
    }
  }

  processSpecialElement(element) {
    // Process special elements based on settings
    element.classList.add('processed');
    element.setAttribute('data-processed', new Date().toISOString());
  }

  async showQuickSettings() {
    // Show quick settings overlay
    const overlay = document.createElement('div');
    overlay.id = 'quick-settings-overlay';
    overlay.innerHTML = `
      <div class="quick-settings">
        <h3>Quick Settings</h3>
        <label>
          <input type="checkbox" id="feature-toggle"> Enable Feature
        </label>
        <label>
          Refresh Interval: <input type="number" id="refresh-input" min="1" max="3600">
        </label>
        <button id="save-quick-settings">Save</button>
        <button id="close-quick-settings">Close</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Load current settings
    const featureEnabled = await this.settings.getSetting('feature_enabled');
    const refreshInterval = await this.settings.getSetting('refresh_interval');
    
    document.getElementById('feature-toggle').checked = featureEnabled.value;
    document.getElementById('refresh-input').value = refreshInterval.value;
    
    // Setup event listeners
    document.getElementById('save-quick-settings').addEventListener('click', async () => {
      const enabled = document.getElementById('feature-toggle').checked;
      const interval = parseInt(document.getElementById('refresh-input').value);
      
      await this.settings.updateSettings({
        feature_enabled: enabled,
        refresh_interval: interval
      });
      
      document.body.removeChild(overlay);
    });
    
    document.getElementById('close-quick-settings').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
  }

  // Cleanup method
  destroy() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
    
    this.removeFeatureListeners();
    
    const customStyles = document.getElementById('extension-custom-styles');
    if (customStyles) {
      customStyles.remove();
    }
  }
}

// Initialize the content script
const exampleScript = new ExampleContentScript();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  exampleScript.destroy();
});
```

This comprehensive MCD provides a complete blueprint for building a robust Manifest V3 browser extension with extensive settings management capabilities. The implementation covers all requirements while maintaining cross-browser compatibility and following modern web extension best practices.