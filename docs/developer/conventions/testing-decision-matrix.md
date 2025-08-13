# Testing Decision Matrix

## Executive Summary

Clear decision matrix for determining the correct test type (unit vs E2E) based on code characteristics. This matrix eliminates ambiguity and prevents flaky over-mocked integration tests by providing definitive rules for test classification.

## Scope

- **Applies to**: All code in the Settings Extension project requiring test coverage
- **Last Updated**: 2025-08-13
- **Status**: Approved

## Quick Decision Tree

```
Does the code have ANY of these characteristics?
├─ Uses browser APIs (chrome.*, browser.*)      → E2E Test
├─ Manipulates DOM (document.*)                 → E2E Test  
├─ Uses async operations                        → E2E Test
├─ Accesses storage (localStorage, etc)         → E2E Test
├─ Makes network requests                       → E2E Test
├─ Has external dependencies                    → E2E Test
└─ Is a pure function with no dependencies      → Unit Test
```

## Detailed Classification Matrix

| Code Pattern | Test Type | Why | Example |
|--------------|-----------|-----|---------|
| **Pure Functions** |
| `validateEmail(email)` | Unit | No dependencies, deterministic | `expect(validateEmail("test@example.com")).toBe(true)` |
| `formatFileSize(bytes)` | Unit | Pure calculation | `expect(formatFileSize(1024)).toBe("1 KB")` |
| `sanitizeInput(text)` | Unit | String processing | `expect(sanitizeInput("<script>")).toBe("")` |
| `mergeObjects(a, b)` | Unit | Pure data transformation | `expect(mergeObjects({a:1}, {b:2})).toEqual({a:1,b:2})` |
| **Browser Integration** |
| `settingsManager.save()` | E2E | Uses chrome.storage APIs | Test with real browser instance |
| `popup.updateDisplay()` | E2E | Manipulates DOM | Test with real extension popup |
| `background.handleMessage()` | E2E | Uses chrome.runtime APIs | Test with real message passing |
| `contentScript.injectCSS()` | E2E | Modifies page DOM | Test with real web page |
| **Async Operations** |
| `loadSettingsFromAPI()` | E2E | Network request + storage | Test with real browser/network |
| `saveAndValidateSettings()` | E2E | Storage + validation chain | Test with real persistence |
| **Data Processing** |
| `parseSettingsJSON(json)` | Unit | Pure JSON parsing | `expect(parseSettingsJSON('{"a":1}')).toEqual({a:1})` |
| `calculateChecksum(data)` | Unit | Pure computation | `expect(calculateChecksum("test")).toBe("a94a8f...")` |

## Decision Process

### Step 1: Identify Dependencies

**Question**: What does this code depend on?

- **No dependencies** → Pure function → Unit test
- **Browser APIs** → Integration → E2E test
- **DOM** → Browser environment → E2E test
- **Storage** → Persistence → E2E test
- **Network** → External service → E2E test

### Step 2: Check Function Purity

**Question**: Is this function pure?

```javascript
// ✅ Pure function - Unit test
function calculateTotal(items, taxRate) {
  return items.reduce((sum, item) => sum + item.price, 0) * (1 + taxRate);
}

// ❌ Not pure (uses chrome.storage) - E2E test  
async function saveUserPreferences(prefs) {
  await chrome.storage.local.set({ preferences: prefs });
}
```

### Step 3: Determine Test Scope

**Question**: What am I actually testing?

- **Logic/calculation** → Unit test
- **User workflow** → E2E test
- **API integration** → E2E test
- **Data persistence** → E2E test

## Common Mistakes and Fixes

### ❌ Mistake: Over-Mocked Integration Tests

```javascript
// BAD: Fake integration test
test("settings integration", async () => {
  const mockStorage = { get: jest.fn(), set: jest.fn() };
  global.chrome = { storage: { local: mockStorage } };
  
  const manager = new SettingsManager();
  await manager.save({ theme: "dark" });
  
  expect(mockStorage.set).toHaveBeenCalled(); // Testing mocks!
});
```

### ✅ Fix: Choose Correct Test Type

```javascript
// GOOD: Pure function unit test
test("validates setting values", () => {
  expect(validateSettingValue("boolean", true)).toBe(true);
  expect(validateSettingValue("boolean", "false")).toBe(false);
});

// GOOD: Real browser E2E test
test("settings persist across sessions", async ({ page, context }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.fill('input[name="theme"]', 'dark');
  
  // Real browser persistence test
  const newPage = await context.newPage();
  await newPage.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(newPage.locator('input[name="theme"]')).toHaveValue('dark');
});
```

