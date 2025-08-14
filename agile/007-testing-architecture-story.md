# Testing Architecture and Module Decomposition - Story

## Executive Summary

Decompose monolithic modules into smaller, pure function modules to improve unit test coverage and code testability. This addresses the current challenge where `lib/validation.js` is the only pure function module, making it difficult to achieve 90%+ coverage distribution across the codebase while maintaining the zero-tolerance testing standards.

**Status**: Ready for Implementation  
**Priority**: Medium - Technical Debt and Testing Infrastructure  
**Story Points**: 13 (Large)  
**Sprint**: 4-5

## User Story

**As a** developer maintaining the Settings Extension framework  
**I want** pure function modules that are easily unit testable  
**So that** I can achieve high test coverage distribution and confident refactoring without relying only on E2E tests.

**As a** contributor to the Settings Extension codebase  
**I want** clear separation between pure business logic and browser integration  
**So that** I can write fast, reliable unit tests for business logic while using E2E tests only for browser integration.

## Problem Statement

### Current Testing Architecture Challenges

Based on analysis from [Testability Decomposition Strategy](testability-decomposition.md):

#### 1. Single Pure Function Module

**Current State**: Only `lib/validation.js` exists for unit testing  
**Problem**: 90% coverage pressure concentrated on single module  
**Impact**: Difficult to achieve distributed coverage, high testing pressure

#### 2. Missing Utility Modules

**Current State**: `jest.config.js` references non-existent `lib/utils.js` and `lib/formatters.js`  
**Problem**: Configuration expects modules that don't exist  
**Impact**: Coverage configuration mismatch, no structure for pure functions

#### 3. Monolithic Integration Modules

**Current State**:

- `lib/settings-manager.js` - Mixed browser APIs and business logic
- `lib/content-settings.js` - DOM/browser APIs tightly coupled
- `lib/browser-compat.js` - Browser abstraction but no unit tests

**Problem**: Browser integration locks out unit testing  
**Impact**: Must use E2E tests for all functionality, slow test feedback

### Coverage Distribution Challenge

```
Current Coverage Architecture:
lib/validation.js        80% coverage → needs 90%
lib/settings-manager.js  E2E only    → complex browser integration
lib/content-settings.js  E2E only    → DOM/browser APIs
lib/browser-compat.js    E2E only    → browser API abstraction

Desired Coverage Architecture:
lib/validation.js     90%+ → focused validation logic
lib/utils.js         90%+ → extracted utility functions
lib/formatters.js    90%+ → display and formatting logic
lib/calculations.js  90%+ → computational logic
lib/constants.js     90%+ → configuration constants
[Integration modules] E2E → browser APIs only
```

## Acceptance Criteria

### Primary Acceptance Criteria

- [ ] **Pure Function Modules**: 4-5 modules containing only pure functions for unit testing
- [ ] **Coverage Distribution**: >90% coverage on each pure function module
- [ ] **Logic Extraction**: Business logic separated from browser APIs
- [ ] **Fast Unit Tests**: Unit test suite runs in <2 seconds
- [ ] **Preserved Functionality**: All existing functionality maintained after decomposition

### Technical Acceptance Criteria

- [ ] **Clear Module Boundaries**: Pure functions vs browser integration clearly separated
- [ ] **Import Dependencies**: Clear dependency hierarchy with minimal coupling
- [ ] **Performance Maintenance**: No regression in operation performance
- [ ] **Testing Categories**: Clear distinction between unit testable and E2E-only components
- [ ] **Documentation**: Each module clearly documented with purpose and testing approach

### Quality Acceptance Criteria

- [ ] **Overall Coverage**: >85% total unit test coverage across pure function modules
- [ ] **Test Speed**: Unit tests execute in <2 seconds for rapid feedback
- [ ] **Test Reliability**: Unit tests have 100% pass rate and no flakiness
- [ ] **Code Organization**: Each module has focused, single responsibility
- [ ] **Developer Experience**: Easier to write unit tests for new features

## Technical Approach

### Phase 1: Extract Core Utilities (`lib/utils.js`)

#### Functions to Extract from `lib/validation.js`:

