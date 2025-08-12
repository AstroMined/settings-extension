# Cross-Browser Testing Guide

## Executive Summary

Comprehensive guide for testing the Settings Extension across Chrome, Firefox, and Edge browsers. Covers testing strategies, browser-specific considerations, automated testing approaches, and debugging techniques for ensuring consistent functionality across all supported platforms.

## Scope

- **Applies to**: Chrome, Firefox, Edge (Chromium), and Safari (future support)
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Supported Browsers

### Primary Targets

| Browser | Version | Manifest | Notes                             |
| ------- | ------- | -------- | --------------------------------- |
| Chrome  | 88+     | V3       | Full feature support              |
| Edge    | 88+     | V3       | Chromium-based, Chrome-compatible |
| Firefox | 109+    | V2/V3    | Gradual V3 adoption               |

### Testing Matrix

```
Feature Testing Matrix:
                    Chrome  Firefox  Edge
Storage API         ✅      ✅      ✅
Service Workers     ✅      ⚠️      ✅
Content Scripts     ✅      ✅      ✅
Popup UI           ✅      ✅      ✅
Options Page       ✅      ✅      ✅
Context Menus      ✅      ✅      ✅
Keyboard Shortcuts ✅      ⚠️      ✅
File API           ✅      ✅      ✅
```

Legend: ✅ Full support, ⚠️ Partial/Different API, ❌ Not supported

## Testing Infrastructure

### Automated Testing Setup

```bash
# Install testing dependencies
npm install --save-dev web-ext selenium-webdriver chromedriver geckodriver

# Browser testing scripts
npm run test:chrome    # Chrome headless testing
npm run test:firefox   # Firefox headless testing
npm run test:edge      # Edge testing (Windows only)
npm run test:all       # All browsers sequentially
```

### Test Configuration

```javascript
// test/config/browsers.js
export const browserConfigs = {
  chrome: {
    driver: "chromedriver",
    options: {
      args: [
        "--headless",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--load-extension=./dist",
      ],
    },
    extensionPath: "./web-ext-artifacts/settings-extension-chrome.zip",
  },

  firefox: {
    driver: "geckodriver",
    options: {
      args: ["-headless"],
      prefs: {
        "xpinstall.signatures.required": false,
        "extensions.install.requireBuiltInCerts": false,
      },
    },
    extensionPath: "./web-ext-artifacts/settings-extension-firefox.xpi",
  },

  edge: {
    driver: "msedgedriver",
    options: {
      args: ["--headless", "--load-extension=./dist"],
    },
    extensionPath: "./web-ext-artifacts/settings-extension-chrome.zip",
  },
};
```

### Cross-Browser Test Runner

```javascript
// test/runners/cross-browser-runner.js
import { Builder, By, until } from "selenium-webdriver";
import { browserConfigs } from "../config/browsers.js";

class CrossBrowserTestRunner {
  constructor() {
    this.drivers = new Map();
    this.results = new Map();
  }

  async setupBrowser(browserName) {
    const config = browserConfigs[browserName];
    if (!config) {
      throw new Error(`Unsupported browser: ${browserName}`);
    }

    let driver;

    try {
      // Create WebDriver instance
      driver = await new Builder()
        .forBrowser(browserName)
        .setChromeOptions(config.options)
        .setFirefoxOptions(config.options)
        .build();

      // Load extension (browser-specific)
      await this.loadExtension(driver, browserName, config);

      this.drivers.set(browserName, driver);
      return driver;
    } catch (error) {
      console.error(`Failed to setup ${browserName}:`, error);
      if (driver) await driver.quit();
      throw error;
    }
  }

  async loadExtension(driver, browserName, config) {
    switch (browserName) {
      case "chrome":
      case "edge":
        // Extension loaded via --load-extension flag
        await driver.get("chrome://extensions/");
        break;

      case "firefox":
        // Install temporary extension
        await driver.get("about:debugging#/runtime/this-firefox");

        const installButton = await driver.wait(
          until.elementLocated(
            By.css('[data-qa-id="temporary-extension-install-button"]'),
          ),
          5000,
        );
        await installButton.click();

        // Handle file picker (would need additional setup)
        break;
    }
  }

  async runTestSuite(testSuite) {
    const browsers = Object.keys(browserConfigs);
    const promises = browsers.map((browser) =>
      this.runBrowserTests(browser, testSuite),
    );

    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      const browser = browsers[index];
      if (result.status === "fulfilled") {
        this.results.set(browser, result.value);
      } else {
        this.results.set(browser, { error: result.reason.message });
      }
    });

    return this.results;
  }

  async runBrowserTests(browserName, testSuite) {
    let driver;

    try {
      driver = await this.setupBrowser(browserName);

      const testResults = {
        browser: browserName,
        passed: 0,
        failed: 0,
        tests: [],
      };

      for (const test of testSuite) {
        try {
          const result = await this.runSingleTest(driver, test, browserName);
          testResults.tests.push(result);

          if (result.passed) {
            testResults.passed++;
          } else {
            testResults.failed++;
          }
        } catch (error) {
          testResults.tests.push({
            name: test.name,
            passed: false,
            error: error.message,
          });
          testResults.failed++;
        }
      }

      return testResults;
    } finally {
      if (driver) {
        await driver.quit();
      }
    }
  }

  async runSingleTest(driver, test, browserName) {
    console.log(`Running ${test.name} on ${browserName}...`);

    const startTime = Date.now();

    try {
      await test.run(driver, browserName);

      return {
        name: test.name,
        browser: browserName,
        passed: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: test.name,
        browser: browserName,
        passed: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      browsers: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
      },
    };

    for (const [browser, results] of this.results) {
      report.browsers.push(results);

      if (!results.error) {
        report.summary.total += results.tests.length;
        report.summary.passed += results.passed;
        report.summary.failed += results.failed;
      }
    }

    return report;
  }
}

export default CrossBrowserTestRunner;
```

