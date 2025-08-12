# API Design Principles

## Executive Summary

Comprehensive guide for designing consistent, maintainable, and user-friendly APIs within the Settings Extension project. Covers internal module APIs, extension messaging APIs, and external integrations following modern web development best practices.

## Scope

- **Applies to**: All internal APIs, messaging interfaces, and external integrations
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Core Principles

### 1. Consistency

**Naming Conventions**:

```javascript
// ✅ Good: Consistent naming patterns
class SettingsManager {
  async getSettings(key) {} // get* for retrieval
  async setSettings(key, value) {} // set* for updates
  async hasSettings(key) {} // has* for existence checks
  async deleteSettings(key) {} // delete* for removal
}

// ❌ Bad: Inconsistent naming
class SettingsManager {
  async retrieveSettings(key) {} // retrieve vs get
  async saveSettings(key, value) {} // save vs set
  async checkSettings(key) {} // check vs has
  async removeSettings(key) {} // remove vs delete
}
```

**Response Patterns**:

```javascript
// ✅ Good: Consistent response structure
{
  success: boolean,
  data?: any,
  error?: string,
  metadata?: {
    timestamp: number,
    version: string
  }
}

// Examples:
const successResponse = {
  success: true,
  data: { theme: 'dark', notifications: true },
  metadata: { timestamp: Date.now(), version: '1.2.0' }
};

const errorResponse = {
  success: false,
  error: 'Storage quota exceeded',
  metadata: { timestamp: Date.now(), version: '1.2.0' }
};
```

### 2. Predictability

**Function Signatures**:

```javascript
// ✅ Good: Predictable parameter patterns
async function processData(
  data: object,           // Required positional parameter
  options: object = {}    // Optional configuration object
): Promise<Result> {
  const {
    validate = true,      // Sensible defaults
    timeout = 5000,
    onProgress = null
  } = options;

  // Implementation
}

// Usage examples:
await processData(userData);
await processData(userData, { validate: false });
await processData(userData, { timeout: 10000, onProgress: callback });
```

**Error Handling**:

```javascript
// ✅ Good: Predictable error patterns
class APIError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "APIError";
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
  }
}

// Consistent error codes
const ERROR_CODES = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  STORAGE_QUOTA_EXCEEDED: "STORAGE_QUOTA_EXCEEDED",
  NETWORK_ERROR: "NETWORK_ERROR",
  PERMISSION_DENIED: "PERMISSION_DENIED",
};

// Usage:
throw new APIError("Invalid settings format", ERROR_CODES.VALIDATION_FAILED, {
  field: "theme",
  value: "invalid-theme",
});
```

### 3. Simplicity

**Minimal Surface Area**:

```javascript
// ✅ Good: Simple, focused API
class StorageManager {
  async get(key, defaultValue = null) {}
  async set(key, value) {}
  async remove(key) {}
  async clear() {}

  // Optional: Advanced features as separate methods
  async getBatch(keys) {}
  async setBatch(items) {}
}

// ❌ Bad: Overloaded methods with complex signatures
class StorageManager {
  async manage(operation, key, value, options, callback) {
    // Too many parameters and unclear purpose
  }
}
```

## Internal Module APIs

### Class Design

**Constructor Pattern**:

```javascript
class ExtensionComponent {
  constructor(dependencies = {}) {
    // Dependency injection for testability
    this.storage = dependencies.storage || chrome.storage.local;
    this.messaging = dependencies.messaging || chrome.runtime;
    this.logger = dependencies.logger || console;

    // Configuration with defaults
    this.config = {
      timeout: 5000,
      retryAttempts: 3,
      ...dependencies.config,
    };

    // Internal state
    this._isInitialized = false;
    this._eventListeners = new Set();
  }
}
```

**Fluent Interface Pattern**:

```javascript
// ✅ Good: Chainable API for configuration
class SettingsBuilder {
  constructor() {
    this._settings = {};
  }

  theme(value) {
    this._settings.theme = value;
    return this;
  }

  notifications(enabled) {
    this._settings.notifications = enabled;
    return this;
  }

  interval(minutes) {
    this._settings.syncInterval = minutes;
    return this;
  }

  build() {
    return { ...this._settings };
  }
}

// Usage:
const settings = new SettingsBuilder()
  .theme("dark")
  .notifications(true)
  .interval(30)
  .build();
```

### Async API Design

**Promise-Based APIs**:

