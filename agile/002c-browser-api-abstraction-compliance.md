# agile/002c-browser-api-abstraction-compliance.md

## Browser API Abstraction Compliance (+ Popup Guardrails)

**Epic:** Framework Maturity\
**Status:** Ready for Implementation\
**Priority:** High\
**Story Points:** 3\
**Sprint:** Next

### Summary

Eliminate all direct `chrome.*` / `browser.*` usage outside `lib/browser-compat.js`. Enforce this with ESLint/CI. Add a popup‑specific guardrail: **forbid ****\`\`**** messaging for settings** in `src/ui/popup/**`. This locks in cross‑browser support and the 002a decoupling.

### Problem

Direct vendor API calls scattered in code hinder portability (Chrome vs Firefox) and caused silent failures. Popup code historically used `tabs.*` for settings, coupling to CS accidentally.

### Acceptance Criteria

- **Zero** direct `chrome.` or `browser.` usage outside `lib/browser-compat.js`.
- ESLint (or `no-restricted-globals`) errors on any direct use; compat file exempted.
- Popup path (`src/ui/popup/**`) may **not** use `tabs.query`/`tabs.sendMessage` for settings I/O (lint rule or path‑scoped override).
- All features work in Chrome and Firefox using `browserAPI` wrapper.

### Implementation Plan

1. **Detect & refactor**
   - Grep the repo for `\bchrome\.|\bbrowser\.` outside compat; replace with `browserAPI.*` and import wrapper where needed.
2. **ESLint rules**
   - Add `no-restricted-globals` for `chrome` and `browser` with guidance messages.
   - Add a path‑scoped rule for `src/ui/popup/**` forbidding `tabs.query`/`tabs.sendMessage` (except in explicitly annotated, non‑settings actions if any).
3. **Tests**
   - Add a unit test scanning files to ensure no forbidden patterns appear.
   - Run cross‑browser E2E to confirm behavior.

### Example ESLint snippet

```js
// eslint.config.js (pseudo)
export default [
  {
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'chrome', message: 'Use browserAPI from lib/browser-compat.js' },
        { name: 'browser', message: 'Use browserAPI from lib/browser-compat.js' }
      ]
    },
    files: ['src/**/*.js'],
    ignores: ['src/lib/browser-compat.js']
  },
  {
    files: ['src/ui/popup/**/*.js'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='browserAPI'][callee.property.name=/^(tabs)$/]",
          message: 'Popup must not use tabs.* for settings I/O'
        }
      ]
    }
  }
];
```

### Risk Mitigation

- Missed instances → combine grep, ESLint, and a unit scan.
- Compat gaps → extend `browser-compat.js` as needed, test in both browsers.

### Definition of Done

- No direct vendor API usage outside compat; lint passes.
- Popup free of `tabs.*` for settings.
- All E2E tests pass on Chrome and Firefox.
