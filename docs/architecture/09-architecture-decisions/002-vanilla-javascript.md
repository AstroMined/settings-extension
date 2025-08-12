# ADR-002: Vanilla JavaScript Approach

## Status

**Accepted** - 2025-08-11

## Context

The Settings Extension needs to choose a JavaScript approach for implementation. The options considered include:

1. **Vanilla JavaScript (ES6+)**: Standard JavaScript without frameworks
2. **React**: Popular component-based framework
3. **Vue.js**: Progressive JavaScript framework
4. **Lit**: Lightweight web components library
5. **TypeScript**: Typed superset of JavaScript

### Key Considerations

**Technical Factors:**

- Browser extension environment constraints
- Bundle size and performance impact
- Build complexity and tooling requirements
- Browser compatibility across Chrome and Firefox
- Service worker limitations with frameworks

**Team Factors:**

- Current team expertise and learning curve
- Development velocity and productivity
- Long-term maintenance requirements
- Debugging and troubleshooting complexity

**Project Factors:**

- Relatively simple UI requirements
- Performance targets (< 500ms load times)
- Small extension bundle size requirements
- Cross-browser compatibility needs

### Framework Analysis

| Framework      | Bundle Size        | Learning Curve | Browser Compat | Service Worker Support |
| -------------- | ------------------ | -------------- | -------------- | ---------------------- |
| **Vanilla JS** | Minimal            | Low            | Excellent      | Native                 |
| **React**      | ~40KB+             | Medium         | Good           | Limited                |
| **Vue.js**     | ~30KB+             | Medium         | Good           | Limited                |
| **Lit**        | ~15KB              | Medium         | Excellent      | Good                   |
| **TypeScript** | 0KB (compile-time) | High           | Excellent      | Good                   |

### Service Worker Constraints

Manifest V3 service workers have specific limitations that affect framework choice:

- No DOM access in service workers
- Limited global state persistence
- Event-driven lifecycle requires careful state management
- Module loading restrictions
- Build complexity for framework integration

## Decision

**We will use Vanilla JavaScript (ES6+) as the primary development approach for the Settings Extension.**

### Rationale

1. **Minimal Dependencies**: Reduces bundle size and potential security vulnerabilities
2. **Performance Optimization**: Direct control over performance without framework overhead
3. **Browser Compatibility**: Native JavaScript works consistently across all target browsers
4. **Service Worker Compatibility**: No framework-specific issues with service worker patterns
5. **Team Expertise**: Team is comfortable with vanilla JavaScript development
6. **Simplicity**: UI requirements are straightforward enough for vanilla implementation
7. **Debugging Simplicity**: Easier to debug without framework abstraction layers

### Implementation Approach

- Use ES6+ features (modules, classes, async/await, destructuring)
- Implement component patterns manually for code organization
- Use standard Web APIs for all functionality
- Create custom utilities for common operations
- Focus on readable, maintainable code structure

## Consequences

### Positive Consequences

✅ **Performance Benefits**

- Minimal bundle size (~50-100KB vs 200KB+ with frameworks)
- Fast startup times (< 500ms target easily achievable)
- No framework overhead or virtual DOM operations
- Direct browser API usage for optimal performance

✅ **Compatibility Advantages**

- Works identically across all browsers
- No framework-specific browser issues
- Direct access to all browser extension APIs
- No compatibility layers or polyfills needed

✅ **Maintenance Simplicity**

- No framework dependencies to update or manage
- No breaking changes from framework upgrades
- Easier to understand and modify code
- Reduced security surface area

✅ **Development Control**

- Complete control over code execution
- Optimized for specific use cases
- Custom solutions tailored to requirements
- No framework limitations or constraints

✅ **Learning and Debugging**

- Team can focus on extension-specific concepts
- Standard browser debugging tools work perfectly
- No framework-specific debugging requirements
- Easier onboarding for new team members

### Negative Consequences

❌ **Development Velocity**

- Manual implementation of common UI patterns
- More boilerplate code for component-like structures
- No pre-built UI components or libraries
- Longer development time for complex UI features

❌ **Code Organization Challenges**

- Requires discipline to maintain clean architecture
- Manual implementation of state management
- No built-in patterns for component lifecycle
- Potential for less organized code without framework structure

❌ **Feature Limitations**

- No reactive data binding out of the box
- Manual DOM manipulation and updates
- No component ecosystem to leverage
- Limited reusable component patterns

❌ **Modern Development Experience**

- No hot module replacement for development
- Limited IDE support compared to popular frameworks
- No framework-specific development tools
- Manual implementation of development conveniences

### Mitigation Strategies

**For Development Velocity:**

- Create reusable utility functions and classes
- Establish clear code organization patterns
- Build custom component-like structures
- Use code templates for common patterns

**For Code Organization:**

- Define clear architectural patterns and guidelines
- Implement custom state management utilities
- Use ES6 modules for clean separation of concerns
- Regular code reviews to maintain quality

**For Feature Limitations:**