```javascript
// ✅ Good: Consistent async patterns
class DataService {
  async fetchData(id) {
    try {
      const response = await this._makeRequest(`/api/data/${id}`);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createData(data) {
    const validationResult = this.validate(data);
    if (!validationResult.valid) {
      return {
        success: false,
        error: "Validation failed",
        details: validationResult.errors,
      };
    }

    try {
      const response = await this._makeRequest("/api/data", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

**Event-Based APIs**:

```javascript
class EventEmittingService extends EventTarget {
  constructor() {
    super();
    this._operations = new Map();
  }

  async startLongRunningOperation(operationId, data) {
    this._operations.set(operationId, { status: "starting" });

    // Emit progress events
    this.dispatchEvent(
      new CustomEvent("operationStart", {
        detail: { operationId, data },
      }),
    );

    try {
      for (let i = 0; i < 100; i += 10) {
        await this._processChunk(data, i);

        this.dispatchEvent(
          new CustomEvent("operationProgress", {
            detail: { operationId, progress: i },
          }),
        );
      }

      this.dispatchEvent(
        new CustomEvent("operationComplete", {
          detail: { operationId, success: true },
        }),
      );
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent("operationError", {
          detail: { operationId, error: error.message },
        }),
      );
    }
  }
}

// Usage:
const service = new EventEmittingService();

service.addEventListener("operationProgress", (event) => {
  console.log(`Progress: ${event.detail.progress}%`);
});

service.addEventListener("operationComplete", (event) => {
  console.log("Operation completed!");
});
```

## Extension Messaging APIs

### Message Structure

**Standard Message Format**:

```javascript
// Message schema
interface ExtensionMessage {
  type: string;              // Message type identifier
  data?: any;               // Message payload
  requestId?: string;       // Unique request identifier
  timestamp?: number;       // Message timestamp
  sender?: {               // Sender context information
    component: string;     // 'popup', 'content', 'background'
    tabId?: number;        // Tab ID if applicable
  };
}

// Example messages:
const getSettingsMessage = {
  type: 'GET_SETTINGS',
  requestId: 'req_001',
  timestamp: Date.now(),
  sender: { component: 'popup' }
};

const saveSettingsMessage = {
  type: 'SAVE_SETTINGS',
  data: { theme: 'dark', notifications: true },
  requestId: 'req_002',
  timestamp: Date.now(),
  sender: { component: 'options' }
};
```

**Response Structure**:

```javascript
interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: string;
  requestId?: string;       // Matches request ID
  timestamp: number;
}

// Example responses:
const successResponse = {
  success: true,
  data: { theme: 'dark', notifications: true },
  requestId: 'req_001',
  timestamp: Date.now()
};

const errorResponse = {
  success: false,
  error: 'Storage quota exceeded',
  requestId: 'req_002',
  timestamp: Date.now()
};
```

### Message Handler Pattern

```javascript
// ✅ Good: Centralized message routing
class MessageRouter {
  constructor() {
    this.handlers = new Map();
    this.middleware = [];

    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }

  registerHandler(type, handler) {
    this.handlers.set(type, handler);
  }

  use(middleware) {
    this.middleware.push(middleware);
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      // Apply middleware
      for (const middleware of this.middleware) {
        const result = await middleware(message, sender);
        if (!result.continue) {
          sendResponse(result.response);
          return;
        }
      }

      // Route to handler
      const handler = this.handlers.get(message.type);
      if (!handler) {
        sendResponse({
          success: false,
          error: `Unknown message type: ${message.type}`,
          timestamp: Date.now(),
        });
        return;
      }

      const response = await handler(message.data, sender);
      sendResponse({
        ...response,
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message,
        requestId: message.requestId,
        timestamp: Date.now(),
      });
    }
  }
}

// Usage:
const router = new MessageRouter();

// Add authentication middleware
router.use(async (message, sender) => {
  if (sender.id !== chrome.runtime.id) {
    return {
      continue: false,
      response: { success: false, error: "Unauthorized" },
    };
  }
  return { continue: true };
});

// Register handlers
router.registerHandler("GET_SETTINGS", async (data, sender) => {
  const settings = await storageManager.get("settings");
  return { success: true, data: settings };
});

router.registerHandler("SAVE_SETTINGS", async (data, sender) => {
  const result = await storageManager.set("settings", data);
  return result;
});
```

### Client-Side Messaging

```javascript
// ✅ Good: Promise-based messaging client
class MessagingClient {
  constructor() {
    this.requestId = 0;
    this.pendingRequests = new Map();

    // Listen for responses
    chrome.runtime.onMessage.addListener(this.handleResponse.bind(this));
  }

