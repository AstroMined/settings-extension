# Building Block View

## Executive Summary

This document describes the static structure of the Settings Extension, including its major building blocks, their responsibilities, interfaces, and relationships. It provides multiple levels of abstraction from the high-level system overview to detailed component specifications.

## Scope

- **Applies to**: Static architecture and component structure
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Level 1: System Overview

### 5.1 System Context

The Settings Extension consists of five major subsystems that work together to provide comprehensive settings management:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Settings Extension System                           │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  User Interface │  │  Content Script │  │    Service Worker           │  │
│  │   Subsystem     │  │    Subsystem    │  │     Subsystem               │  │
│  │                 │  │                 │  │                             │  │
│  │ • Popup UI      │  │ • Settings API  │  │ • Message Handling          │  │
│  │ • Options Page  │  │ • Event System  │  │ • Storage Management        │  │
│  │ • Form Controls │  │ • Browser Compat│  │ • Business Logic            │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│           │                       │                        │                │
│           └───────────────────────┼────────────────────────┘                │
│                                   │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │            Core Library Subsystem                                      │  │
│  │                                 │                                       │  │
│  │  ┌─────────────────┐  ┌────────▼────────┐  ┌─────────────────────────┐ │  │
│  │  │   Validation    │  │     Storage     │  │    Configuration        │ │  │
│  │  │    Engine       │  │    Adapter      │  │     Management          │ │  │
│  │  │                 │  │                 │  │                         │ │  │
│  │  │ • Type Check    │  │ • Browser APIs  │  │ • Default Loading       │ │  │
│  │  │ • Schema Valid  │  │ • Caching       │  │ • Schema Definition     │ │  │
│  │  │ • Data Sanit    │  │ • Custom Compat │  │ • Migration Support     │ │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                   │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │            External Interface Subsystem                                │  │
│  │                                 │                                       │  │
│  │ • Browser Storage APIs          │                                       │  │
│  │ • Extension Runtime APIs        │                                       │  │
│  │ • Cross-Browser Compatibility   │                                       │  │
│  │ • Configuration Files           │                                       │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Top-Level Components

| Component | Responsibility | Key Interfaces |
|-----------|---------------|----------------|
| **User Interface Subsystem** | Provide user interaction capabilities | HTML forms, event handlers, DOM manipulation |
| **Content Script Subsystem** | Expose settings API to web pages | JavaScript API, message passing |
| **Service Worker Subsystem** | Coordinate system operations | Message handling, storage orchestration |
| **Core Library Subsystem** | Implement business logic | Settings management, validation, storage |
| **External Interface Subsystem** | Abstract external dependencies | Browser APIs, file system, configuration |

## Level 2: Subsystem Decomposition

### 5.3 User Interface Subsystem

The User Interface Subsystem provides all user-facing components for settings management.