```javascript
// lib/utils.js - Pure utility functions
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(deepClone);
  if (typeof obj === "object") {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
}

export function isPlainObject(value) {
  return (
    value !== null && typeof value === "object" && value.constructor === Object
  );
}

export function hasCircularReference(obj, seen = new WeakSet()) {
  if (typeof obj !== "object" || obj === null) return false;
  if (seen.has(obj)) return true;

  seen.add(obj);
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (hasCircularReference(obj[key], seen)) {
        return true;
      }
    }
  }
  seen.delete(obj);
  return false;
}

export function sanitizeString(str, options = {}) {
  if (typeof str !== "string") return "";

  const {
    maxLength = 1000,
    allowHTML = false,
    trimWhitespace = true,
  } = options;

  let cleaned = str;

  if (trimWhitespace) {
    cleaned = cleaned.trim();
  }

  if (!allowHTML) {
    cleaned = cleaned
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }

  return cleaned;
}
```

#### Functions to Extract from `lib/settings-manager.js`:

```javascript
// Additional utils from settings-manager.js
export function generateSettingId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

export function mergeSettings(defaults, overrides) {
  const merged = { ...defaults };

  for (const [key, override] of Object.entries(overrides)) {
    if (defaults.hasOwnProperty(key)) {
      merged[key] = {
        ...defaults[key],
        value:
          override.value !== undefined ? override.value : defaults[key].value,
      };
    }
  }

  return merged;
}

export function normalizeSettingKey(key) {
  if (typeof key !== "string") return "";
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

export function validateSettingKey(key) {
  if (typeof key !== "string") return false;
  if (key.length === 0 || key.length > 100) return false;
  return /^[a-z][a-z0-9_]*$/.test(key);
}
```

### Phase 2: Create Formatters Module (`lib/formatters.js`)

#### Display and Formatting Logic:

```javascript
// lib/formatters.js - Display formatting functions
export function formatSettingValue(value, type) {
  if (value === null || value === undefined) return "";

  switch (type) {
    case "boolean":
      return value ? "Enabled" : "Disabled";
    case "number":
      return value.toLocaleString();
    case "json":
      return JSON.stringify(value, null, 2);
    case "longtext":
      return value.length > 100 ? value.substring(0, 100) + "..." : value;
    default:
      return String(value);
  }
}

export function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const base = 1024;
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(base));
  const size = (bytes / Math.pow(base, unitIndex)).toFixed(1);

  return `${size} ${units[unitIndex]}`;
}

export function formatTimestamp(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }

  return date.toLocaleString();
}

export function formatSettingType(type) {
  const typeNames = {
    boolean: "Yes/No",
    text: "Text",
    longtext: "Long Text",
    number: "Number",
    json: "JSON Object",
    enum: "Dropdown",
  };

  return typeNames[type] || "Unknown";
}

export function settingsToExportFormat(settings) {
  return {
    version: "1.0",
    timestamp: new Date().toISOString(),
    settings: Object.fromEntries(
      Object.entries(settings).map(([key, setting]) => [
        key,
        {
          type: setting.type,
          value: setting.value,
          description: setting.description,
        },
      ]),
    ),
  };
}

export function importFormatToSettings(data) {
  if (!data || !data.settings) {
    throw new Error("Invalid import format - missing settings");
  }

  const normalized = {};
  for (const [key, setting] of Object.entries(data.settings)) {
    if (setting.type && setting.hasOwnProperty("value")) {
      normalized[key] = setting;
    }
  }

  return normalized;
}

export function formatValidationError(error) {
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return "Validation failed";
}

export function formatConstraintMessage(constraint) {
  const { min, max, maxLength, required } = constraint;

  const messages = [];
  if (required) messages.push("Required");
  if (min !== undefined) messages.push(`Minimum: ${min}`);
  if (max !== undefined) messages.push(`Maximum: ${max}`);
  if (maxLength !== undefined) messages.push(`Max length: ${maxLength}`);

  return messages.join(", ");
}
```

### Phase 3: Create Calculations Module (`lib/calculations.js`)

#### Computational Logic:

```javascript
// lib/calculations.js - Pure computational functions
export function calculateStorageUsage(settings) {
  let totalBytes = 0;

  for (const [key, setting] of Object.entries(settings)) {
    const keyBytes = new TextEncoder().encode(key).length;
    const valueBytes = new TextEncoder().encode(
      JSON.stringify(setting.value),
    ).length;
    totalBytes += keyBytes + valueBytes;
  }

  return totalBytes;
}

export function calculateSettingsComplexity(settings) {
  let complexity = 0;

  for (const setting of Object.values(settings)) {
    switch (setting.type) {
      case "boolean":
        complexity += 1;
        break;
      case "text":
        complexity += 2;
        break;
      case "number":
        complexity += 2;
        break;
      case "longtext":
        complexity += 4;
        break;
      case "json":
        complexity += 8;
        break;
      case "enum":
        complexity += 3;
        break;
      default:
        complexity += 2;
    }
  }

  return complexity;
}

export function calculateSyncTime(settingsCount) {
  // Estimated sync time based on setting count
  const baseTime = 50; // Base 50ms
  const perSettingTime = 5; // 5ms per setting
  return baseTime + settingsCount * perSettingTime;
}

export function calculateOptimalChunkSize(data) {
  const maxChunkSize = 8192; // 8KB chunks
  const dataSize = JSON.stringify(data).length;

  if (dataSize <= maxChunkSize) return 1;

  return Math.ceil(dataSize / maxChunkSize);
}

export function benchmarkOperation(fn, iterations = 100) {
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  return {
    min: Math.min(...times),
    max: Math.max(...times),
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
  };
}

export function calculateMemoryFootprint(data) {
  // Rough estimation of memory usage
  const jsonString = JSON.stringify(data);
  const bytesPerChar = 2; // UTF-16 encoding
  return jsonString.length * bytesPerChar;
}

export function optimizeSettingsOrder(settings) {
  // Sort settings by complexity for optimal loading
  return Object.entries(settings).sort(([, a], [, b]) => {
    const complexityA = getTypeComplexity(a.type);
    const complexityB = getTypeComplexity(b.type);
    return complexityA - complexityB;
  });
}

function getTypeComplexity(type) {
  const complexity = {
    boolean: 1,
    text: 2,
    number: 2,
    enum: 3,
    longtext: 4,
    json: 8,
  };
  return complexity[type] || 5;
}
```

### Phase 4: Create Constants Module (`lib/constants.js`)

```javascript
// lib/constants.js - Configuration constants and schemas
export const SETTING_TYPES = {
  BOOLEAN: "boolean",
  TEXT: "text",
  LONGTEXT: "longtext",
  NUMBER: "number",
  JSON: "json",
  ENUM: "enum",
};

export const VALIDATION_RULES = {
  REQUIRED: "required",
  MIN_LENGTH: "minLength",
  MAX_LENGTH: "maxLength",
  MIN_VALUE: "min",
  MAX_VALUE: "max",
  PATTERN: "pattern",
};

export const DEFAULT_CONSTRAINTS = {
  text: { maxLength: 1000 },
  longtext: { maxLength: 50000 },
  number: { min: -Infinity, max: Infinity },
  json: { maxLength: 100000 },
};

export const ERROR_MESSAGES = {
  SETTING_NOT_FOUND: "Setting not found",
  INVALID_TYPE: "Invalid setting type",
  VALIDATION_FAILED: "Validation failed",
  STORAGE_FAILED: "Storage operation failed",
  INITIALIZATION_FAILED: "Settings initialization failed",
};

export const PERFORMANCE_THRESHOLDS = {
  SETTING_OPERATION_MS: 100,
  UI_LOAD_MS: 500,
  BULK_OPERATION_MS: 2000,
  UNIT_TEST_SUITE_MS: 2000,
};

export const STORAGE_LIMITS = {
  LOCAL_QUOTA_BYTES: 10485760, // 10MB for local storage
  SYNC_QUOTA_BYTES: 102400, // 100KB for sync storage
  MAX_ITEMS: 512,
  MAX_ITEM_SIZE: 8192,
};
```

## Implementation Roadmap

### Sprint 4: Foundation and Utilities

#### Week 1: Core Utilities Extraction

- [ ] Create `lib/utils.js` with extracted pure functions
- [ ] Move utility functions from `lib/validation.js` to `lib/utils.js`
- [ ] Update imports in dependent modules
- [ ] Write comprehensive unit tests for utils (target >95% coverage)