  async sendMessage(type, data = null, options = {}) {
    const requestId = `req_${++this.requestId}`;
    const timeout = options.timeout || 5000;

    const message = {
      type,
      data,
      requestId,
      timestamp: Date.now(),
      sender: { component: this.getComponentName() },
    };

    return new Promise((resolve, reject) => {
      // Store pending request
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Message timeout: ${type}`));
      }, timeout);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeoutId,
      });

      // Send message
      chrome.runtime.sendMessage(message).catch((error) => {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  handleResponse(response, sender) {
    if (!response.requestId) return;

    const pending = this.pendingRequests.get(response.requestId);
    if (!pending) return;

    this.pendingRequests.delete(response.requestId);
    clearTimeout(pending.timeoutId);

    if (response.success) {
      pending.resolve(response.data);
    } else {
      pending.reject(new Error(response.error));
    }
  }

  getComponentName() {
    if (typeof chrome !== "undefined" && chrome.extension) {
      const path = location.pathname;
      if (path.includes("popup")) return "popup";
      if (path.includes("options")) return "options";
    }
    return "content";
  }
}

// Usage:
const client = new MessagingClient();

try {
  const settings = await client.sendMessage("GET_SETTINGS");
  console.log("Current settings:", settings);

  await client.sendMessage("SAVE_SETTINGS", { theme: "dark" });
  console.log("Settings saved!");
} catch (error) {
  console.error("Message failed:", error);
}
```

## Data Validation APIs

### Schema-Based Validation

```javascript
// ✅ Good: Declarative validation schemas
class SchemaValidator {
  constructor() {
    this.schemas = new Map();
  }

  defineSchema(name, schema) {
    this.schemas.set(name, schema);
  }

  validate(data, schemaName) {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      throw new Error(`Schema not found: ${schemaName}`);
    }

    return this.validateAgainstSchema(data, schema);
  }

  validateAgainstSchema(data, schema) {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Required field check
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip validation if field is optional and not present
      if (value === undefined && !rules.required) {
        continue;
      }

      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be of type ${rules.type}`);
        continue;
      }

      // Custom validation
      if (rules.validate) {
        const customResult = rules.validate(value, data);
        if (customResult !== true) {
          errors.push(customResult);
        }
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(", ")}`);
      }

      // Range validation
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${field} must be at most ${rules.max}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Define schemas
const validator = new SchemaValidator();

validator.defineSchema("settings", {
  theme: {
    type: "string",
    required: true,
    enum: ["light", "dark", "auto"],
  },
  notifications: {
    type: "boolean",
    required: true,
  },
  syncInterval: {
    type: "number",
    required: false,
    min: 5,
    max: 1440,
  },
  customCSS: {
    type: "string",
    required: false,
    validate: (value) => {
      if (value.length > 10000) {
        return "Custom CSS must be less than 10,000 characters";
      }
      return true;
    },
  },
});

// Usage:
const result = validator.validate(
  {
    theme: "dark",
    notifications: true,
    syncInterval: 30,
  },
  "settings",
);

if (result.valid) {
  console.log("Settings are valid!");
} else {
  console.log("Validation errors:", result.errors);
}
```

## Error Handling Strategies

### Error Classification

```javascript
// ✅ Good: Hierarchical error types
class ExtensionError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

class ValidationError extends ExtensionError {
  constructor(message, field, value) {
    super(message, "VALIDATION_ERROR", { field, value });
  }
}

class StorageError extends ExtensionError {
  constructor(message, operation, key) {
    super(message, "STORAGE_ERROR", { operation, key });
  }
}

class NetworkError extends ExtensionError {
  constructor(message, url, status) {
    super(message, "NETWORK_ERROR", { url, status });
  }
}

// Error handling middleware
function createErrorHandler(logger = console) {
  return (error, context = {}) => {
    const errorInfo = {
      ...(error.toJSON?.() || {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }),
      context,
      timestamp: Date.now(),
    };

    logger.error("Extension error:", errorInfo);

    // Send error to monitoring service (if configured)
    if (typeof reportError === "function") {
      reportError(errorInfo);
    }

    return errorInfo;
  };
}
```

### Graceful Degradation

```javascript
// ✅ Good: APIs that degrade gracefully
class ResilientSettingsManager {
  constructor(primaryStorage, fallbackStorage) {
    this.primaryStorage = primaryStorage;
    this.fallbackStorage = fallbackStorage;
    this.isOnline = navigator.onLine;

    // Monitor connectivity
    window.addEventListener("online", () => (this.isOnline = true));
    window.addEventListener("offline", () => (this.isOnline = false));
  }

  async getSettings(key, defaultValue = null) {
    try {
      // Try primary storage first
      const result = await this.primaryStorage.get(key);
      if (result !== null) {
        return result;
      }
    } catch (primaryError) {
      console.warn("Primary storage failed:", primaryError);

      try {
        // Fall back to secondary storage
        const result = await this.fallbackStorage.get(key);
        if (result !== null) {
          return result;
        }
      } catch (fallbackError) {
        console.warn("Fallback storage failed:", fallbackError);
      }
    }

    // Return default if all storage fails
    return defaultValue;
  }

  async saveSettings(key, value, options = {}) {
    const { requirePrimary = false } = options;
    let primarySuccess = false;
    let fallbackSuccess = false;

    // Try primary storage
    try {
      await this.primaryStorage.set(key, value);
      primarySuccess = true;
    } catch (primaryError) {
      console.warn("Primary storage save failed:", primaryError);

      if (requirePrimary) {
        throw primaryError;
      }
    }

    // Try fallback storage
    if (!primarySuccess) {
      try {
        await this.fallbackStorage.set(key, value);
        fallbackSuccess = true;
      } catch (fallbackError) {
        console.error("All storage methods failed:", fallbackError);
        throw fallbackError;
      }
    }

    return {
      success: true,
      primarySuccess,
      fallbackSuccess: !primarySuccess && fallbackSuccess,
    };
  }
}
```

## Performance Considerations

### Lazy Loading APIs

```javascript
// ✅ Good: Lazy loading for expensive operations
class LazyModuleLoader {
  constructor() {
    this.modules = new Map();
    this.loading = new Map();
  }

  async loadModule(name, factory) {
    // Return cached module
    if (this.modules.has(name)) {
      return this.modules.get(name);
    }

    // Return existing promise if already loading
    if (this.loading.has(name)) {
      return this.loading.get(name);
    }

    // Start loading
    const loadPromise = this.doLoadModule(name, factory);
    this.loading.set(name, loadPromise);

    try {
      const module = await loadPromise;
      this.modules.set(name, module);
      this.loading.delete(name);
      return module;
    } catch (error) {
      this.loading.delete(name);
      throw error;
    }
  }

  async doLoadModule(name, factory) {
    if (typeof factory === "string") {
      // Dynamic import
      const module = await import(factory);
      return module.default || module;
    } else if (typeof factory === "function") {
      // Factory function
      return await factory();
    } else {
      throw new Error(`Invalid factory for module ${name}`);
    }
  }
}

// Usage:
const loader = new LazyModuleLoader();

// Lazy load heavy components
const exportModule = await loader.loadModule(
  "export",
  () => import("./modules/export.js"),
);

const analyticsModule = await loader.loadModule("analytics", async () => {
  const module = await import("./modules/analytics.js");
  return new module.AnalyticsService();
});
```

### Caching Strategies

```javascript
// ✅ Good: Intelligent caching with TTL
class CacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.maxSize = options.maxSize || 100;

    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  get(key, options = {}) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access time for LRU
    entry.lastAccessed = now;
    return entry.value;
  }

  set(key, value, options = {}) {
    const ttl = options.ttl || this.defaultTTL;
    const now = Date.now();

    // Enforce size limit
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      createdAt: now,
      lastAccessed: now,
      expiresAt: now + ttl,
    });
  }

  async getOrSet(key, factory, options = {}) {
    const cached = this.get(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, options);
    return value;
  }

  evictLRU() {
    let oldestEntry = null;
    let oldestKey = null;

    for (const [key, entry] of this.cache) {
      if (!oldestEntry || entry.lastAccessed < oldestEntry.lastAccessed) {
        oldestEntry = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage:
const cache = new CacheManager({ defaultTTL: 600000, maxSize: 50 });

// Cache expensive operations
async function getExpensiveData(id) {
  return cache.getOrSet(`data:${id}`, async () => {
    console.log("Computing expensive data...");
    // Simulate expensive operation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { id, data: "expensive result" };
  });
}
```

## Testing API Design

### Mock-Friendly APIs

```javascript
// ✅ Good: Dependency injection for testability
class TestableService {
  constructor(dependencies = {}) {
    this.httpClient = dependencies.httpClient || new HttpClient();
    this.storage = dependencies.storage || chrome.storage.local;
    this.logger = dependencies.logger || console;
  }

  async fetchData(id) {
    try {
      const response = await this.httpClient.get(`/api/data/${id}`);
      await this.storage.set(`data:${id}`, response.data);
      this.logger.info(`Data cached for ID: ${id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch data for ID: ${id}`, error);
      throw error;
    }
  }
}

// Test with mocks:
describe("TestableService", () => {
  test("should cache fetched data", async () => {
    const mockHttpClient = {
      get: jest.fn().mockResolvedValue({ data: { id: 1, name: "Test" } }),
    };
    const mockStorage = {
      set: jest.fn().mockResolvedValue(undefined),
    };
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const service = new TestableService({
      httpClient: mockHttpClient,
      storage: mockStorage,
      logger: mockLogger,
    });

    const result = await service.fetchData(1);

    expect(result).toEqual({ id: 1, name: "Test" });
    expect(mockStorage.set).toHaveBeenCalledWith("data:1", {
      id: 1,
      name: "Test",
    });
    expect(mockLogger.info).toHaveBeenCalledWith("Data cached for ID: 1");
  });
});
```

## Documentation Standards

### API Documentation Template

````javascript
/**
 * Settings Management Service
 *
 * Provides comprehensive settings management with validation, caching,
 * and cross-browser storage support.
 *
 * @example
 * ```javascript
 * const manager = new SettingsManager();
 *
 * // Get settings with default
 * const theme = await manager.get('theme', 'light');
 *
 * // Save settings
 * await manager.set('theme', 'dark');
 *
 * // Validate and save
 * const result = await manager.setWithValidation('notifications', true);
 * if (!result.success) {
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
class SettingsManager {
  /**
   * Creates a new SettingsManager instance
   *
   * @param {Object} [options={}] - Configuration options
   * @param {Object} [options.storage] - Storage backend (defaults to chrome.storage.local)
   * @param {Object} [options.validator] - Validation service
   * @param {number} [options.cacheTimeout=300000] - Cache timeout in milliseconds
   * @param {boolean} [options.enableSync=true] - Enable cross-device synchronization
   *
   * @throws {Error} When required browser APIs are not available
   */
  constructor(options = {}) {
    // Implementation
  }

  /**
   * Retrieves a setting value
   *
   * @param {string} key - Setting key to retrieve
   * @param {*} [defaultValue=null] - Default value if key doesn't exist
   * @param {Object} [options={}] - Retrieval options
   * @param {boolean} [options.useCache=true] - Whether to use cached values
   *
   * @returns {Promise<*>} The setting value or default value
   *
   * @throws {StorageError} When storage operation fails
   * @throws {ValidationError} When key format is invalid
   *
   * @example
   * ```javascript
   * // Get theme with default
   * const theme = await manager.get('theme', 'light');
   *
   * // Get without cache
   * const freshValue = await manager.get('data', null, { useCache: false });
   * ```
   */
  async get(key, defaultValue = null, options = {}) {
    // Implementation
  }

  /**
   * Sets a setting value
   *
   * @param {string} key - Setting key
   * @param {*} value - Value to store
   * @param {Object} [options={}] - Storage options
   * @param {boolean} [options.validate=true] - Whether to validate the value
   * @param {boolean} [options.sync=true] - Whether to sync across devices
   *
   * @returns {Promise<{success: boolean, error?: string}>} Operation result
   *
   * @throws {ValidationError} When value fails validation
   * @throws {StorageError} When storage operation fails
   *
   * @example
   * ```javascript
   * // Simple set
   * await manager.set('theme', 'dark');
   *
   * // Set without validation
   * await manager.set('debug_data', rawData, { validate: false });
   * ```
   */
  async set(key, value, options = {}) {
    // Implementation
  }
}
````

## Best Practices Summary

### Do's ✅

1. **Use consistent naming patterns** across all APIs
2. **Provide clear error messages** with actionable information
3. **Include comprehensive JSDoc** for all public methods
4. **Design for testability** with dependency injection
5. **Handle edge cases gracefully** with meaningful fallbacks
6. **Version your APIs** when making breaking changes
7. **Use TypeScript or JSDoc** for type documentation
8. **Implement proper validation** for all inputs
9. **Cache expensive operations** appropriately
10. **Follow semantic versioning** for API changes

### Don'ts ❌

1. **Don't change existing API signatures** without version bumping
2. **Don't expose internal implementation details** in public APIs
3. **Don't use generic error messages** like "Something went wrong"
4. **Don't ignore error cases** or fail silently
5. **Don't create overly complex APIs** with too many parameters
6. **Don't use abbreviations** in API names unless widely understood
7. **Don't forget to handle async operations** properly
8. **Don't skip input validation** for security-critical operations
9. **Don't create tight coupling** between unrelated components
10. **Don't leave APIs undocumented** or with outdated docs

## References

- [MDN Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [RESTful API Design](https://restfulapi.net/)
- [API Design Patterns](https://microservice-api-patterns.org/)
- [JavaScript Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)

## Revision History

| Date       | Author         | Changes                       |
| ---------- | -------------- | ----------------------------- |
| 2025-08-11 | Developer Team | Initial API design principles |