- Implement simple reactive patterns where needed
- Create DOM utility helpers for common operations
- Build custom event system for component communication
- Focus on progressive enhancement

## Implementation Details

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── form-controls.js
│   ├── settings-display.js
│   └── validation.js
├── services/           # Business logic services
│   ├── settings-manager.js
│   ├── storage-service.js
│   └── validation-service.js
├── utils/              # Utility functions
│   ├── dom-helpers.js
│   ├── event-emitter.js
│   └── browser-compat.js
├── ui/                 # UI-specific code
│   ├── popup/
│   └── options/
└── background.js       # Service worker
```

### Component Pattern

```javascript
// Custom component pattern
class SettingsForm {
  constructor(container, options = {}) {
    this.container = container;
    this.options = { ...this.defaultOptions, ...options };
    this.state = new Map();
    this.init();
  }

  get defaultOptions() {
    return {
      autoSave: true,
      showValidation: true,
    };
  }

  init() {
    this.createElements();
    this.bindEvents();
    this.loadInitialData();
  }

  createElements() {
    this.form = document.createElement("form");
    this.form.className = "settings-form";
    this.container.appendChild(this.form);
  }

  bindEvents() {
    this.form.addEventListener("submit", this.handleSubmit.bind(this));
    this.form.addEventListener("change", this.handleChange.bind(this));
  }

  // ... other methods
}
```

### State Management Pattern

```javascript
// Simple state management
class StateManager {
  constructor(initialState = {}) {
    this.state = new Map(Object.entries(initialState));
    this.listeners = new Map();
  }

  get(key) {
    return this.state.get(key);
  }

  set(key, value) {
    const oldValue = this.state.get(key);
    this.state.set(key, value);
    this.notifyListeners(key, value, oldValue);
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
  }

  notifyListeners(key, newValue, oldValue) {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach((callback) => callback(newValue, oldValue));
    }
  }
}
```

### DOM Utilities

```javascript
// DOM helper utilities
class DOMHelper {
  static createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.className) {
      element.className = options.className;
    }

    if (options.textContent) {
      element.textContent = options.textContent;
    }

    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }

    return element;
  }

  static findElement(selector, container = document) {
    return container.querySelector(selector);
  }

  static findElements(selector, container = document) {
    return Array.from(container.querySelectorAll(selector));
  }
}
```

## Alternatives Considered

### Alternative 1: React

**Rejected** because:

- Bundle size overhead (~40KB+ just for React)
- Service worker integration complexity
- Overkill for the relatively simple UI requirements
- Learning curve for team members not familiar with React
- Build complexity and tooling requirements

### Alternative 2: Vue.js

**Rejected** because:

- Similar bundle size concerns as React
- Additional complexity for service worker integration
- Framework-specific debugging requirements
- Not necessary for the scope of UI requirements

### Alternative 3: Lit (Web Components)

**Considered** but rejected because:

- Still adds dependency and bundle size
- Web Components have some browser quirks
- Additional abstraction layer not needed
- Team preference for direct control

### Alternative 4: TypeScript

**Deferred** because:

- Adds build complexity and compilation step
- Learning curve for team members
- Vanilla JavaScript provides sufficient type safety for project scope
- Can be added later if project grows in complexity

## Success Metrics

The success of this decision will be measured by:

1. **Performance Metrics**:
   - Bundle size < 200KB total
   - UI load time < 500ms
   - Memory usage < 10MB

2. **Development Metrics**:
   - Feature development velocity
   - Bug rate and debugging time
   - Code maintainability scores

3. **Team Metrics**:
   - Developer productivity and satisfaction
   - Time to onboard new team members
   - Code review efficiency

## Review Schedule

This decision will be reviewed:

- **3 months**: Development velocity and code quality assessment
- **6 months**: Performance and maintainability evaluation
- **12 months**: Consider if project complexity warrants framework adoption

## Related Decisions

- [ADR-001: Manifest V3 Adoption](001-manifest-v3.md) - Service worker constraints influenced this decision
- [ADR-003: Storage Strategy](003-storage-strategy.md) - Native API usage aligns with vanilla JavaScript approach

## Future Considerations

This decision may be revisited if:

- Project scope significantly expands requiring complex UI
- Team size grows and needs more structured development patterns
- Performance requirements change significantly
- Browser extension development best practices evolve

Potential migration path to TypeScript or lightweight framework would be:

1. Assess current codebase complexity and pain points
2. Evaluate team capacity for learning new tooling
3. Plan incremental migration strategy
4. Maintain backward compatibility during transition

## References

- [Vanilla JavaScript vs Frameworks](https://youmightnotneedjquery.com/)
- [Browser Extension Development Best Practices](https://developer.chrome.com/docs/extensions/mv3/devguide/)
- [Performance Impact of JavaScript Frameworks](https://krausest.github.io/js-framework-benchmark/current.html)
- [Service Workers and Framework Compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## Revision History

| Date       | Author            | Changes                                     |
| ---------- | ----------------- | ------------------------------------------- |
| 2025-08-11 | Architecture Team | Initial ADR for vanilla JavaScript approach |
