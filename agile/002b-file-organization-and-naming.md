# agile/002b-file-organization-and-naming.md

## File Organization & Naming Conventions Refactor (with Popup–CS Decouple)

**Epic:** Framework Maturity\
**Status:** Ready for Implementation\
**Priority:** Medium\
**Story Points:** 5–8\
**Sprint:** Next or Following

### Executive Summary

Reorganize the project into a **clear **``** pipeline** with descriptive naming and strict separation between framework code and examples. Incorporate the architectural rule from 002a: the **popup must not depend on the content script** for settings. Example code lives under `examples/`. Downstream consumers get a stable drop‑in `dist/` contract.

### Problem Statement

The repo mixes core code at the root with examples and duplicates, making it hard to scale, reason about, or vendor. Generic filenames (e.g., `content-script.js`) blur roles. Past breakages came from moving many files at once and from implicit popup↔CS coupling.

### Goals / Non‑Goals

#### Goals

- All sources live under `src/` with purposeful subfolders and descriptive names.
- `dist/` provides a stable drop‑in layout (entry files flattened, support folders preserved).
- `examples/` contains only examples; removing it does not affect framework.
- Enforce 002a constraint: popup has **zero** settings dependency on CS.

#### Non‑Goals

- Changing public APIs beyond path updates.
- Rewriting UI/logic beyond renames and relocations.

### Target Layouts

**Source of truth (**\`\`**)**

```tree
src/
  background/
    background.js         # SW (Chromium) entry; Firefox uses background.scripts
    init.js               # init helpers
    message-handlers.js   # background message endpoints
  content/
    content-script.js     # tab-scoped applicator (optional for popup)
    content-api.js        # helpers for CS, if any
  ui/
    popup/
      popup.html
      popup.js
      popup.css
    options/
      options.html
      options.js
      options.css
  lib/
    browser-compat.js
    config-loader.js
    settings-manager.js
    validation.js
    content-settings.js
  config/
    defaults.json
  assets/
    icons/
```

**Distribution (**\`\`**)**

```tree
dist/
  manifest.json               # Chromium default
  manifest.firefox.json       # Firefox variant
  background.js
  content-script.js           # present, but optional for popup
  lib/**
  options/**
  popup/**
  config/defaults.json
  icons/**
```

### Acceptance Criteria

- All framework code relocated under `src/` per layout above; root stops holding source JS files.
- `examples/` contains example integrations only.
- Filenames reflect purpose (e.g., `content-script.js` is clearly under `src/content/`).
- Build emits the `dist/` layout shown; **no** change required for downstream consumers that vendor `dist/`.
- Popup has **no import** from `src/content/*` and no dependency on CS for settings (align with 002a).
- All imports updated; repo builds and tests green.

### Implementation Plan

1. **Create folders** under `src/` and move files incrementally (one component at a time); update imports after each move; run tests.
2. **Examples**: move example files into `examples/**` (e.g., `examples/basic-integration/*`).
3. **Build mapping**: ensure `scripts/build.js` flattens entry points (`src/background/background.js` → `dist/background.js`, `src/content/content-script.js` → `dist/content-script.js`, etc.) and copies directories (`lib/`, `ui/**`, `config/`, `icons/`).
4. **Manifest paths**: verify paths in both manifests match `dist/` outputs.
5. **Post‑build validation**: parse selected manifest(s) and assert referenced files exist in `dist/`.
6. **Commit discipline**: one move per commit; full test matrix after each (Chrome + Firefox).

### Testing Strategy

- **Unit**: simple existence checks for critical `src/` paths after refactor.
- **Build**: run builder; validate manifest references.
- **E2E**: run existing tests in Chrome and Firefox. Confirm popup settings work with CS disabled (from 002a).

### Risk Mitigation

- **Breakages from mass moves** → move incrementally, test after each.
- **Downstream path changes** → maintain `dist/` contract; include migration notes only if any path changes leak into `dist/`.
- **Implicit popup↔CS coupling** → enforce via lint check and 002a acceptance tests.

### Definition of Done

- New `src/` layout in place; examples isolated; `dist/` stable.
- Builder updated with mapping + validation.
- Popup independent of CS for settings.
- Cross‑browser tests pass.
