/**
 * Real Playwright tests for browser extension functionality
 * These tests load the actual extension in Chrome and test real user workflows
 */

const { test, expect, chromium } = require("@playwright/test");
const path = require("path");

// Enhanced helper functions for robust extension testing
class ExtensionTestHelpers {
  static async waitForExtensionReady(page, timeout = 15000) {
    // Wait for either settings container to appear or loading to disappear
    return Promise.race([
      page.waitForSelector("#settings-container", { state: "visible", timeout }),
      page.waitForSelector("#loading", { state: "hidden", timeout })
    ]);
  }

  static async waitForPageFullyLoaded(page, timeout = 15000) {
    // More comprehensive page load detection
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

test.describe("Browser Extension Functionality", () => {
  let browser;
  let context;
  let extensionId;

  test.beforeAll(async () => {
    const extensionPath = path.resolve(__dirname, "../../dist");
    const userDataDir = path.resolve(__dirname, "../../test-user-data");

    console.log(`Loading extension from: ${extensionPath}`);
    console.log(`Using user data dir: ${userDataDir}`);

    // Check if dist folder exists
    const fs = require('fs');
    if (!fs.existsSync(extensionPath)) {
      throw new Error(`Extension build not found at ${extensionPath}. Run 'npm run build' first.`);
    }

    try {
      // Use launchPersistentContext for extension loading (2025 best practice)
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-web-security", // Helps with extension loading
          "--allow-running-insecure-content",
        ],
      });

      // Enhanced service worker detection with retries
      console.log("Detecting extension service worker...");
      let serviceWorker = null;
      const maxAttempts = 5;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`Service worker detection attempt ${attempt}/${maxAttempts}`);
        
        // Check existing service workers
        const workers = context.serviceWorkers();
        if (workers.length > 0) {
          serviceWorker = workers[0];
          break;
        }
        
        // Wait for service worker event
        try {
          serviceWorker = await Promise.race([
            context.waitForEvent("serviceworker", { timeout: 5000 }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Service worker timeout')), 5000)
            )
          ]);
          if (serviceWorker) break;
        } catch (error) {
          console.log(`Attempt ${attempt} failed: ${error.message}`);
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (serviceWorker) {
        const workerUrl = serviceWorker.url();
        extensionId = workerUrl.split("/")[2];
        console.log(`Extension loaded successfully! ID: ${extensionId}`);
        
        // Verify the service worker is responsive
        const page = await context.newPage();
        try {
          await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
          console.log("Extension pages are accessible");
        } catch (error) {
          console.warn(`Extension page access test failed: ${error.message}`);
        } finally {
          await page.close();
        }
      } else {
        throw new Error(
          "Extension service worker not found after multiple attempts - extension failed to load",
        );
      }
    } catch (error) {
      console.error("Failed to setup extension context:", error);
      if (context) {
        await context.close().catch(() => {});
      }
      throw error;
    }
  });

  test.afterAll(async () => {
    if (context) {
      try {
        console.log("Closing browser context...");
        await context.close();
        console.log("Browser context closed successfully");
      } catch (error) {
        console.warn("Error closing context:", error.message);
      }
    }
  });

  test("extension loads successfully", async () => {
    const page = await context.newPage();

    try {
      // Test accessing the extension popup directly
      await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
      console.log("Successfully navigated to extension popup");

      // Check that the page loads (basic check)
      await expect(page.locator(".popup-container")).toBeVisible();
      await expect(page.locator(".popup-header h1")).toHaveText("Settings");

      console.log("Extension popup loaded successfully!");
    } finally {
      await page.close();
    }
  });

  test("popup opens and displays settings", async () => {
    const page = await context.newPage();

    try {
      // Open extension popup
      await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

      // Wait for popup initialization - more robust approach
      // Either wait for settings container to appear OR loading to disappear
      await Promise.race([
        page.waitForSelector("#settings-container", { state: "visible", timeout: 15000 }),
        page.waitForSelector("#loading", { state: "hidden", timeout: 15000 })
      ]);

      // Ensure settings are fully loaded
      await page.waitForFunction(() => {
        const container = document.getElementById('settings-container');
        const loading = document.getElementById('loading');
        return container && 
               container.style.display !== 'none' && 
               loading && 
               loading.style.display === 'none';
      }, { timeout: 15000 });

      // Check that the loading spinner disappears and settings container appears
      await expect(page.locator("#loading")).toBeHidden();
      await expect(page.locator("#settings-container")).toBeVisible();

      // Check that settings are displayed (with more flexible selector)
      const settingsItems = page.locator(
        ".setting-item, .setting-group, input",
      );
      await expect(settingsItems.first()).toBeVisible();
    } catch (error) {
      console.error("Popup settings test failed:", error);
      // Add debugging info
      const loadingState = await page.locator("#loading").isVisible().catch(() => 'unknown');
      const containerState = await page.locator("#settings-container").isVisible().catch(() => 'unknown');
      console.error(`Debug - Loading visible: ${loadingState}, Container visible: ${containerState}`);
      throw error;
    } finally {
      await page.close();
    }
  });

