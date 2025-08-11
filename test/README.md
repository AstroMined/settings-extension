# Settings Extension - Test Suite

This directory contains comprehensive tests for the Settings Extension, including unit tests, integration tests, and performance tests.

## Test Structure

```
test/
├── README.md                    # This file
├── setup.js                     # Jest test setup and mocks
├── utils/
│   └── test-helpers.js         # Common test utilities
├── settings-manager.test.js     # Core SettingsManager tests
├── content-script-settings.test.js # Content script API tests
├── cross-browser.test.js        # Cross-browser compatibility tests
├── performance.test.js          # Performance and benchmarking tests
└── integration/
    └── message-passing.test.js  # Integration tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Types
```bash
# Unit tests only
npm test -- --selectProjects=unit

# Integration tests only
npm test -- --selectProjects=integration

# Performance tests only
npm test -- --selectProjects=performance
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Browser-Specific Tests
```bash
# Test in Chrome
npm run test:chrome

# Test in Firefox
npm run test:firefox

# Test in both browsers
npm run test:all
```

## Test Categories

### Unit Tests
- **SettingsManager**: Core CRUD operations, validation, storage integration
- **ContentScriptSettings**: Content script API functionality
- **Cross-browser**: Browser compatibility and API abstraction
- **Performance**: Load times, memory usage, response times

### Integration Tests
- **Message Passing**: Communication between components
- **End-to-End**: Complete user workflows
- **Storage Integration**: Real storage operations

### Performance Tests
- **Load Performance**: <100ms settings load requirement
- **Save Performance**: <100ms settings save requirement
- **UI Performance**: <500ms UI load requirement
- **Memory Usage**: <10MB per tab requirement
- **Content Script Access**: <50ms access requirement

## Test Requirements

### Coverage Targets
- **Global**: 80% minimum coverage
- **Core Components**: 90% minimum coverage
- **Integration Components**: 85% minimum coverage

### Performance Targets
- Settings load/save: <100ms
- UI initialization: <500ms
- Content script access: <50ms
- Memory usage: <10MB per tab

### Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Edge (Chromium-based)

## Test Utilities

### Mock Helpers
- `createMockStorage()`: Creates mock browser storage
- `createMockRuntime()`: Creates mock runtime messaging
- `generateTestSettings()`: Generates test settings data

### Validation Helpers
- `createValidationTestSuite()`: Creates validation test suite
- `testPerformance()`: Performance testing helper

### Test Data
- Boolean, text, longtext, number, and JSON test settings
- Large datasets for stress testing
- Edge cases and invalid data

## Writing Tests

### Test Structure
```javascript
describe('Component Name', () => {
  let mockStorage;
  let component;
  
  beforeEach(() => {
    mockStorage = createMockStorage();
    // Initialize component
  });
  
  describe('Feature Group', () => {
    test('should do something specific', async () => {
      // Test implementation
      expect(result).toBe(expected);
    });
  });
});
```

### Test Naming
- Use descriptive test names
- Follow pattern: "should [action] [expected result]"
- Group related tests in describe blocks

### Assertions
- Use specific matchers (toBe, toEqual, toHaveBeenCalled)
- Test both positive and negative cases
- Include edge cases and error scenarios

### Async Testing
- Use async/await for promises
- Mock asynchronous operations
- Test timeout scenarios

## Mocking Strategy

### Browser APIs
- Mock `browser.storage.local` and `browser.storage.sync`
- Mock `browser.runtime` messaging
- Mock DOM environment with jsdom

### Real Objects
- Use real objects instead of mocks where possible
- Mock only external dependencies
- Test actual implementation behavior

### Test Isolation
- Each test should be independent
- Clean up after each test
- Reset mocks between tests

## Performance Testing

### Benchmarking
- Measure actual execution time
- Compare against performance targets
- Track performance over time

### Stress Testing
- Test with large datasets
- Test concurrent operations
- Test memory usage patterns

### Cross-Browser Performance
- Test performance in different browsers
- Ensure consistent performance across platforms

## Troubleshooting

### Common Issues
- **Storage mock not working**: Check mock setup in beforeEach
- **Async tests timing out**: Increase timeout or check promises
- **Coverage not accurate**: Ensure files are in collectCoverageFrom

### Debug Tips
- Use `console.log` for debugging (remove before commit)
- Run specific tests with `npm test -- --testNamePattern="test name"`
- Check test output for detailed error messages

## Contributing

### Test Guidelines
- Write tests for new features
- Update tests when changing existing code
- Follow existing test patterns
- Ensure tests are deterministic

### Code Review
- Include test coverage in PR reviews
- Verify test quality and completeness
- Check for edge cases and error handling

## Integration with CI/CD

### Automated Testing
- Tests run on every PR
- Coverage reports generated
- Performance benchmarks tracked

### Quality Gates
- Minimum 80% coverage required
- All performance tests must pass
- Cross-browser compatibility verified

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [jsdom Documentation](https://github.com/jsdom/jsdom)
- [WebExtension Testing](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Testing)
- [Chrome Extension Testing](https://developer.chrome.com/docs/extensions/mv3/devguide/testing/)