/**
 * Playwright configuration for browser extension testing
 * Simplified to avoid conflicts with individual test browser launches
 */

module.exports = {
  testDir: "./test/e2e",

  // Test timeout - increased for extension loading
  timeout: 60000,

  // Expect timeout for element operations
  expect: {
    timeout: 10000,
  },

  // Test configuration
  use: {
    // Browser context options
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",

    // Allow extension testing
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Configure projects for different browsers
  // NOTE: Browser launching is handled in individual test files for extension testing
  projects: [
    {
      name: "chromium",
      use: {
        ...require("@playwright/test").devices["Desktop Chrome"],
        // Remove conflicting launch options - these are handled in test files
      },
    },
    {
      name: "firefox",
      use: {
        ...require("@playwright/test").devices["Desktop Firefox"],
        // Firefox configuration will be handled in test files for extension loading
      },
    },
  ],

  // Reporter configuration
  reporter: [
    ["html", { outputFolder: "test-results", open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["list"], // Console output
  ],

  // Output directory
  outputDir: "test-results",

  // Retry configuration
  retries: process.env.CI ? 2 : 0,

  // Parallel workers - keep low for extension testing
  workers: process.env.CI ? 1 : 1,

  // Fail fast in CI
  maxFailures: process.env.CI ? 5 : undefined,

  // Global test setup (if needed)
  globalSetup: process.env.CI ? undefined : undefined,
  globalTeardown: process.env.CI ? undefined : undefined,

  // Forbid only on CI
  forbidOnly: !!process.env.CI,

  // Fully parallel execution
  fullyParallel: false, // Set to false for extension testing to avoid conflicts
};
