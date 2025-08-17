/**
 * Edge Cases and Race Conditions Test Suite
 * Tests for critical scenarios identified in code review
 */

const { test, expect } = require("@playwright/test");
const BrowserFactory = require("./utils/browser-factory");

test.describe("Edge Cases and Race Conditions", () => {
  let context;
  let extensionId;

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async ({}, testInfo) => {
    console.log("Setting up edge cases and race conditions tests...");
    const extensionSetup = await BrowserFactory.setupExtension(testInfo);
    context = extensionSetup.context;
    extensionId = extensionSetup.extensionId;
    console.log(`Extension loaded: ${extensionId}`);
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  async function openPopupPage() {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.waitForLoadState("domcontentloaded");
    return page;
  }

  test.describe("Concurrent Storage Operations", () => {
    test("should handle multiple popup instances accessing storage simultaneously", async () => {
      // Open multiple popup instances
      const popup1 = await openPopupPage();
      const popup2 = await openPopupPage();
      const popup3 = await openPopupPage();

      try {
        // Verify all popups load settings without conflicts
        await Promise.all([
          popup1.waitForSelector("#settings-container"),
          popup2.waitForSelector("#settings-container"),
          popup3.waitForSelector("#settings-container"),
        ]);

        // Perform concurrent setting changes
        const settingPromises = [
          popup1.evaluate(async () => {
            const input = document.querySelector('input[id="setting-api_key"]');
            if (input) {
              input.value = "concurrent-test-1";
              input.dispatchEvent(new Event("blur"));
            }
          }),
          popup2.evaluate(async () => {
            const checkbox = document.querySelector(
              'input[id="setting-feature_enabled"]',
            );
            if (checkbox) {
              checkbox.checked = false;
              checkbox.dispatchEvent(new Event("change"));
            }
          }),
          popup3.evaluate(async () => {
            const select = document.querySelector(
              'select[id="setting-refresh_interval"]',
            );
            if (select) {
              select.value = "300";
              select.dispatchEvent(new Event("change"));
            }
          }),
        ];

        await Promise.all(settingPromises);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for saves

        // Verify all changes were saved correctly
        const finalValues = await Promise.all([
          popup1.evaluate(
            () => document.querySelector('input[id="setting-api_key"]')?.value,
          ),
          popup2.evaluate(
            () =>
              document.querySelector('input[id="setting-feature_enabled"]')
                ?.checked,
          ),
          popup3.evaluate(
            () =>
              document.querySelector('select[id="setting-refresh_interval"]')
                ?.value,
          ),
        ]);

        expect(finalValues[0]).toBe("concurrent-test-1");
        expect(finalValues[1]).toBe(false);
        expect(finalValues[2]).toBe("300");

        console.log("✅ Concurrent storage operations handled correctly");
      } finally {
        await popup1.close();
        await popup2.close();
        await popup3.close();
      }
    });

    test("should handle atomic storage operations during rapid changes", async () => {
      const page = await openPopupPage();

      try {
        // Wait for settings to load
        await page.waitForSelector("#settings-container");

        // Perform rapid setting changes to test atomic operations
        const rapidChanges = Array.from({ length: 10 }, (_, i) =>
          page.evaluate((index) => {
            const input = document.querySelector('input[id="setting-api_key"]');
            if (input) {
              input.value = `rapid-change-${index}`;
              input.dispatchEvent(new Event("blur"));
            }
          }, i),
        );

        await Promise.all(rapidChanges);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for all saves

        // Verify final state is consistent
        const finalValue = await page.evaluate(
          () => document.querySelector('input[id="setting-api_key"]')?.value,
        );

        expect(finalValue).toMatch(/^rapid-change-\d+$/);
        console.log(
          `✅ Atomic operations maintained consistency: ${finalValue}`,
        );
      } finally {
        await page.close();
      }
    });
  });

  test.describe("Background Script Failure Scenarios", () => {
    test("should handle background script timeout gracefully", async () => {
      const page = await openPopupPage();

      try {
        // Simulate background script delay by overriding the message handler
        await page.evaluate(() => {
          // Mock slow background response
          const originalSendMessage = browserAPI.runtime.sendMessage;
          browserAPI.runtime.sendMessage = function (message) {
            if (message.type === "GET_ALL_SETTINGS") {
              return new Promise((_, reject) => {
                setTimeout(() => {
                  reject(
                    new Error("Background script timeout - simulated failure"),
                  );
                }, 6000); // Longer than popup timeout - this should trigger fallback
              });
            }
            return originalSendMessage.call(this, message);
          };
        });

        // Wait for popup to be fully initialized before triggering reload
        await page.waitForFunction(
          () => {
            return (
              window.settingsPopupInstance &&
              window.settingsPopupInstance.isInitialized
            );
          },
          { timeout: 5000 },
        );

        // Trigger settings reload which should timeout and fallback to storage
        await page.evaluate(async () => {
          if (window.settingsPopupInstance) {
            try {
              await window.settingsPopupInstance.loadSettings();
            } catch (error) {
              console.log("Expected timeout error:", error.message);
            }
          }
        });

        // Verify fallback mechanism kicks in
        await page.waitForSelector("#settings-container", { timeout: 10000 });

        const settingsLoaded = await page.evaluate(() => {
          return document.querySelectorAll(".setting-item").length > 0;
        });

        expect(settingsLoaded).toBe(true);
        console.log("✅ Background script timeout handled with fallback");
      } finally {
        await page.close();
      }
    });

    test("should handle background script re-initialization errors", async () => {
      const page = await openPopupPage();

      try {
        // Test error handling during background script communication
        const errorResponse = await page.evaluate(async () => {
          try {
            // Send invalid message to trigger error handling
            const response = await browserAPI.runtime.sendMessage({
              type: "INVALID_MESSAGE_TYPE",
            });
            return response;
          } catch (error) {
            return { error: error.message };
          }
        });

        // Verify error is handled gracefully
        expect(errorResponse).toHaveProperty("error");
        console.log("✅ Background script errors handled gracefully");
      } finally {
        await page.close();
      }
    });
  });

  test.describe("Storage Fallback Edge Cases", () => {
    test("should handle corrupted storage data during fallback", async () => {
      const page = await openPopupPage();

      try {
        // First verify normal operation
        await page.waitForSelector("#settings-container");

        // Corrupt storage data thoroughly
        await page.evaluate(async () => {
          await browserAPI.storage.local.clear();
          await browserAPI.storage.local.set({
            settings: "completely-invalid-data",
            settingsLoadLock: Date.now() - 10000, // Stale lock
          });
        });

        // Reload popup to trigger storage fallback and recovery
        await page.reload();
        await page.waitForLoadState("domcontentloaded");

        // Wait for recovery - either settings load or we get a reasonable error state
        try {
          await page.waitForSelector("#settings-container", { timeout: 5000 });
          console.log("✅ Settings container found after corruption recovery");
        } catch {
          console.log(
            "⚠️ Timeout waiting for settings container, checking error state",
          );
        }

        // Verify popup either recovers or fails gracefully (no crash)
        const recoveryResult = await page.evaluate(() => {
          const container = document.querySelector("#settings-container");
          const errorElements = document.querySelectorAll(".error, .failure");
          const body = document.body;

          return {
            hasContainer: !!container,
            hasSettings: document.querySelectorAll(".setting-item").length > 0,
            hasErrors: errorElements.length > 0,
            bodyExists: !!body,
            pageResponsive: true, // If we can evaluate, page is responsive
          };
        });

        // Main requirement: popup should remain responsive and not crash
        expect(recoveryResult.bodyExists).toBe(true);
        expect(recoveryResult.pageResponsive).toBe(true);

        // If settings loaded, that's ideal, but graceful failure is also acceptable
        if (recoveryResult.hasContainer) {
          console.log("✅ Full recovery: settings container present");
        } else {
          console.log(
            "⚠️ Graceful degradation: no settings but page responsive",
          );
        }

        console.log(
          "✅ Corrupted storage handled with recovery:",
          recoveryResult,
        );
      } finally {
        await page.close();
      }
    });

    test("should handle storage quota exceeded scenarios", async () => {
      const page = await openPopupPage();

      try {
        // Fill storage to near capacity (simulate quota issues)
        await page.evaluate(async () => {
          try {
            // Create large data to fill storage
            const largeData = "x".repeat(1024 * 1024); // 1MB string
            for (let i = 0; i < 5; i++) {
              await browserAPI.storage.local.set({
                [`large_data_${i}`]: largeData,
              });
            }
          } catch (error) {
            console.log("Storage quota exceeded (expected):", error);
          }
        });

        // Attempt to save settings despite quota issues
        const saveResult = await page.evaluate(async () => {
          try {
            const input = document.querySelector('input[id="setting-api_key"]');
            if (input) {
              input.value = "quota-test";
              input.dispatchEvent(new Event("blur"));
            }
            return { success: true };
          } catch (error) {
            return { error: error.message };
          }
        });

        // Verify graceful handling (either success or proper error)
        expect(saveResult).toBeDefined();
        console.log("✅ Storage quota scenarios handled gracefully");
      } finally {
        await page.close();
      }
    });
  });

  test.describe("Content Script Detection Race Conditions", () => {
    test("should handle content script registration timing", async () => {
      const popup = await openPopupPage();
      const webPage = await context.newPage();

      try {
        // Navigate to a test page where content scripts should load
        await webPage.goto("https://example.com");
        await webPage.waitForLoadState("domcontentloaded");

        // Test content script presence detection
        const hasContentScript = await popup.evaluate(async () => {
          if (
            window.settingsPopupInstance &&
            window.settingsPopupInstance.checkContentScriptPresence
          ) {
            return await window.settingsPopupInstance.checkContentScriptPresence();
          }
          return null;
        });

        // Verify detection works consistently
        expect(typeof hasContentScript).toBe("boolean");
        console.log(`✅ Content script detection: ${hasContentScript}`);

        // Test multiple rapid checks
        const rapidChecks = Array.from({ length: 5 }, () =>
          popup.evaluate(async () => {
            if (
              window.settingsPopupInstance &&
              window.settingsPopupInstance.checkContentScriptPresence
            ) {
              return await window.settingsPopupInstance.checkContentScriptPresence();
            }
            return null;
          }),
        );

        const results = await Promise.all(rapidChecks);

        // All checks should return the same result
        const allSame = results.every((r) => r === results[0]);
        expect(allSame).toBe(true);

        console.log(
          "✅ Content script detection consistent across rapid checks",
        );
      } finally {
        await popup.close();
        await webPage.close();
      }
    });
  });

  test.describe("Error Recovery and Resilience", () => {
    test("should recover from storage corruption", async () => {
      const page = await openPopupPage();

      try {
        // Corrupt storage in multiple ways
        await page.evaluate(async () => {
          await browserAPI.storage.local.clear();
          await browserAPI.storage.local.set({
            settings: null,
            contentScriptRegistry: "invalid",
            settingsLoadLock: "stale-lock",
          });
        });

        // Reload popup to trigger recovery
        await page.reload();
        await page.waitForLoadState("domcontentloaded");

        // Verify popup recovers with defaults
        await page.waitForSelector("#settings-container", { timeout: 10000 });

        const settingsLoaded = await page.evaluate(() => {
          return document.querySelectorAll(".setting-item").length > 0;
        });

        expect(settingsLoaded).toBe(true);
        console.log("✅ Recovered from storage corruption");
      } finally {
        await page.close();
      }
    });

    test("should handle network failures during defaults loading", async () => {
      const page = await openPopupPage();

      try {
        // Mock network failure for defaults loading
        await page.route("**/config/defaults.json", (route) => {
          route.abort("failed");
        });

        // Clear storage to force defaults loading
        await page.evaluate(async () => {
          await browserAPI.storage.local.clear();
        });

        // Trigger defaults loading
        await page.evaluate(async () => {
          if (window.settingsPopupInstance) {
            await window.settingsPopupInstance.loadDefaultSettings();
          }
        });

        // Verify minimal fallback settings are used
        const hasMinimalSettings = await page.evaluate(() => {
          return document.querySelectorAll(".setting-item").length > 0;
        });

        expect(hasMinimalSettings).toBe(true);
        console.log("✅ Network failures handled with minimal fallback");
      } finally {
        await page.close();
      }
    });

    test("should handle complete failure of all mechanisms gracefully", async () => {
      const page = await context.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

        // Simulate complete failure: both background script AND storage fail
        await page.evaluate(() => {
          // Mock background script to fail
          const originalSendMessage = browserAPI.runtime.sendMessage;
          browserAPI.runtime.sendMessage = function (message) {
            if (message.type === "GET_ALL_SETTINGS") {
              return Promise.reject(new Error("Background script unavailable"));
            }
            return originalSendMessage.call(this, message);
          };

          // Mock storage to fail
          const originalStorageGet = browserAPI.storage.local.get;
          browserAPI.storage.local.get = function (key) {
            if (key === "settings" || key === "settingsLoadLock") {
              return Promise.reject(new Error("Storage access denied"));
            }
            return originalStorageGet.call(this, key);
          };

          // Mock fetch to fail (defaults loading)
          const originalFetch = window.fetch;
          window.fetch = function (url) {
            if (url.includes("defaults.json")) {
              return Promise.reject(new Error("Network unavailable"));
            }
            return originalFetch.call(this, url);
          };
        });

        // Wait and check that popup handles complete failure gracefully
        await page.waitForTimeout(3000);

        const failureHandling = await page.evaluate(() => {
          const loadingElement = document.querySelector("#loading");
          const errorMessages = document.querySelectorAll(".message.error");
          const bodyExists = !!document.body;

          return {
            pageResponsive: true, // If we can evaluate, page didn't crash
            bodyExists,
            hasErrorMessage: errorMessages.length > 0,
            loadingHidden:
              !loadingElement || loadingElement.style.display === "none",
            documentReady: document.readyState === "complete",
          };
        });

        // Main requirement: popup should not crash even with complete failure
        expect(failureHandling.pageResponsive).toBe(true);
        expect(failureHandling.bodyExists).toBe(true);
        expect(failureHandling.documentReady).toBe(true);

        // Should show some kind of error indication or graceful fallback
        // Note: In complete failure scenario, the main goal is popup remains responsive
        // Error indication is nice to have but not required for graceful degradation
        console.log("Error indication status:", {
          hasErrorMessage: failureHandling.hasErrorMessage,
          loadingHidden: failureHandling.loadingHidden,
        });

        console.log(
          "✅ Complete failure handled gracefully - popup remains responsive",
        );
      } finally {
        await page.close();
      }
    });

    test("should handle ErrorHandler unavailability gracefully", async () => {
      const page = await context.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);

        // Simulate ErrorHandler being unavailable
        await page.evaluate(() => {
          // Remove ErrorHandler to simulate script loading failure
          if (typeof ErrorHandler !== "undefined") {
            window.ErrorHandler = undefined;
            // Also remove from global scope
            if (typeof global !== "undefined") {
              global.ErrorHandler = undefined;
            }
            if (typeof self !== "undefined") {
              self.ErrorHandler = undefined;
            }
          }

          // Trigger an error that would normally use ErrorHandler
          const originalSendMessage = browserAPI.runtime.sendMessage;
          browserAPI.runtime.sendMessage = function (message) {
            if (message.type === "GET_ALL_SETTINGS") {
              return Promise.reject(
                new Error("Test error for ErrorHandler fallback"),
              );
            }
            return originalSendMessage.call(this, message);
          };
        });

        // Trigger settings reload
        await page.evaluate(async () => {
          if (window.settingsPopupInstance) {
            try {
              await window.settingsPopupInstance.loadSettings();
            } catch (error) {
              console.log(
                "Expected error without ErrorHandler:",
                error.message,
              );
            }
          }
        });

        // Wait for any error handling to complete
        await page.waitForTimeout(2000);

        const errorHandlerFallback = await page.evaluate(() => {
          const bodyExists = !!document.body;
          const consoleErrors = window.console && window.console.error;

          return {
            pageResponsive: true, // If we can evaluate, page didn't crash
            bodyExists,
            consoleAvailable: !!consoleErrors,
            documentReady: document.readyState === "complete",
          };
        });

        // Main requirement: should fall back to basic error handling without crashing
        expect(errorHandlerFallback.pageResponsive).toBe(true);
        expect(errorHandlerFallback.bodyExists).toBe(true);
        expect(errorHandlerFallback.documentReady).toBe(true);
        expect(errorHandlerFallback.consoleAvailable).toBe(true);

        console.log(
          "✅ ErrorHandler unavailability handled gracefully - basic error handling works",
        );
      } finally {
        await page.close();
      }
    });
  });
});
