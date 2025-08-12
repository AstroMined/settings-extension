# Troubleshooting Guide

## Executive Summary

Comprehensive troubleshooting guide for common issues encountered during Settings Extension development and deployment. Includes diagnostic procedures, solution strategies, and prevention techniques for development, testing, and production environments.

## Scope

- **Applies to**: All development, testing, and production issues
- **Last Updated**: 2025-08-11
- **Status**: Approved

## General Diagnostic Approach

### 1. Identify the Problem

```bash
# Step 1: Gather information
echo "Extension ID: $(cat manifest.json | jq -r '.name')"
echo "Version: $(cat manifest.json | jq -r '.version')"
echo "Environment: $(node --version) / $(npm --version)"
echo "Browser: Check manually"

# Step 2: Check recent changes
git log --oneline -10
git status

# Step 3: Verify build state
ls -la dist/
npm run validate
```

### 2. Check Common Locations

```bash
# Browser extension logs
# Chrome: chrome://extensions -> Developer mode -> Errors
# Firefox: about:debugging -> This Firefox -> Inspect

# System logs (varies by OS)
# macOS: Console.app -> System Reports
# Windows: Event Viewer -> Applications
# Linux: journalctl -u chrome/firefox
```

### 3. Reproduce the Issue

```bash
# Clean environment reproduction
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Development Issues

### Extension Not Loading

#### Symptom

Extension doesn't appear in browser or shows as inactive.

#### Diagnosis

```bash
# Check manifest validity
cat manifest.json | python -m json.tool

# Verify build output
ls -la dist/
find dist/ -name "*.js" -exec echo {} \; -exec head -5 {} \;

# Check console for errors
# Chrome: F12 -> Console
# Firefox: F12 -> Console
```

#### Solutions

1. **Invalid manifest.json**

   ```bash
   # Validate JSON syntax
   npm install -g jsonlint
   jsonlint manifest.json

   # Common fixes:
   # - Remove trailing commas
   # - Check quotes (use double quotes)
   # - Verify required fields
   ```

2. **Missing or incorrect files**

   ```bash
   # Verify required files exist
   test -f dist/manifest.json && echo "✓ Manifest" || echo "✗ Manifest missing"
   test -f dist/background.js && echo "✓ Background" || echo "✗ Background missing"
   test -f dist/content-script.js && echo "✓ Content" || echo "✗ Content missing"
   ```

3. **Build issues**

   ```bash
   # Force clean rebuild
   npm run clean
   npm run build

   # Check webpack errors
   npm run build 2>&1 | grep -i error
   ```

4. **Permissions issues**
   ```json
   // Check manifest.json permissions
   {
     "permissions": ["storage", "activeTab"],
     "host_permissions": ["https://*/*"]
   }
   ```

#### Prevention

- Use `npm run validate` before loading extension
- Set up pre-commit hooks to validate manifest
- Use TypeScript for better error detection

### Service Worker Issues

#### Symptom

Background script not responding, service worker inactive.

#### Diagnosis

```javascript
// In browser console (extension context)
chrome.runtime.getBackgroundPage((bg) => {
  console.log("Background page:", bg);
  if (!bg) console.log("Service worker inactive");
});

// Check service worker registration
navigator.serviceWorker.getRegistrations().then((registrations) => {
  console.log("Service workers:", registrations);
});
```

#### Solutions

1. **Service worker not starting**

   ```javascript
   // background.js - Add initialization logging
   console.log("Service worker starting...");

   chrome.runtime.onInstalled.addListener(() => {
     console.log("Service worker installed");
   });

   chrome.runtime.onStartup.addListener(() => {
     console.log("Service worker startup");
   });
   ```

2. **Service worker timing out**

   ```javascript
   // Keep service worker alive during development
   if (process.env.NODE_ENV === "development") {
     setInterval(() => {
       console.log("Service worker heartbeat");
     }, 25000); // Chrome kills SW after 30s inactivity
   }
   ```

3. **Context invalidated errors**

   ```javascript
   // Handle context invalidation gracefully
   function safeStorageOperation(operation) {
     try {
       return operation();
     } catch (error) {
       if (error.message.includes("Extension context invalidated")) {
         console.warn("Extension context invalidated, reloading...");
         chrome.runtime.reload();
       }
       throw error;
     }
   }
   ```

4. **Memory issues**
   ```javascript
   // Monitor memory usage
   setInterval(() => {
     if (performance.memory) {
       const used = performance.memory.usedJSHeapSize / 1048576;
       if (used > 50) {
         // 50MB threshold
         console.warn("High memory usage:", used.toFixed(2), "MB");
       }
     }
   }, 30000);
   ```

### Content Script Issues

#### Symptom

Content scripts not injecting or not finding elements.

#### Diagnosis

```javascript
// Check if content script loaded
(function checkContentScript() {
  if (window.settingsExtensionLoaded) {
    console.log("✓ Content script loaded");
  } else {
    console.log("✗ Content script not loaded");
  }
})();

