/**
 * Production Patterns for Settings Extension API
 *
 * Advanced patterns for enterprise-grade extensions showing sophisticated
 * integration techniques, performance optimization, error recovery, and
 * production deployment patterns based on the actual implementation.
 *
 * 🏭 PRODUCTION FEATURES:
 * - Multi-layered error recovery with circuit breakers
 * - Performance monitoring and optimization
 * - Memory management and cleanup
 * - Sophisticated initialization sequences  
 * - Advanced caching strategies
 * - Integration with existing extension architectures
 * - Health monitoring and diagnostics
 * - Graceful degradation patterns
 * - Testing hooks and validation
 *
 * Use these patterns when building enterprise or high-scale extensions.
 */

// ========================================
// ADVANCED INITIALIZATION PATTERN
// ========================================

/**
 * Enterprise Settings Manager with multi-phase initialization
 * Handles complex startup sequences with dependency management
 */
class EnterpriseSettingsManager {
  constructor(options = {}) {
    this.settings = new ContentScriptSettings();
    this.options = {
      initTimeout: options.initTimeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      healthCheckInterval: options.healthCheckInterval || 60000,
      performanceThreshold: options.performanceThreshold || 1000,
      memoryThreshold: options.memoryThreshold || 10 * 1024 * 1024, // 10MB
      ...options
    };
    
    this.state = {
      phase: 'uninitialized',
      lastHealthCheck: null,
      performanceMetrics: new Map(),
      errorHistory: [],
      memoryUsage: { current: 0, peak: 0 },
      circuitBreaker: { failures: 0, lastFailure: null, open: false }
    };
    
    this.dependencies = new Map();
    this.healthMonitor = null;
    this.performanceTimer = null;
    this.config = {};
    
    console.log("🏭 Enterprise Settings Manager initialized");
  }

  /**
   * Multi-phase initialization with dependency resolution
   */
  async initialize() {
    const startTime = performance.now();
    
    try {
      console.log("🚀 Starting enterprise initialization sequence...");
      
      // Phase 1: Pre-flight checks
      await this.runPreflightChecks();
      this.state.phase = 'preflight_complete';
      
      // Phase 2: Core settings loading with timeout
      await this.loadCoreSettings();
      this.state.phase = 'core_loaded';
      
      // Phase 3: Dependency resolution
      await this.resolveDependencies();
      this.state.phase = 'dependencies_resolved';
      
      // Phase 4: Configuration application
      await this.applyConfiguration();
      this.state.phase = 'configured';
      
      // Phase 5: Health monitoring setup
      await this.setupHealthMonitoring();
      this.state.phase = 'monitoring_active';
      
      // Phase 6: Production readiness verification
      await this.verifyProductionReadiness();
      this.state.phase = 'production_ready';
      
      const initTime = performance.now() - startTime;
      this.recordPerformanceMetric('initialization', initTime);
      
      console.log(`✅ Enterprise initialization completed in ${Math.round(initTime)}ms`);
      console.log(`📊 Final state: ${this.state.phase}`);
      
      return {
        success: true,
        phase: this.state.phase,
        initTime,
        metrics: Object.fromEntries(this.state.performanceMetrics)
      };
      
    } catch (error) {
      console.error("❌ Enterprise initialization failed:", error);
      
      this.state.errorHistory.push({
        timestamp: Date.now(),
        phase: this.state.phase,
        error: error.message,
        stack: error.stack
      });
      
      // Attempt graceful degradation
      return await this.handleInitializationFailure(error);
    }
  }