## Browser-Specific Testing

### Chrome Testing

```javascript
// test/browsers/chrome.test.js
import { ChromeTestSuite } from "../suites/chrome-suite.js";

describe("Chrome Extension Tests", () => {
  let driver;

  beforeAll(async () => {
    driver = await setupChromeDriver();
  });

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  test("service worker activation", async () => {
    // Navigate to extension management
    await driver.get("chrome://extensions/");

    // Check if extension is loaded and active
    const extensionCard = await driver.findElement(
      By.css('[id*="settings-extension"]'),
    );

    const isEnabled = await extensionCard
      .findElement(By.css("cr-toggle"))
      .getAttribute("checked");

    expect(isEnabled).toBe("true");
  });

  test("popup functionality", async () => {
    // Click extension icon
    await driver.executeScript(`
      chrome.action.openPopup();
    `);

    // Wait for popup to open
    const popup = await driver.wait(
      until.elementLocated(By.id("popup-container")),
      5000,
    );

    // Test popup interactions
    const themeSelect = await popup.findElement(By.id("theme"));
    await themeSelect.click();

    const darkOption = await themeSelect.findElement(
      By.css('option[value="dark"]'),
    );
    await darkOption.click();

    // Verify selection
    const selectedValue = await themeSelect.getAttribute("value");
    expect(selectedValue).toBe("dark");
  });

  test("storage operations", async () => {
    // Execute in extension context
    const result = await driver.executeAsyncScript(`
      const callback = arguments[arguments.length - 1];
      
      chrome.storage.local.set({testKey: 'testValue'}, () => {
        chrome.storage.local.get(['testKey'], (result) => {
          callback(result);
        });
      });
    `);

    expect(result.testKey).toBe("testValue");
  });
});
```

### Firefox Testing

```javascript
// test/browsers/firefox.test.js
describe("Firefox Extension Tests", () => {
  let driver;

  beforeAll(async () => {
    driver = await setupFirefoxDriver();
  });

  test("webextension polyfill compatibility", async () => {
    // Test browser vs chrome namespace
    const hasPolyfill = await driver.executeScript(`
      return typeof browser !== 'undefined' && typeof browser.storage !== 'undefined';
    `);

    expect(hasPolyfill).toBe(true);
  });

  test("manifest v2/v3 compatibility", async () => {
    const manifest = await driver.executeScript(`
      return browser.runtime.getManifest();
    `);

    // Firefox may support V2 or V3
    expect([2, 3]).toContain(manifest.manifest_version);
  });

  test("firefox-specific permissions", async () => {
    // Test Firefox-specific permission handling
    const hasPermission = await driver.executeScript(`
      return browser.permissions.contains({permissions: ['storage']});
    `);

    expect(hasPermission).toBe(true);
  });

  test("content security policy", async () => {
    // Firefox CSP handling
    const cspErrors = await driver.executeScript(`
      return window.performance.getEntriesByType('navigation')
        .filter(entry => entry.name.includes('csp'));
    `);

    expect(cspErrors.length).toBe(0);
  });
});
```

### Edge Testing

