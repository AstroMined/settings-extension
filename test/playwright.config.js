/**
 * Playwright configuration for browser extension testing
 */

module.exports = {
  testDir: './test/e2e',
  
  // Test timeout
  timeout: 30000,
  
  // Global setup and teardown
  globalSetup: require.resolve('./test/e2e/global-setup.js'),
  globalTeardown: require.resolve('./test/e2e/global-teardown.js'),
  
  // Test configuration
  use: {
    // Base URL for extension
    baseURL: 'chrome-extension://',
    
    // Browser context options
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  
  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          args: [
            '--disable-extensions-except=./dist',
            '--load-extension=./dist',
            '--no-sandbox',
            '--disable-dev-shm-usage'
          ]
        }
      },
    },
    {
      name: 'firefox',
      use: {
        ...require('@playwright/test').devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'extensions.webapi.testing': true,
            'extensions.webextensions.uuids': JSON.stringify({
              'settings-extension@example.com': 'test-uuid-12345'
            })
          }
        }
      },
    },
  ],
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  // Output directory
  outputDir: 'test-results',
  
  // Retry configuration
  retries: process.env.CI ? 2 : 0,
  
  // Parallel workers
  workers: process.env.CI ? 1 : undefined,
  
  // Fail fast
  maxFailures: process.env.CI ? 10 : undefined,
  
  // Web server (if needed)
  // webServer: {
  //   command: 'npm run serve',
  //   port: 8080,
  //   reuseExistingServer: !process.env.CI,
  // },
};