# ADR-004: Custom Browser Compatibility Layer

## Status
**Accepted** - 2025-08-11

## Context

The Settings Extension needs to work across both Chromium-based browsers (Chrome, Edge) and Firefox, which have different extension API implementations. Chrome uses callback-based APIs under the `chrome` namespace, while Firefox provides promise-based APIs under the `browser` namespace. We need to choose an approach for handling these differences.

### Key Considerations

**Technical Factors:**
- Chrome extension APIs use callback patterns requiring error handling through `chrome.runtime.lastError`
- Firefox WebExtensions provide promise-based APIs that are more modern and easier to use
- Different browsers have varying levels of API support and feature completeness
- Performance implications of abstraction layers and API translation
- Code maintainability and debugging complexity

**Business Factors:**
- Need to support both Chrome and Firefox for market reach
- Development team prefers modern JavaScript patterns (promises/async-await)
- Maintenance burden of supporting multiple browser API patterns
- Time constraints for initial implementation

**Team Factors:**
- Team expertise with modern JavaScript and promise-based patterns
- Preference for unminified, debuggable code over external dependencies
- Desire to understand and control browser compatibility implementation
- Concern about external library maintenance and update cycles

**User/Stakeholder Factors:**
- Users expect consistent behavior across different browsers
- Performance should be consistent regardless of browser choice
- Error messages and debugging information should be clear and actionable

### Current Situation

Before this decision, we evaluated three main approaches:

1. **WebExtension Polyfill Library**: Popular third-party library that provides unified API
2. **Native APIs with Conditional Logic**: Direct use of browser APIs with if/else patterns
3. **Custom Compatibility Layer**: Purpose-built abstraction for our specific needs

### WebExtension Polyfill Analysis

The WebExtension Polyfill is the most common solution, but we identified several concerns:

```javascript
// Example of WebExtension Polyfill usage
import browser from 'webextension-polyfill';

// Works consistently across browsers
const result = await browser.storage.local.get(['key']);
```

**Benefits:**
- Established solution used by many extensions
- Comprehensive browser API coverage
- Active maintenance and community support
- Handles edge cases and browser quirks

**Concerns:**
- Minified code makes debugging extremely difficult
- Large bundle size (~50KB) for our limited API usage
- External dependency introduces supply chain risks
- Generic solution may include unnecessary complexity for our use case
- Performance overhead from comprehensive abstraction

## Decision

**We will implement a custom browser compatibility layer specifically tailored to the Settings Extension's needs.**

### Rationale

1. **Debugging and Maintainability**: Unminified, purpose-built code is much easier to debug and understand
2. **Minimal Bundle Size**: Only implement the APIs we actually use, reducing bundle size by ~80%
3. **Performance Optimization**: Direct implementation optimized for our specific usage patterns
4. **Supply Chain Security**: Eliminate external dependency and potential security vulnerabilities
5. **Learning and Control**: Team gains deep understanding of browser API differences
6. **Specific Requirements**: Tailored to our exact needs rather than generic solution

### Implementation Approach

Create `/lib/browser-compat.js` with these core components:

- Browser detection and feature availability checking
- Promise wrapper for Chrome callback APIs
- Unified API interface matching our usage patterns
- Error handling and fallback strategies
- Storage quota management and monitoring

## Consequences

### Positive Consequences

✅ **Enhanced Debugging Experience**
- Unminified code allows step-through debugging
- Clear error messages and stack traces
- Easy identification of browser-specific issues
- Simplified troubleshooting for development team

✅ **Optimized Performance**
- Minimal abstraction overhead (< 10ms per API call)
- Bundle size reduced from ~50KB to ~8KB for compatibility code
- Direct API access without unnecessary abstraction layers
- Optimized for our specific usage patterns

✅ **Improved Security Posture**
- No external dependencies to monitor for vulnerabilities
- Complete control over compatibility layer behavior
- Reduced attack surface from third-party code
- Supply chain security benefits

✅ **Team Understanding and Control**
- Complete understanding of browser compatibility implementation
- Ability to optimize for specific use cases
- Clear ownership and maintenance responsibility
- Learning opportunity for team members

✅ **Tailored Functionality**
- Implements only needed browser API surface area
- Custom error handling strategies for our use cases
- Optimized storage patterns for settings management
- Feature detection specific to our requirements

### Negative Consequences

❌ **Increased Initial Development Time**
- Requires research and implementation of browser API differences
- Need to handle edge cases and browser quirks manually
- Testing complexity across different browser versions
- Documentation and knowledge sharing requirements

❌ **Ongoing Maintenance Burden**
- Must track browser API changes and updates manually
- Responsibility for fixing browser compatibility issues
- Need to update compatibility layer when browsers evolve
- Risk of missing edge cases that polyfill would handle

❌ **Limited API Coverage**
- Only implements APIs we currently need
- Adding new browser APIs requires compatibility layer updates
- May miss some browser-specific optimizations
- Less comprehensive than established polyfill solutions

❌ **Potential for Browser-Specific Bugs**
- Custom implementation may have browser-specific issues
- Less battle-tested than widely-used polyfill
- Risk of incorrect API abstraction or edge case handling
- Requires extensive cross-browser testing

### Mitigation Strategies

**For Development Time:**
- Start with minimal API surface area needed for MVP
- Iterate and expand compatibility layer as needed
- Comprehensive unit tests for all browser API interactions
- Clear documentation of browser differences and handling

**For Maintenance Burden:**
- Establish browser compatibility testing in CI/CD pipeline
- Monitor browser release notes for API changes
- Create clear process for updating compatibility layer
- Document browser-specific workarounds and rationale

