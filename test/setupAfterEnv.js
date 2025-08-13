/**
 * Jest setupFilesAfterEnv configuration
 * Runs after the test framework is set up
 */

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});