```
┌─────────────────────────────────────────────────────────────────┐
│                  User Interface Subsystem                       │
│                                                                 │
│  ┌─────────────────┐           ┌─────────────────────────────┐  │
│  │   Popup UI      │           │       Options Page          │  │
│  │   Component     │           │       Component             │  │
│  │                 │           │                             │  │
│  │ ┌─────────────┐ │           │ ┌─────────────────────────┐ │  │
│  │ │   Simple    │ │           │ │     Advanced UI         │ │  │
│  │ │  Settings   │ │           │ │     Manager             │ │  │
│  │ │   Forms     │ │           │ │                         │ │  │
│  │ └─────────────┘ │           │ │ • Search & Filter       │ │  │
│  │                 │           │ │ • Bulk Operations       │ │  │
│  │ ┌─────────────┐ │           │ │ • Import/Export         │ │  │
│  │ │   Quick     │ │           │ │ • Settings Categories   │ │  │
│  │ │  Actions    │ │           │ │ • Validation Display    │ │  │
│  │ └─────────────┘ │           │ └─────────────────────────┘ │  │
│  └─────────────────┘           └─────────────────────────────┘  │
│           │                                    │                │
│           └──────────────┬─────────────────────┘                │
│                          │                                      │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │              Shared UI Components                       │   │
│  │                                                         │   │
│  │ ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │ │   Form      │  │  Validation │  │    Common       │  │   │
│  │ │ Controls    │  │   Display   │  │    Utilities    │  │   │
│  │ │             │  │             │  │                 │  │   │
│  │ │ • Text      │  │ • Error     │  │ • DOM Helpers   │  │   │
│  │ │ • Number    │  │   Messages  │  │ • Event Binding │  │   │
│  │ │ • Boolean   │  │ • Success   │  │ • Style Utils   │  │   │
│  │ │ • JSON      │  │   Feedback  │  │ • Animation     │  │   │
│  │ │ • LongText  │  │ • Progress  │  │ • Accessibility │  │   │
│  │ └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### Component Details

**Popup UI Component**
- **File**: `popup/popup.js`, `popup/popup.html`, `popup/popup.css`
- **Responsibility**: Provide quick access to common settings
- **Key Methods**:
  - `initialize()`: Set up popup interface
  - `loadSettings()`: Populate form with current values
  - `saveSettings()`: Persist form changes
  - `handleFormSubmit()`: Process user input

**Options Page Component**
- **File**: `options/options.js`, `options/options.html`, `options/options.css`
- **Responsibility**: Provide comprehensive settings management
- **Key Methods**:
  - `initialize()`: Set up full interface
  - `buildSettingsTree()`: Create hierarchical settings display
  - `handleSearch()`: Filter settings based on user query
  - `handleImportExport()`: Manage settings backup/restore

### 5.4 Content Script Subsystem

The Content Script Subsystem provides programmatic access to settings from web page contexts.

```
┌─────────────────────────────────────────────────────────────────┐
│                Content Script Subsystem                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              ContentScriptSettings                          │ │
│  │                   (Main API)                                │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │   Settings  │  │   Event     │  │     Validation      │ │ │
│  │  │   Access    │  │  Handling   │  │     Support         │ │ │
│  │  │             │  │             │  │                     │ │ │
│  │  │ • getSetting│  │ • onChange  │  │ • Type Checking     │ │ │
│  │  │ • getSettings│ │  Listeners  │  │ • Value Validation  │ │ │
│  │  │ • updateSet │  │ • Event     │  │ • Error Handling    │ │ │
│  │  │ • updateSets│  │  Dispatch   │  │ • Graceful Degrade  │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                │                                 │
│  ┌─────────────────────────────┼─────────────────────────────────┐ │
│  │           Browser Compatibility Layer                        │ │
│  │                             │                                 │ │
│  │  ┌─────────────┐  ┌─────────▼─────┐  ┌─────────────────────┐ │ │
│  │  │   Message   │  │    Browser    │  │      Feature        │ │ │
│  │  │   Passing   │  │   Detection   │  │     Detection       │ │ │
│  │  │             │  │               │  │                     │ │ │
│  │  │ • Chrome    │  │ • API Check   │  │ • Storage Support   │ │ │
│  │  │   APIs      │  │ • Version     │  │ • Message Support   │ │ │
│  │  │ • Firefox   │  │   Detection   │  │ • Permission Check  │ │ │
│  │  │   APIs      │  │ • Capability  │  │ • Fallback Options  │ │ │
│  │  │ • Unified   │  │   Testing     │  │                     │ │ │
│  │  │   Interface │  │               │  │                     │ │ │
│  │  └─────────────┘  └───────────────┘  └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Component Details

**ContentScriptSettings (Main API)**
- **File**: `lib/content-settings.js`
- **Responsibility**: Primary API for content script settings access
- **Interface**:
  ```javascript
  class ContentScriptSettings {
    constructor()
    async getSetting(key): Promise<any>
    async getSettings(keys): Promise<object>
    async updateSetting(key, value): Promise<void>
    async updateSettings(updates): Promise<void>
    addChangeListener(callback): void
    removeChangeListener(callback): void
  }
  ```

