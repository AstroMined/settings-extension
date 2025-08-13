/**
 * Comprehensive Usage Examples - Settings Extension API
 *
 * Complete guide showing ALL ContentScriptSettings API methods with
 * production-ready error handling, performance patterns, and real-world
 * integration examples based on the actual implementation.
 *
 * ✅ FEATURES DEMONSTRATED:
 * - Complete ContentScriptSettings API coverage with exact method signatures
 * - Advanced error handling patterns from the real implementation
 * - Performance optimization with caching and batch operations
 * - Real-time change listening and broadcasting
 * - Import/export functionality
 * - Storage quota monitoring
 * - Cross-browser compatibility patterns
 * - Production integration patterns
 *
 * Use this as your comprehensive reference for the Settings Extension API.
 */

// ========================================
// INITIALIZATION & SETUP
// ========================================

// Initialize the settings API (requires browser-compat.js loaded first)
const settings = new ContentScriptSettings();

// Configure message timeout (optional - default is 5000ms)
settings.setMessageTimeout(10000); // 10 second timeout for slow networks

console.log("🚀 Settings API initialized with 10s timeout");

// ========================================
// BASIC CRUD OPERATIONS
// ========================================

/**
 * Example 1: Get Single Setting
 * Returns complete setting object with type, value, description, constraints
 */
async function getSingleSetting() {
  try {
    const featureSetting = await settings.getSetting("feature_enabled");
    
    console.log("📋 Complete setting object:");
    console.log("  Value:", featureSetting.value);
    console.log("  Type:", featureSetting.type);
    console.log("  Description:", featureSetting.description);
    
    // Type-specific properties
    if (featureSetting.maxLength) {
      console.log("  Max Length:", featureSetting.maxLength);
    }
    if (featureSetting.min !== undefined) {
      console.log("  Min Value:", featureSetting.min);
    }
    if (featureSetting.max !== undefined) {
      console.log("  Max Value:", featureSetting.max);
    }
    
    return featureSetting;
  } catch (error) {
    console.error("❌ Error getting setting:", error);
    throw error;
  }
}

/**
 * Example 2: Get Multiple Settings Efficiently
 * More performant than individual calls - uses batch messaging
 */
async function getMultipleSettings() {
  try {
    const commonSettings = await settings.getSettings([
      "feature_enabled",
      "refresh_interval", 
      "api_key",
      "custom_css",
      "advanced_config"
    ]);

    console.log("📦 Batch settings loaded:");
    
    // Access settings with null-safe patterns
    const isEnabled = commonSettings.feature_enabled?.value ?? false;
    const interval = commonSettings.refresh_interval?.value ?? 60;
    const apiKey = commonSettings.api_key?.value ?? "";
    const css = commonSettings.custom_css?.value ?? "";
    const config = commonSettings.advanced_config?.value ?? {};

    console.log("  Feature enabled:", isEnabled);
    console.log("  Refresh interval:", interval, "seconds");
    console.log("  API key configured:", apiKey.length > 0);
    console.log("  Custom CSS length:", css.length);
    console.log("  Advanced config keys:", Object.keys(config));
    
    return commonSettings;
  } catch (error) {
    console.error("❌ Error getting multiple settings:", error);
    throw error;
  }
}

/**
 * Example 3: Get All Settings
 * Useful for initialization, exports, and full synchronization
 */
async function getAllSettings() {
  try {
    const allSettings = await settings.getAllSettings();
    
    console.log("🗃️ All settings loaded:");
    console.log("  Total settings:", Object.keys(allSettings).length);
    
    // Log setting types breakdown
    const typeBreakdown = {};
    for (const [key, setting] of Object.entries(allSettings)) {
      typeBreakdown[setting.type] = (typeBreakdown[setting.type] || 0) + 1;
    }
    
    console.log("  Type breakdown:", typeBreakdown);
    return allSettings;
  } catch (error) {
    console.error("❌ Error getting all settings:", error);
    throw error;
  }
}

// ========================================
// UPDATE OPERATIONS 
// ========================================

/**
 * Example 4: Update Single Setting with Validation
 */