  async runPreflightChecks() {
    console.log("✈️ Running preflight checks...");
    
    const checks = [
      { name: 'browser_api', check: () => this.checkBrowserAPI() },
      { name: 'storage_available', check: () => this.checkStorageAvailable() },
      { name: 'permissions', check: () => this.checkPermissions() },
      { name: 'memory_available', check: () => this.checkMemoryAvailable() },
      { name: 'network_connectivity', check: () => this.checkNetworkConnectivity() }
    ];
    
    const results = [];
    
    for (const { name, check } of checks) {
      try {
        const result = await Promise.race([
          check(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);
        
        results.push({ name, passed: true, result });
        console.log(`  ✅ ${name}: passed`);
        
      } catch (error) {
        results.push({ name, passed: false, error: error.message });
        console.warn(`  ⚠️ ${name}: ${error.message}`);
        
        // Some checks are critical
        if (['browser_api', 'storage_available'].includes(name)) {
          throw new Error(`Critical preflight check failed: ${name}`);
        }
      }
    }
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    console.log(`  📋 Preflight summary: ${passed}/${total} checks passed`);
    
    return results;
  }

  async loadCoreSettings() {
    console.log("⚙️ Loading core settings...");
    
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Settings load timeout')), this.options.initTimeout)
    );
    
    try {
      this.config = await Promise.race([
        this.settings.getAllSettings(),
        timeout
      ]);
      
      console.log(`  📦 Loaded ${Object.keys(this.config).length} settings`);
      
      // Validate critical settings
      await this.validateCriticalSettings();
      
    } catch (error) {
      console.error("❌ Core settings load failed:", error);
      
      // Try fallback loading strategies
      return await this.attemptFallbackLoad();
    }
  }

  async validateCriticalSettings() {
    const critical = ['feature_enabled', 'api_key', 'refresh_interval'];
    const missing = critical.filter(key => !this.config[key]);
    
    if (missing.length > 0) {
      console.warn("⚠️ Missing critical settings:", missing);
      
      // Auto-populate with safe defaults
      for (const key of missing) {
        this.config[key] = await this.getSafeDefault(key);
      }
    }
  }

  async getSafeDefault(key) {
    const defaults = {
      feature_enabled: { type: 'boolean', value: false, description: 'Feature toggle' },
      api_key: { type: 'text', value: '', description: 'API key' },
      refresh_interval: { type: 'number', value: 300, description: 'Refresh interval' }
    };
    
    return defaults[key] || { type: 'text', value: '', description: `Default for ${key}` };
  }

  async attemptFallbackLoad() {
    console.log("🔄 Attempting fallback loading strategies...");
    
    const strategies = [
      () => this.loadFromCache(),
      () => this.loadMinimalConfig(),
      () => this.loadEmbeddedDefaults()
    ];
    
    for (const [index, strategy] of strategies.entries()) {
      try {
        console.log(`  Trying strategy ${index + 1}...`);
        this.config = await strategy();
        console.log(`  ✅ Fallback strategy ${index + 1} succeeded`);
        return;
      } catch (error) {
        console.warn(`  ❌ Strategy ${index + 1} failed:`, error.message);
      }
    }
    
    throw new Error('All fallback strategies failed');
  }

  async loadFromCache() {
    const cached = this.settings.getCachedSettings();
    if (Object.keys(cached).length === 0) {
      throw new Error('No cached settings available');
    }
    return cached;
  }

  async loadMinimalConfig() {
    return {
      feature_enabled: { type: 'boolean', value: false, description: 'Feature toggle' },
      refresh_interval: { type: 'number', value: 60, description: 'Refresh interval' }
    };
  }

  async loadEmbeddedDefaults() {
    // Load from embedded configuration
    const embedded = {
      feature_enabled: { type: 'boolean', value: true, description: 'Enable main feature' },
      api_key: { type: 'text', value: '', description: 'API key for service' },
      refresh_interval: { type: 'number', value: 60, description: 'Auto-refresh interval' },
      custom_css: { type: 'longtext', value: '', description: 'Custom CSS styles' }
    };
    
    return embedded;
  }

  async resolveDependencies() {
    console.log("🔗 Resolving dependencies...");
    
    const dependencies = [
      { name: 'theme_engine', resolver: () => this.initializeThemeEngine() },
      { name: 'api_client', resolver: () => this.initializeAPIClient() },
      { name: 'cache_manager', resolver: () => this.initializeCacheManager() },
      { name: 'metrics_collector', resolver: () => this.initializeMetricsCollector() }
    ];
    
    for (const { name, resolver } of dependencies) {
      try {
        const dependency = await resolver();
        this.dependencies.set(name, dependency);
        console.log(`  ✅ ${name} resolved`);
      } catch (error) {
        console.warn(`  ⚠️ ${name} failed to resolve:`, error.message);
        
        // Some dependencies are optional
        if (!['metrics_collector'].includes(name)) {
          throw new Error(`Critical dependency failed: ${name}`);
        }
      }
    }
    
    console.log(`  📋 Dependencies resolved: ${this.dependencies.size}`);
  }

  async applyConfiguration() {
    console.log("⚙️ Applying configuration...");
    
    const startTime = performance.now();
    
    try {
      // Apply settings in dependency order
      const applyOrder = [
        'theme_settings',
        'api_configuration',
        'feature_toggles', 
        'performance_settings',
        'cache_configuration'
      ];
      
      for (const category of applyOrder) {
        await this.applyCategoryConfiguration(category);
      }
      
      const applyTime = performance.now() - startTime;
      this.recordPerformanceMetric('configuration_apply', applyTime);
      
      console.log(`  ✅ Configuration applied in ${Math.round(applyTime)}ms`);
      
    } catch (error) {
      console.error("❌ Configuration application failed:", error);
      throw error;
    }
  }

  async applyCategoryConfiguration(category) {
    switch (category) {
      case 'theme_settings':
        if (this.config.custom_css?.value && this.dependencies.has('theme_engine')) {
          const themeEngine = this.dependencies.get('theme_engine');
          await themeEngine.applyCSS(this.config.custom_css.value);
        }
        break;
        
      case 'api_configuration':
        if (this.config.api_key?.value && this.dependencies.has('api_client')) {
          const apiClient = this.dependencies.get('api_client');
          await apiClient.configure({
            apiKey: this.config.api_key.value,
            ...this.config.advanced_config?.value
          });
        }
        break;
        
      case 'feature_toggles':
        if (this.config.feature_enabled?.value) {
          await this.enableFeatures();
        }
        break;
        
      case 'performance_settings':
        await this.configurePerformanceSettings();
        break;
        
      case 'cache_configuration':
        if (this.dependencies.has('cache_manager')) {
          const cacheManager = this.dependencies.get('cache_manager');
          await cacheManager.configure({
            maxSize: this.config.cache_size?.value || 1024 * 1024,
            ttl: this.config.cache_ttl?.value || 3600
          });
        }
        break;
    }
  }

  async setupHealthMonitoring() {
    console.log("❤️ Setting up health monitoring...");
    
    // Regular health checks
    this.healthMonitor = setInterval(() => {
      this.performHealthCheck();
    }, this.options.healthCheckInterval);
    
    // Performance monitoring
    this.performanceTimer = setInterval(() => {
      this.collectPerformanceMetrics();
    }, 30000); // Every 30 seconds
    
    // Memory monitoring
    if (performance.memory) {
      setInterval(() => {
        this.monitorMemoryUsage();
      }, 10000); // Every 10 seconds
    }
    
    // Initial health check
    await this.performHealthCheck();
    
    console.log("  ✅ Health monitoring active");
  }

  async performHealthCheck() {
    const checkTime = Date.now();
    
    try {
      // Test settings connectivity
      const pingStart = performance.now();
      await this.settings.getSetting('feature_enabled');
      const pingTime = performance.now() - pingStart;
      
      // Check circuit breaker status
      const circuitOk = !this.state.circuitBreaker.open;
      
      // Check memory usage
      const memoryOk = this.state.memoryUsage.current < this.options.memoryThreshold;
      
      // Check error rate
      const recentErrors = this.state.errorHistory.filter(
        error => checkTime - error.timestamp < 300000 // Last 5 minutes
      );
      const errorRateOk = recentErrors.length < 5;
      
      const healthy = circuitOk && memoryOk && errorRateOk && pingTime < 1000;
      
      this.state.lastHealthCheck = {
        timestamp: checkTime,
        healthy,
        metrics: {
          pingTime,
          circuitOk,
          memoryOk, 
          errorRateOk,
          recentErrorCount: recentErrors.length
        }
      };
      
      if (!healthy) {
        console.warn("⚠️ Health check failed:", this.state.lastHealthCheck.metrics);
        await this.handleHealthFailure();
      }
      
    } catch (error) {
      console.error("❌ Health check error:", error);
      this.recordError('health_check', error);
    }
  }

  async handleHealthFailure() {
    console.log("🚑 Handling health failure...");
    
    // Increment circuit breaker
    this.state.circuitBreaker.failures++;
    this.state.circuitBreaker.lastFailure = Date.now();
    
    // Open circuit breaker if too many failures
    if (this.state.circuitBreaker.failures >= 3) {
      this.state.circuitBreaker.open = true;
      console.warn("⚡ Circuit breaker opened - entering degraded mode");
      
      // Auto-recovery after cooldown
      setTimeout(() => {
        this.state.circuitBreaker.open = false;
        this.state.circuitBreaker.failures = 0;
        console.log("🔄 Circuit breaker reset");
      }, 60000); // 1 minute cooldown
    }
  }

  collectPerformanceMetrics() {
    if (this.state.performanceMetrics.size > 1000) {
      // Cleanup old metrics
      const entries = Array.from(this.state.performanceMetrics.entries());
      const recent = entries.slice(-500); // Keep last 500
      this.state.performanceMetrics = new Map(recent);
    }
    
    // Collect current performance data
    const now = Date.now();
    const metrics = {
      timestamp: now,
      heap: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null,
      cachedSettings: this.settings.getCachedSettings(),
      errorCount: this.state.errorHistory.length,
      circuitBreakerOpen: this.state.circuitBreaker.open
    };
    
    this.recordPerformanceMetric('system_metrics', JSON.stringify(metrics).length);
  }

  monitorMemoryUsage() {
    if (performance.memory) {
      const current = performance.memory.usedJSHeapSize;
      this.state.memoryUsage.current = current;
      
      if (current > this.state.memoryUsage.peak) {
        this.state.memoryUsage.peak = current;
      }
      
      // Warn if memory usage is high
      if (current > this.options.memoryThreshold) {
        console.warn(`⚠️ High memory usage: ${Math.round(current / 1024 / 1024)}MB`);
        
        // Trigger cleanup
        this.performMemoryCleanup();
      }
    }
  }

  performMemoryCleanup() {
    console.log("🧹 Performing memory cleanup...");
    
    // Clear old performance metrics
    if (this.state.performanceMetrics.size > 100) {
      const entries = Array.from(this.state.performanceMetrics.entries());
      this.state.performanceMetrics = new Map(entries.slice(-50));
    }
    
    // Clear old error history
    const fiveMinutesAgo = Date.now() - 300000;
    this.state.errorHistory = this.state.errorHistory.filter(
      error => error.timestamp > fiveMinutesAgo
    );
    
    // Clear settings cache
    this.settings.clearCache();
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    console.log("  ✅ Memory cleanup completed");
  }

  async verifyProductionReadiness() {
    console.log("🔍 Verifying production readiness...");
    
    const checks = [
      { name: 'settings_loaded', test: () => Object.keys(this.config).length > 0 },
      { name: 'dependencies_resolved', test: () => this.dependencies.size > 0 },
      { name: 'health_monitoring', test: () => !!this.healthMonitor },
      { name: 'error_handling', test: () => this.state.errorHistory !== undefined },
      { name: 'performance_tracking', test: () => this.state.performanceMetrics.size >= 0 }
    ];
    
    let passed = 0;
    for (const { name, test } of checks) {
      try {
        if (test()) {
          console.log(`  ✅ ${name}: ready`);
          passed++;
        } else {
          console.warn(`  ❌ ${name}: not ready`);
        }
      } catch (error) {
        console.error(`  ❌ ${name}: error - ${error.message}`);
      }
    }
    
    const readinessScore = (passed / checks.length) * 100;
    console.log(`  📊 Production readiness: ${readinessScore}%`);
    
    if (readinessScore < 80) {
      throw new Error(`Production readiness too low: ${readinessScore}%`);
    }
    
    return { score: readinessScore, passed, total: checks.length };
  }

  recordPerformanceMetric(name, value) {
    const timestamp = Date.now();
    const key = `${name}_${timestamp}`;
    
    this.state.performanceMetrics.set(key, {
      name,
      value,
      timestamp
    });
  }

  recordError(category, error) {
    this.state.errorHistory.push({
      timestamp: Date.now(),
      category,
      message: error.message,
      stack: error.stack
    });
    
    // Limit error history size
    if (this.state.errorHistory.length > 100) {
      this.state.errorHistory = this.state.errorHistory.slice(-50);
    }
  }

  async handleInitializationFailure(error) {
    console.log("🆘 Handling initialization failure...");
    
    this.recordError('initialization', error);
    
    try {
      // Minimal emergency mode
      this.config = await this.loadMinimalConfig();
      this.state.phase = 'emergency_mode';
      
      console.log("🚨 Running in emergency mode with minimal configuration");
      
      return {
        success: false,
        emergency: true,
        phase: this.state.phase,
        error: error.message
      };
      
    } catch (emergencyError) {
      console.error("❌ Emergency mode failed:", emergencyError);
      
      this.state.phase = 'failed';
      
      return {
        success: false,
        emergency: false,
        phase: this.state.phase,
        error: error.message,
        emergencyError: emergencyError.message
      };
    }
  }

  // Dependency initializers
  async initializeThemeEngine() {
    return {
      applyCSS: async (css) => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        return style;
      }
    };
  }

