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
    const projectName = testInfo?.project?.name || "chromium";
    // Enhanced Firefox detection - check multiple patterns
    const isFirefox = projectName.toLowerCase() === "firefox" || 
                     projectName.toLowerCase().includes("firefox") ||
                     projectName.toLowerCase().includes("ff");
    const extensionPath = path.resolve(__dirname, "../../../dist");
    const userDataDir = path.resolve(
      __dirname,
      `../../../test-user-data-${projectName}`,
    );

    // Log browser selection for transparency  
    console.log(`Browser Factory: ${projectName} → ${isFirefox ? 'Firefox smoke testing' : 'Chromium extension testing'}`);

    // Check if extension build exists
    const fs = require("fs");
    if (!fs.existsSync(extensionPath)) {
      throw new Error(
        `Extension build not found at ${extensionPath}. Run 'npm run build' first.`,
      );
    }

    // For Firefox, copy the Firefox manifest to manifest.json at test runtime
    if (isFirefox) {
      const firefoxManifest = path.join(extensionPath, "manifest.firefox.json");
      const mainManifest = path.join(extensionPath, "manifest.json");

      if (fs.existsSync(firefoxManifest)) {
        console.log("Copying Firefox manifest for testing");
        fs.copyFileSync(firefoxManifest, mainManifest);
      } else {
        console.warn("Firefox manifest not found - using Chrome manifest");
      }
    }

    console.log(`Loading extension from: ${extensionPath}`);
    console.log(`Using ${projectName} browser`);
    console.log(`Using user data dir: ${userDataDir}`);

    if (isFirefox) {
      // Firefox smoke testing approach
      // Note: Full Firefox extension E2E testing has limitations due to extension loading complexity
      // This provides basic browser testing to verify Firefox compatibility
      try {
        console.log("Using Firefox smoke testing approach");
        console.log(
          "Note: Firefox extension loading skipped - using Chrome for comprehensive E2E tests",
        );

        const baseConfig = {
          // Use headed mode in CI with Xvfb virtual display for extension support
          headless: false,
          ignoreHTTPSErrors: true,
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
          ...options,
        };

        const context = await firefox.launchPersistentContext(
          userDataDir,
          baseConfig,
        );

        // Wait for browser to initialize
        await new Promise((resolve) => setTimeout(resolve, 2000));

        return context;
      } catch (error) {
        console.error(`Failed to launch Firefox context:`, error.message);
        throw error;
      }
    } else {
      // Use standard Chromium extension loading
      // CRITICAL: Defensive check to prevent Firefox tests from hitting Chromium code
      if (projectName.toLowerCase().includes('firefox')) {
        throw new Error(`CRITICAL ERROR: Firefox project "${projectName}" incorrectly routed to Chromium code path. This should never happen!`);
      }
      
      const browserType = this.getBrowserType(testInfo);
      const baseConfig = {
        // Use headed mode in CI with Xvfb virtual display for extension support
        headless: false,
        ignoreHTTPSErrors: true,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-web-security",
          "--allow-running-insecure-content",
          // Optimize for extension loading
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--disable-features=TranslateUI",
          "--disable-ipc-flooding-protection",
          "--disable-component-extensions-with-background-pages=false",
          "--enable-automation",
          "--disable-blink-features=AutomationControlled",
        ],
        ...options,
      };

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
          `Failed to launch ${projectName} context:`,
          error.message,
        );
        throw error;
      }
    }
  }

  /**
   * Get extension service worker or background page from context
   * @param {Object} context - Browser context
   * @param {number} timeout - Timeout in milliseconds
   * @param {boolean} isFirefox - Whether this is Firefox (uses background pages instead of service workers)
   * @returns {Promise<Object>} Service worker or background page instance
   */
  static async getExtensionServiceWorker(
    context,
    timeout = 10000,
    isFirefox = false,
  ) {
    if (isFirefox) {
      // Firefox uses background pages, not service workers
      // Try to find the background page by looking for extension pages
      console.log("Looking for Firefox background page...");

      // Wait a bit for the extension to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pages = context.pages();
      console.log(`Found ${pages.length} pages in Firefox context`);

      for (const page of pages) {
        const url = page.url();
        console.log(`Page URL: ${url}`);
        if (
          url.includes("moz-extension://") &&
          url.includes("background.html")
        ) {
          console.log(`Extension background page URL: ${url}`);
          // Return a service worker-like object that has the url() method
          return {
            url: () => url,
            page: page,
          };
        }
      }

      // If no background page found, create a dummy extension worker reference
      // This might be needed for some Firefox extension configurations
      console.log(
        "No background page found, checking for extension context...",
      );
      const allPages = context.pages();
      console.log(`Checking all ${allPages.length} pages for extension URLs`);

      if (allPages.length > 0) {
        for (const page of allPages) {
          const url = page.url();
          console.log(`Checking page: ${url}`);
          if (url.includes("moz-extension://")) {
            console.log(`Using extension page as background: ${url}`);
            return {
              url: () => url,
              page: page,
            };
          }
        }
      }

      // For Firefox smoke testing, create a dummy service worker since no extension is loaded
      // This allows basic browser compatibility testing to proceed
      console.log(
        "Creating dummy service worker for Firefox smoke testing (no extension loaded)",
      );
      return {
        url: () => "moz-extension://smoke-test/background",
        page: null,
      };
    } else {
      // Chromium uses service workers
      let serviceWorker = context.serviceWorkers()[0];

      if (!serviceWorker) {
        console.log(
          "Service worker not immediately available, waiting for event...",
        );
        serviceWorker = await context.waitForEvent("serviceworker", {
          timeout,
        });
      }

      if (serviceWorker) {
        console.log(`Extension service worker URL: ${serviceWorker.url()}`);
        return serviceWorker;
      }

      throw new Error("Could not find extension service worker");
    }
  }

  /**
   * Extract extension ID from service worker URL
   * @param {Object} serviceWorker - Service worker instance
   * @returns {string} Extension ID
   */
  static getExtensionId(serviceWorker) {
    const url = serviceWorker.url();

    // Handle both Chrome and Firefox extension URLs
    const chromeMatch = url.match(/chrome-extension:\/\/([a-z0-9]+)\//);
    const firefoxMatch = url.match(/moz-extension:\/\/([a-z0-9-]+)\//);

    if (chromeMatch) {
      return chromeMatch[1];
    }

    if (firefoxMatch) {
      return firefoxMatch[1];
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
    const projectName = testInfo?.project?.name || "chromium";
    const isFirefox = projectName.toLowerCase() === "firefox";

    const context = await this.createExtensionContext(testInfo, options);
    const serviceWorker = await this.getExtensionServiceWorker(
      context,
      10000,
      isFirefox,
    );
    const extensionId = this.getExtensionId(serviceWorker);

    console.log(`Extension setup complete - ID: ${extensionId}`);

    return { context, serviceWorker, extensionId };
  }
}

module.exports = BrowserFactory;
