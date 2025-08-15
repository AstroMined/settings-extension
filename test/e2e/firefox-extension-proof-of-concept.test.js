/**
 * Proof of Concept test for Firefox Extension Runner
 * This test validates the new web-ext + Puppeteer approach works
 * with actual moz-extension:// URLs and real extension functionality
 */

const { test, expect } = require("@playwright/test");
const FirefoxExtensionRunner = require("./utils/firefox-extension-runner");

// Only run these tests when explicitly testing Firefox
test.describe.configure({ mode: "serial" });

test.describe("Firefox Extension Proof of Concept", () => {
  let runner;
  let browser;
  let page;
  let extensionId;

  test.beforeAll(async () => {
    // Skip if not testing Firefox specifically
    if (
      process.env.BROWSER !== "firefox" &&
      process.env.TEST_FIREFOX !== "true"
    ) {
      test.skip("Skipping Firefox PoC tests - set TEST_FIREFOX=true to run");
      return;
    }

    console.log("🚀 Starting Firefox Extension Proof of Concept...");

    runner = new FirefoxExtensionRunner();

    try {
      const result = await runner.startExtensionTest({
        headless: false, // Keep visible for debugging
        timeout: 45000, // Longer timeout for first run
      });

      browser = result.browser;
      page = result.page;
      extensionId = result.extensionId;

      console.log(`✅ Firefox Extension loaded with ID: ${extensionId}`);
    } catch (error) {
      console.error("❌ Firefox Extension Runner failed:", error.message);
      await runner?.cleanup();
      throw error;
    }
  });

  test.afterAll(async () => {
    if (runner) {
      await runner.cleanup();
    }
  });

  test("should load Firefox extension successfully", async () => {
    expect(runner).toBeDefined();
    expect(browser).toBeDefined();
    expect(page).toBeDefined();
    expect(extensionId).toBeDefined();

    console.log(`Extension ID: ${extensionId}`);
    console.log(`Extension URL base: moz-extension://${extensionId}/`);
  });

  test("should navigate to extension popup page", async () => {
    test.skip(!runner || !extensionId, "Extension not loaded");

    try {
      await runner.navigateToExtensionPage("popup/popup.html");

      // Verify we're on the right page
      const currentUrl = page.url();
      expect(currentUrl).toContain("moz-extension://");
      expect(currentUrl).toContain(extensionId);
      expect(currentUrl).toContain("popup/popup.html");

      console.log(`✅ Successfully navigated to popup: ${currentUrl}`);

      // Wait for popup to load
      await page.waitForSelector("body", { timeout: 10000 });

      // Check if settings container exists (basic functionality test)
      const hasSettingsContainer = await page.$("#settings-container");
      if (hasSettingsContainer) {
        console.log("✅ Settings container found in popup");
      } else {
        console.log("ℹ️  Settings container not found (may be loading...)");
      }
    } catch (error) {
      console.error("❌ Popup navigation failed:", error.message);

      // Take screenshot for debugging
      try {
        await page.screenshot({
          path: "test-results/firefox-popup-error.png",
          fullPage: true,
        });
        console.log(
          "📸 Screenshot saved: test-results/firefox-popup-error.png",
        );
      } catch (screenshotError) {
        console.log("Failed to take screenshot:", screenshotError.message);
      }

      throw error;
    }
  });

  test("should navigate to extension options page", async () => {
    test.skip(!runner || !extensionId, "Extension not loaded");

    try {
      await runner.navigateToExtensionPage("options/options.html");

      // Verify we're on the right page
      const currentUrl = page.url();
      expect(currentUrl).toContain("moz-extension://");
      expect(currentUrl).toContain(extensionId);
      expect(currentUrl).toContain("options/options.html");

      console.log(`✅ Successfully navigated to options: ${currentUrl}`);

      // Wait for options page to load
      await page.waitForSelector("body", { timeout: 10000 });

      // Check page title or content
      const title = await page.title();
      console.log(`Options page title: ${title}`);
    } catch (error) {
      console.error("❌ Options navigation failed:", error.message);

      // Take screenshot for debugging
      try {
        await page.screenshot({
          path: "test-results/firefox-options-error.png",
          fullPage: true,
        });
        console.log(
          "📸 Screenshot saved: test-results/firefox-options-error.png",
        );
      } catch (screenshotError) {
        console.log("Failed to take screenshot:", screenshotError.message);
      }

      throw error;
    }
  });

  test("should verify extension functionality works", async () => {
    test.skip(!runner || !extensionId, "Extension not loaded");

    try {
      // Navigate to popup for functionality test
      await runner.navigateToExtensionPage("popup/popup.html");

      // Wait for extension to initialize
      await page.waitForTimeout(3000);

      // Try to find and interact with extension elements
      const bodyContent = await page.content();
      console.log("Popup page loaded, content length:", bodyContent.length);

      // Look for common extension elements
      const elements = await page.evaluate(() => {
        return {
          hasBody: !!document.body,
          bodyClasses: document.body?.className || "",
          hasSettingsContainer: !!document.getElementById("settings-container"),
          hasLoadingElement: !!document.getElementById("loading"),
          inputCount: document.querySelectorAll("input").length,
          buttonCount: document.querySelectorAll("button").length,
          scriptCount: document.querySelectorAll("script").length,
        };
      });

      console.log(
        "Extension page analysis:",
        JSON.stringify(elements, null, 2),
      );

      // Basic sanity checks
      expect(elements.hasBody).toBe(true);
      expect(elements.scriptCount).toBeGreaterThan(0); // Should have scripts

      if (elements.hasSettingsContainer) {
        console.log(
          "✅ Extension appears to be functioning - settings container found",
        );
      } else if (elements.inputCount > 0 || elements.buttonCount > 0) {
        console.log(
          "✅ Extension appears to be functioning - interactive elements found",
        );
      } else {
        console.log(
          "ℹ️  Extension loaded but functionality unclear - this may be expected",
        );
      }
    } catch (error) {
      console.error("❌ Functionality test failed:", error.message);
      throw error;
    }
  });

  test("should validate extension URLs work correctly", async () => {
    test.skip(!runner || !extensionId, "Extension not loaded");

    // Test that we can construct and use proper moz-extension URLs
    const popupUrl = runner.getExtensionUrl("popup/popup.html");
    const optionsUrl = runner.getExtensionUrl("options/options.html");

    expect(popupUrl).toBe(`moz-extension://${extensionId}/popup/popup.html`);
    expect(optionsUrl).toBe(
      `moz-extension://${extensionId}/options/options.html`,
    );

    console.log(`✅ Extension URLs constructed correctly:`);
    console.log(`  Popup: ${popupUrl}`);
    console.log(`  Options: ${optionsUrl}`);

    // Test that both URLs are navigable
    await page.goto(popupUrl);
    expect(page.url()).toBe(popupUrl);

    await page.goto(optionsUrl);
    expect(page.url()).toBe(optionsUrl);

    console.log("✅ Both extension pages navigable with moz-extension:// URLs");
  });
});

// Add a simple test that can run without the full extension setup
test.describe("Firefox Extension Runner Unit Tests", () => {
  test("should instantiate FirefoxExtensionRunner", () => {
    const runner = new FirefoxExtensionRunner();
    expect(runner).toBeDefined();
    expect(typeof runner.startExtensionTest).toBe("function");
    expect(typeof runner.cleanup).toBe("function");
    expect(typeof runner.navigateToExtensionPage).toBe("function");
    expect(typeof runner.getExtensionUrl).toBe("function");
  });

  test("should construct extension URLs when extension ID is set", () => {
    const runner = new FirefoxExtensionRunner();
    runner.extensionId = "test-extension-id";

    const popupUrl = runner.getExtensionUrl("popup/popup.html");
    expect(popupUrl).toBe("moz-extension://test-extension-id/popup/popup.html");

    const optionsUrl = runner.getExtensionUrl("options/options.html");
    expect(optionsUrl).toBe(
      "moz-extension://test-extension-id/options/options.html",
    );
  });

  test("should throw error when trying to get URLs without extension ID", () => {
    const runner = new FirefoxExtensionRunner();

    expect(() => {
      runner.getExtensionUrl("popup/popup.html");
    }).toThrow("Extension ID not available");
  });
});
