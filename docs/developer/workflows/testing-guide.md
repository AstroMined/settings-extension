# Testing Guide

## Executive Summary

**Zero-tolerance testing standards** for the Settings Extension project. This guide establishes strict policies where **failing tests are never acceptable** and provides clear boundaries between unit testing (pure functions only) and E2E testing (browser integration). All tests must pass 100% of the time before any code can be merged.

## Scope

- **Applies to**: All extension components and testing scenarios
- **Last Updated**: 2025-08-13
- **Status**: Approved

## Core Testing Principles

### 🚨 Zero Tolerance Policy for Failing Tests

**FUNDAMENTAL RULE: A failing test indicates either a bad test or a bug in the implementation. There is no third option.**

1. **All tests must pass 100% of the time** before any PR can be merged
2. **Flaky tests are bad tests** and must be fixed or removed immediately
3. **"Tests sometimes fail" is not acceptable** - this indicates architectural problems
4. **No tolerance for JavaScript-style "failing tests are normal"** culture

### Strict Test Type Boundaries

| Test Type | Purpose | What to Test | What NOT to Test |
|-----------|---------|--------------|------------------|
| **Unit Tests** | Pure functions only | Validation logic, utilities, calculations | Browser APIs, storage, DOM, async operations |
| **E2E Tests** | Real browser behavior | User workflows, storage persistence, extension loading | Implementation details, mocked scenarios |
| **❌ No Integration Tests** | Avoid entirely | N/A | Over-mocked browser APIs, fake storage operations |

### Testing Framework Stack

- **Unit Testing**: Jest with jsdom environment (pure functions only)
- **E2E Testing**: Playwright with real browser instances
- **Coverage**: Jest coverage reports (80% threshold)
- **Mocking**: Forbidden except for network requests
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

## 🚨 Anti-Patterns and Common Mistakes

### ❌ What NOT to Do

**These patterns lead to flaky, unreliable tests that must be avoided:**

1. **Over-Mocking Browser APIs**
   ```javascript
   // ❌ BAD: Mocking storage APIs in unit tests
   beforeEach(() => {
     global.chrome = {
       storage: {
         local: { get: jest.fn(), set: jest.fn() }
       }
     };
     settingsManager = new SettingsManager(); // Tests browser integration
   });
   ```

2. **Testing Implementation Details**
   ```javascript
   // ❌ BAD: Testing internal state instead of behavior
   test("should call storage.local.set", () => {
     expect(mockStorage.set).toHaveBeenCalledWith(...);
   });
   ```

3. **Fake Integration Tests**
   ```javascript
   // ❌ BAD: "Integration" test that's actually all mocks
   test("storage integration", async () => {
     mockStorage.get.mockResolvedValue({ settings: {} });
     await settingsManager.loadSettings(); // Not testing real integration
   });
   ```

4. **Tolerating Flaky Tests**
   ```javascript
   // ❌ BAD: Adding retries to hide flaky tests
   test("flaky test", async () => {
     let attempts = 0;
     while (attempts < 3) {
       try {
         await someUnreliableOperation();
         break;
       } catch (error) {
         attempts++;
       }
     }
   });
   ```

### ✅ What TO Do Instead

1. **Pure Function Unit Tests**
   ```javascript
   // ✅ GOOD: Testing pure functions without mocks
   import { validateSettingValue } from "../lib/validation.js";
   
   test("should validate boolean values", () => {
     expect(validateSettingValue("boolean", true)).toBe(true);
     expect(validateSettingValue("boolean", "string")).toBe(false);
   });
   ```

2. **Real Browser E2E Tests**
   ```javascript
   // ✅ GOOD: Testing real browser behavior
   test("settings persist across browser sessions", async () => {
     const page = await context.newPage();
     await page.goto(`chrome-extension://${extensionId}/popup.html`);
     
     // Real user interaction
     await page.fill('input[type="text"]', 'test value');
     await page.close();
     
     // Verify persistence in new session
     const newPage = await context.newPage();
     await newPage.goto(`chrome-extension://${extensionId}/popup.html`);
     await expect(newPage.locator('input[type="text"]')).toHaveValue('test value');
   });
   ```

## Test Type Decision Matrix

Use this decision tree to determine the correct test type:

```
Is the code a pure function with no external dependencies?
├─ YES → Unit Test
└─ NO → Does it interact with browser APIs, storage, or DOM?
   ├─ YES → E2E Test
   └─ NO → Consider if the code should be refactored to be pure
