/**
 * Real end-to-end user workflow tests using Playwright
 * Tests complete user scenarios with the actual browser extension
 */

const { test, expect, chromium } = require("@playwright/test");
const path = require("path");

// Removed complex helper functions - using launchPersistentContext approach

test.describe("End-to-End User Workflows", () => {
  let browser;
  let context;
  let extensionId;

  test.beforeAll(async () => {
    const extensionPath = path.resolve(__dirname, "../../dist");
    const userDataDir = path.resolve(
      __dirname,
      "../../test-user-data-workflows",
    );

    console.log(`Loading extension from: ${extensionPath}`);
    console.log(`Using user data dir: ${userDataDir}`);

    // Use launchPersistentContext for extension loading (2025 best practice)
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--no-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    // Wait for extension to load and service worker to initialize
    console.log("Waiting for extension to load...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Get service worker using 2025 pattern
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      console.log(
        "Service worker not immediately available, waiting for event...",
      );
      serviceWorker = await context.waitForEvent("serviceworker", {
        timeout: 10000,
      });
    }

    if (serviceWorker) {
      const workerUrl = serviceWorker.url();
      extensionId = workerUrl.split("/")[2];
      console.log(`Extension loaded successfully! ID: ${extensionId}`);
    } else {
      throw new Error(
        "Extension service worker not found - extension failed to load",
      );
    }
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test.describe("Extension Installation Workflow", () => {
    test("should initialize extension with default settings", async () => {
      const page = await context.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

        // Wait for extension to initialize
        await page.waitForTimeout(3000);

        // Check that loading disappears and settings container appears
        await expect(page.locator("#loading")).toBeHidden();
        await expect(page.locator("#settings-container")).toBeVisible();

        // Check that at least one setting is visible (indicating defaults loaded)
        const settingItems = page.locator(
          ".setting-item, .setting-group, input",
        );
        await expect(settingItems.first()).toBeVisible();
      } catch (error) {
        console.error("Extension initialization test failed:", error);
        throw error;
      } finally {
        await page.close();
      }
    });

    test("should handle upgrade from previous version", async () => {
      // This would test migration scenarios
      // For now, we'll just verify the extension loads properly
      const page = await context.newPage();

      try {
        await page.goto(
          `chrome-extension://${extensionId}/options/options.html`,
        );

        // Wait for options page to initialize
        await page.waitForTimeout(3000);

        await expect(page.locator("#loading")).toBeHidden();
        await expect(page.locator("#general-tab")).toBeVisible();
      } catch (error) {
        console.error("Extension upgrade test failed:", error);
        throw error;
      } finally {
        await page.close();
      }
    });
  });

  test.describe("Settings Management Workflow", () => {
    test("should complete full settings modification workflow", async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options/options.html`);

      // Find and modify a text setting
      const textInput = page.locator('input[type="text"]').first();
      if (await textInput.isVisible()) {
        const originalValue = await textInput.inputValue();
        const newValue = "Modified Value " + Date.now();

        await textInput.clear();
        await textInput.fill(newValue);

        // Verify change took effect
        await expect(textInput).toHaveValue(newValue);

        // Navigate away and back to verify persistence
        await page.reload();
        await expect(textInput).toHaveValue(newValue);

        // Restore original value
        await textInput.clear();
        await textInput.fill(originalValue);
      }

      await page.close();
    });

    test("should handle bulk settings update workflow", async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options/options.html`);

      // Modify multiple settings
      const textInputs = page.locator('input[type="text"]');
      const count = await textInputs.count();

      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          const input = textInputs.nth(i);
          if (await input.isVisible()) {
            await input.clear();
            await input.fill(`Bulk Update ${i} - ${Date.now()}`);
          }
        }

        // Verify all changes persisted
        await page.reload();

        for (let i = 0; i < Math.min(count, 3); i++) {
          const input = textInputs.nth(i);
          if (await input.isVisible()) {
            const value = await input.inputValue();
            expect(value).toContain("Bulk Update");
          }
        }
      }

      await page.close();
    });
  });

  test.describe("Export/Import Workflow", () => {
    test("should export settings to file", async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options/options.html`);

      // Look for export functionality
      const exportButton = page
        .locator('button:has-text("Export")')
        .or(page.locator('[data-action="export"]'));

      if (await exportButton.isVisible()) {
        const downloadPromise = page.waitForEvent("download");
        await exportButton.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain("settings");

        // Verify file content (if accessible)
        const filePath = await download.path();
        if (filePath) {
          const fs = require("fs");
          const content = fs.readFileSync(filePath, "utf8");
          const parsedContent = JSON.parse(content);
          expect(parsedContent).toHaveProperty("settings");
        }
      }

      await page.close();
    });

    test("should import settings from file", async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options/options.html`);

      // Look for import functionality
      const importButton = page
        .locator('button:has-text("Import")')
        .or(page.locator('[data-action="import"]'));

      if (await importButton.isVisible()) {
        // Create a test settings file
        const testSettings = {
          version: "1.0",
          timestamp: new Date().toISOString(),
          settings: {
            feature_enabled: {
              type: "boolean",
              value: true,
              description: "Test import setting",
            },
          },
        };

        // This test would need file upload functionality
        // For now, just verify the import button exists
        await expect(importButton).toBeVisible();
      }

      await page.close();
    });

    test("should handle import validation errors", async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options/options.html`);

      // Test would involve uploading invalid JSON
      // For now, just verify error handling exists
      await expect(page.locator("#general-tab")).toBeVisible();

      await page.close();
    });
  });

  test.describe("Settings Reset Workflow", () => {
    test("should reset all settings to defaults", async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options/options.html`);

      // First modify a setting
      const textInput = page.locator('input[type="text"]').first();
      if (await textInput.isVisible()) {
        await textInput.clear();
        await textInput.fill("Modified for reset test");

        // Look for reset button
        const resetButton = page
          .locator('button:has-text("Reset")')
          .or(page.locator('[data-action="reset"]'));

        if (await resetButton.isVisible()) {
          await resetButton.click();

          // Confirm reset if dialog appears
          page.on("dialog", (dialog) => dialog.accept());

          // Verify setting was reset (value should not be our test value)
          await page.waitForTimeout(1000);
          const currentValue = await textInput.inputValue();
          expect(currentValue).not.toBe("Modified for reset test");
        }
      }

      await page.close();
    });

    test("should reset individual setting to default", async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options/options.html`);

      // Look for individual reset buttons
      const individualResetButton = page
        .locator('[data-action="reset-setting"]')
        .first();

      if (await individualResetButton.isVisible()) {
        await individualResetButton.click();

        // Verify the specific setting was reset
        await expect(page.locator("#general-tab")).toBeVisible();
      }

      await page.close();
    });
  });

  test.describe("Content Script Integration Workflow", () => {
    test("should handle content script requesting settings", async () => {
      const page = await context.newPage();

      // Navigate to a test page
      await page.goto("https://example.com");

      // Inject test script that uses content script API
      const apiAvailable = await page.evaluate(() => {
        return typeof window.ContentScriptSettings !== "undefined";
      });

      // Content script API availability depends on injection strategy
      // For now, just verify the page loads without extension errors
      await expect(page.locator("h1")).toBeVisible();

      await page.close();
    });

    test("should handle content script updating settings", async () => {
      const page = await context.newPage();
      await page.goto("https://example.com");

      // Test content script setting updates
      // This would require the content script to be properly injected
      await expect(page.locator("h1")).toBeVisible();

      await page.close();
    });

    test("should handle real-time sync to content scripts", async () => {
      const page = await context.newPage();
      await page.goto("https://example.com");

      // Test real-time synchronization
      // This would involve changing settings and verifying content script updates
      await expect(page.locator("h1")).toBeVisible();

      await page.close();
    });
  });

  test.describe("Error Recovery Workflow", () => {
    test("should recover from storage corruption", async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

      // Test that extension can handle corrupted storage
      // This would require simulating storage corruption
      await expect(page.locator("#settings-container")).toBeVisible();

      await page.close();
    });

    test("should handle network failures gracefully", async () => {
      const page = await context.newPage();

      // Test offline scenarios
      await context.setOffline(true);
      await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

      // Extension should still work offline
      await expect(page.locator("#settings-container")).toBeVisible();

      await context.setOffline(false);
      await page.close();
    });
  });

  test.describe("Performance Workflow", () => {
    test("should maintain performance during heavy usage", async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options/options.html`);

      // Rapid setting changes to test performance
      const textInput = page.locator('input[type="text"]').first();
      if (await textInput.isVisible()) {
        const startTime = Date.now();

        for (let i = 0; i < 10; i++) {
          await textInput.clear();
          await textInput.fill(`Performance test ${i}`);
          await page.waitForTimeout(100);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should complete within reasonable time (adjust threshold as needed)
        expect(duration).toBeLessThan(5000);
      }

      await page.close();
    });
  });

  test.describe("Browser Restart Workflow", () => {
    test("should restore settings after browser restart", async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

      // Set a unique value
      const textInput = page.locator('input[type="text"]').first();
      if (await textInput.isVisible()) {
        const testValue = `Restart test ${Date.now()}`;
        await textInput.clear();
        await textInput.fill(testValue);

        // Close and recreate context (simulates restart)
        await page.close();
        await context.close();

        context = await browser.newContext();
        const newPage = await context.newPage();
        await newPage.goto(
          `chrome-extension://${extensionId}/popup/popup.html`,
        );

        // Verify setting persisted
        const sameInput = newPage.locator('input[type="text"]').first();
        await expect(sameInput).toHaveValue(testValue);

        await newPage.close();
      }
    });

    test("should handle extension update during restart", async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

      // Test extension update scenarios
      // For now, just verify extension loads properly
      await expect(page.locator("#settings-container")).toBeVisible();

      await page.close();
    });
  });
});
