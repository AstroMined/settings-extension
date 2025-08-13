# Settings Extension Troubleshooting Guide

This comprehensive troubleshooting guide covers common issues when integrating the Settings Extension framework into Manifest V3 browser extensions, with advanced debugging techniques and solutions.

## Executive Summary

This guide provides systematic troubleshooting for the most common issues developers encounter when integrating the sophisticated Settings Extension framework. Issues are organized by category with specific symptoms, causes, and proven solutions based on the production implementation.

## Critical MV3 Issues

### 1. "Message Port Closed Before Response Received" Error

**Symptoms:**
- Error appears in popup or content script console
- Settings operations fail silently
- Background script logs show successful operations
- Intermittent failures during async operations

**Root Cause:**
Using `async function handleMessage()` in the background script. This returns `Promise.resolve(true)` instead of `true`, causing Chrome to close the message port before async operations complete.

**Diagnostic Code:**
```javascript
// Test if this is the issue
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // ❌ This pattern causes port closed errors
  const result = await someAsyncOperation();
  sendResponse(result);
  return true; // Actually returns Promise.resolve(true)
});
```

**Solution - Use Sync/Async Separation Pattern:**
```javascript
// ✅ Correct pattern (from production background.js)
chrome.runtime.onMessage.addListener(handleMessage);

function handleMessage(message, sender, sendResponse) {
  // Handle sync messages immediately
  if (message.type === "PING") {
    sendResponse({ pong: true, timestamp: Date.now() });
    return false; // Don't keep port open for sync
  }

  // Delegate async operations
  processAsyncMessage(message, sender, sendResponse);
  return true; // Keep port open for async response
}

async function processAsyncMessage(message, sender, sendResponse) {
  try {
    switch (message.type) {
      case "GET_SETTING":
        const result = await settingsManager.getSetting(message.key);
        sendResponse({ value: result });
        break;
      // ... other cases
    }
  } catch (error) {
    sendResponse({ error: error.message });
  }
}
```

**Prevention:**
- Never use `async function` directly with `chrome.runtime.onMessage.addListener()`
- Always separate synchronous and asynchronous message handling
- Use the exact patterns from the production `background.js`

### 2. Service Worker Terminated/Not Responding

**Symptoms:**
- Settings operations timeout
- Background script console shows "Service Worker terminated"
- Popup fails to load settings
- Extension appears non-functional

**Root Causes:**
- Service worker idle timeout (30 seconds default)
- No keep-alive mechanism
- Heavy initialization blocking event loop
- Unregistered event listeners

**Diagnostic Commands:**
```javascript
// Test service worker status
chrome.runtime.sendMessage({ type: "PING" })
  .then(response => console.log("SW alive:", response))
  .catch(error => console.error("SW dead:", error));

// Check if SW is running
chrome.management.get(chrome.runtime.id, (info) => {
  console.log("Extension enabled:", info.enabled);
});
```

**Solution - Implement Keep-Alive Management:**
```javascript
// From production background.js
// CRITICAL: Register listeners at TOP LEVEL before any imports
chrome.runtime.onMessage.addListener(handleMessage);
chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleStartup);
chrome.storage.onChanged.addListener(handleStorageChange);

// Keep-alive alarm to prevent termination
chrome.alarms.create("keep-alive", { periodInMinutes: 0.42 }); // 25 seconds
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keep-alive") {
    chrome.runtime.getPlatformInfo(() => {
      console.debug("Service worker keep-alive ping");
    });
  }
});

// Import dependencies AFTER event listeners
importScripts("lib/browser-compat.js", "lib/settings-manager.js");

// Initialize immediately (no lazy loading)
initializeSettingsOnStartup();
```

**Advanced Diagnostics:**
```javascript
// Monitor service worker lifecycle
setInterval(() => {
  console.log("SW heartbeat:", new Date().toISOString());
}, 10000);

// Track initialization state
console.log("SW registration order:");
console.log("1. Event listeners registered");
console.log("2. Dependencies imported");
console.log("3. Settings manager initializing...");
```

### 3. Settings Manager Initialization Failures

**Symptoms:**
- "Settings manager not available" errors
- Fallback initialization triggered repeatedly
- Settings operations return null/undefined
- Extension works intermittently

**Root Causes:**
- Race conditions during initialization
- Storage permissions missing
- Corrupt settings data
- Browser compatibility issues

