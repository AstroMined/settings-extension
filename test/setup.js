/**
 * Simplified Jest test setup for pure unit testing
 * Browser-based testing handled by Playwright E2E tests
 */

// Simple mocks for pure unit tests only
// No complex browser API mocks - those cause timing issues

// Mock performance.now if not available
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 10000000,
    },
  };
}

// Mock console methods to reduce test noise
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch for pure logic tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }),
);
