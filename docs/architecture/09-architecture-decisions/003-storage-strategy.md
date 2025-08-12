# ADR-003: Browser Storage Strategy

## Status

**Accepted** - 2025-08-11

## Context

The Settings Extension requires a robust storage strategy to persist user settings across browser sessions and potentially synchronize them across devices. Several storage options are available for browser extensions:

### Storage Options Analysis

1. **browser.storage.local**: Local browser storage with larger quotas
2. **browser.storage.sync**: Cloud-synchronized storage with smaller quotas
3. **browser.storage.session**: Session-only storage (lost when browser closes)
4. **IndexedDB**: Low-level database API with complex operations
5. **localStorage**: Web storage API (limited in extension contexts)
6. **External APIs**: Third-party storage services

### Key Requirements

**Functional Requirements:**

- Store structured settings data (JSON objects)
- Support different data types (boolean, text, number, JSON)
- Persist settings across browser restarts
- Optional synchronization across user's devices
- Import/export capability for settings backup

**Non-Functional Requirements:**

- Performance: < 100ms for read/write operations
- Reliability: 99.9% success rate for storage operations
- Capacity: Support up to 1MB of settings data
- Security: Secure storage of potentially sensitive settings
- Cross-browser compatibility (Chrome, Firefox)

### Storage Comparison

| Storage Type        | Quota    | Performance       | Sync   | Security        | Complexity |
| ------------------- | -------- | ----------------- | ------ | --------------- | ---------- |
| **storage.local**   | ~10MB    | Fast              | No     | Browser-managed | Low        |
| **storage.sync**    | ~100KB   | Medium            | Yes    | Browser-managed | Low        |
| **storage.session** | ~10MB    | Fast              | No     | Browser-managed | Low        |
| **IndexedDB**       | ~1GB+    | Variable          | No     | Browser-managed | High       |
| **localStorage**    | ~5MB     | Fast              | No     | Limited         | Medium     |
| **External APIs**   | Variable | Network-dependent | Custom | Custom          | High       |

### Cross-Browser Considerations

| Browser     | storage.local | storage.sync | IndexedDB    | localStorage |
| ----------- | ------------- | ------------ | ------------ | ------------ |
| **Chrome**  | Full support  | Full support | Full support | Limited      |
| **Firefox** | Full support  | Full support | Full support | Limited      |
| **Edge**    | Full support  | Full support | Full support | Limited      |

## Decision

**We will implement a hybrid storage strategy using primarily browser.storage.local with optional browser.storage.sync for user-selected settings synchronization.**

### Primary Strategy Components

1. **browser.storage.local** as the primary storage mechanism
2. **browser.storage.sync** for optional cross-device synchronization
3. **In-memory caching** for performance optimization
4. **Storage adapter pattern** for cross-browser compatibility
5. **Graceful degradation** with fallback mechanisms

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Settings Storage Architecture               │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   Application   │    │        Storage Adapter         │ │
│  │     Layer       │───▶│       (Abstraction)            │ │
│  └─────────────────┘    └─────────────────┬───────────────┘ │
│                                          │                 │
│                         ┌────────────────▼───────────────┐ │
│                         │        Memory Cache            │ │
│                         │      (Performance Layer)      │ │
│                         └────────────────┬───────────────┘ │
│                                          │                 │
│                    ┌─────────────────────▼─────────────┐   │
│                    │       Storage Router              │   │
│                    │    (Local vs Sync Decision)      │   │
│                    └─────────┬─────────────────────────┘   │
│                              │                             │
│              ┌───────────────▼───────────────┐             │
│              │                               │             │
│    ┌─────────▼─────────┐           ┌─────────▼─────────┐   │
│    │  browser.storage  │           │  browser.storage  │   │
│    │      .local       │           │      .sync        │   │
│    │   (Primary)       │           │   (Optional)      │   │
│    └───────────────────┘           └───────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Consequences

### Positive Consequences

✅ **Performance Optimization**

- In-memory caching provides sub-50ms access for frequently used settings
- browser.storage.local offers fast, reliable local persistence
- Batch operations reduce API call overhead
- Smart cache invalidation minimizes storage API calls

✅ **Reliability and Data Safety**

- Browser-managed storage provides automatic backup and recovery
- Atomic update operations prevent data corruption
- Multiple fallback mechanisms ensure data availability
- Built-in browser security protects stored data

✅ **Cross-Browser Compatibility**

- Consistent API across Chrome and Firefox
- Browser abstraction layer handles API differences
- Feature detection enables graceful degradation
- Standard browser storage ensures long-term compatibility

✅ **User Experience Benefits**

- Optional cross-device synchronization through browser.storage.sync
- Fast settings access without network dependencies
- Offline functionality with local storage
- Import/export capabilities for user control

✅ **Developer Experience**

- Simple, well-documented browser APIs
- No external dependencies or complex setup
- Easy to test and debug storage operations
- Clear error handling and recovery patterns