**Browser Compatibility Layer**
- **File**: `lib/browser-compat.js`
- **Responsibility**: Custom cross-browser compatibility layer replacing WebExtension Polyfill
- **Key Functions**:
  - `browserAPI`: Unified browser API object with automatic feature detection
  - `promisify()`: Promise wrapper for Chrome callback APIs
  - `utils.safeSendMessage()`: Unified message sending with error handling
  - `utils.checkStorageQuota()`: Storage quota monitoring
  - `environment`: Browser detection and capability testing

### 5.5 Service Worker Subsystem

The Service Worker Subsystem coordinates all system operations and manages the extension lifecycle.

```
┌─────────────────────────────────────────────────────────────────┐
│                  Service Worker Subsystem                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  Background Script                          │ │
│  │                   (background.js)                           │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │   Message   │  │   Lifecycle │  │       Error         │ │ │
│  │  │   Handler   │  │   Manager   │  │     Handler         │ │ │
│  │  │             │  │             │  │                     │ │ │
│  │  │ • Route     │  │ • Install   │  │ • Exception Catch   │ │ │
│  │  │   Messages  │  │ • Activate  │  │ • Error Recovery    │ │ │
│  │  │ • Validate  │  │ • Update    │  │ • Logging           │ │ │
│  │  │   Requests  │  │   Detection │  │ • User Notification │ │ │
│  │  │ • Coordinate│  │ • State     │  │                     │ │ │
│  │  │   Responses │  │   Init      │  │                     │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                │                                 │
│  ┌─────────────────────────────┼─────────────────────────────────┐ │
│  │              Business Logic Coordination                     │ │
│  │                             │                                 │ │
│  │  ┌─────────────┐  ┌─────────▼─────┐  ┌─────────────────────┐ │ │
│  │  │  Settings   │  │   Storage     │  │     State           │ │ │
│  │  │ Operations  │  │  Operations   │  │   Management        │ │ │
│  │  │             │  │               │  │                     │ │ │
│  │  │ • GET       │  │ • Persist     │  │ • Cache Mgmt        │ │ │
│  │  │   Handlers  │  │   Settings    │  │ • Session State     │ │ │
│  │  │ • SET       │  │ • Load        │  │ • Cleanup Tasks     │ │ │
│  │  │   Handlers  │  │   Settings    │  │ • Memory Mgmt       │ │ │
│  │  │ • BULK      │  │ • Cache       │  │                     │ │ │
│  │  │   Operations│  │   Management  │  │                     │ │ │
│  │  └─────────────┘  └───────────────┘  └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Component Details

**Background Script (Main Coordinator)**
- **File**: `background.js`
- **Responsibility**: Central message handling and system coordination
- **Key Functions**:
  - `handleMessage()`: Route and process all messages
  - `initializeSettings()`: Initialize settings manager
  - `handleInstall()`: Extension installation logic

### 5.5 Core Library Subsystem

The Core Library Subsystem implements the core business logic and data management.

```
┌─────────────────────────────────────────────────────────────────┐
│                   Core Library Subsystem                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                 SettingsManager                             │ │
│  │                  (Core Engine)                              │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │    CRUD     │  │   Schema    │  │       Event         │ │ │
│  │  │ Operations  │  │  Management │  │     System          │ │ │
│  │  │             │  │             │  │                     │ │ │
│  │  │ • Create    │  │ • Load      │  │ • Change Events     │ │ │
│  │  │ • Read      │  │   Schema    │  │ • Error Events      │ │ │
│  │  │ • Update    │  │ • Validate  │  │ • State Events      │ │ │
│  │  │ • Delete    │  │   Structure │  │ • Listener Mgmt     │ │ │
│  │  │ • Bulk Ops  │  │ • Type      │  │                     │ │ │
│  │  │             │  │   Checking  │  │                     │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                │                                 │
│  ┌─────────────────────────────┼─────────────────────────────────┐ │
│  │              Supporting Components                           │ │
│  │                             │                                 │ │
│  │  ┌─────────────┐  ┌─────────▼─────┐  ┌─────────────────────┐ │ │
│  │  │ Validation  │  │    Storage    │  │    Configuration    │ │ │
│  │  │   Engine    │  │   Adapter     │  │      Manager        │ │ │
│  │  │             │  │               │  │                     │ │ │
│  │  │ • Type      │  │ • Browser     │  │ • Default Loading   │ │ │
│  │  │   Validation│  │   Storage     │  │ • Schema Definition │ │ │
│  │  │ • Schema    │  │   APIs        │  │ • Migration Support │ │ │
│  │  │   Rules     │  │ • Caching     │  │ • Version Mgmt      │ │ │
│  │  │ • Custom    │  │   Strategy    │  │                     │ │ │
│  │  │   Validators│  │ • Error       │  │                     │ │ │
│  │  │             │  │   Recovery    │  │                     │ │ │
│  │  └─────────────┘  └───────────────┘  └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Component Details

