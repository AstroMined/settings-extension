# Component Registry and Dynamic Loading - Story

## Executive Summary

Create a dynamic component registry system that allows runtime registration and rendering of setting UI components. This forms the foundation for extensibility by enabling new setting types to be added without modifying core framework files, supporting the plugin architecture that will be built in subsequent stories.

**Status**: Ready for Implementation  
**Priority**: Medium - Foundation for Extensibility  
**Story Points**: 8 (Medium-Large)  
**Sprint**: 5

## User Story

**As a** developer extending the Settings Extension framework  
**I want** to register custom UI components for new setting types  
**So that** I can create specialized interfaces without modifying core framework files.

**As a** framework maintainer  
**I want** a clean component registration system  
**So that** I can support diverse UI requirements while maintaining core stability.

## Problem Statement

### Current Component Architecture Limitations

The current Settings Extension has hardcoded component types that prevent extensibility:

#### 1. Hardcoded Component Creation

```javascript
// Current rigid approach in settings-manager.js and options.js
switch (setting.type) {
  case "boolean":
    return createBooleanInput();
  case "text":
    return createTextInput();
  case "number":
    return createNumberInput();
  // Adding new types requires modifying core files
}
```

#### 2. Monolithic UI Generation

```javascript
// Current approach in options.js createInputElement()
createInputElement(key, setting) {
  let input;
  switch (setting.type) {
    // Large switch statement with hardcoded logic
    // Cannot be extended without modifying core
  }
}
```

#### 3. No Component Lifecycle Management

- No mount/unmount hooks for components
- No validation integration at component level
- No error isolation for component failures
- No priority-based component override system

## Acceptance Criteria

### Primary Acceptance Criteria

- [ ] **Component Interface**: Standardized interface for all setting components
- [ ] **Dynamic Registry**: Runtime component registration without core modifications
- [ ] **Component Lifecycle**: Mount/unmount and change event hooks
- [ ] **Error Isolation**: Component failures don't crash the framework
- [ ] **Priority System**: Component override precedence for customization

### Technical Acceptance Criteria

- [ ] **Type Safety**: TypeScript-compatible component interfaces
- [ ] **Performance**: Component lookup and rendering <10ms overhead
- [ ] **Validation Integration**: Components handle their own validation logic
- [ ] **Fallback Rendering**: Graceful degradation for unknown/failed components
- [ ] **Testing Support**: Component testing utilities and mock frameworks

### Quality Acceptance Criteria

- [ ] **Test Coverage**: >95% coverage for component registry functionality
- [ ] **Documentation**: Complete component development guide with examples
- [ ] **Error Handling**: Comprehensive error isolation and recovery
- [ ] **Performance**: No regression in UI rendering speed
- [ ] **Backward Compatibility**: Existing setting types work unchanged

## Technical Approach

### 1. Component Interface Design

#### Base Component Interface

```typescript
// lib/interfaces/component-interface.ts
interface ISettingComponent {
  readonly type: string;
  readonly priority: number; // For override precedence (higher = higher priority)
  readonly version?: string;

  // Required lifecycle methods
  render(
    key: string,
    setting: SettingDefinition,
    currentValue: any,
  ): HTMLElement;

  validate(value: any, setting: SettingDefinition): ValidationResult;

  // Optional lifecycle methods
  serialize?(value: any, setting: SettingDefinition): any;
  deserialize?(value: any, setting: SettingDefinition): any;
  onMount?(element: HTMLElement, setting: SettingDefinition): void;
  onUnmount?(element: HTMLElement): void;
  onValueChange?(
    oldValue: any,
    newValue: any,
    setting: SettingDefinition,
  ): void;
}

interface SettingDefinition {
  type: string;
  value: any;
  description: string;
  displayName?: string;
  category?: string;
  validation?: ValidationRule[];
  ui?: UIMetadata;
  [key: string]: any; // Allow custom properties
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}
```

### 2. Component Registry Implementation