async function updateSingleSetting() {
  try {
    console.log("🔄 Updating single setting...");
    
    // Update with proper value type validation
    await settings.updateSetting("feature_enabled", true);
    await settings.updateSetting("refresh_interval", 120);
    await settings.updateSetting("api_key", "sk-new-key-abc123");
    
    console.log("✅ Single settings updated successfully");
  } catch (error) {
    console.error("❌ Error updating setting:", error);
    
    // Handle validation errors specifically
    if (error.message.includes("must be")) {
      console.error("   Validation error - check value type and constraints");
    } else if (error.message.includes("timeout")) {
      console.error("   Timeout error - check network connection");
    }
    
    throw error;
  }
}

/**
 * Example 5: Update Multiple Settings Atomically
 * More efficient than individual updates - single transaction
 */
async function updateMultipleSettings() {
  try {
    console.log("🔄 Updating multiple settings atomically...");
    
    const updates = {
      feature_enabled: true,
      refresh_interval: 300, // 5 minutes
      api_key: "sk-updated-key-xyz789",
      custom_css: `
        /* Updated CSS styles */
        .enhanced-feature {
          background: linear-gradient(45deg, #667eea, #764ba2);
          border-radius: 8px;
          padding: 16px;
        }
      `,
      advanced_config: {
        endpoint: "https://api-v2.example.com",
        timeout: 10000,
        retries: 5,
        features: ["cache", "retry", "metrics"]
      }
    };

    await settings.updateSettings(updates);
    
    console.log("✅ Multiple settings updated successfully");
    console.log("  Updated keys:", Object.keys(updates));
  } catch (error) {
    console.error("❌ Error updating multiple settings:", error);
    throw error;
  }
}

// ========================================
// ADVANCED OPERATIONS
// ========================================

/**
 * Example 6: Export Settings with Metadata
 */
async function exportSettings() {
  try {
    console.log("📤 Exporting settings...");
    
    const exportData = await settings.exportSettings();
    
    // Parse the JSON export data
    const exportObject = JSON.parse(exportData);
    
    console.log("📄 Export completed:");
    console.log("  Version:", exportObject.version);
    console.log("  Timestamp:", exportObject.timestamp);
    console.log("  Settings count:", Object.keys(exportObject.settings).length);
    
    // Could save to file or send to server
    return exportData;
  } catch (error) {
    console.error("❌ Error exporting settings:", error);
    throw error;
  }
}

/**
 * Example 7: Import Settings with Validation
 */
async function importSettings(jsonData) {
  try {
    console.log("📥 Importing settings...");
    
    // Validate JSON format before importing
    let importObject;
    try {
      importObject = JSON.parse(jsonData);
    } catch (parseError) {
      throw new Error("Invalid JSON format in import data");
    }
    
    if (!importObject.settings) {
      throw new Error("Import data missing settings object");
    }
    
    console.log("  Import data validation passed");
    console.log("  Settings to import:", Object.keys(importObject.settings).length);
    
    await settings.importSettings(jsonData);
    
    console.log("✅ Settings imported successfully");
    
    // Cache will be automatically cleared and reloaded
    
  } catch (error) {
    console.error("❌ Error importing settings:", error);
    throw error;
  }
}

/**
 * Example 8: Reset to Defaults with Confirmation
 */
async function resetSettings() {
  try {
    console.log("🔄 Resetting settings to defaults...");
    
    await settings.resetSettings();
    
    console.log("✅ Settings reset successfully");
    
    // Cache is automatically cleared after reset
    
  } catch (error) {
    console.error("❌ Error resetting settings:", error);
    throw error;
  }
}

// ========================================
// STORAGE MONITORING
// ========================================

/**
 * Example 9: Monitor Storage Usage
 */