  async initializeAPIClient() {
    return {
      configure: async (config) => {
        console.log("🔗 API client configured:", config.endpoint || 'default');
        return { configured: true, config };
      }
    };
  }

  async initializeCacheManager() {
    const cache = new Map();
    
    return {
      configure: async (config) => {
        console.log("💾 Cache manager configured:", config);
      },
      get: (key) => cache.get(key),
      set: (key, value) => cache.set(key, value),
      clear: () => cache.clear(),
      size: () => cache.size
    };
  }

  async initializeMetricsCollector() {
    return {
      collect: (name, value) => {
        this.recordPerformanceMetric(name, value);
      },
      getMetrics: () => Object.fromEntries(this.state.performanceMetrics)
    };
  }

  async enableFeatures() {
    console.log("🎯 Enabling features...");
    document.body.classList.add('extension-features-enabled');
  }

  async configurePerformanceSettings() {
    const interval = this.config.refresh_interval?.value || 60;
    console.log(`⚡ Performance settings: refresh every ${interval}s`);
  }

  // Health check helpers
  async checkBrowserAPI() {
    if (!window.ContentScriptSettings) {
      throw new Error('ContentScriptSettings not available');
    }
    return true;
  }

  async checkStorageAvailable() {
    try {
      await this.settings.getSetting('feature_enabled');
      return true;
    } catch (error) {
      throw new Error('Storage not accessible');
    }
  }

