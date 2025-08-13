# Settings Extension API Reference

Complete API reference for the Settings Extension framework, documenting all classes, methods, and interfaces based on the production implementation.

## Executive Summary

This API reference provides comprehensive documentation for all public APIs in the Settings Extension framework. It includes exact method signatures, parameters, return values, error conditions, and usage examples based on the sophisticated production implementation.

**Framework Components:**
- **ContentScriptSettings** - Client-side API for content scripts
- **SettingsManager** - Server-side API for background scripts  
- **BrowserAPI** - Cross-browser compatibility layer
- **Message Protocol** - Inter-script communication specification

## ContentScriptSettings Class

The primary API for accessing settings from content scripts and popup/options pages.

### Constructor

```javascript
new ContentScriptSettings()
```

**Description:** Creates a new settings client with intelligent caching, timeout management, and change listeners.

**Example:**
```javascript
const settings = new ContentScriptSettings();
// Configure timeout for slow networks
settings.setMessageTimeout(8000); // 8 second timeout
```

### Core Methods

#### getSetting(key)

Gets a single setting by key with caching and validation.

**Signature:**
```typescript
async getSetting(key: string): Promise<SettingObject>
```

**Parameters:**
- `key` (string, required): The setting key to retrieve

**Returns:**
- `Promise<SettingObject>`: The setting object containing type, value, description, and constraints

**Throws:**
- `Error`: If key is invalid, setting not found, or communication fails

**Setting Object Structure:**
```typescript
interface SettingObject {
  type: 'boolean' | 'text' | 'longtext' | 'number' | 'json';
  value: any;
  description: string;
  maxLength?: number;    // For text/longtext types
  min?: number;          // For number type
  max?: number;          // For number type
}
```

**Examples:**
```javascript
// Get a boolean setting
const featureSetting = await settings.getSetting('feature_enabled');
console.log(featureSetting.value); // true or false

// Get a JSON setting with complex data
const configSetting = await settings.getSetting('advanced_config');
console.log(configSetting.value.endpoint); // Access nested properties

// Error handling
try {
  const setting = await settings.getSetting('nonexistent_key');
} catch (error) {
  if (error.message.includes('not found')) {
    console.log('Setting does not exist');
  } else if (error.message.includes('timeout')) {
    console.log('Connection timeout - background script may be slow');
  }
}
```

**Performance Notes:**
- First call fetches from background script and caches the result
- Subsequent calls use cached data for immediate response
- Cache is automatically invalidated when settings change

#### getSettings(keys)

Gets multiple settings efficiently in a single request.

**Signature:**
```typescript
async getSettings(keys: string[]): Promise<{[key: string]: SettingObject}>
```

**Parameters:**
- `keys` (string[], required): Array of setting keys to retrieve

**Returns:**
- `Promise<{[key: string]: SettingObject}>`: Object mapping keys to setting objects

**Throws:**
- `Error`: If keys is not an array, empty, or communication fails

**Examples:**
```javascript
// Get multiple settings efficiently
const config = await settings.getSettings([
  'feature_enabled',
  'api_endpoint',
  'refresh_interval',
  'advanced_config'
]);

console.log(config.feature_enabled.value);     // boolean
console.log(config.api_endpoint.value);       // string
console.log(config.refresh_interval.value);   // number

// Handle missing settings gracefully
const someSettings = await settings.getSettings(['existing', 'maybe_missing']);
if (someSettings.maybe_missing) {
  console.log('Optional setting exists:', someSettings.maybe_missing.value);
}

// Destructure for cleaner code
const { feature_enabled, api_endpoint } = await settings.getSettings([
  'feature_enabled', 'api_endpoint'
]);
```

**Performance Notes:**
- Much more efficient than multiple `getSetting()` calls
- Single network request regardless of number of keys
- All results are cached simultaneously

#### getAllSettings()

Gets all available settings. Use sparingly due to potential size.

**Signature:**
```typescript
async getAllSettings(): Promise<{[key: string]: SettingObject}>
```

**Returns:**
- `Promise<{[key: string]: SettingObject}>`: Object containing all settings

