# Runtime View

## Executive Summary

This document describes the dynamic behavior of the Settings Extension, illustrating how components interact during runtime to fulfill various use cases. It provides sequence diagrams and runtime scenarios that show the system's behavior from different perspectives.

## Scope

- **Applies to**: Dynamic system behavior and component interactions
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Runtime Scenarios

### 6.1 Core Runtime Scenarios

This section covers the most important runtime scenarios that demonstrate the key architectural patterns and component interactions.

#### Scenario Overview

| Scenario                     | Frequency                | Complexity | Performance Requirement |
| ---------------------------- | ------------------------ | ---------- | ----------------------- |
| **Extension Initialization** | Once per browser session | Medium     | < 500ms                 |
| **Settings Retrieval**       | Very High                | Low        | < 100ms                 |
| **Settings Update**          | High                     | Medium     | < 100ms                 |
| **UI Rendering**             | Medium                   | Medium     | < 500ms                 |
| **Import/Export**            | Low                      | High       | < 2000ms                |
| **Error Recovery**           | Low                      | High       | < 1000ms                |

## Scenario 1: Extension Initialization

### 6.2 Extension Startup Sequence

This scenario shows how the Settings Extension initializes when the browser starts or the extension is installed/enabled.

```mermaid
sequenceDiagram
    participant B as Browser
    participant SW as Service Worker
    participant SM as SettingsManager
    participant SA as StorageAdapter
    participant CF as Config Files
    participant BS as Browser Storage

    Note over B,BS: Extension Initialization Sequence

    B->>SW: Install/Enable Extension
    SW->>SW: Initialize Service Worker
    SW->>SM: new SettingsManager()
    SM->>SM: Initialize internal state

    SW->>SM: initialize()
    activate SM

    SM->>CF: Load defaults.json
    CF-->>SM: Default settings schema

    SM->>SA: Initialize storage adapter
    SA->>BS: Check storage availability
    BS-->>SA: Storage status
    SA-->>SM: Storage adapter ready

    SM->>BS: Get stored settings
    BS-->>SM: Existing settings data

    SM->>SM: Merge defaults with stored
    SM->>SM: Validate merged settings
    SM->>SM: Initialize memory cache
    SM->>SM: Set up event listeners

    deactivate SM
    SM-->>SW: Initialization complete

    SW->>SW: Register message listeners
    SW->>SW: Set up event handlers
    SW-->>B: Extension ready
```

**Key Points:**

- Service worker initializes immediately when browser starts
- Settings manager loads defaults before checking stored settings
- Merged configuration is validated before system becomes ready
- Memory cache is populated during initialization for performance
- Error handling ensures graceful degradation if initialization fails

### 6.3 Initialization Error Handling

```mermaid
sequenceDiagram
    participant SW as Service Worker
    participant SM as SettingsManager
    participant SA as StorageAdapter
    participant CF as Config Files

    SW->>SM: initialize()
    SM->>CF: Load defaults.json
    CF-->>SM: Error: File not found

    SM->>SM: Log error
    SM->>SM: Use embedded defaults

    SM->>SA: Initialize storage
    SA-->>SM: Error: Storage unavailable

    SM->>SM: Log storage error
    SM->>SM: Create in-memory fallback
    SM->>SM: Set degraded mode flag

    SM-->>SW: Initialization complete (degraded)
    SW->>SW: Notify user of limited functionality
```

## Scenario 2: Settings Retrieval from Content Script

### 6.4 Content Script Settings Access

This scenario demonstrates how content scripts access settings through the API.

