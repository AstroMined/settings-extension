# Bug Reporting Guide

## Executive Summary

Comprehensive guide for effectively reporting bugs in the Settings Extension project. Covers bug identification, information gathering, report writing, and follow-up processes to ensure issues are resolved efficiently and help improve the overall quality of the extension.

## Scope

- **Applies to**: All bug reporting activities for developers, testers, and users
- **Last Updated**: 2025-08-11
- **Status**: Approved

## When to Report a Bug

### What Constitutes a Bug

A bug is any behavior that:
- **Deviates from intended functionality**
- **Causes crashes or errors**
- **Produces incorrect results**
- **Degrades performance significantly**
- **Creates security vulnerabilities**
- **Breaks user workflows**

### Examples of Bugs

```javascript
// ✅ Clear bugs to report:
// - Extension crashes when opening popup
// - Settings not saving to storage
// - Content script not injecting on certain sites
// - Memory leak causing browser slowdown
// - XSS vulnerability in settings input
// - Dark mode not applying correctly

// ❌ Not bugs (feature requests):
// - "Extension should have export feature"
// - "Popup should be resizable"
// - "Add support for more browsers"
```

### Bug vs Feature Request

| Bug | Feature Request |
|-----|-----------------|
| Something is broken | Something is missing |
| Unintended behavior | Desired new behavior |
| Error messages/crashes | Enhancement suggestions |
| Performance degradation | Performance improvements |
| Security vulnerabilities | New security features |

## Before Reporting

### 1. Search Existing Issues

```bash
# Search GitHub issues for similar problems
# Check both open and closed issues
# Use keywords related to your problem
# Example searches:
# - "popup crash"
# - "settings not saving"
# - "firefox compatibility"
```

**Search Strategy**:
- Use specific error messages as search terms
- Try different keyword combinations
- Check both bug reports and discussions
- Look at recently closed issues for solutions

### 2. Verify the Bug

**Reproduce Consistently**:
```bash
# Steps to verify:
1. Can you reproduce the bug multiple times?
2. Does it happen in both Chrome and Firefox?
3. Does it occur in a clean browser profile?
4. Have you tried disabling other extensions?
5. Does it happen with default settings?
```

**Test in Clean Environment**:
```bash
# Chrome clean profile
google-chrome --user-data-dir=/tmp/chrome-clean --no-extensions

# Firefox clean profile
firefox -profile /tmp/firefox-clean
```

### 3. Gather Information

**System Information**:
```bash
# Collect system details
echo "OS: $(uname -a)"
echo "Chrome: $(google-chrome --version)"
echo "Firefox: $(firefox --version)"
echo "Node.js: $(node --version)"
echo "Extension Version: $(cat manifest.json | jq -r '.version')"
```

**Browser Console Logs**:
```javascript
// Open browser console (F12) and look for:
// - Error messages
// - Warning messages
// - Network request failures
// - Extension-specific logs

// Copy all relevant messages
console.log('Extension logs would appear here');
```

**Extension Context Information**:
```javascript
// Gather extension-specific data
chrome.runtime.getManifest(); // Extension manifest
chrome.storage.local.get(); // Current settings
performance.memory; // Memory usage (Chrome only)
navigator.userAgent; // Browser details
```

## Writing Effective Bug Reports

### Bug Report Template

```markdown
## Bug Description
**Brief Summary**: One-line description of the issue

**Detailed Description**: 
Clear and detailed description of what is happening vs. what should happen.

## Environment
- **OS**: macOS 13.0 / Windows 11 / Ubuntu 22.04
- **Browser**: Chrome 118.0.5993.70 / Firefox 119.0
- **Extension Version**: 1.2.3
- **Other Extensions**: List other installed extensions that might interfere

## Steps to Reproduce
1. Open extension popup
2. Click on "Settings" button
3. Change theme to "Dark"
4. Click "Save"
5. Notice that theme doesn't change

## Expected Behavior
Theme should change to dark mode immediately after clicking save.

## Actual Behavior
Theme remains in light mode. No visual change occurs.

## Error Messages
```
Uncaught TypeError: Cannot read properties of undefined (reading 'theme')
    at saveSettings (popup.js:45:12)
    at HTMLButtonElement.onclick (popup.js:89:5)
