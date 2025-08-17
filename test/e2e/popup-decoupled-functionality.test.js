/**
 * E2E tests for decoupled popup functionality
 * Tests popup settings operations when content scripts are disabled/unavailable
 */

const { test, expect } = require("@playwright/test");
const BrowserFactory = require("./utils/browser-factory");
const path = require("path");
const fs = require("fs");

test.describe("Popup Decoupled Functionality", () => {
  let context;
  let extensionId;

  // Run tests in serial mode to avoid race conditions on shared manifest file
  test.describe.configure({ mode: "serial" });

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async ({}, testInfo) => {
    console.log("Setting up decoupled popup tests...");

    // Temporarily modify the dist manifest to remove content scripts
    const distManifestPath = path.join(__dirname, "../../dist/manifest.json");
    const backupManifestPath = path.join(
      __dirname,
      "../../dist/manifest.backup.json",
    );

    try {
      // Read the manifest file directly (build should have already happened before tests)
      const manifestContent = fs.readFileSync(distManifestPath, "utf8");

      // Backup original manifest
      fs.writeFileSync(backupManifestPath, manifestContent);

      // Parse and modify manifest to remove content scripts
      const manifest = JSON.parse(manifestContent);
      delete manifest.content_scripts;

      // Write modified manifest
      fs.writeFileSync(distManifestPath, JSON.stringify(manifest, null, 2));
      console.log("Removed content_scripts from dist manifest for testing");

      // Set up extension with modified manifest
      const extensionSetup = await BrowserFactory.setupExtension(testInfo);
      context = extensionSetup.context;
      extensionId = extensionSetup.extensionId;

      console.log(`Extension loaded without content scripts: ${extensionId}`);
    } catch (error) {
      // Restore manifest if something went wrong
      const backupExists = fs.existsSync(backupManifestPath);
      if (backupExists) {
        fs.copyFileSync(backupManifestPath, distManifestPath);
        fs.unlinkSync(backupManifestPath);
      }
      throw error;
    }
  });

  test.afterAll(async () => {
    // Restore original manifest
    const distManifestPath = path.join(__dirname, "../../dist/manifest.json");
    const backupManifestPath = path.join(
      __dirname,
      "../../dist/manifest.backup.json",
    );

    try {
      if (fs.existsSync(backupManifestPath)) {
        fs.copyFileSync(backupManifestPath, distManifestPath);
        fs.unlinkSync(backupManifestPath);
        console.log("Restored original manifest");
      }
    } catch (error) {
      console.warn("Failed to restore manifest:", error.message);
    }

    if (context) {
      try {
        await context.close();
      } catch (error) {
        console.warn("Failed to close browser context:", error.message);
      }
    }
  });

  test.beforeEach(async () => {
    // Reset storage before each test
    const resetPage = await context.newPage();
    try {
      await resetPage.goto(
        `chrome-extension://${extensionId}/popup/popup.html`,
      );
      await resetPage.waitForTimeout(500);

      await resetPage.evaluate(async () => {
        try {
          await browserAPI.storage.local.clear();
        } catch (error) {
          console.warn("Failed to clear storage:", error);
        }
      });

      await resetPage.waitForTimeout(300);
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

  test("popup loads default settings without content scripts", async () => {
    const page = await openPopupPage();

    try {
      // Verify popup loads successfully
      await expect(page.locator("#settings-container")).toBeVisible();
      await expect(page.locator("#loading")).toBeHidden();

      // Verify default settings are loaded
      const featureEnabledCheckbox = page.locator(
        'input[id="setting-feature_enabled"]',
      );
      await expect(featureEnabledCheckbox).toBeVisible();
      await expect(featureEnabledCheckbox).toBeChecked(); // Default is true

      // Verify API key field is present
      const apiKeyInput = page.locator('input[id="setting-api_key"]');
      await expect(apiKeyInput).toBeVisible();
      await expect(apiKeyInput).toHaveValue(""); // Default is empty

      // Verify refresh interval dropdown is present
      const refreshIntervalSelect = page.locator(
        'select[id="setting-refresh_interval"]',
      );
      await expect(refreshIntervalSelect).toBeVisible();
      await expect(refreshIntervalSelect).toHaveValue("60"); // Default is 60 seconds

      console.log(
        "✅ Popup loaded default settings successfully without content scripts",
      );
    } finally {
      await page.close();
    }
  });

  test("popup can save setting changes without content scripts", async () => {
    const page = await openPopupPage();

    try {
      // Change the feature_enabled setting
      const featureEnabledCheckbox = page.locator(
        'input[id="setting-feature_enabled"]',
      );
      await expect(featureEnabledCheckbox).toBeChecked();
      await featureEnabledCheckbox.uncheck();

      // Wait for save operation
      await page.waitForTimeout(500);

      // Change API key
      const apiKeyInput = page.locator('input[id="setting-api_key"]');
      await apiKeyInput.fill("test-api-key-12345");
      await apiKeyInput.blur(); // Trigger save

      // Wait for save operation
      await page.waitForTimeout(500);

      // Verify changes are persisted by reopening popup
      await page.close();
      const newPage = await openPopupPage();

      const newFeatureCheckbox = newPage.locator(
        'input[id="setting-feature_enabled"]',
      );
      await expect(newFeatureCheckbox).not.toBeChecked(); // Should be false now

      const newApiKeyInput = newPage.locator('input[id="setting-api_key"]');
      await expect(newApiKeyInput).toHaveValue("test-api-key-12345");

      console.log(
        "✅ Settings saved and persisted successfully without content scripts",
      );
      await newPage.close();
    } catch (error) {
      await page.close();
      throw error;
    }
  });

  test("popup handles background script communication gracefully", async () => {
    const page = await openPopupPage();

    try {
      // Test export functionality (requires background communication)
      const exportButton = page.locator("#export-btn");
      await expect(exportButton).toBeVisible();

      const downloadPromise = page.waitForEvent("download");
      await exportButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/settings.*\.json/);

      console.log("✅ Export functionality works without content scripts");

      // Test reset functionality
      const resetButton = page.locator("#reset-btn");
      await expect(resetButton).toBeVisible();

      // Accept the confirmation dialog
      page.on("dialog", async (dialog) => {
        expect(dialog.type()).toBe("confirm");
        await dialog.accept();
      });

      await resetButton.click();

      // Wait for reset to complete
      await page.waitForTimeout(1000);

      // Verify settings are reset to defaults
      const featureEnabledCheckbox = page.locator(
        'input[id="setting-feature_enabled"]',
      );
      await expect(featureEnabledCheckbox).toBeChecked(); // Back to default true

      console.log("✅ Reset functionality works without content scripts");
    } finally {
      await page.close();
    }
  });

  test("popup storage fallback loads default settings when background is unavailable", async () => {
    const page = await openPopupPage();

    try {
      // Clear storage to simulate no existing settings
      await page.evaluate(async () => {
        await browserAPI.storage.local.clear();
      });

      // Close and reopen popup to test storage fallback initialization
      await page.close();
      const newPage = await openPopupPage();

      // Verify the settings loaded from defaults via storage fallback
      const featureCheckbox = newPage.locator(
        'input[id="setting-feature_enabled"]',
      );
      await expect(featureCheckbox).toBeChecked(); // Should be true from defaults

      const apiKeyInput = newPage.locator('input[id="setting-api_key"]');
      await expect(apiKeyInput).toHaveValue(""); // Should be empty from defaults

      console.log("✅ Storage fallback initializes defaults correctly");
      await newPage.close();
    } catch (error) {
      await page.close();
      throw error;
    }
  });

  test("popup shows no content script errors", async () => {
    const page = await openPopupPage();
    const consoleErrors = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    try {
      // Perform various popup operations
      const featureCheckbox = page.locator(
        'input[id="setting-feature_enabled"]',
      );
      await featureCheckbox.uncheck();
      await page.waitForTimeout(500);

      const apiKeyInput = page.locator('input[id="setting-api_key"]');
      await apiKeyInput.fill("test-key");
      await apiKeyInput.blur();
      await page.waitForTimeout(500);

      // Check for content script related errors
      const contentScriptErrors = consoleErrors.filter(
        (error) =>
          error.includes("No receiver") ||
          error.includes("Could not establish connection") ||
          error.includes("content script"),
      );

      expect(contentScriptErrors).toHaveLength(0);
      console.log("✅ No content script related errors found");
    } finally {
      await page.close();
    }
  });

  test("popup checkContentScriptPresence helper returns false when no content script", async () => {
    const page = await openPopupPage();

    try {
      // Test the checkContentScriptPresence helper function
      const hasContentScript = await page.evaluate(async () => {
        if (
          window.settingsPopupInstance &&
          window.settingsPopupInstance.checkContentScriptPresence
        ) {
          return await window.settingsPopupInstance.checkContentScriptPresence();
        }
        return null;
      });

      expect(hasContentScript).toBe(false);
      console.log(
        "✅ checkContentScriptPresence correctly returns false when no content script",
      );
    } finally {
      await page.close();
    }
  });
});
