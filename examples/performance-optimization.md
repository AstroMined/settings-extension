# Settings Extension Performance Optimization Guide

Advanced performance optimization techniques for the Settings Extension framework, covering caching strategies, batch operations, service worker optimization, and monitoring based on the production implementation.

## Executive Summary

This guide provides comprehensive performance optimization strategies for the Settings Extension framework. It covers architectural optimizations, caching patterns, batch operations, service worker lifecycle management, and real-world performance monitoring techniques derived from the sophisticated production implementation.

**Performance Targets:**
- Settings operations: <100ms average response time
- UI load times: <500ms for popup/options
- Memory usage: <10MB per tab
- Storage efficiency: >90% quota utilization
- Service worker longevity: >5 minutes active time

## Architecture-Level Optimizations

### 1. Service Worker Lifecycle Management

The production implementation includes sophisticated service worker management to prevent termination and ensure consistent performance.

**Keep-Alive Strategy:**
```javascript
// Production keep-alive implementation (from background.js)
// Critical: Register at TOP LEVEL before any imports
chrome.alarms.create("keep-alive", { periodInMinutes: 0.42 }); // 25 seconds
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keep-alive") {
    // Lightweight operation to prevent termination
    chrome.runtime.getPlatformInfo(() => {
      console.debug("Service worker keep-alive ping");
    });
  }
});

// Monitor service worker lifecycle
let lastActivity = Date.now();

function updateActivity() {
  lastActivity = Date.now();
}

// Call updateActivity() on every message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  updateActivity();
  // ... handle message
});

// Performance monitoring
setInterval(() => {
  const idleTime = Date.now() - lastActivity;
  if (idleTime > 30000) { // 30 seconds idle
    console.warn('Service worker has been idle for', idleTime + 'ms');
  }
}, 10000);
```

**Event Registration Optimization:**
```javascript
// CRITICAL: Register all listeners synchronously at top level
// This prevents "Extension context invalidated" errors

// Global error handlers first
self.addEventListener("error", (error) => {
  console.error("Unhandled error in background script:", error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

// Chrome extension listeners
chrome.runtime.onMessage.addListener(handleMessage);
chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleStartup);
chrome.storage.onChanged.addListener(handleStorageChange);

// Import dependencies AFTER listeners are registered
importScripts("lib/browser-compat.js", "lib/settings-manager.js");
```

### 2. Message Handling Optimization

**Async/Sync Separation Pattern:**
```javascript
// Production-optimized message handling
function handleMessage(message, sender, sendResponse) {
  // Performance: Log with structured data for monitoring
  const startTime = performance.now();
  console.log("📨 MSG:", {
    type: message?.type,
    sender: sender?.tab?.id || "extension",
    timestamp: Date.now()
  });

  // CRITICAL: Handle PING synchronously for immediate response
  if (message.type === "PING") {
    const responseTime = performance.now() - startTime;
    sendResponse({ 
      pong: true, 
      timestamp: Date.now(),
      responseTime: responseTime
    });
    return false; // Don't keep port open
  }

  // Async operations with performance tracking
  processAsyncMessageWithMetrics(message, sender, sendResponse, startTime);
  return true; // Keep port open
}

async function processAsyncMessageWithMetrics(message, sender, sendResponse, startTime) {
  try {
    const result = await processAsyncMessage(message, sender);
    const totalTime = performance.now() - startTime;
    
    // Performance monitoring
    if (totalTime > 100) {
      console.warn(`Slow operation: ${message.type} took ${totalTime.toFixed(2)}ms`);
    }
    
    sendResponse({ ...result, responseTime: totalTime });
  } catch (error) {
    const totalTime = performance.now() - startTime;
    console.error(`Error in ${message.type} after ${totalTime.toFixed(2)}ms:`, error);
    sendResponse({ error: error.message, responseTime: totalTime });
  }
}
```

**Connection Pool Management:**
```javascript
// Connection health monitoring
class ConnectionHealthMonitor {
  constructor() {
    this.connections = new Map();
    this.healthStats = {
      totalRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      slowRequests: 0
    };
  }

  recordRequest(tabId, type, responseTime, success) {
    this.healthStats.totalRequests++;
    if (!success) this.healthStats.failedRequests++;
    if (responseTime > 200) this.healthStats.slowRequests++;
    
    // Update rolling average
    this.healthStats.avgResponseTime = 
      (this.healthStats.avgResponseTime * 0.9) + (responseTime * 0.1);
    
    // Track per-tab performance
    if (tabId) {
      if (!this.connections.has(tabId)) {
        this.connections.set(tabId, { requests: 0, avgTime: 0 });
      }
      const conn = this.connections.get(tabId);
      conn.requests++;
      conn.avgTime = (conn.avgTime * 0.9) + (responseTime * 0.1);
    }
  }

  getHealthReport() {
    return {
      ...this.healthStats,
      failureRate: (this.healthStats.failedRequests / this.healthStats.totalRequests) * 100,
      slowRate: (this.healthStats.slowRequests / this.healthStats.totalRequests) * 100,
      connectionCount: this.connections.size
    };
  }
}

const healthMonitor = new ConnectionHealthMonitor();
```