async function checkStorageStats() {
  try {
    console.log("📊 Checking storage statistics...");
    
    const stats = await settings.getStorageStats();
    
    console.log("  Total bytes used:", stats.totalBytes);
    console.log("  Settings count:", stats.settingsCount);
    console.log("  Average setting size:", Math.round(stats.averageSettingSize), "bytes");
    
    if (stats.quota) {
      console.log("  Storage quota:", stats.quota.quota, "bytes");
      console.log("  Percentage used:", Math.round(stats.quota.percentUsed), "%");
      console.log("  Storage available:", stats.quota.available);
    }
    
    return stats;
  } catch (error) {
    console.error("❌ Error checking storage stats:", error);
    throw error;
  }
}

/**
 * Example 10: Check Storage Quota
 */
async function checkStorageQuota() {
  try {
    console.log("📏 Checking storage quota...");
    
    const quota = await settings.checkStorageQuota();
    
    console.log("  Quota available:", quota.available);
    console.log("  Bytes used:", quota.used);
    console.log("  Total quota:", quota.quota);
    console.log("  Percentage used:", Math.round(quota.percentUsed), "%");
    
    if (quota.percentUsed > 80) {
      console.warn("⚠️ Storage usage is high - consider cleaning up old data");
    }
    
    return quota;
  } catch (error) {
    console.error("❌ Error checking storage quota:", error);
    throw error;
  }
}

// ========================================
// CACHING & PERFORMANCE
// ========================================

/**
 * Example 11: Efficient Caching Patterns
 */
function demonstrateCaching() {
  console.log("🏎️ Demonstrating caching patterns...");
  
  // Check if setting is cached (synchronous)
  const cached = settings.getCachedSetting("feature_enabled");
  if (cached) {
    console.log("  Cached value available:", cached.value);
    console.log("  Cache hit - no network request needed");
  } else {
    console.log("  No cached value - will need to fetch from background");
  }
  
  // Get all cached settings (synchronous)
  const allCached = settings.getCachedSettings();
  console.log("  Total cached settings:", Object.keys(allCached).length);
  
  // Clear cache when needed (e.g., after major updates)
  settings.clearCache();
  console.log("  Cache cleared for fresh data");
}

/**
 * Example 12: Performance Optimization Patterns
 */
async function performanceOptimizations() {
  console.log("⚡ Demonstrating performance optimizations...");
  
  // 1. Preload critical settings at startup
  console.log("  Step 1: Preloading critical settings...");
  await settings.getSettings([
    "feature_enabled", 
    "refresh_interval", 
    "custom_css"
  ]);
  
  // 2. Use cached values for frequent access (no network requests)
  console.log("  Step 2: Using cached values...");
  const isEnabled = settings.getCachedSetting("feature_enabled")?.value;
  const interval = settings.getCachedSetting("refresh_interval")?.value;
  
  console.log("    Feature enabled (cached):", isEnabled);
  console.log("    Refresh interval (cached):", interval);
  
  // 3. Batch updates instead of individual calls
  console.log("  Step 3: Batch updates...");
  await settings.updateSettings({
    user_preference_1: "value1",
    user_preference_2: "value2", 
    user_preference_3: "value3"
  });
  
  console.log("✅ Performance optimizations completed");
}

// ========================================
// REAL-TIME CHANGE HANDLING
// ========================================

/**
 * Example 13: Advanced Change Listener Setup
 */
function setupAdvancedChangeListeners() {
  console.log("🔔 Setting up advanced change listeners...");
  
  // Listener for all setting changes
  const mainListener = (event, data) => {
    console.log(`📢 Settings ${event} event:`, {
      timestamp: new Date().toISOString(),
      dataKeys: Object.keys(data)
    });
    
    switch (event) {
      case "changed":
        handleSettingsChanged(data);
        break;
        
      case "imported":
        handleSettingsImported(data);
        break;
        
      case "reset":
        handleSettingsReset(data);
        break;
        
      default:
        console.log("Unknown settings event:", event);
    }
  };
  
  settings.addChangeListener(mainListener);
  
  console.log("✅ Advanced change listeners configured");
  
  // Return cleanup function
  return () => {
    settings.removeChangeListener(mainListener);
    console.log("🧹 Change listeners cleaned up");
  };
}

