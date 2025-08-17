# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Development Commands

```bash
# Development
npm run dev              # Start development with file watching and serving
npm run build            # Build extension for Chrome/Edge (copies files to dist/)
npm run build:firefox    # Build extension for Firefox (uses Firefox-specific manifest)
npm run dist             # Build dist/ + create both web-ext-artifacts (recommended for releases)
npm run serve            # Serve built extension for testing

# Testing
npm test                 # Run all tests with Jest (80% coverage threshold)
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate detailed coverage report
npm run test:e2e         # Run enhanced E2E tests with Playwright (recommended)
npm run test:e2e:ui      # Run E2E tests with Playwright UI mode
npm run test:chrome      # Test extension in Chrome browser (manual)
npm run test:firefox     # Test extension in Firefox browser (manual)

# Enhanced E2E Testing (Preferred for Extension Testing)
# ⚡ OPTIMIZED: 79% faster with 3-worker parallel execution
npm run test:e2e:chrome                    # Run E2E tests in Chrome (42 tests in ~47s local, ~66s CI)
npm run test:e2e:firefox                   # Run E2E tests in Firefox with FirefoxFunctionalTester (NEW!)
npm run test:e2e:firefox-functional        # Run comprehensive Firefox functional tests
npm run test:e2e:all                       # Run both Chrome and Firefox E2E tests
npm run test:e2e -- --grep "popup"        # Run specific E2E test patterns
HEADED=true npm run test:e2e:chrome        # Force headed mode for local debugging
CI=true npm run test:e2e:chrome            # Simulate CI environment with optimized flags

# Code Quality (run before commits)
npm run lint             # Check code with ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format code with Prettier

# Cleanup Commands
npm run clean            # Clean dist/, artifacts, and test data directories
npm run clean:test-data  # Clean test directories older than 60 minutes (safe for concurrent runs)
npm run clean:test-data:force # Force clean all test directories immediately

# ⚠️ CRITICAL BUILD DEPENDENCIES FOR E2E TESTS
# ALWAYS use npm scripts (test:e2e:chrome, test:e2e:firefox) instead of direct npx playwright commands
# Direct npx commands may fail with "service worker timeout" if dist/ folder is missing or stale
# The npm scripts include essential steps: cleanup old test data + fresh build + extension artifacts
# ✅ AUTOMATIC CLEANUP: E2E tests now automatically clean up old test directories before running

# CRITICAL: Before making message handling changes, see "Critical Manifest V3 Patterns" section below!
# IMPORTANT: For reliable extension testing, use npm run test:e2e instead of manual browser testing

# Single Test Examples
npm test -- settings-manager.test.js                         # Run specific test file
npm test -- --testNamePattern="should save settings"         # Run specific test by name
npm run test:e2e -- --grep "popup opens and displays"       # Run specific E2E test
```

## Architecture Overview

This is a **Manifest V3 browser extension framework** for cross-browser settings management.

**Key Architecture Decisions**:

- **Vanilla JavaScript**: No frameworks, maximum compatibility across browsers
- **Custom Browser Compatibility Layer**: `lib/browser-compat.js` handles Chrome/Firefox differences (no WebExtension Polyfill)
- **Manifest V3**: Service worker architecture with modern extension APIs
- **File-Based Build**: Simple Node.js script copies files (no bundling/transpiling)
- **Schema-Driven Settings**: JSON-based configuration with validation

**Core System Design**:

- **Service Worker** (`background.js`) - Central message routing and storage coordination
- **Settings Manager** (`lib/settings-manager.js`) - Core CRUD operations and validation
- **Content Script API** (`lib/content-settings.js`) - Programmatic access from web pages
- **Dual UI** - Popup for quick access, Options page for advanced management

**Performance Targets**:

- Settings operations: <100ms
- UI load times: <500ms
- Memory usage: <10MB per tab
- Test coverage: >80% (stricter for core modules)
- **E2E test suite**: ~47 seconds (local), ~66 seconds (CI) - 79% improvement from original 4+ minutes

