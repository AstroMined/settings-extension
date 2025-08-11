# Local Setup Guide

## Executive Summary

Complete guide to setting up your local development environment for the Settings Extension project. This covers everything from Node.js installation to running the extension in development mode across different browsers.

## Scope

- **Applies to**: All developers setting up their local environment
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Prerequisites

### Required Software

1. **Node.js** (v16.0.0 or higher, v18+ recommended)
   ```bash
   # Check your version (should be >= 16.0.0)
   node --version
   npm --version  # Should be >= 8.0.0
   
   # Install via nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

2. **Git**
   ```bash
   # Check installation
   git --version
   
   # Configure if needed
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

3. **Browser Development Tools**
   - Chrome/Chromium (latest stable)
   - Firefox Developer Edition (recommended for Firefox testing)

### Optional but Recommended

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - JavaScript (ES6) code snippets
  - Chrome Debugger
- **Chrome Canary** (for testing latest features)

### Development Tools Overview

The project uses these key development tools:
- **Webpack 5**: Modern bundling with development server
- **Jest 29**: Testing framework with jsdom environment
- **ESLint 8**: Code linting with Prettier integration
- **Prettier 3**: Code formatting
- **web-ext 7**: Browser extension testing and packaging
- **lint-staged**: Pre-commit code quality checks

## Initial Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/settings-extension.git
cd settings-extension

# Verify you're in the right place
pwd
ls -la
```

### 2. Install Dependencies

```bash
# Install all project dependencies
npm install

# Verify installation
npm list --depth=0

# Verify pre-commit hooks are working
npx lint-staged --help
```

### 3. Verify Project Structure

```bash
# Check that all key files exist
ls -la
ls -la docs/
ls -la config/ || echo "Config directory will be created during development"
```

## Development Environment

### 1. Build the Extension

```bash
# Development build with watching
npm run watch

# Or one-time build
npm run build

# Verify build output
ls -la dist/
```

### 2. Load Extension in Browser

#### Chrome/Edge (Chromium)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` folder from your project
5. The extension should now appear in your extensions list

#### Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on"
4. Navigate to `dist/` folder and select `manifest.json`
5. The extension loads temporarily until Firefox restarts

### 3. Start Development Server

```bash
# Start development server with auto-reload
npm run dev

# This runs concurrently:
# - webpack --watch (rebuilds on file changes)
# - web-ext run (launches Firefox with extension loaded)
```

## Development Workflow

### 1. Code Changes

```bash
# Make changes to source files
# Webpack will automatically rebuild when files change

# Check build status
npm run build
```

### 2. Extension Reload

- **Chrome**: Click the reload button on the extension card in `chrome://extensions/`
- **Firefox**: The extension auto-reloads when using `npm run dev`
- **Manual**: Remove and re-add the extension

### 3. Testing Changes

```bash
# Run unit tests
npm test

# Run tests in watch mode while developing
npm run test:watch

# Check code quality
npm run lint
npm run format:check

# Test pre-commit hooks
npm run precommit
```

## Browser-Specific Setup

### Chrome Development

```bash
# Test specifically in Chrome
npm run test:chrome

# Package for Chrome Web Store
npm run package:chrome
```

### Firefox Development

```bash
# Test specifically in Firefox
npm run test:firefox

# Package for Firefox Add-ons
npm run package:firefox

# Validate extension
npm run validate
```

### Cross-Browser Testing

```bash
# Test in both browsers
npm run test:all

# Or run them individually
npm run test:chrome &
npm run test:firefox &
wait
```

## IDE Configuration

### VS Code Setup

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "javascript.preferences.importModuleSpecifier": "relative",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

Create `.vscode/launch.json` for debugging:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "chrome://extensions/",
      "webRoot": "${workspaceFolder}/dist"
    }
  ]
}
```

### ESLint Configuration

The project includes ESLint configuration. To customize:

```bash
# Check current configuration
npx eslint --print-config background.js

# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

## Environment Variables

Create `.env` file in project root (optional):
```bash
# Development settings
NODE_ENV=development
DEBUG=true

# Browser preferences
DEFAULT_BROWSER=chrome

# Build options
SOURCE_MAPS=true
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   ```bash
   # Clear npm cache and reinstall
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Extension not loading**
   - Check `dist/` folder exists and contains `manifest.json`
   - Verify manifest.json is valid JSON
   - Check browser console for errors

3. **Build failures**
   ```bash
   # Check for syntax errors
   npm run lint
   
   # Clean and rebuild
   npm run clean
   npm run build
   ```

4. **Permission errors on Linux/Mac**
   ```bash
   # Fix npm permissions
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

### Development Tools

1. **Chrome DevTools**
   - Right-click extension popup → "Inspect"
   - Background scripts: `chrome://extensions/` → "Inspect views: background page"

2. **Firefox DevTools**
   - `about:debugging` → Your extension → "Inspect"

3. **Webpack Bundle Analyzer** (optional)
   ```bash
   npm install --save-dev webpack-bundle-analyzer
   npx webpack-bundle-analyzer dist/static/js/*.js
   ```

## Performance Tips

### Development Speed

1. **Use watch mode** instead of repeated builds:
   ```bash
   npm run watch  # Keeps running, rebuilds on changes
   ```

2. **Disable source maps** in development if slow:
   ```javascript
   // webpack.config.js
   module.exports = {
     devtool: process.env.NODE_ENV === 'development' ? 'eval' : 'source-map'
   };
   ```

3. **Incremental builds**:
   ```bash
   # Only build changed files
   npm run build -- --watch
   ```

### Memory Usage

Monitor Node.js memory usage:
```bash
# Check memory usage during build
node --max-old-space-size=4096 node_modules/.bin/webpack
```

## Next Steps

After completing your local setup, follow these pathways based on your goals:

### For New Contributors
1. **[Coding Standards](../conventions/coding-standards.md)** - Code quality requirements
2. **[Git Workflow](../conventions/git-workflow.md)** - Branching and commit standards
3. **[Contributing Guidelines](../../CONTRIBUTING.md)** - Complete contribution process
4. **[Testing Guide](testing-guide.md)** - How to write and run tests

### Understanding the System  
1. **[Architecture Overview](../../architecture/README.md)** - Complete system design
2. **[Building Blocks View](../../architecture/05-building-blocks.md)** - Component structure you'll work with
3. **[Architecture Decisions](../../architecture/09-architecture-decisions/)** - Key technical choices
4. **[Quality Requirements](../../architecture/10-quality-requirements.md)** - Performance and reliability targets

### User Perspective
1. **[Getting Started Guide](../../user/tutorials/getting-started.md)** - Experience what users experience
2. **[Settings Types Reference](../../user/reference/settings-types.md)** - API you'll be working with
3. **[User How-to Guides](../../user/how-to/)** - Common user workflows to support

### Development Workflows
1. **[Extension Development Guide](../guides/extension-development.md)** - Browser extension patterns
2. **[Cross-Browser Testing](../guides/cross-browser-testing.md)** - Multi-browser compatibility
3. **[Debugging Guide](debugging-guide.md)** - Troubleshooting techniques
4. **[Release Process](release-process.md)** - How releases are made

## References

- [Node.js Installation Guide](https://nodejs.org/en/download/)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/mv3/getstarted/)
- [Firefox Extension Development](https://extensionworkshop.com/documentation/develop/)
- [Web-ext CLI](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-08-11 | Developer Team | Initial local setup guide |