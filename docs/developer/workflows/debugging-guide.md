# Debugging Guide

## Executive Summary

Comprehensive guide for debugging the Settings Extension across different browsers, contexts, and scenarios. Covers tools, techniques, and common debugging patterns specific to Manifest V3 browser extensions.

## Scope

- **Applies to**: All extension components (background, content scripts, popup, options)
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Debugging Contexts

Browser extensions run in multiple contexts, each requiring different debugging approaches:

### 1. Background Script (Service Worker)
- **Chrome**: `chrome://extensions/` → "Inspect views: service worker"
- **Firefox**: `about:debugging` → "Inspect" → "Console" tab

### 2. Content Scripts
- **All browsers**: Right-click page → "Inspect" → "Sources" tab

### 3. Popup
- **All browsers**: Right-click extension icon → "Inspect popup"

### 4. Options Page
- **All browsers**: Right-click options page → "Inspect"

## Browser DevTools Setup

### Chrome DevTools

#### Enable Extension Debugging
```javascript
// In background.js - enable debugging
if (process.env.NODE_ENV === 'development') {
  chrome.action.setBadgeText({text: 'DEV'});
  chrome.action.setBadgeBackgroundColor({color: '#FF0000'});
}
```

#### Useful Console Commands
```javascript
// Check extension context
console.log('Context:', typeof chrome !== 'undefined' ? 'extension' : 'web');

// Debug storage
chrome.storage.local.get(null, (data) => {
  console.log('All stored data:', data);
});

// Monitor messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message, 'from:', sender);
});
```

### Firefox DevTools

#### Extension Console
1. Navigate to `about:debugging`
2. Click "This Firefox"
3. Find your extension, click "Inspect"
4. Use the Console tab for debugging

#### Browser Console
- **Mac**: `Cmd+Shift+J`
- **Windows/Linux**: `Ctrl+Shift+J`
- Enable extension logs: Gear icon → "Show content messages"

## Debugging Strategies

### 1. Logging and Console Output

#### Structured Logging
```javascript
// lib/logger.js
class Logger {
  constructor(context) {
    this.context = context;
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      context: this.context,
      message,
      ...data
    };
    
    console[level](`[${this.context}]`, message, data);
    
    // Store critical logs
    if (level === 'error') {
      this.storeErrorLog(logData);
    }
  }

  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }

  storeErrorLog(logData) {
    chrome.storage.local.get(['errorLogs'], (result) => {
      const logs = result.errorLogs || [];
      logs.push(logData);
      chrome.storage.local.set({errorLogs: logs.slice(-50)}); // Keep last 50
    });
  }
}

// Usage in different contexts
const backgroundLogger = new Logger('BACKGROUND');
const contentLogger = new Logger('CONTENT');
const popupLogger = new Logger('POPUP');
```

#### Message Tracing
```javascript
// background.js - trace all messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  backgroundLogger.info('Message received', {
    message,
    sender: {
      id: sender.id,
      tab: sender.tab?.id,
      frameId: sender.frameId
    }
  });
  
  // Your message handling logic here
  
  backgroundLogger.info('Sending response', { response });
  sendResponse(response);
});
```

### 2. Storage Debugging

#### Monitor Storage Changes
```javascript
// Debug storage operations
const originalSet = chrome.storage.local.set;
chrome.storage.local.set = function(items, callback) {
  console.log('Storage SET:', items);
  return originalSet.call(this, items, callback);
};

const originalGet = chrome.storage.local.get;
chrome.storage.local.get = function(keys, callback) {
  console.log('Storage GET:', keys);
  return originalGet.call(this, keys, (result) => {
    console.log('Storage GET result:', result);
    callback(result);
  });
};
```

#### Storage Inspector Tool
```javascript
// Add to popup for quick storage inspection
async function inspectStorage() {
  const local = await chrome.storage.local.get(null);
  const sync = await chrome.storage.sync.get(null);
  
  console.group('Storage Inspection');
  console.log('Local storage:', local);
  console.log('Sync storage:', sync);
  console.groupEnd();
  
  return { local, sync };
}

// Add button in popup to trigger inspection
document.getElementById('debug-storage')?.addEventListener('click', inspectStorage);
```

### 3. Network Debugging

#### Track API Calls
```javascript
// lib/api-debug.js
class APIDebugger {
  static wrapFetch() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const start = performance.now();
      console.log('API Request:', args[0], args[1]);
      
      try {
        const response = await originalFetch.apply(this, args);
        const duration = performance.now() - start;
        
        console.log('API Response:', {
          url: args[0],
          status: response.status,
          duration: `${duration.toFixed(2)}ms`
        });
        
        return response;
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    };
  }
}

// Enable in development
if (process.env.NODE_ENV === 'development') {
  APIDebugger.wrapFetch();
}
```

## Common Debugging Scenarios

### 1. Extension Not Loading

#### Checklist
```bash
# Verify manifest
cat manifest.json | python -m json.tool

# Check build output
ls -la dist/
ls -la dist/background.js dist/content-script.js

# Validate manifest
npm run validate
```

#### Console Checks
```javascript
// In background script
console.log('Background script loaded');
console.log('Chrome APIs available:', typeof chrome !== 'undefined');
console.log('Manifest:', chrome.runtime.getManifest());
```

### 2. Content Script Issues

#### Injection Debugging
```javascript
// content-script.js
(function() {
  console.log('Content script loading...', {
    url: window.location.href,
    readyState: document.readyState,
    timestamp: Date.now()
  });

  // Check if already injected
  if (window.settingsExtensionInjected) {
    console.warn('Content script already injected!');
    return;
  }
  window.settingsExtensionInjected = true;

  // Your content script logic here
})();
```