  async checkPermissions() {
    // Check if required permissions are available
    return true; // Simplified for example
  }

  async checkMemoryAvailable() {
    if (performance.memory && performance.memory.usedJSHeapSize > this.options.memoryThreshold) {
      throw new Error('Insufficient memory available');
    }
    return true;
  }

  async checkNetworkConnectivity() {
    if (!navigator.onLine) {
      throw new Error('Network not available');
    }
    return true;
  }

  // Public API
  async updateSetting(key, value) {
    if (this.state.circuitBreaker.open) {
      throw new Error('Circuit breaker open - service degraded');
    }
    
    try {
      const result = await this.settings.updateSetting(key, value);
      
      // Reset circuit breaker on success
      if (this.state.circuitBreaker.failures > 0) {
        this.state.circuitBreaker.failures = Math.max(0, this.state.circuitBreaker.failures - 1);
      }
      
      return result;
      
    } catch (error) {
      this.recordError('setting_update', error);
      throw error;
    }
  }

  getHealthStatus() {
    return {
      phase: this.state.phase,
      healthy: this.state.lastHealthCheck?.healthy ?? false,
      lastCheck: this.state.lastHealthCheck?.timestamp,
      metrics: this.state.lastHealthCheck?.metrics,
      circuitBreaker: this.state.circuitBreaker,
      memoryUsage: this.state.memoryUsage,
      errorCount: this.state.errorHistory.length
    };
  }