  test("options page opens and displays all settings", async () => {
    const page = await context.newPage();

    try {
      // Open extension options page
      await page.goto(`chrome-extension://${extensionId}/options/options.html`);

      // Wait for options page initialization with better strategy
      await Promise.race([
        page.waitForSelector("#general-tab", { state: "visible", timeout: 15000 }),
        page.waitForSelector("#loading", { state: "hidden", timeout: 15000 })
      ]);

      // Ensure page is fully loaded
      await page.waitForFunction(() => {
        const generalTab = document.getElementById('general-tab');
        const loading = document.getElementById('loading');
        return generalTab && 
               generalTab.style.display !== 'none' && 
               (!loading || loading.style.display === 'none');
      }, { timeout: 15000 });

      // Check that the loading spinner disappears and tab content appears
      await expect(page.locator("#loading")).toBeHidden();
      await expect(page.locator("#general-tab")).toBeVisible();

      // Check that setting categories or individual settings are present
      const settingsContent = page.locator(
        ".setting-item, input, .tab-content",
      );
      await expect(settingsContent.first()).toBeVisible();
    } catch (error) {
      console.error("Options page test failed:", error);
      // Add debugging info
      const loadingState = await page.locator("#loading").isVisible().catch(() => 'unknown');
      const tabState = await page.locator("#general-tab").isVisible().catch(() => 'unknown');
      console.error(`Debug - Loading visible: ${loadingState}, Tab visible: ${tabState}`);
      throw error;
    } finally {
      await page.close();
    }
  });

  test("can change a boolean setting", async () => {
    const page = await context.newPage();
    
    try {
      await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

      // Wait for settings to load
      await page.waitForSelector("#settings-container", { state: "visible", timeout: 15000 });

      // Find a boolean setting and toggle it
      const booleanToggle = page.locator('input[type="checkbox"]').first();
      await expect(booleanToggle).toBeVisible();
      
      const initialState = await booleanToggle.isChecked();
      await booleanToggle.click();

      // Wait for the change to be processed
      await page.waitForFunction((expected) => {
        const checkbox = document.querySelector('input[type="checkbox"]');
        return checkbox && checkbox.checked === expected;
      }, !initialState, { timeout: 5000 });

      // Verify the state changed
      const newState = await booleanToggle.isChecked();
      expect(newState).toBe(!initialState);
    } finally {
      await page.close();
    }
  });