**Diagnostic Code:**
```javascript
// Test initialization sequence
async function diagnoseInitialization() {
  console.log("=== Settings Manager Diagnostics ===");
  
  try {
    // Check storage permissions
    const permissions = await chrome.permissions.contains({
      permissions: ["storage"]
    });
    console.log("Storage permission:", permissions);
    
    // Test storage access
    await chrome.storage.local.set({ test: "value" });
    const result = await chrome.storage.local.get("test");
    console.log("Storage test:", result);
    
    // Test settings manager
    const manager = new SettingsManager();
    await manager.initialize();
    console.log("Settings manager initialized successfully");
    
    const settings = await manager.getAllSettings();
    console.log("Settings loaded:", Object.keys(settings).length);
    
  } catch (error) {
    console.error("Initialization diagnostic failed:", error);
    console.error("Stack trace:", error.stack);
  }
}

// Run diagnostic
diagnoseInitialization();
```

**Solution - Robust Initialization Pattern:**
```javascript
// From production background.js
async function initializeSettingsOnStartup() {
  try {
    console.log("Initializing settings manager on startup...");
    settingsManager = new SettingsManager();
    await settingsManager.initialize();
    console.log("Settings manager initialized successfully");
  } catch (error) {
    console.error("Failed to initialize settings manager:", error);
    
    // Multi-level fallback system
    try {
      // Fallback 1: Embedded defaults
      settingsManager = new SettingsManager();
      await settingsManager.initializeWithEmbeddedDefaults();
      console.log("Settings manager initialized with fallback defaults");
    } catch (fallbackError) {
      console.error("Even fallback initialization failed:", fallbackError);
      
      // Fallback 2: Clear corrupt data and retry
      try {
        await chrome.storage.local.clear();
        settingsManager = new SettingsManager();
        await settingsManager.initializeWithEmbeddedDefaults();
        console.log("Settings manager initialized after storage clear");
      } catch (finalError) {
        console.error("All initialization attempts failed:", finalError);
        settingsManager = null;
      }
    }
  }
}
```

## Content Script Issues

### 4. Connection Timeouts and Retry Logic

**Symptoms:**
- "Timeout getting setting" errors
- Intermittent failures in content scripts
- Slow response times
- Settings not loading on some pages

**Root Causes:**
- Network latency affecting message passing
- Service worker startup delay
- Heavy page blocking message processing
- Default timeout too short

**Diagnostic Code:**
```javascript
// Test connection latency
async function testConnectionLatency() {
  const settings = new ContentScriptSettings();
  const iterations = 5;
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await settings.getSetting("feature_enabled");
      const duration = performance.now() - start;
      results.push(duration);
      console.log(`Iteration ${i + 1}: ${duration.toFixed(2)}ms`);
    } catch (error) {
      console.error(`Iteration ${i + 1} failed:`, error);
      results.push(null);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const successful = results.filter(r => r !== null);
  if (successful.length > 0) {
    const avg = successful.reduce((a, b) => a + b) / successful.length;
    console.log(`Average latency: ${avg.toFixed(2)}ms`);
    console.log(`Success rate: ${(successful.length / iterations * 100).toFixed(1)}%`);
  }
}

testConnectionLatency();
```

**Solution - Implement Robust Retry Logic:**
```javascript
// Production content script pattern with retry logic
class RobustSettingsClient {
  constructor() {
    this.settings = new ContentScriptSettings();
    // Increase timeout for slower networks/pages
    this.settings.setMessageTimeout(10000); // 10 second timeout
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second base delay
  }

  async getSettingWithRetry(key, attempt = 1) {
    try {
      return await this.settings.getSetting(key);
    } catch (error) {
      console.warn(`Attempt ${attempt} failed for setting '${key}':`, error.message);
      
      if (attempt >= this.maxRetries) {
        console.error(`All ${this.maxRetries} attempts failed for setting '${key}'`);
        throw new Error(`Failed to get setting '${key}' after ${this.maxRetries} attempts: ${error.message}`);
      }
      
      // Exponential backoff
      const delay = this.baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.getSettingWithRetry(key, attempt + 1);
    }
  }

  async testConnection() {
    try {
      const start = performance.now();
      await chrome.runtime.sendMessage({ type: "PING" });
      const duration = performance.now() - start;
      console.log(`Connection test successful: ${duration.toFixed(2)}ms`);
      return true;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }
}
```

