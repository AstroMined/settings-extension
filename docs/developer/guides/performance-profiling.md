# Performance Profiling Guide

## Executive Summary

This guide provides comprehensive techniques for profiling and optimizing the Settings Extension's performance. Learn how to measure, analyze, and improve extension performance across different browsers and usage scenarios.

## Scope

- **Applies to**: Settings Extension v1.0+ performance optimization
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Performance Measurement Tools

### Browser DevTools

#### Chrome DevTools Performance Profiling
1. **Performance Tab**
   - Record extension activities during typical usage
   - Analyze main thread bottlenecks
   - Identify memory leaks and excessive garbage collection

2. **Memory Tab**
   - Monitor extension memory usage
   - Detect memory leaks in background scripts
   - Profile heap snapshots during operations

3. **Application Tab**
   - Monitor storage usage (local/sync/session)
   - Analyze storage read/write performance
   - Check service worker lifecycle events

#### Firefox Developer Tools
1. **Performance Panel**
   - Profile extension scripts and content scripts
   - Analyze WebExtension API call performance
   - Monitor background page resource usage

2. **Memory Panel**
   - Track extension memory consumption
   - Identify memory growth patterns
   - Profile garbage collection impact

### Extension-Specific Profiling

#### Custom Performance Metrics
```javascript
// Performance timing utility
class PerformanceProfiler {
    constructor() {
        this.metrics = new Map();
    }
    
    startTiming(operation) {
        this.metrics.set(operation, {
            startTime: performance.now(),
            endTime: null,
            duration: null
        });
    }
    
    endTiming(operation) {
        const metric = this.metrics.get(operation);
        if (metric) {
            metric.endTime = performance.now();
            metric.duration = metric.endTime - metric.startTime;
        }
        return metric?.duration;
    }
    
    getMetrics() {
        return Object.fromEntries(this.metrics);
    }
}

// Usage example
const profiler = new PerformanceProfiler();

// Profile settings save operation
profiler.startTiming('settings-save');
await settingsManager.saveSettings(newSettings);
const saveTime = profiler.endTiming('settings-save');
console.log(`Settings save took ${saveTime}ms`);
```

## Key Performance Areas

### Settings Operations Performance

#### Save Operations
**Target**: < 100ms for typical settings saves

```javascript
// Optimized bulk save operation
async function optimizedBulkSave(settingsUpdates) {
    profiler.startTiming('bulk-save');
    
    // Batch updates to minimize storage API calls
    const batches = chunkArray(settingsUpdates, 50);
    const promises = batches.map(batch => 
        browser.storage.local.set(Object.fromEntries(batch))
    );
    
    await Promise.all(promises);
    return profiler.endTiming('bulk-save');
}
```

#### Load Operations
**Target**: < 50ms for settings retrieval

```javascript
// Optimized settings loading with caching
class OptimizedSettingsLoader {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5000; // 5 seconds
    }
    
    async loadSettings(keys) {
        const uncachedKeys = keys.filter(key => !this.isCached(key));
        
        if (uncachedKeys.length > 0) {
            profiler.startTiming('storage-read');
            const freshData = await browser.storage.local.get(uncachedKeys);
            profiler.endTiming('storage-read');
            
            // Update cache
            Object.entries(freshData).forEach(([key, value]) => {
                this.cache.set(key, {
                    value,
                    timestamp: Date.now()
                });
            });
        }
        
        // Return combined cached and fresh data
        return keys.reduce((result, key) => {
            result[key] = this.cache.get(key)?.value;
            return result;
        }, {});
    }
    
    isCached(key) {
        const cached = this.cache.get(key);
        return cached && (Date.now() - cached.timestamp) < this.cacheExpiry;
    }
}
```

### UI Performance

#### Popup Load Time
**Target**: < 500ms from click to fully rendered

```javascript
// Lazy loading for popup components
class LazyPopupLoader {
    constructor() {
        this.loadStartTime = performance.now();
        this.criticalDataPromise = this.loadCriticalData();
    }
    
    async loadCriticalData() {
        // Load only essential data for initial render
        const essential = await browser.storage.local.get([
            'theme', 'language', 'recentSettings'
        ]);
        return essential;
    }
    
    async renderPopup() {
        profiler.startTiming('popup-render');
        
        // Render with critical data first
        const criticalData = await this.criticalDataPromise;
        this.renderSkeleton(criticalData);
        
        const skeletonTime = profiler.endTiming('popup-render');
        console.log(`Popup skeleton rendered in ${skeletonTime}ms`);
        
        // Load remaining data asynchronously
        this.loadNonCriticalData().then(data => {
            this.updatePopupContent(data);
        });
    }
    
    renderSkeleton(data) {
        // Fast initial render with skeleton UI
        document.getElementById('popup').innerHTML = `
            <div class="skeleton-loader">
                <div class="skeleton-header"></div>
                <div class="skeleton-controls"></div>
            </div>
        `;
    }
    
    async loadNonCriticalData() {
        // Load detailed settings asynchronously
        return await browser.storage.local.get();
    }
}
```

