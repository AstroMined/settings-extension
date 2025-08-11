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
npm run test:chrome      # Test extension in Chrome browser
npm run test:firefox     # Test extension in Firefox browser

# Code Quality (run before commits)
npm run lint             # Check code with ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format code with Prettier

# Single Test Examples
npm test -- settings-manager.test.js                    # Run specific test file
npm test -- --testNamePattern="should save settings"    # Run specific test by name
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