// Check injection timing
console.log("Page ready state:", document.readyState);
console.log("DOM loaded:", document.DOMContentLoaded);
```

#### Solutions

1. **Injection timing issues**

   ```javascript
   // Wait for DOM to be ready
   if (document.readyState === "loading") {
     document.addEventListener("DOMContentLoaded", initContentScript);
   } else {
     initContentScript();
   }

   function initContentScript() {
     // Content script logic here
   }
   ```

2. **Element not found**

   ```javascript
   // Robust element detection
   function waitForElement(selector, timeout = 5000) {
     return new Promise((resolve, reject) => {
       const element = document.querySelector(selector);
       if (element) {
         resolve(element);
         return;
       }

       const observer = new MutationObserver(() => {
         const element = document.querySelector(selector);
         if (element) {
           observer.disconnect();
           resolve(element);
         }
       });

       observer.observe(document.body, {
         childList: true,
         subtree: true,
       });

       setTimeout(() => {
         observer.disconnect();
         reject(new Error(`Element ${selector} not found within ${timeout}ms`));
       }, timeout);
     });
   }
   ```

3. **Content Security Policy conflicts**

   ```javascript
   // Check if CSP is blocking scripts
   function checkCSP() {
     const metaTags = document.getElementsByTagName("meta");
     for (let meta of metaTags) {
       if (meta.httpEquiv === "Content-Security-Policy") {
         console.log("Page CSP:", meta.content);
       }
     }
   }
   ```

4. **Multiple injection prevention**
   ```javascript
   // Prevent multiple injections
   if (window.settingsExtensionInjected) {
     console.warn("Content script already injected");
     return;
   }
   window.settingsExtensionInjected = true;
   ```

## Storage Issues

### Storage Quota Exceeded

#### Symptom

"QUOTA_EXCEEDED_ERR" when saving settings.

#### Diagnosis

```javascript
// Check storage usage
async function checkStorageUsage() {
  if (chrome.storage.local.getBytesInUse) {
    const used = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES || 5242880;
    console.log(
      `Storage: ${used}/${quota} bytes (${((used / quota) * 100).toFixed(1)}%)`,
    );
    return { used, quota, percentage: (used / quota) * 100 };
  }
  return null;
}
```

#### Solutions

1. **Clean up old data**

   ```javascript
   async function cleanupStorage() {
     const all = await chrome.storage.local.get();
     const now = Date.now();
     const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

     for (const [key, value] of Object.entries(all)) {
       if (value.timestamp && value.timestamp < oneMonthAgo) {
         await chrome.storage.local.remove(key);
         console.log(`Removed old data: ${key}`);
       }
     }
   }
   ```

2. **Compress data**

   ```javascript
   // Use compression for large data
   function compressData(data) {
     return JSON.stringify(data); // Basic compression
     // For better compression, use pako or similar library
   }

   function decompressData(compressed) {
     return JSON.parse(compressed);
   }
   ```

3. **Use sync storage for small data**

   ```javascript
   // Move user preferences to sync storage
   const preferences = {
     theme: "dark",
     notifications: true,
   };

   // Sync storage has smaller quota but syncs across devices
   await chrome.storage.sync.set({ preferences });
   ```

### Storage Sync Issues

#### Symptom

Settings not syncing across devices or browsers.

#### Diagnosis

```javascript
// Check sync status
async function checkSyncStatus() {
  const local = await chrome.storage.local.get();
  const sync = await chrome.storage.sync.get();

  console.log("Local storage keys:", Object.keys(local));
  console.log("Sync storage keys:", Object.keys(sync));

  // Check for conflicts
  const conflicts = Object.keys(local).filter(
    (key) =>
      key in sync && JSON.stringify(local[key]) !== JSON.stringify(sync[key]),
  );

  console.log("Conflicting keys:", conflicts);
}
```

#### Solutions

1. **Implement conflict resolution**

   ```javascript
   async function resolveSyncConflicts() {
     const local = await chrome.storage.local.get();
     const sync = await chrome.storage.sync.get();

     for (const key of Object.keys(local)) {
       if (key in sync) {
         const localItem = local[key];
         const syncItem = sync[key];

         // Use timestamp-based resolution
         if (localItem.lastModified > syncItem.lastModified) {
           await chrome.storage.sync.set({ [key]: localItem });
         } else {
           await chrome.storage.local.set({ [key]: syncItem });
         }
       }
     }
   }
   ```

2. **Add sync metadata**

   ```javascript
   async function saveWithMetadata(key, value) {
     const dataWithMeta = {
       ...value,
       lastModified: Date.now(),
       deviceId: await getDeviceId(),
       version: chrome.runtime.getManifest().version,
     };

     await chrome.storage.local.set({ [key]: dataWithMeta });
     await chrome.storage.sync.set({ [key]: dataWithMeta });
   }
   ```

## Build and Packaging Issues

### Webpack Build Failures

#### Symptom

Build process fails with various webpack errors.

#### Diagnosis

```bash
# Run build with verbose output
npm run build -- --verbose