#### Options Page Performance
**Target**: < 1 second full load time

```javascript
// Virtual scrolling for large settings lists
class VirtualizedSettingsList {
    constructor(container, items, itemHeight = 50) {
        this.container = container;
        this.items = items;
        this.itemHeight = itemHeight;
        this.visibleCount = Math.ceil(container.clientHeight / itemHeight);
        this.scrollTop = 0;
        
        this.setupVirtualScrolling();
    }
    
    setupVirtualScrolling() {
        // Create virtual container
        const totalHeight = this.items.length * this.itemHeight;
        this.container.style.height = `${totalHeight}px`;
        
        // Handle scroll events
        this.container.addEventListener('scroll', () => {
            this.scrollTop = this.container.scrollTop;
            this.renderVisibleItems();
        });
        
        this.renderVisibleItems();
    }
    
    renderVisibleItems() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(startIndex + this.visibleCount + 1, this.items.length);
        
        profiler.startTiming('virtual-render');
        
        // Clear container and render only visible items
        const fragment = document.createDocumentFragment();
        
        for (let i = startIndex; i < endIndex; i++) {
            const item = this.createItemElement(this.items[i], i);
            fragment.appendChild(item);
        }
        
        this.container.innerHTML = '';
        this.container.appendChild(fragment);
        
        const renderTime = profiler.endTiming('virtual-render');
        console.log(`Virtual scroll render: ${renderTime}ms for ${endIndex - startIndex} items`);
    }
}
```

### Background Script Performance

#### Service Worker Optimization
```javascript
// Efficient background processing
class BackgroundProcessor {
    constructor() {
        this.processingQueue = [];
        this.isProcessing = false;
        this.batchSize = 10;
        this.processInterval = 100; // ms
    }
    
    addTask(task) {
        this.processingQueue.push(task);
        if (!this.isProcessing) {
            this.startProcessing();
        }
    }
    
    async startProcessing() {
        this.isProcessing = true;
        
        while (this.processingQueue.length > 0) {
            profiler.startTiming('batch-processing');
            
            const batch = this.processingQueue.splice(0, this.batchSize);
            await Promise.all(batch.map(task => this.processTask(task)));
            
            const batchTime = profiler.endTiming('batch-processing');
            console.log(`Processed ${batch.length} tasks in ${batchTime}ms`);
            
            // Yield control to prevent blocking
            await new Promise(resolve => setTimeout(resolve, this.processInterval));
        }
        
        this.isProcessing = false;
    }
    
    async processTask(task) {
        // Process individual task with timeout
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Task timeout'));
            }, 5000); // 5 second timeout
            
            task.execute().then(result => {
                clearTimeout(timeout);
                resolve(result);
            }).catch(error => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
}
```

## Performance Testing Scenarios

### Automated Performance Tests

```javascript
// Jest performance test suite
describe('Settings Extension Performance', () => {
    let profiler;
    
    beforeEach(() => {
        profiler = new PerformanceProfiler();
    });
    
    test('Settings save performance', async () => {
        const testSettings = generateTestSettings(100);
        
        profiler.startTiming('save-test');
        await settingsManager.saveSettings(testSettings);
        const saveTime = profiler.endTiming('save-test');
        
        expect(saveTime).toBeLessThan(100); // < 100ms target
    });
    
    test('Settings load performance', async () => {
        const settingKeys = Array.from({length: 50}, (_, i) => `setting_${i}`);
        
        profiler.startTiming('load-test');
        const loadedSettings = await settingsManager.loadSettings(settingKeys);
        const loadTime = profiler.endTiming('load-test');
        
        expect(loadTime).toBeLessThan(50); // < 50ms target
        expect(Object.keys(loadedSettings)).toHaveLength(50);
    });
    
    test('Popup load performance', async () => {
        const popup = new LazyPopupLoader();
        
        profiler.startTiming('popup-test');
        await popup.renderPopup();
        const popupTime = profiler.endTiming('popup-test');
        
        expect(popupTime).toBeLessThan(500); // < 500ms target
    });
    
    test('Memory usage stability', async () => {
        const initialMemory = await measureMemoryUsage();
        
        // Perform 100 save/load cycles
        for (let i = 0; i < 100; i++) {
            await settingsManager.saveSettings({[`test_${i}`]: Math.random()});
            await settingsManager.loadSettings([`test_${i}`]);
        }
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        const finalMemory = await measureMemoryUsage();
        const memoryGrowth = finalMemory - initialMemory;
        
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // < 10MB growth
    });
});

async function measureMemoryUsage() {
    if (performance.memory) {
        return performance.memory.usedJSHeapSize;
    }
    return 0; // Fallback if memory API not available
}
```