#### Page Context Issues
```javascript
// Debug page vs content script context
function debugContext() {
  console.log('Context check:', {
    hasChrome: typeof chrome !== 'undefined',
    hasWindow: typeof window !== 'undefined',
    hasDocument: typeof document !== 'undefined',
    location: window.location.href,
    title: document.title
  });
}

debugContext();
```

### 3. Message Passing Issues

#### Message Flow Debugging
```javascript
// Comprehensive message debugging
class MessageDebugger {
  static setup() {
    // Background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('🔵 Background received:', {
        message,
        from: this.getSenderInfo(sender),
        timestamp: Date.now()
      });
      
      // Process message and send response
      const response = this.handleMessage(message);
      console.log('🔵 Background sending:', response);
      
      sendResponse(response);
      return true; // Keep channel open for async responses
    });
  }

  static getSenderInfo(sender) {
    return {
      id: sender.id,
      tabId: sender.tab?.id,
      frameId: sender.frameId,
      url: sender.tab?.url
    };
  }
}
```

### 4. Storage Sync Issues

#### Sync Monitoring
```javascript
// Monitor storage sync events
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.group(`Storage change in ${areaName}`);
  for (let key in changes) {
    const change = changes[key];
    console.log(`${key}:`, {
      oldValue: change.oldValue,
      newValue: change.newValue
    });
  }
  console.groupEnd();
});
```

## Performance Debugging

### 1. Memory Leaks

#### Memory Monitoring
```javascript
// Monitor extension memory usage
setInterval(() => {
  if (performance.memory) {
    console.log('Memory usage:', {
      used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
      total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
      limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
    });
  }
}, 30000); // Every 30 seconds
```

#### Event Listener Leaks
```javascript
// Track event listeners
class EventListenerTracker {
  constructor() {
    this.listeners = new Map();
  }

  add(element, event, handler, name = 'anonymous') {
    const key = `${name}-${event}`;
    element.addEventListener(event, handler);
    this.listeners.set(key, { element, event, handler });
  }

  removeAll() {
    for (let [name, {element, event, handler}] of this.listeners) {
      element.removeEventListener(event, handler);
      console.log(`Removed listener: ${name}`);
    }
    this.listeners.clear();
  }
}
```

### 2. Performance Profiling

#### Timing Critical Operations
```javascript
// Performance timing wrapper
function timeOperation(name, operation) {
  return async function(...args) {
    const start = performance.now();
    try {
      const result = await operation.apply(this, args);
      const duration = performance.now() - start;
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`❌ ${name} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };
}

// Usage
const timedStorageGet = timeOperation('storage.get', chrome.storage.local.get);
```

## Advanced Debugging Techniques

### 1. Remote Debugging

#### Chrome Remote Debugging
```bash
# Start Chrome with remote debugging
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# Connect from another machine
chrome://inspect/#devices
```

### 2. Production Debugging

#### Error Reporting
```javascript
// lib/error-reporter.js
class ErrorReporter {
  static init() {
    // Catch unhandled errors
    window.addEventListener('error', this.handleError.bind(this));
    window.addEventListener('unhandledrejection', this.handleRejection.bind(this));
  }

  static handleError(event) {
    const error = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.reportError(error);
  }

  static handleRejection(event) {
    const error = {
      type: 'unhandledRejection',
      reason: event.reason?.toString(),
      stack: event.reason?.stack,
      timestamp: Date.now()
    };

    this.reportError(error);
  }

  static reportError(error) {
    // Store locally for debugging
    chrome.storage.local.get(['errorReports'], (result) => {
      const reports = result.errorReports || [];
      reports.push(error);
      chrome.storage.local.set({
        errorReports: reports.slice(-100) // Keep last 100
      });
    });

    console.error('Error reported:', error);
  }
}

// Initialize in all contexts
ErrorReporter.init();
```

## Debugging Tools and Extensions

### Browser Extensions for Debugging

1. **React Developer Tools** (if using React components)
2. **Redux DevTools** (if using Redux)
3. **Extension source viewer** for inspecting other extensions

### External Tools

1. **Charles Proxy** - HTTP debugging
2. **Wireshark** - Network packet analysis
3. **Chrome DevTools Protocol** - Programmatic debugging

## Troubleshooting Common Issues

### 1. "Extension context invalidated"
```javascript
// Handle context invalidation
try {
  chrome.storage.local.get(['key'], callback);
} catch (error) {
  if (error.message.includes('Extension context invalidated')) {
    console.warn('Extension context invalidated, reloading...');
    location.reload();
  }
}
```

### 2. Service Worker Lifecycle Issues
```javascript
// Monitor service worker lifecycle
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});

// Keep service worker alive during debugging
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    console.log('Service worker heartbeat');
  }, 25000);
}
```

### 3. Cross-Origin Issues
```javascript
// Debug CORS issues
fetch(url)
  .then(response => {
    console.log('Response headers:', [...response.headers.entries()]);
    return response.json();
  })
  .catch(error => {
    console.error('CORS error:', error);
    console.log('Origin:', window.location.origin);
  });
```

## Best Practices

1. **Use structured logging** with consistent formats
2. **Add debug flags** for development builds
3. **Monitor performance** in production
4. **Store error logs** for post-mortem analysis
5. **Test in multiple browsers** regularly
6. **Use source maps** for production debugging
7. **Implement graceful error handling**

## References

- [Chrome Extension Debugging](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)
- [Firefox Extension Debugging](https://extensionworkshop.com/documentation/develop/debugging/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Performance Debugging Guide](performance-profiling.md)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-08-11 | Developer Team | Initial debugging guide |