# Check webpack configuration
node -e "console.log(JSON.stringify(require('./webpack.config.js'), null, 2))"

# Verify source files
find src/ -name "*.js" -exec echo "Checking {}" \; -exec node -c {} \;
```

#### Solutions

1. **Module resolution errors**

   ```javascript
   // webpack.config.js
   module.exports = {
     resolve: {
       extensions: [".js", ".jsx", ".ts", ".tsx"],
       alias: {
         "@": path.resolve(__dirname, "src"),
         lib: path.resolve(__dirname, "lib"),
       },
     },
   };
   ```

2. **Missing dependencies**

   ```bash
   # Check for missing peer dependencies
   npm ls --depth=0

   # Install missing dependencies
   npm install --save-dev webpack webpack-cli
   ```

3. **Build size issues**

   ```javascript
   // Analyze bundle size
   const BundleAnalyzerPlugin =
     require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

   module.exports = {
     plugins: [
       new BundleAnalyzerPlugin({
         analyzerMode: process.env.ANALYZE ? "server" : "disabled",
       }),
     ],
   };

   // Run with: ANALYZE=true npm run build
   ```

### Package Validation Errors

#### Symptom

web-ext lint reports validation errors.

#### Diagnosis

```bash
# Detailed validation
web-ext lint --source-dir=dist --verbose

# Check specific issues
web-ext lint --source-dir=dist --output=json | jq '.errors'
```

#### Solutions

1. **Manifest validation errors**

   ```bash
   # Common manifest fixes
   jq 'del(.key) | del(.update_url)' manifest.json > manifest-clean.json
   mv manifest-clean.json manifest.json
   ```

2. **File permission issues**

   ```bash
   # Fix file permissions
   find dist/ -type f -exec chmod 644 {} \;
   find dist/ -type d -exec chmod 755 {} \;
   ```

3. **Content Security Policy issues**
   ```json
   {
     "content_security_policy": {
       "extension_pages": "script-src 'self'; object-src 'self'"
     }
   }
   ```

## Runtime Issues

### Message Passing Failures

#### Symptom

Messages between components not being received.

#### Diagnosis

```javascript
// Debug message flow
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", { message, sender, timestamp: Date.now() });

  // Always call sendResponse, even for errors
  try {
    const result = processMessage(message);
    sendResponse({ success: true, result });
  } catch (error) {
    console.error("Message processing error:", error);
    sendResponse({ success: false, error: error.message });
  }

  return true; // Keep channel open for async responses
});
```

#### Solutions

1. **Async response handling**

   ```javascript
   // Proper async message handling
   chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
     if (message.type === "async-request") {
       handleAsyncRequest(message.data)
         .then((result) => sendResponse({ success: true, result }))
         .catch((error) =>
           sendResponse({ success: false, error: error.message }),
         );

       return true; // Important: keep message channel open
     }
   });
   ```

2. **Connection-based messaging**

   ```javascript
   // For long-lived connections
   chrome.runtime.onConnect.addListener((port) => {
     console.log("Port connected:", port.name);

     port.onMessage.addListener((message) => {
       // Handle message
       port.postMessage({ response: "received" });
     });

     port.onDisconnect.addListener(() => {
       console.log("Port disconnected:", port.name);
     });
   });
   ```

### Performance Issues

#### Symptom

Extension running slowly or consuming excessive resources.

#### Diagnosis

```javascript
// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.measurements = new Map();
  }

  start(operation) {
    this.measurements.set(operation, performance.now());
  }

  end(operation) {
    const start = this.measurements.get(operation);
    if (start) {
      const duration = performance.now() - start;
      console.log(`${operation}: ${duration.toFixed(2)}ms`);
      this.measurements.delete(operation);
      return duration;
    }
  }

  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
      };
    }
    return null;
  }
}