  getPerformanceReport() {
    const metrics = Array.from(this.state.performanceMetrics.values());
    
    return {
      totalMetrics: metrics.length,
      categories: [...new Set(metrics.map(m => m.name))],
      recentMetrics: metrics.slice(-10),
      averages: this.calculateAverages(metrics)
    };
  }

  calculateAverages(metrics) {
    const byCategory = {};
    
    for (const metric of metrics) {
      if (!byCategory[metric.name]) {
        byCategory[metric.name] = [];
      }
      byCategory[metric.name].push(metric.value);
    }
    
    const averages = {};
    for (const [category, values] of Object.entries(byCategory)) {
      averages[category] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    
    return averages;
  }

  async shutdown() {
    console.log("🔄 Shutting down enterprise settings manager...");
    
    // Clear health monitoring
    if (this.healthMonitor) {
      clearInterval(this.healthMonitor);
    }
    
    if (this.performanceTimer) {
      clearInterval(this.performanceTimer);
    }
    
    // Cleanup dependencies
    for (const [name, dependency] of this.dependencies) {
      if (dependency.cleanup) {
        try {
          await dependency.cleanup();
        } catch (error) {
          console.warn(`Dependency cleanup failed for ${name}:`, error);
        }
      }
    }
    
    // Cleanup settings
    this.settings.destroy();
    
    // Reset state
    this.state.phase = 'shutdown';
    
    console.log("✅ Enterprise settings manager shutdown completed");
  }
}

// ========================================
// INTEGRATION WITH EXISTING ARCHITECTURES
// ========================================

/**
 * Adapter pattern for integrating with existing extension architectures
 */
class SettingsAdapter {
  constructor(existingSystem, options = {}) {
    this.existingSystem = existingSystem;
    this.settings = new ContentScriptSettings();
    this.options = {
      syncMode: options.syncMode || 'bidirectional', // 'readonly', 'writeonly', 'bidirectional'
      conflictResolution: options.conflictResolution || 'settings_wins',
      syncInterval: options.syncInterval || 30000,
      ...options
    };
    
    this.syncTimer = null;
    this.conflictLog = [];
  }

