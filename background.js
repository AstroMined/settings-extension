// background.js
// Service worker for settings management

// Import dependencies
importScripts('lib/browser-compat.js', 'lib/settings-manager.js');

let settingsManager;

/**
 * Initialize settings manager
 * @returns {Promise<void>}
 */
async function initializeSettings() {
  try {
    settingsManager = new SettingsManager();
    await settingsManager.initialize();
    console.log('Settings manager initialized successfully');
  } catch (error) {
    console.error('Failed to initialize settings manager:', error);
    // Create a fallback settings manager
    settingsManager = new SettingsManager();
    await settingsManager.initializeWithEmbeddedDefaults();
  }
}

/**
 * Handle messages from content scripts and popup
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response function
 * @returns {boolean} - Whether to keep the message channel open
 */
async function handleMessage(message, sender, sendResponse) {
  // Ensure settings manager is initialized
  if (!settingsManager) {
    await initializeSettings();
  }

  try {
    switch (message.type) {
      case 'GET_SETTING':
        await handleGetSetting(message, sendResponse);
        break;
        
      case 'GET_SETTINGS':
        await handleGetSettings(message, sendResponse);
        break;
        
      case 'GET_ALL_SETTINGS':
        await handleGetAllSettings(message, sendResponse);
        break;
        
      case 'UPDATE_SETTING':
        await handleUpdateSetting(message, sendResponse, sender);
        break;
        
      case 'UPDATE_SETTINGS':
        await handleUpdateSettings(message, sendResponse, sender);
        break;
        
      case 'EXPORT_SETTINGS':
        await handleExportSettings(message, sendResponse);
        break;
        
      case 'IMPORT_SETTINGS':
        await handleImportSettings(message, sendResponse, sender);
        break;
        
      case 'RESET_SETTINGS':
        await handleResetSettings(message, sendResponse, sender);
        break;
        
      case 'GET_STORAGE_STATS':
        await handleGetStorageStats(message, sendResponse);
        break;
        
      case 'CHECK_STORAGE_QUOTA':
        await handleCheckStorageQuota(message, sendResponse);
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
 * Handle GET_SETTING message
 */
async function handleGetSetting(message, sendResponse) {
  const setting = await settingsManager.getSetting(message.key);
  sendResponse({ value: setting });
}

/**
 * Handle GET_SETTINGS message
 */
async function handleGetSettings(message, sendResponse) {
  const settings = await settingsManager.getSettings(message.keys);
  sendResponse({ values: settings });
}

/**
 * Handle GET_ALL_SETTINGS message
 */
async function handleGetAllSettings(message, sendResponse) {
  const allSettings = await settingsManager.getAllSettings();
  sendResponse({ settings: allSettings });
}

/**
 * Handle UPDATE_SETTING message
 */
async function handleUpdateSetting(message, sendResponse, sender) {
  await settingsManager.updateSetting(message.key, message.value);
  sendResponse({ success: true });
  
  // Notify all content scripts of change
  await broadcastSettingsChange({ [message.key]: message.value }, sender);
}

/**
 * Handle UPDATE_SETTINGS message
 */
async function handleUpdateSettings(message, sendResponse, sender) {
  await settingsManager.updateSettings(message.updates);
  sendResponse({ success: true });
  
  // Notify all content scripts of changes
  await broadcastSettingsChange(message.updates, sender);
}

/**
 * Handle EXPORT_SETTINGS message
 */
async function handleExportSettings(message, sendResponse) {
  const exportData = await settingsManager.exportSettings();
  sendResponse({ data: exportData });
}

/**
 * Handle IMPORT_SETTINGS message
 */
async function handleImportSettings(message, sendResponse, sender) {
  await settingsManager.importSettings(message.data);
  sendResponse({ success: true });
  
  // Notify all content scripts of import
  await broadcastSettingsImport(sender);
}

/**
 * Handle RESET_SETTINGS message
 */
async function handleResetSettings(message, sendResponse, sender) {
  await settingsManager.resetToDefaults();
  sendResponse({ success: true });
  
  // Notify all content scripts of reset
  await broadcastSettingsReset(sender);
}

/**
 * Handle GET_STORAGE_STATS message
 */
async function handleGetStorageStats(message, sendResponse) {
  const stats = await settingsManager.getStorageStats();
  sendResponse({ stats });
}

/**
 * Handle CHECK_STORAGE_QUOTA message
 */
async function handleCheckStorageQuota(message, sendResponse) {
  const quota = await settingsManager.checkStorageQuota();
  sendResponse({ quota });
}

/**
 * Broadcast settings changes to all content scripts
 * @param {Object} changes - Changed settings
 * @param {Object} sender - Original sender to exclude
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
 * @param {Object} sender - Original sender to exclude
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
 * @param {Object} sender - Original sender to exclude
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
 * Handle browser action click (optional)
 */
function handleActionClick(tab) {
  // Open popup automatically - no action needed as popup is defined in manifest
  console.log('Browser action clicked for tab:', tab.id);
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
 * Handle storage changes
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

// Global error handler
self.addEventListener('error', handleError);
self.addEventListener('unhandledrejection', (event) => {
  handleError(event.reason);
});

// Initialize on startup
initializeSettings();

// Export functions for testing
if (typeof global !== 'undefined') {
  global.initializeSettings = initializeSettings;
  global.handleMessage = handleMessage;
  global.handleInstalled = handleInstalled;
  global.broadcastSettingsChange = broadcastSettingsChange;
}