**SettingsManager (Core Engine)**
- **File**: `lib/settings-manager.js`
- **Responsibility**: Core settings management and business logic
- **Interface**:
  ```javascript
  class SettingsManager {
    constructor()
    async initialize(): Promise<void>
    async getSetting(key): Promise<any>
    async updateSetting(key, value): Promise<void>
    async exportSettings(): Promise<string>
    async importSettings(json): Promise<void>
    addEventListener(event, callback): void
  }
  ```

**Browser Compatibility Layer (Storage Integration)**
- **File**: `lib/browser-compat.js`  
- **Responsibility**: Direct storage operations through custom browser compatibility layer
- **Storage Interface**:
  ```javascript
  // browserAPI.storage.local provides:
  {
    get(keys): Promise<object>
    set(items): Promise<void>
    remove(keys): Promise<void>
    clear(): Promise<void>
    onChanged: EventListener
  }
  ```
- **Note**: Storage operations are directly integrated into the browser compatibility layer rather than using a separate storage adapter class

## Level 3: Detailed Component View

### 5.6 Settings Manager Deep Dive

The Settings Manager is the core component responsible for all settings operations.

```
┌─────────────────────────────────────────────────────────────────┐
│                     SettingsManager                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Public Interface                          │ │
│  │                                                             │ │
│  │  getSetting(key) ──────────────────────┐                   │ │
│  │  updateSetting(key, value) ────────────┤                   │ │
│  │  getSettings(keys) ────────────────────┤                   │ │
│  │  updateSettings(updates) ──────────────┤                   │ │
│  │  exportSettings() ─────────────────────┤                   │ │
│  │  importSettings(json) ─────────────────┤                   │ │
│  │  addEventListener(event, callback) ────┤                   │ │
│  └─────────────────────────────────────────┼───────────────────┘ │
│                                            │                     │
│  ┌─────────────────────────────────────────▼───────────────────┐ │
│  │                 Internal Components                         │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │   Memory    │  │ Validation  │  │       Event         │ │ │
│  │  │   Cache     │  │  Pipeline   │  │      Emitter        │ │ │
│  │  │             │  │             │  │                     │ │ │
│  │  │ • Map-based │  │ • Type      │  │ • Observer Pattern  │ │ │
│  │  │   Storage   │  │   Check     │  │ • Event Queuing     │ │ │
│  │  │ • TTL       │  │ • Range     │  │ • Async Dispatch    │ │ │
│  │  │   Support   │  │   Validation│  │ • Error Events      │ │ │
│  │  │ • Smart     │  │ • Schema    │  │                     │ │ │
│  │  │   Eviction  │  │   Match     │  │                     │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  │                                                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │   Storage   │  │    Schema   │  │       State         │ │ │
│  │  │ Coordinator │  │   Manager   │  │     Manager         │ │ │
│  │  │             │  │             │  │                     │ │ │
│  │  │ • Batch     │  │ • Default   │  │ • Initialization    │ │ │
│  │  │   Operations│  │   Loading   │  │   State             │ │ │
│  │  │ • Error     │  │ • Schema    │  │ • Operation State   │ │ │
│  │  │   Recovery  │  │   Validation│  │ • Error State       │ │ │
│  │  │ • Atomic    │  │ • Migration │  │ • Cleanup Tasks     │ │ │
│  │  │   Updates   │  │   Support   │  │                     │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 5.7 Interface Specifications

#### 5.7.1 Settings Manager Interface

```javascript
/**
 * Core settings management interface
 */