const monitor = new PerformanceMonitor();
```

#### Solutions

1. **Optimize DOM operations**

   ```javascript
   // Batch DOM updates
   function updateMultipleElements(updates) {
     const fragment = document.createDocumentFragment();

     updates.forEach(({ element, content }) => {
       const div = document.createElement("div");
       div.innerHTML = content;
       fragment.appendChild(div);
     });

     document.body.appendChild(fragment);
   }
   ```

2. **Debounce frequent operations**

   ```javascript
   function debounce(func, wait) {
     let timeout;
     return function executedFunction(...args) {
       const later = () => {
         clearTimeout(timeout);
         func.apply(this, args);
       };
       clearTimeout(timeout);
       timeout = setTimeout(later, wait);
     };
   }

   // Usage
   const debouncedSave = debounce(saveSettings, 1000);
   ```

3. **Use Web Workers for heavy operations**

   ```javascript
   // worker.js
   self.onmessage = function (e) {
     const { operation, data } = e.data;

     if (operation === "processLargeData") {
       const result = processData(data);
       self.postMessage({ success: true, result });
     }
   };

   // main script
   const worker = new Worker("worker.js");
   worker.postMessage({ operation: "processLargeData", data: largeDataSet });
   ```

## Browser-Specific Issues

### Chrome Issues

1. **Service Worker timeout**

   ```javascript
   // Keep service worker alive for debugging
   if (chrome.runtime.getManifest().manifest_version === 3) {
     // Service worker will be terminated after 30s of inactivity
     setInterval(() => chrome.runtime.getPlatformInfo(), 25000);
   }
   ```

2. **Storage quota in Chrome**
   ```javascript
   // Monitor Chrome storage quota
   chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
     const quota = chrome.storage.local.QUOTA_BYTES;
     if (bytesInUse > quota * 0.9) {
       // 90% full
       console.warn("Storage nearly full:", bytesInUse, "/", quota);
     }
   });
   ```

### Firefox Issues

1. **WebExtension polyfill**

   ```javascript
   // Ensure browser API availability
   if (typeof browser === "undefined") {
     window.browser = chrome;
   }
   ```

2. **CSP differences**
   ```javascript
   // Firefox stricter CSP handling
   function safeEval(code) {
     try {
       return new Function(code)();
     } catch (error) {
       console.warn("Code execution blocked by CSP:", error);
       return null;
     }
   }
   ```

## Emergency Procedures

### Extension Crash Recovery

```javascript
// Crash detection and recovery
class CrashRecovery {
  constructor() {
    this.lastHeartbeat = Date.now();
    this.setupHeartbeat();
    this.setupRecovery();
  }

  setupHeartbeat() {
    setInterval(() => {
      this.lastHeartbeat = Date.now();
      chrome.storage.local.set({ lastHeartbeat: this.lastHeartbeat });
    }, 5000);
  }

  async setupRecovery() {
    const stored = await chrome.storage.local.get(["lastHeartbeat"]);
    const lastHeartbeat = stored.lastHeartbeat || 0;
    const timeSinceHeartbeat = Date.now() - lastHeartbeat;

    if (timeSinceHeartbeat > 30000) {
      // 30 seconds
      console.warn("Potential crash detected, attempting recovery...");
      await this.recover();
    }
  }

  async recover() {
    try {
      // Clear potentially corrupted data
      const corruptedKeys = await this.findCorruptedData();
      if (corruptedKeys.length > 0) {
        await chrome.storage.local.remove(corruptedKeys);
      }

      // Restore from backup
      await this.restoreFromBackup();

      // Notify user
      this.notifyRecovery();
    } catch (error) {
      console.error("Recovery failed:", error);
    }
  }
}
```

### Data Backup and Restore

```javascript
// Automatic backup system
class BackupManager {
  constructor() {
    this.setupAutomaticBackup();
  }