```mermaid
sequenceDiagram
    participant WP as Web Page
    participant CS as Content Script
    participant CSA as ContentScriptAPI
    participant SW as Service Worker
    participant SM as SettingsManager
    participant MC as Memory Cache
    participant BS as Browser Storage

    Note over WP,BS: Content Script Settings Access

    WP->>CS: Page script calls API
    CS->>CSA: getSetting('feature_enabled')

    activate CSA
    CSA->>CSA: Validate parameters
    CSA->>SW: Send message: GET_SETTING

    activate SW
    SW->>SM: getSetting('feature_enabled')

    activate SM
    SM->>MC: Check memory cache

    alt Cache Hit
        MC-->>SM: Return cached value
    else Cache Miss
        SM->>BS: Get from storage
        BS-->>SM: Return stored value
        SM->>MC: Update cache
    end

    deactivate SM
    SM-->>SW: Return setting value
    deactivate SW
    SW-->>CSA: Response with value

    CSA->>CSA: Process response
    deactivate CSA
    CSA-->>CS: Return value
    CS-->>WP: Settings value available
```

**Performance Optimizations:**

- Memory cache reduces storage API calls
- Batch operations minimize message passing overhead
- Async operations prevent UI blocking
- Error responses include fallback values

### 6.5 Bulk Settings Retrieval

```mermaid
sequenceDiagram
    participant CS as Content Script
    participant CSA as ContentScriptAPI
    participant SW as Service Worker
    participant SM as SettingsManager

    CS->>CSA: getSettings(['api_key', 'timeout', 'retries'])

    activate CSA
    CSA->>CSA: Validate parameter array
    CSA->>SW: Send message: GET_SETTINGS

    activate SW
    SW->>SM: getSettings(keys)

    activate SM
    SM->>SM: Process keys in batch

    loop For each key
        SM->>SM: Check cache/storage
    end

    SM->>SM: Combine results
    deactivate SM
    SM-->>SW: Return settings object

    deactivate SW
    SW-->>CSA: Response with all values

    CSA->>CSA: Validate response
    deactivate CSA
    CSA-->>CS: Return settings object
```

## Scenario 3: Settings Update from UI

### 6.6 Popup UI Settings Update

This scenario shows how settings are updated through the popup interface.

```mermaid
sequenceDiagram
    participant U as User
    participant PUI as Popup UI
    participant SW as Service Worker
    participant SM as SettingsManager
    participant VE as ValidationEngine
    participant SA as StorageAdapter
    participant BS as Browser Storage
    participant CS as Content Scripts

    Note over U,CS: Settings Update from Popup UI

    U->>PUI: Change setting value
    PUI->>PUI: Update form state
    U->>PUI: Click Save

    activate PUI
    PUI->>PUI: Collect form data
    PUI->>PUI: Basic client validation
    PUI->>SW: Send message: UPDATE_SETTING

    activate SW
    SW->>SM: updateSetting(key, value)

    activate SM
    SM->>VE: Validate value

    activate VE
    VE->>VE: Check type constraints
    VE->>VE: Check range constraints
    VE->>VE: Check custom rules
    deactivate VE
    VE-->>SM: Validation result

    alt Validation Success
        SM->>SA: Store setting
        SA->>BS: Persist to browser storage
        BS-->>SA: Storage confirmation
        SA-->>SM: Storage success

        SM->>SM: Update memory cache
        SM->>SM: Emit change event
        SM-->>CS: Notify content scripts

        SM-->>SW: Update success
        SW-->>PUI: Success response
        PUI->>PUI: Show success feedback
        PUI->>PUI: Update UI state

    else Validation Failure
        SM-->>SW: Validation error
        SW-->>PUI: Error response
        PUI->>PUI: Show error message
        PUI->>PUI: Highlight invalid field
    end

    deactivate SM
    deactivate SW
    deactivate PUI
```

**Key Features:**

- Client-side validation for immediate feedback
- Server-side validation for data integrity
- Atomic updates prevent partial state
- Event propagation notifies all components
- Clear error feedback guides user correction

### 6.7 Bulk Settings Update