### Negative Consequences

❌ **Storage Limitations**

- browser.storage.local limited to ~10MB per extension
- browser.storage.sync limited to ~100KB with strict quotas
- No built-in compression or optimization features
- May need manual data cleanup for large configurations

❌ **Synchronization Constraints**

- Sync storage limited to small data sets
- No control over sync timing or conflict resolution
- Dependent on browser's sync infrastructure
- May not sync immediately across devices

❌ **Limited Query Capabilities**

- Key-value storage model limits complex queries
- No built-in indexing or search capabilities
- Must load and filter data in application layer
- Performance degrades with large data sets

❌ **Browser Dependencies**

- Tied to browser storage implementation and bugs
- Limited control over storage behavior and performance
- Cannot optimize storage format or compression
- Dependent on browser quota management

### Risk Mitigation Strategies

**For Storage Limitations:**

- Implement data compression for large settings
- Provide quota monitoring and warnings
- Enable selective sync for important settings only
- Implement data cleanup and archiving features

**For Synchronization Issues:**

- Clear user communication about sync limitations
- Fallback to local storage when sync fails
- Implement conflict resolution strategies
- Provide manual sync trigger options

**For Performance Concerns:**

- Implement intelligent caching strategies
- Use batch operations for bulk updates
- Monitor performance metrics and optimize
- Provide loading states for slower operations

## Implementation Details

### Storage Adapter Interface

```javascript
class StorageAdapter {
  constructor(options = {}) {
    this.useSync = options.enableSync || false;
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
  }

  async get(keys) {
    // Try cache first
    const cachedResults = this.getCached(keys);
    const uncachedKeys = keys.filter((key) => !cachedResults.has(key));

    if (uncachedKeys.length === 0) {
      return Object.fromEntries(cachedResults);
    }

    // Fetch uncached data from storage
    try {
      const storageResult = await this.getFromStorage(uncachedKeys);

      // Update cache
      Object.entries(storageResult).forEach(([key, value]) => {
        this.updateCache(key, value);
      });

      // Merge cached and fresh data
      return { ...Object.fromEntries(cachedResults), ...storageResult };
    } catch (error) {
      console.error("Storage get failed:", error);
      // Return cached data if available, otherwise throw
      if (cachedResults.size > 0) {
        return Object.fromEntries(cachedResults);
      }
      throw error;
    }
  }

  async set(items) {
    try {
      // Update storage first
      await this.setInStorage(items);

      // Update cache on successful storage
      Object.entries(items).forEach(([key, value]) => {
        this.updateCache(key, value);
      });
    } catch (error) {
      console.error("Storage set failed:", error);
      throw error;
    }
  }

  async getFromStorage(keys) {
    const storage = this.getStorageAPI();
    return await storage.get(keys);
  }

  async setInStorage(items) {
    const storage = this.getStorageAPI();
    await storage.set(items);
  }

  getStorageAPI() {
    // Decide between local and sync storage based on configuration
    const api =
      typeof chrome !== "undefined" ? chrome.storage : browser.storage;
    return this.useSync ? api.sync : api.local;
  }

  getCached(keys) {
    const results = new Map();
    const now = Date.now();

    keys.forEach((key) => {
      const cached = this.cache.get(key);
      if (cached && now - cached.timestamp < this.cacheTimeout) {
        results.set(key, cached.value);
      }
    });

    return results;
  }

  updateCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }
}
```

### Settings Manager Storage Integration

```javascript
class SettingsManager {
  constructor(options = {}) {
    this.storage = new StorageAdapter(options.storage);
    this.settings = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      // Load defaults first
      const defaults = await this.loadDefaults();

      // Load stored settings
      const stored = await this.storage.get(Object.keys(defaults));

      // Merge and validate
      this.settings = this.mergeSettings(defaults, stored);
      this.initialized = true;
    } catch (error) {
      console.error("Settings initialization failed:", error);
      // Use defaults only
      this.settings = await this.loadDefaults();
      this.initialized = true;
    }
  }

  async getSetting(key) {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.settings.get(key);
  }

  async updateSetting(key, value) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Validate value
    this.validateSetting(key, value);

    // Update in memory
    this.settings.set(key, value);

    // Persist to storage
    await this.storage.set({ [key]: value });

    // Emit change event
    this.emitChange(key, value);
  }

  async exportSettings() {
    const settingsObj = Object.fromEntries(this.settings);
    return JSON.stringify(settingsObj, null, 2);
  }

  async importSettings(jsonString) {
    try {
      const imported = JSON.parse(jsonString);

      // Validate all settings
      for (const [key, value] of Object.entries(imported)) {
        this.validateSetting(key, value);
      }

      // Update storage in batch
      await this.storage.set(imported);

      // Update in-memory settings
      Object.entries(imported).forEach(([key, value]) => {
        this.settings.set(key, value);
      });

      // Emit batch change event
      this.emitBatchChange(imported);
    } catch (error) {
      throw new Error(`Import failed: ${error.message}`);
    }
  }
}
```

