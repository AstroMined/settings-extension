# ADR-001: Adoption of Manifest V3 Architecture

## Status
**Accepted** - 2025-08-11

## Context

Browser extension platforms are transitioning from Manifest V2 to Manifest V3, with Chrome deprecating Manifest V2 support and Firefox implementing WebExtensions compatibility. The Settings Extension needs to choose between:

1. **Manifest V2**: Legacy format with broader compatibility but being deprecated
2. **Manifest V3**: New format with enhanced security and performance but limited legacy support
3. **Dual Support**: Maintain both versions with increased complexity

### Key Considerations

**Technical Factors:**
- Chrome Web Store will stop accepting new Manifest V2 extensions (2024)
- Existing Manifest V2 extensions will stop running (2025)
- Firefox supports both but is moving toward Manifest V3
- Manifest V3 requires service workers instead of background pages
- Different permission and API models between versions

**Business Factors:**
- Long-term viability and distribution through official stores
- Development and maintenance effort
- User adoption and browser compatibility
- Team expertise and learning curve

**Security Factors:**
- Manifest V3 provides enhanced security model
- More granular permissions
- Content Security Policy (CSP) requirements
- Reduced attack surface

### Current Market Situation

| Browser | Manifest V2 Status | Manifest V3 Status | Timeline |
|---------|-------------------|-------------------|----------|
| **Chrome** | Deprecated | Required for new extensions | 2024-2025 |
| **Firefox** | Supported | Partial support, improving | 2024-2025 |
| **Edge** | Following Chrome | Required for new extensions | 2024-2025 |
| **Safari** | N/A | Limited support | Unknown |

## Decision

**We will adopt Manifest V3 as the primary and only architecture for the Settings Extension.**

### Rationale

1. **Future Compatibility**: Manifest V3 is the future standard for browser extensions
2. **Store Requirements**: Official distribution requires Manifest V3 for new extensions
3. **Security Benefits**: Enhanced security model aligns with project goals
4. **Simplified Maintenance**: Single codebase reduces complexity and maintenance burden
5. **Performance Benefits**: Service worker model provides better performance characteristics

### Implementation Approach

- Use Manifest V3 specification as the foundation
- Implement service worker pattern for background processing
- Adopt declarative approach where possible
- Use browser compatibility layer to handle Firefox differences
- Focus on Chrome and Firefox as primary targets

## Consequences

### Positive Consequences

✅ **Future-Proof Architecture**
- Extension will remain compatible with evolving browser platforms
- No migration required when Manifest V2 is fully deprecated
- Access to new browser features and APIs

✅ **Enhanced Security**
- More restrictive permission model reduces security risks
- Content Security Policy enforcement prevents code injection
- Service worker isolation improves stability

✅ **Simplified Development**
- Single architecture reduces complexity
- No need to maintain multiple codebases
- Clear development path and best practices

✅ **Better Performance**
- Service workers provide better resource management
- Event-driven architecture improves efficiency
- Reduced memory footprint when inactive

✅ **Official Distribution**
- Can be distributed through Chrome Web Store
- Compatible with Firefox Add-ons (AMO)
- Meets store requirements for approval

### Negative Consequences

❌ **Learning Curve**
- Team needs to learn service worker patterns
- Different programming model from background pages
- New debugging and testing approaches required

❌ **Limited Backwards Compatibility**
- Cannot support very old browser versions
- Some legacy APIs not available
- Potential compatibility issues during Firefox transition

❌ **Development Complexity**
- Service worker lifecycle management
- Message passing complexity
- Storage limitations and patterns

❌ **Early Adoption Risks**
- Potential browser bugs in new implementations
- Less community knowledge and examples
- Evolving best practices and patterns

### Migration Impact

Since this is a new project, there is no migration impact. However, this decision affects:

- **Architecture Design**: Must follow service worker patterns
- **API Selection**: Limited to Manifest V3 compatible APIs
- **Testing Strategy**: Must test service worker lifecycle
- **Documentation**: Must document Manifest V3 patterns

### Mitigation Strategies

**For Learning Curve:**
- Team training on service worker patterns
- Prototype development to validate approach
- Regular architecture reviews and knowledge sharing

**For Compatibility Issues:**
- Browser compatibility layer implementation
- Feature detection and graceful degradation
- Comprehensive cross-browser testing

**For Development Complexity:**
- Well-defined architecture patterns
- Comprehensive error handling
- Automated testing for service worker lifecycle

## Implementation Details

### Service Worker Architecture
```javascript
// background.js - Service worker implementation
self.addEventListener('install', (event) => {
  // Extension installation logic
});

self.addEventListener('activate', (event) => {
  // Extension activation logic  
});

self.addEventListener('message', (event) => {
  // Message handling logic
});
```

### Storage Pattern
```javascript
// Use browser.storage APIs instead of localStorage
const storage = chrome.storage.local;

async function getSetting(key) {
  const result = await storage.get([key]);
  return result[key];
}

async function setSetting(key, value) {
  await storage.set({ [key]: value });
}
```

### Permission Model
```json
{
  "manifest_version": 3,
  "permissions": [
    "storage",
    "activeTab"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

## Alternatives Considered

### Alternative 1: Manifest V2 Support
**Rejected** because:
- Limited future viability due to deprecation
- Cannot be distributed through official stores long-term
- Missing security enhancements
- Technical debt from supporting legacy architecture

### Alternative 2: Dual Manifest Support
**Rejected** because:
- Significantly increases development and maintenance complexity
- Requires maintaining two different codebases
- Testing complexity doubles
- Limited team resources for such complexity

### Alternative 3: Framework-Based Approach
**Considered** but decided to combine with Manifest V3:
- Frameworks like Plasmo support Manifest V3
- Adds dependency and complexity
- Team preference for vanilla JavaScript
- Better to understand core concepts first

## Success Metrics

The success of this decision will be measured by:

1. **Development Velocity**: Time to implement core features
2. **Browser Compatibility**: Successful operation across Chrome and Firefox
3. **Store Approval**: Acceptance by Chrome Web Store and Firefox AMO
4. **Performance Metrics**: Meeting performance targets (< 100ms operations)
5. **Team Adoption**: Team confidence and productivity with service worker patterns

## Review Schedule

This decision will be reviewed:
- **3 months**: Initial implementation assessment
- **6 months**: Performance and compatibility evaluation  
- **12 months**: Long-term viability assessment
- **As needed**: If significant browser changes occur

## Related Decisions

- [ADR-002: Vanilla JavaScript Approach](002-vanilla-javascript.md) - Complements this by avoiding framework complexity
- [ADR-003: Storage Strategy](003-storage-strategy.md) - Implements Manifest V3 storage patterns

## References

- [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Firefox WebExtensions Manifest V3](https://blog.mozilla.org/addons/2022/05/18/manifest-v3-in-firefox-recap-next-steps/)
- [Migrating to Manifest V3](https://developer.chrome.com/docs/extensions/migrating/)
- [Service Workers in Extensions](https://developer.chrome.com/docs/extensions/mv3/service-workers/)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-08-11 | Architecture Team | Initial ADR for Manifest V3 adoption |