## Intelligent Caching Strategies

### 3. Multi-Layer Caching Architecture

The production implementation uses sophisticated caching with automatic invalidation.

**Content Script Caching:**
```javascript
// Production-optimized caching in ContentScriptSettings
class OptimizedContentScriptSettings extends ContentScriptSettings {
  constructor() {
    super();
    this.cacheStrategy = 'smart'; // 'aggressive', 'conservative', 'smart'
    this.cacheMetrics = new Map();
    this.cacheTTL = new Map();
    this.preloadKeys = new Set(['feature_enabled', 'theme_preference']);
  }

  // Smart caching with usage-based TTL
  setCacheWithTTL(key, value, accessFrequency = 1) {
    const ttl = this.calculateTTL(key, accessFrequency);
    this.cache.set(key, value);
    this.cacheTTL.set(key, Date.now() + ttl);
    
    // Track cache metrics
    if (!this.cacheMetrics.has(key)) {
      this.cacheMetrics.set(key, { hits: 0, misses: 0, lastAccess: 0 });
    }
  }

  calculateTTL(key, accessFrequency) {
    const baseTTL = 60000; // 1 minute base
    const maxTTL = 300000; // 5 minutes max
    const minTTL = 10000;  // 10 seconds min
    
    // Frequently accessed settings get longer TTL
    const frequencyMultiplier = Math.min(accessFrequency / 10, 3);
    const ttl = baseTTL * (1 + frequencyMultiplier);
    
    return Math.min(Math.max(ttl, minTTL), maxTTL);
  }

  // Override getSetting with smart caching
  async getSetting(key) {
    // Check cache with TTL
    if (this.cache.has(key)) {
      const ttl = this.cacheTTL.get(key);
      const metrics = this.cacheMetrics.get(key);
      
      if (ttl && Date.now() < ttl) {
        // Cache hit
        metrics.hits++;
        metrics.lastAccess = Date.now();
        
        // Update TTL based on access pattern
        const newTTL = this.calculateTTL(key, metrics.hits / (metrics.hits + metrics.misses));
        this.cacheTTL.set(key, Date.now() + newTTL);
        
        return this.cache.get(key);
      } else {
        // Cache expired
        this.cache.delete(key);
        this.cacheTTL.delete(key);
      }
    }

    // Cache miss - fetch from background
    const metrics = this.cacheMetrics.get(key) || { hits: 0, misses: 0, lastAccess: 0 };
    metrics.misses++;
    metrics.lastAccess = Date.now();
    
    try {
      const result = await super.getSetting(key);
      this.setCacheWithTTL(key, result, metrics.hits / (metrics.hits + metrics.misses));
      return result;
    } catch (error) {
      // Don't cache errors, but track failed attempts
      console.error(`Failed to fetch ${key}:`, error);
      throw error;
    }
  }

  // Predictive preloading
  async preloadCriticalSettings() {
    const criticalKeys = Array.from(this.preloadKeys);
    if (criticalKeys.length === 0) return;

    try {
      const settings = await this.getSettings(criticalKeys);
      console.log(`Preloaded ${Object.keys(settings).length} critical settings`);
    } catch (error) {
      console.warn('Preload failed:', error);
    }
  }

  // Cache performance analysis
  getCachePerformanceReport() {
    const report = {
      totalEntries: this.cache.size,
      hitRate: 0,
      avgAccessFrequency: 0,
      memoryUsage: 0
    };

    let totalHits = 0;
    let totalMisses = 0;
    
    for (const [key, metrics] of this.cacheMetrics) {
      totalHits += metrics.hits;
      totalMisses += metrics.misses;
      
      // Estimate memory usage
      const entry = this.cache.get(key);
      if (entry) {
        report.memoryUsage += JSON.stringify(entry).length;
      }
    }

    report.hitRate = totalHits / (totalHits + totalMisses) * 100;
    report.avgAccessFrequency = totalHits / this.cacheMetrics.size;

    return report;
  }
}
```

### 4. Background Script Caching