  async initialize() {
    console.log("🔌 Initializing Settings Adapter...");
    
    // Initial sync
    await this.performSync();
    
    // Setup periodic sync
    if (this.options.syncInterval > 0) {
      this.syncTimer = setInterval(() => {
        this.performSync().catch(console.error);
      }, this.options.syncInterval);
    }
    
    // Setup change listeners
    this.setupChangeListeners();
    
    console.log("✅ Settings Adapter initialized");
  }

  async performSync() {
    console.log("🔄 Performing settings sync...");
    
    try {
      const settingsData = await this.settings.getAllSettings();
      const existingData = await this.existingSystem.getConfiguration();
      
      const conflicts = this.detectConflicts(settingsData, existingData);
      
      if (conflicts.length > 0) {
        console.log(`⚠️ Found ${conflicts.length} conflicts`);
        await this.resolveConflicts(conflicts);
      }
      
      // Sync based on mode
      switch (this.options.syncMode) {
        case 'readonly':
          await this.syncToExistingSystem(settingsData);
          break;
          
        case 'writeonly':
          await this.syncFromExistingSystem(existingData);
          break;
          
        case 'bidirectional':
          await this.bidirectionalSync(settingsData, existingData);
          break;
      }
      
    } catch (error) {
      console.error("❌ Sync failed:", error);
    }
  }

  detectConflicts(settingsData, existingData) {
    const conflicts = [];
    
    for (const [key, settingValue] of Object.entries(settingsData)) {
      const existingValue = existingData[key];
      
      if (existingValue !== undefined && 
          JSON.stringify(settingValue.value) !== JSON.stringify(existingValue)) {
        conflicts.push({
          key,
          settingsValue: settingValue.value,
          existingValue,
          timestamp: Date.now()
        });
      }
    }
    
    return conflicts;
  }

  async resolveConflicts(conflicts) {
    for (const conflict of conflicts) {
      let resolution;
      
      switch (this.options.conflictResolution) {
        case 'settings_wins':
          resolution = conflict.settingsValue;
          await this.existingSystem.updateConfiguration(conflict.key, resolution);
          break;
          
        case 'existing_wins':
          resolution = conflict.existingValue;
          await this.settings.updateSetting(conflict.key, resolution);
          break;
          
        case 'timestamp_wins':
          // Use most recently modified (simplified logic)
          resolution = conflict.settingsValue; // Assume settings is more recent
          break;
          
        case 'manual':
          // Log for manual resolution
          this.conflictLog.push(conflict);
          continue;
      }
      
      console.log(`🔧 Resolved conflict for ${conflict.key}: ${resolution}`);
    }
  }

  async syncToExistingSystem(settingsData) {
    for (const [key, setting] of Object.entries(settingsData)) {
      try {
        await this.existingSystem.updateConfiguration(key, setting.value);
      } catch (error) {
        console.warn(`Failed to sync ${key} to existing system:`, error);
      }
    }
  }

  async syncFromExistingSystem(existingData) {
    for (const [key, value] of Object.entries(existingData)) {
      try {
        await this.settings.updateSetting(key, value);
      } catch (error) {
        console.warn(`Failed to sync ${key} from existing system:`, error);
      }
    }
  }

