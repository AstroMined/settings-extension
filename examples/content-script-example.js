/**
 * Example Content Script - Comprehensive API Usage
 * 
 * This example demonstrates all features of the ContentScriptSettings API
 * including real-world usage patterns, error handling, and performance optimization.
 * 
 * Usage: Include this in your content script to see how to use the settings API
 */

class ExampleContentScript {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.refreshIntervalId = null;
    this.apiConfig = null;
    this.featureEnabled = false;
    this.init();
  }

  /**
   * Initialize the content script
   */
  async init() {
    try {
      console.log('🚀 Starting Example Content Script');
      
      // Load initial settings
      await this.loadInitialSettings();
      
      // Setup change listeners
      this.setupChangeListeners();
      
      // Apply settings to page
      await this.applySettings();
      
      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      console.log('✅ Example Content Script initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize content script:', error);
      this.showErrorNotification('Failed to initialize settings');
    }
  }

  /**
   * Load initial settings with performance optimization
   */
  async loadInitialSettings() {
    try {
      // Performance tip: Load frequently used settings in batch
      const commonSettings = await this.settings.getSettings([
        'feature_enabled',
        'refresh_interval',
        'api_key',
        'advanced_config'
      ]);
      
      console.log('📊 Common settings loaded:', commonSettings);
      
      // Cache values for quick access
      this.featureEnabled = commonSettings.feature_enabled?.value || false;
      this.refreshInterval = commonSettings.refresh_interval?.value || 60;
      this.apiKey = commonSettings.api_key?.value || '';
      this.apiConfig = commonSettings.advanced_config?.value || {};
      
      // Example: Load specific setting individually
      const customCSS = await this.settings.getSetting('custom_css');
      console.log('🎨 Custom CSS loaded:', customCSS?.value?.substring(0, 100) + '...');
      
      // Example: Load all settings (use sparingly for performance)
      const allSettings = await this.settings.getAllSettings();
      console.log('📋 Total settings loaded:', Object.keys(allSettings).length);
      
    } catch (error) {
      console.error('❌ Error loading initial settings:', error);
      throw error;
    }
  }

  /**
   * Setup comprehensive change listeners
   */
  setupChangeListeners() {
    // Main change listener for all settings
    this.settings.addChangeListener((event, data) => {
      console.log(`🔄 Settings ${event}:`, data);
      
      // Handle different event types
      switch (event) {
        case 'changed':
          this.handleSettingsChanged(data);
          break;
        case 'imported':
          this.handleSettingsImported(data);
          break;
        case 'reset':
          this.handleSettingsReset(data);
          break;
        default:
          console.log('Unknown settings event:', event);
      }
    });
    
    console.log('👂 Change listeners set up');
  }

  /**
   * Handle individual setting changes
   */
  handleSettingsChanged(changes) {
    for (const [key, value] of Object.entries(changes)) {
      switch (key) {
        case 'feature_enabled':
          this.featureEnabled = value;
          this.toggleFeature(value);
          break;
          
        case 'refresh_interval':
          this.refreshInterval = value;
          this.setupRefreshInterval(value);
          break;
          
        case 'custom_css':
          this.updateCustomCSS(value);
          break;
          
        case 'api_key':
          this.apiKey = value;
          this.updateAPIConfiguration();
          break;
          
        case 'advanced_config':
          this.apiConfig = value;
          this.updateAPIConfiguration();
          break;
          
        default:
          console.log(`🔧 Setting ${key} changed to:`, value);
      }
    }
  }

  /**
   * Handle settings import
   */
  handleSettingsImported(settings) {
    console.log('📥 Settings imported, reloading...');
    this.showSuccessNotification('Settings imported successfully');
    
    // Reload all settings
    this.loadInitialSettings().then(() => {
      this.applySettings();
    });
  }

  /**
   * Handle settings reset
   */
  handleSettingsReset(settings) {
    console.log('🔄 Settings reset to defaults');
    this.showInfoNotification('Settings reset to defaults');
    
    // Reload all settings
    this.loadInitialSettings().then(() => {
      this.applySettings();
    });
  }

  /**
   * Apply all settings to the page
   */
  async applySettings() {
    try {
      // Apply feature toggle
      this.toggleFeature(this.featureEnabled);
      
      // Apply custom CSS
      if (this.settings.isCached('custom_css')) {
        const customCSS = this.settings.getCachedSetting('custom_css');
        this.updateCustomCSS(customCSS?.value);
      }
      
      // Setup refresh interval
      this.setupRefreshInterval(this.refreshInterval);
      
      // Configure API
      this.updateAPIConfiguration();
      
      // Apply any visual indicators
      this.updatePageIndicators();
      
      console.log('✅ All settings applied to page');
      
    } catch (error) {
      console.error('❌ Error applying settings:', error);
      this.showErrorNotification('Failed to apply some settings');
    }
  }

  /**
   * Toggle main feature on/off
   */
  toggleFeature(enabled) {
    console.log(`🎯 Feature ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled) {
      document.body.classList.add('extension-enabled');
      this.setupFeatureListeners();
      this.showSuccessNotification('Feature enabled');
    } else {
      document.body.classList.remove('extension-enabled');
      this.removeFeatureListeners();
      this.showInfoNotification('Feature disabled');
    }
  }

  /**
   * Update custom CSS
   */
  updateCustomCSS(css) {
    // Remove existing custom styles
    const existingStyles = document.getElementById('extension-custom-styles');
    if (existingStyles) {
      existingStyles.remove();
    }
    
    // Add new custom styles
    if (css && css.trim()) {
      const style = document.createElement('style');
      style.id = 'extension-custom-styles';
      style.textContent = css;
      document.head.appendChild(style);
      console.log('🎨 Custom CSS updated');
    }
  }

  /**
   * Setup refresh interval
   */
  setupRefreshInterval(seconds) {
    // Clear existing interval
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
    
    // Setup new interval
    if (seconds > 0) {
      this.refreshIntervalId = setInterval(() => {
        this.refreshContent();
      }, seconds * 1000);
      
      console.log(`⏱️ Refresh interval set to ${seconds} seconds`);
    }
  }

  /**
   * Update API configuration
   */
  updateAPIConfiguration() {
    this.apiConfig = {
      endpoint: this.apiConfig?.endpoint || 'https://api.example.com',
      timeout: this.apiConfig?.timeout || 5000,
      retries: this.apiConfig?.retries || 3,
      apiKey: this.apiKey
    };
    
    console.log('🔧 API configuration updated:', this.apiConfig);
  }

  /**
   * Refresh content from API
   */
  async refreshContent() {
    if (!this.featureEnabled || !this.apiConfig?.endpoint) {
      return;
    }
    
    try {
      console.log('🔄 Refreshing content...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.apiConfig.timeout);
      
      const response = await fetch(this.apiConfig.endpoint, {
        signal: controller.signal,
        headers: {
          'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined,
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        this.updateContentDisplay(data);
        console.log('✅ Content refreshed successfully');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('❌ Content refresh failed:', error);
      this.showErrorNotification(`Refresh failed: ${error.message}`);
    }
  }

  /**
   * Update content display
   */
  updateContentDisplay(data) {
    let container = document.getElementById('extension-content-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'extension-content-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
      `;
      document.body.appendChild(container);
    }
    
    container.innerHTML = `
      <div style="margin-bottom: 12px; font-weight: bold;">
        📊 Extension Content
      </div>
      <div style="margin-bottom: 8px; color: #666;">
        Updated: ${new Date().toLocaleString()}
      </div>
      <div style="max-height: 200px; overflow-y: auto;">
        <pre style="margin: 0; white-space: pre-wrap; font-size: 12px;">${JSON.stringify(data, null, 2)}</pre>
      </div>
    `;
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+S: Show quick settings
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        this.showQuickSettings();
      }
      
      // Ctrl+Shift+R: Force refresh
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        this.refreshContent();
      }
      
      // Ctrl+Shift+E: Export settings
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        this.exportSettings();
      }
    });
    
    console.log('⌨️ Keyboard shortcuts set up');
  }

  /**
   * Show quick settings overlay
   */
  async showQuickSettings() {
    try {
      // Get current settings
      const currentSettings = await this.settings.getSettings([
        'feature_enabled',
        'refresh_interval',
        'api_key'
      ]);
      
      // Create overlay
      const overlay = document.createElement('div');
      overlay.id = 'extension-quick-settings';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 20000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
      `;
      
      overlay.innerHTML = `
        <div style="background: white; padding: 24px; border-radius: 12px; min-width: 400px;">
          <h3 style="margin: 0 0 16px 0;">⚙️ Quick Settings</h3>
          
          <div style="margin-bottom: 16px;">
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="feature-toggle" ${currentSettings.feature_enabled?.value ? 'checked' : ''}>
              Enable Feature
            </label>
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px;">Refresh Interval (seconds):</label>
            <input type="number" id="refresh-input" value="${currentSettings.refresh_interval?.value || 60}" min="1" max="3600" style="width: 100px;">
          </div>
          
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 4px;">API Key:</label>
            <input type="password" id="api-key-input" value="${currentSettings.api_key?.value || ''}" style="width: 100%;">
          </div>
          
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="quick-settings-cancel" style="padding: 8px 16px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">Cancel</button>
            <button id="quick-settings-save" style="padding: 8px 16px; background: #007cba; color: white; border: 1px solid #007cba; border-radius: 4px; cursor: pointer;">Save</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      // Setup event listeners
      document.getElementById('quick-settings-save').addEventListener('click', async () => {
        try {
          const updates = {
            feature_enabled: document.getElementById('feature-toggle').checked,
            refresh_interval: parseInt(document.getElementById('refresh-input').value),
            api_key: document.getElementById('api-key-input').value
          };
          
          await this.settings.updateSettings(updates);
          this.showSuccessNotification('Settings saved successfully');
          
        } catch (error) {
          console.error('❌ Error saving settings:', error);
          this.showErrorNotification('Failed to save settings');
        }
        
        document.body.removeChild(overlay);
      });
      
      document.getElementById('quick-settings-cancel').addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
      
      // Close on overlay click
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          document.body.removeChild(overlay);
        }
      });
      
    } catch (error) {
      console.error('❌ Error showing quick settings:', error);
      this.showErrorNotification('Failed to load quick settings');
    }
  }

  /**
   * Export settings
   */
  async exportSettings() {
    try {
      const exportData = await this.settings.exportSettings();
      
      // Create download link
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `extension-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showSuccessNotification('Settings exported successfully');
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      this.showErrorNotification('Failed to export settings');
    }
  }

  /**
   * Update page indicators
   */
  updatePageIndicators() {
    // Add visual indicator showing extension is active
    let indicator = document.getElementById('extension-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'extension-indicator';
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        padding: 8px 12px;
        background: ${this.featureEnabled ? '#4CAF50' : '#FFC107'};
        color: white;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        transition: all 0.3s ease;
        cursor: pointer;
        user-select: none;
      `;
      document.body.appendChild(indicator);
      
      // Click to show quick settings
      indicator.addEventListener('click', () => this.showQuickSettings());
    }
    
    indicator.textContent = this.featureEnabled ? '🟢 Extension Active' : '🟡 Extension Inactive';
    indicator.style.background = this.featureEnabled ? '#4CAF50' : '#FFC107';
  }

  /**
   * Setup feature-specific event listeners
   */
  setupFeatureListeners() {
    // Example: Listen for specific elements
    document.addEventListener('click', this.handleFeatureClick.bind(this));
    
    // Example: Listen for form submissions
    document.addEventListener('submit', this.handleFormSubmit.bind(this));
  }

  /**
   * Remove feature-specific event listeners
   */
  removeFeatureListeners() {
    document.removeEventListener('click', this.handleFeatureClick.bind(this));
    document.removeEventListener('submit', this.handleFormSubmit.bind(this));
  }

  /**
   * Handle feature clicks
   */
  handleFeatureClick(event) {
    // Example: Process special elements
    if (event.target.classList.contains('processable')) {
      event.target.classList.add('processed');
      event.target.setAttribute('data-processed', new Date().toISOString());
      console.log('🖱️ Element processed:', event.target);
    }
  }

  /**
   * Handle form submissions
   */
  handleFormSubmit(event) {
    // Example: Add analytics or modifications
    console.log('📝 Form submitted:', event.target.action);
  }

  /**
   * Show success notification
   */
  showSuccessNotification(message) {
    this.showNotification(message, 'success', '✅');
  }

  /**
   * Show error notification
   */
  showErrorNotification(message) {
    this.showNotification(message, 'error', '❌');
  }

  /**
   * Show info notification
   */
  showInfoNotification(message) {
    this.showNotification(message, 'info', 'ℹ️');
  }

  /**
   * Show notification
   */
  showNotification(message, type, icon) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 16px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      z-index: 25000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `${icon} ${message}`;
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    console.log('🧹 Cleaning up Example Content Script');
    
    // Clear intervals
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
    
    // Remove event listeners
    this.removeFeatureListeners();
    
    // Clean up DOM elements
    const elementsToRemove = [
      'extension-custom-styles',
      'extension-content-container',
      'extension-indicator',
      'extension-quick-settings'
    ];
    
    elementsToRemove.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.remove();
      }
    });
    
    // Destroy settings instance
    if (this.settings) {
      this.settings.destroy();
      this.settings = null;
    }
    
    console.log('✅ Example Content Script cleaned up');
  }
}

// Initialize the example content script
const exampleScript = new ExampleContentScript();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  exampleScript.destroy();
});

// Make available for testing
window.exampleScript = exampleScript;

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
`;
document.head.appendChild(style);

console.log('🎯 Example Content Script loaded and ready');