**For Limited Coverage:**
- Design compatibility layer with extensibility in mind
- Use feature detection to gracefully handle missing APIs
- Plan compatibility layer expansion roadmap
- Monitor WebExtension Polyfill for new patterns if needed

## Implementation Details

### Browser Detection and Feature Testing

```javascript
// lib/browser-compat.js - Browser environment detection
const isChrome = typeof chrome !== 'undefined' && chrome.runtime;
const isFirefox = typeof browser !== 'undefined' && browser.runtime;
const isEdge = isChrome && navigator.userAgent.includes('Edg');

// Feature detection for cross-browser compatibility
const hasStorageLocal = (isChrome && chrome.storage?.local) || (isFirefox && browser.storage?.local);
const hasStorageSync = (isChrome && chrome.storage?.sync) || (isFirefox && browser.storage?.sync);
```

### Promise Wrapper for Chrome APIs

```javascript
// Promise wrapper for Chrome callback APIs
function promisify(fn, context) {
  if (!fn || typeof fn !== 'function') {
    return () => Promise.resolve();
  }
  
  return function(...args) {
    return new Promise((resolve, reject) => {
      try {
        fn.call(context, ...args, (result) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  };
}
```

### Unified API Interface

```javascript
// Unified browser API object
const browserAPI = {
  storage: {
    local: hasStorageLocal ? {
      get: isChrome ? promisify(chrome.storage.local.get, chrome.storage.local) 
                    : browser.storage.local.get.bind(browser.storage.local),
      set: isChrome ? promisify(chrome.storage.local.set, chrome.storage.local) 
                    : browser.storage.local.set.bind(browser.storage.local),
      remove: isChrome ? promisify(chrome.storage.local.remove, chrome.storage.local) 
                       : browser.storage.local.remove.bind(browser.storage.local),
    } : null,
  },
  
  runtime: {
    sendMessage: isChrome ? promisify(chrome.runtime.sendMessage, chrome.runtime)
                          : browser.runtime.sendMessage.bind(browser.runtime),
    onMessage: (isChrome ? chrome.runtime.onMessage : browser.runtime.onMessage),
  }
};
```

### Error Handling and Storage Utilities

```javascript
// Utility functions for common operations
const utils = {
  // Safe message sending with error handling
  async safeSendMessage(message) {
    try {
      return await browserAPI.runtime.sendMessage(message);
    } catch (error) {
      console.warn('Message sending failed:', error.message);
      return null;
    }
  },
  
  // Storage quota checking
  async checkStorageQuota() {
    if (isChrome && chrome.storage.local.getBytesInUse) {
      const bytesInUse = await promisify(chrome.storage.local.getBytesInUse, chrome.storage.local)();
      return { used: bytesInUse, available: chrome.storage.local.QUOTA_BYTES - bytesInUse };
    }
    return { used: 0, available: Infinity }; // Firefox doesn't expose quota details
  }
};
```

## Alternatives Considered

### Alternative 1: WebExtension Polyfill
**Rejected** because:
- Minified code severely hampers debugging experience
- Large bundle size (50KB) for limited API usage
- External dependency introduces supply chain risks
- Generic implementation includes unnecessary complexity
- Performance overhead from comprehensive abstraction

### Alternative 2: Native APIs with Conditional Logic
**Rejected** because:
- Leads to scattered browser-specific code throughout the application
- Makes testing and maintenance more difficult
- Violates DRY principle with repeated compatibility checks
- Error handling patterns become inconsistent
- Difficult to change browser compatibility strategy later

### Alternative 3: Multiple Build Targets
**Considered** but rejected because:
- Significantly increases build complexity and CI/CD pipeline requirements
- Creates maintenance burden of multiple codebases
- Makes debugging more complex with browser-specific builds
- Complicates deployment and release management
- Team lacks infrastructure expertise for complex build systems

## Success Metrics

The success of this decision will be measured by:

1. **Development Velocity**: Time to implement browser-specific features compared to baseline
2. **Bundle Size**: Compatibility layer size < 10KB vs 50KB for WebExtension Polyfill
3. **Debug Efficiency**: Time to identify and fix browser-specific issues
4. **Performance Impact**: API abstraction overhead < 10ms per call
5. **Compatibility Coverage**: Successful operation across Chrome 88+, Firefox 78+, Edge 88+
6. **Maintenance Overhead**: Time spent on browser compatibility updates per quarter

## Review Schedule

This decision will be reviewed:
- **6 months**: Assessment of maintenance burden and development efficiency
- **12 months**: Evaluation of long-term viability and team satisfaction
- **When new browsers are targeted**: Assess if custom layer scales appropriately
- **On major browser API changes**: Evaluate if external polyfill becomes more attractive

## Related Decisions

- [ADR-001: Manifest V3 Adoption](001-manifest-v3.md) - Provides browser API context for this compatibility layer
- [ADR-002: Vanilla JavaScript Approach](002-vanilla-javascript.md) - Supports decision to avoid external dependencies
- [ADR-003: Storage Strategy](003-storage-strategy.md) - Implements storage operations through this compatibility layer

## References

- [WebExtension Polyfill](https://github.com/mozilla/webextension-polyfill) - Alternative library analysis
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/) - Chrome API documentation
- [Firefox WebExtensions](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions) - Firefox API documentation
- [Browser Extension Security](https://developer.chrome.com/docs/extensions/mv3/security/) - Security considerations for extensions
- [Extension Performance Best Practices](https://developer.chrome.com/docs/extensions/mv3/performance/) - Performance optimization guidelines

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-08-11 | Architecture Team | Initial ADR for custom browser compatibility layer |