```mermaid
sequenceDiagram
    participant OUI as Options UI
    participant SW as Service Worker
    participant SM as SettingsManager
    participant SA as StorageAdapter

    OUI->>SW: Send message: UPDATE_SETTINGS (bulk)

    activate SW
    SW->>SM: updateSettings(settingsObject)

    activate SM
    SM->>SM: Begin transaction

    loop For each setting
        SM->>SM: Validate individual setting
    end

    alt All Validations Pass
        SM->>SA: Store all settings atomically
        SA-->>SM: All settings stored
        SM->>SM: Commit transaction
        SM->>SM: Update cache
        SM->>SM: Emit batch change event
        SM-->>SW: Bulk update success

    else Any Validation Fails
        SM->>SM: Rollback transaction
        SM-->>SW: Validation errors
    end

    deactivate SM
    SW-->>OUI: Update response
    deactivate SW
```

## Scenario 4: Import/Export Operations

### 6.8 Settings Export Process

This scenario demonstrates how users can export their settings configuration.

```mermaid
sequenceDiagram
    participant U as User
    participant OUI as Options UI
    participant SW as Service Worker
    participant SM as SettingsManager
    participant SA as StorageAdapter

    Note over U,SA: Settings Export Process

    U->>OUI: Click Export Settings

    activate OUI
    OUI->>OUI: Show export dialog
    U->>OUI: Confirm export

    OUI->>SW: Send message: EXPORT_SETTINGS

    activate SW
    SW->>SM: exportSettings()

    activate SM
    SM->>SA: Get all settings
    SA-->>SM: Complete settings data

    SM->>SM: Serialize to JSON
    SM->>SM: Add metadata (version, timestamp)
    SM->>SM: Validate export format

    deactivate SM
    SM-->>SW: JSON export string

    deactivate SW
    SW-->>OUI: Export data ready

    OUI->>OUI: Create download blob
    OUI->>OUI: Trigger file download
    OUI->>OUI: Show success message

    deactivate OUI
```

### 6.9 Settings Import Process

```mermaid
sequenceDiagram
    participant U as User
    participant OUI as Options UI
    participant SW as Service Worker
    participant SM as SettingsManager
    participant VE as ValidationEngine
    participant SA as StorageAdapter

    U->>OUI: Select import file
    OUI->>OUI: Read file content
    OUI->>SW: Send message: IMPORT_SETTINGS

    activate SW
    SW->>SM: importSettings(jsonData)

    activate SM
    SM->>SM: Parse JSON
    SM->>SM: Validate JSON structure
    SM->>SM: Check version compatibility

    SM->>VE: Validate all settings
    VE-->>SM: Validation results

    alt Import Valid
        SM->>SM: Create backup of current settings
        SM->>SA: Store imported settings
        SA-->>SM: Import success
        SM->>SM: Update cache
        SM->>SM: Emit import complete event
        SM-->>SW: Import successful
        SW-->>OUI: Success response

    else Import Invalid
        SM-->>SW: Import errors
        SW-->>OUI: Error details
    end

    deactivate SM
    deactivate SW

    OUI->>OUI: Show result to user
```

## Scenario 5: Error Recovery

### 6.10 Storage Error Recovery

This scenario shows how the system handles storage failures and recovers gracefully.

```mermaid
sequenceDiagram
    participant CS as Content Script
    participant SW as Service Worker
    participant SM as SettingsManager
    participant SA as StorageAdapter
    participant BS as Browser Storage
    participant FB as Fallback System

    CS->>SW: Request setting
    SW->>SM: getSetting(key)
    SM->>SA: Get from storage
    SA->>BS: Browser storage call
    BS-->>SA: Error: Storage unavailable

    SA->>SA: Log storage error
    SA->>SA: Increment error counter

    alt Error Count < Threshold
        SA->>SA: Wait and retry
        SA->>BS: Retry storage call
        BS-->>SA: Success/Failure

    else Error Count >= Threshold
        SA->>FB: Switch to fallback mode
        FB->>FB: Use memory-only storage
        FB-->>SA: Fallback data
    end

    SA-->>SM: Return available data
    SM->>SM: Update degraded mode status
    SM-->>SW: Setting value (with status)
    SW-->>CS: Response with degraded flag

    Note over CS,FB: System continues with reduced functionality
```