class SettingsManager {
  /**
   * Initialize settings manager with defaults and stored values
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   */
  async initialize(): Promise<void>

  /**
   * Retrieve a single setting value
   * @param {string} key - Setting key
   * @returns {Promise<any>} Setting value or undefined
   * @throws {Error} If key validation fails
   */
  async getSetting(key: string): Promise<any>

  /**
   * Update a single setting value
   * @param {string} key - Setting key
   * @param {any} value - New value
   * @returns {Promise<void>}
   * @throws {ValidationError} If value validation fails
   * @throws {StorageError} If storage operation fails
   */
  async updateSetting(key: string, value: any): Promise<void>

  /**
   * Retrieve multiple setting values
   * @param {string[]} keys - Array of setting keys
   * @returns {Promise<object>} Object with key-value pairs
   * @throws {Error} If any key validation fails
   */
  async getSettings(keys: string[]): Promise<object>

  /**
   * Update multiple setting values atomically
   * @param {object} updates - Object with key-value pairs
   * @returns {Promise<void>}
   * @throws {ValidationError} If any value validation fails
   * @throws {StorageError} If storage operation fails
   */
  async updateSettings(updates: object): Promise<void>

  /**
   * Export all settings as JSON string
   * @returns {Promise<string>} JSON representation of all settings
   * @throws {Error} If export fails
   */
  async exportSettings(): Promise<string>

  /**
   * Import settings from JSON string
   * @param {string} json - JSON string with settings
   * @returns {Promise<void>}
   * @throws {ValidationError} If JSON is invalid or settings fail validation
   * @throws {StorageError} If storage operation fails
   */
  async importSettings(json: string): Promise<void>

  /**
   * Add event listener for settings changes
   * @param {string} event - Event type ('change', 'error', 'initialized')
   * @param {Function} callback - Event callback
   */
  addEventListener(event: string, callback: Function): void

  /**
   * Remove event listener
   * @param {string} event - Event type
   * @param {Function} callback - Event callback
   */
  removeEventListener(event: string, callback: Function): void
}
```

#### 5.7.2 Content Script Settings Interface

```javascript
/**
 * Content script settings access interface
 */
class ContentScriptSettings {
  /**
   * Initialize content script settings API
   */
  constructor()

  /**
   * Get single setting value
   * @param {string} key - Setting key
   * @returns {Promise<any>} Setting value
   */
  async getSetting(key: string): Promise<any>

  /**
   * Get multiple setting values
   * @param {string[]} keys - Setting keys
   * @returns {Promise<object>} Key-value pairs
   */
  async getSettings(keys: string[]): Promise<object>

  /**
   * Update single setting
   * @param {string} key - Setting key
   * @param {any} value - New value
   * @returns {Promise<void>}
   */
  async updateSetting(key: string, value: any): Promise<void>

  /**
   * Update multiple settings
   * @param {object} updates - Key-value pairs
   * @returns {Promise<void>}
   */
  async updateSettings(updates: object): Promise<void>

  /**
   * Add change listener
   * @param {Function} callback - Change callback
   */
  addChangeListener(callback: Function): void