```

### Detailed Examples

| Code Pattern | Test Type | Rationale |
|--------------|-----------|-----------|
| `validateEmail(email)` | Unit Test | Pure function, no dependencies |
| `calculateSettingsSize(settings)` | Unit Test | Pure function, deterministic |
| `settingsManager.save(data)` | E2E Test | Uses browser storage APIs |
| `popup.updateDisplay()` | E2E Test | Manipulates DOM |
| `background.handleMessage()` | E2E Test | Uses browser messaging APIs |
| `formatDate(timestamp)` | Unit Test | Pure function |
| `localStorage.getItem()` | E2E Test | Browser API integration |

## Unit Testing (Pure Functions Only)

### Unit Test Examples (Pure Functions Only)

**IMPORTANT: Unit tests should ONLY test pure functions with no external dependencies.**

```javascript
// ✅ GOOD: Testing validation logic (pure functions)
import { 
  validateBoolean,
  validateText,
  validateNumber,
  validateJSON,
  sanitizeInput
} from "../lib/validation.js";

describe("Settings Validation", () => {
  test("should validate boolean values correctly", () => {
    expect(validateBoolean(true)).toBe(true);
    expect(validateBoolean(false)).toBe(true);
    expect(validateBoolean("true")).toBe(false);
    expect(validateBoolean(1)).toBe(false);
    expect(validateBoolean(null)).toBe(false);
  });

  test("should validate text with constraints", () => {
    const constraints = { maxLength: 10 };
    
    expect(validateText("short", constraints)).toBe(true);
    expect(validateText("this is too long", constraints)).toBe(false);
    expect(validateText("", constraints)).toBe(true);
  });

  test("should sanitize user input", () => {
    expect(sanitizeInput("<script>alert('xss')</script>")).toBe("");
    expect(sanitizeInput("safe text")).toBe("safe text");
    expect(sanitizeInput("text<script>bad</script>more")).toBe("textmore");
  });
});

// ✅ GOOD: Testing utility functions (pure functions)
import { 
  formatFileSize,
  parseSettingsJSON,
  mergeSettingsObjects,
  calculateSettingsChecksum
} from "../lib/utils.js";

describe("Settings Utils", () => {
  test("should format file sizes correctly", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1048576)).toBe("1 MB");
  });

  test("should parse settings JSON safely", () => {
    const validJSON = '{"theme": "dark", "enabled": true}';
    const invalidJSON = '{"theme": "dark", "enabled":}';
    
    expect(parseSettingsJSON(validJSON)).toEqual({
      theme: "dark",
      enabled: true
    });
    expect(parseSettingsJSON(invalidJSON)).toBe(null);
  });

  test("should merge settings objects correctly", () => {
    const defaults = { theme: "light", enabled: false, count: 0 };
    const user = { theme: "dark", count: 5 };
    const expected = { theme: "dark", enabled: false, count: 5 };
    
    expect(mergeSettingsObjects(defaults, user)).toEqual(expected);
  });
});
```

### What About Browser Integration?

**If you need to test code that interacts with browser APIs, storage, or DOM - use E2E tests instead.**

Unit tests are ONLY for pure functions. Any code that touches:
- `chrome.storage.*`
- `chrome.runtime.*`
- `document.*`
- `window.*`
- `localStorage`
- Async operations
- Network requests

...should be tested with E2E tests using real browser instances.

### Jest Configuration for Unit Tests

```javascript
// jest.config.js
module.exports = {
  testEnvironment: "node", // No browser globals for pure functions
  testMatch: ["<rootDir>/test/unit/**/*.test.js"],
  collectCoverageFrom: [
    "lib/validation.js",
    "lib/utils.js",
    "lib/formatters.js",
    // Only include pure function modules
  ],
  setupFilesAfterEnv: ["<rootDir>/test/setup-unit.js"],
};

