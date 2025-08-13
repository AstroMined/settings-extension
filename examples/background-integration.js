/**
 * Background Script Integration Example - Production Ready
 *
 * Complete Manifest V3 service worker implementation reflecting the actual
 * background.js patterns with all sophisticated error handling, keep-alive
 * mechanisms, and proper async/sync message handling.
 *
 * This is a drop-in background script that developers can use immediately
 * in their extensions to get full settings management capabilities.
 *
 * ⚠️ CRITICAL MV3 PATTERNS IMPLEMENTED:
 * - Event listeners registered BEFORE any imports (MV3 requirement)
 * - Keep-alive alarm to prevent service worker termination
 * - Proper async/sync message handling (avoids "message port closed" errors)
 * - Global error handlers for unhandled rejections
 * - Initialization patterns with fallback recovery
 */

// ========================================
// CRITICAL: Register all event listeners at TOP LEVEL before any imports
// This is a STRICT Manifest V3 requirement for service workers
// ========================================

console.log("🔧 Registering core event listeners...");

// Global error handlers (registered first)
self.addEventListener("error", (error) => {
  console.error("Unhandled error in background script:", error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error(
    "Unhandled promise rejection in background script:",
    event.reason,
  );
});

// Core Chrome Extension API listeners (MUST be registered before imports)
try {
  chrome.runtime.onMessage.addListener(handleMessage);
  console.log("✅ Message listener registered successfully");
} catch (error) {
  console.error("❌ Failed to register message listener:", error);
}

try {
  chrome.runtime.onInstalled.addListener(handleInstalled);
  console.log("✅ Installed listener registered successfully");
} catch (error) {
  console.error("❌ Failed to register installed listener:", error);
}

try {
  chrome.runtime.onStartup.addListener(handleStartup);
  console.log("✅ Startup listener registered successfully");
} catch (error) {
  console.error("❌ Failed to register startup listener:", error);
}

try {
  chrome.storage.onChanged.addListener(handleStorageChange);
  console.log("✅ Storage change listener registered successfully");
} catch (error) {
  console.error("❌ Failed to register storage change listener:", error);
}

// Browser action listener (if using action in manifest)
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(handleActionClick);
}

// ========================================
// KEEP-ALIVE MECHANISM
// Prevents service worker from being terminated every 30 seconds
// ========================================
chrome.alarms.create("keep-alive", { periodInMinutes: 0.42 }); // 25 seconds
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keep-alive") {
    // Simple operation to keep service worker alive
    chrome.runtime.getPlatformInfo(() => {
      console.debug("Service worker keep-alive ping");
    });
  }
});

// ========================================
// Import dependencies AFTER event listeners are registered
// ========================================
importScripts("lib/browser-compat.js", "lib/settings-manager.js");

let settingsManager;

// Initialize immediately on service worker startup
initializeSettingsOnStartup();

/**
 * Initialize settings manager on service worker startup
 * Includes sophisticated fallback patterns and error recovery
 */
async function initializeSettingsOnStartup() {
  try {
    console.log("🚀 Initializing settings manager on startup...");
    settingsManager = new SettingsManager();
    await settingsManager.initialize();
    console.log("✅ Settings manager initialized successfully on startup");
  } catch (error) {
    console.error(
      "❌ Failed to initialize settings manager on startup:",
      error,
    );

    // Advanced fallback recovery mechanism
    try {
      console.log("🔄 Attempting fallback initialization...");
      settingsManager = new SettingsManager();
      await settingsManager.initializeWithEmbeddedDefaults();
      console.log("✅ Settings manager initialized with fallback defaults");
    } catch (fallbackError) {
      console.error("❌ Even fallback initialization failed:", fallbackError);
      settingsManager = null;
    }
  }
}

/**
 * Handle messages from content scripts and popup
 *
 * ⚠️ CRITICAL PATTERN: This function is NOT declared as async
 * Using async function handleMessage() causes "message port closed" errors
 * in Manifest V3 because async functions return Promise.resolve(true), not true
 *
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response function
 * @returns {boolean} - Whether to keep message channel open
 */