**Settings Manager Optimization:**
```javascript
// Production settings manager with advanced caching
class OptimizedSettingsManager extends SettingsManager {
  constructor() {
    super();
    this.readCache = new Map(); // Read-optimized cache
    this.writeQueue = new Map(); // Batched write queue
    this.writeBatchTimer = null;
    this.writeBatchDelay = 50; // 50ms batching window
    this.performanceMetrics = {
      reads: { total: 0, cached: 0, avgTime: 0 },
      writes: { total: 0, batched: 0, avgTime: 0 }
    };
  }

  // Optimized getSetting with read cache
  async getSetting(key) {
    const startTime = performance.now();
    
    // Check read cache first
    if (this.readCache.has(key)) {
      const cached = this.readCache.get(key);
      const responseTime = performance.now() - startTime;
      
      this.performanceMetrics.reads.cached++;
      this.performanceMetrics.reads.avgTime = 
        (this.performanceMetrics.reads.avgTime * 0.9) + (responseTime * 0.1);
      
      return { ...cached }; // Return copy to prevent mutations
    }

    // Cache miss - get from storage
    try {
      this.performanceMetrics.reads.total++;
      const result = await super.getSetting(key);
      
      // Cache successful reads
      this.readCache.set(key, result);
      
      const responseTime = performance.now() - startTime;
      this.performanceMetrics.reads.avgTime = 
        (this.performanceMetrics.reads.avgTime * 0.9) + (responseTime * 0.1);
      
      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  }

  // Batched write operations for performance
  async updateSetting(key, value) {
    return new Promise((resolve, reject) => {
      // Add to write queue
      this.writeQueue.set(key, { value, resolve, reject });
      
      // Start batch timer if not running
      if (!this.writeBatchTimer) {
        this.writeBatchTimer = setTimeout(() => {
          this.processBatchedWrites();
        }, this.writeBatchDelay);
      }
    });
  }

  async processBatchedWrites() {
    const batch = new Map(this.writeQueue);
    this.writeQueue.clear();
    this.writeBatchTimer = null;

    if (batch.size === 0) return;

    const startTime = performance.now();
    const updates = {};
    
    try {
      // Validate all updates first
      for (const [key, operation] of batch) {
        const setting = this.settings.get(key);
        if (!setting) {
          throw new Error(`Setting '${key}' not found`);
        }
        
        this.validateSetting(setting, operation.value);
        updates[key] = operation.value;
      }

      // Apply all updates atomically
      await super.updateSettings(updates);
      
      // Update read cache
      for (const [key, operation] of batch) {
        const setting = this.settings.get(key);
        this.readCache.set(key, setting);
        operation.resolve(true);
      }

      // Update metrics
      this.performanceMetrics.writes.total += batch.size;
      this.performanceMetrics.writes.batched += batch.size > 1 ? batch.size : 0;
      const responseTime = performance.now() - startTime;
      this.performanceMetrics.writes.avgTime = 
        (this.performanceMetrics.writes.avgTime * 0.9) + (responseTime * 0.1);

      console.log(`Batched ${batch.size} writes in ${responseTime.toFixed(2)}ms`);
      
    } catch (error) {
      // Reject all operations in batch
      for (const [, operation] of batch) {
        operation.reject(error);
      }
    }
  }

  // Cache invalidation on external storage changes
  handleStorageChange(changes, areaName) {
    if (areaName !== this.storageArea) return;

    // Invalidate affected cache entries
    for (const key of Object.keys(changes)) {
      this.readCache.delete(key);
    }

    console.log(`Invalidated ${Object.keys(changes).length} cache entries`);
  }

  // Performance monitoring
  getPerformanceReport() {
    const cacheHitRate = this.performanceMetrics.reads.cached / 
                        this.performanceMetrics.reads.total * 100;
    
    const batchEfficiency = this.performanceMetrics.writes.batched / 
                           this.performanceMetrics.writes.total * 100;

    return {
      cache: {
        entries: this.readCache.size,
        hitRate: cacheHitRate.toFixed(1) + '%',
        avgReadTime: this.performanceMetrics.reads.avgTime.toFixed(2) + 'ms'
      },
      writes: {
        total: this.performanceMetrics.writes.total,
        batchEfficiency: batchEfficiency.toFixed(1) + '%',
        avgWriteTime: this.performanceMetrics.writes.avgTime.toFixed(2) + 'ms'
      }
    };
  }
}
```

## Batch Operation Optimization

### 5. Smart Batching Strategies

**Client-Side Batch Management:**
```javascript
// Intelligent batching for multiple operations
class BatchedSettingsClient {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.operationQueue = [];
    this.batchTimer = null;
    this.batchWindow = 25; // 25ms batching window
    this.maxBatchSize = 20;
  }

  // Queue operations for batching
  async queueOperation(type, key, value = null) {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        type, key, value, resolve, reject, timestamp: Date.now()
      });

      // Process immediately if batch is full
      if (this.operationQueue.length >= this.maxBatchSize) {
        this.processBatch();
      } else {
        // Set timer for batching window
        if (!this.batchTimer) {
          this.batchTimer = setTimeout(() => this.processBatch(), this.batchWindow);
        }
      }
    });
  }

  async processBatch() {
    const batch = this.operationQueue.splice(0);
    this.batchTimer = null;

    if (batch.length === 0) return;

    // Group operations by type
    const reads = batch.filter(op => op.type === 'read');
    const writes = batch.filter(op => op.type === 'write');

    // Process reads in batch
    if (reads.length > 0) {
      await this.processBatchedReads(reads);
    }

    // Process writes in batch
    if (writes.length > 0) {
      await this.processBatchedWrites(writes);
    }
  }

  async processBatchedReads(reads) {
    try {
      const keys = reads.map(op => op.key);
      const results = await this.settings.getSettings(keys);
      
      // Resolve individual promises
      reads.forEach(op => {
        if (results[op.key]) {
          op.resolve(results[op.key]);
        } else {
          op.reject(new Error(`Setting '${op.key}' not found`));
        }
      });
      
      console.log(`Batched ${reads.length} reads`);
    } catch (error) {
      reads.forEach(op => op.reject(error));
    }
  }

  async processBatchedWrites(writes) {
    try {
      const updates = {};
      writes.forEach(op => {
        updates[op.key] = op.value;
      });
      
      await this.settings.updateSettings(updates);
      
      // Resolve all write promises
      writes.forEach(op => op.resolve(true));
      
      console.log(`Batched ${writes.length} writes`);
    } catch (error) {
      writes.forEach(op => op.reject(error));
    }
  }

  // Public interface with batching
  async getSetting(key) {
    return this.queueOperation('read', key);
  }

  async updateSetting(key, value) {
    return this.queueOperation('write', key, value);
  }

  // Force immediate batch processing
  async flush() {
    if (this.operationQueue.length > 0) {
      await this.processBatch();
    }
  }
}
```