### 5. Cache Inconsistency Issues

**Symptoms:**
- Settings UI shows wrong values
- Changes not reflected immediately
- Stale data displayed
- Inconsistent behavior across tabs

**Root Causes:**
- Cache not invalidated properly
- Race conditions during updates
- Missing change listeners
- Manual cache manipulation

**Diagnostic Code:**
```javascript
// Cache consistency checker
function diagnoseCacheConsistency() {
  const settings = new ContentScriptSettings();
  
  console.log("=== Cache Consistency Diagnostic ===");
  
  // Get cached settings
  const cached = settings.getCachedSettings();
  console.log("Cached settings:", Object.keys(cached));
  
  // Compare with fresh data
  settings.getAllSettings()
    .then(fresh => {
      console.log("Fresh settings:", Object.keys(fresh));
      
      // Check for discrepancies
      for (const [key, cachedSetting] of Object.entries(cached)) {
        const freshSetting = fresh[key];
        if (!freshSetting) {
          console.warn(`Setting '${key}' in cache but not in fresh data`);
        } else if (JSON.stringify(cachedSetting) !== JSON.stringify(freshSetting)) {
          console.warn(`Setting '${key}' cache mismatch:`, {
            cached: cachedSetting,
            fresh: freshSetting
          });
        }
      }
      
      // Check for missing cached settings
      for (const key of Object.keys(fresh)) {
        if (!cached[key]) {
          console.warn(`Setting '${key}' missing from cache`);
        }
      }
    })
    .catch(error => {
      console.error("Failed to get fresh settings for comparison:", error);
    });
}

// Run diagnostic
diagnoseCacheConsistency();
```

**Solution - Proper Cache Management:**
```javascript
// Proper cache usage pattern
class CacheAwareSettingsClient {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.setupChangeListeners();
  }
  
  setupChangeListeners() {
    this.settings.addChangeListener((event, data) => {
      console.log(`Cache invalidation - ${event}:`, data);
      
      switch (event) {
        case "changed":
          // Cache automatically updated by ContentScriptSettings
          this.handleIndividualChanges(data);
          break;
          
        case "imported":
        case "reset":
          // Force full cache refresh for bulk operations
          this.handleBulkChanges(data);
          break;
      }
    });
  }
  
  // Use cached data for performance-critical operations
  getFeatureEnabledSync() {
    const cached = this.settings.getCachedSetting("feature_enabled");
    if (cached) {
      return cached.value;
    } else {
      // Cache miss - trigger async load
      this.settings.getSetting("feature_enabled").catch(console.error);
      return null; // or default value
    }
  }
  
  // Force cache refresh when needed
  async refreshCache() {
    this.settings.clearCache();
    const settings = await this.settings.getAllSettings();
    console.log("Cache refreshed with", Object.keys(settings).length, "settings");
    return settings;
  }
}
```

## Storage and Performance Issues

### 6. Storage Quota Exceeded

**Symptoms:**
- "Storage quota exceeded" errors
- Settings fail to save
- Extension becomes non-functional
- Browser storage warnings

**Diagnostic Code:**
```javascript
// Storage quota diagnostic
async function diagnoseStorageQuota() {
  console.log("=== Storage Quota Diagnostic ===");
  
  try {
    const settingsManager = new SettingsManager();
    
    // Get storage statistics
    const stats = await settingsManager.getStorageStats();
    console.log("Storage Statistics:", stats);
    
    // Check quota
    const quota = await settingsManager.checkStorageQuota();
    console.log("Storage Quota:", quota);
    
    if (quota.percentUsed > 80) {
      console.warn("⚠️ Storage usage high:", `${quota.percentUsed.toFixed(1)}%`);
    }
    
    if (quota.percentUsed > 95) {
      console.error("❌ Storage quota critically high:", `${quota.percentUsed.toFixed(1)}%`);
    }
    
    // List all stored items by size
    const storage = await chrome.storage.local.get();
    const sizes = Object.entries(storage).map(([key, value]) => ({
      key,
      size: JSON.stringify(value).length,
      sizeKB: (JSON.stringify(value).length / 1024).toFixed(2)
    })).sort((a, b) => b.size - a.size);
    
    console.log("Storage items by size:", sizes);
    
  } catch (error) {
    console.error("Storage quota diagnostic failed:", error);
  }
}

diagnoseStorageQuota();
```