// test/setup-unit.js
// No browser globals or mocks needed for pure functions
// Just ensure clean test environment
afterEach(() => {
  jest.clearAllMocks();
});
```

## E2E Testing (Browser Integration)

**For ALL code that interacts with browser APIs, storage, DOM, or async operations.**

### When to Use E2E Tests

- Settings persistence and loading
- Extension popup interactions  
- Background script message handling
- Content script DOM manipulation
- Storage quota handling
- Cross-browser compatibility
- User workflow testing

### E2E Test Examples

**See [Extension E2E Testing Guide](../guides/extension-e2e-testing.md) for complete patterns.**

```javascript
// test/e2e/settings-persistence.test.js
import { test, expect } from '@playwright/test';

test('settings persist across browser sessions', async ({ context }) => {
  const page = await context.newPage();
  
  // Navigate to extension popup
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForSelector('#settings-container');
  
  // Change a setting
  await page.fill('input[name="theme"]', 'dark');
  await page.waitForTimeout(500); // Allow save
  
  // Close and reopen
  await page.close();
  const newPage = await context.newPage();
  await newPage.goto(`chrome-extension://${extensionId}/popup.html`);
  await newPage.waitForSelector('#settings-container');
  
  // Verify persistence
  await expect(newPage.locator('input[name="theme"]')).toHaveValue('dark');
});
```

## No Integration Tests

**We explicitly do NOT use "integration tests" that mock browser APIs.**

This middle-ground approach leads to:
- Flaky tests that break with timing changes
- Testing implementation details instead of behavior  
- Complex mock setup that doesn't match real browser behavior
- False confidence in functionality that breaks in real browsers

**Instead**: Pure unit tests for logic + E2E tests for integration.

## Testing Policy Enforcement

### Pre-Commit Requirements

**All PRs must pass 100% of tests before merge. No exceptions.**

```json
// package.json
{
  "scripts": {
    "test:all": "npm run test && npm run test:e2e",
    "precommit": "npm run test:all && npm run lint"
  },
  "husky": {
    "hooks": {
      "pre-commit": "npm run precommit",
      "pre-push": "npm run test:all"
    }
  }
}
```

### CI/CD Pipeline Requirements

```yaml
# .github/workflows/test-quality.yml
name: Test Quality Gate

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      # MUST pass 100% - no allowed_failures

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npx playwright install
      - run: npm run test:e2e
      # MUST pass 100% - no allowed_failures

  merge-gate:
    needs: [unit-tests, e2e-tests]
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - run: echo "All tests passed - PR ready for review"
```

### Test Failure Response Protocol

**When tests fail:**

1. **DO NOT** add retries or flaky test workarounds
2. **DO NOT** skip or ignore failing tests  
3. **DO** investigate root cause immediately
4. **DO** fix the test or the implementation
5. **DO** ensure 100% pass rate before continuing

**For existing flaky tests:**
1. Identify if they test pure functions (move to unit) or browser behavior (move to E2E)
2. Remove over-mocked "integration" tests entirely
3. Rewrite using correct test type boundaries

## Summary

This testing guide establishes **zero-tolerance standards** that eliminate the JavaScript-ecosystem tolerance for failing tests. By strictly separating pure function unit tests from real browser E2E tests, we avoid the flaky middle-ground of over-mocked integration tests.

### Key Principles Recap

1. **Zero tolerance for failing tests** - 100% pass rate required
2. **Unit tests for pure functions only** - no mocking of browser APIs
3. **E2E tests for browser integration** - real browser instances only  
4. **No integration tests** - avoid over-mocked middle ground
5. **Immediate investigation** of any test failures

### Next Steps

1. **Apply these standards** to existing test failures
2. **Migrate problematic tests** to appropriate test types
3. **Enforce 100% pass rate** in all PRs
4. **Maintain zero tolerance** for flaky tests

For detailed E2E testing patterns, see [Extension E2E Testing Guide](../guides/extension-e2e-testing.md).

## References

- [Extension E2E Testing Guide](../guides/extension-e2e-testing.md) - Detailed Playwright patterns for browser extension testing
- [Coding Standards](../conventions/coding-standards.md) - Code quality standards that complement testing practices
- [Jest Documentation](https://jestjs.io/) - Unit testing framework for pure functions
- [Playwright Documentation](https://playwright.dev/) - E2E testing framework for browser integration

## Revision History

| Date       | Author         | Changes                                           |
| ---------- | -------------- | ------------------------------------------------- |
| 2025-08-13 | Developer Team | Established zero-tolerance testing standards     |
| 2025-08-11 | Developer Team | Initial testing guide                             |