### Load Testing

```javascript
// Stress test utility
class StressTest {
    async testConcurrentOperations(operationCount = 50) {
        console.log(`Starting stress test with ${operationCount} concurrent operations`);
        
        profiler.startTiming('stress-test');
        
        const operations = Array.from({length: operationCount}, (_, i) => 
            this.simulateUserOperation(i)
        );
        
        const results = await Promise.allSettled(operations);
        const stressTime = profiler.endTiming('stress-test');
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.length - successful;
        
        console.log(`Stress test completed in ${stressTime}ms`);
        console.log(`Successful operations: ${successful}/${operationCount}`);
        console.log(`Failed operations: ${failed}/${operationCount}`);
        
        return { successful, failed, duration: stressTime };
    }
    
    async simulateUserOperation(id) {
        const settingKey = `stress_setting_${id}`;
        const settingValue = {
            id,
            timestamp: Date.now(),
            data: Array.from({length: 100}, () => Math.random())
        };
        
        // Simulate typical user workflow
        await settingsManager.saveSettings({[settingKey]: settingValue});
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        await settingsManager.loadSettings([settingKey]);
        await settingsManager.deleteSettings([settingKey]);
    }
}
```

## Performance Optimization Techniques

### Caching Strategies

```javascript
// Multi-level caching system
class PerformanceCache {
    constructor() {
        this.memoryCache = new Map();
        this.persistentCache = new Map();
        this.maxMemoryCacheSize = 100; // entries
        this.cacheExpiry = 300000; // 5 minutes
    }
    
    async get(key) {
        // Check memory cache first
        if (this.memoryCache.has(key)) {
            const cached = this.memoryCache.get(key);
            if (this.isValid(cached)) {
                return cached.value;
            }
            this.memoryCache.delete(key);
        }
        
        // Check persistent cache
        try {
            const persistentKey = `cache_${key}`;
            const result = await browser.storage.local.get(persistentKey);
            const cached = result[persistentKey];
            
            if (cached && this.isValid(cached)) {
                // Promote to memory cache
                this.setMemoryCache(key, cached);
                return cached.value;
            }
        } catch (error) {
            console.warn('Persistent cache read error:', error);
        }
        
        return null;
    }
    
    async set(key, value) {
        const cacheEntry = {
            value,
            timestamp: Date.now(),
            accessCount: 1
        };
        
        // Set in memory cache
        this.setMemoryCache(key, cacheEntry);
        
        // Set in persistent cache
        try {
            const persistentKey = `cache_${key}`;
            await browser.storage.local.set({
                [persistentKey]: cacheEntry
            });
        } catch (error) {
            console.warn('Persistent cache write error:', error);
        }
    }
    
    setMemoryCache(key, entry) {
        // Implement LRU eviction
        if (this.memoryCache.size >= this.maxMemoryCacheSize) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }
        
        this.memoryCache.set(key, entry);
    }
    
    isValid(cacheEntry) {
        return (Date.now() - cacheEntry.timestamp) < this.cacheExpiry;
    }
}
```

### Debouncing and Throttling

```javascript
// Performance utilities for user input
class PerformanceUtils {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Optimized search with debouncing
    static createDebouncedSearch(searchFunction, delay = 300) {
        return this.debounce(async (query) => {
            if (query.length < 2) return [];
            
            profiler.startTiming('search');
            const results = await searchFunction(query);
            const searchTime = profiler.endTiming('search');
            
            console.log(`Search for "${query}" took ${searchTime}ms`);
            return results;
        }, delay);
    }
}

// Usage in settings search
const debouncedSettingsSearch = PerformanceUtils.createDebouncedSearch(
    async (query) => {
        const allSettings = await settingsManager.getAllSettings();
        return Object.entries(allSettings).filter(([key, value]) => 
            key.toLowerCase().includes(query.toLowerCase()) ||
            JSON.stringify(value).toLowerCase().includes(query.toLowerCase())
        );
    }
);
```

## Performance Monitoring

### Real-time Metrics Collection