```javascript
// lib/component-registry.js
class ComponentRegistry {
  constructor() {
    this.components = new Map();
    this.fallbackComponent = null;
    this.errorComponent = null;

    // Register built-in components automatically
    this.registerBuiltinComponents();
  }

  registerComponent(component) {
    // Validate component interface
    if (!this.validateComponentInterface(component)) {
      throw new Error(
        `Invalid component: must implement ISettingComponent interface`,
      );
    }

    // Handle component conflicts and priority
    if (this.components.has(component.type)) {
      const existing = this.components.get(component.type);
      if (component.priority <= existing.priority) {
        console.warn(
          `Component ${component.type} not registered: priority ${component.priority} <= existing ${existing.priority}`,
        );
        return false;
      }
      console.info(
        `Component ${component.type} overridden: priority ${component.priority} > ${existing.priority}`,
      );
    }

    this.components.set(component.type, component);
    console.info(
      `Registered component: ${component.type} (priority: ${component.priority})`,
    );
    return true;
  }

  validateComponentInterface(component) {
    return (
      component &&
      typeof component.type === "string" &&
      typeof component.priority === "number" &&
      typeof component.render === "function" &&
      typeof component.validate === "function"
    );
  }

  getComponent(type) {
    const component = this.components.get(type);
    if (!component) {
      console.warn(`Unknown component type: ${type}, using fallback`);
      return this.fallbackComponent || this.getDefaultTextComponent();
    }
    return component;
  }

  renderSetting(key, setting, currentValue) {
    const component = this.getComponent(setting.type);

    try {
      // Render component
      const element = component.render(key, setting, currentValue);

      // Add framework-level enhancements
      this.enhanceElement(element, key, setting, component);

      return element;
    } catch (error) {
      console.error(`Error rendering ${setting.type} component:`, error);
      return this.renderErrorComponent(key, setting, error);
    }
  }

  enhanceElement(element, key, setting, component) {
    // Add accessibility attributes
    element.setAttribute("aria-describedby", `help-${key}`);
    element.setAttribute("data-setting-key", key);
    element.setAttribute("data-setting-type", setting.type);
    element.setAttribute(
      "data-component-version",
      component.version || "1.0.0",
    );

    // Add change event handling
    element.addEventListener("change", (e) => {
      this.handleComponentChange(key, setting, component, e);
    });

    // Add input event handling for real-time validation
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      element.addEventListener("input", (e) => {
        this.handleComponentInput(key, setting, component, e);
      });
    }

    // Call component mount hook
    if (component.onMount) {
      try {
        component.onMount(element, setting);
      } catch (error) {
        console.error(
          `Error in component mount hook for ${setting.type}:`,
          error,
        );
      }
    }
  }

  handleComponentChange(key, setting, component, event) {
    try {
      const value = this.extractValueFromElement(event.target, setting.type);

      // Component-level validation
      const validation = component.validate(value, setting);
      if (!validation.isValid) {
        this.showValidationErrors(key, validation.errors);
        return;
      }

      // Clear validation errors
      this.clearValidationErrors(key);

      // Trigger change callback if component has one
      if (component.onValueChange) {
        const oldValue = setting.value;
        component.onValueChange(oldValue, value, setting);
      }

      // Emit framework-level change event
      this.emitSettingChange(key, value, setting);
    } catch (error) {
      console.error(`Error handling component change for ${key}:`, error);
      this.showValidationErrors(key, [error.message]);
    }
  }

  registerBuiltinComponents() {
    // Register all existing component types
    this.registerComponent(new BooleanComponent());
    this.registerComponent(new TextComponent());
    this.registerComponent(new LongTextComponent());
    this.registerComponent(new NumberComponent());
    this.registerComponent(new JsonComponent());

    // Set fallback
    this.fallbackComponent = new TextComponent();
  }

  renderErrorComponent(key, setting, error) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-component";
    errorDiv.innerHTML = `
      <div class="error-message">
        Component Error: ${error.message}
      </div>
      <small>Setting: ${key} (${setting.type})</small>
    `;
    return errorDiv;
  }
}
```

### 3. Built-in Component Implementations

#### Boolean Component