  /**
   * Remove change listener
   * @param {Function} callback - Change callback
   */
  removeChangeListener(callback: Function): void
}
```

### 5.8 Component Dependencies

#### 5.8.1 Dependency Graph

```
┌─────────────────┐    depends on    ┌─────────────────┐
│   Popup UI      │ ─────────────────▶│ SettingsManager │
└─────────────────┘                  └─────────────────┘
                                               │
┌─────────────────┐    depends on             │
│  Options Page   │ ─────────────────────────┘
└─────────────────┘                          │
                                              │
┌─────────────────┐    depends on            │
│ Content Script  │ ─────────────────────────┘
│    Settings     │                          │
└─────────────────┘                          │
                                              ▼
┌─────────────────┐    depends on    ┌─────────────────┐
│ Service Worker  │ ─────────────────▶│ Storage Adapter │
└─────────────────┘                  └─────────────────┘
                                               │
                                              ▼
                                     ┌─────────────────┐
                                     │ Browser Compat  │
                                     └─────────────────┘
                                               │
                                              ▼
                                     ┌─────────────────┐
                                     │  Browser APIs   │
                                     └─────────────────┘
```

#### 5.8.2 Layer Dependencies

| Layer | Dependencies | Abstraction Level |
|-------|-------------|-------------------|
| **Presentation** | Business Logic Layer | High |
| **Business Logic** | Data Access Layer | Medium |
| **Data Access** | External Interface Layer | Low |
| **External Interface** | Browser APIs, File System | Lowest |

### 5.9 Component Size and Complexity Metrics

| Component | File Size (Est.) | Complexity | Test Coverage Target |
|-----------|------------------|------------|---------------------|
| **SettingsManager** | ~500 lines | High | 90% |
| **ContentScriptSettings** | ~200 lines | Medium | 85% |
| **StorageAdapter** | ~300 lines | Medium | 90% |
| **BrowserCompat** | ~150 lines | Low | 85% |
| **Popup UI** | ~300 lines | Medium | 75% |
| **Options Page** | ~600 lines | High | 75% |
| **Background Script** | ~400 lines | Medium | 85% |
| **Validation Engine** | ~250 lines | Medium | 95% |

## Related Documentation

### Implementation Guides
These components are implemented using guidance from:
- **[Extension Development Guide](../../developer/guides/extension-development.md)** - Practical implementation of these building blocks
- **[Local Setup Guide](../../developer/workflows/local-setup.md)** - Development environment for working with these components
- **[Testing Guide](../../developer/workflows/testing-guide.md)** - Testing procedures for each component
- **[Debugging Guide](../../developer/workflows/debugging-guide.md)** - Debugging techniques for component interactions

### User-Facing Implementation
These building blocks create the user experience described in:
- **[Settings Types Reference](../../user/reference/settings-types.md)** - User-facing API implemented by these components
- **[Core Concepts](../../user/explanation/concepts.md)** - User mental models these components support
- **[Getting Started Guide](../../user/tutorials/getting-started.md)** - User workflows enabled by this architecture

### Architecture Context
- **[System Goals](01-introduction-goals.md)** - Requirements these components fulfill
- **[Architecture Decisions](09-architecture-decisions/)** - Key decisions shaping this component structure
- **[Runtime View](06-runtime-view.md)** - How these components interact at runtime
- **[Quality Requirements](10-quality-requirements.md)** - Performance and reliability targets for components

### External Architecture References
- **[Chrome Extension Architecture](https://developer.chrome.com/docs/extensions/mv3/architecture-overview/)** - Browser extension architectural patterns
- **[Component-Based Architecture](https://www.componentdriven.org/)** - General component architecture principles
- **[Layered Architecture Pattern](https://www.oreilly.com/library/view/software-architecture-patterns/9781491971437/ch01.html)** - Layered architecture design

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-08-11 | Architecture Team | Initial building blocks and component design |