  async createBackup() {
    try {
      const allData = await chrome.storage.local.get();
      const backup = {
        data: allData,
        timestamp: Date.now(),
        version: chrome.runtime.getManifest().version,
      };

      await chrome.storage.local.set({
        [`backup_${Date.now()}`]: backup,
      });

      // Keep only last 5 backups
      await this.cleanupOldBackups();
    } catch (error) {
      console.error("Backup creation failed:", error);
    }
  }

  async restoreBackup(timestamp) {
    try {
      const backupKey = `backup_${timestamp}`;
      const result = await chrome.storage.local.get([backupKey]);

      if (result[backupKey]) {
        const backup = result[backupKey];
        await chrome.storage.local.clear();
        await chrome.storage.local.set(backup.data);
        console.log("Backup restored successfully");
        return true;
      }
    } catch (error) {
      console.error("Backup restoration failed:", error);
    }
    return false;
  }
}
```

## Preventive Measures

### Health Checks

```javascript
// Extension health monitoring
class HealthChecker {
  async runHealthCheck() {
    const results = {
      storage: await this.checkStorage(),
      messaging: await this.checkMessaging(),
      permissions: await this.checkPermissions(),
      performance: await this.checkPerformance(),
    };

    return results;
  }

  async checkStorage() {
    try {
      const testKey = "health_check_" + Date.now();
      await chrome.storage.local.set({ [testKey]: "test" });
      const result = await chrome.storage.local.get([testKey]);
      await chrome.storage.local.remove([testKey]);

      return result[testKey] === "test";
    } catch (error) {
      return false;
    }
  }

  async checkMessaging() {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 1000);

      chrome.runtime.sendMessage({ type: "health_check" }, (response) => {
        clearTimeout(timeout);
        resolve(response && response.status === "ok");
      });
    });
  }
}
```

### Error Reporting

```javascript
// Automated error reporting
class ErrorReporter {
  constructor() {
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    window.addEventListener("error", this.reportError.bind(this));
    window.addEventListener(
      "unhandledrejection",
      this.reportRejection.bind(this),
    );
  }

  async reportError(event) {
    const errorData = {
      type: "javascript_error",
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      extensionVersion: chrome.runtime.getManifest().version,
    };

    await this.storeError(errorData);
  }

  async storeError(errorData) {
    try {
      const stored = await chrome.storage.local.get(["errorLog"]);
      const errors = stored.errorLog || [];

      errors.push(errorData);

      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }

      await chrome.storage.local.set({ errorLog: errors });
    } catch (error) {
      console.error("Failed to store error:", error);
    }
  }
}
```

## Getting Help

### Diagnostic Information Collection

```bash
#!/bin/bash
# collect-diagnostics.sh

echo "=== Extension Diagnostics ==="
echo "Date: $(date)"
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo ""

echo "=== Extension Info ==="
cat manifest.json | jq '{name, version, manifest_version}'
echo ""

echo "=== Build Status ==="
npm run build 2>&1 | tail -10
echo ""

echo "=== Package Validation ==="
npm run validate 2>&1 | head -20
echo ""

echo "=== Recent Git Activity ==="
git log --oneline -5
echo ""

echo "=== File Structure ==="
tree dist/ -L 2 2>/dev/null || ls -la dist/
```

### Support Resources

1. **Internal Documentation**
   - [Architecture Documentation](../../architecture/README.md)
   - [User Documentation](../../user/README.md)
   - [API Reference](../../user/reference/api.md)

2. **External Resources**
   - [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
   - [Firefox WebExtension Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/browser-extension)

3. **Community Support**
   - GitHub Issues: Use issue templates
   - Developer Forums: Chrome/Firefox developer communities
   - Discord/Slack: Extension developer groups

## References

- [Chrome Extension Debugging](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)
- [Firefox Extension Debugging](https://extensionworkshop.com/documentation/develop/debugging/)
- [Web Extension Testing](https://github.com/mozilla/web-ext)
- [Performance Debugging Guide](performance-profiling.md)

## Revision History

| Date       | Author         | Changes                       |
| ---------- | -------------- | ----------------------------- |
| 2025-08-11 | Developer Team | Initial troubleshooting guide |
