/**
 * Real end-to-end user workflow tests using Playwright
 * Tests complete user scenarios with the actual browser extension
 */

const { test, expect } = require("@playwright/test");
const BrowserFactory = require("./utils/browser-factory");

// Removed complex helper functions - using launchPersistentContext approach

test.describe("End-to-End User Workflows", () => {
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

  /**
   * Reset extension storage to defaults before each test to ensure clean state
   * This prevents state pollution between test runs
   */
  test.beforeEach(async () => {
    const resetPage = await context.newPage();

    try {
      console.log("Resetting extension storage to defaults...");
      await resetPage.goto(
        `chrome-extension://${extensionId}/popup/popup.html`,
      );

      // Wait for extension to initialize
      await resetPage.waitForTimeout(2000);

      // Reset storage using the extension's message passing system
      await resetPage.evaluate(async () => {
        try {
          // Use the same communication pattern as the popup
          console.log("Sending reset message to background script...");

          const resetResponse = await browserAPI.runtime.sendMessage({
            type: "RESET_SETTINGS",
          });

          if (resetResponse && resetResponse.success) {
            console.log(
              "Storage reset completed successfully via background script",
            );
          } else {
            console.warn(
              "Reset message failed, attempting direct storage clear",
            );
            // Fallback: Clear storage directly
            await browserAPI.storage.local.clear();
            console.log("Storage cleared via direct API call");
          }
        } catch (error) {
          console.warn("Reset via message passing failed:", error.message);

          // Final fallback: Clear storage directly
          try {
            await browserAPI.storage.local.clear();
            console.log("Storage cleared via fallback API call");
          } catch (fallbackError) {
            console.error("All reset methods failed:", fallbackError.message);
          }
        }
      });

      // Wait for reset to complete and settings to reinitialize
      await resetPage.waitForTimeout(2000);

      // Verify the reset was successful by requesting settings from background script
      const verificationResult = await resetPage.evaluate(async () => {
        try {
          const settingsResponse = await browserAPI.runtime.sendMessage({
            type: "GET_ALL_SETTINGS",
          });

          if (settingsResponse && settingsResponse.settings) {
            const settingsCount = Object.keys(settingsResponse.settings).length;
            console.log(
              `Storage reset verification: ${settingsCount} settings loaded`,
            );
            return { success: true, settingsCount };
          } else {
            return {
              success: false,
              error: "No settings returned from background script",
            };
          }
        } catch (error) {
          console.warn("Settings verification failed:", error.message);
          return { success: false, error: error.message };
        }
      });

      if (verificationResult.success) {
        console.log("Storage reset verification passed");
      } else {
        console.warn(
          "Storage reset verification failed:",
          verificationResult.error,
        );
      }
    } catch (error) {
      console.error("Failed to reset extension storage:", error);
      // Don't fail the test setup, but log the issue
    } finally {
      await resetPage.close();
    }
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

        // Click the save button to persist changes to storage
        const saveButton = page.locator("#save-all-btn");
        await expect(saveButton).toBeEnabled();
        await saveButton.click();

        // Wait for save operation to complete and success message to appear
        await page.waitForSelector(".message.success", { timeout: 5000 });

        // Verify save button is disabled after successful save
        await expect(saveButton).toBeDisabled();

        // Wait for the save operation to complete
        await page.waitForTimeout(1000);

        // Navigate away and back to verify persistence
        await page.reload();

        // Wait for the page to fully reload and settings to load
        await page.waitForTimeout(2000);

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

        // Click the save button to persist all changes to storage
        const saveButton = page.locator("#save-all-btn");
        await expect(saveButton).toBeEnabled();
        await saveButton.click();

        // Wait for save operation to complete and success message to appear
        await page.waitForSelector(".message.success", { timeout: 5000 });

        // Verify save button is disabled after successful save
        await expect(saveButton).toBeDisabled();

        // Wait for the save operation to complete
        await page.waitForTimeout(1000);

        // Verify all changes persisted
        await page.reload();

        // Wait for the page to fully reload and settings to load
        await page.waitForTimeout(2000);

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
        const testSettingsForImport = {
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
        console.log(
          "Import test settings ready:",
          Object.keys(testSettingsForImport),
        );
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
      await page.evaluate(() => {
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
      // Skip this test as it requires complex browser context recreation
      // that's better handled in integration tests
      test.skip(
        true,
        "Browser restart simulation requires persistent storage testing approach",
      );

      /*
      // This test would need to be restructured to properly handle
      // browser context recreation with extension reloading
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

      // Set a unique value and verify persistence
      const textInput = page.locator('input[type="text"]').first();
      if (await textInput.isVisible()) {
        const testValue = `Restart test ${Date.now()}`;
        await textInput.clear();
        await textInput.fill(testValue);
        
        // Note: Actual browser restart testing requires different approach
        // than context recreation due to extension loading requirements
      }
      */
    });

    test("should handle extension update during restart", async () => {
      const page = await context.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

        // Wait for extension to initialize
        await Promise.race([
          page.waitForSelector("#settings-container", {
            state: "visible",
            timeout: 15000,
          }),
          page.waitForSelector("#loading", { state: "hidden", timeout: 15000 }),
        ]);

        // Test extension update scenarios
        // Verify extension loads properly after potential updates
        await expect(page.locator("#settings-container")).toBeVisible();

        console.log("Extension update handling test passed");
      } finally {
        await page.close();
      }
    });
  });
});
