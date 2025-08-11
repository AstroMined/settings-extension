# Testing Guide

## Executive Summary

Comprehensive guide for writing, running, and maintaining tests for the Settings Extension project. Covers unit testing, integration testing, cross-browser testing, and performance testing using Jest, jsdom, and web-ext tools.

## Scope

- **Applies to**: All extension components and testing scenarios
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Testing Architecture

### Testing Framework Stack

- **Unit Testing**: Jest with jsdom environment
- **Cross-Browser Testing**: web-ext with Chrome and Firefox
- **Coverage**: Jest coverage reports (80% threshold)
- **Mocking**: Minimal mocking, prefer real objects
- **Style**: Function-style tests (not class-style)

### Test Directory Structure

```
test/
├── unit/                    # Unit tests
│   ├── background.test.js   # Background script tests
│   ├── content-script.test.js # Content script tests  
│   ├── popup.test.js        # Popup functionality tests
│   └── lib/                 # Library unit tests
│       ├── settings-manager.test.js
│       └── content-settings.test.js
├── integration/             # Integration tests
│   ├── storage.test.js      # Storage operations
│   ├── messaging.test.js    # Message passing
│   └── cross-component.test.js
├── browser/                 # Browser-specific tests
│   ├── chrome/              # Chrome-specific tests
│   └── firefox/             # Firefox-specific tests
├── performance/             # Performance tests
│   └── load-time.test.js
├── fixtures/                # Test data
│   ├── settings.json        # Sample settings
│   └── mock-responses.json
└── helpers/                 # Test utilities
    ├── chrome-mock.js       # Chrome API mocks
    ├── firefox-mock.js      # Firefox API mocks
    └── test-utils.js        # Common utilities
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- background.test.js

# Run tests matching pattern
npm test -- --testNamePattern="storage"
```

### Browser-Specific Testing

```bash
# Test in Chrome
npm run test:chrome

# Test in Firefox
npm run test:firefox

# Test in both browsers
npm run test:all

# Validate extension in browsers
npm run validate
```

### Coverage Requirements

```bash
# Check coverage thresholds
npm run test:coverage

# Coverage must meet:
# - Statements: 80%
# - Branches: 80%
# - Functions: 80%
# - Lines: 80%
```

## Unit Testing

### Basic Test Structure

Following function-style testing (no classes) with real objects:

```javascript
// test/unit/settings-manager.test.js
import { SettingsManager } from '../../lib/settings-manager.js';
import { chromeMock } from '../helpers/chrome-mock.js';

// Setup real browser environment
beforeEach(() => {
  global.chrome = chromeMock;
  // Clear any previous data
  chromeMock.storage.local.clear();
});

afterEach(() => {
  // Cleanup but don't reset mocks - use real cleanup
  chromeMock.storage.local.clear();
});

describe('SettingsManager', () => {
  test('should save settings to storage', async () => {
    const manager = new SettingsManager();
    const settings = {
      theme: 'dark',
      notifications: true
    };

    await manager.saveSettings(settings);
    
    // Verify using real storage API
    const stored = await chromeMock.storage.local.get(['settings']);
    expect(stored.settings).toEqual(settings);
  });

  test('should load default settings when none exist', async () => {
    const manager = new SettingsManager();
    
    const settings = await manager.loadSettings();
    
    expect(settings).toMatchObject({
      theme: 'light', // default value
      notifications: false // default value
    });
  });

  test('should handle storage errors gracefully', async () => {
    const manager = new SettingsManager();
    
    // Simulate storage error using real error conditions
    chromeMock.storage.local.simulateError('QUOTA_EXCEEDED');
    
    const settings = { data: 'x'.repeat(10000000) }; // Oversized data
    
    await expect(manager.saveSettings(settings))
      .rejects
      .toThrow('Storage quota exceeded');
  });
});
```

### Browser API Mocking

Create realistic mocks that behave like real browser APIs:

```javascript
// test/helpers/chrome-mock.js
class ChromeMock {
  constructor() {
    this.storage = {
      local: new StorageMock(),
      sync: new StorageMock()
    };
    this.runtime = new RuntimeMock();
    this.tabs = new TabsMock();
  }
}

class StorageMock {
  constructor() {
    this.data = {};
  }

  async get(keys) {
    if (keys === null || keys === undefined) {
      return this.data;
    }
    
    if (Array.isArray(keys)) {
      const result = {};
      keys.forEach(key => {
        if (key in this.data) {
          result[key] = this.data[key];
        }
      });
      return result;
    }
    
    if (typeof keys === 'object') {
      const result = {};
      Object.keys(keys).forEach(key => {
        result[key] = this.data[key] !== undefined ? this.data[key] : keys[key];
      });
      return result;
    }
    
    // String key
    return { [keys]: this.data[keys] };
  }

  async set(items) {
    Object.assign(this.data, items);
  }

  async remove(keys) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach(key => delete this.data[key]);
  }

  clear() {
    this.data = {};
  }

  simulateError(errorType) {
    this.nextError = errorType;
  }
}

export const chromeMock = new ChromeMock();
```

### Content Script Testing

```javascript
// test/unit/content-script.test.js
import { JSDOM } from 'jsdom';
import { ContentSettings } from '../../lib/content-settings.js';

describe('Content Script', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Create real DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <input type="text" id="username" />
          <select id="language">
            <option value="en">English</option>
            <option value="es">Spanish</option>
          </select>
        </body>
      </html>
    `);
    
    document = dom.window.document;
    window = dom.window;
    
    // Set up globals
    global.document = document;
    global.window = window;
  });

  afterEach(() => {
    dom = null;
    delete global.document;
    delete global.window;
  });

  test('should detect form fields correctly', () => {
    const contentSettings = new ContentSettings();
    
    const fields = contentSettings.detectFormFields(document);
    
    expect(fields).toHaveLength(2);
    expect(fields[0]).toMatchObject({
      id: 'username',
      type: 'text',
      tagName: 'INPUT'
    });
    expect(fields[1]).toMatchObject({
      id: 'language',
      type: 'select-one',
      tagName: 'SELECT'
    });
  });

  test('should apply settings to form fields', () => {
    const contentSettings = new ContentSettings();
    const settings = {
      username: 'testuser',
      language: 'es'
    };
    
    contentSettings.applySettings(document, settings);
    
    expect(document.getElementById('username').value).toBe('testuser');
    expect(document.getElementById('language').value).toBe('es');
  });
});
```

## Integration Testing

### Cross-Component Communication

```javascript
// test/integration/messaging.test.js
import { BackgroundScript } from '../../background.js';
import { ContentScript } from '../../content-script.js';
import { chromeMock } from '../helpers/chrome-mock.js';

describe('Message Passing Integration', () => {
  let background;
  let content;

  beforeEach(async () => {
    global.chrome = chromeMock;
    
    // Initialize real components
    background = new BackgroundScript();
    content = new ContentScript();
    
    await background.init();
    await content.init();
  });

  test('should handle settings request from content script', async () => {
    // Pre-populate settings
    await chromeMock.storage.local.set({
      settings: { theme: 'dark', autoSave: true }
    });

    // Send message from content to background
    const response = await chromeMock.runtime.sendMessage({
      type: 'GET_SETTINGS'
    });

    expect(response).toMatchObject({
      success: true,
      settings: {
        theme: 'dark',
        autoSave: true
      }
    });
  });

  test('should sync settings across components', async () => {
    const newSettings = { theme: 'light', notifications: false };

    // Update settings in background
    await background.updateSettings(newSettings);

    // Verify content script receives update
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow async propagation
    
    const contentSettings = await content.getCurrentSettings();
    expect(contentSettings).toMatchObject(newSettings);
  });
});
```

### Storage Integration

```javascript
// test/integration/storage.test.js
import { SettingsManager } from '../../lib/settings-manager.js';
import { StorageService } from '../../lib/storage-service.js';