```javascript
// Performance monitoring service
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.isCollecting = false;
        this.collectionInterval = 60000; // 1 minute
        this.maxMetrics = 100; // Keep last 100 measurements
    }
    
    startMonitoring() {
        if (this.isCollecting) return;
        
        this.isCollecting = true;
        this.collectMetrics();
        
        this.monitoringTimer = setInterval(() => {
            this.collectMetrics();
        }, this.collectionInterval);
    }
    
    stopMonitoring() {
        this.isCollecting = false;
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
        }
    }
    
    async collectMetrics() {
        const metrics = {
            timestamp: Date.now(),
            memory: this.getMemoryMetrics(),
            performance: this.getPerformanceMetrics(),
            storage: await this.getStorageMetrics(),
            operations: profiler.getMetrics()
        };
        
        this.metrics.push(metrics);
        
        // Keep only recent metrics
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }
        
        // Log performance warnings
        this.checkPerformanceThresholds(metrics);
    }
    
    getMemoryMetrics() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }
    
    getPerformanceMetrics() {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
            loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : null,
            domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : null
        };
    }
    
    async getStorageMetrics() {
        try {
            const usage = await browser.storage.local.getBytesInUse();
            return { bytesUsed: usage };
        } catch (error) {
            return { error: error.message };
        }
    }
    
    checkPerformanceThresholds(metrics) {
        // Check memory usage
        if (metrics.memory && metrics.memory.used > 50 * 1024 * 1024) { // 50MB
            console.warn('High memory usage detected:', metrics.memory.used / 1024 / 1024, 'MB');
        }
        
        // Check operation times
        Object.entries(metrics.operations).forEach(([operation, timing]) => {
            if (timing.duration > 1000) { // 1 second
                console.warn(`Slow operation detected: ${operation} took ${timing.duration}ms`);
            }
        });
    }
    
    getPerformanceReport() {
        const recent = this.metrics.slice(-10); // Last 10 measurements
        
        return {
            averageMemoryUsage: this.calculateAverage(recent, 'memory.used'),
            slowestOperations: this.findSlowestOperations(recent),
            performanceTrends: this.analyzePerformanceTrends(recent),
            recommendations: this.generateRecommendations(recent)
        };
    }
    
    calculateAverage(metrics, path) {
        const values = metrics
            .map(m => this.getNestedProperty(m, path))
            .filter(v => v !== null);
        
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }
    
    getNestedProperty(obj, path) {
        return path.split('.').reduce((o, p) => o && o[p], obj);
    }
    
    findSlowestOperations(metrics) {
        const operations = {};
        
        metrics.forEach(metric => {
            if (metric.operations) {
                Object.entries(metric.operations).forEach(([op, timing]) => {
                    if (!operations[op] || timing.duration > operations[op].duration) {
                        operations[op] = timing;
                    }
                });
            }
        });
        
        return Object.entries(operations)
            .sort((a, b) => b[1].duration - a[1].duration)
            .slice(0, 5);
    }
    
    analyzePerformanceTrends(metrics) {
        // Simple trend analysis
        const memoryTrend = this.calculateTrend(metrics, 'memory.used');
        const loadTimeTrend = this.calculateTrend(metrics, 'performance.loadTime');
        
        return { memoryTrend, loadTimeTrend };
    }
    
    calculateTrend(metrics, path) {
        const values = metrics
            .map(m => this.getNestedProperty(m, path))
            .filter(v => v !== null);
        
        if (values.length < 2) return 'insufficient_data';
        
        const first = values[0];
        const last = values[values.length - 1];
        const change = ((last - first) / first) * 100;
        
        if (Math.abs(change) < 5) return 'stable';
        return change > 0 ? 'increasing' : 'decreasing';
    }
    
    generateRecommendations(metrics) {
        const recommendations = [];
        const avgMemory = this.calculateAverage(metrics, 'memory.used');
        
        if (avgMemory > 25 * 1024 * 1024) { // 25MB
            recommendations.push('Consider implementing more aggressive caching cleanup');
        }
        
        const slowOps = this.findSlowestOperations(metrics);
        if (slowOps.length > 0 && slowOps[0][1].duration > 500) {
            recommendations.push(`Optimize ${slowOps[0][0]} operation (currently ${slowOps[0][1].duration}ms)`);
        }
        
        return recommendations;
    }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();
```

## Related Documentation

### Architecture and Requirements
- **[Quality Requirements](../../architecture/10-quality-requirements.md)** - Performance targets and quality attributes
- **[Building Blocks View](../../architecture/05-building-blocks.md)** - System components affecting performance
- **[Risks and Technical Debt](../../architecture/11-risks-technical-debt.md)** - Known performance risks

### Development Workflows
- **[Testing Guide](../workflows/testing-guide.md)** - Performance testing procedures
- **[Local Setup Guide](../workflows/local-setup.md)** - Development environment performance optimization
- **[Debugging Guide](../workflows/debugging-guide.md)** - Performance debugging techniques

### User Impact
- **[Sync Mechanism Explanation](../../user/explanation/sync-mechanism.md)** - User-facing performance implications
- **[Settings Types Reference](../../user/reference/settings-types.md)** - Performance characteristics of different setting types

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-08-11 | Development Team | Initial performance profiling guide |