### 6. Predictive Loading

**Smart Preloading Based on Usage Patterns:**
```javascript
// Usage pattern analysis for predictive loading
class PredictiveLoader {
  constructor(settings) {
    this.settings = settings;
    this.usagePatterns = new Map();
    this.correlations = new Map();
    this.preloadCandidates = new Set();
  }

  // Track setting access patterns
  recordAccess(key) {
    const now = Date.now();
    if (!this.usagePatterns.has(key)) {
      this.usagePatterns.set(key, {
        count: 0,
        lastAccess: now,
        intervals: []
      });
    }

    const pattern = this.usagePatterns.get(key);
    if (pattern.lastAccess) {
      const interval = now - pattern.lastAccess;
      pattern.intervals.push(interval);
      
      // Keep only recent intervals
      if (pattern.intervals.length > 10) {
        pattern.intervals = pattern.intervals.slice(-10);
      }
    }

    pattern.count++;
    pattern.lastAccess = now;

    // Update preload candidates
    this.updatePreloadCandidates(key);
  }

  // Identify settings that are frequently accessed together
  updateCorrelations(key, sessionKeys) {
    if (!this.correlations.has(key)) {
      this.correlations.set(key, new Map());
    }

    const keyCorrelations = this.correlations.get(key);
    sessionKeys.forEach(otherKey => {
      if (otherKey !== key) {
        keyCorrelations.set(otherKey, (keyCorrelations.get(otherKey) || 0) + 1);
      }
    });
  }

  updatePreloadCandidates(key) {
    const pattern = this.usagePatterns.get(key);
    
    // Settings accessed frequently should be preloaded
    if (pattern.count > 5) {
      this.preloadCandidates.add(key);
    }

    // Settings with predictable intervals should be preloaded
    if (pattern.intervals.length > 3) {
      const avgInterval = pattern.intervals.reduce((a, b) => a + b) / pattern.intervals.length;
      const variance = pattern.intervals.reduce((acc, interval) => 
        acc + Math.pow(interval - avgInterval, 2), 0) / pattern.intervals.length;
      
      // Low variance indicates predictable access pattern
      if (variance < avgInterval * 0.5) {
        this.preloadCandidates.add(key);
      }
    }
  }

  // Preload likely-to-be-accessed settings
  async performPredictivePreload() {
    if (this.preloadCandidates.size === 0) return;

    try {
      const candidatesArray = Array.from(this.preloadCandidates);
      const startTime = performance.now();
      
      await this.settings.getSettings(candidatesArray);
      
      const duration = performance.now() - startTime;
      console.log(`Preloaded ${candidatesArray.length} settings in ${duration.toFixed(2)}ms`);
      
      // Clear preload candidates after successful preload
      this.preloadCandidates.clear();
    } catch (error) {
      console.warn('Predictive preload failed:', error);
    }
  }

  // Get correlated settings for a given key
  getCorrelatedSettings(key, threshold = 3) {
    const correlations = this.correlations.get(key);
    if (!correlations) return [];

    return Array.from(correlations.entries())
      .filter(([, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => key);
  }

  // Usage analytics
  getUsageReport() {
    const report = {
      totalAccesses: 0,
      uniqueSettings: this.usagePatterns.size,
      preloadCandidates: this.preloadCandidates.size,
      topSettings: []
    };

    const sortedByUsage = Array.from(this.usagePatterns.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    report.topSettings = sortedByUsage.map(([key, pattern]) => ({
      key,
      count: pattern.count,
      avgInterval: pattern.intervals.length > 0 
        ? pattern.intervals.reduce((a, b) => a + b) / pattern.intervals.length 
        : 0
    }));

    report.totalAccesses = sortedByUsage.reduce((sum, [, pattern]) => sum + pattern.count, 0);

    return report;
  }
}
```

## Storage Optimization

### 7. Storage Efficiency Strategies