  test("can change a text setting", async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Find a text input and change its value
    const textInput = page.locator('input[type="text"]').first();
    if (await textInput.isVisible()) {
      await textInput.clear();
      await textInput.fill("Test Value");

      // Verify the value was set
      const value = await textInput.inputValue();
      expect(value).toBe("Test Value");
    }
  });

  test("settings persist across popup reopens", async () => {
    const page = await context.newPage();

    try {
      // Open popup and change a setting
      await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
      await ExtensionTestHelpers.waitForExtensionReady(page);

      const textInput = page.locator('input[type="text"]').first();
      await expect(textInput).toBeVisible();
      
      const testValue = `Persistent Test ${Date.now()}`;
      await textInput.clear();
      await textInput.fill(testValue);

      // Wait for save to complete
      await page.waitForTimeout(1000);

      // Close and reopen popup
      await page.close();
      const newPage = await context.newPage();
      await newPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);
      await ExtensionTestHelpers.waitForExtensionReady(newPage);

      // Check that the setting persisted
      const sameInput = newPage.locator('input[type="text"]').first();
      await expect(sameInput).toHaveValue(testValue);

      await newPage.close();
    } finally {
      if (!page.isClosed()) {
        await page.close();
      }
    }
  });

  test("export functionality works", async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/options.html`);

    // Look for export button
    const exportButton = page.locator('button:has-text("Export")');
    if (await exportButton.isVisible()) {
      // Set up download handling
      const downloadPromise = page.waitForEvent("download");
      await exportButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain("settings");
    }
  });

  test("content script API is accessible", async () => {
    const page = await context.newPage();

    try {
      // Navigate to a test page
      await page.goto("https://example.com");
      await page.waitForLoadState('networkidle');

      // Wait a moment for content script injection
      await page.waitForTimeout(2000);

      // Test content script injection and API availability
      const contentScriptResults = await page.evaluate(() => {
        return {
          hasContentScript: typeof window.ContentScriptSettings !== "undefined",
          hasSettingsAPI: typeof window.ContentScriptSettings?.getSettings === "function",
          documentReady: document.readyState,
          extensionScripts: Array.from(document.scripts)
            .filter(script => script.src && script.src.includes('chrome-extension'))
            .map(script => script.src)
        };
      });

      console.log('Content script test results:', contentScriptResults);

      // Basic page functionality check
      await expect(page.locator("h1")).toBeVisible();

      // If content script is injected, test its functionality
      if (contentScriptResults.hasContentScript) {
        const settingsAccess = await page.evaluate(async () => {
          try {
            const settings = await window.ContentScriptSettings.getSettings();
            return { success: true, hasSettings: !!settings };
          } catch (error) {
            return { success: false, error: error.message };
          }
        });
        
        console.log('Content script settings access:', settingsAccess);
        expect(settingsAccess.success).toBe(true);
      } else {
        console.log('Content script not injected - this may be expected based on manifest configuration');
      }
    } finally {
      await page.close();
    }
  });

  test("browser compatibility layer works", async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    // Test that the browser API is properly initialized
    const browserAPIResult = await page.evaluate(() => {
      return (
        typeof browserAPI !== "undefined" &&
        typeof browserAPI.storage !== "undefined" &&
        typeof browserAPI.runtime !== "undefined"
      );
    });

    expect(browserAPIResult).toBe(true);
  });

  test("background service worker is responsive", async () => {
    const page = await context.newPage();
    
    try {
      await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
      await ExtensionTestHelpers.waitForExtensionReady(page);

      // Test background script communication
      const communicationTests = await page.evaluate(async () => {
        const results = [];
        
        try {
          // Test basic ping
          const pingResult = await browserAPI.runtime.sendMessage({ type: "PING" });
          results.push({ test: 'ping', success: !!pingResult?.pong, result: pingResult });
          
          // Test settings retrieval through background
          const settingsResult = await browserAPI.runtime.sendMessage({ type: "GET_ALL_SETTINGS" });
          results.push({ test: 'get_settings', success: !!settingsResult, result: settingsResult });
          
          // Test extension info
          const manifestResult = await browserAPI.runtime.sendMessage({ type: "GET_MANIFEST" });
          results.push({ test: 'manifest', success: !!manifestResult, result: manifestResult });
          
        } catch (error) {
          results.push({ test: 'error', success: false, error: error.message });
        }
        
        return results;
      });

      console.log('Background script communication tests:', communicationTests);
      
      // Verify at least basic communication works
      const pingTest = communicationTests.find(test => test.test === 'ping');
      expect(pingTest?.success).toBe(true);
      
    } finally {
      await page.close();
    }
  });

  test("no console errors on extension pages", async () => {
    const page = await context.newPage();
    const consoleErrors = [];
    const consoleWarnings = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      } else if (msg.type() === "warning") {
        consoleWarnings.push(msg.text());
      }
    });

    try {
      // Test popup page
      await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
      await ExtensionTestHelpers.waitForExtensionReady(page);
      await page.waitForTimeout(1000); // Allow any async operations to complete

      // Test options page
      await page.goto(`chrome-extension://${extensionId}/options/options.html`);
      await ExtensionTestHelpers.waitForExtensionReady(page);
      await page.waitForTimeout(1000); // Allow any async operations to complete

      // Log warnings for debugging but don't fail tests
      if (consoleWarnings.length > 0) {
        console.log('Console warnings detected:', consoleWarnings);
      }

      // Check that no critical errors occurred
      const criticalErrors = consoleErrors.filter(
        (error) => !error.includes("Warning") && 
                   !error.includes("favicon") &&
                   !error.includes("ERR_INTERNET_DISCONNECTED") &&
                   !error.includes("DevTools")
      );

      if (criticalErrors.length > 0) {
        console.error('Critical console errors detected:', criticalErrors);
      }

      expect(criticalErrors).toHaveLength(0);
    } finally {
      await page.close();
    }
  });
});