function handleSettingsChanged(changes) {
  console.log("🔄 Handling settings changes...");
  
  // Handle specific setting changes
  if (changes.feature_enabled !== undefined) {
    console.log("  Feature toggle:", changes.feature_enabled);
    toggleMainFeature(changes.feature_enabled);
  }
  
  if (changes.custom_css !== undefined) {
    console.log("  CSS updated, applying...");
    applyCustomCSS(changes.custom_css);
  }
  
  if (changes.refresh_interval !== undefined) {
    console.log("  Refresh interval changed:", changes.refresh_interval);
    updateRefreshInterval(changes.refresh_interval);
  }
  
  if (changes.advanced_config !== undefined) {
    console.log("  Advanced config updated");
    reconfigureAdvancedFeatures(changes.advanced_config);
  }
}

function handleSettingsImported(allSettings) {
  console.log("📥 Handling settings import...");
  console.log("  Total settings imported:", Object.keys(allSettings).length);
  
  // Reinitialize extension with new settings
  reinitializeExtension(allSettings);
}

function handleSettingsReset(resetSettings) {
  console.log("🔄 Handling settings reset...");
  console.log("  Reset to defaults completed");
  
  // Reinitialize with default values
  reinitializeExtension(resetSettings);
}

// ========================================
// ERROR HANDLING PATTERNS
// ========================================

/**
 * Example 14: Comprehensive Error Handling
 */
async function robustSettingsOperation() {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries}...`);
      
      const result = await settings.getSetting("api_key");
      
      // Validate result
      if (!result) {
        throw new Error("Setting not found or empty");
      }
      
      console.log("✅ Operation successful:", result.value ? "Key configured" : "No key set");
      return result;
      
    } catch (error) {
      retryCount++;
      
      console.error(`❌ Attempt ${retryCount} failed:`, error.message);
      
      // Handle specific error types
      if (error.message.includes("timeout")) {
        console.log("  Network timeout - will retry...");
        
        if (retryCount < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`  Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } else if (error.message.includes("not found")) {
        console.error("  Setting does not exist - cannot retry");
        throw error; // Don't retry for missing settings
        
      } else if (error.message.includes("validation")) {
        console.error("  Validation error - cannot retry");
        throw error; // Don't retry for validation errors
        
      } else {
        console.error("  Unexpected error:", error);
        
        if (retryCount >= maxRetries) {
          throw error;
        }
      }
    }
  }
  
  throw new Error(`Operation failed after ${maxRetries} attempts`);
}

// ========================================
// REAL-WORLD INTEGRATION EXAMPLE
// ========================================

/**
 * Example 15: Production-Ready Extension Class
 */