```javascript
// components/boolean-component.js
class BooleanComponent {
  type = "boolean";
  priority = 100;
  version = "1.0.0";

  render(key, setting, currentValue) {
    const label = document.createElement("label");
    label.className = "checkbox-label";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = `setting-${key}`;
    input.checked = currentValue !== undefined ? currentValue : setting.value;
    input.className = "setting-input boolean-input";

    const span = document.createElement("span");
    span.className = "checkbox-text";
    span.textContent = setting.displayName || setting.description;

    label.appendChild(input);
    label.appendChild(span);

    return label;
  }

  validate(value, setting) {
    if (typeof value !== "boolean") {
      return {
        isValid: false,
        errors: ["Value must be true or false"],
      };
    }
    return { isValid: true, errors: [] };
  }

  serialize(value, setting) {
    return Boolean(value);
  }

  deserialize(value, setting) {
    return Boolean(value);
  }
}
```

#### Enhanced Text Component

```javascript
// components/text-component.js
class TextComponent {
  type = "text";
  priority = 100;
  version = "1.0.0";

  render(key, setting, currentValue) {
    const input = document.createElement("input");
    input.type = "text";
    input.id = `setting-${key}`;
    input.value =
      currentValue !== undefined ? currentValue : setting.value || "";
    input.className = "setting-input text-input";

    // Apply constraints from setting
    if (setting.maxLength) {
      input.maxLength = setting.maxLength;
    }
    if (setting.placeholder) {
      input.placeholder = setting.placeholder;
    }
    if (setting.validation?.includes("required")) {
      input.required = true;
    }

    return input;
  }

  validate(value, setting) {
    const errors = [];

    if (typeof value !== "string") {
      errors.push("Value must be a string");
    } else {
      // Required validation
      if (setting.validation?.includes("required") && value.trim() === "") {
        errors.push("This field is required");
      }

      // Length validation
      if (setting.maxLength && value.length > setting.maxLength) {
        errors.push(`Maximum length is ${setting.maxLength} characters`);
      }
      if (setting.minLength && value.length < setting.minLength) {
        errors.push(`Minimum length is ${setting.minLength} characters`);
      }

      // Pattern validation
      if (setting.pattern) {
        const regex = new RegExp(setting.pattern);
        if (!regex.test(value)) {
          errors.push(setting.patternMessage || "Invalid format");
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  onMount(element, setting) {
    // Add real-time character count for fields with maxLength
    if (setting.maxLength) {
      this.addCharacterCounter(element, setting.maxLength);
    }
  }

  addCharacterCounter(input, maxLength) {
    const counter = document.createElement("small");
    counter.className = "character-counter";

    const updateCounter = () => {
      const remaining = maxLength - input.value.length;
      counter.textContent = `${remaining} characters remaining`;
      counter.className = `character-counter ${remaining < 10 ? "warning" : ""}`;
    };

    input.addEventListener("input", updateCounter);
    updateCounter();

    input.parentNode.appendChild(counter);
  }
}
```

## Implementation Roadmap

### Sprint 5: Component Registry Foundation

#### Week 1: Core Registry System

- [ ] Design and implement `ISettingComponent` interface
- [ ] Create `ComponentRegistry` class with registration logic
- [ ] Implement component priority and conflict resolution
- [ ] Add error isolation and fallback mechanisms

#### Week 2: Built-in Component Migration

- [ ] Migrate existing boolean, text, number components to new interface
- [ ] Implement component lifecycle hooks (mount, unmount, change)
- [ ] Add validation integration at component level
- [ ] Create comprehensive unit tests for registry and components

## Testing Strategy

### Unit Testing Requirements

#### Component Registry Tests

```javascript
// test/unit/component-registry.test.js
describe("ComponentRegistry", () => {
  test("registers valid components correctly", () => {
    const registry = new ComponentRegistry();
    const testComponent = {
      type: "test",
      priority: 100,
      render: () => document.createElement("input"),
      validate: () => ({ isValid: true, errors: [] }),
    };

    expect(registry.registerComponent(testComponent)).toBe(true);
    expect(registry.getComponent("test")).toBe(testComponent);
  });

  test("handles component priority correctly", () => {
    const registry = new ComponentRegistry();

    const lowPriority = {
      type: "test",
      priority: 50,
      render: () => null,
      validate: () => null,
    };
    const highPriority = {
      type: "test",
      priority: 150,
      render: () => null,
      validate: () => null,
    };

    registry.registerComponent(lowPriority);
    registry.registerComponent(highPriority);

    expect(registry.getComponent("test")).toBe(highPriority);
  });

  test("isolates component rendering errors", () => {
    const registry = new ComponentRegistry();
    const errorComponent = {
      type: "error-test",
      priority: 100,
      render: () => {
        throw new Error("Component render error");
      },
      validate: () => ({ isValid: true, errors: [] }),
    };

    registry.registerComponent(errorComponent);
    const element = registry.renderSetting(
      "test",
      { type: "error-test" },
      null,
    );

    expect(element.classList.contains("error-component")).toBe(true);
  });
});
```

