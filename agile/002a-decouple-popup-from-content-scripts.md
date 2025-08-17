# agile/002a-decouple-popup-from-content-scripts.md

## Decouple Popup Settings from Content Scripts

**Epic:** Framework Maturity\
**Status:** ✅ Implemented\
**Priority:** High\
**Story Points:** 5\
**Sprint:** Completed

### Summary

Make the popup’s settings load/save flow **independent of any content script presence**. The popup must always work (load defaults, read/write settings) using **storage** and **background** messaging only. The content script remains **optional** and is responsible solely for **applying** settings to page DOM and reacting to changes.

### Problem

Earlier iterations coupled the popup to an active tab/content script (e.g., `tabs.sendMessage` to fetch settings). When the CS was not injected or failed to load, the popup showed empty/never-loaded settings. This coupling is fragile and unnecessary because settings can be owned by background + storage.

### Goals / Non‑Goals

#### Goals

- Popup loads/edits settings via `storage.local` and (optionally) `runtime → background` messaging.
- Background is the **single authority** for defaults, migrations, validation.
- Content script (CS) is **optional**; it only applies settings to the current page and listens for changes.

#### Non‑Goals

- Removing the content script from the project.
- Forcing CS to inject on all URLs.

### Acceptance Criteria

1. **Popup works without CS**
   - With `content_scripts` disabled or not matching the active tab, the popup **still loads** defaults and **saves** updates.
   - No “No receiver for message” errors in the popup console.
2. **Background as authority**
   - `background.js` responds to `{ type: "getSettings" }` and returns normalized settings (seeded from `config/defaults.json` if missing).
   - On `{ type: "settingsUpdated" }`, background validates/migrates and may broadcast to tabs.
3. **Content script is optional**
   - CS initializes from `storage.local.settings` and listens to `storage.onChanged` to re‑apply settings.
   - Removing CS does **not** affect popup settings CRUD.
4. **Tests**
   - E2E A (no CS): popup shows defaults, saves changes, persists across reopen.
   - E2E B (with CS): page reflects settings via CS (initial + change).
   - Unit/contract tests for background message handlers.
5. **No direct tab dependency in popup**
   - Popup does **not** call `tabs.query` / `tabs.sendMessage` for **settings** I/O.
   - Any tab‑specific actions are guarded by a CS‑presence check.

### Implementation Plan

1. **Background authority**
   - Add `ensureSettings()` in `background.js`:
     - Read `storage.local.settings`; if missing, load `config/defaults.json`, write to storage, return normalized settings.
   - Register `runtime.onMessage` handlers:
     - `getSettings` → respond with `ensureSettings()`.
     - `settingsUpdated` → validate/migrate → (optional) broadcast to tabs.
2. **Popup storage‑first**
   - In `popup.js`:
     - `getSettings()` → try `storage.local.get('settings')`; if absent, `runtime.sendMessage({ type: 'getSettings' })`.
     - `saveSettings(next)` → `storage.local.set({ settings: next })`; then `runtime.sendMessage({ type: 'settingsUpdated', payload: next })`.
   - Remove any direct `tabs.*` use for settings.
   - If you keep tab actions, wrap them with a CS‑presence probe:

     ```js
     async function pingContentScript(browserAPI) {
       try {
         const [tab] = await browserAPI.tabs.query({
           active: true,
           currentWindow: true,
         });
         if (!tab?.id) return false;
         await browserAPI.tabs.sendMessage(tab.id, { type: "ping" });
         return true;
       } catch {
         return false;
       }
     }
     ```

3. **Content script (page applicator)**
   - On load: read `storage.local.settings` → `applySettingsToPage(settings)`.
   - Listen: `storage.onChanged` → if `settings` changed, re‑apply.
   - Do **not** act as a settings provider for the popup.
4. **Manifests**
   - Keep CS listed under `content_scripts` as appropriate; functionally optional for popup.
   - Ensure `config/defaults.json` is reachable (e.g., via `web_accessible_resources` if fetched).
5. **Tests**
   - E2E “no‑CS” run: temporarily remove `content_scripts` in the test manifest or use a URL where CS doesn’t match; verify popup settings CRUD works.
   - E2E “with‑CS” run: verify DOM effect on a matching URL and live update after changing a setting.
   - Background unit tests for `getSettings` and `settingsUpdated`.

### Guardrails

- ESLint rule or CI grep to **forbid** `tabs.sendMessage` from `src/ui/popup/**` for settings paths.
- All browser API usage via `browserAPI` (see 002c story).

### Definition of Done

- ✅ Popup settings flow works with CS absent.
- ✅ Background seeds/normalizes settings from defaults and services popup requests.
- ✅ CS only applies settings; removing it doesn't break the popup.
- ✅ E2E and unit tests added and passing.
- ✅ No direct `tabs.*` usage in popup for settings.

### Implementation Summary

**Completed Features:**

1. **Storage-First Popup Loading**
   - Enhanced `loadSettings()` with storage.local fallback when background is slow/unavailable
   - Added `loadDefaultSettings()` method to fetch from config/defaults.json
   - Graceful degradation when background script is unresponsive

2. **Background Authority Strengthened**
   - Added `ensureSettingsSeeded()` function to load defaults from config/defaults.json
   - Enhanced `handleGetAllSettings()` with storage fallback when SettingsManager unavailable
   - All settings always available through background + storage, never dependent on content scripts

3. **Content Script Presence Detection**
   - Added `pingContentScript()` helper in popup for optional tab-specific actions
   - Content scripts remain completely optional for popup functionality

4. **Browser API Compliance**
   - Fixed all direct `chrome.*` API usage to use `browserAPI` wrapper
   - Consistent cross-browser compatibility maintained

5. **Comprehensive Testing**
   - `test/e2e/popup-decoupled-functionality.test.js` - Tests popup without content scripts
   - `test/e2e/popup-with-content-scripts.test.js` - Tests popup with content scripts
   - `test/background-message-handlers.test.js` - Unit tests for background message handlers

6. **Code Quality Guardrails**
   - ESLint rules prevent `tabs.sendMessage` usage in popup for settings operations
   - Automated prevention of architecture regression

**Architecture Pattern:**

```flow
Popup ↔ Background ↔ Storage
   ↓ (optional)
Content Script (page DOM manipulation only)
```

The popup is now completely decoupled from content scripts for all settings operations.
