# Browser Extension E2E Testing Guide

## Executive Summary

This guide provides comprehensive instructions for running reliable end-to-end (E2E) tests on browser extensions using Playwright. It covers the enhanced testing framework we've developed specifically for Manifest V3 extensions, including robust extension loading, cross-browser compatibility, and advanced testing patterns.

**Scope:** Complete E2E testing workflows for browser extensions  
**Status:** Production-ready (Enhanced December 2024)  
**Applies To:** Manifest V3 browser extensions, Chrome/Firefox/Edge  
**Last Updated:** December 2024

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Build extension
npm run build

# Run all E2E tests
npm run test:e2e

# Run specific browser tests
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
```

### Why Not Playwright MCP Server?

**Important:** Playwright MCP Server is **not suitable** for browser extension testing because:
- It doesn't support `launchPersistentContext()` required for extension loading
- Extension loading arguments (`--load-extension`) are not properly handled
- Browser contexts don't maintain extension state between operations
- Manual extension loading through UI doesn't persist across sessions

Use regular Playwright with our enhanced patterns instead.

## Extension Loading Mechanism

### Robust Extension Loading Pattern

Our enhanced loading mechanism provides reliable extension detection across browsers:

```javascript
// Enhanced extension loading with retry logic
test.beforeAll(async () => {
  const extensionPath = path.resolve(__dirname, "../../dist");
  const userDataDir = path.resolve(__dirname, "../../test-user-data");

  // Use launchPersistentContext for extension loading
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-web-security",
      "--allow-running-insecure-content",
    ],
  });

  // Enhanced service worker detection with retries
  let serviceWorker = null;
  const maxAttempts = 5;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const workers = context.serviceWorkers();
    if (workers.length > 0) {
      serviceWorker = workers[0];
      break;
    }
    
    try {
      serviceWorker = await context.waitForEvent("serviceworker", { 
        timeout: 5000 
      });
      if (serviceWorker) break;
    } catch (error) {
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  if (serviceWorker) {
    extensionId = serviceWorker.url().split("/")[2];
  } else {
    throw new Error("Extension service worker not found after multiple attempts");
  }
});
```

### Key Requirements

1. **Persistent Context Required:** Extensions only work with `launchPersistentContext()`
2. **Specific Browser Arguments:** Both `--disable-extensions-except` and `--load-extension` are required
3. **Service Worker Detection:** Manifest V3 requires service worker detection, not background page
4. **Retry Logic:** Extension loading can be timing-sensitive, implement retries

## Enhanced Wait Strategies

### Extension-Specific Helper Functions

```javascript
class ExtensionTestHelpers {
  static async waitForExtensionReady(page, timeout = 15000) {
    // Wait for either settings container to appear or loading to disappear
    return Promise.race([
      page.waitForSelector("#settings-container", { state: "visible", timeout }),
      page.waitForSelector("#loading", { state: "hidden", timeout })
    ]);
  }

  static async waitForPageFullyLoaded(page, timeout = 15000) {
    await page.waitForFunction(() => {
      const container = document.getElementById('settings-container');
      const loading = document.getElementById('loading');
      const isReady = document.readyState === 'complete';
      
      return isReady && 
             container && 
             container.style.display !== 'none' && 
             (!loading || loading.style.display === 'none');
    }, { timeout });
  }