**Solution - Storage Management:**
```javascript
// Storage quota monitoring and management
class StorageManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.quotaThreshold = 0.8; // 80%
  }
  
  async monitorQuotaUsage() {
    try {
      const quota = await this.settingsManager.checkStorageQuota();
      
      if (quota.percentUsed > this.quotaThreshold * 100) {
        console.warn("Storage quota threshold exceeded:", quota);
        await this.handleHighUsage(quota);
      }
      
      return quota;
    } catch (error) {
      console.error("Quota monitoring failed:", error);
      return null;
    }
  }
  
  async handleHighUsage(quota) {
    console.log("Handling high storage usage...");
    
    // Strategy 1: Clean up old/unused data
    await this.cleanupStorage();
    
    // Strategy 2: Compress large settings
    await this.compressLargeSettings();
    
    // Strategy 3: Move to sync storage if available
    if (this.settingsManager.getBrowserAPI().storage.sync) {
      await this.migrateSyncableData();
    }
    
    // Re-check quota
    const newQuota = await this.settingsManager.checkStorageQuota();
    console.log("Storage usage after cleanup:", newQuota);
    
    return newQuota;
  }
  
  async cleanupStorage() {
    // Remove old export files, temporary data, etc.
    const storage = await chrome.storage.local.get();
    const keysToRemove = Object.keys(storage).filter(key => 
      key.startsWith('temp_') || 
      key.startsWith('cache_') ||
      key.includes('_export_')
    );
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log("Cleaned up", keysToRemove.length, "temporary items");
    }
  }
}
```

### 7. Performance Degradation

**Symptoms:**
- Slow settings operations
- UI lag when changing settings
- High CPU usage in background script
- Extension impacts browser performance

**Performance Diagnostic:**
```javascript
// Performance profiler for settings operations
class SettingsPerformanceProfiler {
  constructor() {
    this.metrics = [];
  }
  
  async profileSettingsOperations() {
    const settings = new ContentScriptSettings();
    const operations = [
      { name: "getSetting", fn: () => settings.getSetting("feature_enabled") },
      { name: "getMultipleSettings", fn: () => settings.getSettings(["feature_enabled", "api_key", "refresh_interval"]) },
      { name: "getAllSettings", fn: () => settings.getAllSettings() },
      { name: "updateSetting", fn: () => settings.updateSetting("feature_enabled", true) },
      { name: "getCachedSetting", fn: () => settings.getCachedSetting("feature_enabled") }
    ];
    
    for (const operation of operations) {
      const metrics = await this.profileOperation(operation.name, operation.fn);
      this.metrics.push(metrics);
    }
    
    this.reportResults();
  }
  
  async profileOperation(name, operation, iterations = 5) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await operation();
        const duration = performance.now() - start;
        results.push({ success: true, duration });
      } catch (error) {
        const duration = performance.now() - start;
        results.push({ success: false, duration, error: error.message });
      }
      
      // Prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const successful = results.filter(r => r.success);
    const avgDuration = successful.length > 0 
      ? successful.reduce((sum, r) => sum + r.duration, 0) / successful.length 
      : 0;
    
    return {
      name,
      iterations,
      successRate: (successful.length / iterations) * 100,
      avgDuration: avgDuration.toFixed(2),
      results
    };
  }
  
  reportResults() {
    console.log("=== Settings Performance Report ===");
    console.table(this.metrics.map(m => ({
      Operation: m.name,
      "Success Rate": `${m.successRate.toFixed(1)}%`,
      "Avg Duration": `${m.avgDuration}ms`
    })));
    
    // Identify performance issues
    const slowOperations = this.metrics.filter(m => parseFloat(m.avgDuration) > 100);
    if (slowOperations.length > 0) {
      console.warn("⚠️ Slow operations detected:", slowOperations.map(m => m.name));
    }
  }
}

// Run performance profile
const profiler = new SettingsPerformanceProfiler();
profiler.profileSettingsOperations();
```