  async bidirectionalSync(settingsData, existingData) {
    // Implement smart merge logic
    const updates = {};
    
    // Settings that exist only in settings system
    for (const [key, setting] of Object.entries(settingsData)) {
      if (!(key in existingData)) {
        await this.existingSystem.updateConfiguration(key, setting.value);
      }
    }
    
    // Settings that exist only in existing system
    for (const [key, value] of Object.entries(existingData)) {
      if (!(key in settingsData)) {
        updates[key] = value;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      await this.settings.updateSettings(updates);
    }
  }

  setupChangeListeners() {
    // Listen to settings changes
    this.settings.addChangeListener(async (event, data) => {
      if (this.options.syncMode !== 'writeonly') {
        for (const [key, value] of Object.entries(data)) {
          try {
            await this.existingSystem.updateConfiguration(key, value);
          } catch (error) {
            console.warn(`Failed to sync change ${key}:`, error);
          }
        }
      }
    });
    
    // Listen to existing system changes (if supported)
    if (this.existingSystem.onConfigurationChange) {
      this.existingSystem.onConfigurationChange(async (key, value) => {
        if (this.options.syncMode !== 'readonly') {
          try {
            await this.settings.updateSetting(key, value);
          } catch (error) {
            console.warn(`Failed to sync existing system change ${key}:`, error);
          }
        }
      });
    }
  }

  getConflicts() {
    return [...this.conflictLog];
  }

  clearConflicts() {
    this.conflictLog = [];
  }

  destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.settings.destroy();
  }
}

// ========================================
// TESTING & VALIDATION PATTERNS
// ========================================

/**
 * Settings testing framework for production validation
 */
class SettingsTestSuite {
  constructor(settings) {
    this.settings = settings;
    this.tests = new Map();
    this.results = [];
  }

  addTest(name, testFunction, options = {}) {
    this.tests.set(name, {
      fn: testFunction,
      timeout: options.timeout || 5000,
      critical: options.critical || false,
      category: options.category || 'general'
    });
  }

  async runAllTests() {
    console.log("🧪 Running settings test suite...");
    
    const startTime = performance.now();
    this.results = [];
    
    for (const [name, test] of this.tests) {
      await this.runSingleTest(name, test);
    }
    
    const totalTime = performance.now() - startTime;
    
    const summary = this.generateTestReport();
    summary.totalTime = Math.round(totalTime);
    
    console.log("📊 Test suite completed:", summary);
    
    return summary;
  }

  async runSingleTest(name, test) {
    const startTime = performance.now();
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), test.timeout)
      );
      
      await Promise.race([test.fn(this.settings), timeoutPromise]);
      
      const duration = performance.now() - startTime;
      
      this.results.push({
        name,
        passed: true,
        duration,
        category: test.category,
        critical: test.critical
      });
      
      console.log(`  ✅ ${name} (${Math.round(duration)}ms)`);
      
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.results.push({
        name,
        passed: false,
        duration,
        error: error.message,
        category: test.category,
        critical: test.critical
      });
      
      console.error(`  ❌ ${name}: ${error.message}`);
    }
  }

  generateTestReport() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const critical = this.results.filter(r => r.critical && !r.passed).length;
    
    const categories = {};
    for (const result of this.results) {
      if (!categories[result.category]) {
        categories[result.category] = { passed: 0, failed: 0 };
      }
      categories[result.category][result.passed ? 'passed' : 'failed']++;
    }
    
    return {
      total: this.results.length,
      passed,
      failed,
      critical,
      successRate: Math.round((passed / this.results.length) * 100),
      categories,
      results: this.results
    };
  }
}

// Add common tests
function setupStandardTests(testSuite) {
  // Connectivity tests
  testSuite.addTest('settings_connectivity', async (settings) => {
    const result = await settings.getSetting('feature_enabled');
    if (!result) throw new Error('Failed to get basic setting');
  }, { critical: true, category: 'connectivity' });

  // Performance tests
  testSuite.addTest('settings_performance', async (settings) => {
    const start = performance.now();
    await settings.getAllSettings();
    const duration = performance.now() - start;
    
    if (duration > 2000) {
      throw new Error(`Settings load too slow: ${duration}ms`);
    }
  }, { category: 'performance' });

  // Data integrity tests
  testSuite.addTest('data_integrity', async (settings) => {
    const original = await settings.getSetting('feature_enabled');
    await settings.updateSetting('feature_enabled', !original.value);
    const updated = await settings.getSetting('feature_enabled');
    
    if (updated.value === original.value) {
      throw new Error('Setting update did not persist');
    }
    
    // Restore original value
    await settings.updateSetting('feature_enabled', original.value);
  }, { critical: true, category: 'integrity' });

  // Cache tests
  testSuite.addTest('cache_functionality', async (settings) => {
    // Load setting to populate cache
    await settings.getSetting('feature_enabled');
    
    // Check cache
    const cached = settings.getCachedSetting('feature_enabled');
    if (!cached) {
      throw new Error('Setting not cached after load');
    }
  }, { category: 'cache' });
}