function handleMessage(message, sender, sendResponse) {
  console.log("📨 RECEIVED MESSAGE:", {
    type: message?.type,
    sender: sender?.tab?.id || "popup/options",
    timestamp: new Date().toISOString(),
  });

  // Handle PING immediately (synchronous response)
  if (message.type === "PING") {
    sendResponse({ pong: true, timestamp: Date.now() });
    console.log("✅ PING handled synchronously");
    return false; // Don't keep channel open for sync response
  }

  // Settings manager should be initialized at startup, but handle edge cases
  if (!settingsManager) {
    console.warn(
      "⚠️ Settings manager not available, attempting re-initialization...",
    );

    // Handle re-initialization asynchronously
    initializeSettingsOnStartup()
      .then(() => {
        if (!settingsManager) {
          sendResponse({
            error:
              "Settings manager not available. Service worker may need to be restarted.",
            fallback: true,
          });
          return;
        }
        // Process the message after initialization
        processAsyncMessage(message, sender, sendResponse);
      })
      .catch((error) => {
        console.error("❌ Failed to re-initialize settings manager:", error);
        sendResponse({
          error:
            "Settings manager not available. Service worker may need to be restarted.",
          fallback: true,
        });
      });

    console.log("✅ Message handler returning true for async initialization");
    return true; // Keep channel open for async response
  }

  // Process message with initialized settings manager
  processAsyncMessage(message, sender, sendResponse);
  console.log("✅ Message handler returning true for async processing");
  return true; // Keep message channel open for async response
}

/**
 * Process messages asynchronously with full error handling
 * This is separated from handleMessage to maintain proper MV3 patterns
 */
async function processAsyncMessage(message, sender, sendResponse) {
  try {
    console.log("🔄 Processing async message:", message.type);

    switch (message.type) {
      case "GET_SETTING":
        await handleGetSetting(message, sendResponse);
        break;

      case "GET_SETTINGS":
        await handleGetSettings(message, sendResponse);
        break;

      case "GET_ALL_SETTINGS":
        await handleGetAllSettings(message, sendResponse);
        break;

      case "UPDATE_SETTING":
        await handleUpdateSetting(message, sendResponse, sender);
        break;

      case "UPDATE_SETTINGS":
        await handleUpdateSettings(message, sendResponse, sender);
        break;

      case "EXPORT_SETTINGS":
        await handleExportSettings(message, sendResponse);
        break;

      case "IMPORT_SETTINGS":
        await handleImportSettings(message, sendResponse, sender);
        break;

      case "RESET_SETTINGS":
        await handleResetSettings(message, sendResponse, sender);
        break;

      case "GET_STORAGE_STATS":
        await handleGetStorageStats(message, sendResponse);
        break;

      case "CHECK_STORAGE_QUOTA":
        await handleCheckStorageQuota(message, sendResponse);
        break;

      default:
        sendResponse({ error: `Unknown message type: ${message.type}` });
    }

    console.log("✅ Async message processed successfully");
  } catch (error) {
    console.error("❌ Error processing async message:", error);
    sendResponse({ error: error.message });
  }
}

// ========================================
// MESSAGE HANDLERS - Complete Implementation
// ========================================

async function handleGetSetting(message, sendResponse) {
  const setting = await settingsManager.getSetting(message.key);
  sendResponse({ value: setting });
}

async function handleGetSettings(message, sendResponse) {
  const settings = await settingsManager.getSettings(message.keys);
  sendResponse({ values: settings });
}

async function handleGetAllSettings(message, sendResponse) {
  console.log("🔍 Getting all settings...");
  try {
    const allSettings = await settingsManager.getAllSettings();
    console.log(
      "📤 Sending settings response:",
      Object.keys(allSettings || {}),
    );
    sendResponse({ settings: allSettings });
    console.log("✅ Settings response sent successfully");
  } catch (error) {
    console.error("❌ Error getting all settings:", error);
    sendResponse({ error: error.message });
  }
}

async function handleUpdateSetting(message, sendResponse, sender) {
  await settingsManager.updateSetting(message.key, message.value);
  sendResponse({ success: true });

  // Notify all content scripts of change
  await broadcastSettingsChange({ [message.key]: message.value }, sender);
}

async function handleUpdateSettings(message, sendResponse, sender) {
  await settingsManager.updateSettings(message.updates);
  sendResponse({ success: true });

  // Notify all content scripts of changes
  await broadcastSettingsChange(message.updates, sender);
}

