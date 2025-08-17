// lib/browser-compat.js
// Unminified cross-browser compatibility layer
// Replaces WebExtension Polyfill to avoid minified code issues

// Promise wrapper for Chrome callback APIs
function promisify(fn, context) {
  if (!fn || typeof fn !== "function") {
    return () => Promise.resolve();
  }

  return function (...args) {
    return new Promise((resolve, reject) => {
      try {
        fn.call(context, ...args, (result) => {
          if (
            typeof chrome !== "undefined" &&
            chrome.runtime &&
            chrome.runtime.lastError
          ) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  };
}

// Check if browserAPI already exists to prevent redeclaration errors
const browserAPI_exists =
  (typeof self !== "undefined" && self.browserAPI) ||
  (typeof window !== "undefined" && window.browserAPI) ||
  (typeof global !== "undefined" && global.browserAPI);

if (!browserAPI_exists) {
  // Only declare browserAPI if it doesn't exist

  // Detect browser environment
  const isChrome = typeof chrome !== "undefined" && chrome.runtime;
  const isFirefox = typeof browser !== "undefined" && browser.runtime;
  const isEdge = isChrome && navigator.userAgent.includes("Edg");

  // Feature detection for cross-browser compatibility
  const hasStorageLocal =
    (isChrome && chrome.storage?.local) ||
    (isFirefox && browser.storage?.local);
  const hasStorageSync =
    (isChrome && chrome.storage?.sync) || (isFirefox && browser.storage?.sync);
  const hasRuntime =
    (isChrome && chrome.runtime) || (isFirefox && browser.runtime);
  const hasTabs = (isChrome && chrome.tabs) || (isFirefox && browser.tabs);
  const hasAction =
    (isChrome && chrome.action) || (isFirefox && browser.action);
  const hasAlarms =
    (isChrome && chrome.alarms) || (isFirefox && browser.alarms);

  // Unified browser API object
  const browserAPI = {
    // Storage API with fallback detection
    storage: {
      local: hasStorageLocal
        ? {
            get: isChrome
              ? promisify(chrome.storage.local.get, chrome.storage.local)
              : browser.storage.local.get.bind(browser.storage.local),
            set: isChrome
              ? promisify(chrome.storage.local.set, chrome.storage.local)
              : browser.storage.local.set.bind(browser.storage.local),
            remove: isChrome
              ? promisify(chrome.storage.local.remove, chrome.storage.local)
              : browser.storage.local.remove.bind(browser.storage.local),
            clear: isChrome
              ? promisify(chrome.storage.local.clear, chrome.storage.local)
              : browser.storage.local.clear.bind(browser.storage.local),
            getBytesInUse: isChrome
              ? promisify(
                  chrome.storage.local.getBytesInUse,
                  chrome.storage.local,
                )
              : browser.storage.local.getBytesInUse?.bind(
                  browser.storage.local,
                ),
          }
        : null,

      sync: hasStorageSync
        ? {
            get: isChrome
              ? promisify(chrome.storage.sync.get, chrome.storage.sync)
              : browser.storage.sync.get.bind(browser.storage.sync),
            set: isChrome
              ? promisify(chrome.storage.sync.set, chrome.storage.sync)
              : browser.storage.sync.set.bind(browser.storage.sync),
            remove: isChrome
              ? promisify(chrome.storage.sync.remove, chrome.storage.sync)
              : browser.storage.sync.remove.bind(browser.storage.sync),
            clear: isChrome
              ? promisify(chrome.storage.sync.clear, chrome.storage.sync)
              : browser.storage.sync.clear.bind(browser.storage.sync),
            getBytesInUse: isChrome
              ? promisify(
                  chrome.storage.sync.getBytesInUse,
                  chrome.storage.sync,
                )
              : browser.storage.sync.getBytesInUse?.bind(browser.storage.sync),
          }
        : null,

      // Storage change listeners
      onChanged:
        (isChrome && chrome.storage?.onChanged) ||
        (isFirefox && browser.storage?.onChanged)
          ? {
              addListener: isChrome
                ? chrome.storage.onChanged.addListener.bind(
                    chrome.storage.onChanged,
                  )
                : browser.storage.onChanged.addListener.bind(
                    browser.storage.onChanged,
                  ),
              removeListener: isChrome
                ? chrome.storage.onChanged.removeListener.bind(
                    chrome.storage.onChanged,
                  )
                : browser.storage.onChanged.removeListener.bind(
                    browser.storage.onChanged,
                  ),
            }
          : {
              addListener: () => {},
              removeListener: () => {},
            },
    },

    // Runtime API for messaging
    runtime: hasRuntime
      ? {
          sendMessage: isChrome
            ? promisify(chrome.runtime.sendMessage, chrome.runtime)
            : browser.runtime.sendMessage.bind(browser.runtime),
          onMessage: {
            addListener: isChrome
              ? chrome.runtime.onMessage?.addListener?.bind(
                  chrome.runtime.onMessage,
                ) || (() => {})
              : browser.runtime.onMessage?.addListener?.bind(
                  browser.runtime.onMessage,
                ) || (() => {}),
            removeListener: isChrome
              ? chrome.runtime.onMessage?.removeListener?.bind(
                  chrome.runtime.onMessage,
                ) || (() => {})
              : browser.runtime.onMessage?.removeListener?.bind(
                  browser.runtime.onMessage,
                ) || (() => {}),
          },
          lastError: isChrome
            ? chrome.runtime.lastError
            : browser.runtime.lastError,
          id: isChrome ? chrome.runtime.id : browser.runtime.id,
          getURL: isChrome
            ? chrome.runtime.getURL?.bind(chrome.runtime) || (() => "")
            : browser.runtime.getURL?.bind(browser.runtime) || (() => ""),
          onInstalled: {
            addListener: isChrome
              ? chrome.runtime.onInstalled?.addListener?.bind(
                  chrome.runtime.onInstalled,
                ) || (() => {})
              : browser.runtime.onInstalled?.addListener?.bind(
                  browser.runtime.onInstalled,
                ) || (() => {}),
            removeListener: isChrome
              ? chrome.runtime.onInstalled?.removeListener?.bind(
                  chrome.runtime.onInstalled,
                ) || (() => {})
              : browser.runtime.onInstalled?.removeListener?.bind(
                  browser.runtime.onInstalled,
                ) || (() => {}),
          },
          onStartup: {
            addListener: isChrome
              ? chrome.runtime.onStartup?.addListener?.bind(
                  chrome.runtime.onStartup,
                ) || (() => {})
              : browser.runtime.onStartup?.addListener?.bind(
                  browser.runtime.onStartup,
                ) || (() => {}),
            removeListener: isChrome
              ? chrome.runtime.onStartup?.removeListener?.bind(
                  chrome.runtime.onStartup,
                ) || (() => {})
              : browser.runtime.onStartup?.removeListener?.bind(
                  browser.runtime.onStartup,
                ) || (() => {}),
          },
        }
      : null,

    // Tabs API
    tabs: hasTabs
      ? {
          query: isChrome
            ? promisify(chrome.tabs.query, chrome.tabs)
            : browser.tabs.query?.bind(browser.tabs) ||
              (() => Promise.resolve([])),
          sendMessage: isChrome
            ? promisify(chrome.tabs.sendMessage, chrome.tabs)
            : browser.tabs.sendMessage?.bind(browser.tabs) ||
              (() => Promise.resolve()),
          create: isChrome
            ? promisify(chrome.tabs.create, chrome.tabs)
            : browser.tabs.create?.bind(browser.tabs) ||
              (() => Promise.resolve()),
          onUpdated: {
            addListener: isChrome
              ? chrome.tabs.onUpdated?.addListener?.bind(
                  chrome.tabs.onUpdated,
                ) || (() => {})
              : browser.tabs.onUpdated?.addListener?.bind(
                  browser.tabs.onUpdated,
                ) || (() => {}),
            removeListener: isChrome
              ? chrome.tabs.onUpdated?.removeListener?.bind(
                  chrome.tabs.onUpdated,
                ) || (() => {})
              : browser.tabs.onUpdated?.removeListener?.bind(
                  browser.tabs.onUpdated,
                ) || (() => {}),
          },
        }
      : null,

    // Action API (browser action)
    action: hasAction
      ? {
          onClicked: {
            addListener: isChrome
              ? chrome.action?.onClicked?.addListener?.bind(
                  chrome.action.onClicked,
                ) || (() => {})
              : browser.action?.onClicked?.addListener?.bind(
                  browser.action.onClicked,
                ) || (() => {}),
            removeListener: isChrome
              ? chrome.action?.onClicked?.removeListener?.bind(
                  chrome.action.onClicked,
                ) || (() => {})
              : browser.action?.onClicked?.removeListener?.bind(
                  browser.action.onClicked,
                ) || (() => {}),
          },
          setIcon: isChrome
            ? promisify(chrome.action?.setIcon || (() => {}), chrome.action)
            : browser.action?.setIcon?.bind(browser.action) ||
              (() => Promise.resolve()),
          setTitle: isChrome
            ? promisify(chrome.action?.setTitle || (() => {}), chrome.action)
            : browser.action?.setTitle?.bind(browser.action) ||
              (() => Promise.resolve()),
          setBadgeText: isChrome
            ? promisify(
                chrome.action?.setBadgeText || (() => {}),
                chrome.action,
              )
            : browser.action?.setBadgeText?.bind(browser.action) ||
              (() => Promise.resolve()),
          setBadgeBackgroundColor: isChrome
            ? promisify(
                chrome.action?.setBadgeBackgroundColor || (() => {}),
                chrome.action,
              )
            : browser.action?.setBadgeBackgroundColor?.bind(browser.action) ||
              (() => Promise.resolve()),
        }
      : null,

    // Alarms API
    alarms: hasAlarms
      ? {
          create: isChrome
            ? promisify(chrome.alarms.create, chrome.alarms)
            : browser.alarms.create?.bind(browser.alarms) ||
              (() => Promise.resolve()),
          clear: isChrome
            ? promisify(chrome.alarms.clear, chrome.alarms)
            : browser.alarms.clear?.bind(browser.alarms) ||
              (() => Promise.resolve()),
          get: isChrome
            ? promisify(chrome.alarms.get, chrome.alarms)
            : browser.alarms.get?.bind(browser.alarms) ||
              (() => Promise.resolve()),
          getAll: isChrome
            ? promisify(chrome.alarms.getAll, chrome.alarms)
            : browser.alarms.getAll?.bind(browser.alarms) ||
              (() => Promise.resolve([])),
          onAlarm: {
            addListener: isChrome
              ? chrome.alarms.onAlarm?.addListener?.bind(
                  chrome.alarms.onAlarm,
                ) || (() => {})
              : browser.alarms.onAlarm?.addListener?.bind(
                  browser.alarms.onAlarm,
                ) || (() => {}),
            removeListener: isChrome
              ? chrome.alarms.onAlarm?.removeListener?.bind(
                  chrome.alarms.onAlarm,
                ) || (() => {})
              : browser.alarms.onAlarm?.removeListener?.bind(
                  browser.alarms.onAlarm,
                ) || (() => {}),
          },
        }
      : null,

    // Browser environment detection
    environment: {
      isChrome,
      isFirefox,
      isEdge,
      hasStorageLocal,
      hasStorageSync,
      hasRuntime,
      hasTabs,
      hasAction,
      hasAlarms,
    },

    // Browser information
    getBrowserInfo: () => {
      if (isFirefox) {
        return { name: "firefox", version: "unknown" };
      } else if (isEdge) {
        return { name: "edge", version: "unknown" };
      } else if (isChrome) {
        return { name: "chrome", version: "unknown" };
      }
      return { name: "unknown", version: "unknown" };
    },

    // Utility functions
    utils: {
      // Check if API is available
      isAPIAvailable: (apiPath) => {
        const parts = apiPath.split(".");
        let current = browserAPI;

        for (const part of parts) {
          if (!current || !current[part]) {
            return false;
          }
          current = current[part];
        }

        return true;
      },

      // Get preferred storage (sync if available, local otherwise)
      getPreferredStorage: () => {
        return hasStorageSync
          ? browserAPI.storage.sync
          : browserAPI.storage.local;
      },

      // Safe message sending with error handling
      safeSendMessage: async (message, tabId = null) => {
        try {
          if (tabId) {
            return await browserAPI.tabs.sendMessage(tabId, message);
          } else {
            return await browserAPI.runtime.sendMessage(message);
          }
        } catch (error) {
          console.warn("Message sending failed:", error);
          return { error: error.message };
        }
      },

      // Check storage quota
      checkStorageQuota: async (storageArea = "local") => {
        try {
          const storage = browserAPI.storage[storageArea];
          if (!storage || !storage.getBytesInUse) {
            return { available: true, used: 0, quota: "unknown" };
          }

          const used = await storage.getBytesInUse();
          const quota = storageArea === "local" ? 5242880 : 102400; // 5MB local, 100KB sync

          return {
            available: used < quota * 0.9, // 90% threshold
            used,
            quota,
            percentUsed: (used / quota) * 100,
          };
        } catch (error) {
          console.warn("Storage quota check failed:", error);
          return {
            available: true,
            used: 0,
            quota: "unknown",
            error: error.message,
          };
        }
      },
    },
  };

  // Helper functions for testing
  const isManifestV3 = () => {
    try {
      const manifest = isChrome
        ? chrome.runtime?.getManifest()
        : browser.runtime?.getManifest();
      return manifest?.manifest_version === 3;
    } catch {
      return false;
    }
  };

  const supportsSyncStorage = () => hasStorageSync;

  const createStorageWrapper = () => browserAPI.storage;

  const createMessageWrapper = () => ({
    sendMessage: browserAPI.runtime.sendMessage,
    onMessage: browserAPI.runtime.onMessage,
  });

  // Export for use in different contexts
  if (typeof module !== "undefined" && module.exports) {
    // CommonJS (Node.js)
    module.exports = browserAPI;
    module.exports.getBrowserInfo = browserAPI.getBrowserInfo;
    module.exports.isManifestV3 = isManifestV3;
    module.exports.supportsSyncStorage = supportsSyncStorage;
    module.exports.createStorageWrapper = createStorageWrapper;
    module.exports.createMessageWrapper = createMessageWrapper;

    // Also assign to global for test compatibility
    global.browserAPI = browserAPI;
    global.getBrowserInfo = browserAPI.getBrowserInfo;
    global.isManifestV3 = isManifestV3;
    global.supportsSyncStorage = supportsSyncStorage;
    global.createStorageWrapper = createStorageWrapper;
    global.createMessageWrapper = createMessageWrapper;
  } else if (typeof window !== "undefined") {
    // Browser environment
    window.browserAPI = browserAPI;
    window.getBrowserInfo = browserAPI.getBrowserInfo;
    window.isManifestV3 = isManifestV3;
    window.supportsSyncStorage = supportsSyncStorage;
    window.createStorageWrapper = createStorageWrapper;
    window.createMessageWrapper = createMessageWrapper;
  } else {
    // Service worker context
    self.browserAPI = browserAPI;
    self.getBrowserInfo = browserAPI.getBrowserInfo;
    self.isManifestV3 = isManifestV3;
    self.supportsSyncStorage = supportsSyncStorage;
    self.createStorageWrapper = createStorageWrapper;
    self.createMessageWrapper = createMessageWrapper;
  }

  // Add global error handler for unhandled promise rejections
  if (typeof window !== "undefined") {
    window.addEventListener("unhandledrejection", (event) => {
      console.error(
        "Unhandled promise rejection in browser-compat:",
        event.reason,
      );
    });
  } else if (typeof self !== "undefined") {
    self.addEventListener("unhandledrejection", (event) => {
      console.error(
        "Unhandled promise rejection in browser-compat:",
        event.reason,
      );
    });
  }
} // End of browserAPI_exists check