  static async debugPageState(page) {
    try {
      const state = await page.evaluate(() => {
        return {
          readyState: document.readyState,
          loadingVisible: document.getElementById('loading')?.style.display,
          containerVisible: document.getElementById('settings-container')?.style.display,
          settingsCount: document.querySelectorAll('.setting-item, input').length
        };
      });
      console.log('Page debug state:', state);
      return state;
    } catch (error) {
      console.log('Could not get page state:', error.message);
      return null;
    }
  }
}
```

### Robust Test Patterns

```javascript
test("enhanced settings interaction", async () => {
  const page = await context.newPage();
  
  try {
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    
    // Use helper for reliable waiting
    await ExtensionTestHelpers.waitForExtensionReady(page);
    
    const textInput = page.locator('input[type="text"]').first();
    await expect(textInput).toBeVisible();
    
    const testValue = `Test ${Date.now()}`;
    await textInput.clear();
    await textInput.fill(testValue);

    // Wait for save to complete
    await page.waitForFunction((expected) => {
      const input = document.querySelector('input[type="text"]');
      return input && input.value === expected;
    }, testValue, { timeout: 5000 });

    // Verify change persisted
    await expect(textInput).toHaveValue(testValue);
  } finally {
    if (!page.isClosed()) {
      await page.close();
    }
  }
});
```

## Cross-Browser Testing

### Browser-Specific Configurations

#### Chrome/Edge Configuration
```javascript
const chromeContext = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
});
```

#### Firefox Configuration
```javascript
// Firefox requires different extension loading approach
const firefoxContext = await firefox.launchPersistentContext(userDataDir, {
  headless: false,
  // Firefox handles extensions differently - 
  // may require web-ext for testing or manual installation
});
```

### Known Browser Differences

| Feature | Chrome/Edge | Firefox | Notes |
|---------|-------------|---------|-------|
| Extension Loading | `--load-extension` | Manual/web-ext | Firefox may need different approach |
| Service Worker | Supported | Supported | Both support Manifest V3 |
| Context Persistence | Reliable | Reliable | Both maintain extension state |
| Headless Mode | Limited | Limited | Extensions work better in headed mode |

## Testing Patterns

### 1. Basic Extension Functionality

```javascript
test("extension loads and initializes", async () => {
  const page = await context.newPage();
  
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await ExtensionTestHelpers.waitForExtensionReady(page);
  
  await expect(page.locator(".popup-container")).toBeVisible();
  await expect(page.locator(".popup-header h1")).toHaveText("Settings");
  
  await page.close();
});
```

### 2. Settings Persistence Testing

```javascript
test("settings persist across sessions", async () => {
  const page = await context.newPage();
  
  // Set a value
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await ExtensionTestHelpers.waitForExtensionReady(page);
  
  const input = page.locator('input[type="text"]').first();
  const testValue = `Persistent ${Date.now()}`;
  await input.fill(testValue);
  await page.waitForTimeout(1000); // Allow save
  
  // Verify persistence in new page
  await page.close();
  const newPage = await context.newPage();
  await newPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await ExtensionTestHelpers.waitForExtensionReady(newPage);
  
  await expect(newPage.locator('input[type="text"]').first()).toHaveValue(testValue);
  await newPage.close();
});
```

### 3. Background Script Communication

```javascript
test("background service worker responds", async () => {
  const page = await context.newPage();
  
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await ExtensionTestHelpers.waitForExtensionReady(page);

  const communicationResult = await page.evaluate(async () => {
    try {
      const response = await browserAPI.runtime.sendMessage({ type: "PING" });
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  expect(communicationResult.success).toBe(true);
  expect(communicationResult.response?.pong).toBe(true);
  
  await page.close();
});
```

### 4. Content Script Testing

```javascript
test("content script injection works", async () => {
  const page = await context.newPage();
  
  await page.goto("https://example.com");
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Allow content script injection

  const hasContentScript = await page.evaluate(() => {
    return typeof window.ContentScriptSettings !== "undefined";
  });

  if (hasContentScript) {
    const settingsAccess = await page.evaluate(async () => {
      try {
        const settings = await window.ContentScriptSettings.getSettings();
        return { success: true, hasSettings: !!settings };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(settingsAccess.success).toBe(true);
  }
  
  await page.close();
});
```

### 5. Error Handling and Console Monitoring

```javascript
test("no console errors in extension pages", async () => {
  const page = await context.newPage();
  const consoleErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  // Test multiple pages
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await ExtensionTestHelpers.waitForExtensionReady(page);
  
  await page.goto(`chrome-extension://${extensionId}/options/options.html`);
  await ExtensionTestHelpers.waitForExtensionReady(page);

  // Filter out expected errors
  const criticalErrors = consoleErrors.filter(
    (error) => !error.includes("Warning") && 
               !error.includes("favicon") &&
               !error.includes("DevTools")
  );

  expect(criticalErrors).toHaveLength(0);
  await page.close();
});
```

## Performance Testing

### Load Time Testing

```javascript
test("extension loads within performance thresholds", async () => {
  const page = await context.newPage();
  
  const startTime = Date.now();
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await ExtensionTestHelpers.waitForExtensionReady(page);
  const loadTime = Date.now() - startTime;

  // Extension should load within 2 seconds
  expect(loadTime).toBeLessThan(2000);
  
  await page.close();
});
```

### Memory Usage Testing

```javascript
test("extension memory usage is reasonable", async () => {
  const page = await context.newPage();
  
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await ExtensionTestHelpers.waitForExtensionReady(page);

  const memoryUsage = await page.evaluate(() => {
    return {
      usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
      totalJSHeapSize: performance.memory?.totalJSHeapSize || 0
    };
  });

  // Extension should use less than 10MB
  expect(memoryUsage.usedJSHeapSize).toBeLessThan(10 * 1024 * 1024);
  
  await page.close();
});
```

## CI/CD Integration

### GitHub Actions Configuration

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build extension
        run: npm run build
      
      - name: Install Playwright browsers
        run: npx playwright install chromium firefox
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-test-results
          path: test-results/
```

### Local CI Testing

```bash
# Test in CI-like environment
CI=true npm run test:e2e

# Run with specific retry count
npm run test:e2e -- --retries=2

# Run only failing tests
npm run test:e2e -- --last-failed
```

## Troubleshooting

### Common Issues and Solutions

#### Extension Not Loading
```
Error: Extension service worker not found
```

**Solutions:**
1. Ensure `npm run build` completed successfully
2. Check that `dist/` directory exists and contains manifest.json
3. Verify browser arguments include both `--disable-extensions-except` and `--load-extension`
4. Try increasing service worker detection timeout

#### Flaky Loading Tests
```
Error: Timeout waiting for #loading element
```

**Solutions:**
1. Use our enhanced wait strategies (`ExtensionTestHelpers.waitForExtensionReady`)
2. Don't rely on loading element visibility - it may hide immediately
3. Use `Promise.race()` with multiple wait conditions
4. Implement retry logic for timing-sensitive operations

#### Cross-Browser Differences
```
Firefox: Extension not appearing in about:debugging
```

**Solutions:**
1. Firefox may require `web-ext run` for testing
2. Consider manual extension installation for Firefox tests
3. Use browser-specific test configurations
4. Document browser limitations in test comments

#### Context Cleanup Issues
```
Error: Browser context not closed properly
```

**Solutions:**
1. Always use try/finally blocks for page cleanup
2. Check `page.isClosed()` before closing
3. Implement proper context cleanup in `afterAll` hooks
4. Handle context close errors gracefully

### Debug Mode

Enable debug output for troubleshooting:

```bash
# Run with debug output
DEBUG=pw:api npm run test:e2e

# Run specific test with UI mode
npm run test:e2e:ui -- --grep "specific test name"

# Generate trace for failed tests
npm run test:e2e -- --trace on
```

### Performance Debugging

```javascript
// Add to test for performance insights
test("debug performance", async () => {
  const page = await context.newPage();
  
  // Enable performance monitoring
  await page.coverage.startJSCoverage();
  
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await ExtensionTestHelpers.waitForExtensionReady(page);
  
  const coverage = await page.coverage.stopJSCoverage();
  console.log('JS Coverage:', coverage.length);
  
  await ExtensionTestHelpers.debugPageState(page);
  await page.close();
});
```

## Best Practices

### Test Organization

1. **Separate Concerns:** Keep basic functionality, integration, and performance tests separate
2. **Use Descriptive Names:** Test names should clearly indicate what they're testing
3. **Group Related Tests:** Use `test.describe()` blocks for logical grouping
4. **Shared Setup:** Use `beforeAll` for expensive setup operations

### Reliability Patterns

1. **Always Use Helpers:** Use `ExtensionTestHelpers` for consistent waiting
2. **Implement Retries:** Add retry logic for timing-sensitive operations
3. **Proper Cleanup:** Always close pages in `finally` blocks
4. **Error Context:** Add debugging information to test failures

### Performance Considerations

1. **Minimize Context Creation:** Reuse browser contexts where possible
2. **Parallel Execution:** Keep `fullyParallel: false` for extension tests
3. **Resource Cleanup:** Close pages promptly to free memory
4. **Selective Testing:** Use `--grep` to run specific test suites

## Advanced Patterns

### Custom Extension Fixtures

```javascript
// Create reusable test fixtures
const test = base.extend({
  extensionPage: async ({ context }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await ExtensionTestHelpers.waitForExtensionReady(page);
    await use(page);
    if (!page.isClosed()) {
      await page.close();
    }
  }
});

// Use in tests
test("using fixture", async ({ extensionPage }) => {
  await expect(extensionPage.locator(".popup-container")).toBeVisible();
});
```

### Mock Background Responses

```javascript
test("mock background communication", async () => {
  const page = await context.newPage();
  
  // Intercept and mock background messages
  await page.addInitScript(() => {
    const originalSendMessage = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = (message, callback) => {
      if (message.type === "GET_SETTINGS") {
        callback({ mockSettings: true });
        return;
      }
      return originalSendMessage.call(this, message, callback);
    };
  });
  
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  // Test with mocked responses
});
```

## Migration from MCP Server

If you were attempting to use Playwright MCP Server for extension testing, migrate to this approach:

### Before (MCP Server - Not Working)
```javascript
// This doesn't work for extensions
await mcp.browser.navigate(`chrome-extension://${extensionId}/popup.html`);
```

### After (Enhanced Playwright - Working)
```javascript
const page = await context.newPage();
await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
await ExtensionTestHelpers.waitForExtensionReady(page);
```

## Conclusion

This enhanced E2E testing framework provides reliable, comprehensive testing for Manifest V3 browser extensions. Key improvements include:

- **Robust extension loading** with retry mechanisms
- **Enhanced wait strategies** that handle async extension initialization
- **Cross-browser compatibility** with browser-specific configurations
- **Comprehensive error handling** and debugging capabilities
- **Performance testing** patterns for extension-specific metrics

For questions or improvements to this testing framework, please refer to the project's documentation or create an issue in the repository.

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2024-12-12 | Development Team | Initial enhanced E2E testing guide with MCP server analysis |
| 2024-12-12 | Development Team | Added robust extension loading, wait strategies, and troubleshooting |

## Related Documentation

- [Extension Development Guide](extension-development.md)
- [Cross-Browser Testing Guide](cross-browser-testing.md)
- [Performance Profiling Guide](performance-profiling.md)
- [Troubleshooting Guide](troubleshooting.md)