**Compression and Serialization:**
```javascript
// Optimized storage with compression for large settings
class OptimizedStorageManager {
  constructor() {
    this.compressionThreshold = 1024; // Compress settings > 1KB
    this.compressionRatio = new Map();
  }

  // Compress large JSON settings
  compressValue(value, type) {
    if (type !== 'json' && type !== 'longtext') {
      return value; // Don't compress simple types
    }

    const serialized = JSON.stringify(value);
    if (serialized.length < this.compressionThreshold) {
      return value; // Too small to benefit from compression
    }

    try {
      // Simple compression using repeated pattern detection
      const compressed = this.compressString(serialized);
      const compressionRatio = compressed.length / serialized.length;
      
      this.compressionRatio.set('last', compressionRatio);
      
      if (compressionRatio < 0.8) { // 20% or better compression
        return {
          __compressed: true,
          __originalSize: serialized.length,
          __data: compressed
        };
      }
    } catch (error) {
      console.warn('Compression failed:', error);
    }

    return value;
  }

  decompressValue(value) {
    if (typeof value === 'object' && value.__compressed) {
      try {
        const decompressed = this.decompressString(value.__data);
        return JSON.parse(decompressed);
      } catch (error) {
        console.error('Decompression failed:', error);
        throw new Error('Failed to decompress stored value');
      }
    }
    return value;
  }

  // Simple string compression using run-length encoding and dictionary
  compressString(str) {
    // Dictionary compression for common patterns
    const commonPatterns = {
      '"type":"': '\x01',
      '"value":': '\x02', 
      '"description":"': '\x03',
      'true': '\x04',
      'false': '\x05'
    };

    let compressed = str;
    for (const [pattern, replacement] of Object.entries(commonPatterns)) {
      compressed = compressed.split(pattern).join(replacement);
    }

    return compressed;
  }

  decompressString(compressed) {
    const commonPatterns = {
      '\x01': '"type":"',
      '\x02': '"value":',
      '\x03': '"description":"', 
      '\x04': 'true',
      '\x05': 'false'
    };

    let decompressed = compressed;
    for (const [replacement, pattern] of Object.entries(commonPatterns)) {
      decompressed = decompressed.split(replacement).join(pattern);
    }

    return decompressed;
  }

  // Storage quota management
  async optimizeStorageUsage() {
    const quota = await this.checkStorageQuota();
    
    if (quota.percentUsed > 80) {
      console.log('Storage optimization needed, usage:', quota.percentUsed + '%');
      
      // Strategy 1: Compress large settings
      await this.compressLargeSettings();
      
      // Strategy 2: Remove temporary data
      await this.cleanupTemporaryData();
      
      // Strategy 3: Archive old data
      await this.archiveOldData();
      
      const newQuota = await this.checkStorageQuota();
      console.log('Storage after optimization:', newQuota.percentUsed + '%');
      
      return newQuota.percentUsed - quota.percentUsed; // Space saved
    }
    
    return 0;
  }

  async compressLargeSettings() {
    const storage = await chrome.storage.local.get();
    const updates = {};
    let totalSaved = 0;

    for (const [key, value] of Object.entries(storage)) {
      if (typeof value === 'object' && value.type) {
        const originalSize = JSON.stringify(value).length;
        const compressed = this.compressValue(value.value, value.type);
        
        if (compressed !== value.value) {
          updates[key] = { ...value, value: compressed };
          const newSize = JSON.stringify(updates[key]).length;
          totalSaved += originalSize - newSize;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
      console.log(`Compressed ${Object.keys(updates).length} settings, saved ${totalSaved} bytes`);
    }
  }
}
```

### 8. Memory Management

**Intelligent Memory Usage:**
```javascript
// Memory-efficient settings management
class MemoryOptimizedClient {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.memoryUsage = { current: 0, peak: 0, limit: 5 * 1024 * 1024 }; // 5MB limit
    this.gcThreshold = 0.8; // Trigger cleanup at 80%
    this.lastGC = 0;
  }

  async getSetting(key) {
    const result = await this.settings.getSetting(key);
    this.trackMemoryUsage();
    return result;
  }

  trackMemoryUsage() {
    // Estimate memory usage
    const cacheSize = this.estimateCacheSize();
    this.memoryUsage.current = cacheSize;
    
    if (cacheSize > this.memoryUsage.peak) {
      this.memoryUsage.peak = cacheSize;
    }

    // Trigger garbage collection if needed
    if (cacheSize / this.memoryUsage.limit > this.gcThreshold) {
      const now = Date.now();
      if (now - this.lastGC > 30000) { // Max once per 30 seconds
        this.performGarbageCollection();
        this.lastGC = now;
      }
    }
  }

  estimateCacheSize() {
    const cached = this.settings.getCachedSettings();
    let size = 0;
    
    for (const [key, setting] of Object.entries(cached)) {
      // Rough estimation of memory usage
      size += key.length * 2; // String overhead
      size += JSON.stringify(setting).length * 2; // Object overhead
    }
    
    return size;
  }

  performGarbageCollection() {
    console.log('Performing memory garbage collection...');
    
    // Clear cache and force reload of frequently used settings
    const frequentKeys = this.getFrequentlyAccessedKeys();
    this.settings.clearCache();
    
    // Preload only essential settings
    if (frequentKeys.length > 0) {
      this.settings.getSettings(frequentKeys.slice(0, 5))
        .catch(error => console.warn('GC preload failed:', error));
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    console.log('Memory GC completed');
  }

  getFrequentlyAccessedKeys() {
    // This would be tracked by the usage pattern analyzer
    return ['feature_enabled', 'theme_preference', 'api_endpoint'];
  }

  getMemoryReport() {
    const usage = this.memoryUsage.current;
    const limit = this.memoryUsage.limit;
    
    return {
      current: `${(usage / 1024).toFixed(1)} KB`,
      peak: `${(this.memoryUsage.peak / 1024).toFixed(1)} KB`,
      limit: `${(limit / 1024).toFixed(1)} KB`,
      utilization: `${(usage / limit * 100).toFixed(1)}%`,
      cached: Object.keys(this.settings.getCachedSettings()).length
    };
  }
}
```