describe('Storage Integration', () => {
  let settingsManager;
  let storageService;

  beforeEach(() => {
    settingsManager = new SettingsManager();
    storageService = new StorageService();
  });

  test('should maintain data consistency between local and sync', async () => {
    const settings = {
      preferences: { theme: 'auto' },
      profile: { name: 'Test User' }
    };

    await settingsManager.saveSettings(settings);
    
    // Verify both storage areas are updated
    const localData = await storageService.getLocal('settings');
    const syncData = await storageService.getSync('settings');
    
    expect(localData).toEqual(settings);
    expect(syncData).toEqual(settings);
  });

  test('should resolve conflicts during sync', async () => {
    // Simulate conflict scenario
    const localSettings = { theme: 'dark', lastModified: Date.now() - 1000 };
    const syncSettings = { theme: 'light', lastModified: Date.now() };

    await storageService.setLocal('settings', localSettings);
    await storageService.setSync('settings', syncSettings);

    // Trigger conflict resolution
    await settingsManager.resolveConflicts();

    // Should keep most recent (sync)
    const resolved = await settingsManager.getSettings();
    expect(resolved.theme).toBe('light');
  });
});
```

## Browser-Specific Testing

### Chrome-Specific Tests

```javascript
// test/browser/chrome/manifest-v3.test.js
import { ServiceWorker } from '../../../background.js';

