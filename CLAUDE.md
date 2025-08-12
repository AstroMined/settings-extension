# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Development Commands

```bash
# Development
npm run dev              # Start development with file watching and serving
npm run build            # Build extension for Chrome/Edge (copies files to dist/)
npm run build:firefox    # Build extension for Firefox (uses Firefox-specific manifest)
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
npm run test:e2e -- --project=chromium    # Run E2E tests in Chrome only
npm run test:e2e -- --project=firefox     # Run E2E tests in Firefox only
npm run test:e2e -- --grep "popup"        # Run specific E2E test patterns
npm run test:e2e -- --headed              # Run E2E tests in headed mode
npm run test:e2e -- --debug               # Run E2E tests with debugging

# Code Quality (run before commits)
npm run lint             # Check code with ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format code with Prettier

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

## Documentation Structure

This project has **comprehensive documentation** organized in three complementary systems:

- **[@docs/README.md](docs/README.md)** - Complete documentation hub with role-based navigation
- **[@docs/architecture/](docs/architecture/README.md)** - Technical design using arc42 framework
- **[@docs/user/](docs/user/README.md)** - End-user guides using Diátaxis framework
- **[@docs/developer/](docs/developer/README.md)** - Development workflows and standards

**Quick Links**:

- [Local Setup Guide](docs/developer/workflows/local-setup.md) - Development environment setup
- [Architecture Overview](docs/architecture/01-introduction-goals.md) - System understanding
- [Testing Guide](docs/developer/workflows/testing-guide.md) - Testing procedures
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

**Testing Approach**: Jest + jsdom with multi-project config:

- Unit tests (core functionality)
- Integration tests (storage operations)
- Performance tests (load times)
- Cross-browser testing (Chrome/Firefox)

**Build System**: Simple file copying via `scripts/build.js` - no bundling or transpilation. Firefox build uses different manifest.