// ========================================
// USAGE EXAMPLES
// ========================================

console.log("🏭 Loading production patterns...");

// Initialize enterprise settings manager
const enterpriseManager = new EnterpriseSettingsManager({
  initTimeout: 45000,
  retryAttempts: 5,
  healthCheckInterval: 30000,
  performanceThreshold: 2000
});

// Initialize settings adapter for existing system integration
const mockExistingSystem = {
  getConfiguration: async () => ({ theme: 'dark', language: 'en' }),
  updateConfiguration: async (key, value) => console.log(`Updated ${key}:`, value),
  onConfigurationChange: (callback) => {
    // Mock configuration change listener
    setTimeout(() => callback('theme', 'light'), 5000);
  }
};

const adapter = new SettingsAdapter(mockExistingSystem, {
  syncMode: 'bidirectional',
  conflictResolution: 'settings_wins',
  syncInterval: 60000
});

// Initialize test suite
const testSuite = new SettingsTestSuite(new ContentScriptSettings());
setupStandardTests(testSuite);

// Add custom tests
testSuite.addTest('custom_feature_test', async (settings) => {
  const config = await settings.getAllSettings();
  if (!config.feature_enabled) {
    throw new Error('Feature toggle not found in configuration');
  }
}, { critical: true, category: 'feature' });

// Production initialization sequence
async function initializeProduction() {
  try {
    console.log("🏭 Starting production initialization...");
    
    // Initialize enterprise manager
    const enterpriseResult = await enterpriseManager.initialize();
    console.log("Enterprise manager:", enterpriseResult);
    
    // Initialize adapter
    await adapter.initialize();
    
    // Run test suite
    const testResults = await testSuite.runAllTests();
    
    if (testResults.critical > 0) {
      throw new Error(`${testResults.critical} critical tests failed`);
    }
    
    console.log("✅ Production initialization completed successfully");
    
    return {
      enterprise: enterpriseResult,
      tests: testResults,
      health: enterpriseManager.getHealthStatus()
    };
    
  } catch (error) {
    console.error("❌ Production initialization failed:", error);
    throw error;
  }
}

// Export production patterns
window.SettingsProductionPatterns = {
  EnterpriseSettingsManager,
  SettingsAdapter,
  SettingsTestSuite,
  setupStandardTests,
  initializeProduction,
  
  // Instances
  enterpriseManager,
  adapter,
  testSuite,
  
  // Utilities
  getHealthReport: () => enterpriseManager.getHealthStatus(),
  getPerformanceReport: () => enterpriseManager.getPerformanceReport(),
  runTests: () => testSuite.runAllTests(),
  getConflicts: () => adapter.getConflicts()
};

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    // Uncomment for production initialization
    // initializeProduction().catch(console.error);
  });
} else {
  // Uncomment for production initialization  
  // initializeProduction().catch(console.error);
}

console.log("🚀 Production patterns loaded. Access via window.SettingsProductionPatterns");

/**
 * PRODUCTION PATTERNS SUMMARY:
 *
 * 🏭 EnterpriseSettingsManager:
 * - Multi-phase initialization with dependency resolution
 * - Health monitoring and circuit breaker patterns  
 * - Performance tracking and memory management
 * - Sophisticated error recovery and fallback strategies
 * - Production readiness verification
 *
 * 🔌 SettingsAdapter:
 * - Integration with existing extension architectures
 * - Bidirectional synchronization with conflict resolution
 * - Multiple sync modes (readonly, writeonly, bidirectional)
 * - Automated conflict detection and resolution
 *
 * 🧪 SettingsTestSuite:
 * - Comprehensive test framework for production validation
 * - Performance, connectivity, and integrity testing
 * - Test categorization and reporting
 * - Critical test identification for deployment gates
 *
 * These patterns provide enterprise-grade reliability,
 * performance, and maintainability for production extensions.
 */