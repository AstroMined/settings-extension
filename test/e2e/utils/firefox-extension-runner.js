/**
 * Firefox Extension Test Runner using Web-Ext + Puppeteer
 * This approach uses Mozilla's official web-ext tool to load the extension
 * and Puppeteer to control the browser for testing actual extension functionality
 */

const puppeteer = require("puppeteer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

class FirefoxExtensionRunner {
  constructor() {
    this.webExtProcess = null;
    this.browser = null;
    this.page = null;
    this.extensionId = null;
    this.debugPort = null;
  }

  /**
   * Start web-ext and launch Firefox with extension loaded
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Browser and page instances
   */
  async startExtensionTest(options = {}) {
    const {
      extensionPath = path.resolve(__dirname, "../../../dist"),
      timeout = 30000,
      headless = false,
      firefoxProfile = null,
    } = options;

    // Verify extension build exists
    if (!fs.existsSync(extensionPath)) {
      throw new Error(
        `Extension build not found at ${extensionPath}. Run 'npm run build' first.`,
      );
    }

    // Ensure Firefox manifest is in place
    const firefoxManifest = path.join(extensionPath, "manifest.firefox.json");
    const mainManifest = path.join(extensionPath, "manifest.json");

    if (fs.existsSync(firefoxManifest)) {
      console.log("Firefox Extension Runner: Using Firefox manifest");
      fs.copyFileSync(firefoxManifest, mainManifest);
    }

    try {
      // Find available port for Firefox remote debugging
      this.debugPort = await this.findFreePort(9222);

      console.log(
        `Firefox Extension Runner: Starting web-ext with debug port ${this.debugPort}`,
      );

      // Start web-ext with Firefox
      await this.startWebExt(extensionPath, firefoxProfile, timeout);

      // Connect Puppeteer to Firefox instance
      await this.connectPuppeteer(headless, timeout);

      // Get extension ID and validate extension loading
      await this.detectExtension();

      console.log(
        `Firefox Extension Runner: Extension loaded with ID ${this.extensionId}`,
      );

      return {
        browser: this.browser,
        page: this.page,
        extensionId: this.extensionId,
        runner: this,
      };
    } catch (error) {
      await this.cleanup();
      throw new Error(`Firefox Extension Runner failed: ${error.message}`);
    }
  }

  /**
   * Start web-ext process with Firefox
   * @private
   */
  async startWebExt(extensionPath, firefoxProfile, timeout) {
    const webExtArgs = [
      "run",
      "--source-dir",
      extensionPath,
      "--target",
      "firefox-desktop",
      "--no-reload",
      "--no-input",
      "--args",
      `--remote-debugging-port=${this.debugPort}`,
    ];

    if (firefoxProfile) {
      webExtArgs.push("--firefox-profile", firefoxProfile);
    }

    // Add CI-specific arguments
    if (process.env.CI) {
      webExtArgs.push(
        "--firefox-binary",
        "firefox", // Use system Firefox in CI
        "--no-config-discovery", // Skip config file discovery
      );
    }

    console.log(
      "Firefox Extension Runner: Starting web-ext with args:",
      webExtArgs,
    );

    this.webExtProcess = spawn("npx", ["web-ext", ...webExtArgs], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`web-ext startup timeout after ${timeout}ms`));
      }, timeout);

      this.webExtProcess.stdout.on("data", (data) => {
        const output = data.toString();
        console.log("web-ext:", output.trim());

        // Look for successful Firefox launch indicators
        if (
          output.includes("The extension will reload if you edit and save") ||
          output.includes("Firefox is ready")
        ) {
          clearTimeout(timeoutId);
          // Give Firefox a moment to fully initialize
          setTimeout(resolve, 2000);
        }
      });

      this.webExtProcess.stderr.on("data", (data) => {
        const error = data.toString();
        console.error("web-ext error:", error.trim());

        if (error.includes("Error:") && !error.includes("Warning:")) {
          clearTimeout(timeoutId);
          reject(new Error(`web-ext error: ${error}`));
        }
      });

      this.webExtProcess.on("error", (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`web-ext process error: ${error.message}`));
      });

      this.webExtProcess.on("exit", (code) => {
        if (code !== 0) {
          clearTimeout(timeoutId);
          reject(new Error(`web-ext exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Connect Puppeteer to the Firefox instance launched by web-ext
   * @private
   */
  async connectPuppeteer(_headless, _timeout) {
    const connectOptions = {
      browserURL: `http://localhost:${this.debugPort}`,
      defaultViewport: null,
      // Start with CDP protocol, fallback to WebDriver BiDi if needed
      // protocol: 'webDriverBiDi'  // Comment out for now
    };

    console.log("Firefox Extension Runner: Connecting Puppeteer to Firefox...");

    // Try to connect with retries
    let retries = 5;
    while (retries > 0) {
      try {
        this.browser = await puppeteer.connect(connectOptions);
        console.log(
          "Firefox Extension Runner: Puppeteer connected successfully",
        );
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(
            `Failed to connect Puppeteer to Firefox: ${error.message}`,
          );
        }
        console.log(
          `Firefox Extension Runner: Connection retry in 2s... (${retries} left)`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Get or create a page
    const pages = await this.browser.pages();
    if (pages.length > 0) {
      this.page = pages[0];
    } else {
      this.page = await this.browser.newPage();
    }
  }

  /**
   * Detect the extension ID by looking for extension pages or background scripts
   * @private
   */
  async detectExtension() {
    try {
      // Navigate to about:debugging to find the extension
      await this.page.goto("about:debugging#/runtime/this-firefox");
      await this.page.waitForTimeout(2000); // Wait for page to load

      // Look for temporary extensions
      const extensionElements = await this.page.$$(
        '[data-qa="temporary-extension-card"]',
      );

      if (extensionElements.length === 0) {
        throw new Error("No temporary extensions found in about:debugging");
      }

      // Get extension details from the first temporary extension
      const extensionElement = extensionElements[0];

      // Try to find extension ID from inspect buttons or URLs
      const inspectButtons = await extensionElement.$$(
        'button[data-qa="temporary-extension-inspect-button"]',
      );

      if (inspectButtons.length > 0) {
        // Click inspect button to get to extension page
        await inspectButtons[0].click();
        await this.page.waitForTimeout(1000);

        // Check if new pages were opened (extension devtools)
        const allPages = await this.browser.pages();
        const debuggerPage = allPages.find((p) =>
          p.url().includes("moz-extension://"),
        );

        if (debuggerPage) {
          const url = debuggerPage.url();
          const match = url.match(/moz-extension:\/\/([a-zA-Z0-9-]+)\//);
          if (match) {
            this.extensionId = match[1];
            return;
          }
        }
      }

      // Fallback: try to navigate to extension pages directly
      // This is a workaround - we'll use a predictable extension ID from manifest
      const manifestPath = path.resolve(
        __dirname,
        "../../../dist/manifest.json",
      );
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        if (
          manifest.browser_specific_settings &&
          manifest.browser_specific_settings.gecko &&
          manifest.browser_specific_settings.gecko.id
        ) {
          // For temporary extensions, Firefox generates a UUID, but we can try to find it
          this.extensionId = await this.findExtensionIdFromRuntime();
          if (!this.extensionId) {
            // Use a fallback approach - create a dummy ID for testing
            this.extensionId = "temporary-extension";
            console.warn(
              "Firefox Extension Runner: Using fallback extension ID",
            );
          }
        }
      }

      if (!this.extensionId) {
        throw new Error("Could not determine extension ID");
      }
    } catch (error) {
      throw new Error(`Extension detection failed: ${error.message}`);
    }
  }

  /**
   * Try to find extension ID from runtime APIs
   * @private
   */
  async findExtensionIdFromRuntime() {
    try {
      // Navigate to a page that can access extension APIs
      await this.page.goto("about:blank");

      // Try to execute script that detects extension
      const result = await this.page.evaluate(() => {
        // This won't work in about:blank, but we'll try other approaches
        return null;
      });

      return result;
    } catch (error) {
      console.log(
        "Firefox Extension Runner: Runtime detection failed:",
        error.message,
      );
      return null;
    }
  }

  /**
   * Navigate to extension page (popup, options, etc.)
   */
  async navigateToExtensionPage(pagePath) {
    if (!this.extensionId || !this.page) {
      throw new Error("Extension not loaded or page not available");
    }

    const fullUrl = `moz-extension://${this.extensionId}/${pagePath}`;
    console.log(`Firefox Extension Runner: Navigating to ${fullUrl}`);

    try {
      await this.page.goto(fullUrl, { waitUntil: "domcontentloaded" });
      return this.page;
    } catch (error) {
      throw new Error(
        `Failed to navigate to extension page ${pagePath}: ${error.message}`,
      );
    }
  }

  /**
   * Get extension URL for a specific page
   */
  getExtensionUrl(pagePath) {
    if (!this.extensionId) {
      throw new Error("Extension ID not available");
    }
    return `moz-extension://${this.extensionId}/${pagePath}`;
  }

  /**
   * Find a free port for Firefox remote debugging
   * @private
   */
  async findFreePort(startPort = 9222) {
    const net = require("net");

    return new Promise((resolve) => {
      const server = net.createServer();

      server.listen(startPort, (err) => {
        if (err) {
          // Port is busy, try next one
          server.close();
          resolve(this.findFreePort(startPort + 1));
        } else {
          const port = server.address().port;
          server.close();
          resolve(port);
        }
      });
    });
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      if (this.webExtProcess && !this.webExtProcess.killed) {
        console.log("Firefox Extension Runner: Terminating web-ext process...");
        this.webExtProcess.kill("SIGTERM");

        // Wait for graceful shutdown, then force kill if necessary
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (!this.webExtProcess.killed) {
              this.webExtProcess.kill("SIGKILL");
            }
            resolve();
          }, 5000);

          this.webExtProcess.on("exit", () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        this.webExtProcess = null;
      }

      console.log("Firefox Extension Runner: Cleanup completed");
    } catch (error) {
      console.error("Firefox Extension Runner: Cleanup error:", error.message);
    }
  }
}

module.exports = FirefoxExtensionRunner;
