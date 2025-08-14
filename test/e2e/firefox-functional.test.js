/**
 * Firefox Extension Functional Tests
 * Uses the FirefoxFunctionalTester for more practical Firefox extension testing
 * This approach works better in CI/CD environments and doesn't require complex debugging protocols
 */

const { test, expect } = require("@playwright/test");
const FirefoxFunctionalTester = require("./utils/firefox-functional-tester");

test.describe("Firefox Extension Functional Testing", () => {
  let tester;

  test.beforeEach(() => {
    // Only run if testing Firefox or if explicitly requested
    if (
      process.env.BROWSER !== "firefox" &&
      process.env.TEST_FIREFOX !== "true"
    ) {
      test.skip(
        "Skipping Firefox functional tests - set TEST_FIREFOX=true to run",
      );
    }

    tester = new FirefoxFunctionalTester();
  });

  test.afterEach(async () => {
    if (tester) {
      await tester.cleanup();
    }
  });

  test("should launch Firefox with extension successfully", async () => {
    console.log("🚀 Testing Firefox extension launch...");

    const results = await tester.runFunctionalTest({
      testType: "basic",
      timeout: 20000, // 20 second timeout
    });

    // Verify basic functionality
    expect(results.firefoxLaunch).toBe(true);
    expect(results.extensionFilesExist).toBe(true);
    expect(results.manifestValid).toBe(true);
    expect(results.backgroundScriptExists).toBe(true);
    expect(results.popupExists).toBe(true);
    expect(results.optionsExists).toBe(true);

    console.log("✅ Firefox extension launch test passed");
  });

  test("should validate extension UI components", async () => {
    console.log("🎨 Testing Firefox extension UI components...");

    const results = await tester.runFunctionalTest({
      testType: "ui",
      timeout: 20000,
    });

    // Verify UI components
    expect(results.popupHtmlValid).toBe(true);
    expect(results.optionsHtmlValid).toBe(true);
    expect(results.scriptsExist).toBe(true);

    // CSS might not be required for basic functionality
    console.log("UI test results:", results);
    console.log("✅ Firefox extension UI test passed");
  });

  test("should validate extension storage functionality", async () => {
    console.log("💾 Testing Firefox extension storage functionality...");

    const results = await tester.runFunctionalTest({
      testType: "storage",
      timeout: 20000,
    });

    // Verify storage functionality
    expect(results.storageApiUsed).toBe(true);
    expect(results.settingsManagerExists).toBe(true);
    expect(results.defaultSettingsExist).toBe(true);

    console.log("✅ Firefox extension storage test passed");
  });

  test("should generate correct moz-extension URLs", async () => {
    console.log("🔗 Testing Firefox extension URL generation...");

    // Test URL generation without launching Firefox
    const urls = tester.getExtensionUrls();

    expect(urls.popup).toMatch(/^moz-extension:\/\/.*\/popup\/popup\.html$/);
    expect(urls.options).toMatch(
      /^moz-extension:\/\/.*\/options\/options\.html$/,
    );
    expect(urls.background).toMatch(/^moz-extension:\/\/.*\/background\.html$/);

    console.log("Generated Firefox extension URLs:");
    console.log(`  Popup: ${urls.popup}`);
    console.log(`  Options: ${urls.options}`);
    console.log(`  Background: ${urls.background}`);

    console.log("✅ Firefox extension URL generation test passed");
  });

  test("should work in CI environment with proper timeouts", async () => {
    console.log("🏗️ Testing Firefox extension in CI environment...");

    // Simulate CI environment
    const originalCI = process.env.CI;
    process.env.CI = "true";

    try {
      const results = await tester.runFunctionalTest({
        testType: "basic",
        timeout: 15000, // Shorter timeout for CI
      });

      // In CI, we mainly care that it doesn't crash and basic files exist
      expect(results.extensionFilesExist).toBe(true);
      expect(results.manifestValid).toBe(true);

      console.log("✅ Firefox extension CI environment test passed");
    } finally {
      // Restore CI environment
      if (originalCI === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = originalCI;
      }
    }
  });
});

test.describe("Firefox Extension Smoke Tests (Always Run)", () => {
  // These tests run regardless of browser selection for basic validation

  test("should have Firefox-compatible extension files", () => {
    const fs = require("fs");
    const path = require("path");

    const extensionPath = path.resolve(__dirname, "../../dist");
    const firefoxManifest = path.join(extensionPath, "manifest.firefox.json");

    expect(fs.existsSync(extensionPath)).toBe(true);
    expect(fs.existsSync(firefoxManifest)).toBe(true);

    // Validate Firefox manifest
    const manifest = JSON.parse(fs.readFileSync(firefoxManifest, "utf8"));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.browser_specific_settings).toBeDefined();
    expect(manifest.browser_specific_settings.gecko).toBeDefined();

    console.log("✅ Firefox extension files validation passed");
  });

  test("should instantiate Firefox functional tester", () => {
    const tester = new FirefoxFunctionalTester();

    expect(tester).toBeDefined();
    expect(typeof tester.runFunctionalTest).toBe("function");
    expect(typeof tester.getExtensionUrls).toBe("function");
    expect(typeof tester.cleanup).toBe("function");

    console.log("✅ Firefox functional tester instantiation passed");
  });
});