#### Week 2: Formatters and Constants

- [ ] Create `lib/formatters.js` with display logic
- [ ] Create `lib/constants.js` with configuration constants
- [ ] Extract formatting logic from UI components
- [ ] Unit tests for formatters and constants validation

### Sprint 5: Calculations and Integration

#### Week 1: Calculations Module

- [ ] Create `lib/calculations.js` with computational logic
- [ ] Extract analytics and performance calculation functions
- [ ] Add benchmarking and optimization utilities
- [ ] Comprehensive unit tests for calculations

#### Week 2: Integration and Cleanup

- [ ] Update `jest.config.js` to include all new modules in coverage
- [ ] Remove extracted code from original modules
- [ ] Update all imports and dependencies
- [ ] Verify full test suite passes with new structure

## Testing Strategy

### Unit Testing Requirements

#### Utils Module Testing

```javascript
// test/unit/utils.test.js
describe("Utils Module", () => {
  describe("deepClone", () => {
    test("clones simple objects correctly", () => {
      const obj = { a: 1, b: "test" };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    test("handles circular references", () => {
      const obj = { a: 1 };
      obj.self = obj;
      expect(() => deepClone(obj)).not.toThrow();
    });

    test("clones arrays correctly", () => {
      const arr = [1, { a: 2 }, [3, 4]];
      const cloned = deepClone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned[1]).not.toBe(arr[1]);
    });
  });

  describe("sanitizeString", () => {
    test("removes HTML tags when not allowed", () => {
      const input = "<script>alert('xss')</script>test";
      const result = sanitizeString(input, { allowHTML: false });
      expect(result).toBe(
        "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;test",
      );
    });

    test("respects maxLength constraint", () => {
      const input = "a".repeat(1000);
      const result = sanitizeString(input, { maxLength: 50 });
      expect(result.length).toBe(50);
    });
  });
});
```

#### Formatters Module Testing

```javascript
// test/unit/formatters.test.js
describe("Formatters Module", () => {
  describe("formatSettingValue", () => {
    test("formats boolean values correctly", () => {
      expect(formatSettingValue(true, "boolean")).toBe("Enabled");
      expect(formatSettingValue(false, "boolean")).toBe("Disabled");
    });

    test("formats file sizes correctly", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(1048576)).toBe("1.0 MB");
      expect(formatFileSize(0)).toBe("0 B");
    });
  });

  describe("formatValidationError", () => {
    test("handles string errors", () => {
      expect(formatValidationError("Invalid value")).toBe("Invalid value");
    });

    test("handles error objects", () => {
      const error = new Error("Test error");
      expect(formatValidationError(error)).toBe("Test error");
    });
  });
});
```

#### Calculations Module Testing

```javascript
// test/unit/calculations.test.js
describe("Calculations Module", () => {
  describe("calculateStorageUsage", () => {
    test("calculates byte usage correctly", () => {
      const settings = {
        test: { type: "text", value: "hello" },
      };
      const usage = calculateStorageUsage(settings);
      expect(usage).toBeGreaterThan(0);
      expect(typeof usage).toBe("number");
    });
  });

  describe("benchmarkOperation", () => {
    test("measures operation performance", () => {
      const result = benchmarkOperation(() => {
        Math.sqrt(Math.random());
      }, 10);

      expect(result).toHaveProperty("min");
      expect(result).toHaveProperty("max");
      expect(result).toHaveProperty("avg");
      expect(result.min).toBeGreaterThanOrEqual(0);
    });
  });
});
```

### Integration Testing Requirements

#### Module Integration Testing

- [ ] Verify extracted functions work correctly in original contexts
- [ ] Test import/export relationships between modules
- [ ] Validate no circular dependencies introduced
- [ ] Performance regression testing for module boundaries

#### Coverage Distribution Testing

- [ ] Verify >90% coverage achieved on each pure function module
- [ ] Validate overall coverage >85% maintained
- [ ] Test that E2E tests still cover browser integration adequately
- [ ] Ensure no coverage gaps created by decomposition

## Benefits and Success Metrics

### Testing Improvements

**Before Decomposition**:

- 1 unit testable module (`lib/validation.js`)
- 80% coverage pressure on single module
- Slow test feedback (E2E required for most logic)

**After Decomposition**:

- 5 unit testable modules with focused responsibilities
- 90%+ coverage distributed across modules
- Fast unit test feedback (<2 seconds)
- Clear separation between unit testable and E2E-only code

### Code Quality Improvements

**Metrics**:

- **Module Focus**: Each module has single, clear responsibility
- **Reusability**: Utilities shared across components
- **Maintainability**: Smaller, focused modules easier to understand
- **Documentation**: Each module clearly documented with examples

### Development Velocity

**Improvements**:

- **Parallel Development**: Teams work on different modules simultaneously
- **Easier Debugging**: Issues isolated to specific functional areas
- **Simpler Refactoring**: Changes affect smaller, focused modules
- **Better IDE Support**: Focused modules with clear exports

## Risk Mitigation

### Risk: Over-Engineering and Premature Optimization

**Probability**: Medium  
**Impact**: Medium  
**Mitigation Strategy**:

- Start with obviously extractable pure functions only
- Avoid creating modules with <10 functions
- Focus on functions already isolated in current code
- Measure complexity reduction vs maintenance overhead

### Risk: Import Dependency Complexity

**Probability**: Medium  
**Impact**: Medium  
**Mitigation Strategy**:

- Maintain clear dependency hierarchy documentation
- Avoid circular dependencies through design
- Use dependency graphs to visualize relationships
- Regular dependency auditing

### Risk: Performance Overhead from Module Boundaries

**Probability**: Low  
**Impact**: Low  
**Mitigation Strategy**:

- Benchmark before/after decomposition
- Focus on maintainability over micro-optimizations
- Monitor build size and load performance
- Tree shaking verification for unused exports

## Definition of Done

### Module Structure

- [ ] 4-5 focused pure function modules created
- [ ] All business logic separated from browser APIs
- [ ] Clear module boundaries and responsibilities
- [ ] Import dependencies properly organized

### Testing Coverage

- [ ] > 90% coverage on each pure function module
- [ ] > 85% overall unit test coverage
- [ ] Unit test suite executes in <2 seconds
- [ ] Zero flaky or unreliable unit tests

### Code Quality

- [ ] All modules follow single responsibility principle
- [ ] Clear documentation for each module's purpose
- [ ] No circular dependencies between modules
- [ ] Consistent coding standards across all modules

### Integration Preservation

- [ ] All existing functionality preserved after decomposition
- [ ] No performance regression in operations
- [ ] E2E tests still pass with new module structure
- [ ] Clear migration path documented

## Dependencies

### Internal Dependencies

- **File Organization Story**: Module structure benefits from organized directories
- **Configuration Management**: Constants module needs centralized config loading
- **Testing Framework**: Jest configuration updates for new modules

### External Dependencies

- **Jest Configuration**: Updates to include new modules in coverage
- **ESLint Rules**: Validation of import/export patterns
- **Node.js Modules**: Standard library functions for utilities

## Related Work

### Epic Integration

- **Framework Maturity Epic**: Better testing enables confident framework development
- **Code Quality**: Decomposed modules improve maintainability
- **Developer Experience**: Faster unit tests improve development velocity

### Story Dependencies

- **File Organization**: Benefits from clear module structure
- **Extensibility**: Pure function modules enable better plugin architecture
- **Data Persistence**: Error handling utilities support robust persistence

### References

- [Framework Maturity Epic](001-framework-maturity-epic.md) - Parent epic context
- [Testability Decomposition Strategy](testability-decomposition.md) - Source analysis
- [Testing Guide](../docs/developer/workflows/testing-guide.md) - Testing standards
- [Testing Decision Matrix](../docs/developer/conventions/testing-decision-matrix.md) - Unit vs E2E boundaries

## Revision History

| Date       | Author           | Changes                                                                                     |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------- |
| 2025-08-14 | Development Team | Initial story created based on testability decomposition analysis and coverage requirements |

---

**IMPORTANT**: This story addresses the fundamental testing architecture challenge by creating unit-testable modules that support the zero-tolerance testing standards while maintaining clear boundaries between pure logic and browser integration.