async function handleExportSettings(message, sendResponse) {
  const exportData = await settingsManager.exportSettings();
  sendResponse({ data: exportData });
}

async function handleImportSettings(message, sendResponse, sender) {
  await settingsManager.importSettings(message.data);
  sendResponse({ success: true });

  // Notify all content scripts of import
  await broadcastSettingsImport(sender);
}

async function handleResetSettings(message, sendResponse, sender) {
  await settingsManager.resetToDefaults();
  sendResponse({ success: true });

  // Notify all content scripts of reset
  await broadcastSettingsReset(sender);
}

async function handleGetStorageStats(message, sendResponse) {
  const stats = await settingsManager.getStorageStats();
  sendResponse({ stats });
}

async function handleCheckStorageQuota(message, sendResponse) {
  const quota = await settingsManager.checkStorageQuota();
  sendResponse({ quota });
}

// ========================================
// BROADCASTING SYSTEM - Real-time Updates to All Tabs
// ========================================

/**
 * Broadcast settings changes to all content scripts
 * Uses sophisticated filtering to avoid unnecessary messages
 */
async function broadcastSettingsChange(changes, sender) {
  try {
    const tabs = await self.browserAPI.tabs.query({ status: "complete" });

    // Filter to only active tabs with valid URLs
    const validTabs = tabs.filter((tab) => {
      // Skip extension pages and invalid URLs
      if (
        !tab.url ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("moz-extension://")
      ) {
        return false;
      }
      // Skip the sender tab to avoid double updates
      if (sender && sender.tab && sender.tab.id === tab.id) {
        return false;
      }
      return true;
    });

    const broadcastPromises = validTabs.map(async (tab) => {
      try {
        await self.browserAPI.tabs.sendMessage(tab.id, {
          type: "SETTINGS_CHANGED",
          changes: changes,
        });
      } catch (error) {
        // Tab might not have content script injected or might be closed
        // Only log in debug mode to avoid console spam
        if (error.message.includes("Could not establish connection")) {
          // This is expected for tabs without our content script
          return;
        }
        console.debug(
          `Failed to send message to tab ${tab.id}:`,
          error.message,
        );
      }
    });

    await Promise.allSettled(broadcastPromises);
  } catch (error) {
    console.error("Failed to broadcast settings change:", error);
  }
}

/**
 * Broadcast settings import to all content scripts
 */
async function broadcastSettingsImport(sender) {
  try {
    const allSettings = await settingsManager.getAllSettings();
    const tabs = await self.browserAPI.tabs.query({ status: "complete" });

    const validTabs = tabs.filter((tab) => {
      if (
        !tab.url ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("moz-extension://")
      ) {
        return false;
      }
      if (sender && sender.tab && sender.tab.id === tab.id) {
        return false;
      }
      return true;
    });

    const broadcastPromises = validTabs.map(async (tab) => {
      try {
        await self.browserAPI.tabs.sendMessage(tab.id, {
          type: "SETTINGS_IMPORTED",
          settings: allSettings,
        });
      } catch (error) {
        if (error.message.includes("Could not establish connection")) {
          return;
        }
        console.debug(
          `Failed to send import message to tab ${tab.id}:`,
          error.message,
        );
      }
    });

    await Promise.allSettled(broadcastPromises);
  } catch (error) {
    console.error("Failed to broadcast settings import:", error);
  }
}

/**
 * Broadcast settings reset to all content scripts
 */
async function broadcastSettingsReset(sender) {
  try {
    const allSettings = await settingsManager.getAllSettings();
    const tabs = await self.browserAPI.tabs.query({ status: "complete" });

    const validTabs = tabs.filter((tab) => {
      if (
        !tab.url ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("moz-extension://")
      ) {
        return false;
      }
      if (sender && sender.tab && sender.tab.id === tab.id) {
        return false;
      }
      return true;
    });

    const broadcastPromises = validTabs.map(async (tab) => {
      try {
        await self.browserAPI.tabs.sendMessage(tab.id, {
          type: "SETTINGS_RESET",
          settings: allSettings,
        });
      } catch (error) {
        if (error.message.includes("Could not establish connection")) {
          return;
        }
        console.debug(
          `Failed to send reset message to tab ${tab.id}:`,
          error.message,
        );
      }
    });

    await Promise.allSettled(broadcastPromises);
  } catch (error) {
    console.error("Failed to broadcast settings reset:", error);
  }
}

