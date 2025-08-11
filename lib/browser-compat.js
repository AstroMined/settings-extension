// lib/browser-compat.js
// Unminified cross-browser compatibility layer
// Replaces WebExtension Polyfill to avoid minified code issues

// Detect browser environment
const isChrome = typeof chrome !== 'undefined' && chrome.runtime;
const isFirefox = typeof browser !== 'undefined' && browser.runtime;
const isEdge = isChrome && navigator.userAgent.includes('Edg');

// Feature detection for cross-browser compatibility
const hasStorageLocal = (isChrome && chrome.storage?.local) || (isFirefox && browser.storage?.local);
const hasStorageSync = (isChrome && chrome.storage?.sync) || (isFirefox && browser.storage?.sync);
const hasRuntime = (isChrome && chrome.runtime) || (isFirefox && browser.runtime);
const hasTabs = (isChrome && chrome.tabs) || (isFirefox && browser.tabs);
const hasAction = (isChrome && chrome.action) || (isFirefox && browser.action);

// Promise wrapper for Chrome callback APIs
function promisify(fn, context) {
  if (!fn || typeof fn !== 'function') {
    return () => Promise.resolve();
  }
  
  return function(...args) {
    return new Promise((resolve, reject) => {
      try {
        fn.call(context, ...args, (result) => {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
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

// Unified browser API object
const browserAPI = {
  // Storage API with fallback detection
  storage: {
    local: hasStorageLocal ? {
      get: isChrome ? promisify(chrome.storage.local.get, chrome.storage.local) 
                    : browser.storage.local.get.bind(browser.storage.local),
      set: isChrome ? promisify(chrome.storage.local.set, chrome.storage.local) 
                    : browser.storage.local.set.bind(browser.storage.local),
      remove: isChrome ? promisify(chrome.storage.local.remove, chrome.storage.local) 
                       : browser.storage.local.remove.bind(browser.storage.local),
      clear: isChrome ? promisify(chrome.storage.local.clear, chrome.storage.local) 
                      : browser.storage.local.clear.bind(browser.storage.local),
      getBytesInUse: isChrome ? promisify(chrome.storage.local.getBytesInUse, chrome.storage.local) 
                              : browser.storage.local.getBytesInUse?.bind(browser.storage.local)
    } : null,
    
    sync: hasStorageSync ? {
      get: isChrome ? promisify(chrome.storage.sync.get, chrome.storage.sync) 
                    : browser.storage.sync.get.bind(browser.storage.sync),
      set: isChrome ? promisify(chrome.storage.sync.set, chrome.storage.sync) 
                    : browser.storage.sync.set.bind(browser.storage.sync),
      remove: isChrome ? promisify(chrome.storage.sync.remove, chrome.storage.sync) 
                       : browser.storage.sync.remove.bind(browser.storage.sync),
      clear: isChrome ? promisify(chrome.storage.sync.clear, chrome.storage.sync) 
                      : browser.storage.sync.clear.bind(browser.storage.sync),
      getBytesInUse: isChrome ? promisify(chrome.storage.sync.getBytesInUse, chrome.storage.sync) 
                              : browser.storage.sync.getBytesInUse?.bind(browser.storage.sync)
    } : null,
    
    // Storage change listeners
    onChanged: (isChrome && chrome.storage?.onChanged) || (isFirefox && browser.storage?.onChanged) ? {
      addListener: isChrome ? chrome.storage.onChanged.addListener.bind(chrome.storage.onChanged)
                           : browser.storage.onChanged.addListener.bind(browser.storage.onChanged),
      removeListener: isChrome ? chrome.storage.onChanged.removeListener.bind(chrome.storage.onChanged)
                               : browser.storage.onChanged.removeListener.bind(browser.storage.onChanged)
    } : {
      addListener: () => {},
      removeListener: () => {}
    }
  },
  
  // Runtime API for messaging
  runtime: hasRuntime ? {
    sendMessage: isChrome ? promisify(chrome.runtime.sendMessage, chrome.runtime) 
                         : browser.runtime.sendMessage.bind(browser.runtime),
    onMessage: {
      addListener: isChrome ? chrome.runtime.onMessage?.addListener?.bind(chrome.runtime.onMessage) || (() => {})
                           : browser.runtime.onMessage?.addListener?.bind(browser.runtime.onMessage) || (() => {}),
      removeListener: isChrome ? chrome.runtime.onMessage?.removeListener?.bind(chrome.runtime.onMessage) || (() => {})
                               : browser.runtime.onMessage?.removeListener?.bind(browser.runtime.onMessage) || (() => {})
    },
    lastError: isChrome ? chrome.runtime.lastError : browser.runtime.lastError,
    id: isChrome ? chrome.runtime.id : browser.runtime.id,
    getURL: isChrome ? chrome.runtime.getURL?.bind(chrome.runtime) || (() => '')
                     : browser.runtime.getURL?.bind(browser.runtime) || (() => ''),
    onInstalled: {
      addListener: isChrome ? chrome.runtime.onInstalled?.addListener?.bind(chrome.runtime.onInstalled) || (() => {})
                           : browser.runtime.onInstalled?.addListener?.bind(browser.runtime.onInstalled) || (() => {}),
      removeListener: isChrome ? chrome.runtime.onInstalled?.removeListener?.bind(chrome.runtime.onInstalled) || (() => {})
                               : browser.runtime.onInstalled?.removeListener?.bind(browser.runtime.onInstalled) || (() => {})
    },
    onStartup: {
      addListener: isChrome ? chrome.runtime.onStartup?.addListener?.bind(chrome.runtime.onStartup) || (() => {})
                           : browser.runtime.onStartup?.addListener?.bind(browser.runtime.onStartup) || (() => {}),
      removeListener: isChrome ? chrome.runtime.onStartup?.removeListener?.bind(chrome.runtime.onStartup) || (() => {})
                               : browser.runtime.onStartup?.removeListener?.bind(browser.runtime.onStartup) || (() => {})
    }
  } : null,
  
  // Tabs API
  tabs: hasTabs ? {
    query: isChrome ? promisify(chrome.tabs.query, chrome.tabs) 
                    : browser.tabs.query?.bind(browser.tabs) || (() => Promise.resolve([])),
    sendMessage: isChrome ? promisify(chrome.tabs.sendMessage, chrome.tabs) 
                         : browser.tabs.sendMessage?.bind(browser.tabs) || (() => Promise.resolve()),
    create: isChrome ? promisify(chrome.tabs.create, chrome.tabs)
                     : browser.tabs.create?.bind(browser.tabs) || (() => Promise.resolve()),
    onUpdated: {
      addListener: isChrome ? chrome.tabs.onUpdated?.addListener?.bind(chrome.tabs.onUpdated) || (() => {})
                           : browser.tabs.onUpdated?.addListener?.bind(browser.tabs.onUpdated) || (() => {}),
      removeListener: isChrome ? chrome.tabs.onUpdated?.removeListener?.bind(chrome.tabs.onUpdated) || (() => {})
                               : browser.tabs.onUpdated?.removeListener?.bind(browser.tabs.onUpdated) || (() => {})
    }
  } : null,
  
  // Action API (browser action)
  action: hasAction ? {
    onClicked: {
      addListener: isChrome ? chrome.action?.onClicked?.addListener?.bind(chrome.action.onClicked) || (() => {})
                           : browser.action?.onClicked?.addListener?.bind(browser.action.onClicked) || (() => {}),
      removeListener: isChrome ? chrome.action?.onClicked?.removeListener?.bind(chrome.action.onClicked) || (() => {})
                               : browser.action?.onClicked?.removeListener?.bind(browser.action.onClicked) || (() => {})
    },
    setIcon: isChrome ? promisify(chrome.action?.setIcon || (() => {}), chrome.action) 
                      : browser.action?.setIcon?.bind(browser.action) || (() => Promise.resolve()),
    setTitle: isChrome ? promisify(chrome.action?.setTitle || (() => {}), chrome.action) 
                       : browser.action?.setTitle?.bind(browser.action) || (() => Promise.resolve()),
    setBadgeText: isChrome ? promisify(chrome.action?.setBadgeText || (() => {}), chrome.action) 
                          : browser.action?.setBadgeText?.bind(browser.action) || (() => Promise.resolve()),
    setBadgeBackgroundColor: isChrome ? promisify(chrome.action?.setBadgeBackgroundColor || (() => {}), chrome.action) 
                                      : browser.action?.setBadgeBackgroundColor?.bind(browser.action) || (() => Promise.resolve())
  } : null,
  
  // Browser environment detection
  environment: {
    isChrome,
    isFirefox,
    isEdge,
    hasStorageLocal,
    hasStorageSync,
    hasRuntime,
    hasTabs,
    hasAction
  },
  
  // Utility functions
  utils: {
    // Check if API is available
    isAPIAvailable: (apiPath) => {
      const parts = apiPath.split('.');
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
      return hasStorageSync ? browserAPI.storage.sync : browserAPI.storage.local;
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
        console.warn('Message sending failed:', error);
        return { error: error.message };
      }
    },
    
    // Check storage quota
    checkStorageQuota: async (storageArea = 'local') => {
      try {
        const storage = browserAPI.storage[storageArea];
        if (!storage || !storage.getBytesInUse) {
          return { available: true, used: 0, quota: 'unknown' };
        }
        
        const used = await storage.getBytesInUse();
        const quota = storageArea === 'local' ? 5242880 : 102400; // 5MB local, 100KB sync
        
        return {
          available: used < quota * 0.9, // 90% threshold
          used,
          quota,
          percentUsed: (used / quota) * 100
        };
      } catch (error) {
        console.warn('Storage quota check failed:', error);
        return { available: true, used: 0, quota: 'unknown', error: error.message };
      }
    }
  }
};

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS (Node.js)
  module.exports = browserAPI;
} else if (typeof window !== 'undefined') {
  // Browser environment
  window.browserAPI = browserAPI;
} else {
  // Service worker context
  self.browserAPI = browserAPI;
}

// Add global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection in browser-compat:', event.reason);
  });
} else if (typeof self !== 'undefined') {
  self.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection in browser-compat:', event.reason);
  });
}