#### Built-in Component Tests

```javascript
// test/unit/components/boolean-component.test.js
describe("BooleanComponent", () => {
  test("renders checkbox with correct value", () => {
    const component = new BooleanComponent();
    const element = component.render(
      "test",
      { type: "boolean", value: true },
      true,
    );

    expect(element.tagName).toBe("LABEL");
    const input = element.querySelector("input");
    expect(input.type).toBe("checkbox");
    expect(input.checked).toBe(true);
  });

  test("validates boolean values correctly", () => {
    const component = new BooleanComponent();

    expect(component.validate(true, {})).toEqual({ isValid: true, errors: [] });
    expect(component.validate("invalid", {})).toEqual({
      isValid: false,
      errors: ["Value must be true or false"],
    });
  });
});
```

### Integration Testing Requirements

#### Component Integration with Settings Manager

- [ ] Verify components render correctly in popup context
- [ ] Test components work correctly in options page context
- [ ] Validate component change events integrate with settings manager
- [ ] Ensure component validation integrates with framework validation

## Definition of Done

### Component Registry Requirements

- [ ] Complete component registry with priority-based registration
- [ ] Dynamic component loading and rendering functional
- [ ] Error isolation prevents component failures from crashing framework
- [ ] Comprehensive component interface with lifecycle hooks

### Built-in Component Migration

- [ ] All existing setting types (boolean, text, longtext, number, json) migrated
- [ ] Components work identically to current implementation
- [ ] Enhanced features (character counters, validation) added
- [ ] Backward compatibility maintained

### Testing and Documentation

- [ ] > 95% test coverage for component registry functionality
- [ ] Unit tests for all built-in components
- [ ] Component development guide with examples
- [ ] Integration testing with existing UI

## Success Metrics

### Technical Metrics

- **Component Registration Time**: <5ms for typical component
- **Component Lookup Time**: <1ms average registry lookup
- **Rendering Performance**: No regression vs current hardcoded approach
- **Error Isolation**: 100% of component failures isolated

### Developer Experience Metrics

- **Component Development Time**: <1 hour for simple custom component
- **Registration Simplicity**: <5 lines of code for basic component registration
- **Documentation Quality**: Complete examples for common component patterns

## Dependencies

### Internal Dependencies

- **Configuration Management Story**: Component metadata in configuration
- **UI Components Story**: Foundation for enhanced UI components
- **File Organization**: Clean structure for component organization

### External Dependencies

- **TypeScript**: Type definitions for component interfaces
- **DOM APIs**: Standard HTML element creation and manipulation
- **Event System**: Component lifecycle and change event handling

## Related Work

### Epic Integration

- **Framework Maturity Epic**: Foundation for extensible framework architecture
- **Developer Experience**: Component system improves framework flexibility
- **Maintainability**: Modular components reduce core framework complexity

### Enables Future Stories

- **Plugin System Story**: Component registry is foundation for plugin architecture
- **Hook System Story**: Component lifecycle hooks enable advanced features
- **Advanced UI Components**: Registry enables sophisticated component types

### References

- [Framework Maturity Epic](001-framework-maturity-epic.md) - Parent epic context
- [UI Components Story](006-ui-components-features-story.md) - Enhanced components dependency
- [Plugin System Story](009-plugin-system-story.md) - Enabled by component registry

## Revision History

| Date       | Author           | Changes                                                                                          |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| 2025-08-14 | Development Team | Story created by splitting extensibility architecture into focused component registry foundation |

---

**FOUNDATION**: This story creates the architectural foundation that enables the plugin system and advanced extensibility features. Success here is essential for the broader extensibility vision while keeping scope manageable and focused.