## Performance Monitoring and Analytics

### 9. Real-Time Performance Monitoring

**Comprehensive Performance Tracking:**
```javascript
// Production performance monitoring system
class SettingsPerformanceMonitor {
  constructor() {
    this.metrics = {
      operations: new Map(),
      errors: [],
      performance: {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        throughput: 0,
        errorRate: 0
      },
      resource: {
        memoryUsage: 0,
        storageUsage: 0,
        cacheHitRate: 0
      }
    };
    
    this.responseTimeBuffer = [];
    this.bufferSize = 100;
    this.reportingInterval = 60000; // 1 minute
    
    this.startReporting();
  }

  // Track individual operations
  startOperation(type, key = null) {
    const operationId = `${type}_${Date.now()}_${Math.random()}`;
    const operation = {
      id: operationId,
      type,
      key,
      startTime: performance.now(),
      startMemory: this.getMemoryUsage()
    };
    
    this.metrics.operations.set(operationId, operation);
    return operationId;
  }

  endOperation(operationId, success = true, error = null) {
    const operation = this.metrics.operations.get(operationId);
    if (!operation) return;

    const endTime = performance.now();
    const duration = endTime - operation.startTime;
    const endMemory = this.getMemoryUsage();
    
    // Update operation
    operation.endTime = endTime;
    operation.duration = duration;
    operation.success = success;
    operation.memoryDelta = endMemory - operation.startMemory;
    
    if (error) {
      operation.error = error;
      this.metrics.errors.push({
        timestamp: Date.now(),
        type: operation.type,
        key: operation.key,
        error: error.message
      });
    }

    // Update performance metrics
    this.updatePerformanceMetrics(operation);
    
    // Clean up completed operation
    this.metrics.operations.delete(operationId);
  }

  updatePerformanceMetrics(operation) {
    // Update response time buffer
    this.responseTimeBuffer.push(operation.duration);
    if (this.responseTimeBuffer.length > this.bufferSize) {
      this.responseTimeBuffer = this.responseTimeBuffer.slice(-this.bufferSize);
    }

    // Calculate metrics
    const sortedTimes = [...this.responseTimeBuffer].sort((a, b) => a - b);
    this.metrics.performance.avgResponseTime = 
      this.responseTimeBuffer.reduce((a, b) => a + b) / this.responseTimeBuffer.length;
    
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    this.metrics.performance.p95ResponseTime = sortedTimes[p95Index] || 0;

    // Error rate (last 100 operations)
    const recentErrors = this.metrics.errors.filter(e => 
      Date.now() - e.timestamp < 300000 // Last 5 minutes
    );
    this.metrics.performance.errorRate = recentErrors.length / this.bufferSize * 100;
  }

  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  // Wrap settings operations with monitoring
  wrapSettingsClient(settingsClient) {
    const originalMethods = [
      'getSetting', 'getSettings', 'getAllSettings',
      'updateSetting', 'updateSettings'
    ];

    originalMethods.forEach(methodName => {
      const originalMethod = settingsClient[methodName].bind(settingsClient);
      
      settingsClient[methodName] = async (...args) => {
        const operationId = this.startOperation(methodName, args[0]);
        
        try {
          const result = await originalMethod(...args);
          this.endOperation(operationId, true);
          return result;
        } catch (error) {
          this.endOperation(operationId, false, error);
          throw error;
        }
      };
    });

    return settingsClient;
  }

  // Performance reporting
  startReporting() {
    setInterval(() => {
      this.generatePerformanceReport();
    }, this.reportingInterval);
  }

  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      performance: { ...this.metrics.performance },
      activeOperations: this.metrics.operations.size,
      recentErrors: this.metrics.errors.filter(e => 
        Date.now() - e.timestamp < this.reportingInterval
      ).length,
      memory: {
        current: this.getMemoryUsage(),
        formatted: `${(this.getMemoryUsage() / 1024 / 1024).toFixed(1)} MB`
      }
    };

    console.log('Settings Performance Report:', report);
    
    // Send to analytics if configured
    this.sendToAnalytics(report);
    
    return report;
  }

  sendToAnalytics(report) {
    // Implementation would send to your analytics service
    // Example: Google Analytics, custom endpoint, etc.
  }

  // Performance alerts
  checkPerformanceThresholds() {
    const alerts = [];

    if (this.metrics.performance.avgResponseTime > 200) {
      alerts.push('Average response time exceeds 200ms');
    }

    if (this.metrics.performance.errorRate > 5) {
      alerts.push('Error rate exceeds 5%');
    }

    if (this.getMemoryUsage() > 10 * 1024 * 1024) { // 10MB
      alerts.push('Memory usage exceeds 10MB');
    }

    if (alerts.length > 0) {
      console.warn('Performance Alerts:', alerts);
    }

    return alerts;
  }
}

// Usage example
const performanceMonitor = new SettingsPerformanceMonitor();
const settings = new ContentScriptSettings();
const monitoredSettings = performanceMonitor.wrapSettingsClient(settings);

// Use monitoredSettings instead of settings for automatic monitoring
```