**Performance Optimization Solutions:**
```javascript
// Optimized settings client for high-performance scenarios
class OptimizedSettingsClient {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.batchQueue = [];
    this.batchTimer = null;
    this.batchDelay = 50; // 50ms batching window
    this.cache = new Map();
    this.cacheMaxAge = 30000; // 30 seconds
  }
  
  // Batch multiple operations together
  async batchOperation(operation) {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ operation, resolve, reject });
      
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.batchDelay);
      }
    });
  }
  
  async processBatch() {
    const batch = this.batchQueue.splice(0);
    this.batchTimer = null;
    
    if (batch.length === 0) return;
    
    try {
      // Group operations by type
      const getOperations = batch.filter(b => b.operation.type === 'get');
      const updateOperations = batch.filter(b => b.operation.type === 'update');
      
      // Batch get operations
      if (getOperations.length > 0) {
        const keys = getOperations.map(op => op.operation.key);
        const results = await this.settings.getSettings(keys);
        
        getOperations.forEach(op => {
          op.resolve(results[op.operation.key]);
        });
      }
      
      // Batch update operations  
      if (updateOperations.length > 0) {
        const updates = {};
        updateOperations.forEach(op => {
          updates[op.operation.key] = op.operation.value;
        });
        
        await this.settings.updateSettings(updates);
        updateOperations.forEach(op => op.resolve(true));
      }
      
    } catch (error) {
      batch.forEach(op => op.reject(error));
    }
  }
  
  // Intelligent caching with TTL
  async getSettingCached(key, maxAge = this.cacheMaxAge) {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < maxAge) {
      return cached.value;
    }
    
    // Cache miss or expired - fetch fresh data
    const value = await this.batchOperation({
      type: 'get',
      key: key
    });
    
    this.cache.set(key, {
      value,
      timestamp: now
    });
    
    return value;
  }
}
```

## Browser Compatibility Issues

### 8. Firefox/Edge Compatibility Problems

**Symptoms:**
- Extension works in Chrome but fails in Firefox/Edge
- API differences causing errors
- Different storage behaviors
- Permission handling variations

**Diagnostic Code:**
```javascript
// Browser compatibility diagnostic
function diagnoseBrowserCompatibility() {
  console.log("=== Browser Compatibility Diagnostic ===");
  
  const browserAPI = window.browserAPI || self.browserAPI;
  if (!browserAPI) {
    console.error("❌ browserAPI not available - browser-compat.js not loaded?");
    return;
  }
  
  const env = browserAPI.environment;
  console.log("Browser Environment:", env);
  console.log("Browser Info:", browserAPI.getBrowserInfo());
  
  // Test API availability
  const apis = [
    "storage.local",
    "storage.sync", 
    "runtime.sendMessage",
    "runtime.onMessage",
    "tabs.query",
    "tabs.sendMessage"
  ];
  
  apis.forEach(apiPath => {
    const available = browserAPI.utils.isAPIAvailable(apiPath);
    console.log(`${apiPath}: ${available ? '✅' : '❌'}`);
  });
  
  // Test storage operations
  testStorageCompatibility();
}

async function testStorageCompatibility() {
  const browserAPI = window.browserAPI || self.browserAPI;
  
  try {
    // Test local storage
    await browserAPI.storage.local.set({ test_local: "value" });
    const localResult = await browserAPI.storage.local.get("test_local");
    console.log("Local storage test:", localResult.test_local === "value" ? "✅" : "❌");
    
    // Test sync storage (may not be available)
    if (browserAPI.storage.sync) {
      await browserAPI.storage.sync.set({ test_sync: "value" });
      const syncResult = await browserAPI.storage.sync.get("test_sync");
      console.log("Sync storage test:", syncResult.test_sync === "value" ? "✅" : "❌");
    } else {
      console.log("Sync storage: ❌ Not available");
    }
    
  } catch (error) {
    console.error("Storage compatibility test failed:", error);
  }
}

diagnoseBrowserCompatibility();
```