class ProductionExtension {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.isInitialized = false;
    this.refreshInterval = null;
    this.changeListenerCleanup = null;
    this.config = {};
  }

  async initialize() {
    try {
      console.log("🚀 Initializing production extension...");
      
      // Load all settings with performance optimization
      this.config = await this.settings.getAllSettings();
      console.log("  Settings loaded:", Object.keys(this.config).length);
      
      // Apply initial configuration
      await this.applyConfiguration();
      
      // Set up real-time change handling
      this.setupChangeListeners();
      
      // Start background processes
      this.startBackgroundProcesses();
      
      this.isInitialized = true;
      console.log("✅ Production extension initialized successfully");
      
    } catch (error) {
      console.error("❌ Extension initialization failed:", error);
      
      // Attempt graceful degradation
      await this.initializeFallbackMode();
    }
  }

  async applyConfiguration() {
    console.log("⚙️ Applying configuration...");
    
    // Feature toggles
    if (this.config.feature_enabled?.value) {
      this.enableMainFeature();
    }
    
    // Custom styling
    if (this.config.custom_css?.value) {
      this.applyCustomCSS(this.config.custom_css.value);
    }
    
    // API configuration
    if (this.config.api_key?.value) {
      this.configureAPI(this.config.api_key.value, this.config.advanced_config?.value);
    }
    
    // Refresh interval
    const interval = this.config.refresh_interval?.value || 60;
    this.setupRefreshInterval(interval);
  }

  setupChangeListeners() {
    console.log("🔔 Setting up change listeners...");
    
    const listener = (event, data) => {
      console.log(`Settings ${event}:`, Object.keys(data));
      
      switch (event) {
        case "changed":
          this.handleConfigurationChange(data);
          break;
          
        case "imported":
        case "reset":
          this.config = data;
          this.applyConfiguration();
          break;
      }
    };
    
    this.settings.addChangeListener(listener);
    
    // Store cleanup function
    this.changeListenerCleanup = () => {
      this.settings.removeChangeListener(listener);
    };
  }

  handleConfigurationChange(changes) {
    // Update cached config
    for (const [key, value] of Object.entries(changes)) {
      if (this.config[key]) {
        this.config[key].value = value;
      }
    }
    
    // Apply changes immediately
    if (changes.feature_enabled !== undefined) {
      changes.feature_enabled ? this.enableMainFeature() : this.disableMainFeature();
    }
    
    if (changes.custom_css !== undefined) {
      this.applyCustomCSS(changes.custom_css);
    }
    
    if (changes.refresh_interval !== undefined) {
      this.setupRefreshInterval(changes.refresh_interval);
    }
    
    if (changes.api_key !== undefined || changes.advanced_config !== undefined) {
      this.configureAPI(
        changes.api_key ?? this.config.api_key?.value,
        changes.advanced_config ?? this.config.advanced_config?.value
      );
    }
  }

  async updateUserPreference(key, value) {
    try {
      await this.settings.updateSetting(key, value);
      console.log(`✅ User preference '${key}' updated`);
      
      // Show user feedback
      this.showUserFeedback(`Setting '${key}' updated successfully`, "success");
      
    } catch (error) {
      console.error(`❌ Failed to update '${key}':`, error);
      
      // Show error to user
      this.showUserFeedback(`Failed to update '${key}': ${error.message}`, "error");
      
      throw error;
    }
  }

  async exportUserSettings() {
    try {
      const exportData = await this.settings.exportSettings();
      
      // Create downloadable file
      const blob = new Blob([exportData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `extension-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      this.showUserFeedback("Settings exported successfully", "success");
      
    } catch (error) {
      console.error("❌ Export failed:", error);
      this.showUserFeedback(`Export failed: ${error.message}`, "error");
    }
  }

  async importUserSettings(fileInput) {
    try {
      const file = fileInput.files[0];
      if (!file) return;
      
      const text = await file.text();
      await this.settings.importSettings(text);
      
      this.showUserFeedback("Settings imported successfully", "success");
      
    } catch (error) {
      console.error("❌ Import failed:", error);
      this.showUserFeedback(`Import failed: ${error.message}`, "error");
    }
  }

  enableMainFeature() {
    console.log("🎯 Enabling main feature");
    document.body.classList.add("extension-feature-enabled");
  }

  disableMainFeature() {
    console.log("🛑 Disabling main feature");
    document.body.classList.remove("extension-feature-enabled");
  }

  applyCustomCSS(css) {
    console.log("🎨 Applying custom CSS");
    
    let style = document.getElementById("extension-custom-css");
    if (!style) {
      style = document.createElement("style");
      style.id = "extension-custom-css";
      document.head.appendChild(style);
    }
    
    style.textContent = css;
  }

  configureAPI(apiKey, advancedConfig) {
    console.log("🔗 Configuring API connection");
    
    // Configure your API client here
    const config = {
      apiKey,
      ...advancedConfig,
    };
    
    console.log("  API configured with endpoint:", config.endpoint);
  }

  setupRefreshInterval(seconds) {
    console.log("⏱️ Setting up refresh interval:", seconds, "seconds");
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(() => {
      this.performPeriodicRefresh();
    }, seconds * 1000);
  }

  performPeriodicRefresh() {
    console.log("🔄 Performing periodic refresh");
    // Your refresh logic here
  }

  startBackgroundProcesses() {
    console.log("🔄 Starting background processes");
    // Initialize any background workers or monitors
  }

  showUserFeedback(message, type) {
    // Show user feedback (toast, notification, etc.)
    console.log(`📢 User feedback (${type}):`, message);
  }

  async initializeFallbackMode() {
    console.log("🆘 Initializing fallback mode");
    
    // Minimal functionality with hardcoded defaults
    this.config = {
      feature_enabled: { value: false },
      refresh_interval: { value: 60 },
      custom_css: { value: "" },
    };
    
    await this.applyConfiguration();
    this.isInitialized = true;
  }

  destroy() {
    console.log("🧹 Cleaning up extension");
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    if (this.changeListenerCleanup) {
      this.changeListenerCleanup();
    }
    
    this.settings.destroy();
    this.isInitialized = false;
  }
}

// ========================================
// USAGE EXAMPLES & TESTING
// ========================================

console.log("🎯 Starting comprehensive API examples...");

// Run examples (uncomment to test specific functionality)
async function runExamples() {
  try {
    // Basic operations
    await getSingleSetting();
    await getMultipleSettings(); 
    // await getAllSettings();
    
    // Updates
    // await updateSingleSetting();
    // await updateMultipleSettings();
    
    // Advanced operations
    // const exportData = await exportSettings();
    // await importSettings(exportData);
    // await resetSettings();
    
    // Storage monitoring
    await checkStorageStats();
    await checkStorageQuota();
    
    // Performance patterns
    demonstrateCaching();
    await performanceOptimizations();
    
    // Change listeners
    const cleanupListeners = setupAdvancedChangeListeners();
    
    // Error handling
    await robustSettingsOperation();
    
    console.log("✅ All examples completed successfully");
    
  } catch (error) {
    console.error("❌ Example execution failed:", error);
  }
}

// Initialize production extension
const extensionInstance = new ProductionExtension();

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    extensionInstance.initialize();
    // runExamples(); // Uncomment to run API examples
  });
} else {
  extensionInstance.initialize();
  // runExamples(); // Uncomment to run API examples
}

// Export for global access (useful for debugging)
window.SettingsExtensionAPI = {
  settings,
  extensionInstance,
  examples: {
    getSingleSetting,
    getMultipleSettings,
    getAllSettings,
    updateSingleSetting,
    updateMultipleSettings,
    exportSettings,
    importSettings,
    resetSettings,
    checkStorageStats,
    checkStorageQuota,
    runExamples
  }
};

console.log("🚀 Settings Extension API examples loaded. Access via window.SettingsExtensionAPI");

/**
 * COMPLETE API REFERENCE SUMMARY:
 * 
 * CRUD Operations:
 * - settings.getSetting(key)           → Get single setting
 * - settings.getSettings([keys])       → Get multiple settings  
 * - settings.getAllSettings()          → Get all settings
 * - settings.updateSetting(key, value) → Update single setting
 * - settings.updateSettings(updates)   → Update multiple settings
 * 
 * Advanced Operations:
 * - settings.exportSettings()          → Export as JSON string
 * - settings.importSettings(jsonData)  → Import from JSON string
 * - settings.resetSettings()           → Reset to defaults
 * 
 * Storage Monitoring:
 * - settings.getStorageStats()         → Get usage statistics
 * - settings.checkStorageQuota()       → Check quota status
 * 
 * Caching & Performance:
 * - settings.getCachedSetting(key)     → Get cached value (sync)
 * - settings.getCachedSettings()       → Get all cached values (sync)
 * - settings.clearCache()              → Clear cache
 * 
 * Change Listeners:
 * - settings.addChangeListener(fn)     → Add change listener
 * - settings.removeChangeListener(fn)  → Remove change listener
 * 
 * Configuration:
 * - settings.setMessageTimeout(ms)     → Set timeout for API calls
 * - settings.destroy()                 → Cleanup and destroy
 * 
 * Error Handling:
 * - All methods return Promises with proper error handling
 * - Timeouts configurable (default 5000ms)
 * - Validation errors include constraint details
 * - Network errors include retry guidance
 * 
 * Real-time Updates:
 * - Changes broadcast to all tabs automatically
 * - Cache updated on all change events  
 * - Listeners receive event type + data
 * 
 * This API provides a complete settings management solution
 * for Manifest V3 extensions with production-ready patterns.
 */