```javascript
// test/browsers/edge.test.js
describe("Edge Extension Tests", () => {
  let driver;

  beforeAll(async () => {
    // Edge uses Chromium, so similar to Chrome
    driver = await setupEdgeDriver();
  });

  test("edge compatibility layer", async () => {
    // Test Edge-specific behaviors
    const userAgent = await driver.executeScript(`
      return navigator.userAgent;
    `);

    expect(userAgent).toContain("Edg");
  });

  test("edge extension store compatibility", async () => {
    // Ensure Chrome Web Store extensions work
    const manifest = await driver.executeScript(`
      return chrome.runtime.getManifest();
    `);

    expect(manifest.name).toBe("Settings Extension");
  });
});
```

## API Compatibility Testing

### Storage API Differences

```javascript
// test/compatibility/storage.test.js
describe("Cross-Browser Storage API", () => {
  const testData = { key: "value", number: 42, object: { nested: true } };

  test("chrome.storage vs browser.storage", async () => {
    const chromeResult = await runInChrome(async () => {
      await chrome.storage.local.set(testData);
      return await chrome.storage.local.get(Object.keys(testData));
    });

    const firefoxResult = await runInFirefox(async () => {
      await browser.storage.local.set(testData);
      return await browser.storage.local.get(Object.keys(testData));
    });

    expect(chromeResult).toEqual(firefoxResult);
    expect(chromeResult).toEqual(testData);
  });

  test("storage quota differences", async () => {
    const quotaTests = await runCrossBrowser(async (api) => {
      if (api.storage.local.QUOTA_BYTES) {
        return api.storage.local.QUOTA_BYTES;
      }
      return null; // Firefox doesn't expose quota
    });

    // Chrome should have quota, Firefox might not
    expect(quotaTests.chrome).toBeGreaterThan(0);
    // Firefox quota might be null or undefined
  });
});
```

### Message Passing Compatibility

```javascript
// test/compatibility/messaging.test.js
describe("Cross-Browser Messaging", () => {
  test("runtime.sendMessage consistency", async () => {
    const messageTests = await runCrossBrowser(async (api, browserName) => {
      return new Promise((resolve) => {
        // Setup message listener
        const listener = (message, sender, sendResponse) => {
          if (message.type === "test") {
            sendResponse({ browser: browserName, received: message.data });
            return true;
          }
        };

        api.runtime.onMessage.addListener(listener);

        // Send test message
        api.runtime
          .sendMessage({
            type: "test",
            data: "hello",
          })
          .then(resolve);
      });
    });

    // All browsers should handle messaging consistently
    Object.values(messageTests).forEach((result) => {
      expect(result.received).toBe("hello");
    });
  });

  test("content script communication", async () => {
    const contentScriptTests = await runCrossBrowser(
      async (api, browserName) => {
        // Inject content script
        const [tab] = await api.tabs.query({ active: true });

        return await api.tabs.sendMessage(tab.id, {
          type: "ping",
        });
      },
    );

    // Verify all browsers can communicate with content scripts
    Object.values(contentScriptTests).forEach((result) => {
      expect(result.type).toBe("pong");
    });
  });
});
```

## UI Compatibility Testing

### Popup UI Cross-Browser

```javascript
// test/ui/popup.test.js
describe("Popup UI Cross-Browser", () => {
  test("popup dimensions and layout", async () => {
    const popupTests = await runCrossBrowser(async (driver, browserName) => {
      // Open popup
      await openExtensionPopup(driver);

      // Measure popup
      const popup = await driver.findElement(By.id("popup-container"));
      const size = await popup.getSize();
      const rect = await popup.getRect();

      return {
        width: size.width,
        height: size.height,
        x: rect.x,
        y: rect.y,
      };
    });

    // Popup should be similar size across browsers
    const sizes = Object.values(popupTests);
    const widths = sizes.map((s) => s.width);
    const heights = sizes.map((s) => s.height);

    // Allow some variation but ensure consistency
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(50);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(50);
  });

  test("popup input elements", async () => {
    const inputTests = await runCrossBrowser(async (driver) => {
      await openExtensionPopup(driver);

      // Test various input types
      const inputs = {
        checkbox: await driver.findElement(By.css('input[type="checkbox"]')),
        select: await driver.findElement(By.css("select")),
        text: await driver.findElement(By.css('input[type="text"]')),
      };

      // Interact with inputs
      await inputs.checkbox.click();
      await inputs.select.click();
      await inputs.text.sendKeys("test");

      // Return states
      return {
        checkboxChecked: await inputs.checkbox.isSelected(),
        selectValue: await inputs.select.getAttribute("value"),
        textValue: await inputs.text.getAttribute("value"),
      };
    });

    // All browsers should handle inputs consistently
    Object.values(inputTests).forEach((result) => {
      expect(result.checkboxChecked).toBe(true);
      expect(result.textValue).toBe("test");
    });
  });
});
```

