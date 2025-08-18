// background.js
// Service worker for settings management

// Register event listeners at TOP LEVEL (MV3 requirement)
// These MUST be registered synchronously before any imports or async operations

// Global error handler (registered first)
self.addEventListener("error", (error) => {
  console.error("Unhandled error in background script:", error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error(
    "Unhandled promise rejection in background script:",
    event.reason,
  );
});

// Import browser compatibility layer first
importScripts("lib/browser-compat.js");

// Core Extension API listeners (registered after browserAPI is available)
console.log("🔧 Registering event listeners...");

try {
  browserAPI.runtime.onMessage.addListener(handleMessage);
  console.log("✅ Message listener registered successfully");
} catch (error) {
  console.error("❌ Failed to register message listener:", error);
}

try {
  browserAPI.runtime.onInstalled.addListener(handleInstalled);
  console.log("✅ Installed listener registered successfully");
} catch (error) {
  console.error("❌ Failed to register installed listener:", error);
}

try {
  browserAPI.runtime.onStartup.addListener(handleStartup);
  console.log("✅ Startup listener registered successfully");
} catch (error) {
  console.error("❌ Failed to register startup listener:", error);
}

try {
  browserAPI.storage.onChanged.addListener(handleStorageChange);
  console.log("✅ Storage change listener registered successfully");
} catch (error) {
  console.error("❌ Failed to register storage change listener:", error);
}

if (browserAPI.action && browserAPI.action.onClicked) {
  browserAPI.action.onClicked.addListener(handleActionClick);
}

// Keep-alive alarm to prevent service worker termination
browserAPI.alarms.create("keep-alive", { periodInMinutes: 0.42 }); // 25 seconds
browserAPI.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keep-alive") {
    // Simple operation to keep service worker alive
    try {
      // Use a simple storage check to keep service worker alive
      browserAPI.storage.local.get(["__keep_alive__"]);
      console.debug("Service worker keep-alive ping");
    } catch (error) {
      console.debug("Keep-alive ping failed:", error);
    }
  }
});

// Import remaining dependencies
importScripts(
  "lib/storage-errors.js",
  "lib/storage-logger.js",
  "lib/storage-operation-manager.js",
  "lib/error-handler.js",
  "lib/config-loader.js",
  "lib/settings-manager.js",
);

let settingsManager;

// Initialize immediately (no lazy loading)
initializeSettingsOnStartup();

/**
 * Initialize settings manager on service worker startup
 * @returns {Promise<void>}
 */
async function initializeSettingsOnStartup() {
  try {
    console.log("Initializing settings manager on startup...");
    settingsManager = new SettingsManager();
    await settingsManager.initialize();

    // Ensure settings are seeded from defaults if needed
    await ensureSettingsSeeded();

    console.log("Settings manager initialized successfully on startup");
  } catch (error) {
    console.error("Failed to initialize settings manager on startup:", error);
    // Create a fallback settings manager but don't fail completely
    try {
      settingsManager = new SettingsManager();
      // Use the same initialize method but with ConfigurationLoader fallback
      await settingsManager.initialize();
      await ensureSettingsSeeded();
      console.log("Settings manager initialized with fallback configuration");
    } catch (fallbackError) {
      console.error("Even fallback initialization failed:", fallbackError);
      settingsManager = null;
    }
  }
}

/**
 * Ensure settings are seeded from defaults.json if storage is empty
 * @returns {Promise<void>}
 */