// ========================================
// EXTENSION LIFECYCLE HANDLERS
// ========================================

/**
 * Handle browser action click (optional)
 */
function handleActionClick(tab) {
  console.log("Browser action clicked for tab:", tab.id);
  // Popup opens automatically if defined in manifest
  // Add custom logic here if needed
}

/**
 * Handle extension installation with intelligent initialization
 */
function handleInstalled(details) {
  console.log("Extension installed:", details.reason);

  if (details.reason === "install") {
    console.log("🎉 First-time installation detected");
    initializeSettingsOnStartup();
  } else if (details.reason === "update") {
    console.log("🔄 Extension updated from version:", details.previousVersion);
    initializeSettingsOnStartup();
  }
}

/**
 * Handle extension startup
 */
function handleStartup() {
  console.log("🔄 Extension starting up");
  initializeSettingsOnStartup();
}

/**
 * Handle external storage changes with debounced reinitialization
 */
function handleStorageChange(changes, areaName) {
  console.log("📦 Storage changed:", areaName, changes);

  // If settings were changed externally, reinitialize
  if (areaName === "local" || areaName === "sync") {
    // Debounce reinitializations to avoid rapid-fire updates
    if (handleStorageChange.timeout) {
      clearTimeout(handleStorageChange.timeout);
    }

    handleStorageChange.timeout = setTimeout(async () => {
      try {
        if (settingsManager) {
          await settingsManager.initialize();
          console.log("🔄 Settings reloaded due to storage change");
        }
      } catch (error) {
        console.error(
          "❌ Failed to reload settings after storage change:",
          error,
        );
      }
    }, 1000);
  }
}

// ========================================
// USAGE INSTRUCTIONS AND CONFIGURATION
// ========================================

/**
 * COMPLETE SETUP INSTRUCTIONS:
 *
 * 1. COPY FILES:
 *    - Copy this file as your background.js
 *    - Copy lib/browser-compat.js to lib/
 *    - Copy lib/settings-manager.js to lib/
 *
 * 2. UPDATE MANIFEST.JSON:
 *    {
 *      "manifest_version": 3,
 *      "background": {
 *        "service_worker": "background.js"
 *      },
 *      "permissions": ["storage", "activeTab"],
 *      "action": {
 *        "default_popup": "popup/popup.html"
 *      }
 *    }
 *
 * 3. CREATE YOUR SETTINGS SCHEMA:
 *    Create config/defaults.json with your settings:
 *    {
 *      "my_feature": {
 *        "type": "boolean",
 *        "value": true,
 *        "description": "Enable my awesome feature"
 *      },
 *      "api_endpoint": {
 *        "type": "text",
 *        "value": "https://api.myservice.com",
 *        "description": "API endpoint URL"
 *      }
 *    }
 *
 * 4. YOUR EXTENSION NOW HAS:
 *    ✅ Full CRUD settings management
 *    ✅ Real-time sync across all tabs
 *    ✅ Export/import functionality
 *    ✅ Storage quota monitoring
 *    ✅ Cross-browser compatibility
 *    ✅ Proper MV3 service worker patterns
 *    ✅ Keep-alive mechanisms
 *    ✅ Advanced error recovery
 *
 * 5. ACCESS FROM CONTENT SCRIPTS:
 *    const settings = new ContentScriptSettings();
 *    const config = await settings.getAllSettings();
 *
 * 6. ACCESS FROM POPUP/OPTIONS:
 *    Same ContentScriptSettings API works everywhere!
 *
 * This background script handles all the complexity so your
 * extension can focus on its core functionality.
 */

console.log("🚀 Settings Extension background script loaded successfully");

// Export functions for testing (only in test environment)
if (typeof global !== "undefined") {
  global.initializeSettingsOnStartup = initializeSettingsOnStartup;
  global.handleMessage = handleMessage;
  global.handleInstalled = handleInstalled;
  global.broadcastSettingsChange = broadcastSettingsChange;
}
