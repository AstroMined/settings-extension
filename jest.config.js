/**
 * Jest configuration for Settings Extension
 * Supports unit, integration, and performance testing
 */

module.exports = {
  // Test environment
  testEnvironment: "jsdom",

  // Setup files - run before test framework setup
  setupFiles: ["<rootDir>/test/setup.js"],
  setupFilesAfterEnv: ["<rootDir>/test/setupAfterEnv.js"],

  // Test file patterns - only include unit tests
  testMatch: [
    "<rootDir>/test/validation.test.js",
    "<rootDir>/test/settings-manager.test.js",
    "<rootDir>/test/storage.test.js",
  ],

  // Module paths
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@test/(.*)$": "<rootDir>/test/$1",
  },

  // Coverage configuration
  collectCoverageFrom: [
    "lib/**/*.{js,jsx,ts,tsx}",
    "background.js",
    "content-script.js",
    "popup/*.js",
    "options/*.js",
    "!**/*.d.ts",
    "!test/**",
    "!**/*.config.js",
    "!**/index.js",
    "!node_modules/**",
    "!coverage/**",
    "!dist/**",
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Stricter requirements for core components
    "./lib/settings-manager.js": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "./lib/content-settings.js": {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Coverage reporters
  coverageReporters: ["text", "text-summary", "html", "lcov"],

  // Coverage directory
  coverageDirectory: "coverage",

  // Test timeout
  testTimeout: 10000,

  // Transform configuration
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },

  // Mock configuration
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json"],

  // Test environment options
  testEnvironmentOptions: {
    url: "https://localhost:3000/",
    storageQuota: 10000000,
  },

  // Verbose output
  verbose: true,

  // Bail on first failure (useful for CI)
  bail: false,

  // Clear mocks between tests
  clearMocks: true,

  // Reset modules between tests
  resetModules: true,

  // Test patterns to ignore
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/coverage/",
    "/web-ext-artifacts/",
  ],

  // Simplified Jest configuration - only pure unit tests
  // All browser-based testing moved to Playwright E2E tests
};