### Storage Configuration

```javascript
const STORAGE_CONFIG = {
  // Primary storage configuration
  primary: {
    type: "local",
    quota: 10 * 1024 * 1024, // 10MB
    timeout: 5000, // 5 seconds
  },

  // Sync storage configuration
  sync: {
    type: "sync",
    quota: 100 * 1024, // 100KB
    timeout: 10000, // 10 seconds
    maxItems: 512,
    maxItemSize: 8 * 1024, // 8KB per item
  },

  // Cache configuration
  cache: {
    maxSize: 1000,
    timeout: 300000, // 5 minutes
    enableTTL: true,
  },

  // Settings that should be synced (if sync enabled)
  syncSettings: [
    "theme_preference",
    "language",
    "notification_enabled",
    "auto_save",
  ],
};
```

### Error Handling and Recovery

```javascript
class StorageErrorHandler {
  static async handleStorageError(error, operation, context = {}) {
    console.error(`Storage ${operation} failed:`, error, context);

    switch (error.name) {
      case "QuotaExceededError":
        return this.handleQuotaExceeded(context);

      case "NetworkError":
        return this.handleNetworkError(operation, context);

      case "DataCloneError":
        return this.handleDataCloneError(context);

      default:
        return this.handleUnknownError(error, operation, context);
    }
  }

  static async handleQuotaExceeded(context) {
    // Attempt to free space
    await this.cleanupOldData();

    // Notify user
    this.notifyUser(
      "Storage quota exceeded. Some data may have been cleaned up.",
    );

    // Return safe defaults
    return this.getSafeDefaults(context);
  }

  static async handleNetworkError(operation, context) {
    if (operation === "sync") {
      // Fall back to local storage
      console.warn("Sync failed, using local storage");
      return this.fallbackToLocal(context);
    }

    throw new Error("Network error during storage operation");
  }
}
```

## Alternatives Considered

### Alternative 1: IndexedDB

**Rejected** because:

- Significantly more complex API and implementation
- Overkill for key-value settings storage
- No built-in synchronization capabilities
- More difficult to implement cross-browser compatibility
- Higher learning curve for team

### Alternative 2: External Storage Service

**Rejected** because:

- Adds external dependency and potential service downtime
- Requires API key management and authentication
- Privacy concerns with third-party data storage
- Additional complexity for GDPR compliance
- Network dependency affects offline functionality

### Alternative 3: localStorage Only

**Rejected** because:

- Limited availability in extension contexts
- No synchronization capabilities
- Smaller storage quotas
- No built-in JSON serialization
- Less reliable than browser.storage APIs

### Alternative 4: Hybrid IndexedDB + browser.storage

**Deferred** because:

- Adds significant implementation complexity
- Current requirements don't justify the complexity
- Can be implemented later if storage needs grow
- Team expertise better aligned with simpler solution

## Success Metrics

This storage strategy will be evaluated based on:

1. **Performance Metrics**:
   - Settings read operations < 50ms (95th percentile)
   - Settings write operations < 100ms (95th percentile)
   - Cache hit ratio > 80% for frequently accessed settings
   - Memory usage < 2MB for storage layer

2. **Reliability Metrics**:
   - Storage operation success rate > 99.9%
   - Zero data loss incidents
   - Recovery success rate > 95% for storage errors
   - Sync success rate > 90% when enabled

3. **User Experience Metrics**:
   - Settings load time < 500ms on extension startup
   - Import/export operations < 2 seconds
   - Cross-device sync completion < 30 seconds
   - Zero user-reported data corruption issues

## Review Schedule

This decision will be reviewed:

- **3 months**: Performance and reliability assessment
- **6 months**: User feedback and sync effectiveness evaluation
- **12 months**: Consider advanced features (compression, advanced caching)
- **As needed**: If storage quotas or browser APIs change significantly

## Related Decisions

- [ADR-001: Manifest V3 Adoption](001-manifest-v3.md) - Influences available storage APIs
- [ADR-002: Vanilla JavaScript Approach](002-vanilla-javascript.md) - Affects storage layer implementation complexity

## Future Considerations

This storage strategy may be enhanced with:

- Data compression for large settings objects
- Advanced caching strategies (LRU, intelligent prefetching)
- Selective sync based on setting priority
- Storage analytics and optimization
- Migration to IndexedDB if complex querying becomes necessary

## References

- [Chrome Extension Storage APIs](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Firefox WebExtension Storage](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage)
- [Browser Storage Quotas and Limitations](https://developer.chrome.com/docs/extensions/mv3/declare_permissions/)
- [Storage Performance Best Practices](https://developer.chrome.com/docs/extensions/mv3/devguide/)

## Revision History

| Date       | Author            | Changes                      |
| ---------- | ----------------- | ---------------------------- |
| 2025-08-11 | Architecture Team | Initial storage strategy ADR |