async function ensureSettingsSeeded() {
  try {
    // Check if settings exist in storage
    const storageResult = await self.browserAPI.storage.local.get("settings");

    if (
      !storageResult.settings ||
      Object.keys(storageResult.settings).length === 0
    ) {
      console.log("No settings found in storage, seeding from defaults...");

      // Load defaults from config/defaults.json
      const defaultsUrl = self.browserAPI.runtime.getURL(
        "config/defaults.json",
      );
      const response = await fetch(defaultsUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch defaults: ${response.status}`);
      }

      const defaults = await response.json();
      console.log("Loaded defaults from config/defaults.json");

      // Store defaults in storage
      await self.browserAPI.storage.local.set({ settings: defaults });
      console.log("Settings seeded successfully from defaults");
    } else {
      console.log("Settings already exist in storage");
    }
  } catch (error) {
    console.error("Failed to seed settings from defaults:", error);
    // Don't throw - let the app continue with whatever settings exist
  }
}

/**
 * Initialize settings manager (legacy function for compatibility)
 * @returns {Promise<void>}
 */
async function initializeSettings() {
  try {
    settingsManager = new SettingsManager();
    await settingsManager.initialize();
    console.log("Settings manager initialized successfully");
  } catch (error) {
    console.error("Failed to initialize settings manager:", error);
    // Create a fallback settings manager
    settingsManager = new SettingsManager();
    // Use the same initialize method but ConfigurationLoader will handle fallback
    await settingsManager.initialize();
  }
}

/**
 * Handle messages from content scripts and popup
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response function
 * @returns {boolean} - Whether to keep the message channel open
 */
function handleMessage(message, sender, sendResponse) {
  console.log("📨 RECEIVED MESSAGE:", {
    type: message?.type,
    sender: sender?.tab?.id || "popup/options",
    timestamp: new Date().toISOString(),
  });

  // Handle PING immediately (synchronous)
  if (message.type === "PING") {
    sendResponse({ pong: true, timestamp: Date.now() });
    console.log("✅ PING handled synchronously");
    return false; // Don't keep channel open for sync response
  }

  // Settings manager should be initialized at startup, but handle edge cases
  if (!settingsManager) {
    console.warn(
      "Settings manager not available, attempting re-initialization...",
    );

    // Handle re-initialization asynchronously with timeout protection
    const initPromise = initializeSettingsOnStartup();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Initialization timeout")), 10000);
    });

    Promise.race([initPromise, timeoutPromise])
      .then(() => {
        if (!settingsManager) {
          console.error(
            "Settings manager still not available after re-initialization",
          );
          sendResponse({
            error:
              "Settings manager not available. Service worker may need to be restarted.",
            fallback: true,
          });
          return;
        }
        // Process the message after successful initialization
        console.log("✅ Settings manager re-initialized, processing message");
        processAsyncMessage(message, sender, sendResponse);
      })
      .catch((error) => {
        console.error("Failed to re-initialize settings manager:", error);
        sendResponse({
          error: `Settings manager initialization failed: ${error.message}`,
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

async function processAsyncMessage(message, sender, sendResponse) {
  try {
    console.log("🔄 Processing async message:", message.type);

    // Double-check settings manager availability
    if (!settingsManager) {
      console.error("Settings manager not available in processAsyncMessage");
      sendResponse({
        error: "Settings manager not available",
        fallback: true,
      });
      return;
    }

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

      case "GET_CURRENT_TAB_ID":
        await handleGetCurrentTabId(message, sendResponse, sender);
        break;

      default:
        sendResponse({ error: `Unknown message type: ${message.type}` });
    }

    console.log("✅ Async message processed successfully");
  } catch (error) {
    // Standardized error handling for background operations
    if (typeof ErrorHandler !== "undefined") {
      ErrorHandler.handle(
        error,
        {
          messageType: message.type,
          senderId: sender?.tab?.id || "popup",
        },
        {
          component: "Background",
          operation: `Message Handler (${message.type})`,
          severity: "error",
          showUser: false,
          rethrow: false,
        },
      );
    } else {
      console.error("❌ Error processing async message:", error);
    }
    sendResponse({ error: error.message });
  }
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
  console.log("🔍 Getting all settings...");
  try {
    let allSettings;

    // Try to get settings from settings manager first
    if (settingsManager) {
      allSettings = await settingsManager.getAllSettings();
    } else {
      // Fallback: try to get directly from storage
      console.log(
        "Settings manager not available, trying direct storage access...",
      );
      const storageResult = await self.browserAPI.storage.local.get("settings");
      allSettings = storageResult.settings;

      // If no settings in storage, seed from defaults
      if (!allSettings || Object.keys(allSettings).length === 0) {
        console.log("No settings in storage, loading defaults...");
        await ensureSettingsSeeded();
        const updatedResult =
          await self.browserAPI.storage.local.get("settings");
        allSettings = updatedResult.settings || {};
      }
    }

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

async function handleGetCurrentTabId(message, sendResponse, sender) {
  try {
    // If the sender is from a tab, return the tab ID
    if (sender && sender.tab && sender.tab.id) {
      sendResponse({ tabId: sender.tab.id });
      return;
    }

    // Otherwise try to get the current active tab
    const tabs = await self.browserAPI.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tabs && tabs.length > 0 && tabs[0].id) {
      sendResponse({ tabId: tabs[0].id });
    } else {
      sendResponse({ error: "Could not determine current tab ID" });
    }
  } catch (error) {
    console.error("Error getting current tab ID:", error);
    sendResponse({ error: error.message });
  }
}

/**
 * Broadcast settings changes to all content scripts
 * @param {Object} changes - Changed settings
 * @param {Object} sender - Original sender to exclude
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
        tab.url.startsWith("chrome://")
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
 * @param {Object} sender - Original sender to exclude
 */
async function broadcastSettingsImport(sender) {
  try {
    const allSettings = await settingsManager.getAllSettings();

    const tabs = await self.browserAPI.tabs.query({ status: "complete" });

    // Filter to only active tabs with valid URLs
    const validTabs = tabs.filter((tab) => {
      // Skip extension pages and invalid URLs
      if (
        !tab.url ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("chrome://")
      ) {
        return false;
      }
      // Skip the sender tab
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
        // Tab might not have content script injected or might be closed
        // Only log in debug mode to avoid console spam
        if (error.message.includes("Could not establish connection")) {
          // This is expected for tabs without our content script
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
 * @param {Object} sender - Original sender to exclude
 */
async function broadcastSettingsReset(sender) {
  try {
    const allSettings = await settingsManager.getAllSettings();

    const tabs = await self.browserAPI.tabs.query({ status: "complete" });

    // Filter to only active tabs with valid URLs
    const validTabs = tabs.filter((tab) => {
      // Skip extension pages and invalid URLs
      if (
        !tab.url ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("chrome://")
      ) {
        return false;
      }
      // Skip the sender tab
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
        // Tab might not have content script injected or might be closed
        // Only log in debug mode to avoid console spam
        if (error.message.includes("Could not establish connection")) {
          // This is expected for tabs without our content script
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

/**
 * Handle browser action click (optional)
 */
function handleActionClick(tab) {
  // Open popup automatically - no action needed as popup is defined in manifest
  console.log("Browser action clicked for tab:", tab.id);
}

/**
 * Handle extension installation
 */
function handleInstalled(details) {
  console.log("Extension installed:", details.reason);

  if (details.reason === "install") {
    // Initialize settings on first install
    initializeSettings();
  } else if (details.reason === "update") {
    // Handle extension update
    console.log("Extension updated from version:", details.previousVersion);
    initializeSettings();
  }
}

/**
 * Handle extension startup
 */
function handleStartup() {
  console.log("Extension starting up");
  initializeSettings();
}

/**
 * Handle storage changes
 */
function handleStorageChange(changes, areaName) {
  console.log("Storage changed:", areaName, changes);

  // If settings were changed externally, reinitialize
  if (areaName === "local" || areaName === "sync") {
    // Debounce reinitializations
    if (handleStorageChange.timeout) {
      clearTimeout(handleStorageChange.timeout);
    }

    handleStorageChange.timeout = setTimeout(async () => {
      try {
        if (settingsManager) {
          await settingsManager.initialize();
          console.log("Settings reloaded due to storage change");
        }
      } catch (error) {
        console.error("Failed to reload settings after storage change:", error);
      }
    }, 1000);
  }
}

// Export functions for testing
if (typeof global !== "undefined") {
  global.initializeSettings = initializeSettings;
  global.initializeSettingsOnStartup = initializeSettingsOnStartup;
  global.handleMessage = handleMessage;
  global.handleInstalled = handleInstalled;
  global.broadcastSettingsChange = broadcastSettingsChange;
}
