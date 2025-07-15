# Settings Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-Add--ons-orange)](https://addons.mozilla.org)

A comprehensive Manifest V3 browser extension framework for robust settings management across Chrome and Firefox browsers.

## 🚀 Features

- **Cross-browser compatibility** - Works seamlessly on Chrome and Firefox
- **Persistent storage** - Reliable settings persistence using browser storage APIs
- **JSON-based defaults** - Configurable default settings loaded from JSON files
- **Intuitive UI** - User-friendly settings manager accessible via browser action
- **Export/Import** - Complete settings backup and restore functionality
- **Content Script API** - Powerful API for accessing settings from content scripts
- **Multi-type support** - Boolean, text, long text, numbers, and JSON data types
- **Real-time sync** - Instant updates across all extension contexts

## 📦 Installation

### For Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/settings-extension.git
   cd settings-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the project directory
4. The extension will be loaded and ready to use

### Load in Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on"
4. Navigate to the project directory and select `manifest.json`
5. The extension will be loaded and ready to use

### From Web Stores

- **Chrome Web Store**: [Install from Chrome Web Store](https://chrome.google.com/webstore) (Coming Soon)
- **Firefox Add-ons**: [Install from Firefox Add-ons](https://addons.mozilla.org) (Coming Soon)

## 🛠️ Usage

### Basic Usage

1. Click the extension icon in your browser toolbar
2. The settings manager will open in a popup window
3. Modify any settings using the provided controls
4. Changes are saved automatically

### Advanced Settings

1. Right-click the extension icon and select "Options"
2. Access the full settings interface with advanced features
3. Use the search function to find specific settings
4. Export/import settings using the JSON functionality

### Content Script Integration

```javascript
// Example: Access settings from a content script
const settings = new ContentScriptSettings();

// Get a single setting
const featureEnabled = await settings.getSetting('feature_enabled');

// Get multiple settings
const multipleSettings = await settings.getSettings(['api_key', 'refresh_interval']);

// Update a setting
await settings.updateSetting('feature_enabled', true);

// Listen for changes
settings.addChangeListener((changes) => {
  console.log('Settings changed:', changes);
});
```

## 🔧 Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Chrome or Firefox browser

### Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
settings-extension/
├── manifest.json              # Extension manifest
├── background.js              # Service worker
├── content-script.js          # Content script implementation
├── popup/                     # Settings popup UI
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/                   # Advanced settings page
│   ├── options.html
│   ├── options.js
│   └── options.css
├── lib/                       # Core library files
│   ├── settings-manager.js
│   ├── content-settings.js
│   └── webext-polyfill.js
├── config/                    # Configuration files
│   └── defaults.json
├── icons/                     # Extension icons
└── examples/                  # Example implementations
```

## 📋 Default Settings

The extension supports various setting types:

```json
{
  "feature_enabled": {
    "type": "boolean",
    "value": true,
    "description": "Enable main feature functionality"
  },
  "api_key": {
    "type": "text",
    "value": "",
    "description": "API key for external service",
    "maxLength": 100
  },
  "custom_css": {
    "type": "longtext",
    "value": "/* Custom CSS styles */",
    "description": "Custom CSS for content injection",
    "maxLength": 50000
  },
  "refresh_interval": {
    "type": "number",
    "value": 60,
    "description": "Auto-refresh interval in seconds",
    "min": 1,
    "max": 3600
  },
  "advanced_config": {
    "type": "json",
    "value": {
      "endpoint": "https://api.example.com",
      "timeout": 5000
    },
    "description": "Advanced configuration object"
  }
}
```

## 🔍 API Reference

### SettingsManager Class

```javascript
const manager = new SettingsManager();

// Initialize with defaults
await manager.initialize();

// Get setting
const setting = await manager.getSetting('key');

// Update setting
await manager.updateSetting('key', value);

// Export settings
const json = await manager.exportSettings();

// Import settings
await manager.importSettings(jsonData);
```

### ContentScriptSettings Class

```javascript
const settings = new ContentScriptSettings();

// Get single setting
const value = await settings.getSetting('key');

// Get multiple settings
const values = await settings.getSettings(['key1', 'key2']);

// Update setting
await settings.updateSetting('key', value);

// Listen for changes
settings.addChangeListener(callback);
```

For complete API documentation, see [API.md](./docs/API.md).

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Cross-Browser Testing

```bash
# Test in Chrome
npm run test:chrome

# Test in Firefox
npm run test:firefox

# Test in both browsers
npm run test:all
```

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on how to contribute to this project.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Run the test suite (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

For security concerns, please review our [Security Policy](SECURITY.md) and report vulnerabilities responsibly.

## 🚦 Roadmap

- [ ] Enhanced UI themes
- [ ] Settings synchronization across devices
- [ ] Advanced validation rules
- [ ] Plugin system for custom setting types
- [ ] Settings backup to cloud storage
- [ ] Multi-language support

## 📊 Performance

- Settings load time: <100ms
- UI response time: <500ms
- Memory usage: <10MB per tab
- Storage efficiency: Optimized for 1MB+ settings

## 🙏 Acknowledgments

- [WebExtension Polyfill](https://github.com/mozilla/webextension-polyfill) for cross-browser compatibility
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox Extension Workshop](https://extensionworkshop.com/)

## 📞 Support

- **Documentation**: [Full documentation](./docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/settings-extension/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/settings-extension/discussions)

---

**Made with ❤️ by the Settings Extension Team**

For more information, visit our [full documentation](MCD.md) or explore the [examples](./examples/) directory.