**Throws:**
- `Error`: If communication fails

**Examples:**
```javascript
// Get all settings (use sparingly)
const allSettings = await settings.getAllSettings();
console.log('Available settings:', Object.keys(allSettings));

// Iterate through all settings
for (const [key, setting] of Object.entries(allSettings)) {
  console.log(`${key}: ${setting.type} = ${setting.value}`);
}

// Find settings of specific type
const booleanSettings = Object.entries(allSettings)
  .filter(([key, setting]) => setting.type === 'boolean')
  .map(([key]) => key);
```

**Performance Warning:**
- Can be large and slow for extensions with many settings
- Prefer `getSettings()` with specific keys when possible
- Consider pagination for extensions with >50 settings

#### updateSetting(key, value)

Updates a single setting with validation and broadcasting.

**Signature:**
```typescript
async updateSetting(key: string, value: any): Promise<boolean>
```

**Parameters:**
- `key` (string, required): The setting key to update
- `value` (any, required): The new value (must match setting's type schema)

**Returns:**
- `Promise<boolean>`: True if successful

**Throws:**
- `Error`: If validation fails, key not found, or communication fails

**Examples:**
```javascript
// Update a boolean setting
await settings.updateSetting('feature_enabled', true);

// Update a text setting with validation
try {
  await settings.updateSetting('api_key', 'sk-1234567890');
} catch (error) {
  if (error.message.includes('exceeds maximum length')) {
    console.log('API key too long');
  }
}

// Update a number setting with range validation
try {
  await settings.updateSetting('refresh_interval', 45);
} catch (error) {
  if (error.message.includes('must be at least')) {
    console.log('Refresh interval too small');
  }
}

// Update a JSON setting
const newConfig = {
  endpoint: 'https://new-api.example.com',
  timeout: 10000,
  retries: 5
};
await settings.updateSetting('advanced_config', newConfig);
```

**Validation Rules:**
- **boolean**: Must be exactly `true` or `false`
- **text**: Must be string, respects `maxLength` if specified
- **longtext**: Must be string, respects `maxLength` if specified  
- **number**: Must be numeric, respects `min`/`max` if specified
- **json**: Must be valid JSON object without circular references

#### updateSettings(updates)

Updates multiple settings efficiently with atomic validation.

**Signature:**
```typescript
async updateSettings(updates: {[key: string]: any}): Promise<boolean>
```

**Parameters:**
- `updates` (object, required): Object mapping setting keys to new values

**Returns:**
- `Promise<boolean>`: True if all updates successful

**Throws:**
- `Error`: If any validation fails (no partial updates), or communication fails

**Examples:**
```javascript
// Batch update multiple settings
await settings.updateSettings({
  feature_enabled: true,
  refresh_interval: 120,
  api_endpoint: 'https://api.example.com/v2'
});

// Atomic updates - all succeed or all fail
try {
  await settings.updateSettings({
    valid_setting: 'good_value',
    invalid_setting: 'value_that_fails_validation'
  });
} catch (error) {
  // Neither setting was updated due to validation failure
  console.log('All updates rolled back due to validation error');
}

// Update configuration object
const configUpdates = {
  advanced_config: {
    ...currentConfig,
    timeout: 15000,  // Only change timeout
    retries: 2       // Only change retries  
  }
};
await settings.updateSettings(configUpdates);
```

**Performance Notes:**
- Single network request regardless of number of updates
- Atomic operation - all updates succeed or all fail
- More efficient than multiple `updateSetting()` calls

### Import/Export Methods

#### exportSettings()

Exports all settings as JSON string with metadata.

**Signature:**
```typescript
async exportSettings(): Promise<string>
```

**Returns:**
- `Promise<string>`: JSON string containing settings and metadata

**Export Format:**
```typescript
interface ExportData {
  version: string;        // Export format version
  timestamp: string;      // ISO timestamp
  settings: {[key: string]: SettingObject};
}
```

**Examples:**
```javascript
// Export settings
const exportData = await settings.exportSettings();

// Save to file (in popup/options page)
const blob = new Blob([exportData], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `settings-backup-${Date.now()}.json`;
a.click();
URL.revokeObjectURL(url);

// Parse export data
const parsed = JSON.parse(exportData);
console.log('Exported on:', parsed.timestamp);
console.log('Settings count:', Object.keys(parsed.settings).length);
```

#### importSettings(data)

Imports settings from JSON string with validation and merging.

**Signature:**
```typescript
async importSettings(data: string): Promise<boolean>
```

**Parameters:**
- `data` (string, required): JSON string in export format

**Returns:**
- `Promise<boolean>`: True if import successful

**Throws:**
- `Error`: If JSON invalid, format invalid, or no valid settings found

**Examples:**
```javascript
// Import from file
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.json';

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    const content = await file.text();
    try {
      await settings.importSettings(content);
      console.log('Settings imported successfully');
    } catch (error) {
      console.error('Import failed:', error.message);
    }
  }
});

fileInput.click();

// Import with validation
try {
  await settings.importSettings(importData);
  console.log('Import successful');
} catch (error) {
  if (error.message.includes('Invalid JSON format')) {
    console.log('File is not valid JSON');
  } else if (error.message.includes('No valid settings found')) {
    console.log('No compatible settings in import file');  
  }
}
```

**Import Behavior:**
- Only imports settings that exist in current schema
- Validates each setting against current schema
- Skips invalid settings with warnings
- Merges with existing settings (overwrites values)
- Triggers change events for all imported settings

#### resetSettings()

Resets all settings to their default values.

**Signature:**
```typescript
async resetSettings(): Promise<boolean>
```

**Returns:**
- `Promise<boolean>`: True if reset successful

**Examples:**
```javascript
// Reset with confirmation
if (confirm('Reset all settings to defaults? This cannot be undone.')) {
  await settings.resetSettings();
  console.log('Settings reset to defaults');
}

// Reset with error handling
try {
  await settings.resetSettings();
  // Force UI refresh after reset
  window.location.reload();
} catch (error) {
  console.error('Reset failed:', error.message);
}
```

### Caching Methods

#### getCachedSetting(key)

Gets a setting from local cache (synchronous, may be stale).

**Signature:**
```typescript
getCachedSetting(key: string): SettingObject | null
```

**Parameters:**
- `key` (string, required): Setting key

**Returns:**
- `SettingObject | null`: Cached setting object or null if not cached

**Examples:**
```javascript
// Fast synchronous access
const cached = settings.getCachedSetting('feature_enabled');
if (cached) {
  console.log('Feature enabled:', cached.value);
} else {
  // Not in cache, trigger async load
  settings.getSetting('feature_enabled')
    .then(setting => console.log('Loaded:', setting.value));
}

// Use for performance-critical operations
function isFeatureEnabled() {
  const cached = settings.getCachedSetting('feature_enabled');
  return cached ? cached.value : false; // Default if not cached
}
```

#### getCachedSettings()

Gets all cached settings (synchronous).

**Signature:**
```typescript
getCachedSettings(): {[key: string]: SettingObject}
```

**Returns:**
- `{[key: string]: SettingObject}`: Object containing all cached settings

**Examples:**
```javascript
// Get all cached data
const cached = settings.getCachedSettings();
console.log('Cached settings:', Object.keys(cached));

// Check cache coverage
const allKeys = ['feature_enabled', 'api_key', 'refresh_interval'];
const cachedKeys = Object.keys(cached);
const missing = allKeys.filter(key => !cachedKeys.includes(key));
if (missing.length > 0) {
  console.log('Not yet cached:', missing);
}
```

#### clearCache()

Clears the local settings cache.

**Signature:**
```typescript
clearCache(): void
```

**Examples:**
```javascript
// Force refresh by clearing cache
settings.clearCache();
const fresh = await settings.getAllSettings(); // Will fetch fresh data

// Clear cache when switching contexts
settings.clearCache();
```

### Storage Management Methods

#### getStorageStats()

Gets storage usage statistics.

**Signature:**
```typescript
async getStorageStats(): Promise<StorageStats>
```

**Returns:**
- `Promise<StorageStats>`: Storage usage information

**StorageStats Interface:**
```typescript
interface StorageStats {
  totalBytes: number;         // Total bytes used
  settingsCount: number;      // Number of settings
  quota: QuotaInfo;          // Quota information
  averageSettingSize: number; // Average bytes per setting
}

interface QuotaInfo {
  available: boolean;    // Whether storage is available
  used: number;         // Bytes used
  quota: number;        // Total quota in bytes  
  percentUsed: number;  // Percentage of quota used
}
```

**Examples:**
```javascript
// Check storage usage
const stats = await settings.getStorageStats();
console.log(`Using ${stats.totalBytes} bytes for ${stats.settingsCount} settings`);
console.log(`Storage ${stats.quota.percentUsed.toFixed(1)}% full`);

if (stats.quota.percentUsed > 80) {
  console.warn('Storage quota getting high');
}
```

#### checkStorageQuota()

Checks storage quota availability and usage.

**Signature:**
```typescript
async checkStorageQuota(): Promise<QuotaInfo>
```

**Returns:**
- `Promise<QuotaInfo>`: Quota usage information

**Examples:**
```javascript
// Monitor quota usage
const quota = await settings.checkStorageQuota();
if (quota.percentUsed > 90) {
  alert('Storage almost full! Consider exporting settings and clearing data.');
}

// Automated quota management
setInterval(async () => {
  const quota = await settings.checkStorageQuota();
  if (quota.percentUsed > 85) {
    console.warn('Storage quota warning:', quota);
  }
}, 60000); // Check every minute
```

### Event Management Methods

#### addChangeListener(callback)

Adds a listener for settings changes from any source.

**Signature:**
```typescript
addChangeListener(callback: ChangeListener): void

type ChangeListener = (event: ChangeEvent, data: ChangeData) => void;

type ChangeEvent = 'changed' | 'imported' | 'reset';

interface ChangeData {
  [key: string]: any; // For 'changed' event - maps keys to new values
  // For 'imported'/'reset' events - contains all settings
}
```

**Parameters:**
- `callback` (function, required): Function to call when settings change

**Examples:**
```javascript
// Basic change listener
settings.addChangeListener((event, data) => {
  console.log(`Settings ${event}:`, data);
});

// Handle specific events
settings.addChangeListener((event, data) => {
  switch (event) {
    case 'changed':
      // Individual setting changes
      if (data.feature_enabled !== undefined) {
        toggleFeature(data.feature_enabled);
      }
      if (data.theme_preference !== undefined) {
        applyTheme(data.theme_preference);
      }
      break;
      
    case 'imported':
    case 'reset':
      // Bulk changes - reload everything
      location.reload();
      break;
  }
});

// Reactive UI updates
const ui = {
  featureToggle: document.getElementById('feature-toggle'),
  apiKeyInput: document.getElementById('api-key')
};

settings.addChangeListener((event, data) => {
  if (event === 'changed') {
    if (data.feature_enabled !== undefined) {
      ui.featureToggle.checked = data.feature_enabled;
    }
    if (data.api_key !== undefined) {
      ui.apiKeyInput.value = data.api_key;
    }
  }
});
```

**Event Types:**
- **'changed'**: Individual setting updates via `updateSetting()` or `updateSettings()`
- **'imported'**: Settings imported from file via `importSettings()`
- **'reset'**: Settings reset to defaults via `resetSettings()`

#### removeChangeListener(callback)

Removes a change listener.

**Signature:**
```typescript
removeChangeListener(callback: ChangeListener): void
```

**Parameters:**
- `callback` (function, required): The same function passed to `addChangeListener()`

**Examples:**
```javascript
// Store reference to remove later
const myListener = (event, data) => {
  console.log('Settings changed:', data);
};

settings.addChangeListener(myListener);

// Later, remove the listener
settings.removeChangeListener(myListener);

// Cleanup pattern
class SettingsAwareComponent {
  constructor() {
    this.settings = new ContentScriptSettings();
    this.changeListener = this.handleSettingsChange.bind(this);
    this.settings.addChangeListener(this.changeListener);
  }
  
  handleSettingsChange(event, data) {
    // Handle changes
  }
  
  destroy() {
    this.settings.removeChangeListener(this.changeListener);
  }
}
```

### Configuration Methods

#### setMessageTimeout(timeout)

Sets the timeout for communication with background script.

**Signature:**
```typescript
setMessageTimeout(timeout: number): void
```

**Parameters:**
- `timeout` (number, required): Timeout in milliseconds (must be positive)

**Examples:**
```javascript
const settings = new ContentScriptSettings();

// Increase timeout for slow networks
settings.setMessageTimeout(10000); // 10 seconds

// Decrease timeout for fast networks
settings.setMessageTimeout(3000);  // 3 seconds

// Configure based on browser
const browserInfo = browserAPI.getBrowserInfo();
if (browserInfo.name === 'firefox') {
  settings.setMessageTimeout(8000); // Firefox can be slower
}
```

**Default Timeout:** 5000ms (5 seconds)

#### destroy()

Cleanup method to remove listeners and clear cache.

**Signature:**
```typescript
destroy(): void
```

**Examples:**
```javascript
// Cleanup when component unmounts
const settings = new ContentScriptSettings();

// Use settings...

// Cleanup
settings.destroy(); // Removes all listeners and clears cache
```

## SettingsManager Class (Background Script)

The server-side settings manager for background scripts. This is typically used internally by the message handlers.

### Constructor

```javascript
new SettingsManager()
```

**Description:** Creates a new settings manager instance. Must be initialized before use.

### Core Methods

#### initialize()

Initializes the settings manager with defaults and stored values.

**Signature:**
```typescript
async initialize(): Promise<void>
```

**Examples:**
```javascript
// In background script
const settingsManager = new SettingsManager();
await settingsManager.initialize();
```

#### initializeWithEmbeddedDefaults()

Fallback initialization using embedded default values.

**Signature:**
```typescript
async initializeWithEmbeddedDefaults(): Promise<void>
```

**Examples:**
```javascript
// Fallback initialization
try {
  await settingsManager.initialize();
} catch (error) {
  console.warn('Primary initialization failed, using fallback');
  await settingsManager.initializeWithEmbeddedDefaults();
}
```

#### getSetting(key)

Gets a single setting (background script version).

**Signature:**
```typescript
async getSetting(key: string): Promise<SettingObject>
```

#### updateSetting(key, value)

Updates a single setting with validation.

**Signature:**
```typescript
async updateSetting(key: string, value: any): Promise<void>
```

#### getAllSettings()

Gets all settings (background script version).

**Signature:**
```typescript
async getAllSettings(): Promise<{[key: string]: SettingObject}>
```

#### setStorageArea(area)

Sets the storage area preference.

**Signature:**
```typescript
setStorageArea(area: 'local' | 'sync'): void
```

**Examples:**
```javascript
// Use sync storage if available
settingsManager.setStorageArea('sync');

// Fall back to local storage
settingsManager.setStorageArea('local');
```

## Message Protocol

The internal communication protocol between content scripts and background script.

### Message Types

#### PING

Tests connection to background script.

**Request:**
```typescript
{
  type: "PING"
}
```

**Response:**
```typescript
{
  pong: true,
  timestamp: number
}
```

#### GET_SETTING

Gets a single setting.

**Request:**
```typescript
{
  type: "GET_SETTING",
  key: string
}
```

**Response:**
```typescript
{
  value: SettingObject
} | {
  error: string
}
```

#### GET_ALL_SETTINGS

Gets all settings.

**Request:**
```typescript
{
  type: "GET_ALL_SETTINGS"
}
```

**Response:**
```typescript
{
  settings: {[key: string]: SettingObject}
} | {
  error: string
}
```

#### UPDATE_SETTING

Updates a single setting.

**Request:**
```typescript
{
  type: "UPDATE_SETTING",
  key: string,
  value: any
}
```

**Response:**
```typescript
{
  success: true
} | {
  error: string
}
```

#### UPDATE_SETTINGS

Updates multiple settings.

**Request:**
```typescript
{
  type: "UPDATE_SETTINGS", 
  updates: {[key: string]: any}
}
```

**Response:**
```typescript
{
  success: true
} | {
  error: string
}
```

### Broadcast Messages

These messages are sent from background script to all content scripts when settings change.

#### SETTINGS_CHANGED

Sent when settings are updated via `updateSetting()` or `updateSettings()`.

**Message:**
```typescript
{
  type: "SETTINGS_CHANGED",
  changes: {[key: string]: any} // Maps keys to new values
}
```

#### SETTINGS_IMPORTED

Sent when settings are imported.

**Message:**
```typescript
{
  type: "SETTINGS_IMPORTED",
  settings: {[key: string]: SettingObject}
}
```

#### SETTINGS_RESET

Sent when settings are reset to defaults.

**Message:**
```typescript
{
  type: "SETTINGS_RESET", 
  settings: {[key: string]: SettingObject}
}
```

## Browser Compatibility Layer (BrowserAPI)

Cross-browser compatibility layer that normalizes differences between Chrome, Firefox, and Edge.

### Environment Detection

```javascript
const browserAPI = window.browserAPI || self.browserAPI;
const env = browserAPI.environment;

console.log('Browser:', env.isChrome, env.isFirefox, env.isEdge);
console.log('Features:', env.hasStorageLocal, env.hasStorageSync);
```

### Storage API

Unified storage interface that works across browsers.

**Methods:**
- `browserAPI.storage.local.get(keys)`
- `browserAPI.storage.local.set(items)`
- `browserAPI.storage.local.remove(keys)`
- `browserAPI.storage.local.clear()`

### Runtime API

Unified runtime interface for messaging.

**Methods:**
- `browserAPI.runtime.sendMessage(message)`
- `browserAPI.runtime.onMessage.addListener(callback)`

### Utility Functions

#### isAPIAvailable(apiPath)

Checks if a specific API is available.

**Examples:**
```javascript
if (browserAPI.utils.isAPIAvailable('storage.sync')) {
  // Use sync storage
}
```

#### checkStorageQuota(area)

Checks storage quota for specified area.

**Examples:**
```javascript
const quota = await browserAPI.utils.checkStorageQuota('local');
console.log('Storage usage:', quota.percentUsed + '%');
```

## Error Handling

### Common Error Types

#### ValidationError

Thrown when setting values don't match their schema.

```javascript
try {
  await settings.updateSetting('refresh_interval', 'not a number');
} catch (error) {
  if (error.message.includes('must be a valid number')) {
    // Handle validation error
  }
}
```

#### TimeoutError

Thrown when operations exceed the configured timeout.

```javascript
try {
  await settings.getSetting('some_key');
} catch (error) {
  if (error.message.includes('timeout')) {
    // Handle timeout - background script may be slow
  }
}
```

#### ConnectionError

Thrown when communication with background script fails.

```javascript
try {
  await settings.getAllSettings();
} catch (error) {
  if (error.message.includes('Could not establish connection')) {
    // Background script not available
  }
}
```

### Error Recovery Patterns

#### Retry with Exponential Backoff

```javascript
async function getSettingWithRetry(key, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await settings.getSetting(key);
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

#### Fallback Values

```javascript
async function getSettingWithFallback(key, fallback) {
  try {
    const setting = await settings.getSetting(key);
    return setting.value;
  } catch (error) {
    console.warn(`Failed to get ${key}, using fallback:`, fallback);
    return fallback;
  }
}
```

## Performance Considerations

### Best Practices

1. **Batch Operations**: Use `getSettings()` and `updateSettings()` for multiple items
2. **Cache Utilization**: Use `getCachedSetting()` for synchronous access
3. **Selective Loading**: Only load settings you need
4. **Change Listeners**: Use listeners instead of polling
5. **Timeout Configuration**: Adjust timeouts based on network conditions

### Performance Monitoring

```javascript
// Monitor API performance
class PerformanceMonitor {
  static async timeOperation(name, operation) {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      console.log(`${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`${name} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }
}

// Usage
const setting = await PerformanceMonitor.timeOperation(
  'getSetting',
  () => settings.getSetting('feature_enabled')
);
```

This API reference provides comprehensive documentation for integrating and using the Settings Extension framework effectively in production applications.