```

## Screenshots/Videos
[Attach screenshots or screen recordings showing the issue]

## Browser Console Logs
```
[Extension] popup.js:45 Uncaught TypeError: Cannot read properties of undefined
[Extension] background.js:123 Storage quota exceeded
[Extension] content-script.js:67 Failed to inject styles
```

## Additional Context
- Bug started after updating to version 1.2.3
- Only happens on certain websites (example.com)
- Workaround: Manually refreshing the page fixes it temporarily

## Frequency
- [ ] Always occurs
- [x] Sometimes occurs (about 70% of the time)
- [ ] Rarely occurs
- [ ] Occurred only once

## Impact
- [x] Blocks primary functionality
- [ ] Workaround available
- [ ] Minor inconvenience
- [ ] Cosmetic issue only
```

### Title Guidelines

**Good Bug Titles**:
```
✅ Popup crashes when selecting theme on Firefox
✅ Settings not saved when storage quota exceeded
✅ Content script fails to inject on sites with CSP
✅ Memory leak in background script after 1 hour
✅ XSS vulnerability in custom CSS input field
```

**Bad Bug Titles**:
```
❌ Bug in extension
❌ It doesn't work
❌ Problem with saving
❌ Firefox issue
❌ Help needed
```

**Title Format**:
```
[Component] Brief description of issue [Browser if specific]

Examples:
- [Popup] Theme selection not working in Firefox
- [Storage] Quota exceeded error not handled gracefully
- [Content Script] Injection fails on CSP-enabled sites
```

## Categorizing Bugs

### Severity Levels

**Critical**: 
- Extension completely unusable
- Data loss or corruption
- Security vulnerabilities
- Browser crashes

**High**:
- Major features not working
- Significant performance issues
- Affects majority of users

**Medium**:
- Some features not working
- Minor performance issues
- Affects some users or scenarios

**Low**:
- Cosmetic issues
- Edge case problems
- Minor inconveniences

### Component Labels

Use these labels to categorize your bug:

```markdown
**Background Script**: Issues with service worker, message handling, storage operations

**Content Script**: Problems with page injection, DOM manipulation, script conflicts  

**Popup Interface**: UI issues, form problems, display glitches

**Options Page**: Settings management, import/export, configuration issues

**Storage**: Data persistence, sync problems, quota issues

**Cross-Browser**: Compatibility issues between Chrome/Firefox/Edge

**Performance**: Slow operations, memory leaks, resource usage

**Security**: Vulnerabilities, CSP issues, permissions problems
```

## Technical Bug Reports

### For Developers

**Include Code Context**:
```javascript
// Problematic code section
async function saveSettings(settings) {
  try {
    // This line throws the error
    await chrome.storage.local.set({ settings: settings.data });
  } catch (error) {
    console.error('Save failed:', error);
    // Error: Cannot read properties of undefined (reading 'data')
  }
}

// Call that triggers the bug
saveSettings({ theme: 'dark' }); // Missing 'data' property
```

**Provide Stack Traces**:
```
Error: Cannot read properties of undefined (reading 'data')
    at saveSettings (lib/settings-manager.js:45:12)
    at HTMLButtonElement.handleSave (popup/popup.js:89:5)
    at HTMLButtonElement.onclick (popup/popup.html:1:1)
```

**Include Test Cases**:
```javascript
// Test that demonstrates the bug
describe('Settings Save Bug', () => {
  test('should handle invalid settings object', async () => {
    const invalidSettings = { theme: 'dark' }; // Missing 'data' wrapper
    
    // This should not throw, but currently does
    await expect(settingsManager.save(invalidSettings))
      .resolves.not.toThrow();
  });
});
```

### Performance Issues

