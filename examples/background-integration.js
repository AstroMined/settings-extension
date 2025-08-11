/**
 * Background Script Integration Example
 * 
 * Complete working example showing how to integrate the Settings Manager
 * in a background script (service worker) for your extension.
 * 
 * This example demonstrates:
 * - Settings manager initialization with proper error handling
 * - Complete message handling setup for all API operations
 * - Storage initialization and defaults loading
 * - Real-time broadcast to content scripts
 * - Based on the actual background.js implementation
 * 
 * Copy this code into your background.js to add settings support.
 */

// Import dependencies (ensure these files are in your extension)
importScripts('lib/browser-compat.js', 'lib/settings-manager.js');

let settingsManager;

/**
 * Initialize settings manager with error handling
 */
async function initializeSettings() {
  try {
    settingsManager = new SettingsManager();
    await settingsManager.initialize();
    console.log('Settings manager initialized successfully');
  } catch (error) {
    console.error('Failed to initialize settings manager:', error);
    // Create fallback settings manager with embedded defaults
    settingsManager = new SettingsManager();
    await settingsManager.initializeWithEmbeddedDefaults();
  }
}

/**
 * Handle messages from content scripts and popup
 */
async function handleMessage(message, sender, sendResponse) {
  // Ensure settings manager is initialized
  if (!settingsManager) {
    await initializeSettings();
  }

  try {
    switch (message.type) {
      case 'GET_SETTING':
        const setting = await settingsManager.getSetting(message.key);
        sendResponse({ value: setting });
        break;
        
      case 'GET_SETTINGS':
        const settings = await settingsManager.getSettings(message.keys);
        sendResponse({ values: settings });
        break;
        
      case 'GET_ALL_SETTINGS':
        const allSettings = await settingsManager.getAllSettings();
        sendResponse({ settings: allSettings });
        break;
        
      case 'UPDATE_SETTING':
        await settingsManager.updateSetting(message.key, message.value);
        sendResponse({ success: true });
        // Notify all content scripts of change
        await broadcastSettingsChange({ [message.key]: message.value }, sender);
        break;
        
      case 'UPDATE_SETTINGS':
        await settingsManager.updateSettings(message.updates);
        sendResponse({ success: true });
        // Notify all content scripts of changes
        await broadcastSettingsChange(message.updates, sender);
        break;
        
      case 'EXPORT_SETTINGS':
        const exportData = await settingsManager.exportSettings();
        sendResponse({ data: exportData });
        break;
        
      case 'IMPORT_SETTINGS':
        await settingsManager.importSettings(message.data);
        sendResponse({ success: true });
        // Notify all content scripts of import
        await broadcastSettingsImport(sender);
        break;
        
      case 'RESET_SETTINGS':
        await settingsManager.resetToDefaults();
        sendResponse({ success: true });
        // Notify all content scripts of reset
        await broadcastSettingsReset(sender);
        break;
        
      case 'GET_STORAGE_STATS':
        const stats = await settingsManager.getStorageStats();
        sendResponse({ stats });
        break;
        
      case 'CHECK_STORAGE_QUOTA':
        const quota = await settingsManager.checkStorageQuota();
        sendResponse({ quota });
        break;
        
      default:
        sendResponse({ error: `Unknown message type: ${message.type}` });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
  
  return true; // Keep message channel open for async response
}

/**
 * Broadcast settings changes to all content scripts
 */
async function broadcastSettingsChange(changes, sender) {
  try {
    const tabs = await browserAPI.tabs.query({});
    
    const broadcastPromises = tabs.map(async (tab) => {
      // Skip the sender tab to avoid double updates
      if (sender && sender.tab && sender.tab.id === tab.id) {
        return;
      }
      
      try {
        await browserAPI.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_CHANGED',
          changes: changes
        });
      } catch (error) {
        // Tab might not have content script injected, ignore
        console.debug(`Failed to send message to tab ${tab.id}:`, error.message);
      }
    });
    
    await Promise.allSettled(broadcastPromises);
    
  } catch (error) {
    console.error('Failed to broadcast settings change:', error);
  }
}

/**
 * Broadcast settings import to all content scripts
 */
