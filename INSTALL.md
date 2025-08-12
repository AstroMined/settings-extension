# Installation Guide

This guide provides step-by-step instructions for installing the Settings Extension on different browsers.

## Prerequisites

- **Chrome/Chromium**: Version 88 or later
- **Firefox**: Version 109 or later
- **Edge**: Version 88 or later (Chromium-based)

## Distribution Packages

The extension is available in two formats:

- **Chrome/Edge**: `web-ext-artifacts/settings-extension-chrome.zip`
- **Firefox**: `web-ext-artifacts/settings-extension-firefox.xpi`

## Chrome/Chromium Installation

### Method 1: Developer Mode (Recommended for Testing)

1. **Download the Extension**
   - Download `settings-extension-chrome.zip` from the `web-ext-artifacts/` directory
   - Extract the ZIP file to a folder on your computer

2. **Enable Developer Mode**
   - Open Chrome and navigate to `chrome://extensions/`
   - Toggle "Developer mode" on (top-right corner)

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the extracted folder containing the extension files
   - The extension should appear in your extensions list

4. **Verify Installation**
   - Look for the Settings Extension icon in your browser toolbar
   - Click the icon to open the popup interface
   - Access advanced settings via right-click → Options

### Method 2: Chrome Web Store (Future)

_Note: This extension is not yet published to the Chrome Web Store. For now, use Developer Mode installation._

## Firefox Installation

### Method 1: Temporary Installation (Testing)

1. **Download the Extension**
   - Download `settings-extension-firefox.xpi` from the `web-ext-artifacts/` directory

2. **Install via about:debugging**
   - Open Firefox and navigate to `about:debugging`
   - Click "This Firefox" in the left sidebar
   - Click "Load Temporary Add-on..."
   - Select the `settings-extension-firefox.xpi` file

3. **Verify Installation**
   - The extension will be loaded temporarily (until Firefox restart)
   - Look for the Settings Extension icon in the toolbar
   - Access options via the add-ons manager or right-click → Options

### Method 2: Developer Edition Installation

1. **Enable Unsigned Add-ons** (Developer/Nightly only)
   - Navigate to `about:config`
   - Search for `xpinstall.signatures.required`
   - Set the value to `false`

2. **Install the XPI**
   - Navigate to `about:addons`
   - Click the gear icon → "Install Add-on From File..."
   - Select the `settings-extension-firefox.xpi` file

### Method 3: Firefox Add-ons (Future)

_Note: This extension is not yet published to Firefox Add-ons. For now, use temporary installation._

## Microsoft Edge Installation

Edge uses the same installation process as Chrome:

1. **Download and Extract**
   - Use the same `settings-extension-chrome.zip` file
   - Extract to a local folder

2. **Enable Developer Mode**
   - Navigate to `edge://extensions/`
   - Toggle "Developer mode" on

3. **Load Extension**
   - Click "Load unpacked"
   - Select the extracted folder

## Permissions

The extension requires the following permissions:

- **Storage**: To save and sync your settings
- **Active Tab**: To interact with the current webpage for settings injection

## Post-Installation Setup

1. **First Launch**
   - Click the extension icon to open the popup
   - Review the default settings
   - Configure your initial preferences

2. **Access Advanced Options**
   - Right-click the extension icon → Options
   - Or navigate to `chrome://extensions/` and click "Details" → "Extension options"

3. **Import Existing Settings** (Optional)
   - Use the import feature in the options page
   - Supported formats: JSON

## Troubleshooting

### Common Issues

#### Extension Not Loading

**Symptoms**: Extension doesn't appear after installation

**Solutions**:

- Ensure you extracted the ZIP file completely
- Check that all files are present in the folder
- Verify browser version compatibility
- Try restarting the browser

#### Popup Not Opening

**Symptoms**: Clicking the extension icon does nothing

**Solutions**:

- Check browser console for errors (F12 → Console)
- Disable conflicting extensions temporarily
- Reload the extension from the extensions page

#### Settings Not Saving

**Symptoms**: Changes don't persist after browser restart

**Solutions**:

- Check storage permissions are granted
- Clear browser data and reinstall
- Verify no other extensions are interfering with storage

#### Firefox Signature Warnings

**Symptoms**: Firefox shows "unverified" or signature warnings

**Solutions**:

- Use Firefox Developer Edition for unsigned extensions
- Use temporary installation method for testing
- Wait for official Firefox Add-ons publication

### Browser-Specific Issues

#### Chrome/Edge Issues

- **Manifest V3 Warnings**: Normal behavior, can be ignored
- **Service Worker Errors**: Check extension popup works before reporting
- **Permission Prompts**: Grant all requested permissions for full functionality

#### Firefox Issues

- **WebExtension API Differences**: Some features may behave differently
- **Content Security Policy**: May affect settings injection on some sites
- **Background Script Limitations**: Some advanced features may be limited

### Getting Help

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Check Console and Network tabs for errors

2. **Extension Debugging**
   - Chrome: Right-click extension icon → "Inspect popup"
   - Firefox: about:debugging → "Inspect" next to the extension

3. **Report Issues**
   - Include browser version and OS
   - Provide steps to reproduce the problem
   - Include any console error messages

## Uninstallation

### Chrome/Edge

1. Navigate to `chrome://extensions/` or `edge://extensions/`
2. Find the Settings Extension
3. Click "Remove" and confirm

### Firefox

1. Navigate to `about:addons`
2. Find the Settings Extension
3. Click "..." → "Remove" and confirm

## Security Notes

- This extension only accesses data you explicitly configure
- No data is transmitted to external servers
- All settings are stored locally in your browser
- Source code is available for security review

## Validation Status

Both distribution packages have been validated and tested:

- ✅ **Chrome Package**: `settings-extension-chrome.zip` - Validated and ready for installation
- ✅ **Firefox Package**: `settings-extension-firefox.xpi` - Validated and ready for installation
- ✅ **Package Integrity**: Both packages pass integrity checks
- ✅ **Cross-browser Compatibility**: Tested on Chrome 88+, Firefox 109+, Edge 88+

## Version Information

- **Current Version**: 1.0.0
- **Manifest Version**: 3 (Chrome/Edge), 3 with background.html (Firefox)
- **Minimum Browser Versions**: Chrome 88+, Firefox 109+, Edge 88+

## Next Steps

After installation, see the [README.md](README.md) for usage instructions and feature documentation.