**Include Profiling Data**:
```javascript
// Memory usage tracking
console.log('Memory before:', performance.memory);
// ... perform operation ...
console.log('Memory after:', performance.memory);

// Timing measurements
const start = performance.now();
await expensiveOperation();
const duration = performance.now() - start;
console.log(`Operation took ${duration}ms`);
```

**Provide Reproduction Scripts**:
```javascript
// Script to reproduce memory leak
for (let i = 0; i < 1000; i++) {
  // This operation leaks memory
  document.addEventListener('click', function handler() {
    console.log('Click', i);
    // Handler is never removed
  });
}
```

### Security Issues

**Report Privately First**:
For security vulnerabilities, email [security@settings-extension.dev] before creating public issues.

**Include Proof of Concept**:
```javascript
// Example XSS vulnerability
const userInput = '<script>alert("XSS")</script>';
// This input is not sanitized before insertion
document.getElementById('settings-display').innerHTML = userInput;
```

**Describe Impact**:
```markdown
**Vulnerability**: Cross-site scripting in settings display
**Impact**: Attacker could execute arbitrary JavaScript
**Attack Vector**: Malicious settings import file
**Affected Versions**: 1.0.0 - 1.2.3
**Fix**: Sanitize HTML before DOM insertion
```

## Advanced Debugging

### Browser Developer Tools

**Chrome DevTools**:
```javascript
// Inspect extension context
chrome.runtime.getBackgroundPage((bg) => {
  console.log('Background page:', bg);
  console.log('Extension context:', bg.document);
});

// Monitor extension messages
chrome.runtime.onMessage.addListener((msg, sender, response) => {
  console.log('Message:', msg, 'From:', sender);
});

// Check storage contents
chrome.storage.local.get(null, (data) => {
  console.log('All storage:', data);
});
```

**Firefox Developer Tools**:
```javascript
// Access extension APIs in Firefox
browser.runtime.getBackgroundPage().then((bg) => {
  console.log('Background page:', bg);
});

// Monitor network requests
// Network tab -> Filter by extension ID
```

### Network Analysis

**Capture Network Issues**:
```bash
# Using browser network tools:
1. Open F12 -> Network tab
2. Reproduce the bug
3. Look for failed requests, timeouts, CORS errors
4. Export HAR file if needed

# Common network issues:
- API requests failing
- CORS policy violations  
- Timeout errors
- SSL/TLS certificate issues
```

### Extension-Specific Debugging

**Service Worker Issues**:
```javascript
// Check service worker state
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    console.log('SW state:', reg.active?.state);
    console.log('SW script:', reg.active?.scriptURL);
  });
});

// Monitor service worker lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details);
});
```

**Permission Issues**:
```javascript
// Check extension permissions
chrome.permissions.getAll((permissions) => {
  console.log('Granted permissions:', permissions);
});

// Test permission requests
chrome.permissions.request({
  permissions: ['activeTab']
}, (granted) => {
  console.log('Permission granted:', granted);
});
```

## Follow-up and Resolution

### After Submitting a Bug

**Monitor Your Report**:
- Enable GitHub notifications for the issue
- Respond promptly to requests for additional information
- Test proposed fixes when provided
- Provide feedback on resolution effectiveness

**Update the Report**:
```markdown
## Updates
**2025-08-11**: Added additional browser console logs
**2025-08-12**: Confirmed bug also occurs in Edge browser
**2025-08-13**: Tested proposed fix - partially resolves issue
```

### Working with Maintainers

**Respond to Questions**:
- Answer requests for clarification promptly
- Provide additional details when asked
- Test reproduction steps if they don't work for maintainers

**Test Fixes**:
```bash
# When maintainers provide a fix:
1. Check out the fix branch
2. Test the specific bug scenario
3. Perform regression testing
4. Report results in the issue
```

**Verify Resolution**:
```markdown
## Fix Verification
✅ Original bug scenario resolved
✅ No regression in related functionality  
✅ Works in both Chrome and Firefox
✅ Performance impact acceptable
```

## Bug Report Quality Checklist

Before submitting, verify your report includes:

**Essential Information**:
- [ ] Clear, descriptive title
- [ ] Step-by-step reproduction instructions
- [ ] Expected vs actual behavior
- [ ] Environment details (OS, browser, extension version)
- [ ] Error messages or console logs

**Supporting Evidence**:
- [ ] Screenshots or videos demonstrating the issue
- [ ] Relevant code snippets (for technical bugs)
- [ ] Browser console output
- [ ] Network request details (if applicable)

**Context and Impact**:
- [ ] Frequency of occurrence
- [ ] Impact on functionality
- [ ] Workarounds (if any)
- [ ] Related issues or discussions

**Reproducibility**:
- [ ] Bug can be reproduced consistently
- [ ] Tested in clean browser environment
- [ ] Verified not caused by other extensions
- [ ] Tested with default settings

## Common Bug Categories

### Storage Issues

**Symptoms**:
- Settings not persisting
- Data loss after browser restart  
- Sync failures between devices
- Quota exceeded errors

**Information to Include**:
```javascript
// Storage state before/after operation
chrome.storage.local.getBytesInUse((bytes) => {
  console.log('Storage usage:', bytes);
});

// Storage change events
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('Storage changed:', changes, 'in', areaName);
});
```

### UI/UX Issues

**Symptoms**:
- Visual glitches or layout problems
- Unresponsive interface elements
- Incorrect styling or theming
- Accessibility problems

**Information to Include**:
- Screenshots in different browsers
- Screen reader compatibility (if applicable)
- Mobile/responsive behavior
- High-DPI display rendering

### Cross-Browser Compatibility

**Symptoms**:
- Works in Chrome but not Firefox
- Different behavior across browsers
- Browser-specific API issues
- Extension packaging problems

**Information to Include**:
- Behavior comparison across browsers
- Browser-specific console messages
- Different manifest version impacts
- WebExtension polyfill issues

### Performance Problems

**Symptoms**:
- Slow operations or UI lag
- High CPU/memory usage
- Battery drain on mobile
- Extension timeout errors

**Information to Include**:
```javascript
// Performance measurements
const start = performance.now();
await operation();
const duration = performance.now() - start;

// Memory usage
if (performance.memory) {
  console.log('Memory usage:', {
    used: performance.memory.usedJSHeapSize,
    total: performance.memory.totalJSHeapSize,
    limit: performance.memory.jsHeapSizeLimit
  });
}
```

## Tools for Bug Reporting

### Browser Extensions

**Chrome**:
- Bug Magnet: Test data generator
- Screencastify: Screen recording
- Full Page Screen Capture: Screenshots

**Firefox**:
- Screenshots: Built-in screenshot tool
- Firefox Screenshots: Enhanced capture

### External Tools

**Screen Recording**:
- OBS Studio (free)
- Loom (web-based)
- Kap (macOS)

**Log Collection**:
```bash
# Chrome logs
chrome://extensions-internals/
chrome://webrtc-internals/

# Firefox logs
about:webrtc
about:performance
```

**Network Analysis**:
- Browser DevTools Network tab
- Charles Proxy
- Wireshark

## Prevention Through Testing

### Write Tests for Bugs

```javascript
// After fixing a bug, add a regression test
describe('Bug #123 - Settings Save Failure', () => {
  test('should handle undefined settings gracefully', async () => {
    // This used to throw an error
    const result = await settingsManager.save(undefined);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid settings');
  });
  
  test('should save valid settings successfully', async () => {
    const settings = { theme: 'dark' };
    const result = await settingsManager.save(settings);
    expect(result.success).toBe(true);
  });
});
```

### Code Review Checklist

**Common Bug Patterns**:
- Undefined/null checking
- Async/await error handling
- Browser API compatibility
- Input validation
- Memory leak prevention

## References

- [GitHub Issue Templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests)
- [Chrome Extension Debugging](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)
- [Firefox Extension Debugging](https://extensionworkshop.com/documentation/develop/debugging/)
- [Web Performance Testing](https://web.dev/performance/)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-08-11 | Developer Team | Initial bug reporting guide |