**Solution - Use Browser Compatibility Layer:**
```javascript
// Proper browser compatibility usage
class CrossBrowserSettingsClient {
  constructor() {
    // Ensure browser-compat.js is loaded
    if (!this.getBrowserAPI()) {
      throw new Error("Browser compatibility layer not available");
    }
    
    this.settings = new ContentScriptSettings();
    this.browserInfo = this.getBrowserAPI().getBrowserInfo();
    
    // Adjust behavior based on browser
    this.adjustForBrowser();
  }
  
  getBrowserAPI() {
    return (typeof window !== "undefined" && window.browserAPI) ||
           (typeof self !== "undefined" && self.browserAPI) ||
           (typeof global !== "undefined" && global.browserAPI);
  }
  
  adjustForBrowser() {
    const { name } = this.browserInfo;
    
    switch (name) {
      case "firefox":
        // Firefox-specific adjustments
        this.settings.setMessageTimeout(8000); // Firefox can be slower
        console.log("Firefox compatibility mode enabled");
        break;
        
      case "edge":
        // Edge-specific adjustments
        this.settings.setMessageTimeout(6000);
        console.log("Edge compatibility mode enabled");
        break;
        
      case "chrome":
      default:
        // Chrome optimizations
        this.settings.setMessageTimeout(5000);
        console.log("Chrome compatibility mode enabled");
        break;
    }
  }
  
  async getPreferredStorageArea() {
    const browserAPI = this.getBrowserAPI();
    
    // Use sync storage if available and not Firefox (Firefox sync has limitations)
    if (browserAPI.storage.sync && this.browserInfo.name !== "firefox") {
      try {
        // Test sync storage availability
        await browserAPI.storage.sync.set({ test: "value" });
        await browserAPI.storage.sync.remove("test");
        return "sync";
      } catch (error) {
        console.warn("Sync storage not working, falling back to local:", error.message);
      }
    }
    
    return "local";
  }
}
```

## Debugging Tools and Techniques

### 9. Advanced Debugging Setup

**Debug Console Commands:**
```javascript
// Global debug helpers (add to your extension for debugging)
window.SettingsDebug = {
  // Connection test
  async testConnection() {
    try {
      const response = await chrome.runtime.sendMessage({ type: "PING" });
      console.log("✅ Connection successful:", response);
      return true;
    } catch (error) {
      console.error("❌ Connection failed:", error);
      return false;
    }
  },
  
  // Settings overview
  async getSettingsOverview() {
    const settings = new ContentScriptSettings();
    try {
      const all = await settings.getAllSettings();
      const cached = settings.getCachedSettings();
      
      console.log("=== Settings Overview ===");
      console.log("Total settings:", Object.keys(all).length);
      console.log("Cached settings:", Object.keys(cached).length);
      console.log("Settings:", all);
      
      return { all, cached };
    } catch (error) {
      console.error("Failed to get settings overview:", error);
    }
  },
  
  // Performance benchmark
  async benchmarkPerformance() {
    const settings = new ContentScriptSettings();
    
    console.log("=== Performance Benchmark ===");
    
    // Test individual operations
    const start1 = performance.now();
    await settings.getSetting("feature_enabled");
    console.log("getSetting:", (performance.now() - start1).toFixed(2) + "ms");
    
    const start2 = performance.now();
    await settings.getSettings(["feature_enabled", "api_key", "refresh_interval"]);
    console.log("getSettings (3):", (performance.now() - start2).toFixed(2) + "ms");
    
    const start3 = performance.now();
    await settings.getAllSettings();
    console.log("getAllSettings:", (performance.now() - start3).toFixed(2) + "ms");
  },
  
  // Cache analysis
  analyzeCacheState() {
    const settings = new ContentScriptSettings();
    const cached = settings.getCachedSettings();
    
    console.log("=== Cache Analysis ===");
    console.log("Cache size:", Object.keys(cached).length);
    
    Object.entries(cached).forEach(([key, setting]) => {
      console.log(`${key}: ${typeof setting.value} (${JSON.stringify(setting.value).length} chars)`);
    });
  },
  
  // Storage analysis
  async analyzeStorageUsage() {
    try {
      const storage = await chrome.storage.local.get();
      const sizes = Object.entries(storage).map(([key, value]) => ({
        key,
        type: typeof value,
        size: JSON.stringify(value).length,
        sizeKB: (JSON.stringify(value).length / 1024).toFixed(2)
      })).sort((a, b) => b.size - a.size);
      
      console.log("=== Storage Analysis ===");
      console.table(sizes);
      
      const total = sizes.reduce((sum, item) => sum + item.size, 0);
      console.log("Total size:", (total / 1024).toFixed(2) + " KB");
    } catch (error) {
      console.error("Storage analysis failed:", error);
    }
  }
};

// Usage examples:
// SettingsDebug.testConnection();
// SettingsDebug.getSettingsOverview();
// SettingsDebug.benchmarkPerformance();
// SettingsDebug.analyzeCacheState();
// SettingsDebug.analyzeStorageUsage();
```

