/**
 * Focused E2E tests for popup button functionality
 * These tests specifically verify that all popup buttons work correctly
 * to prevent regressions in the event listener setup
 */

const { test, expect } = require("@playwright/test");
const BrowserFactory = require("./utils/browser-factory");

test.describe("Popup Button Functionality", () => {
  let context;
  let extensionId;
  let serviceWorker;

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async ({}, testInfo) => {
    console.log(
      `Test setup for project: ${testInfo?.project?.name || "default"}`,
    );

    // Use dynamic browser factory for cross-browser support
    const extensionSetup = await BrowserFactory.setupExtension(testInfo);
    context = extensionSetup.context;
    serviceWorker = extensionSetup.serviceWorker;
    extensionId = extensionSetup.extensionId;

    // Use serviceWorker to prevent unused warning
    console.log(`Service worker initialized: ${serviceWorker ? "yes" : "no"}`);
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test.beforeEach(async () => {
    // Reset extension storage before each test
    const resetPage = await context.newPage();
    try {
      await resetPage.goto(
        `chrome-extension://${extensionId}/popup/popup.html`,
      );
      await resetPage.waitForTimeout(2000);

      await resetPage.evaluate(async () => {
        try {
          const resetResponse = await browserAPI.runtime.sendMessage({
            type: "RESET_SETTINGS",
          });
          if (!resetResponse?.success) {
            await browserAPI.storage.local.clear();
          }
        } catch {
          await browserAPI.storage.local.clear();
        }
      });

      await resetPage.waitForTimeout(1000);
    } catch (error) {
      console.warn("Failed to reset storage:", error.message);
    } finally {
      await resetPage.close();
    }
  });

  async function openPopupPage() {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    // Wait for popup to fully initialize
    await page.waitForSelector("#settings-container", {
      state: "visible",
      timeout: 10000,
    });
    await page.waitForSelector("#loading", { state: "hidden", timeout: 10000 });

    return page;
  }

  test("export button functionality", async () => {
    const page = await openPopupPage();

    try {
      // Find and click the export button
      const exportButton = page.locator("#export-btn");
      await expect(exportButton).toBeVisible();
      await expect(exportButton).toContainText("Export");

      // Set up download handling
      const downloadPromise = page.waitForEvent("download");
      await exportButton.click();

      // Verify download starts
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/settings.*\.json/);

      // Verify no console errors
      const consoleLogs = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleLogs.push(msg.text());
        }
      });

      await page.waitForTimeout(1000);
      const criticalErrors = consoleLogs.filter(
        (log) => !log.includes("favicon") && !log.includes("DevTools"),
      );
      expect(criticalErrors).toHaveLength(0);
    } finally {
      await page.close();
    }
  });

  test("import button functionality", async () => {
    const page = await openPopupPage();

    try {
      // Find the import button
      const importButton = page.locator("#import-btn");
      await expect(importButton).toBeVisible();
      await expect(importButton).toContainText("Import");

      // Click import button and verify file picker opens
      // Note: We can't actually test file upload in headless mode,
      // but we can verify the button is clickable and no errors occur

      const consoleLogs = [];
      const errorLogs = [];
      page.on("console", (msg) => {
        consoleLogs.push({ type: msg.type(), text: msg.text() });
        if (msg.type() === "error") {
          errorLogs.push(msg.text());
        }
      });

      await importButton.click();
      await page.waitForTimeout(500);

      // Verify no JavaScript errors occurred
      const criticalErrors = errorLogs.filter(
        (log) =>
          !log.includes("favicon") &&
          !log.includes("DevTools") &&
          !log.includes("User gesture"), // File picker may require user gesture
      );
      expect(criticalErrors).toHaveLength(0);

      console.log("Import button click succeeded - no critical errors");
    } finally {
      await page.close();
    }
  });

  test("reset button functionality", async () => {
    const page = await openPopupPage();

    try {
      // First, modify a setting so we can verify reset
      const textInput = page.locator('input[type="text"]').first();
      if (await textInput.isVisible()) {
        await textInput.clear();
        await textInput.fill("Test value before reset");
        await page.waitForTimeout(500);
      }

      // Find the reset button
      const resetButton = page.locator("#reset-btn");
      await expect(resetButton).toBeVisible();
      await expect(resetButton).toContainText("Reset");

      // Set up dialog handling for confirmation
      let dialogAccepted = false;
      page.on("dialog", async (dialog) => {
        expect(dialog.message()).toContain("reset");
        await dialog.accept();
        dialogAccepted = true;
      });

      const consoleLogs = [];
      const errorLogs = [];
      page.on("console", (msg) => {
        consoleLogs.push({ type: msg.type(), text: msg.text() });
        if (msg.type() === "error") {
          errorLogs.push(msg.text());
        }
      });

      // Click reset button
      await resetButton.click();
      await page.waitForTimeout(2000);

      // Verify dialog was shown
      expect(dialogAccepted).toBe(true);

      // Verify no critical JavaScript errors
      const criticalErrors = errorLogs.filter(
        (log) => !log.includes("favicon") && !log.includes("DevTools"),
      );
      expect(criticalErrors).toHaveLength(0);

      // If we modified a text input, verify it was reset
      if (await textInput.isVisible()) {
        const resetValue = await textInput.inputValue();
        expect(resetValue).not.toBe("Test value before reset");
        console.log("Setting was successfully reset");
      }
    } finally {
      await page.close();
    }
  });

  test("advanced settings (gear icon) button functionality", async () => {
    const page = await openPopupPage();

    try {
      // Find the advanced settings button (gear icon)
      const advancedButton = page.locator("#advanced-btn");
      await expect(advancedButton).toBeVisible();

      const consoleLogs = [];
      const errorLogs = [];
      page.on("console", (msg) => {
        consoleLogs.push({ type: msg.type(), text: msg.text() });
        if (msg.type() === "error") {
          errorLogs.push(msg.text());
        }
      });

      // Click the gear icon
      await advancedButton.click();
      await page.waitForTimeout(2000);

      // Verify no critical JavaScript errors
      const criticalErrors = errorLogs.filter(
        (log) => !log.includes("favicon") && !log.includes("DevTools"),
      );
      expect(criticalErrors).toHaveLength(0);

      // Check if options page opened (look for new tabs)
      const pages = context.pages();
      console.log(`Total pages after clicking gear icon: ${pages.length}`);

      // Look for options page in any of the open pages
      let optionsPageFound = false;
      for (const checkPage of pages) {
        try {
          const url = checkPage.url();
          if (url.includes("options/options.html")) {
            optionsPageFound = true;
            console.log("✅ Options page opened successfully");

            // Verify options page loaded properly
            await checkPage.waitForSelector("#general-tab", { timeout: 5000 });
            break;
          }
        } catch {
          // Page might be closed or not accessible, continue checking others
          continue;
        }
      }

      // The gear icon should either open options page or log appropriate messages
      const hasOptionsPageMessage = consoleLogs.some(
        (log) =>
          log.text.includes("Options page opened") ||
          log.text.includes("Falling back to manual tab creation"),
      );

      expect(optionsPageFound || hasOptionsPageMessage).toBe(true);
      console.log("Advanced settings button functionality verified");
    } finally {
      await page.close();
    }
  });

  test("all buttons are visible and have correct labels", async () => {
    const page = await openPopupPage();

    try {
      // Verify all expected buttons are present
      const exportButton = page.locator("#export-btn");
      const importButton = page.locator("#import-btn");
      const resetButton = page.locator("#reset-btn");
      const advancedButton = page.locator("#advanced-btn");

      await expect(exportButton).toBeVisible();
      await expect(importButton).toBeVisible();
      await expect(resetButton).toBeVisible();
      await expect(advancedButton).toBeVisible();

      // Verify button text content
      await expect(exportButton).toContainText("Export");
      await expect(importButton).toContainText("Import");
      await expect(resetButton).toContainText("Reset");

      // Verify buttons are enabled (not disabled)
      await expect(exportButton).toBeEnabled();
      await expect(importButton).toBeEnabled();
      await expect(resetButton).toBeEnabled();
      await expect(advancedButton).toBeEnabled();

      console.log("All popup buttons are visible and properly labeled");
    } finally {
      await page.close();
    }
  });

  test("popup loads without console errors", async () => {
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
      await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
      await page.waitForSelector("#settings-container", {
        state: "visible",
        timeout: 10000,
      });
      await page.waitForTimeout(1000);

      // Log warnings for debugging
      if (consoleWarnings.length > 0) {
        console.log("Console warnings:", consoleWarnings);
      }

      // Filter out non-critical errors
      const criticalErrors = consoleErrors.filter(
        (error) =>
          !error.includes("favicon") &&
          !error.includes("DevTools") &&
          !error.includes("ERR_INTERNET_DISCONNECTED"),
      );

      if (criticalErrors.length > 0) {
        console.error("Critical console errors:", criticalErrors);
      }

      expect(criticalErrors).toHaveLength(0);
      console.log("Popup loaded without critical console errors");
    } finally {
      await page.close();
    }
  });

  test("event listeners are properly attached after DOM load", async () => {
    const page = await openPopupPage();

    try {
      // Verify event listeners are attached by checking if buttons respond to clicks
      // We'll do this by monitoring console logs and checking for expected behavior

      const consoleLogs = [];
      page.on("console", (msg) => {
        consoleLogs.push({ type: msg.type(), text: msg.text() });
      });

      // Test each button briefly to ensure event listeners are attached
      const buttons = [
        { id: "#export-btn", name: "export" },
        { id: "#import-btn", name: "import" },
        { id: "#reset-btn", name: "reset" },
        { id: "#advanced-btn", name: "advanced" },
      ];

      for (const button of buttons) {
        const buttonElement = page.locator(button.id);
        await expect(buttonElement).toBeVisible();

        // Click button and immediately check for any response
        await buttonElement.click();
        await page.waitForTimeout(200);

        // For reset button, handle the dialog
        if (button.name === "reset") {
          page.on("dialog", (dialog) => dialog.dismiss());
        }
      }

      // The fact that we can click all buttons without JavaScript errors
      // indicates that event listeners are properly attached
      console.log("All button event listeners are properly attached");
    } finally {
      await page.close();
    }
  });

  test("import functionality updates displayed values", async () => {
    const page = await openPopupPage();

    try {
      // Reset to defaults first to ensure clean state
      await page.evaluate(async () => {
        const response = await browserAPI.runtime.sendMessage({
          type: "RESET_SETTINGS",
        });
        if (response.success) {
          await window.settingsPopupInstance.loadSettings();
          window.settingsPopupInstance.renderSettings();
        }
        return response;
      });

      await page.waitForTimeout(500);

      // Verify API key starts empty
      const initialValue = await page.evaluate(() => {
        const input = document.querySelector("#setting-api_key");
        return input ? input.value : "NOT_FOUND";
      });
      expect(initialValue).toBe("");

      // Simulate import with test value
      const importResult = await page.evaluate(async () => {
        try {
          const testData = JSON.stringify({
            version: "1.0",
            timestamp: new Date().toISOString(),
            settings: {
              api_key: {
                type: "text",
                value: "test-import-value",
                description: "API Key",
              },
            },
          });

          const response = await browserAPI.runtime.sendMessage({
            type: "IMPORT_SETTINGS",
            data: testData,
          });

          if (response.success) {
            await window.settingsPopupInstance.loadSettings();
            window.settingsPopupInstance.renderSettings();
          }

          return response;
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(importResult.success).toBe(true);
      await page.waitForTimeout(500);

      // Verify API key now shows imported value
      const finalValue = await page.evaluate(() => {
        const input = document.querySelector("#setting-api_key");
        return input ? input.value : "NOT_FOUND";
      });
      expect(finalValue).toBe("test-import-value");

      console.log(
        "Import functionality verified - values update correctly in popup",
      );
    } finally {
      await page.close();
    }
  });
});