## Boundary Cases

### Case 1: Validation with Context

```javascript
// Function that validates based on existing settings
function validateNewSetting(newValue, currentSettings) {
  if (currentSettings.locked) {
    return { valid: false, reason: "Settings are locked" };
  }
  return { valid: true };
}
```

**Decision**: Unit test - Pure function despite taking settings parameter
**Why**: No external dependencies, deterministic based on inputs

### Case 2: Formatted Display Functions

```javascript
// Function that formats data for UI display
function formatSettingsForDisplay(settings) {
  return Object.entries(settings).map(([key, value]) => ({
    label: key.replace(/_/g, ' ').toUpperCase(),
    value: value.toString(),
    type: typeof value
  }));
}
```

**Decision**: Unit test - Pure data transformation
**Why**: No side effects, no external dependencies

### Case 3: Event Handlers

```javascript
// Event handler that processes UI interactions
function handleSettingChange(event) {
  const { name, value } = event.target;
  settingsManager.updateSetting(name, value); // Uses browser storage
  updateUI(name, value); // Modifies DOM
}
```

**Decision**: E2E test - Browser integration
**Why**: Uses DOM events, storage APIs, and UI manipulation

## Anti-Patterns to Avoid

### 1. Testing Implementation Details

```javascript
// ❌ BAD: Testing internal method calls
test("should call storage.set", () => {
  expect(mockStorage.set).toHaveBeenCalledWith(...);
});

// ✅ GOOD: Testing behavior
test("user preference is preserved", async ({ page }) => {
  // Test the actual user-facing behavior
});
```

### 2. Mocking What You're Testing

```javascript
// ❌ BAD: Mocking the storage you're testing
test("storage integration", () => {
  const mockStorage = { /* fake implementation */ };
  // Not testing real storage integration!
});

// ✅ GOOD: Test real storage or extract pure logic
test("validates storage data format", () => {
  const result = validateStorageData({ theme: "dark" });
  expect(result.valid).toBe(true);
});
```

### 3. Complex Setup for Simple Logic

```javascript
// ❌ BAD: Over-complex setup for simple validation
beforeEach(() => {
  global.chrome = mockComplexBrowserEnvironment();
  global.document = mockDOMEnvironment();
  // Just to test email validation!
});

// ✅ GOOD: Simple unit test for simple logic
test("validates email format", () => {
  expect(isValidEmail("test@example.com")).toBe(true);
});
```

## File Organization

### Unit Test Files

```
test/unit/
├── validation.test.js      # Pure validation functions
├── utils.test.js          # Utility functions  
├── formatters.test.js     # Data formatting functions
└── calculations.test.js   # Mathematical operations
```

### E2E Test Files

```
test/e2e/
├── extension-functionality.test.js  # Basic extension loading
├── user-workflows.test.js          # Complete user journeys
├── settings-persistence.test.js    # Storage integration
└── popup-interactions.test.js      # UI interactions
```

## Enforcement Checklist

Before writing any test, ask:

- [ ] Is this testing a pure function? → Unit test
- [ ] Does this touch browser APIs? → E2E test
- [ ] Am I mocking what I'm trying to test? → Wrong approach
- [ ] Does this test actual user behavior? → E2E test
- [ ] Is this deterministic with no side effects? → Unit test

## Quick Reference

| Want to Test | Use | Don't Use |
|--------------|-----|-----------|
| Email validation | Unit test | E2E with mocked DOM |
| Settings persistence | E2E test | Unit test with mocked storage |
| Data transformation | Unit test | E2E with browser |
| User workflows | E2E test | Unit test with mocked everything |
| Calculations | Unit test | E2E test |
| UI interactions | E2E test | Unit test with mocked DOM |

## References

- [Testing Guide](../workflows/testing-guide.md) - Complete testing standards and policies
- [Extension E2E Testing Guide](../guides/extension-e2e-testing.md) - Detailed E2E patterns
- [Coding Standards](./coding-standards.md) - Code quality standards

## Revision History

| Date       | Author         | Changes                           |
| ---------- | -------------- | --------------------------------- |
| 2025-08-13 | Developer Team | Initial testing decision matrix   |