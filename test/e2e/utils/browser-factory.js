/**
 * Dynamic Browser Factory for Cross-Browser E2E Testing
 * Provides project-aware browser selection for Playwright tests
 */

const { chromium, firefox } = require("@playwright/test");
const path = require("path");

/**
 * Browser factory that respects Playwright project configuration
 */
class BrowserFactory {
  /**
   * Get browser instance based on current test project
   * @param {Object} testInfo - Playwright test info object containing project name
   * @returns {Object} Browser type (chromium or firefox)
   */
  static getBrowserType(testInfo) {
    const projectName =
      testInfo?.project?.name || process.env.BROWSER || "chromium";

    switch (projectName.toLowerCase()) {
      case "firefox":
        return firefox;
      case "chromium":
      case "chrome":
      default:
        return chromium;
    }
  }

  /**
   * Create extension context with proper browser selection
   * @param {Object} testInfo - Playwright test info object
   * @param {Object} options - Additional launch options
   * @returns {Promise<Object>} Browser context with extension loaded
   */
  static async createExtensionContext(testInfo, options = {}) {
    const browserType = this.getBrowserType(testInfo);
    const extensionPath = path.resolve(__dirname, "../../../dist");
    const userDataDir = path.resolve(
      __dirname,
      `../../../test-user-data-${testInfo?.project?.name || "default"}`,
    );

    // Check if extension build exists
    const fs = require("fs");
    if (!fs.existsSync(extensionPath)) {
      throw new Error(
        `Extension build not found at ${extensionPath}. Run 'npm run build' first.`,
      );
    }

    console.log(`Loading extension from: ${extensionPath}`);
    console.log(`Using ${testInfo?.project?.name || "chromium"} browser`);
    console.log(`Using user data dir: ${userDataDir}`);

    // Browser-specific configuration
    const baseConfig = {
      headless: false,
      ignoreHTTPSErrors: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--allow-running-insecure-content",
      ],
      ...options,
    };

    // Firefox-specific adjustments
    if (browserType === firefox) {
      // Firefox uses different extension loading mechanism
      // For now, we'll use Chromium-style args but this could be enhanced
      baseConfig.args = baseConfig.args.filter(
        (arg) =>
          !arg.includes("--disable-extensions-except") &&
          !arg.includes("--load-extension"),
      );

      // Add Firefox-specific extension loading if needed
      console.log(
        "Note: Firefox extension loading may require additional configuration",
      );
    }

    try {
      const context = await browserType.launchPersistentContext(
        userDataDir,
        baseConfig,
      );

      // Wait for extension to load
      await new Promise((resolve) => setTimeout(resolve, 3000));

      return context;
    } catch (error) {
      console.error(
        `Failed to launch ${testInfo?.project?.name || "browser"} context:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Get extension service worker from context
   * @param {Object} context - Browser context
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} Service worker instance
   */
  static async getExtensionServiceWorker(context, timeout = 10000) {
    let serviceWorker = context.serviceWorkers()[0];

    if (!serviceWorker) {
      console.log(
        "Service worker not immediately available, waiting for event...",
      );
      serviceWorker = await context.waitForEvent("serviceworker", { timeout });
    }

    if (serviceWorker) {
      console.log(`Extension service worker URL: ${serviceWorker.url()}`);
      return serviceWorker;
    }

    throw new Error("Could not find extension service worker");
  }

  /**
   * Extract extension ID from service worker URL
   * @param {Object} serviceWorker - Service worker instance
   * @returns {string} Extension ID
   */
  static getExtensionId(serviceWorker) {
    const url = serviceWorker.url();
    const match = url.match(/chrome-extension:\/\/([a-z0-9]+)\//);

    if (match) {
      return match[1];
    }

    throw new Error(`Could not extract extension ID from URL: ${url}`);
  }

  /**
   * Complete extension setup - creates context, gets service worker, and extracts ID
   * @param {Object} testInfo - Playwright test info object
   * @param {Object} options - Additional launch options
   * @returns {Promise<Object>} { context, serviceWorker, extensionId }
   */
  static async setupExtension(testInfo, options = {}) {
    const context = await this.createExtensionContext(testInfo, options);
    const serviceWorker = await this.getExtensionServiceWorker(context);
    const extensionId = this.getExtensionId(serviceWorker);

    console.log(`Extension setup complete - ID: ${extensionId}`);

    return { context, serviceWorker, extensionId };
  }
}

module.exports = BrowserFactory;