### 6.11 Service Worker Recovery

```mermaid
sequenceDiagram
    participant B as Browser
    participant SW as Service Worker
    participant SM as SettingsManager
    participant PUI as Popup UI

    B->>SW: Service worker terminated
    Note over SW: Service Worker Inactive

    PUI->>SW: Send message (wake up)
    B->>SW: Restart service worker
    SW->>SW: Reinitialize
    SW->>SM: Quick initialization
    SM->>SM: Load cached state
    SM-->>SW: Ready (fast path)
    SW-->>PUI: Process pending message
```

## Performance Characteristics

### 6.12 Runtime Performance Metrics

| Operation                    | Target Time | Typical Time | Max Acceptable |
| ---------------------------- | ----------- | ------------ | -------------- |
| **Extension Initialization** | < 300ms     | ~200ms       | 500ms          |
| **Single Setting Get**       | < 50ms      | ~20ms        | 100ms          |
| **Single Setting Set**       | < 100ms     | ~50ms        | 200ms          |
| **Bulk Settings Get**        | < 100ms     | ~60ms        | 200ms          |
| **Bulk Settings Set**        | < 200ms     | ~150ms       | 500ms          |
| **UI Rendering**             | < 300ms     | ~200ms       | 500ms          |
| **Export Operation**         | < 1000ms    | ~500ms       | 2000ms         |
| **Import Operation**         | < 1500ms    | ~800ms       | 3000ms         |

### 6.13 Memory Usage Patterns

```mermaid
graph TD
    A[Extension Start] --> B[Baseline: ~2MB]
    B --> C[Settings Loaded: ~3MB]
    C --> D[UI Active: ~4MB]
    D --> E[Peak Usage: ~6MB]
    E --> F[Cleanup: ~3MB]
    F --> C

    G[Memory Pressure] --> H[Cache Eviction]
    H --> I[Reduced Memory]
    I --> C
```

### 6.14 Concurrency Patterns

The Settings Extension handles multiple concurrent operations through:

- **Message Queuing**: Service worker queues messages during initialization
- **Atomic Operations**: Settings updates are atomic to prevent race conditions
- **Lock-Free Reads**: Read operations don't block each other
- **Event-Driven Updates**: Change notifications are asynchronous

## Error Handling Patterns

### 6.15 Error Classification

| Error Type                | Handling Strategy       | User Impact | Recovery Time |
| ------------------------- | ----------------------- | ----------- | ------------- |
| **Validation Errors**     | Immediate user feedback | High        | Immediate     |
| **Storage Errors**        | Retry + fallback        | Medium      | < 1 second    |
| **Network Errors**        | Graceful degradation    | Low         | Varies        |
| **Browser API Errors**    | Feature detection       | Low         | Immediate     |
| **Initialization Errors** | Safe defaults           | Medium      | < 5 seconds   |

### 6.16 Error Recovery Flow

```mermaid
flowchart TD
    A[Error Detected] --> B{Error Type?}

    B -->|Validation| C[Show User Feedback]
    B -->|Storage| D[Retry Operation]
    B -->|API| E[Check Alternatives]
    B -->|Network| F[Queue for Retry]

    C --> G[User Corrects Input]
    D --> H{Retry Success?}
    E --> I{Alternative Available?}
    F --> J[Background Retry]

    H -->|Yes| K[Operation Complete]
    H -->|No| L[Fallback Mode]
    I -->|Yes| M[Use Alternative]
    I -->|No| L

    G --> N[Revalidate]
    J --> H
    L --> O[Notify User]
    M --> K
    N --> H
```

## References

- [Browser Extension Message Passing](https://developer.chrome.com/docs/extensions/mv3/messaging/)
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/mv3/service-workers/)
- [Storage API Performance](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage)

## Revision History

| Date       | Author            | Changes                                         |
| ---------- | ----------------- | ----------------------------------------------- |
| 2025-08-11 | Architecture Team | Initial runtime scenarios and sequence diagrams |