async function broadcastSettingsImport(sender) {
  try {
    const allSettings = await settingsManager.getAllSettings();
    const tabs = await browserAPI.tabs.query({});
    
    const broadcastPromises = tabs.map(async (tab) => {
      // Skip the sender tab
      if (sender && sender.tab && sender.tab.id === tab.id) {
        return;
      }
      
      try {
        await browserAPI.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_IMPORTED',
          settings: allSettings
        });
      } catch (error) {
        console.debug(`Failed to send import message to tab ${tab.id}:`, error.message);
      }
    });
    
    await Promise.allSettled(broadcastPromises);
    
  } catch (error) {
    console.error('Failed to broadcast settings import:', error);
  }
}

/**
 * Broadcast settings reset to all content scripts
 */
async function broadcastSettingsReset(sender) {
  try {
    const allSettings = await settingsManager.getAllSettings();
    const tabs = await browserAPI.tabs.query({});
    
    const broadcastPromises = tabs.map(async (tab) => {
      // Skip the sender tab
      if (sender && sender.tab && sender.tab.id === tab.id) {
        return;
      }
      
      try {
        await browserAPI.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_RESET',
          settings: allSettings
        });
      } catch (error) {
        console.debug(`Failed to send reset message to tab ${tab.id}:`, error.message);
      }
    });
    
    await Promise.allSettled(broadcastPromises);
    
  } catch (error) {
    console.error('Failed to broadcast settings reset:', error);
  }
}

/**
 * Handle extension installation
 */
function handleInstalled(details) {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Initialize settings on first install
    initializeSettings();
  } else if (details.reason === 'update') {
    // Handle extension update
    console.log('Extension updated from version:', details.previousVersion);
    initializeSettings();
  }
}

/**
 * Handle extension startup
 */
function handleStartup() {
  console.log('Extension starting up');
  initializeSettings();
}

/**
 * Handle storage changes (external changes to browser.storage)
 */
function handleStorageChange(changes, areaName) {
  console.log('Storage changed:', areaName, changes);
  
  // If settings were changed externally, reinitialize
  if (areaName === 'local' || areaName === 'sync') {
    // Debounce reinitializations
    if (handleStorageChange.timeout) {
      clearTimeout(handleStorageChange.timeout);
    }
    
    handleStorageChange.timeout = setTimeout(async () => {
      try {
        if (settingsManager) {
          await settingsManager.initialize();
          console.log('Settings reloaded due to storage change');
        }
      } catch (error) {
        console.error('Failed to reload settings after storage change:', error);
      }
    }, 1000);
  }
}

/**
 * Handle browser action click (optional)
 */
function handleActionClick(tab) {
  console.log('Browser action clicked for tab:', tab.id);
  // Popup opens automatically if defined in manifest
  // Add custom logic here if needed
}

/**
 * Handle unhandled errors
 */
function handleError(error) {
  console.error('Unhandled error in background script:', error);
}

// Set up event listeners
if (browserAPI.runtime && browserAPI.runtime.onMessage) {
  browserAPI.runtime.onMessage.addListener(handleMessage);
}

if (browserAPI.action && browserAPI.action.onClicked) {
  browserAPI.action.onClicked.addListener(handleActionClick);
}

if (browserAPI.runtime && browserAPI.runtime.onInstalled) {
  browserAPI.runtime.onInstalled.addListener(handleInstalled);
}

if (browserAPI.runtime && browserAPI.runtime.onStartup) {
  browserAPI.runtime.onStartup.addListener(handleStartup);
}

if (browserAPI.storage && browserAPI.storage.onChanged) {
  browserAPI.storage.onChanged.addListener(handleStorageChange);
}

// Global error handlers
self.addEventListener('error', handleError);
self.addEventListener('unhandledrejection', (event) => {
  handleError(event.reason);
});

// Initialize settings on startup
initializeSettings();

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Copy this file to your extension as background.js
 * 2. Copy the lib/ folder with all settings library files
 * 3. Update your manifest.json:
 *    {
 *      "background": {
 *        "service_worker": "background.js"
 *      },
 *      "permissions": ["storage"]
 *    }
 * 4. Create config/defaults.json with your settings schema
 * 5. Your extension now has full settings management!
 * 
 * The background script will:
 * - Initialize settings from defaults.json
 * - Handle all settings operations from content scripts
 * - Broadcast changes to all tabs in real-time
 * - Persist settings in browser.storage
 * - Provide export/import/reset functionality
 */