### 10. Performance Testing and Benchmarking

**Automated Performance Testing:**
```javascript
// Comprehensive performance test suite
class SettingsPerformanceTester {
  constructor() {
    this.results = [];
    this.settings = new ContentScriptSettings();
  }

  async runFullBenchmark() {
    console.log('Starting comprehensive performance benchmark...');
    
    const results = {
      individual: await this.testIndividualOperations(),
      batch: await this.testBatchOperations(),
      cache: await this.testCachePerformance(),
      memory: await this.testMemoryUsage(),
      stress: await this.testStressConditions()
    };

    this.generateBenchmarkReport(results);
    return results;
  }

  async testIndividualOperations(iterations = 50) {
    const operations = ['getSetting', 'updateSetting'];
    const results = {};

    for (const operation of operations) {
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        try {
          if (operation === 'getSetting') {
            await this.settings.getSetting('feature_enabled');
          } else if (operation === 'updateSetting') {
            await this.settings.updateSetting('feature_enabled', i % 2 === 0);
          }
          
          times.push(performance.now() - start);
        } catch (error) {
          console.error(`${operation} failed in iteration ${i}:`, error);
        }
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      results[operation] = {
        avg: times.reduce((a, b) => a + b) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]
      };
    }

    return results;
  }

  async testBatchOperations() {
    const batchSizes = [1, 5, 10, 20];
    const results = {};

    for (const size of batchSizes) {
      const keys = Array.from({length: size}, (_, i) => `test_setting_${i}`);
      
      const start = performance.now();
      await this.settings.getSettings(keys);
      const duration = performance.now() - start;
      
      results[`batch_${size}`] = {
        totalTime: duration,
        avgPerItem: duration / size,
        throughput: size / (duration / 1000) // items per second
      };
    }

    return results;
  }

  async testCachePerformance(iterations = 100) {
    // First load to populate cache
    await this.settings.getSetting('feature_enabled');
    
    const cachedTimes = [];
    const uncachedTimes = [];

    for (let i = 0; i < iterations; i++) {
      // Test cached access
      let start = performance.now();
      this.settings.getCachedSetting('feature_enabled');
      cachedTimes.push(performance.now() - start);
      
      // Test uncached access (clear cache first)
      this.settings.clearCache();
      start = performance.now();
      await this.settings.getSetting('feature_enabled');
      uncachedTimes.push(performance.now() - start);
    }

    return {
      cached: {
        avg: cachedTimes.reduce((a, b) => a + b) / cachedTimes.length,
        min: Math.min(...cachedTimes),
        max: Math.max(...cachedTimes)
      },
      uncached: {
        avg: uncachedTimes.reduce((a, b) => a + b) / uncachedTimes.length,
        min: Math.min(...uncachedTimes),
        max: Math.max(...uncachedTimes)
      },
      speedup: (uncachedTimes.reduce((a, b) => a + b) / uncachedTimes.length) /
               (cachedTimes.reduce((a, b) => a + b) / cachedTimes.length)
    };
  }

  async testMemoryUsage() {
    const initialMemory = this.getMemoryUsage();
    
    // Load many settings
    const keys = Array.from({length: 50}, (_, i) => `memory_test_${i}`);
    await this.settings.getSettings(keys);
    
    const afterLoadMemory = this.getMemoryUsage();
    
    // Clear cache
    this.settings.clearCache();
    
    const afterClearMemory = this.getMemoryUsage();

    return {
      initial: initialMemory,
      afterLoad: afterLoadMemory,
      afterClear: afterClearMemory,
      loadIncrease: afterLoadMemory - initialMemory,
      clearDecrease: afterLoadMemory - afterClearMemory
    };
  }

  async testStressConditions() {
    const results = {};
    
    // Test concurrent operations
    const concurrentPromises = Array.from({length: 20}, (_, i) => 
      this.settings.getSetting(`concurrent_test_${i % 5}`)
    );
    
    const start = performance.now();
    await Promise.all(concurrentPromises);
    const concurrentTime = performance.now() - start;
    
    results.concurrent = {
      operations: 20,
      totalTime: concurrentTime,
      avgTime: concurrentTime / 20
    };

    // Test rapid sequential operations
    const sequentialStart = performance.now();
    for (let i = 0; i < 50; i++) {
      await this.settings.getSetting('feature_enabled');
    }
    const sequentialTime = performance.now() - sequentialStart;
    
    results.sequential = {
      operations: 50,
      totalTime: sequentialTime,
      avgTime: sequentialTime / 50
    };

    return results;
  }

  getMemoryUsage() {
    return performance.memory ? performance.memory.usedJSHeapSize : 0;
  }

  generateBenchmarkReport(results) {
    console.log('\n🚀 Settings Performance Benchmark Report');
    console.log('==========================================');
    
    console.log('\n📊 Individual Operations:');
    for (const [op, metrics] of Object.entries(results.individual)) {
      console.log(`  ${op}:`);
      console.log(`    Average: ${metrics.avg.toFixed(2)}ms`);
      console.log(`    Range: ${metrics.min.toFixed(2)}ms - ${metrics.max.toFixed(2)}ms`);
      console.log(`    95th percentile: ${metrics.p95.toFixed(2)}ms`);
    }
    
    console.log('\n📦 Batch Operations:');
    for (const [batch, metrics] of Object.entries(results.batch)) {
      console.log(`  ${batch}:`);
      console.log(`    Total: ${metrics.totalTime.toFixed(2)}ms`);
      console.log(`    Per item: ${metrics.avgPerItem.toFixed(2)}ms`);
      console.log(`    Throughput: ${metrics.throughput.toFixed(1)} ops/sec`);
    }
    
    console.log('\n💾 Cache Performance:');
    const cache = results.cache;
    console.log(`  Cached access: ${cache.cached.avg.toFixed(3)}ms`);
    console.log(`  Uncached access: ${cache.uncached.avg.toFixed(2)}ms`);
    console.log(`  Cache speedup: ${cache.speedup.toFixed(1)}x`);
    
    console.log('\n🧠 Memory Usage:');
    const memory = results.memory;
    console.log(`  Load increase: ${(memory.loadIncrease / 1024).toFixed(1)} KB`);
    console.log(`  Clear decrease: ${(memory.clearDecrease / 1024).toFixed(1)} KB`);
    
    console.log('\n⚡ Stress Test Results:');
    const stress = results.stress;
    console.log(`  Concurrent (20 ops): ${stress.concurrent.totalTime.toFixed(2)}ms total`);
    console.log(`  Sequential (50 ops): ${stress.sequential.totalTime.toFixed(2)}ms total`);
    
    // Performance assessment
    console.log('\n✅ Performance Assessment:');
    this.assessPerformance(results);
  }

  assessPerformance(results) {
    const assessments = [];
    
    // Check individual operation performance
    if (results.individual.getSetting.avg < 50) {
      assessments.push('✅ Excellent getSetting performance (<50ms)');
    } else if (results.individual.getSetting.avg < 100) {
      assessments.push('⚠️ Good getSetting performance (<100ms)');
    } else {
      assessments.push('❌ Poor getSetting performance (>100ms)');
    }
    
    // Check cache effectiveness
    if (results.cache.speedup > 10) {
      assessments.push('✅ Excellent cache performance (>10x speedup)');
    } else if (results.cache.speedup > 5) {
      assessments.push('⚠️ Good cache performance (>5x speedup)');
    } else {
      assessments.push('❌ Poor cache performance (<5x speedup)');
    }
    
    // Check memory efficiency
    if (results.memory.loadIncrease < 1024 * 100) { // <100KB
      assessments.push('✅ Excellent memory efficiency (<100KB)');
    } else if (results.memory.loadIncrease < 1024 * 500) { // <500KB
      assessments.push('⚠️ Good memory efficiency (<500KB)');
    } else {
      assessments.push('❌ Poor memory efficiency (>500KB)');
    }

    assessments.forEach(assessment => console.log(`  ${assessment}`));
  }
}

// Usage
const tester = new SettingsPerformanceTester();
// tester.runFullBenchmark();
```

