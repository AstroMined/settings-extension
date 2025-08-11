/**
 * Simple Usage Example - Settings Extension API
 * 
 * This example shows the basic usage patterns for the ContentScriptSettings API
 * Use this as a quick reference for common operations.
 */

// Initialize the settings API
const settings = new ContentScriptSettings();

// Example 1: Get a single setting
async function getSingleSetting() {
  try {
    const featureSetting = await settings.getSetting('feature_enabled');
    console.log('Feature enabled:', featureSetting.value);
    
    // Access setting properties
    console.log('Type:', featureSetting.type);
    console.log('Description:', featureSetting.description);
    
  } catch (error) {
    console.error('Error getting setting:', error);
  }
}

// Example 2: Get multiple settings at once (more efficient)
async function getMultipleSettings() {
  try {
    const commonSettings = await settings.getSettings([
      'feature_enabled',
      'refresh_interval',
      'api_key'
    ]);
    
    // Access the settings
    const isEnabled = commonSettings.feature_enabled?.value;
    const interval = commonSettings.refresh_interval?.value;
    const apiKey = commonSettings.api_key?.value;
    
    console.log('Settings loaded:', { isEnabled, interval, apiKey });
    
  } catch (error) {
    console.error('Error getting settings:', error);
  }
}

// Example 3: Update a single setting
async function updateSingleSetting() {
  try {
    await settings.updateSetting('feature_enabled', true);
    console.log('Feature enabled successfully');
    
  } catch (error) {
    console.error('Error updating setting:', error);
  }
}

// Example 4: Update multiple settings at once
async function updateMultipleSettings() {
  try {
    await settings.updateSettings({
      'feature_enabled': true,
      'refresh_interval': 120,
      'api_key': 'new-api-key-123'
    });
    
    console.log('Settings updated successfully');
    
  } catch (error) {
    console.error('Error updating settings:', error);
  }
}

// Example 5: Listen for settings changes
function setupChangeListener() {
  settings.addChangeListener((event, data) => {
    console.log('Settings changed:', event, data);
    
    // Handle specific settings
    if (data.feature_enabled !== undefined) {
      console.log('Feature toggled:', data.feature_enabled);
      // Update your UI accordingly
    }
    
    if (data.custom_css !== undefined) {
      console.log('CSS updated');
      // Apply new styles
    }
  });
}

// Example 6: Working with cached settings (for performance)
function useCachedSettings() {
  // Check if setting is cached
  if (settings.isCached('feature_enabled')) {
    const cachedSetting = settings.getCachedSetting('feature_enabled');
    console.log('Cached value:', cachedSetting.value);
  }
  
  // Get all cached settings
  const cachedSettings = settings.getCachedSettings();
  console.log('All cached settings:', cachedSettings);
}

// Example 7: Error handling best practices
async function safeSettingsOperation() {
  try {
    // Always wrap settings operations in try-catch
    const result = await settings.getSetting('some_setting');
    
    // Check if setting exists
    if (result) {
      console.log('Setting value:', result.value);
    } else {
      console.log('Setting not found');
    }
    
  } catch (error) {
    // Handle different error types
    if (error.message.includes('timeout')) {
      console.log('Request timed out, retrying...');
      // Implement retry logic
    } else if (error.message.includes('not found')) {
      console.log('Setting does not exist');
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Example 8: Working with JSON settings
async function handleJSONSettings() {
  try {
    const config = await settings.getSetting('advanced_config');
    
    if (config && config.value) {
      // Access JSON properties
      const endpoint = config.value.endpoint;
      const timeout = config.value.timeout;
      
      console.log('API Config:', { endpoint, timeout });
      
      // Update JSON setting
      const newConfig = {
        ...config.value,
        timeout: 10000 // Update timeout
      };
      
      await settings.updateSetting('advanced_config', newConfig);
      console.log('JSON config updated');
    }
    
  } catch (error) {
    console.error('Error handling JSON setting:', error);
  }
}

// Example 9: Performance optimization patterns
async function performanceOptimized() {
  // Preload frequently used settings
  await settings.getSettings(['feature_enabled', 'refresh_interval']);
  
  // Use cached values for frequent access
  const isEnabled = settings.getCachedSetting('feature_enabled')?.value;
  
  // Batch updates instead of individual calls
  await settings.updateSettings({
    'setting1': 'value1',
    'setting2': 'value2',
    'setting3': 'value3'
  });
  
  // Clear cache when needed
  settings.clearCache();
}

// Example 10: Real-world integration
class MyContentScript {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.init();
  }
  
  async init() {
    // Load settings
    const config = await this.settings.getSettings([
      'feature_enabled',
      'custom_css',
      'refresh_interval'
    ]);
    
    // Apply settings
    this.applySettings(config);
    
    // Listen for changes
    this.settings.addChangeListener((event, data) => {
      this.handleSettingsChange(data);
    });
  }
  
  applySettings(config) {
    // Apply feature toggle
    if (config.feature_enabled?.value) {
      this.enableFeature();
    }
    
    // Apply custom CSS
    if (config.custom_css?.value) {
      this.injectCSS(config.custom_css.value);
    }
    
    // Setup refresh interval
    if (config.refresh_interval?.value) {
      this.setupRefresh(config.refresh_interval.value);
    }
  }
  
  handleSettingsChange(changes) {
    // Handle individual setting changes
    Object.entries(changes).forEach(([key, value]) => {
      switch (key) {
        case 'feature_enabled':
          value ? this.enableFeature() : this.disableFeature();
          break;
        case 'custom_css':
          this.injectCSS(value);
          break;
        case 'refresh_interval':
          this.setupRefresh(value);
          break;
      }
    });
  }
  
  enableFeature() {
    console.log('Feature enabled');
    document.body.classList.add('my-extension-active');
  }
  
  disableFeature() {
    console.log('Feature disabled');
    document.body.classList.remove('my-extension-active');
  }
  
  injectCSS(css) {
    const styleId = 'my-extension-styles';
    let style = document.getElementById(styleId);
    
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    style.textContent = css;
  }
  
  setupRefresh(interval) {
    // Implementation for refresh functionality
    console.log('Refresh interval set to:', interval);
  }
}

// Usage examples - uncomment to test
// getSingleSetting();
// getMultipleSettings();
// setupChangeListener();
// useCachedSettings();

// Initialize your content script
// const myScript = new MyContentScript();