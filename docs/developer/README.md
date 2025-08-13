# Developer Documentation

## Executive Summary

This section contains practical developer-focused documentation for the Settings Extension project. It bridges the gap between the architectural documentation (how the system is designed) and user documentation (how to use the system) by providing actionable guides for developers working on the project.

## Scope

- **Applies to**: All developers contributing to the Settings Extension project
- **Last Updated**: 2025-08-11
- **Status**: Approved

## Quick Start

New to the project? Start here:

1. [Local Setup](workflows/local-setup.md) - Get your development environment running
2. [Architecture Overview](../architecture/README.md) - Understand the system design
3. [Testing Guide](workflows/testing-guide.md) - Learn how to run tests
4. [Coding Standards](conventions/coding-standards.md) - Follow our code style

## Documentation Categories

### Workflows

Step-by-step processes for common development tasks:

- **[Local Setup](workflows/local-setup.md)** - Complete development environment setup
- **[Testing Guide](workflows/testing-guide.md)** - How to write and run tests
- **[Debugging Guide](workflows/debugging-guide.md)** - Debugging techniques and tools
- **[Release Process](workflows/release-process.md)** - Release and deployment procedures

### Guides

Specific guidance for development scenarios:

- **[Extension Development](guides/extension-development.md)** - Browser extension development tips
- **[Cross-Browser Testing](guides/cross-browser-testing.md)** - Testing across different browsers
- **[Performance Profiling](guides/performance-profiling.md)** - Performance analysis guide
- **[Troubleshooting](guides/troubleshooting.md)** - Common issues and solutions
- **[Bug Reporting](guides/bug-reporting.md)** - How to report bugs effectively
- **[Code Review](guides/code-review.md)** - Code review process and checklist

### Conventions

Team standards and best practices:

- **[Coding Standards](conventions/coding-standards.md)** - Code style and best practices
- **[Git Workflow](conventions/git-workflow.md)** - Git branching and commit conventions
- **[Documentation Guide](conventions/documentation-guide.md)** - How to write documentation
- **[API Design](conventions/api-design.md)** - API design principles

## Development Commands

Quick reference for common commands:

```bash
# Development
npm run dev              # Start development server with watch mode
npm run watch           # Watch for changes and rebuild
npm run build           # Build for production

# Testing
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report

# Code Quality
npm run lint           # Check code with ESLint
npm run lint:fix       # Fix ESLint issues automatically
npm run format         # Format code with Prettier

# Packaging
npm run package        # Build and package extension
npm run package:chrome # Package for Chrome
npm run package:firefox # Package for Firefox
```

## Project Structure

```
settings-extension/
├── src/                     # Source code (when implemented)
│   ├── background.js        # Service worker
│   ├── content-script.js    # Content script
│   ├── popup/              # Browser action popup
│   ├── options/            # Settings page
│   ├── lib/                # Core libraries
│   └── config/             # Configuration files
├── test/                   # Test files
├── docs/                   # All documentation
│   ├── architecture/       # System design docs
│   ├── user/              # End-user documentation
│   └── developer/         # This section - developer guides
├── dist/                  # Build output (generated)
└── manifest.json          # Extension manifest
```

## Getting Help

### Architecture & Design Questions

- **[Architecture Overview](../architecture/01-introduction-goals.md)** - System goals and requirements
- **[Building Blocks View](../architecture/05-building-blocks.md)** - Component structure for development
- **[Architecture Decisions](../architecture/09-architecture-decisions/)** - Technical decision rationale
- **[Quality Requirements](../architecture/10-quality-requirements.md)** - Performance and reliability targets
- **[Full Architecture Hub](../architecture/README.md)** - Complete architectural documentation

### User Experience & Integration

- **[User Workflows](../user/how-to/)** - Understanding user tasks for better development
- **[Settings Types Reference](../user/reference/settings-types.md)** - Complete API reference for integration
- **[Security Considerations](../user/explanation/security.md)** - User-facing security implications
- **[User Documentation Hub](../user/README.md)** - Complete end-user perspective

### Development Support

- **[Bug Reporting Guide](guides/bug-reporting.md)** - Report issues effectively
- **[Troubleshooting Guide](guides/troubleshooting.md)** - Common development problems
- **[Cross-Browser Testing](guides/cross-browser-testing.md)** - Browser compatibility guidance
- **[Contributing Guidelines](../CONTRIBUTING.md)** - How to contribute code and documentation

### Documentation & Standards

- **[Documentation Hub](../README.md)** - Main documentation navigation
- **[Documentation Standards](../.documentation-standards.md)** - How our docs are organized
- **[API Design Conventions](conventions/api-design.md)** - API consistency standards
- **[Git Workflow](conventions/git-workflow.md)** - Branching and commit standards

## References

- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)
- [Firefox WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Node.js Development Guide](https://nodejs.org/en/docs/guides/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [ESLint Configuration](https://eslint.org/docs/user-guide/)

## Revision History

| Date       | Author         | Changes                                   |
| ---------- | -------------- | ----------------------------------------- |
| 2025-08-11 | Developer Team | Initial developer documentation structure |