## Best Practices Summary

### Performance Optimization Checklist

**✅ Service Worker Management:**
- [ ] Keep-alive mechanism implemented (25-second alarm)
- [ ] Event listeners registered synchronously at top level
- [ ] Proper async/sync message handling separation
- [ ] Error handling and fallback mechanisms

**✅ Caching Strategy:**
- [ ] Multi-layer caching (client + server)
- [ ] Smart cache invalidation
- [ ] TTL-based expiration
- [ ] Usage-based cache priority

**✅ Batch Operations:**
- [ ] Batch reads using `getSettings()`
- [ ] Batch writes using `updateSettings()`
- [ ] Intelligent batching windows (25-50ms)
- [ ] Queue management for optimal throughput

**✅ Storage Optimization:**
- [ ] Compression for large settings (>1KB)
- [ ] Quota monitoring and cleanup
- [ ] Efficient serialization
- [ ] Storage area optimization (local vs sync)

**✅ Memory Management:**
- [ ] Memory usage monitoring
- [ ] Garbage collection strategies
- [ ] Cache size limits
- [ ] Memory leak prevention

**✅ Performance Monitoring:**
- [ ] Response time tracking
- [ ] Error rate monitoring
- [ ] Resource usage metrics
- [ ] Performance alerts and thresholds

This comprehensive performance optimization guide ensures your Settings Extension integration achieves production-ready performance levels with minimal resource usage and maximum reliability.