### 10. Logging and Monitoring

**Production Logging Setup:**
```javascript
// Enhanced logging system for production debugging
class SettingsLogger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 log entries
  }
  
  log(level, message, data = null) {
    if (this.levels[level] <= this.levels[this.level]) {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 100)
      };
      
      this.logs.push(entry);
      
      // Keep only recent logs
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
      
      // Console output with formatting
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
      switch (level) {
        case 'error':
          console.error(prefix, message, data);
          break;
        case 'warn':
          console.warn(prefix, message, data);
          break;
        case 'debug':
          console.debug(prefix, message, data);
          break;
        default:
          console.log(prefix, message, data);
      }
    }
  }
  
  error(message, data) { this.log('error', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  info(message, data) { this.log('info', message, data); }
  debug(message, data) { this.log('debug', message, data); }
  
  // Export logs for analysis
  exportLogs() {
    const logData = {
      exportTime: new Date().toISOString(),
      extensionId: chrome.runtime.id,
      logs: this.logs
    };
    
    const blob = new Blob([JSON.stringify(logData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings-debug-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  // Get recent errors for quick analysis
  getRecentErrors(hours = 1) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.logs.filter(log => 
      log.level === 'error' && 
      new Date(log.timestamp) > cutoff
    );
  }
}

// Global logger instance
window.SettingsLogger = new SettingsLogger('info');

// Integrate with settings operations
class LoggingSettingsClient {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.logger = window.SettingsLogger;
    this.setupLogging();
  }
  
  setupLogging() {
    // Log all settings operations
    const originalMethods = [
      'getSetting', 'getSettings', 'getAllSettings',
      'updateSetting', 'updateSettings'
    ];
    
    originalMethods.forEach(method => {
      const original = this.settings[method].bind(this.settings);
      this.settings[method] = async (...args) => {
        const start = performance.now();
        this.logger.debug(`${method} called`, args);
        
        try {
          const result = await original(...args);
          const duration = performance.now() - start;
          this.logger.info(`${method} completed in ${duration.toFixed(2)}ms`);
          return result;
        } catch (error) {
          const duration = performance.now() - start;
          this.logger.error(`${method} failed after ${duration.toFixed(2)}ms`, {
            args,
            error: error.message,
            stack: error.stack
          });
          throw error;
        }
      };
    });
    
    // Log change events
    this.settings.addChangeListener((event, data) => {
      this.logger.info(`Settings ${event}`, data);
    });
  }
}
```

## Common Error Patterns and Solutions

### Quick Reference Table

| Error Message | Likely Cause | Immediate Solution |
|---------------|--------------|-------------------|
| "Message port closed before response received" | `async function handleMessage()` | Use sync/async separation pattern |
| "Settings manager not available" | Service worker initialization failure | Check background script event listeners |
| "Timeout getting setting" | Connection latency or SW termination | Increase timeout, implement retry logic |
| "Storage quota exceeded" | Too much data stored | Implement quota monitoring and cleanup |
| "Could not establish connection" | Content script not injected | Check manifest content_scripts configuration |
| "Invalid JSON format" | Malformed JSON setting | Validate JSON before saving |
| "Validation failed" | Setting value doesn't match schema | Check setting type and constraints |

### Prevention Checklist

**Before Deployment:**
- [ ] Use production background.js pattern with proper event registration
- [ ] Implement keep-alive mechanism
- [ ] Add comprehensive error handling and fallbacks
- [ ] Test across Chrome, Firefox, and Edge
- [ ] Performance test with large datasets
- [ ] Verify storage quota handling
- [ ] Test network interruption scenarios
- [ ] Validate all setting schemas

**Monitoring in Production:**
- [ ] Implement error logging and reporting
- [ ] Monitor storage usage trends
- [ ] Track performance metrics
- [ ] Set up alerts for critical failures
- [ ] Regular compatibility testing

This troubleshooting guide provides systematic approaches to diagnosing and resolving the most common issues encountered when integrating the Settings Extension framework. Use the diagnostic tools and code examples to identify problems quickly and implement proven solutions.