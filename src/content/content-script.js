// content-script.js
// Main content script that provides settings API to web pages

// Initialize the settings API when the content script loads
let contentSettings;

/**
 * Initialize content script settings
 */
function initializeContentScript() {
  try {
    // Create settings instance
    contentSettings = new ContentScriptSettings();

    // Set up basic error handling
    contentSettings.addChangeListener((event, data) => {
      console.debug("Settings event in content script:", event, data);
    });

    // Register content script presence in storage
    registerContentScriptPresence();

    console.debug("Content script settings initialized");
  } catch (error) {
    console.error("Failed to initialize content script settings:", error);
  }
}

/**
 * Register content script presence in storage for popup detection
 */
async function registerContentScriptPresence() {
  try {
    // Get current tab ID through background script to avoid tabs permission in content script
    const response = await browserAPI.runtime.sendMessage({
      type: "GET_CURRENT_TAB_ID",
    });

    if (!response || !response.tabId) {
      console.debug("Could not get tab ID for content script registration");
      return;
    }

    const tabId = response.tabId;

    // Get existing registry
    const result = await browserAPI.storage.local.get("contentScriptRegistry");
    const registry = result.contentScriptRegistry || {};

    // Register this tab with current timestamp
    registry[tabId] = {
      timestamp: Date.now(),
      url: window.location.href,
    };

    // Store updated registry
    await browserAPI.storage.local.set({ contentScriptRegistry: registry });

    console.debug("Content script presence registered for tab:", tabId);
  } catch (error) {
    console.error("Failed to register content script presence:", error);
  }
}

/**
 * Expose settings API to page context (optional)
 * Only expose if the page requests it via a custom event
 */
function exposeSettingsAPI() {
  // Listen for requests from page scripts
  window.addEventListener("requestSettingsAPI", async (event) => {
    try {
      // Verify the request is legitimate
      if (!event.detail || event.detail.source !== "page-script") {
        return;
      }

      // Create a safe API wrapper
      const safeAPI = {
        getSetting: async (key) => {
          try {
            const setting = await contentSettings.getSetting(key);
            return setting ? setting.value : null;
          } catch (error) {
            console.error("Error getting setting:", error);
            return null;
          }
        },

        getSettings: async (keys) => {
          try {
            const settings = await contentSettings.getSettings(keys);
            const values = {};
            for (const [key, setting] of Object.entries(settings)) {
              values[key] = setting ? setting.value : null;
            }
            return values;
          } catch (error) {
            console.error("Error getting settings:", error);
            return {};
          }
        },

        // Read-only API for page scripts
        addChangeListener: (callback) => {
          if (typeof callback === "function") {
            contentSettings.addChangeListener(callback);
          }
        },

        removeChangeListener: (callback) => {
          contentSettings.removeChangeListener(callback);
        },
      };

      // Dispatch response event
      window.dispatchEvent(
        new CustomEvent("settingsAPIResponse", {
          detail: { api: safeAPI },
        }),
      );
    } catch (error) {
      console.error("Error exposing settings API:", error);
    }
  });
}

/**
 * Handle page navigation
 */
function handlePageNavigation() {
  // Re-initialize if needed
  if (!contentSettings) {
    initializeContentScript();
  }
}

/**
 * Cleanup on page unload
 */
async function cleanup() {
  if (contentSettings) {
    contentSettings.destroy();
    contentSettings = null;
  }

  // Clean up content script presence registration
  await unregisterContentScriptPresence();
}

/**
 * Remove content script presence registration from storage
 */
async function unregisterContentScriptPresence() {
  try {
    // Get current tab ID through background script
    const response = await browserAPI.runtime.sendMessage({
      type: "GET_CURRENT_TAB_ID",
    });

    if (!response || !response.tabId) {
      return;
    }

    const tabId = response.tabId;

    // Get existing registry
    const result = await browserAPI.storage.local.get("contentScriptRegistry");
    const registry = result.contentScriptRegistry || {};

    // Remove this tab from registry
    delete registry[tabId];

    // Store updated registry
    await browserAPI.storage.local.set({ contentScriptRegistry: registry });

    console.debug("Content script presence unregistered for tab:", tabId);
  } catch (error) {
    console.error("Failed to unregister content script presence:", error);
  }
}

// Initialize when script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeContentScript);
} else {
  initializeContentScript();
}

// Set up API exposure (optional)
exposeSettingsAPI();

// Handle page lifecycle
window.addEventListener("beforeunload", cleanup);
window.addEventListener("pagehide", cleanup);

// Handle navigation in SPAs
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    handlePageNavigation();
  }
}).observe(document, { subtree: true, childList: true });

// Export for testing or direct access
if (typeof window !== "undefined") {
  window.extensionSettings = {
    getInstance: () => contentSettings,
    isInitialized: () => !!contentSettings,
  };
}

// Export functions for testing
if (typeof global !== "undefined") {
  global.initializeContentScript = initializeContentScript;
  global.exposeSettingsAPI = exposeSettingsAPI;
  global.handleSettingChanged = (event) => {
    console.debug("Setting changed in content script:", event.key, event.value);
  };
  global.handleSettingsReset = () => {
    console.debug("All settings reset in content script");
  };
}