### CSS and Styling

```javascript
// test/ui/styling.test.js
describe("Cross-Browser Styling", () => {
  test("css custom properties support", async () => {
    const cssTests = await runCrossBrowser(async (driver) => {
      await driver.get("chrome-extension://[id]/popup/popup.html");

      // Test CSS custom properties
      const computedStyle = await driver.executeScript(`
        const element = document.getElementById('popup-container');
        const style = window.getComputedStyle(element);
        return {
          color: style.getPropertyValue('--primary-color'),
          fontSize: style.fontSize,
          fontFamily: style.fontFamily
        };
      `);

      return computedStyle;
    });

    // CSS should be applied consistently
    const styles = Object.values(cssTests);
    styles.forEach((style) => {
      expect(style.color).toBeTruthy();
      expect(style.fontSize).toBeTruthy();
    });
  });

  test("flexbox and grid layout", async () => {
    const layoutTests = await runCrossBrowser(async (driver) => {
      await driver.get("chrome-extension://[id]/options/options.html");

      // Test modern CSS layout features
      const layout = await driver.executeScript(`
        const grid = document.querySelector('.settings-grid');
        const flex = document.querySelector('.settings-flex');
        
        return {
          gridDisplay: window.getComputedStyle(grid).display,
          flexDisplay: window.getComputedStyle(flex).display,
          gridColumns: window.getComputedStyle(grid).gridTemplateColumns
        };
      `);

      return layout;
    });

    // Modern CSS should work across browsers
    Object.values(layoutTests).forEach((layout) => {
      expect(layout.gridDisplay).toBe("grid");
      expect(layout.flexDisplay).toBe("flex");
    });
  });
});
```

## Performance Cross-Browser Testing

### Load Time Comparison

```javascript
// test/performance/load-times.test.js
describe("Cross-Browser Performance", () => {
  test("extension load times", async () => {
    const loadTimes = await runCrossBrowser(async (driver, browserName) => {
      const startTime = Date.now();

      // Load extension popup
      await openExtensionPopup(driver);

      // Wait for popup to be fully rendered
      await driver.wait(until.elementLocated(By.css(".popup-content")), 5000);

      const loadTime = Date.now() - startTime;

      return {
        browser: browserName,
        loadTime,
      };
    });

    // All browsers should load within reasonable time
    Object.values(loadTimes).forEach((result) => {
      expect(result.loadTime).toBeLessThan(2000); // Under 2 seconds
    });

    // Log performance comparison
    console.table(loadTimes);
  });

  test("storage operation performance", async () => {
    const storagePerformance = await runCrossBrowser(async (driver) => {
      const results = await driver.executeAsyncScript(`
        const callback = arguments[arguments.length - 1];
        const iterations = 100;
        const testData = {key: 'value'.repeat(100)};
        
        const startTime = performance.now();
        
        let completed = 0;
        for (let i = 0; i < iterations; i++) {
          chrome.storage.local.set({[i]: testData}, () => {
            if (++completed === iterations) {
              const duration = performance.now() - startTime;
              callback({
                iterations,
                duration,
                averagePerOp: duration / iterations
              });
            }
          });
        }
      `);

      return results;
    });

    // Storage performance should be reasonable
    Object.values(storagePerformance).forEach((result) => {
      expect(result.averagePerOp).toBeLessThan(10); // Under 10ms per operation
    });
  });
});
```

## Automated Testing Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/cross-browser-tests.yml
name: Cross-Browser Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  chrome-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Build extension
        run: npm run build

      - name: Package for Chrome
        run: npm run package:chrome

      - name: Run Chrome tests
        run: npm run test:chrome

  firefox-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Setup Firefox
        uses: browser-actions/setup-firefox@latest

      - name: Install dependencies
        run: npm ci

      - name: Build extension
        run: npm run build

      - name: Package for Firefox
        run: npm run package:firefox

      - name: Run Firefox tests
        run: npm run test:firefox

  edge-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Build extension
        run: npm run build

      - name: Run Edge tests
        run: npm run test:edge
```

### Test Reporting

```javascript
// test/reporters/cross-browser-reporter.js
class CrossBrowserReporter {
  constructor() {
    this.results = [];
  }

  addResult(browserName, testSuite, results) {
    this.results.push({
      browser: browserName,
      suite: testSuite,
      ...results,
      timestamp: new Date().toISOString(),
    });
  }