## ⚠️ Critical Manifest V3 Patterns

### **NEVER Use `async function handleMessage()`**

**Problem**: Using `async function handleMessage()` in Manifest V3 service workers causes "message port closed before response received" errors, even when returning `true` and calling `sendResponse()` correctly.

**Why This Happens**:

- `async function` returns `Promise.resolve(true)`, not `true`
- Chrome message ports don't stay open for Promise-based returns
- Async operations complete after the port closes
- Service worker logs show success, but responses never reach sender

**❌ WRONG Pattern**:

```javascript
// This will cause "message port closed" errors
async function handleMessage(message, sender, sendResponse) {
  const result = await someAsyncOperation();
  sendResponse(result);
  return true; // Actually returns Promise.resolve(true)
}
```

**✅ CORRECT Pattern**:

```javascript
// Split sync and async handling
function handleMessage(message, sender, sendResponse) {
  // Handle sync messages immediately
  if (message.type === "PING") {
    sendResponse({ pong: true });
    return false; // Don't keep port open for sync
  }

  // Delegate async operations
  processAsyncMessage(message, sender, sendResponse);
  return true; // Keep port open for async response
}

async function processAsyncMessage(message, sender, sendResponse) {
  try {
    const result = await someAsyncOperation();
    sendResponse(result);
  } catch (error) {
    sendResponse({ error: error.message });
  }
}
```

**Debugging This Issue**:

- Service worker logs show successful message handling
- But popup/content scripts get "port closed" errors
- This mismatch is the key diagnostic sign
- Always check if `handleMessage` is declared `async`

## 🏗️ Decoupled Architecture Pattern

### **Popup ↔ Background ↔ Storage (Content Scripts Optional)**

**Core Principle**: The popup must work independently of content scripts for all settings operations.

**✅ CORRECT Architecture**:

```
Popup ↔ Background ↔ Storage
   ↓ (optional)
Content Script (page DOM manipulation only)
```

**Implementation Details**:

1. **Popup Settings Loading**:
   - Primary: `browserAPI.runtime.sendMessage({ type: "GET_ALL_SETTINGS" })`
   - Fallback: `browserAPI.storage.local.get('settings')`
   - Last resort: `fetch(browserAPI.runtime.getURL('config/defaults.json'))`

2. **Background as Authority**:
   - Seeds settings from `config/defaults.json` if storage is empty
   - Handles all popup requests even if SettingsManager fails
   - Never depends on content script presence

3. **Content Scripts (Optional)**:
   - Only apply settings to page DOM
   - Listen to `storage.onChanged` for updates
   - Can be disabled without breaking popup

**❌ NEVER do this in popup**:

```javascript
// DON'T: Popup depending on content script
const response = await browserAPI.tabs.sendMessage(tabId, {
  type: "getSettings",
});
```

**✅ DO this instead**:

```javascript
// DO: Popup using background + storage
const response = await browserAPI.runtime.sendMessage({
  type: "GET_ALL_SETTINGS",
});
```

**ESLint Protection**: Automatic rules prevent `tabs.sendMessage` usage in popup for settings operations.

## Documentation Structure

This project has **comprehensive documentation** organized in three complementary systems:

- **[@docs/README.md](docs/README.md)** - Complete documentation hub with role-based navigation
- **[@docs/architecture/](docs/architecture/README.md)** - Technical design using arc42 framework
- **[@docs/user/](docs/user/README.md)** - End-user guides using Diátaxis framework
- **[@docs/developer/](docs/developer/README.md)** - Development workflows and standards

**Quick Links**:

- [Local Setup Guide](docs/developer/workflows/local-setup.md) - Development environment setup
- [Architecture Overview](docs/architecture/01-introduction-goals.md) - System understanding
- [Testing Guide](docs/developer/workflows/testing-guide.md) - **Zero-tolerance testing standards**
- [Testing Decision Matrix](docs/developer/conventions/testing-decision-matrix.md) - **Unit vs E2E test boundaries**
- [Settings API Reference](docs/user/reference/settings-types.md) - Complete settings documentation