describe('Chrome Manifest V3 Features', () => {
  test('should register service worker correctly', async () => {
    const sw = new ServiceWorker();
    
    await sw.register();
    
    expect(chrome.runtime.getManifest().manifest_version).toBe(3);
    expect(sw.isActive()).toBe(true);
  });

  test('should handle service worker lifecycle', async () => {
    const sw = new ServiceWorker();
    const lifecycleEvents = [];

    sw.on('install', () => lifecycleEvents.push('install'));
    sw.on('activate', () => lifecycleEvents.push('activate'));

    await sw.simulate('install');
    await sw.simulate('activate');

    expect(lifecycleEvents).toEqual(['install', 'activate']);
  });
});
```

### Firefox-Specific Tests

```javascript
// test/browser/firefox/webextension-api.test.js
describe('Firefox WebExtension APIs', () => {
  test('should use browser namespace correctly', () => {
    // Firefox uses 'browser' namespace
    global.browser = global.chrome;
    
    const { ExtensionAPI } = require('../../../lib/extension-api.js');
    const api = new ExtensionAPI();
    
    expect(api.isFirefox()).toBe(true);
    expect(api.getStorageAPI()).toBe(browser.storage);
  });
});
```

## Performance Testing

### Load Time Testing

```javascript
// test/performance/load-time.test.js
describe('Performance Tests', () => {
  test('settings should load within 100ms', async () => {
    const start = performance.now();
    
    const settingsManager = new SettingsManager();
    await settingsManager.loadSettings();
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('popup should render within 500ms', async () => {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<div id="popup"></div>');
    
    const start = performance.now();
    
    const { PopupUI } = await import('../../popup/popup.js');
    const popup = new PopupUI(dom.window.document.getElementById('popup'));
    await popup.render();
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });

  test('should handle large settings files efficiently', async () => {
    // Generate large settings object (approach 1MB limit)
    const largeSettings = {};
    for (let i = 0; i < 1000; i++) {
      largeSettings[`setting_${i}`] = {
        value: 'x'.repeat(100),
        metadata: { created: Date.now(), id: i }
      };
    }

    const start = performance.now();
    
    const settingsManager = new SettingsManager();
    await settingsManager.saveSettings(largeSettings);
    const loaded = await settingsManager.loadSettings();
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(1000); // Under 1 second
    expect(loaded).toMatchObject(largeSettings);
  });
});
```

### Memory Usage Testing

```javascript
// test/performance/memory.test.js
describe('Memory Usage Tests', () => {
  test('should not leak memory during repeated operations', async () => {
    const settingsManager = new SettingsManager();
    const initialMemory = process.memoryUsage().heapUsed;

    // Perform many operations
    for (let i = 0; i < 100; i++) {
      await settingsManager.saveSettings({ iteration: i });
      await settingsManager.loadSettings();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemory - initialMemory;
    
    // Memory growth should be reasonable (< 10MB)
    expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
  });
});
```

## Test Utilities and Helpers

### Common Test Utilities

```javascript
// test/helpers/test-utils.js
export class TestUtils {
  static async waitFor(condition, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await this.sleep(50);
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static generateSettings(count = 10) {
    const settings = {};
    for (let i = 0; i < count; i++) {
      settings[`test_setting_${i}`] = {
        type: 'text',
        value: `value_${i}`,
        description: `Test setting ${i}`
      };
    }
    return settings;
  }

  static mockDOM(html = '<html><body></body></html>') {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(html);
    global.document = dom.window.document;
    global.window = dom.window;
    return dom;
  }

  static cleanupDOM() {
    delete global.document;
    delete global.window;
  }

  static async expectEventually(assertion, timeout = 2000) {
    const start = Date.now();
    let lastError;

    while (Date.now() - start < timeout) {
      try {
        await assertion();
        return; // Success
      } catch (error) {
        lastError = error;
        await this.sleep(100);
      }
    }

    throw lastError;
  }
}
```

### Browser Mock Factory

```javascript
// test/helpers/browser-mock-factory.js
export class BrowserMockFactory {
  static createChromeMock() {
    return {
      storage: this.createStorageMock(),
      runtime: this.createRuntimeMock(),
      tabs: this.createTabsMock(),
      action: this.createActionMock()
    };
  }

  static createStorageMock() {
    const data = { local: {}, sync: {} };
    
    return {
      local: {
        get: jest.fn((keys) => Promise.resolve(this.getData(data.local, keys))),
        set: jest.fn((items) => Promise.resolve(Object.assign(data.local, items))),
        remove: jest.fn((keys) => Promise.resolve(this.removeKeys(data.local, keys))),
        clear: jest.fn(() => Promise.resolve(data.local = {}))
      },
      sync: {
        get: jest.fn((keys) => Promise.resolve(this.getData(data.sync, keys))),
        set: jest.fn((items) => Promise.resolve(Object.assign(data.sync, items))),
        remove: jest.fn((keys) => Promise.resolve(this.removeKeys(data.sync, keys))),
        clear: jest.fn(() => Promise.resolve(data.sync = {}))
      },
      onChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    };
  }

  static getData(storage, keys) {
    if (!keys) return storage;
    if (Array.isArray(keys)) {
      return keys.reduce((result, key) => {
        if (key in storage) result[key] = storage[key];
        return result;
      }, {});
    }
    if (typeof keys === 'object') {
      return Object.keys(keys).reduce((result, key) => {
        result[key] = storage[key] !== undefined ? storage[key] : keys[key];
        return result;
      }, {});
    }
    return { [keys]: storage[keys] };
  }

  static removeKeys(storage, keys) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach(key => delete storage[key]);
  }
}
```

## Continuous Integration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testMatch: [
    '<rootDir>/test/**/*.test.js'
  ],
  collectCoverageFrom: [
    'lib/**/*.js',
    'background.js',
    'content-script.js',
    'popup/**/*.js',
    'options/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
  verbose: true,
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
};
```

### Test Setup

```javascript
// test/setup.js
import { BrowserMockFactory } from './helpers/browser-mock-factory.js';

// Global test setup
beforeEach(() => {
  // Reset browser mocks
  global.chrome = BrowserMockFactory.createChromeMock();
  global.browser = global.chrome; // Firefox compatibility
  
  // Clear any previous state
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup
  delete global.chrome;
  delete global.browser;
});

// Suppress console.log in tests unless DEBUG=true
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };
}
```

## Best Practices

### 1. Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests focused and atomic

### 2. Real Object Testing
- Minimize mocking, use real objects when possible
- Mock only external dependencies (browser APIs, network)
- Test actual behavior, not implementation details

### 3. Async Testing
```javascript
// Good: Proper async/await
test('should save settings asynchronously', async () => {
  await settingsManager.saveSettings(data);
  const saved = await settingsManager.loadSettings();
  expect(saved).toEqual(data);
});

// Bad: Not handling promises
test('should save settings', () => {
  settingsManager.saveSettings(data);
  const saved = settingsManager.loadSettings(); // Missing await
  expect(saved).toEqual(data); // Will fail
});
```

### 4. Error Testing
```javascript
test('should handle storage errors gracefully', async () => {
  // Create real error condition
  chromeMock.storage.local.simulateQuotaExceeded();
  
  await expect(settingsManager.saveSettings(largeData))
    .rejects
    .toThrow('Storage quota exceeded');
});
```

### 5. Cross-Browser Testing
```javascript
// Test browser-specific behavior
describe.each(['chrome', 'firefox'])('%s browser', (browser) => {
  beforeEach(() => {
    global.chrome = BrowserMockFactory.create(browser);
  });

  test('should work in ' + browser, async () => {
    // Test implementation
  });
});
```

## Troubleshooting Tests

### Common Issues

1. **Async test failures**
   ```javascript
   // Make sure to await all async operations
   await expect(asyncFunction()).resolves.toBe(expected);
   ```

2. **DOM not available**
   ```javascript
   // Setup DOM in beforeEach
   beforeEach(() => {
     document.body.innerHTML = '<div id="test"></div>';
   });
   ```

3. **Browser API mocks not working**
   ```javascript
   // Verify mocks are set up in setup.js
   expect(chrome.storage.local.get).toBeDefined();
   ```

4. **Memory leaks in tests**
   ```javascript
   afterEach(() => {
     // Clean up event listeners, timers, etc.
     jest.clearAllTimers();
     jest.clearAllMocks();
   });
   ```

## Related Documentation

### Architecture Context
Testing validates these architectural components and quality goals:
- **[Building Blocks View](../../architecture/05-building-blocks.md)** - Components this guide provides testing procedures for
- **[Quality Requirements](../../architecture/10-quality-requirements.md)** - Quality attributes and targets validated by testing
- **[Architecture Decisions](../../architecture/09-architecture-decisions/)** - Technical decisions that shape testing approaches

### Development Context
- **[Local Setup Guide](local-setup.md)** - Development environment setup required before testing
- **[Extension Development Guide](../guides/extension-development.md)** - Development patterns this guide validates
- **[Performance Profiling Guide](../guides/performance-profiling.md)** - Performance testing procedures and techniques
- **[Debugging Guide](debugging-guide.md)** - Debugging techniques for test failures
- **[Code Review Guide](../guides/code-review.md)** - How testing fits into the review process

### User Context
Testing ensures these user experiences work correctly:
- **[Settings Types Reference](../../user/reference/settings-types.md)** - User-facing API that tests validate
- **[User Workflows](../../user/how-to/)** - User workflows that integration tests cover
- **[Core Concepts](../../user/explanation/concepts.md)** - Concepts that tests verify work as intended

### Team Standards
- **[Coding Standards](../conventions/coding-standards.md)** - Code quality standards enforced through testing
- **[Git Workflow](../conventions/git-workflow.md)** - How testing integrates with version control

### External Testing Resources
- **[Jest Testing Framework](https://jestjs.io/)** - Main testing framework documentation
- **[jsdom Documentation](https://github.com/jsdom/jsdom)** - DOM testing environment
- **[Web-ext CLI](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)** - Extension testing and validation tool
- **[Chrome Extension Testing](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)** - Browser-specific testing guidance

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-08-11 | Developer Team | Initial testing guide |