  generateHTML() {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cross-Browser Test Results</title>
      <style>
        .browser-results { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        .passed { color: green; }
        .failed { color: red; }
        .summary { font-weight: bold; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <h1>Cross-Browser Test Results</h1>
      ${this.results
        .map(
          (result) => `
        <div class="browser-results">
          <div class="summary">
            ${result.browser.toUpperCase()}: 
            <span class="passed">${result.passed} passed</span> / 
            <span class="failed">${result.failed} failed</span>
          </div>
          <ul>
            ${result.tests
              .map(
                (test) => `
              <li class="${test.passed ? "passed" : "failed"}">
                ${test.name} ${test.passed ? "✅" : "❌"}
                ${test.error ? ` - ${test.error}` : ""}
              </li>
            `,
              )
              .join("")}
          </ul>
        </div>
      `,
        )
        .join("")}
    </body>
    </html>
    `;
  }

  generateJUnit() {
    // Generate JUnit XML for CI integration
    return `<?xml version="1.0" encoding="UTF-8"?>
    <testsuites>
      ${this.results
        .map(
          (result) => `
        <testsuite name="${result.browser}" tests="${result.tests.length}" 
                   failures="${result.failed}" time="${result.duration || 0}">
          ${result.tests
            .map(
              (test) => `
            <testcase name="${test.name}" time="${test.duration || 0}">
              ${!test.passed ? `<failure message="${test.error || "Test failed"}"/>` : ""}
            </testcase>
          `,
            )
            .join("")}
        </testsuite>
      `,
        )
        .join("")}
    </testsuites>`;
  }

  saveReports(outputDir) {
    const fs = require("fs");
    const path = require("path");

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save HTML report
    fs.writeFileSync(
      path.join(outputDir, "cross-browser-report.html"),
      this.generateHTML(),
    );

    // Save JUnit XML
    fs.writeFileSync(
      path.join(outputDir, "cross-browser-junit.xml"),
      this.generateJUnit(),
    );

    // Save JSON for programmatic access
    fs.writeFileSync(
      path.join(outputDir, "cross-browser-results.json"),
      JSON.stringify(this.results, null, 2),
    );
  }
}

export default CrossBrowserReporter;
```

## Manual Testing Checklist

### Pre-Release Testing

```markdown
## Cross-Browser Manual Test Checklist

### Chrome

- [ ] Extension loads without errors
- [ ] Popup opens and functions correctly
- [ ] Options page accessible and usable
- [ ] Content scripts inject properly
- [ ] Storage operations work
- [ ] Sync functionality operates
- [ ] Context menus appear
- [ ] Keyboard shortcuts work
- [ ] No console errors or warnings

### Firefox

- [ ] Extension installs from XPI
- [ ] All Chrome tests pass
- [ ] Firefox-specific APIs work
- [ ] CSP policies don't block functionality
- [ ] about:debugging shows no errors
- [ ] Temporary vs permanent installation

### Edge

- [ ] Chrome extension package works
- [ ] All Chrome tests pass
- [ ] Edge-specific behaviors noted
- [ ] Microsoft Edge Add-ons compatibility
- [ ] Windows integration features
```

## Troubleshooting Cross-Browser Issues

### Common Problems

1. **API Differences**

   ```javascript
   // Solution: Use feature detection
   const storageAPI =
     typeof browser !== "undefined" ? browser.storage : chrome.storage;
   ```

2. **CSS Inconsistencies**

   ```css
   /* Use vendor prefixes and fallbacks */
   .extension-popup {
     display: -webkit-flex; /* Safari */
     display: flex; /* Modern browsers */
   }
   ```

3. **JavaScript Compatibility**

   ```javascript
   // Use polyfills for newer features
   if (!Array.prototype.includes) {
     Array.prototype.includes = function (searchElement) {
       return this.indexOf(searchElement) !== -1;
     };
   }
   ```

4. **Content Security Policy**
   ```json
   {
     "content_security_policy": {
       "extension_pages": "script-src 'self'; object-src 'self';",
       "content_scripts": "script-src 'self' 'unsafe-eval'; object-src 'self';"
     }
   }
   ```

## Best Practices

1. **Write Once, Test Everywhere**: Design with cross-browser compatibility in mind
2. **Feature Detection**: Check for API availability before use
3. **Graceful Degradation**: Provide fallbacks for unsupported features
4. **Consistent Testing**: Test all browsers regularly, not just at release
5. **Documentation**: Document browser-specific behaviors and workarounds

## References

- [WebExtensions API Compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Browser_support_for_JavaScript_APIs)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [Firefox Extension APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API)
- [Edge Extension Documentation](https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/)

## Revision History

| Date       | Author         | Changes                             |
| ---------- | -------------- | ----------------------------------- |
| 2025-08-11 | Developer Team | Initial cross-browser testing guide |