## Settings Schema & Key Concepts

**Settings Format**: Schema-driven with validation

```javascript
{
  "setting_key": {
    "type": "boolean|text|longtext|number|json",
    "value": defaultValue,
    "description": "Human readable description"
    // + optional: maxLength, min, max constraints
  }
}
```

**Browser Compatibility**: Custom layer in `lib/browser-compat.js` handles Chrome/Firefox API differences without polyfills.

**Testing Standards**: **ZERO TOLERANCE for failing tests**. All tests must pass 100% before any PR merge.

- **Unit tests**: Pure functions only (validation, utilities) - see [Testing Decision Matrix](docs/developer/conventions/testing-decision-matrix.md)
- **E2E tests**: Browser integration (storage, DOM, workflows) - uses Playwright for Chrome, FirefoxFunctionalTester for Firefox
- **Firefox Testing**: 🎉 **NEW!** Real Firefox extension testing using web-ext + functional validation (replaces old smoke tests)
- **Cross-browser**: Both Chrome and Firefox now have full extension functionality testing
- **No integration tests**: Avoid over-mocked middle-ground that leads to flaky tests
- **Enforcement**: Failing tests indicate either bad tests or bugs - no third option

**→ See [Testing Guide](docs/developer/workflows/testing-guide.md) for complete standards**

**Build System**: Simple file copying via `scripts/build.js` - no bundling or transpilation. Firefox build uses different manifest.

## Firefox Extension Testing Breakthrough 🎉

### **Real Firefox Extension Testing (August 2025)**

We've successfully implemented **real Firefox extension testing** that replaces the previous smoke tests:

**New Firefox Testing Commands**:

```bash
npm run test:e2e:firefox                   # Run Firefox functional tests (replaces smoke tests)
npm run test:e2e:firefox-functional        # Run comprehensive Firefox extension validation
TEST_FIREFOX=true npm test:e2e:firefox     # Force enable Firefox testing in any environment
```

**What This Achieves**:

- ✅ **Real Firefox extension loading** using Mozilla's official `web-ext` tool
- ✅ **Actual `moz-extension://` URL testing** (no more protocol errors)
- ✅ **Extension functionality validation** (popup, options, storage, manifest)
- ✅ **CI/CD compatibility** with Xvfb and GitHub Actions
- ✅ **No more profile popup errors** with automatic profile management

**Technical Implementation**:

- Uses `FirefoxFunctionalTester` class in `test/e2e/utils/firefox-functional-tester.js`
- Leverages `web-ext run` for proper Firefox extension loading
- Validates extension files, UI components, and storage functionality
- Works in both local development and CI environments

**Migration from Smoke Tests**:
The old Firefox "smoke tests" only tested basic browser functionality without loading extensions. The new approach provides comprehensive extension testing equivalent to Chrome E2E tests.

## Common Issues & Troubleshooting

### ❌ "Service Worker Timeout" in Chromium E2E Tests

**Symptom**: `TimeoutError: browserContext.waitForEvent: Timeout exceeded while waiting for event "serviceworker"`

**Root Cause**: Running direct `npx playwright test --project=chromium` commands without ensuring fresh build artifacts in `dist/` folder.

**Solutions**:

1. **ALWAYS use npm scripts**: `npm run test:e2e:chrome` instead of `npx playwright test --project=chromium`
2. **Manual fix**: Run `npm run build` before any direct `npx playwright test` commands
3. **CI environments**: Use npm scripts in workflows, not direct npx commands

**Why this happens**: npm scripts include `npm run build &&` which ensures fresh extension artifacts are available for browser extension loading.

**Build System**: Simple file copying via `scripts/build.js` - no bundling or transpilation. Firefox build uses different manifest.

- This extension will NEVER be deployed to the Chrome or FireFox stores. The ONLY distribution methods are the dist/ directory for developers and the ZIP/XPI packages for end-users. NEVER suggest anything that aims to get the extension ready for "store deployment"
